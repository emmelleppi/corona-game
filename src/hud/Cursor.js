import React from 'react'

function Cursor() {

  return (
    <mesh position={[0, 0, 1]} scale={[4, 4, 4]}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshBasicMaterial attach="material" />
    </mesh>
  )

}

export default Cursor