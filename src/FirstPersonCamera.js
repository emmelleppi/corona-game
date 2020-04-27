import React, { useCallback, useEffect, Suspense, useState, useRef } from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSphere, useLockConstraint, useCylinder, useParticle } from "use-cannon";
import * as THREE from "three";
import useSound from 'use-sound'

import { COLLISION_GROUP, usePlayer, useInteraction, interactionApi, CORONA_STATUS, coronaApi } from "./store";
import BaseballBat from "./BaseballBat";
import jumpSfx from './sounds/Jump.wav'
import boostSfx from './sounds/Sprint.wav'
import GestureHandler from "./GestureHandler";

const JUMP_IMPULSE = 10;
const VELOCITY = 40
const BOOST_FACTOR = 4

function PhyPlayer(props) {
  const { position } = props;

  const { camera } = useThree() 
  
  const actions = usePlayer(s => s.actions)

  const { left, right, forward, backward, jump, boost } = useInteraction(s => s)

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
    onCollide: e => handleCollide(e)
  }));

  const [chestLock, chestLockApi] = useParticle(() => ({ mass: 0 }));

  useLockConstraint(chest, chestLock)

  const handleCollide = useCallback(
    function handleCollide(e) {
      const { body, contact } = e

      const { type, id } = body?.userData

      if (type === COLLISION_GROUP.CORONA) {
        const coronas = coronaApi.getState().coronas
        
        const { status } = coronas?.filter(item => item.id === id)?.[0]

        if (status === CORONA_STATUS.ATTACK) {
          const { impactVelocity } = contact
          const absVelocity = Math.abs(impactVelocity)
          actions.decreaseLife(absVelocity)
        }
      }
    },
    [actions]
  )

  useEffect(() => void actions.init(chest, api), [actions, chest, api])
  useEffect(() => api.position.subscribe(([x, y, z]) => void chestLockApi.position.set(x, y + 0.4, z)), [api, chestLockApi])

  useFrame(() => {
    mybody.current.layers.enable(1)

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    let x = 0;
    let y = 0;
  
    if (backward) {
      x += direction.z;
      y += -direction.x;
    } else if (forward) {
      x += -direction.z;
      y += direction.x;
    }
    if (left) {
      x += -direction.x;
      y += -direction.z;
    } else if (right) {
      x += direction.x;
      y += direction.z;
    }
  
    x = Math.min(1, Math.max(x, -1));
    y = Math.min(1, Math.max(y, -1));
  
    if (x !== 0 || y !== 0) {
      const velocity = VELOCITY * (boost ? BOOST_FACTOR : 1)
      api.angularVelocity.set(velocity * x, 0, velocity * y);
    } else {
      api.angularVelocity.set(0, 0, 0);
    }
  
    if (jump && mybody.current.position.y < 0.4) {
      api.applyImpulse([JUMP_IMPULSE * -y, JUMP_IMPULSE, JUMP_IMPULSE * x], [0, 0, 0]);
    }
  })

  return (
    <>
      <mesh ref={mybody} />
      <mesh ref={chestLock} />
      <mesh ref={chest} userData={{ type: COLLISION_GROUP.CHEST }} >
        <cylinderBufferGeometry attach="geometry" args={[0.15, 0.05, 0.5, 32]} />
        <meshBasicMaterial attach="material" transparent opacity={0} />
      </mesh>
      <Player />
    </>
  );
}

function Player() {
  const [hasJump, setHasJump] = useState(false)
  const [hasBoost, setHasBoost] = useState(false)

  const [playJumpSfx] = useSound(jumpSfx)
  const [playBoostSfx] = useSound(boostSfx)

  const onSubscribe = useCallback(
    function onSubscribe({ jump, boost }) {
      if (jump && !hasJump) {
        playJumpSfx()
        setHasJump(true)
      }
      if (!jump && hasJump) {
        setHasJump(false)
      }
      if (boost && !hasBoost) {
        playBoostSfx()
        setHasBoost(true)
      }
      if (!boost && hasBoost) {
        setHasBoost(false)
      }
    },
    [hasJump, setHasJump, hasBoost, setHasBoost]
  )

  useEffect(() => interactionApi.subscribe(onSubscribe), [interactionApi, , playBoostSfx, playJumpSfx])

  return (
    <GestureHandler>
      <Suspense fallback={null}>
        <BaseballBat position={[0.1, -0.3, -0.5]} />
      </Suspense>
    </GestureHandler>
  )
}

export default PhyPlayer;
