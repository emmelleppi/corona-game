import React, { Suspense } from "react";
import { Canvas, useThree, createPortal } from "react-three-fiber";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";
import Lights from "./Lights";
import Hud from "./Hud";
import Sky from "./Sky";
import { interactionApi } from "./store";

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

function handleClick(e) {
  const { callbacks } = interactionApi.getState()
  callbacks.map((f) => f(e));
}

function Game() {
  return (
    <Suspense fallback={"LOADING"}>
      <Canvas colorManagement onClick={handleClick}>
        <color attach="background" args={[0x3b163a]} />
        <Main />
        <Hud />
      </Canvas>
    </Suspense>
  );
}

export default Game;
