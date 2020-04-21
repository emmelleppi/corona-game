import React, { useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "react-three-fiber";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";

import "./styles.css";

function Lights() {
  const ref = useRef()

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    ref.current.position.x = 70 * Math.sin(time)
    ref.current.position.z = 70 * Math.cos(time)
  })

  return (
    <spotLight
      ref={ref}
      color={"red"}
      position={[0, 50, 0]}
      intensity={0.8}
      angle={Math.PI / 4}
      decay={2}
      penumbra={0.8}
      castShadow
      shadow-mapSize-width={1024 / 2}
      shadow-mapSize-height={1024 / 2}
      shadow-bias={-0.0001}
    />
  )
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
      <Canvas
        shadowMap
        colorManagement
        camera={{ position: [0, 100, 0] }}
        onCreated={({ gl }) => gl.setPixelRatio(window.devicePixelRatio)}
        onClick={handleClick}
      >

        <fogExp2 attach="fog" args={[0x333333, 0.08]} />
        <color attach="background" args={["#23213D"]} />

        <ambientLight intensity={0.8} />
        <spotLight
          color={"lightyellow"}
          position={[0, 30, 0]}
          intensity={1}
          angle={Math.PI / 4}
          castShadow
          shadow-mapSize-width={1024 / 2}
          shadow-mapSize-height={1024 / 2}
          shadow-bias={-0.0001}
        />
        <Lights />

        <PhysicWorld callbacks={callbacks} />

        <Suspense fallback={null} >
          <Effects />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
