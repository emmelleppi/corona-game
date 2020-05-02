import React, { Suspense } from "react";
import { Physics, useBox } from "use-cannon";

import FirstPersonCamera from "./FirstPersonCamera";
import Map from "./Map";
import CoronaManager from './CoronaManager'
import { COLLISION_GROUP } from "./store";

const PLAYER_INITIAL_POSITION = [0, 30, 10]

function Trampoline() {
  const [x, y, z] = PLAYER_INITIAL_POSITION

  const [planeBody] = useBox(() => ({
    args: [1, 1, 1],
    position: [x, y - 1, z],
    type: "Static",
    collisionFilterGroup: COLLISION_GROUP.TILES,
  }))

  return <mesh ref={planeBody}>
    <boxBufferGeometry args={[1, 1, 1]} attach="geometry" />
    <meshBasicMaterial attach="material" wireframe />
  </mesh>
}

function PhysicWorld() {



  return (
    <Physics gravity={[0, -20, 0]} tolerance={0.0001} allowSleep={false} >
      <FirstPersonCamera position={PLAYER_INITIAL_POSITION} />
      <Trampoline />
      <Suspense fallback={null}>
        <Map />
        <CoronaManager />
      </Suspense>
    </Physics>
  )
}

export default PhysicWorld;