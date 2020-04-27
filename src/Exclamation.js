import React from "react";
import { useAssets } from "./store";

function Exclamation(props) {
  const exclamationTexture = useAssets(s => s.exclamationTexture)

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
