import React, { useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas } from "react-three-fiber";
import * as THREE from "three";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";

import "./styles.css";

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
      <Canvas
        shadowMap
        camera={{ position:[0, 100, 0] }}
        // gl={{ antialias: false, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.Uncharted2ToneMapping
          gl.outputEncoding = THREE.sRGBEncoding;
          gl.setPixelRatio( window.devicePixelRatio );
        }}
        onClick={handleClick}
      >
        <color attach="background" args={["#50A6E1"]} />
        <ambientLight intensity={1} />
        <PhysicWorld callbacks={callbacks} />
      </Canvas>
    </>
  );
}

export default App;
