import React, { useCallback, useEffect, useRef, Suspense, useMemo, useState } from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSphere, useLockConstraint, useCylinder, useParticle } from "use-cannon";
import * as THREE from "three";
import useSound from 'use-sound'

import { COLLISION_GROUP, useLife, useCorona, usePlayer } from "./store";
import BaseballBat from "./BaseballBat";
import { PointerLockControls } from "./PointerLockControls";
import jumpSfx from './sounds/Jump.wav'
import boostSfx from './sounds/Sprint.wav'
import lerp from "lerp";
import * as easing from './utility/easing'

(function () { Math.clamp = function (a, b, c) { return Math.max(b, Math.min(c, a)); } })();


const WALKING_STEP = 0.2;
const JUMP_IMPULSE = 10;
const VELOCITY = 40
const BOOST_FACTOR = 4

function FirstPersonCamera(props) {
  const { position, callbacks } = props;
  const { scene, setDefaultCamera, size } = useThree();

  const [playJumpSfx] = useSound(jumpSfx)
  const [playBoostSfx] = useSound(boostSfx)

  const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [size])

  const [boost, setBoost] = useState(false)

  const keyCodeRef = useRef([]);
  const controls = useRef();
  const camera = useRef();
  const jump = useRef(false);
  const walking = useRef(0);
  const onCollide = useRef()

  const { decrease } = useLife(s => s)
  const coronas = useCorona(s => s.coronas)
  const setPlayerApi = usePlayer(s => s.setPlayerApi)
  const setPlayerBody = usePlayer(s => s.setPlayerBody)
  
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
    onCollide: e => onCollide.current(e)
  }));

  const [chestLock, chestLockApi] = useParticle(() => ({ mass: 0 }));

  useLockConstraint(chest, chestLock)

  const handleCollide = useCallback(
    function handleCollide(e) {
      const { body, contact } = e

      const { type, id } = body?.userData

      if (type === COLLISION_GROUP.CORONA) {

        const { isAttacking } = coronas?.filter(item => item.id === id)?.[0]

        if (isAttacking) {
          const { impactVelocity } = contact
          const absVelocity = Math.abs(impactVelocity)
          decrease(absVelocity)
        }
      }
    },
    [decrease, coronas]
  )

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
      if (keyCode === 16) {
        setBoost(true)
      }
    },
    [keyCodeRef, jump, setBoost]
  );

  const onDocumentKeyUp = useCallback(
    function onDocumentKeyUp(event) {
      const keyCode = event.which;
      keyCodeRef.current = keyCodeRef.current.filter(x => x !== keyCode);
      if (keyCode === 16) {
        setBoost(false)
      }
    },
    [keyCodeRef, setBoost]
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
    if (boost) {
      playBoostSfx()
    }
  }, [boost, playBoostSfx])

  useEffect(() => void setPlayerApi(api), [setPlayerApi, api])
  useEffect(() => void setPlayerBody(chest), [setPlayerBody, chest])

  useEffect(() => {
    onCollide.current = handleCollide
  }, [onCollide, handleCollide])

  useEffect(() => {
    setDefaultCamera(camera.current);

    const canvas = document.getElementsByTagName("canvas")[0];
    controls.current = new PointerLockControls(camera.current, canvas);
    canvas.addEventListener("click", () => lockPointerLock(), false);

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

      const velocity = VELOCITY * (boost ? BOOST_FACTOR : 1)

      api.angularVelocity.set(velocity * x, 0, velocity * y);

      if (walking.current === 0) {
        walking.current = WALKING_STEP;
      }

    } else if (walking.current > 0) {

      api.angularVelocity.set(0, 0, 0);

    }

    if (jump.current && mybody.current.position.y < 0.4) {
      api.applyImpulse([JUMP_IMPULSE * -y, JUMP_IMPULSE, JUMP_IMPULSE * x], [0, 0, 0]);
      playJumpSfx();
      jump.current = false
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

    if (walking.current > 2 * Math.PI) {
      walking.current = 0;
    }
  });

  const handleV = React.useCallback(
    function handleV(varr) {
      const v = Math.floor(new THREE.Vector3(...varr).length() * 10) / 10
      const fov = lerp(70, 90, easing.easeOutQuad(v / 12))

      camera.current.fov = fov
      camera.current.updateProjectionMatrix()
    },
    []
  )
  
  useEffect(() => api.velocity.subscribe(handleV), [api, handleV])

  useFrame(() => void (mybody.current.layers.enable(1)))

  return (
    <>
      <perspectiveCamera ref={camera} args={[60, aspect, .1, 300]} >
        <Suspense fallback={null}>
          <BaseballBat callbacks={callbacks} position={[0.1, -0.3, -0.5]} rotation={[0, 0, 0]} />
        </Suspense>
        <mesh position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]}>
          <planeBufferGeometry attach="geometry" args={[10, 10]} />
          <meshBasicMaterial attach="material" color="red" opacity={1} transparent side={THREE.DoubleSide} />
        </mesh>
      </perspectiveCamera>

      <mesh ref={mybody} />
      <mesh ref={chestLock} />
      <mesh ref={chest} userData={{ type: COLLISION_GROUP.CHEST }} >
        <cylinderBufferGeometry attach="geometry" args={[0.15, 0.05, 0.5, 32]} />
        <meshBasicMaterial attach="material" transparent opacity={0} />
      </mesh>
    </>
  );
}

export default FirstPersonCamera;
