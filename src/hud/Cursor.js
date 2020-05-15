import React from "react";

function Cursor() {
  return (
    <mesh position={[0, 0, 1]} scale={[1, 1, 1]}>
      <torusBufferGeometry attach="geometry" args={[8, 1, 2, 32]} />
      <meshBasicMaterial attach="material" />
    </mesh>
  );
}

export default Cursor;
