import * as THREE from "three";
import { FullscreenPass } from "./FullscreenPass.js";
import { lightingFragment } from "./shaders/lighting.js";
import {
  taaFragment,
  bloomDownFragment,
  bloomUpFragment,
  compositeFragment,
  fxaaFragment,
} from "./shaders/post.js";
import {
  globalUniforms,
  forwardUniforms,
  LAYERS,
  createShadowMaterial,
  updateStyleUniforms,
} from "./materials.js";
import { halton } from "../core/math.js";

const BLOOM_LEVELS = 6;
const DEBUG_VIEWS = {
  Final: 0,
  Albedo: 1,
  Normals: 2,
  Depth: 3,
  Velocity: 4,
  Shadows: 5,
  Outlines: 6,
};
export const DEBUG_VIEW_NAMES = Object.keys(DEBUG_VIEWS);
const TONE_MAPPINGS = { None: 0, ACES: 1, AgX: 2 };
export const TONE_MAPPING_NAMES = Object.keys(TONE_MAPPINGS);
export const AA_MODES = ["TAA", "FXAA", "TAA + FXAA", "None"];

const color = (hex) => new THREE.Color(hex);

function makeTarget(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
    ...opts,
  });
}

// Deferred renderer:
//   shadow map -> G-Buffer (MRT) -> toon lighting + outlines + fog
//   -> forward (sprites, particles) -> TAA -> bloom -> composite -> FXAA
export class Pipeline {
  constructor(renderer, settings) {
    this.renderer = renderer;
    this.settings = settings;
    this.frame = 0;
    this.width = 1;
    this.height = 1;
    this.historyValid = false;
    this.shadowFocus = new THREE.Vector3();

    this.projNoJitter = new THREE.Matrix4();
    this.viewProjNoJitter = new THREE.Matrix4();
    this.prevViewProjNoJitter = new THREE.Matrix4();
    this.hasPrevViewProj = false;

    this.createTargets();
    this.createPasses();
    this.createShadows();
  }

  createTargets() {
    const depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
    this.gbuffer = new THREE.WebGLRenderTarget(1, 1, {
      count: 3,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      depthTexture,
      generateMipmaps: false,
    });
    this.gbuffer.textures[0].name = "albedo";
    this.gbuffer.textures[1].name = "normal";
    this.gbuffer.textures[2].name = "extra";

    this.lit = makeTarget(1, 1);
    this.history = [makeTarget(1, 1), makeTarget(1, 1)];
    this.bloomMips = Array.from({ length: BLOOM_LEVELS }, () =>
      makeTarget(1, 1)
    );
    this.hudTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.ldr = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
  }

  createShadows() {
    this.shadowMaterial = createShadowMaterial();
    this.shadowCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
    this.shadowCamera.layers.set(LAYERS.SHADOW);
    this.shadowMatrix = new THREE.Matrix4();
    this.resizeShadowMap(this.settings.shadowResolution);
  }

  resizeShadowMap(size) {
    this.shadowTarget?.dispose();
    const depthTexture = new THREE.DepthTexture(size, size, THREE.FloatType);
    depthTexture.compareFunction = THREE.LessEqualCompare;
    depthTexture.minFilter = THREE.LinearFilter;
    depthTexture.magFilter = THREE.LinearFilter;
    this.shadowTarget = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      depthTexture,
    });
    this.shadowSize = size;
    if (this.lighting) this.lighting.uniforms.tShadow.value = depthTexture;
  }

  createPasses() {
    this.lighting = new FullscreenPass(lightingFragment, {
      tAlbedo: { value: this.gbuffer.textures[0] },
      tNormal: { value: this.gbuffer.textures[1] },
      tExtra: { value: this.gbuffer.textures[2] },
      tDepth: { value: this.gbuffer.depthTexture },
      tShadow: { value: null },
      uResolution: { value: new THREE.Vector2() },
      uProjInv: { value: new THREE.Matrix4() },
      uViewInv: { value: new THREE.Matrix4() },
      uNear: { value: 0.1 },
      uFar: { value: 300 },
      uTime: { value: 0 },
      uBackground: { value: color(0x3b163a) },
      uSunDir: { value: new THREE.Vector3() },
      uSunColor: { value: color(0xffffff) },
      uSkyAmbient: { value: color(0xffffff) },
      uGroundAmbient: { value: color(0xffffff) },
      uDiscoDirA: { value: new THREE.Vector3() },
      uDiscoColorA: { value: color(0xff0000) },
      uDiscoDirB: { value: new THREE.Vector3() },
      uDiscoColorB: { value: color(0x0000ff) },
      uRimColor: { value: color(0xffffff) },
      uShadowTint: { value: color(0xffffff) },
      uWorldBands: { value: 3 },
      uCharacterBands: { value: 5 },
      uBandSoftness: { value: 0.05 },
      uSpecular: { value: 1 },
      uRim: { value: 0.5 },
      uShadows: { value: true },
      uShadowMatrix: { value: new THREE.Matrix4() },
      uShadowTexel: { value: 1 / 2048 },
      uShadowBias: { value: 0.0005 },
      uFog: { value: true },
      uFogColor: { value: color(0x333333) },
      uFogNear: { value: 10 },
      uFogFar: { value: 50 },
      uOutlines: { value: true },
      uWorldOutlines: { value: true },
      uOutlineColor: { value: color(0x000000) },
      uOutlineWidth: { value: 1.5 },
      uDepthThreshold: { value: 0.1 },
      uNormalThreshold: { value: 0.3 },
      uShadowNormalOffset: { value: 0.06 },
      uShadowSlopeOffset: { value: 0.12 },
      uShadowSoftness: { value: 0.15 },
      uDiscoBands: { value: 2 },
      uShininess: { value: 48 },
      uSpecularSize: { value: 0.05 },
      uRimThreshold: { value: 0.62 },
      uRimWidth: { value: 0.06 },
      uOutlineFogFade: { value: 0.85 },
      uSilhouetteBias: { value: 0.002 },
      uEdgeSoftness: { value: 1 },
      uAmbientBias: { value: 0 },
      uDebug: { value: 0 },
    });

    this.taa = new FullscreenPass(taaFragment, {
      tCurrent: { value: this.lit.texture },
      tHistory: { value: null },
      tVelocity: { value: this.gbuffer.textures[2] },
      tDepth: { value: this.gbuffer.depthTexture },
      uTexel: { value: new THREE.Vector2() },
      uFeedback: { value: 0.9 },
      uVarianceGamma: { value: 1 },
      uReset: { value: true },
      uMotionFeedback: { value: 0.85 },
      uMotionPixels: { value: 30 },
    });

    this.bloomDown = new FullscreenPass(bloomDownFragment, {
      tSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uPrefilter: { value: false },
      uThreshold: { value: 1 },
      uKnee: { value: 0.5 },
    });
    this.bloomUp = new FullscreenPass(
      bloomUpFragment,
      {
        tSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRadius: { value: 1 },
        uWeight: { value: 1 },
      },
      {
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      }
    );

    this.composite = new FullscreenPass(compositeFragment, {
      tColor: { value: null },
      tBloom: { value: this.bloomMips[0].texture },
      tHud: { value: this.hudTarget.texture },
      uTexel: { value: new THREE.Vector2() },
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uBloom: { value: true },
      uBloomStrength: { value: 0.5 },
      uExposure: { value: 1 },
      uToneMapping: { value: 1 },
      uSaturation: { value: 1 },
      uContrast: { value: 1 },
      uSharpen: { value: 0 },
      uChromatic: { value: 0.001 },
      uVignetteOffset: { value: 0.95 },
      uVignetteDarkness: { value: 1.6 },
      uGrain: { value: 0.15 },
      uScanlines: { value: 0.025 },
      uWater: { value: 0 },
      uGlitch: { value: 0 },
      uGlitchSeed: { value: new THREE.Vector4() },
      uSpeedLines: { value: 0 },
      uDamage: { value: 0 },
      uHud: { value: true },
      uRaw: { value: false },
      uEncode: { value: true },
      uSpeedLinesFps: { value: 24 },
      uSpeedLinesCount: { value: 180 },
      uSpeedLinesDensity: { value: 0.28 },
      uSpeedLinesInner: { value: 0.25 },
      uSpeedLinesOpacity: { value: 0.55 },
      uSpeedLinesColor: { value: color(0xffffff) },
      uWaterAmplitude: { value: 0.015 },
      uWaterFrequency: { value: 6 },
      uWaterSpeed: { value: 3 },
      uGlitchShift: { value: 0.12 },
      uGlitchSplit: { value: 0.012 },
      uGlitchBands: { value: 24 },
      uDamageColor: { value: color(0xe10050) },
      uDamageOpacity: { value: 0.8 },
      uDamageChromatic: { value: 0.004 },
      uVignetteColor: { value: color(0xffffff) },
      uScanlineFrequency: { value: 1.2 },
      uDither: { value: 1 },
    });

    this.fxaa = new FullscreenPass(fxaaFragment, {
      tSource: { value: this.ldr.texture },
      uTexel: { value: new THREE.Vector2() },
      uEdgeThresholdMin: { value: 0.0312 },
      uEdgeThresholdMax: { value: 0.125 },
      uSubpixelQuality: { value: 0.75 },
    });
  }

  get internalSize() {
    const s = this.settings.renderScale;
    return [
      Math.max(1, Math.round(this.width * s)),
      Math.max(1, Math.round(this.height * s)),
    ];
  }

  // width / height in device pixels
  setSize(width, height) {
    this.width = width;
    this.height = height;
    const [iw, ih] = this.internalSize;
    this.gbuffer.setSize(iw, ih);
    this.lit.setSize(iw, ih);
    this.history.forEach((t) => t.setSize(iw, ih));
    let bw = iw;
    let bh = ih;
    for (const mip of this.bloomMips) {
      bw = Math.max(1, bw >> 1);
      bh = Math.max(1, bh >> 1);
      mip.setSize(bw, bh);
    }
    const ss = Math.min(2, 4096 / Math.max(width, height));
    this.hudScale = Math.max(1, ss);
    this.hudTarget.setSize(
      Math.round(width * this.hudScale),
      Math.round(height * this.hudScale)
    );
    this.ldr.setSize(width, height);

    forwardUniforms.uResolution.value.set(iw, ih);
    this.lighting.uniforms.uResolution.value.set(iw, ih);
    this.taa.uniforms.uTexel.value.set(1 / iw, 1 / ih);
    this.composite.uniforms.uTexel.value.set(1 / iw, 1 / ih);
    this.composite.uniforms.uResolution.value.set(width, height);
    this.composite.uniforms.uAspect.value = width / height;
    this.fxaa.uniforms.uTexel.value.set(1 / width, 1 / height);
    this.resetHistory();
  }

  resetHistory() {
    this.historyValid = false;
  }

  get taaEnabled() {
    return this.settings.antialiasing.startsWith("TAA");
  }

  get fxaaEnabled() {
    return this.settings.antialiasing.endsWith("FXAA");
  }

  applyJitter(camera) {
    camera.updateProjectionMatrix();
    this.projNoJitter.copy(camera.projectionMatrix);
    if (!this.taaEnabled) return;
    const [iw, ih] = this.internalSize;
    const s = this.settings;
    const i = (this.frame % Math.max(1, Math.round(s.taaJitterSamples))) + 1;
    const jx = (halton(i, 2) - 0.5) * 2 * s.taaJitterScale;
    const jy = (halton(i, 3) - 0.5) * 2 * s.taaJitterScale;
    camera.projectionMatrix.elements[8] += jx / iw;
    camera.projectionMatrix.elements[9] += jy / ih;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  removeJitter(camera) {
    camera.projectionMatrix.copy(this.projNoJitter);
    camera.projectionMatrixInverse.copy(this.projNoJitter).invert();
  }

  updateShadowCamera() {
    const s = this.settings;
    const cam = this.shadowCamera;
    const extent = s.shadowExtent;
    cam.left = cam.bottom = -extent;
    cam.right = cam.top = extent;
    cam.updateProjectionMatrix();

    const dir = this.sunDirection;
    cam.position.copy(dir).multiplyScalar(s.shadowDistance);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();

    // snap the focus point to the shadow map texels to avoid shimmering
    const texel = (2 * extent) / this.shadowSize;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const f = this.shadowFocus;
    const r = Math.round(f.dot(right) / texel) * texel;
    const u = Math.round(f.dot(up) / texel) * texel;
    const fwd = f.dot(dir);
    const focus = new THREE.Vector3()
      .addScaledVector(right, r)
      .addScaledVector(up, u)
      .addScaledVector(dir, fwd);
    cam.position.copy(focus).addScaledVector(dir, s.shadowDistance);
    cam.far = s.shadowDistance + 250;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.shadowMatrix.multiplyMatrices(
      cam.projectionMatrix,
      cam.matrixWorldInverse
    );
  }

  get sunDirection() {
    const s = this.settings;
    const el = THREE.MathUtils.degToRad(s.sunElevation);
    const az = THREE.MathUtils.degToRad(s.sunAzimuth);
    return new THREE.Vector3(
      Math.cos(el) * Math.sin(az),
      Math.sin(el),
      Math.cos(el) * Math.cos(az)
    ).normalize();
  }

  updateLightingUniforms(camera, time) {
    const s = this.settings;
    const u = this.lighting.uniforms;
    const view = camera.matrixWorldInverse;

    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uViewInv.value.copy(camera.matrixWorld);
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uTime.value = time;

    u.uSunDir.value.copy(this.sunDirection).transformDirection(view);
    u.uSunColor.value.set(s.sunColor).multiplyScalar(s.sunIntensity);
    u.uSkyAmbient.value.set(s.skyAmbient).multiplyScalar(s.ambientIntensity);
    u.uGroundAmbient.value
      .set(s.groundAmbient)
      .multiplyScalar(s.ambientIntensity);
    u.uShadowTint.value.set(s.shadowTint);

    // the two coloured "disco" lights spinning around the arena
    const a = time * s.discoSpeed;
    const discoY = Math.tan(THREE.MathUtils.degToRad(s.discoElevation));
    u.uDiscoDirA.value
      .set(Math.cos(a), discoY, Math.sin(a))
      .normalize()
      .transformDirection(view);
    u.uDiscoDirB.value
      .set(-Math.cos(a), discoY, -Math.sin(a))
      .normalize()
      .transformDirection(view);
    u.uDiscoColorA.value.set(s.discoColorA).multiplyScalar(s.discoIntensity);
    u.uDiscoColorB.value.set(s.discoColorB).multiplyScalar(s.discoIntensity);

    u.uWorldBands.value = s.worldBands;
    u.uCharacterBands.value = s.characterBands;
    u.uBandSoftness.value = s.bandSoftness;
    u.uSpecular.value = s.specular;
    u.uRim.value = s.rim;
    u.uRimColor.value.set(s.rimColor);

    u.uShadows.value = s.shadows;
    u.uShadowMatrix.value.copy(this.shadowMatrix);
    u.uShadowTexel.value = 1 / this.shadowSize;
    u.uShadowBias.value = s.shadowBias;

    u.uFog.value = s.fog;
    u.uFogColor.value.set(s.fogColor);
    u.uFogNear.value = s.fogNear;
    u.uFogFar.value = s.fogFar;

    u.uOutlines.value = s.outlines;
    u.uWorldOutlines.value = s.worldOutlines;
    u.uOutlineColor.value.set(s.outlineColor);
    u.uOutlineWidth.value = s.outlineWidth;
    u.uDepthThreshold.value = s.depthThreshold;
    u.uNormalThreshold.value = s.normalThreshold;
    u.uShadowNormalOffset.value = s.shadowNormalOffset;
    u.uShadowSlopeOffset.value = s.shadowSlopeOffset;
    u.uShadowSoftness.value = s.shadowSoftness;
    u.uDiscoBands.value = s.discoBands;
    u.uShininess.value = s.shininess;
    u.uSpecularSize.value = s.specularSize;
    u.uRimThreshold.value = s.rimThreshold;
    u.uRimWidth.value = s.rimWidth;
    u.uOutlineFogFade.value = s.outlineFogFade;
    u.uSilhouetteBias.value = s.silhouetteBias;
    u.uEdgeSoftness.value = s.edgeSoftness;
    u.uAmbientBias.value = s.ambientBias;
    u.uDebug.value = DEBUG_VIEWS[s.debugView] ?? 0;
  }

  render({ scene, camera, hudScene, hudCamera, time, effects }) {
    const renderer = this.renderer;
    const s = this.settings;
    const [iw, ih] = this.internalSize;

    if (this.shadowSize !== s.shadowResolution)
      this.resizeShadowMap(s.shadowResolution);

    renderer.autoClear = false;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    // --- camera matrices / jitter -----------------------------------------
    this.applyJitter(camera);
    this.viewProjNoJitter.multiplyMatrices(
      this.projNoJitter,
      camera.matrixWorldInverse
    );
    if (!this.hasPrevViewProj)
      this.prevViewProjNoJitter.copy(this.viewProjNoJitter);
    globalUniforms.uViewProjNoJitter.value.copy(this.viewProjNoJitter);
    globalUniforms.uPrevViewProjNoJitter.value.copy(this.prevViewProjNoJitter);
    globalUniforms.uTime.value = time;
    globalUniforms.uFrame.value = this.frame;
    updateStyleUniforms(s);

    // --- shadow map ---------------------------------------------------------
    if (s.shadows) {
      this.updateShadowCamera();
      renderer.setRenderTarget(this.shadowTarget);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear(true, true, false);
      scene.overrideMaterial = this.shadowMaterial;
      renderer.render(scene, this.shadowCamera);
      scene.overrideMaterial = null;
    }

    // --- G-Buffer -------------------------------------------------------------
    camera.layers.set(LAYERS.GBUFFER);
    renderer.setRenderTarget(this.gbuffer);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);

    // --- lighting -------------------------------------------------------------
    this.updateLightingUniforms(camera, time);
    this.lighting.uniforms.uBackground.value.set(s.background);
    this.lighting.render(renderer, this.lit);

    // --- forward (sprites, particles) -----------------------------------------
    forwardUniforms.tDepth.value = this.gbuffer.depthTexture;
    forwardUniforms.uNear.value = camera.near;
    forwardUniforms.uFar.value = camera.far;
    forwardUniforms.uBillboardSoftness.value = s.billboardSoftness;
    forwardUniforms.uParticleSoftness.value = s.particleSoftness;
    forwardUniforms.uParticleEdge.value = s.particleEdge;
    forwardUniforms.uParticleCore.value = s.particleCore;
    forwardUniforms.uPixelScale.value =
      ih / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    camera.layers.set(LAYERS.FORWARD);
    renderer.setRenderTarget(this.lit);
    renderer.render(scene, camera);
    camera.layers.set(LAYERS.GBUFFER);

    // --- anti aliasing (temporal) ----------------------------------------------
    let current = this.lit;
    if (this.taaEnabled && s.debugView !== "Velocity") {
      const write = this.history[this.frame % 2];
      const read = this.history[(this.frame + 1) % 2];
      const u = this.taa.uniforms;
      u.tHistory.value = read.texture;
      u.uReset.value = !this.historyValid;
      u.uFeedback.value = s.taaFeedback;
      u.uVarianceGamma.value = s.taaVarianceGamma;
      u.uMotionFeedback.value = s.taaMotionFeedback;
      u.uMotionPixels.value = s.taaMotionPixels;
      this.taa.render(renderer, write);
      this.historyValid = true;
      current = write;
    } else {
      this.historyValid = false;
    }

    // --- bloom ----------------------------------------------------------------
    const debug = s.debugView !== "Final";
    if (s.bloom && !debug) this.renderBloom(current);

    // --- HUD ------------------------------------------------------------------
    if (hudScene) {
      renderer.setRenderTarget(this.hudTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.render(hudScene, hudCamera);
    }

    // --- composite ------------------------------------------------------------
    const c = this.composite.uniforms;
    c.tColor.value = current.texture;
    c.uTime.value = time;
    c.uBloom.value = s.bloom && !debug;
    c.uBloomStrength.value = s.bloomStrength;
    c.uExposure.value = s.exposure;
    c.uToneMapping.value = TONE_MAPPINGS[s.toneMapping] ?? 1;
    c.uSaturation.value = s.saturation;
    c.uContrast.value = s.contrast;
    c.uSharpen.value = this.taaEnabled ? s.sharpen : 0;
    c.uChromatic.value = s.chromaticAberration;
    c.uVignetteOffset.value = effects.vignetteOffset ?? s.vignetteOffset;
    c.uVignetteDarkness.value = effects.vignetteDarkness ?? s.vignetteDarkness;
    c.uGrain.value = s.grain;
    c.uScanlines.value = s.scanlines;
    c.uWater.value = effects.water ?? 0;
    c.uGlitch.value = effects.glitch ?? 0;
    c.uGlitchSeed.value.set(
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random()
    );
    c.uSpeedLines.value = s.speedLines ? (effects.speedLines ?? 0) : 0;
    c.uDamage.value = effects.damage ?? 0;
    c.uHud.value = !!hudScene && !debug;
    c.uRaw.value = debug;
    c.uEncode.value = true;
    c.uSpeedLinesFps.value = s.speedLinesFps;
    c.uSpeedLinesCount.value = s.speedLinesCount;
    c.uSpeedLinesDensity.value = s.speedLinesDensity;
    c.uSpeedLinesInner.value = s.speedLinesInner;
    c.uSpeedLinesOpacity.value = s.speedLinesOpacity;
    c.uSpeedLinesColor.value.set(s.speedLinesColor);
    c.uWaterAmplitude.value = s.waterAmplitude;
    c.uWaterFrequency.value = s.waterFrequency;
    c.uWaterSpeed.value = s.waterSpeed;
    c.uGlitchShift.value = s.glitchShift;
    c.uGlitchSplit.value = s.glitchSplit;
    c.uGlitchBands.value = s.glitchBands;
    c.uDamageColor.value.set(s.damageColor);
    c.uDamageOpacity.value = s.damageOpacity;
    c.uDamageChromatic.value = s.damageChromatic;
    c.uVignetteColor.value.set(s.vignetteColor);
    c.uScanlineFrequency.value = s.scanlineFrequency;
    c.uDither.value = s.dither;

    const fx = this.fxaa.uniforms;
    fx.uEdgeThresholdMin.value = s.fxaaEdgeMin;
    fx.uEdgeThresholdMax.value = s.fxaaEdgeMax;
    fx.uSubpixelQuality.value = s.fxaaSubpixel;

    if (this.fxaaEnabled && !debug) {
      this.composite.render(renderer, this.ldr);
      this.fxaa.render(renderer, null);
    } else {
      this.composite.render(renderer, null);
    }

    // --- end of frame bookkeeping -------------------------------------------
    this.removeJitter(camera);
    this.prevViewProjNoJitter.copy(this.viewProjNoJitter);
    this.hasPrevViewProj = true;
    scene.traverse((o) => {
      const p = o.userData.prevMatrixWorld;
      if (p) {
        p.copy(o.matrixWorld);
        o.userData.hasPrev = true;
      }
    });
    this.frame++;
  }

  renderBloom(source) {
    const r = this.renderer;
    const s = this.settings;
    const down = this.bloomDown.uniforms;
    let input = source;
    const levels = Math.max(
      1,
      Math.min(BLOOM_LEVELS, Math.round(s.bloomLevels))
    );
    for (let i = 0; i < levels; i++) {
      down.tSource.value = input.texture;
      down.uTexel.value.set(1 / input.width, 1 / input.height);
      down.uPrefilter.value = i === 0;
      down.uThreshold.value = s.bloomThreshold;
      down.uKnee.value = s.bloomThreshold * s.bloomKnee + 1e-3;
      this.bloomDown.render(r, this.bloomMips[i]);
      input = this.bloomMips[i];
    }
    const up = this.bloomUp.uniforms;
    for (let i = levels - 1; i > 0; i--) {
      const src = this.bloomMips[i];
      up.tSource.value = src.texture;
      up.uTexel.value.set(1 / src.width, 1 / src.height);
      up.uRadius.value = s.bloomRadius;
      up.uWeight.value = s.bloomMipWeight;
      this.bloomUp.render(r, this.bloomMips[i - 1]);
    }
  }

  // Signals a discontinuity (camera cut), the TAA history must be dropped.
  cut() {
    this.resetHistory();
    this.hasPrevViewProj = false;
  }
}
