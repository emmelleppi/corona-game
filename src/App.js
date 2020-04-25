import React, { useCallback, useRef, Suspense } from "react";
import { Canvas, useThree, createPortal } from "react-three-fiber";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";
import Lights from "./Lights";
import Hud from "./Hud";

import "./styles.css";

function Main(props) {
  const { callbacks } = props
  const { scene } = useThree();

  return createPortal(
    <>
      <fog attach="fog" args={[0x333333, 0.08]} />
      <Lights />
      <PhysicWorld callbacks={callbacks} />
      <Effects />
    </>,
    scene
  );
}

function App() {
  const callbacks = useRef([]);

  const handleClick = useCallback(
    function handleClick(e) {
      if (callbacks.current) {
        callbacks.current.map(f => f(e));
      }
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
          <Main callbacks={callbacks} />
          <Hud />
        </Canvas>
      </Suspense>
    </>
  );
}

export default App;
