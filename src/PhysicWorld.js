import React, { Suspense } from "react";
import { Physics, useBox } from "use-cannon";

import FirstPersonCamera from "./FirstPersonCamera";
import Map from "./Map";
import CoronaManager from './CoronaManager'
import { COLLISION_GROUP } from "./store";

function Trampoline() {
  const [planeBody] = useBox(() => ({
    args: [0.1, 0.1, 0.1],
    rotation: [0, 0, 0],
    position: [0, 29, 5],
    type: "Static",
    collisionFilterGroup: COLLISION_GROUP.TILES,
  }))

  return <mesh ref={planeBody} />
}

function PhysicWorld() {



  return (
    <Physics gravity={[0, -20, 0]} tolerance={0.0001} allowSleep={false} >
      <FirstPersonCamera position={[0, 30, 5]} />
      <Trampoline />
      <Suspense fallback={null}>
        <Map />
        <CoronaManager />
      </Suspense>
    </Physics>
  )
}

export default PhysicWorld;