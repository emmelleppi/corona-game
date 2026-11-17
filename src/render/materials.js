import * as THREE from "three";
import {
  gbufferVertex,
  worldFragment,
  characterFragment,
  unlitFragment,
  skyFragment,
  shadowVertex,
  shadowFragment,
} from "./shaders/gbuffer.js";
import {
  billboardVertex,
  billboardFragment,
  particleVertex,
  particleFragment,
  hudVertex,
  hudFragment,
} from "./shaders/forward.js";

// Uniforms shared by every G-Buffer material (same objects, updated once per frame).
export const globalUniforms = {
  uViewProjNoJitter: { value: new THREE.Matrix4() },
  uPrevViewProjNoJitter: { value: new THREE.Matrix4() },
  uTime: { value: 0 },
  uFrame: { value: 0 },
};

// Uniforms shared by the forward materials.
export const forwardUniforms = {
  tDepth: { value: null },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uNear: { value: 0.1 },
  uFar: { value: 300 },
  uPixelScale: { value: 1 },
  uBillboardSoftness: { value: 0.25 },
  uParticleSoftness: { value: 0.2 },
  uParticleEdge: { value: 0.2 },
  uParticleCore: { value: 0.8 },
  // G-Buffer jitter in pixels (the forward pass is drawn unjittered)
  uJitterPx: { value: new THREE.Vector2() },
};

// Uniforms shared by the HUD icon materials.
export const hudUniforms = {
  uBands: { value: 4 },
  uHudSpecular: { value: 0.6 },
  uHudRim: { value: 0.15 },
  uHudAmbient: { value: 0.35 },
};

// Look parameters shared by every G-Buffer material, refreshed once per frame
// from the settings (see updateStyleUniforms).
const c = (hex) => ({ value: new THREE.Color(hex) });
const f = (v) => ({ value: v });
export const styleUniforms = {
  // islands
  uTileSize: f(2.5),
  uTileVariation: f(0.06),
  uCheckerDarken: f(0.07),
  uGroutWidth: f(0.05),
  uGroutColor: c(0xe5dfef),
  uBorderBrightness: f(1.3),
  uBorderNoise: f(0.1),
  uBorderDots: f(0.35),
  uBorderDotsBrightness: f(1.25),
  uCliffBrightness: f(1.7),
  uCliffBottomColor: c(0x6f456f),
  uCliffDarkening: f(0.7),
  uCliffDepth: f(4.23),
  uSedimentFrequency: f(0.9),
  uSedimentContrast: f(0.12),
  uUndersideColor: c(0x553055),
  // characters
  uFlashEmissive: f(1.5),
  // start pad
  uPadPulseSpeed: f(4),
  uPadGlow: f(1.5),
  uPadBaseGlow: f(0.15),
  // sky
  uSkyTop: c(0x261340),
  uSkyHorizon: c(0x6a2c6e),
  uSkyText: c(0xd95b9a),
  uSkyTextOutline: c(0x673366),
  uSkyGradientLow: f(-0.2),
  uSkyGradientHigh: f(0.7),
  uSloganRepeats: f(4),
  uSloganScroll: f(0.01),
  uSloganScale: f(1.3),
  uSloganShimmer: f(0.15),
  uSparkleScale: f(30),
  uSparkleDensity: f(0.14),
  uSparkleSize: f(0.08),
  uSparkleIntensity: f(1.5),
  uSparkleColor: c(0xffe7f9),
};

// settings key -> uniform name
const STYLE_BINDINGS = {
  tileSize: "uTileSize",
  tileVariation: "uTileVariation",
  checkerDarken: "uCheckerDarken",
  groutWidth: "uGroutWidth",
  groutColor: "uGroutColor",
  borderBrightness: "uBorderBrightness",
  borderNoise: "uBorderNoise",
  borderDots: "uBorderDots",
  borderDotsBrightness: "uBorderDotsBrightness",
  cliffBrightness: "uCliffBrightness",
  cliffBottomColor: "uCliffBottomColor",
  cliffDarkening: "uCliffDarkening",
  cliffDepth: "uCliffDepth",
  sedimentFrequency: "uSedimentFrequency",
  sedimentContrast: "uSedimentContrast",
  undersideColor: "uUndersideColor",
  hitFlashEmissive: "uFlashEmissive",
  padPulseSpeed: "uPadPulseSpeed",
  padGlow: "uPadGlow",
  padBaseGlow: "uPadBaseGlow",
  skyTop: "uSkyTop",
  skyHorizon: "uSkyHorizon",
  skyText: "uSkyText",
  skyTextOutline: "uSkyTextOutline",
  skyGradientLow: "uSkyGradientLow",
  skyGradientHigh: "uSkyGradientHigh",
  sloganRepeats: "uSloganRepeats",
  sloganScroll: "uSloganScroll",
  sloganScale: "uSloganScale",
  sloganShimmer: "uSloganShimmer",
  sparkleScale: "uSparkleScale",
  sparkleDensity: "uSparkleDensity",
  sparkleSize: "uSparkleSize",
  sparkleIntensity: "uSparkleIntensity",
  sparkleColor: "uSparkleColor",
};

export function updateStyleUniforms(settings) {
  for (const [key, name] of Object.entries(STYLE_BINDINGS)) {
    const u = styleUniforms[name];
    if (u.value?.isColor) u.value.set(settings[key]);
    else u.value = settings[key];
  }
}

export const LAYERS = {
  GBUFFER: 0,
  SHADOW: 1,
  FORWARD: 2,
};

// Object ids are stored in a half float channel: integers are exact up to 2048.
// 0 = world / sky, 1 = start platform, characters cycle in [10, 2000).
let objectIdCounter = 10;
export const nextObjectId = () => {
  const id = objectIdCounter;
  objectIdCounter = objectIdCounter >= 1999 ? 10 : objectIdCounter + 1;
  return id;
};

function gbufferMaterial(
  fragmentShader,
  uniforms,
  { uv = false, side = THREE.FrontSide } = {}
) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: gbufferVertex,
    fragmentShader,
    defines: uv ? { USE_UV: "" } : {},
    side,
    uniforms: {
      ...globalUniforms,
      ...styleUniforms,
      uPrevModelMatrix: { value: new THREE.Matrix4() },
      uObjectId: { value: 0 },
      uOpacity: { value: 1 },
      ...uniforms,
    },
  });
}

export const createWorldMaterial = (color, pattern) =>
  gbufferMaterial(worldFragment, {
    uColor: { value: new THREE.Color(color) },
    uPattern: { value: pattern },
  });

export const createCharacterMaterial = (color, opts = {}) =>
  gbufferMaterial(
    characterFragment,
    {
      uColor: { value: new THREE.Color(color) },
      uFlashColor: { value: new THREE.Color(opts.flashColor ?? 0xffffff) },
      uFlash: { value: 0 },
      uEmissive: { value: opts.emissive ?? 0 },
      uSpecular: { value: opts.specular ?? 1 },
    },
    { side: opts.side ?? THREE.FrontSide }
  );

export const createUnlitMaterial = (color, glow) =>
  gbufferMaterial(unlitFragment, {
    uColor: { value: new THREE.Color(color) },
    uGlowColor: { value: new THREE.Color(glow) },
  });

export const createSkyMaterial = (wordsTexture, wordCount) =>
  gbufferMaterial(
    skyFragment,
    {
      uWords: { value: wordsTexture },
      uWordA: { value: 0 },
      uWordB: { value: 0 },
      uWordMix: { value: 0 },
      uWordCount: { value: wordCount },
    },
    { side: THREE.BackSide }
  );

export const createShadowMaterial = () =>
  new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: shadowVertex,
    fragmentShader: shadowFragment,
    side: THREE.DoubleSide,
    colorWrite: false,
  });

export const createBillboardMaterial = (
  map,
  { color = 0xffffff, brightness = 1 } = {}
) =>
  new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: billboardVertex,
    fragmentShader: billboardFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      ...forwardUniforms,
      tMap: { value: map },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1 },
      uBrightness: { value: brightness },
      uScale: { value: new THREE.Vector2(1, 1) },
      uRotation: { value: 0 },
    },
  });

export const createParticleMaterial = () =>
  new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { ...forwardUniforms },
  });

export const createHudMaterial = (
  color,
  { outline = 0, isOutline = false } = {}
) =>
  new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: hudVertex,
    fragmentShader: hudFragment,
    side: isOutline ? THREE.BackSide : THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOutline: { value: outline },
      uIsOutline: { value: isOutline },
      ...hudUniforms,
    },
  });

// Registers a mesh in the deferred pipeline: unique id for the outlines,
// previous model matrix for the motion vectors, shadow casting layer.
export function setupGBufferMesh(mesh, { objectId, castShadow = true } = {}) {
  mesh.userData.objectId = objectId ?? 0;
  mesh.userData.prevMatrixWorld = new THREE.Matrix4();
  mesh.userData.hasPrev = false;
  mesh.layers.set(LAYERS.GBUFFER);
  if (castShadow) mesh.layers.enable(LAYERS.SHADOW);
  mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
    const u = material.uniforms;
    if (!u || !u.uPrevModelMatrix) return;
    u.uPrevModelMatrix.value.copy(
      mesh.userData.hasPrev ? mesh.userData.prevMatrixWorld : mesh.matrixWorld
    );
    u.uObjectId.value = mesh.userData.objectId;
    material.uniformsNeedUpdate = true;
  };
  return mesh;
}

export function setupForwardObject(object) {
  object.layers.set(LAYERS.FORWARD);
  object.frustumCulled = false;
  return object;
}
