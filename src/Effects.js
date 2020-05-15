import * as THREE from "three";
import React, { useRef, useEffect, useMemo } from "react";
import { extend, useThree, useFrame } from "react-three-fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import { RGBShiftShader } from "three/examples/jsm/shaders/RGBShiftShader.js";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

import { GlitchPass } from "./post/glitchPass";
import { WaterPass } from "./post/waterPass";
import { outlineApi, playerApi } from "./store";
import { PLAYER } from "./config";

const OUTLINE_COLOR = 0xffffff;

extend({
  WaterPass,
  EffectComposer,
  RenderPass,
  OutlinePass,
  GlitchPass,
  FilmPass,
  ShaderPass,
});

function Effects() {
  const { scene, gl, size, camera } = useThree();

  const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [
    size,
  ]);

  const composer = useRef();
  const outline = useRef();
  const glitch = useRef();
  const water = useRef();
  const vignette = useRef();
  const currLife = React.useRef(PLAYER.INITIAL_LIFE);

  useEffect(() => void (glitch.current.factor = 0), [glitch]);

  useEffect(
    () =>
      outlineApi.subscribe(
        ({ outline: outlineObjs }) =>
          void (outline.current.selectedObjects = outlineObjs)
      ),
    [outline]
  );

  useEffect(() => {
    let timeout;

    playerApi.subscribe(({ life }) => {
      if (life < currLife.current) {
        glitch.current.factor = 0.5;
        currLife.current = life;
      }

      timeout = setTimeout(() => {
        glitch.current.factor = 0;
      }, 300);
    });

    return () => clearTimeout(timeout);
  }, [glitch, currLife]);

  useEffect(() => void composer.current.setSize(size.width, size.height), [
    composer,
    size,
  ]);

  useFrame(function ({ gl }) {
    const { playerBody } = playerApi.getState();
    if (playerBody.current) {
      const { y } = playerBody.current.position;
      if (y < 0) {
        water.current.factor = -y / 10;
        vignette.current.uniforms.offset.value = 0.95 + y / 10;
        vignette.current.uniforms.darkness.value = 1.6 - y / 10;
      }
    }
    gl.autoClear = true;
    composer.current.render();
  }, 1);

  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <outlinePass
        ref={outline}
        attachArray="passes"
        args={[aspect, scene, camera]}
        edgeStrength={100}
        edgeGlow={0}
        edgeThickness={2}
        visibleEdgeColor={new THREE.Color(OUTLINE_COLOR)}
        hiddenEdgeColor={new THREE.Color(OUTLINE_COLOR)}
        overlayMaterial-blending={THREE.SubtractiveBlending}
      />
      <waterPass attachArray="passes" factor={0} ref={water} />
      <glitchPass attachArray="passes" renderToScreen ref={glitch} />
      <filmPass attachArray="passes" args={[0.15, 0.025, 648, false]} />
      <shaderPass
        attachArray="passes"
        ref={vignette}
        args={[VignetteShader]}
        uniforms-offset-value={0.95}
        uniforms-darkness-value={1.6}
      />
      <shaderPass
        attachArray="passes"
        args={[RGBShiftShader]}
        uniforms-amount-value={0.0005}
      />
      <shaderPass
        attachArray="passes"
        args={[HorizontalBlurShader]}
        uniforms-h-value={0.0003}
      />
      <shaderPass
        attachArray="passes"
        args={[VerticalBlurShader]}
        uniforms-v-value={0.0003}
      />
    </effectComposer>
  );
}

export default Effects;
