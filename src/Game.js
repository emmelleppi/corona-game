import React, { useCallback, Suspense } from "react";
import { Canvas, useThree, createPortal } from "react-three-fiber";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";
import Lights from "./Lights";
import Hud from "./Hud";
import Sky from './Sky'

import { useInteraction } from "./store";

function Main() {
  const { scene } = useThree();

  return createPortal(
    <>
      <fog attach="fog" args={[0x333333, 10, 50]} />
      <Lights />
      <PhysicWorld />
      <Effects />
      <Sky />
    </>,
    scene
  );
}

function Game() {

  const callbacks = useInteraction(s => s.callbacks)

  const handleClick = useCallback(
    function handleClick(e) {
      callbacks.map(f => f(e));
    },
    [callbacks]
  );

  return (
    <Suspense fallback={"LOADING"} >
      <Canvas
        colorManagement
        camera={{ position: [0, 100, 0] }}
        onClick={handleClick}
      >
        <color attach="background" args={[0x3b163a]} />
        <Main />
        <Hud />
      </Canvas>
    </Suspense>
  )

}

export default Game