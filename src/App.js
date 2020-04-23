import React, { useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "react-three-fiber";

import PhysicWorld from "./PhysicWorld";
import Effects from "./Effects";

import Hud from './Hud'

import "./styles.css";

function Lights() {
  const lights = useRef([])
  const redTarget = useRef()
  const blueTarget = useRef()
  const group = useRef()

  const setLight = React.useCallback((i, ref) => {
    lights.current[i] = ref
  })

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    group.current.rotation.y = time / 2
    group.current.position.y += Math.sin(time) / 10
  })

  return (
    <>

      <group ref={group} position={[0, 40, 0]}>
        <mesh ref={redTarget} position={[10, 0, 10]}></mesh>
        <mesh ref={blueTarget} position={[-10, 0, -10]}></mesh>
      </group>

      <directionalLight
        color={"red"}
        position={[0, 50, 0]}
        intensity={0.6}
        angle={Math.PI / 16}
        decay={10}
        target={redTarget.current}
        penumbra={1}
        shadow-mapSize-width={1024 / 2}
        shadow-mapSize-height={1024 / 2}
        shadow-bias={-0.0001}
      />

      <directionalLight
        color={"blue"}
        position={[0, 50, 0]}
        intensity={0.6}
        angle={Math.PI / 16}
        decay={10}
        target={blueTarget.current}
        penumbra={1}

        shadow-mapSize-width={1024 / 2}
        shadow-mapSize-height={1024 / 2}
        shadow-bias={-0.0001}
      />

    </>
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
    <Suspense fallback={"LOADING"} >
      <Canvas
        shadowMap
        colorManagement
        camera={{ position: [0, 100, 0] }}
        onCreated={({ gl }) => gl.setPixelRatio(window.devicePixelRatio)}
        onClick={handleClick}
      >

        <fogExp2 attach="fog" args={[0x333333, 0.08]} />

        <ambientLight intensity={0.8} />
        <spotLight
          color={"lightyellow"}
          position={[0, 32, 0]}
          distance={100}
          intensity={1}
          angle={Math.PI / 4}
          castShadow
          shadow-mapSize-width={1024 / 2}
          shadow-mapSize-height={1024 / 2}
          shadow-bias={-0.0001}
        />
        <Lights />

        <PhysicWorld callbacks={callbacks} />


        <Effects />
      </Canvas>
      <Hud />
    </Suspense>
  );
}

export default App;
