import React, {
  useRef,
} from "react";
import { useFrame } from "react-three-fiber";
import * as THREE from "three";

import { useAssets } from "../store";

function CoronaShadow(props) {
  const { isDead, positionGroup } = props;
  const shadow = useRef();

  const shadowTexture = useAssets((s) => s.coronaShadow);

  useFrame(function () {
    shadow.current.material.opacity = THREE.MathUtils.lerp(
      0.6,
      0.1,
      positionGroup.current.position.y
    );
    shadow.current.scale.x = THREE.MathUtils.lerp(
      4,
      2,
      positionGroup.current.position.y
    );
    shadow.current.scale.y = THREE.MathUtils.lerp(
      4,
      2,
      positionGroup.current.position.y
    );
  });

  return (
    <mesh
      ref={shadow}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
      visible={!isDead}
    >
      <planeBufferGeometry attach="geometry" args={[0.7, 0.7]} />
      <meshBasicMaterial
        attach="material"
        map={shadowTexture}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

export default React.memo(CoronaShadow)
