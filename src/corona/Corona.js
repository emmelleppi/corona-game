import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useFrame } from "react-three-fiber";
import { useSphere, useParticle, useLockConstraint } from "use-cannon";
import * as THREE from "three";
import { useService } from "@xstate/react";

import CoronaRenderer from "./Renderer"
import CoronaUI from "./CoronaUI"
import CoronaHowler from "./Howler"
import { COLLISION_GROUP, CORONA } from "../config";

const {
  ATTACK_DURATION,
  IDLE_VELOCITY,
  SEEK_VELOCITY,
  BODY_RADIUS,
  ATTACK_DISTANCE,
} = CORONA;

const PhyCorona = React.memo(function PhyCorona(props) {
  const {
    id,
    isUnderAttack,
    seekAlert,
    phyRef,
    orientation,
    initPosition,
    playerBody,
    send,
    isIdle,
    isSeeking,
    isPreattacking,
    isAttacking,
    isSpawning,
    isDead,
  } = props;

  const attackPosition = useRef();
  const renderingGroup = useRef();
  const additiveOrientation = useRef({ coords: [0, 0, 0], time: 0.5 });

  // CANNON INIT
  const [coronaBody, coronaBodyApi] = useSphere(() => ({
    args: BODY_RADIUS,
    mass: 0.1,
    position: initPosition,
    collisionFilter: COLLISION_GROUP.CORONA,
    linearDamping: 0.1,
    collisionFilterMask:
      COLLISION_GROUP.CHEST |
      COLLISION_GROUP.BAT |
      COLLISION_GROUP.CORONA |
      COLLISION_GROUP.TILES,
    onCollide: (e) => onCollide.current(e),
  }));

  const [lock, lockApi] = useParticle(
    () => ({ position: initPosition }),
    phyRef
  );

  const [, , { disable }] = useLockConstraint(coronaBody, lock);

  const getDirectionFromPlayer = useCallback(
    function getDirectionFromPlayer() {
      const dir = new THREE.Vector3();
      
      return playerBody.current ? dir
        .subVectors(playerBody.current.position, coronaBody.current.position)
        .normalize()
      : dir
    },
    [playerBody, coronaBody]
  )

  // HANDLE CORONA BODY ON COLLIDE
  const onCollide = useRef();
  const handleCollide = useCallback(
    function handleCollide(e) {
      const { body, contact } = e;

      if (body?.userData?.type === COLLISION_GROUP.CORONA) {
        const { rj } = contact;
        additiveOrientation.current = { coords: rj, time: 0.5 };
      }

      if (
        body?.userData?.type === COLLISION_GROUP.BAT &&
        body?.userData?.isAttacking
      ) {
        send("ATTACKED");

        const dir = getDirectionFromPlayer()
        const { x, z } = lock.current.position;
        
        lockApi.position.set(x - 1.3 * dir.x, initPosition[1], z - 1.3 * dir.z);
      }
    },
    [initPosition, lock, send, additiveOrientation, lockApi, getDirectionFromPlayer]
  );
  useEffect(() => void (onCollide.current = handleCollide), [
    onCollide,
    handleCollide,
  ]);

  // HANDLE CORONA DEAD STATE
  const handleDeath = useCallback(
    function handleDeath() {
      disable();

      const dir = getDirectionFromPlayer()
      coronaBodyApi.applyLocalImpulse([-4 * dir.x, 2, -4 * dir.z], [0, 0, 0]);
    },
    [disable, coronaBodyApi, getDirectionFromPlayer]
  );

  // HANDLE CORONA ATTACK STATE
  const handleAttack = useCallback(() => {
    attackPosition.current = lock.current.position.clone();

    const dir = getDirectionFromPlayer()
    const { x, z } = dir
      .multiplyScalar(ATTACK_DISTANCE * 0.8)
      .add(coronaBody.current.position);
    lockApi.position.set(x, initPosition[1], z);

    coronaBody.current.userData.attacking = true
    
    setTimeout(() => {
      if (coronaBody.current) {
        const { x, y, z } = attackPosition.current;
        lockApi.position.set(x, y, z);
  
        coronaBody.current.userData.attacking = false
        
        send("PRE_ATTACK");
      }
    }, ATTACK_DURATION);
  }, [send, initPosition, lock, coronaBody, lockApi, attackPosition, getDirectionFromPlayer]);

  useEffect(() => void (isAttacking && handleAttack(), isDead && handleDeath()), [isAttacking, isDead, handleAttack, handleDeath]);

  useFrame(function () {
    if (isIdle || isSeeking) {
      const velocityFactor = isIdle ? IDLE_VELOCITY : SEEK_VELOCITY;

      const { coords, time } = additiveOrientation.current;

      lockApi.position.set(
        lock.current.position.x +
          (orientation.current.x + coords[0] / time) * velocityFactor,
        initPosition[1],
        lock.current.position.z +
          (orientation.current.z + coords[2] / time) * velocityFactor
      );

      additiveOrientation.current.time += 0.01;
    }

    renderingGroup.current.position.copy(coronaBody.current.position);

    if (isDead) {
      renderingGroup.current.rotation.copy(coronaBody.current.rotation);
    }
  });

  return (
    <>
      <mesh ref={lock} />
      <mesh ref={coronaBody} userData={{ type: COLLISION_GROUP.CORONA, id, attacking: false }} />

      <group ref={renderingGroup} scale={[0.4, 0.4, 0.4]}>
        <CoronaRenderer
          onDeathAnimEnd={() => send("DEATH")}
          isSeeking={isSeeking}
          isPreattacking={isPreattacking}
          isSpawning={isSpawning}
          isDead={isDead}
        />
        {!isDead && (
          <CoronaUI seekAlert={seekAlert} isUnderAttack={isUnderAttack} />
        )}
      </group>

      <CoronaHowler isUnderAttack={isUnderAttack} seekAlert={seekAlert} />
    </>
  );
});

function CoronaEntryPoint(props) {
  const { interpreter } = props;

  // XSTATE
  const [state, send] = useService(interpreter);
  const { context } = state;
  const {
    id,
    isUnderAttack,
    seekAlert,
    phyRef,
    orientation,
    initPosition,
    playerBody
  } = context;

  const states = useMemo(
    () => ({
      isIdle: state?.matches("active.idle"),
      isSeeking: state?.matches("active.seek"),
      isPreattacking: state?.matches("active.preattack"),
      isAttacking: state?.matches("active.attack"),
      isSpawning: state?.matches("active.spawn"),
      isDead: state?.matches("dead"),
    }),
    [state]
  );

  return (
    <PhyCorona
      {...states}
      send={send}
      id={id}
      isUnderAttack={isUnderAttack}
      seekAlert={seekAlert}
      phyRef={phyRef}
      orientation={orientation}
      initPosition={initPosition}
      playerBody={playerBody}
    />
    )
}

export default CoronaEntryPoint;
