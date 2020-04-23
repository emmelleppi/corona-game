import React, { Suspense, useEffect, useCallback, useRef } from "react";
import { Physics } from "use-cannon";

import FirstPersonCamera from "./FirstPersonCamera";
import Map from "./Map";
import CoronaManager from './CoronaManager'

function PhysicWorld(props) {
  const { callbacks } = props;

  return (
    <Physics gravity={[0, -20, 0]} tolerance={0.0001} allowSleep={false} >
      <CoronaManager />
      <FirstPersonCamera callbacks={callbacks} position={[0, 30, 0]} />
      <Suspense fallback={null}>
        <Map />
      </Suspense>
    </Physics>
  )
}

export default PhysicWorld;