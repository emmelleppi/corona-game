import React, { Suspense } from "react";
import { Physics, useBox } from "use-cannon";

import Player from "./Player";
import Map from "./Map";
import CoronaManager from './CoronaManager'
import { COLLISION_GROUP } from "./config";

const PLAYER_INITIAL_POSITION = [0, 30, 10]

function Trampoline() {
  const [x, y, z] = PLAYER_INITIAL_POSITION

  const [planeBody] = useBox(() => ({
    args: [1, 1, 1],
    position: [x, y - 1, z],
    rotation: [-Math.PI / 2, 0, 0],
    type: "Static",
    collisionFilterGroup: COLLISION_GROUP.TILES,
  }))

  return (
    <mesh ref={planeBody}  >
      <circleBufferGeometry args={[1, 32, 32]} attach="geometry" />
      <meshToonMaterial attach="material" color={0x333333} transparent opacity={0.7} />
    </mesh>
  )
}

function PhysicWorld() {

  return (
    <Physics gravity={[0, -40, 0]} tolerance={0.0001} allowSleep={false} >
      <Player position={PLAYER_INITIAL_POSITION} />
      <Trampoline />
      <Suspense fallback={null}>
        <Map />
        <CoronaManager />
      </Suspense>
    </Physics>
  )
}

export default PhysicWorld;