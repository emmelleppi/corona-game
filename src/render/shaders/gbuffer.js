import { header, common } from "./common.js";

// ---------------------------------------------------------------------------
// G-Buffer layout (3 x RGBA16F + depth):
//   RT0: albedo.rgb, material id
//   RT1: view space normal (octahedral), object id, outline flag
//   RT2: screen space velocity (for TAA), emissive, specular / rim strength
// ---------------------------------------------------------------------------

export const gbufferVertex = /* glsl */ `${header}
in vec3 position;
in vec3 normal;
#ifdef USE_UV
in vec2 uv;
out vec2 vUv;
#endif

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform mat4 uPrevModelMatrix;
uniform mat4 uViewProjNoJitter;
uniform mat4 uPrevViewProjNoJitter;

out vec3 vNormalView;
out vec3 vNormalWorld;
out vec3 vWorldPos;
out vec3 vLocalPos;
out vec4 vCurrClip;
out vec4 vPrevClip;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 prevWorldPos = uPrevModelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vLocalPos = position;
  vNormalView = normalize(normalMatrix * normal);
  vNormalWorld = normalize(mat3(modelMatrix) * normal);
#ifdef USE_UV
  vUv = uv;
#endif
  vCurrClip = uViewProjNoJitter * worldPos;
  vPrevClip = uPrevViewProjNoJitter * prevWorldPos;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const gbufferOutputs = /* glsl */ `
layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gExtra;

in vec3 vNormalView;
in vec3 vNormalWorld;
in vec3 vWorldPos;
in vec3 vLocalPos;
in vec4 vCurrClip;
in vec4 vPrevClip;
#ifdef USE_UV
in vec2 vUv;
#endif

uniform float uFrame;
uniform float uTime;
uniform float uObjectId;
uniform float uOpacity;

// Screen-door transparency: combined with the TAA it resolves to a smooth fade
// while keeping the deferred pipeline fully opaque.
void ditherClip(float opacity) {
  if (opacity >= 0.999) return;
  float n = interleavedGradientNoise(gl_FragCoord.xy + mod(uFrame, 64.0) * 5.588238);
  if (opacity <= n) discard;
}

vec3 viewNormal() {
  vec3 n = normalize(vNormalView);
  return gl_FrontFacing ? n : -n;
}

void writeGBuffer(vec3 albedo, vec3 n, float matId, float outline, float emissive, float spec) {
  vec2 curr = vCurrClip.xy / vCurrClip.w;
  vec2 prev = vPrevClip.xy / vPrevClip.w;
  gAlbedo = vec4(albedo, matId);
  gNormal = vec4(encodeNormal(n), uObjectId, outline);
  gExtra = vec4((curr - prev) * 0.5, emissive, spec);
}
`;

// Island tiles: procedural tiles on the top faces and layered rock on the sides.
export const worldFragment = /* glsl */ `${header}
${common}
${gbufferOutputs}
uniform vec3 uColor;
uniform float uPattern; // 0: outer ring, 1: inner tiles

void main() {
  vec3 nw = normalize(vNormalWorld);
  vec3 albedo = uColor;
  float emissive = 0.0;

  if (nw.y > 0.5) {
    if (uPattern > 0.5) {
      // checkerboard of soft tiles with darker grout
      vec2 p = vWorldPos.xz / 2.5;
      vec2 cell = floor(p);
      vec2 f = fract(p);
      float checker = mod(cell.x + cell.y, 2.0);
      float tileVar = hash12(cell) * 0.06;
      albedo *= 1.0 - checker * 0.07 - tileVar;
      vec2 e = min(f, 1.0 - f);
      float grout = 1.0 - smoothstep(0.02, 0.05, min(e.x, e.y));
      albedo = mix(albedo, albedo * vec3(0.78, 0.74, 0.86), grout);
    } else {
      // speckled border
      albedo *= 1.3;
      float n = valueNoise(vWorldPos.xz * 1.7);
      float dots = smoothstep(0.78, 0.8, valueNoise(vWorldPos.xz * 5.0 + 13.0));
      albedo *= 0.95 + 0.1 * n;
      albedo = mix(albedo, albedo * 1.25, dots * 0.35);
    }
  } else if (nw.y > -0.5) {
    // cliff sides: darker going down, with sediment layers
    float depth = saturate(-vWorldPos.y / 4.23);
    float layers = smoothstep(0.45, 0.5, fract(vWorldPos.y * 0.9 + valueNoise(vWorldPos.xz * 0.6) * 0.6));
    albedo = mix(uColor * 1.7, vec3(0.16, 0.06, 0.16), depth * 0.7);
    albedo *= 0.9 + layers * 0.12;
  } else {
    albedo = vec3(0.09, 0.03, 0.09);
  }

  writeGBuffer(albedo, viewNormal(), MAT_WORLD, 0.0, emissive, 0.0);
}
`;

// Characters (coronas, bat, ...): flat colour, 5 tone ramp in the lighting pass.
export const characterFragment = /* glsl */ `${header}
${common}
${gbufferOutputs}
uniform vec3 uColor;
uniform vec3 uFlashColor;
uniform float uFlash;
uniform float uEmissive;
uniform float uSpecular;

void main() {
  ditherClip(uOpacity);
  vec3 albedo = mix(uColor, uFlashColor, uFlash);
  writeGBuffer(albedo, viewNormal(), MAT_CHARACTER, 1.0, uEmissive + uFlash * 1.5, uSpecular);
}
`;

// Unlit / emissive surfaces (start pad).
export const unlitFragment = /* glsl */ `${header}
${common}
${gbufferOutputs}
uniform vec3 uColor;
uniform vec3 uGlowColor;

void main() {
  ditherClip(uOpacity);
  float r = length(vLocalPos.xz);
  float ring = smoothstep(0.78, 0.84, r) * (1.0 - smoothstep(0.92, 0.97, r));
  float pulse = 0.6 + 0.4 * sin(uTime * 4.0 - r * 10.0);
  vec3 albedo = mix(uColor, uGlowColor, ring);
  float emissive = ring * (1.5 + pulse) + (1.0 - ring) * 0.15 * pulse;
  writeGBuffer(albedo, viewNormal(), MAT_WORLD, 1.0, emissive, 0.0);
}
`;

// Sky dome: purple gradient, slogans written all around and some sparkles.
export const skyFragment = /* glsl */ `${header}
${common}
${gbufferOutputs}
uniform sampler2D uWords;
uniform float uWordA;
uniform float uWordB;
uniform float uWordMix;
uniform float uWordCount;
uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uTextColor;
uniform vec3 uTextOutline;

vec4 sampleWord(vec2 uv, float word) {
  vec2 p = vec2(uv.x, (word + uv.y) / uWordCount);
  return texture(uWords, p);
}

void main() {
  vec3 dir = normalize(vLocalPos);
  float h = dir.y;
  vec3 col = mix(uHorizonColor, uTopColor, smoothstep(-0.2, 0.7, h));

  // slogans, repeated 4 times around the horizon and slowly scrolling
  float u = fract(atan(dir.z, dir.x) / (2.0 * PI) * 4.0 + uTime * 0.01);
  float v = 0.5 + h * 1.3;
  if (v > 0.0 && v < 1.0) {
    vec2 uv = vec2(u, 1.0 - v);
    // the old word fades out, then the new one fades in
    vec4 a = sampleWord(uv, uWordA);
    vec4 b = sampleWord(uv, uWordB);
    vec4 w = uWordMix < 0.5 ? a * (1.0 - uWordMix * 2.0) : b * (uWordMix * 2.0 - 1.0);
    // r: fill, g: outline
    col = mix(col, uTextOutline, w.g);
    col = mix(col, uTextColor * (1.0 + 0.15 * sin(uTime * 3.0 + u * 20.0)), w.r);
  }

  // twinkling sparkles
  vec2 sp = vec2(atan(dir.z, dir.x) * 30.0, h * 30.0);
  vec2 cell = floor(sp);
  float rnd = hash12(cell);
  vec2 f = fract(sp) - 0.5 - (vec2(hash12(cell + 7.0), hash12(cell + 3.0)) - 0.5) * 0.6;
  float star = smoothstep(0.08, 0.0, length(f)) * step(0.86, rnd);
  star *= 0.5 + 0.5 * sin(uTime * (2.0 + rnd * 4.0) + rnd * 40.0);
  col += star * smoothstep(0.05, 0.4, h) * vec3(1.0, 0.8, 0.95) * 1.5;

  writeGBuffer(col, viewNormal(), MAT_SKY, 0.0, 0.0, 0.0);
}
`;

// Depth only material used for the shadow map.
export const shadowVertex = /* glsl */ `${header}
in vec3 position;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
void main() {
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const shadowFragment = /* glsl */ `${header}
out vec4 fragColor;
void main() {
  fragColor = vec4(1.0);
}
`;
