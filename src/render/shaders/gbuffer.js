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
uniform float uTileSize;
uniform float uTileVariation;
uniform float uCheckerDarken;
uniform float uGroutWidth;
uniform vec3 uGroutColor;
uniform float uBorderBrightness;
uniform float uBorderNoise;
uniform float uBorderDots;
uniform float uBorderDotsBrightness;
uniform float uCliffBrightness;
uniform vec3 uCliffBottomColor;
uniform float uCliffDarkening;
uniform float uCliffDepth;
uniform float uSedimentFrequency;
uniform float uSedimentContrast;
uniform vec3 uUndersideColor;

void main() {
  vec3 nw = normalize(vNormalWorld);
  vec3 albedo = uColor;

  if (nw.y > 0.5) {
    if (uPattern > 0.5) {
      // checkerboard of soft tiles with darker grout
      vec2 p = vWorldPos.xz / max(uTileSize, 0.01);
      vec2 cell = floor(p);
      vec2 f = fract(p);
      float checker = mod(cell.x + cell.y, 2.0);
      float tileVar = hash12(cell) * uTileVariation;
      albedo *= 1.0 - checker * uCheckerDarken - tileVar;
      vec2 e = min(f, 1.0 - f);
      float gw = max(uGroutWidth, 1e-4);
      float grout = 1.0 - smoothstep(gw * 0.4, gw, min(e.x, e.y));
      albedo = mix(albedo, albedo * uGroutColor, grout);
    } else {
      // speckled border
      albedo *= uBorderBrightness;
      float n = valueNoise(vWorldPos.xz * 1.7);
      float dots = smoothstep(0.78, 0.8, valueNoise(vWorldPos.xz * 5.0 + 13.0));
      albedo *= 1.0 - uBorderNoise * 0.5 + uBorderNoise * n;
      albedo = mix(albedo, albedo * uBorderDotsBrightness, dots * uBorderDots);
    }
  } else if (nw.y > -0.5) {
    // cliff sides: darker going down, with sediment layers
    float depth = saturate(-vWorldPos.y / max(uCliffDepth, 0.01));
    float layers = smoothstep(0.45, 0.5, fract(vWorldPos.y * uSedimentFrequency + valueNoise(vWorldPos.xz * 0.6) * 0.6));
    albedo = mix(uColor * uCliffBrightness, uCliffBottomColor, depth * uCliffDarkening);
    albedo *= 1.0 - uSedimentContrast * (0.1 / 0.12) + layers * uSedimentContrast;
  } else {
    albedo = uUndersideColor;
  }

  writeGBuffer(albedo, viewNormal(), MAT_WORLD, 0.0, 0.0, 0.0);
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
uniform float uFlashEmissive;

void main() {
  ditherClip(uOpacity);
  vec3 albedo = mix(uColor, uFlashColor, uFlash);
  writeGBuffer(albedo, viewNormal(), MAT_CHARACTER, 1.0, uEmissive + uFlash * uFlashEmissive, uSpecular);
}
`;

// Unlit / emissive surfaces (start pad).
export const unlitFragment = /* glsl */ `${header}
${common}
${gbufferOutputs}
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uPadPulseSpeed;
uniform float uPadGlow;
uniform float uPadBaseGlow;

void main() {
  ditherClip(uOpacity);
  float r = length(vLocalPos.xz);
  float ring = smoothstep(0.78, 0.84, r) * (1.0 - smoothstep(0.92, 0.97, r));
  float pulse = 0.6 + 0.4 * sin(uTime * uPadPulseSpeed - r * 10.0);
  vec3 albedo = mix(uColor, uGlowColor, ring);
  float emissive = ring * (uPadGlow + pulse) + (1.0 - ring) * uPadBaseGlow * pulse;
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
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyText;
uniform vec3 uSkyTextOutline;
uniform float uSkyGradientLow;
uniform float uSkyGradientHigh;
uniform float uSloganRepeats;
uniform float uSloganScroll;
uniform float uSloganScale;
uniform float uSloganShimmer;
uniform float uSparkleScale;
uniform float uSparkleDensity;
uniform float uSparkleSize;
uniform float uSparkleIntensity;
uniform vec3 uSparkleColor;

vec4 sampleWord(vec2 uv, float word) {
  vec2 p = vec2(uv.x, (word + uv.y) / uWordCount);
  return texture(uWords, p);
}

void main() {
  vec3 dir = normalize(vLocalPos);
  float h = dir.y;
  vec3 col = mix(uSkyHorizon, uSkyTop, smoothstep(uSkyGradientLow, max(uSkyGradientHigh, uSkyGradientLow + 1e-3), h));

  // slogans, repeated around the horizon and slowly scrolling
  float u = fract(atan(dir.z, dir.x) / (2.0 * PI) * floor(uSloganRepeats) + uTime * uSloganScroll);
  float v = 0.5 + h * uSloganScale;
  if (v > 0.0 && v < 1.0) {
    vec2 uv = vec2(u, 1.0 - v);
    // the old word fades out, then the new one fades in
    vec4 a = sampleWord(uv, uWordA);
    vec4 b = sampleWord(uv, uWordB);
    vec4 w = uWordMix < 0.5 ? a * (1.0 - uWordMix * 2.0) : b * (uWordMix * 2.0 - 1.0);
    // r: fill, g: outline
    col = mix(col, uSkyTextOutline, w.g);
    col = mix(col, uSkyText * (1.0 + uSloganShimmer * sin(uTime * 3.0 + u * 20.0)), w.r);
  }

  // twinkling sparkles
  vec2 sp = vec2(atan(dir.z, dir.x) * uSparkleScale, h * uSparkleScale);
  vec2 cell = floor(sp);
  float rnd = hash12(cell);
  vec2 f = fract(sp) - 0.5 - (vec2(hash12(cell + 7.0), hash12(cell + 3.0)) - 0.5) * 0.6;
  float star = (1.0 - smoothstep(0.0, max(uSparkleSize, 1e-3), length(f))) * step(1.0 - uSparkleDensity, rnd);
  star *= 0.5 + 0.5 * sin(uTime * (2.0 + rnd * 4.0) + rnd * 40.0);
  col += star * smoothstep(0.05, 0.4, h) * uSparkleColor * uSparkleIntensity;

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
