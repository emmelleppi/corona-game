import React, { useCallback, useEffect, useRef, Suspense, useMemo } from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSphere, useLockConstraint, useDistanceConstraint, useCylinder, useParticle } from "use-cannon";
import * as THREE from "three";
import { PointerLockControls } from "./PointerLockControls";
import BaseballBat from "./BaseballBat";
import Effects from "./Effects";
import { COLLISION_GROUP, bodyRef, useLife } from "./store";

const WALKING_STEP = 0.2;

function FirstPersonCamera(props) {
  const { position, callbacks } = props;
  const { scene, setDefaultCamera,  size } = useThree();
  
  const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [size])

  const keyCodeRef = useRef([]);
  const controls = useRef();
  const camera = useRef();
  const light = useRef();
  const jump = useRef(false);
  const walking = useRef(0);
  
  const { life, decrease } = useLife(s => s)

  const [mybody, api] = useSphere(() => ({
    mass: 1,
    args: 0.1,
    type: "Dynamic",
    position,
    linearDamping: 0.9,
    angularDamping: 0.9,
    collisionFilterGroup: COLLISION_GROUP.BODY,
    collisionFilterMask: COLLISION_GROUP.TILES,
  }));

  const [chest] = useCylinder(() => ({
    mass: 1,
    args: [0.2, 0.1, 0.5, 32],
    collisionFilterGroup: COLLISION_GROUP.CHEST,
    collisionFilterMask: COLLISION_GROUP.CORONA,
    onCollide: e => {
      
      const { body, contact } = e
      
      if (body?.userData?.type === COLLISION_GROUP.CORONA) {
        
        const { impactVelocity } = contact
        const absVelocity = Math.abs(impactVelocity)
        decrease(absVelocity)

      }

    }
  }), bodyRef);
  
  const [chestLock, chestLockApi] = useParticle(() => ({
    mass: 0,
  }));

  useLockConstraint(chest, chestLock)

  const onDocumentKeyDown = useCallback(
    function onDocumentKeyDown(event) {
      const keyCode = event.which;
      if ([87, 83].includes(keyCode)) {
        keyCodeRef.current.push(keyCode);
      }
      if ([65, 68].includes(keyCode)) {
        keyCodeRef.current.push(keyCode);
      }
      if (keyCode === 32) {
        jump.current = true;
      }
    },
    [keyCodeRef, jump]
  );

  const onDocumentKeyUp = useCallback(
    function onDocumentKeyUp(event) {
      const keyCode = event.which;
      keyCodeRef.current = keyCodeRef.current.filter(x => x !== keyCode);
    },
    [keyCodeRef]
  );

  const lockPointerLock = useCallback(
    function lockPointerLock() {
      if (controls.current) {
        controls.current.lock();
      }
    },
    [controls]
  );

  useEffect(() => {
    setDefaultCamera(camera.current);

    const canvas = document.getElementsByTagName("canvas")[0];
    controls.current = new PointerLockControls(camera.current, canvas);
    canvas.addEventListener("click", lockPointerLock, false);

    const obj = controls.current.getObject();
    scene.add(obj);

    document.addEventListener("keydown", onDocumentKeyDown, false);
    document.addEventListener("keyup", onDocumentKeyUp, false);

    return () => {
      canvas.removeEventListener("click", lockPointerLock);
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("keyup", onDocumentKeyUp);
      scene.remove(obj);
    };
  }, [
    camera,
    setDefaultCamera,
    controls,
    scene,
    lockPointerLock,
    onDocumentKeyDown,
    onDocumentKeyUp
  ]);

  useFrame(() => {
    let x = 0;
    let y = 0;

    camera.current.updateMatrixWorld();

    const direction = new THREE.Vector3();
    camera.current.getWorldDirection(direction);

    if (keyCodeRef.current.includes(87)) {
      x += direction.z;
      y += -direction.x;
    } else if (keyCodeRef.current.includes(83)) {
      x += -direction.z;
      y += direction.x;
    }
    if (keyCodeRef.current.includes(65)) {
      x += -direction.x;
      y += -direction.z;
    } else if (keyCodeRef.current.includes(68)) {
      x += direction.x;
      y += direction.z;
    }

    x = Math.min(1, Math.max(x, -1));
    y = Math.min(1, Math.max(y, -1));

    if (x !== 0 || y !== 0) {
      
      api.angularVelocity.set(30 * x, 0, 30 * y);
      if (walking.current === 0) {
        walking.current = WALKING_STEP;
      }

    } else if (walking.current > 0){
      
      api.angularVelocity.set(0, 0, 0);

    }

    if (jump.current && mybody.current.position.y < 1) {
      api.applyImpulse([5 * direction.x, 5, 5 * direction.z], [0, 0, 0]);
      jump.current = false;
    }

    if (walking.current > 0) {
      walking.current += WALKING_STEP;
    }

    chestLockApi.position.set(
      mybody.current.position.x,
      mybody.current.position.y + .4,
      mybody.current.position.z
    )
    
    camera.current.position.set(
      mybody.current.position.x,
      mybody.current.position.y +
        0.5 +
        (0.05 * (1 - Math.cos(walking.current))) / 2,
      mybody.current.position.z
    );

    light.current.target = camera.current;
    
    if (walking.current > 2 * Math.PI) {
      walking.current = 0;
    }
  });

  return (
    <>
      <perspectiveCamera ref={camera} args={[45, aspect, .1, 300]}>
        <Suspense fallback={null}>
          <BaseballBat
            callbacks={callbacks}
            position={[0.1, -0.3, -0.5]}
            rotation={[0, 0, 0]}
          />
        </Suspense>
        <pointLight
          ref={light}
          color={"lightyellow"}
          position={[0, 0, 0.1]}
          intensity={0.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <mesh position={[0,0,-1]} rotation={[Math.PI/2,0,0]}>
          <planeBufferGeometry attach="geometry" args={[10,10]} />
          <meshBasicMaterial attach="material" color="red" opacity={1} transparent side={THREE.DoubleSide} />
        </mesh>
      </perspectiveCamera>

      <mesh ref={mybody} />
      <mesh ref={chestLock} />
      <mesh ref={chest} userData={{ type: COLLISION_GROUP.CHEST }} >
        <cylinderBufferGeometry attach="geometry" args={[0.15, 0.05, 0.5, 32]} />
        <meshBasicMaterial attach="material" transparent opacity={0} />
      </mesh>
      
      <Suspense fallback={null} >
        <Effects />
      </Suspense>
    </>
  );
}

export default FirstPersonCamera;
