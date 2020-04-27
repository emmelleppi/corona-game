import React, { Suspense } from "react";
import { Physics } from "use-cannon";

import FirstPersonCamera from "./FirstPersonCamera";
import Map from "./Map";
import CoronaManager from './CoronaManager'

function PhysicWorld() {

  return (
    <Physics gravity={[0, -20, 0]} tolerance={0.0001} allowSleep={false} >
      <FirstPersonCamera position={[0, 30, 0]} />
      <Suspense fallback={null}>
        <Map />
        <CoronaManager />
      </Suspense>
    </Physics>
  )
}

export default PhysicWorld;