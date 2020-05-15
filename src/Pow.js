import React, { useEffect, useState, useMemo } from "react";
import { useAssets } from "./store";

function Pow(props) {
  const { visible, scale = [1, 1, 1], position = [0, 0, 0] } = props;

  const [scaleFactor, setScaleFactor] = useState(0.5 + Math.random() / 2);
  const [positionFactor, setPositionFactor] = useState(
    Math.random() * (Math.random() > 0.5 ? 1 : -1)
  );

  const _scale = useMemo(() => scale.map((x) => x * scaleFactor), [
    scaleFactor,
    scale,
  ]);

  const powTexture = useAssets((s) => s.powTexture);

  useEffect(() => {
    setScaleFactor(0.5 + Math.random() / 2);
    setPositionFactor(Math.random() * (Math.random() > 0.5 ? 1 : -1));
  }, [visible]);

  return (
    <sprite
      {...props}
      scale={_scale}
      visible={visible}
      position={[
        position[0] + positionFactor,
        position[1] + positionFactor,
        position[2],
      ]}
    >
      <spriteMaterial
        attach="material"
        color={0xffffff}
        transparent
        map={powTexture}
        alphaTest={0.5}
      />
    </sprite>
  );
}

export default Pow;
