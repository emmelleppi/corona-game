import React, { useRef } from "react";
import { useFrame } from "react-three-fiber";

function Lights() {
  const redTarget = useRef();
  const blueTarget = useRef();
  const group = useRef();

  useFrame(function ({ clock }) {
    const time = clock.getElapsedTime();
    group.current.rotation.y = time / 2;
    group.current.position.y += Math.sin(time) / 10;
  });

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
      />
      <directionalLight
        color={"blue"}
        position={[0, 50, 0]}
        intensity={0.6}
        angle={Math.PI / 16}
        decay={10}
        target={blueTarget.current}
        penumbra={1}
      />
      <ambientLight intensity={0.8} />
      <spotLight
        color={"lightyellow"}
        position={[0, 64, 0]}
        distance={100}
        intensity={1}
        angle={Math.PI / 3}
        castShadow
        shadow-mapSize-width={1024 / 2}
        shadow-mapSize-height={1024 / 2}
      />
    </>
  );
}

export default Lights;
