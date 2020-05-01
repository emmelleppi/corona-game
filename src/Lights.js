import React from "react";

function Lights() {
  return (
    <>
      <ambientLight intensity={1} />
      <spotLight
        color={"lightyellow"}
        position={[0, 32, 0]}
        distance={100}
        intensity={1}
        angle={Math.PI / 4}
      />
    </>
  )
}

export default Lights