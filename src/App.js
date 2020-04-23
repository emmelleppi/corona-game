import React, { useCallback, useRef, useEffect, useMemo, Suspense, useState } from "react";
import { Canvas, useFrame, useThree, createPortal } from "react-three-fiber";
import * as THREE from "three";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";
import Lights from "./Lights";
import Pow from "./Pow";

import "./styles.css";

function Hud() {
  const { aspect } = useThree();
  const distance = 15;

  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => {
    const cam = new THREE.OrthographicCamera(
      -distance * aspect,
      distance * aspect,
      distance,
      -distance,
      0.1,
      100
    );
    return cam;
  });
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene, camera)), 10)

  return createPortal(
    <>
      <Suspense fallback={null}>
        <Pow position={[-25, -12, -1]} scale={[4, 4, 4]} />
      </Suspense>
    </>,
    scene
  );
}

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
          // shadowMap
          colorManagement
          camera={{ position: [0, 100, 0] }}
          onCreated={({ gl }) => gl.setPixelRatio(window.devicePixelRatio)}
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
