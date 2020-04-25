import React from "react";
import { useExclamationTexture } from "./store";

function Exclamation(props) {
  const exclamationTexture = useExclamationTexture(s => s.exclamationTexture)

  return (
    <sprite {...props} >
      <spriteMaterial
        attach="material"
        color={0xffffff}
        transparent
        alphaTest={0.5}
        map={exclamationTexture}
      />
    </sprite>
  );
}

export default Exclamation;
