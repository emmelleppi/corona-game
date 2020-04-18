import * as THREE from "three";
import React, { useRef, useEffect, useMemo } from "react";
import { extend, useThree, useFrame } from "react-three-fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";

import { useOutline } from "./store";

const OUTLINE_COLOR = 0xffffff;

extend({
  EffectComposer,
  RenderPass,
  OutlinePass
});

function Effects() {
  const { scene, gl, size, camera } = useThree()
  
  const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [size])
  
  const composer = useRef();
  const outline = useRef();
  
  const outlineObjs = useOutline(state => state.outline);

  useEffect(() => {
    if (outline.current) {
      outline.current.edgeStrength = 100;
      outline.current.edgeGlow = 0;
      outline.current.edgeThickness = 2;
      outline.current.visibleEdgeColor = new THREE.Color(OUTLINE_COLOR);
      outline.current.hiddenEdgeColor = new THREE.Color(OUTLINE_COLOR);
      outline.current.overlayMaterial.blending = THREE.SubtractiveBlending
      outline.current.selectedObjects = outlineObjs;
    }
  }, [outlineObjs, outline]);

  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(() => composer.current.render(), 1)

  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <outlinePass
        ref={outline}
        attachArray="passes"
        args={[aspect, scene, camera]}
      />
    </effectComposer>
  );
}

export default Effects;
