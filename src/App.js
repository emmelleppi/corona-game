import React, { useCallback, Suspense } from "react";
import { Canvas, useThree, createPortal } from "react-three-fiber";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";
import Lights from "./Lights";
import Hud from "./Hud";
import { useInteraction } from "./store";

import "./styles.css";

function Main() {
  const { scene } = useThree();

  return createPortal(
    <>
      <fog attach="fog" args={[0x333333, 0.08]} />
      <Lights />
      <PhysicWorld />
      <Effects />
    </>,
    scene
  );
}

function App() {
  const callbacks = useInteraction(s => s.callbacks)

  const handleClick = useCallback(
    function handleClick(e) {
      callbacks.map(f => f(e));
    },
    [callbacks]
  );

  return (
    <>
      <Suspense fallback={"LOADING"} >
        <Canvas
          colorManagement
          camera={{ position: [0, 100, 0] }}
          onClick={handleClick}
        >
          <Main />
          <Hud />
        </Canvas>
      </Suspense>
    </>
  );
}

export default App;
