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
};

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
      uTopColor: { value: new THREE.Color(0x261340) },
      uHorizonColor: { value: new THREE.Color(0x6a2c6e) },
      uTextColor: { value: new THREE.Color(0xd95b9a) },
      uTextOutline: { value: new THREE.Color(0x673366) },
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
      uBands: { value: 4 },
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
