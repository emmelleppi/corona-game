import { header, common } from "./common.js";

// ---------------------------------------------------------------------------
// Temporal anti-aliasing: reprojection with the velocity buffer, Catmull-Rom
// history sampling and variance clipping in YCoCg space.
// ---------------------------------------------------------------------------
export const taaFragment = /* glsl */ `${header}
${common}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D tCurrent;
uniform sampler2D tHistory;
uniform sampler2D tVelocity;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uFeedback;
uniform float uVarianceGamma;
uniform bool uReset;
uniform float uMotionFeedback;
uniform float uMotionPixels;

vec3 toYCoCg(vec3 c) {
  return vec3(0.25 * c.r + 0.5 * c.g + 0.25 * c.b, 0.5 * c.r - 0.5 * c.b, -0.25 * c.r + 0.5 * c.g - 0.25 * c.b);
}
vec3 fromYCoCg(vec3 c) {
  return vec3(c.x + c.y - c.z, c.x + c.z, c.x - c.y - c.z);
}
// Reversible tonemap to avoid fireflies when blending HDR values.
vec3 tonemap(vec3 c) { return c / (1.0 + max(c.r, max(c.g, c.b))); }
vec3 untonemap(vec3 c) { return c / max(1.0 / 65504.0, 1.0 - max(c.r, max(c.g, c.b))); }

vec3 sampleCurrent(vec2 uv) {
  return toYCoCg(tonemap(max(texture(tCurrent, uv).rgb, 0.0)));
}

vec3 sampleHistoryCatmullRom(vec2 uv) {
  vec2 texSize = 1.0 / uTexel;
  vec2 samplePos = uv * texSize;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;
  vec2 f = samplePos - texPos1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / w12;
  vec2 texPos0 = (texPos1 - 1.0) * uTexel;
  vec2 texPos3 = (texPos1 + 2.0) * uTexel;
  vec2 texPos12 = (texPos1 + offset12) * uTexel;
  vec3 result = vec3(0.0);
  result += texture(tHistory, vec2(texPos12.x, texPos0.y)).rgb * w12.x * w0.y;
  result += texture(tHistory, vec2(texPos0.x, texPos12.y)).rgb * w0.x * w12.y;
  result += texture(tHistory, vec2(texPos12.x, texPos12.y)).rgb * w12.x * w12.y;
  result += texture(tHistory, vec2(texPos3.x, texPos12.y)).rgb * w3.x * w12.y;
  result += texture(tHistory, vec2(texPos12.x, texPos3.y)).rgb * w12.x * w3.y;
  float wsum = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  return max(result / wsum, 0.0);
}

vec3 clipAABB(vec3 aabbMin, vec3 aabbMax, vec3 center, vec3 q) {
  vec3 r = q - center;
  vec3 e = (aabbMax - aabbMin) * 0.5 + 1e-5;
  vec3 v = r / e;
  vec3 a = abs(v);
  float m = max(a.x, max(a.y, a.z));
  return m > 1.0 ? center + r / m : q;
}

void main() {
  // velocity of the closest fragment in a 3x3 neighbourhood (sharper edges)
  float closest = 1.0;
  vec2 closestUv = vUv;
  vec3 m1 = vec3(0.0);
  vec3 m2 = vec3(0.0);
  vec3 current = vec3(0.0);
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 uv = vUv + vec2(x, y) * uTexel;
      float d = texture(tDepth, uv).r;
      if (d < closest) {
        closest = d;
        closestUv = uv;
      }
      vec3 c = sampleCurrent(uv);
      if (x == 0 && y == 0) current = c;
      m1 += c;
      m2 += c * c;
    }
  }

  vec2 velocity = texture(tVelocity, closestUv).xy;
  vec2 prevUv = vUv - velocity;

  if (uReset || any(lessThan(prevUv, vec2(0.0))) || any(greaterThan(prevUv, vec2(1.0)))) {
    fragColor = vec4(untonemap(fromYCoCg(current)), 1.0);
    return;
  }

  vec3 mean = m1 / 9.0;
  vec3 sigma = sqrt(max(m2 / 9.0 - mean * mean, 0.0));
  vec3 boxMin = mean - uVarianceGamma * sigma;
  vec3 boxMax = mean + uVarianceGamma * sigma;

  vec3 history = toYCoCg(tonemap(sampleHistoryCatmullRom(prevUv)));
  history = clipAABB(boxMin, boxMax, clamp(mean, boxMin, boxMax), history);

  // trust the history less when things move fast
  float motion = length(velocity / uTexel);
  float feedback = mix(uFeedback, uFeedback * uMotionFeedback, saturate(motion / max(uMotionPixels, 1.0)));

  vec3 result = mix(current, history, feedback);
  fragColor = vec4(untonemap(fromYCoCg(result)), 1.0);
}
`;

// ---------------------------------------------------------------------------
// Bloom: thresholded 13 tap downsample chain + tent upsample.
// ---------------------------------------------------------------------------
export const bloomDownFragment = /* glsl */ `${header}
${common}
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform bool uPrefilter;
uniform float uThreshold;
uniform float uKnee;

vec3 prefilter(vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  rq = (rq * rq) / (4.0 * uKnee + 1e-4);
  float w = max(rq, br - uThreshold) / max(br, 1e-4);
  return c * w;
}

vec3 karis(vec3 a, vec3 b, vec3 c, vec3 d) {
  float wa = 1.0 / (1.0 + luma(a));
  float wb = 1.0 / (1.0 + luma(b));
  float wc = 1.0 / (1.0 + luma(c));
  float wd = 1.0 / (1.0 + luma(d));
  return (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
}

void main() {
  vec2 t = uTexel;
  vec3 a = texture(tSource, vUv + t * vec2(-2.0, 2.0)).rgb;
  vec3 b = texture(tSource, vUv + t * vec2(0.0, 2.0)).rgb;
  vec3 c = texture(tSource, vUv + t * vec2(2.0, 2.0)).rgb;
  vec3 d = texture(tSource, vUv + t * vec2(-2.0, 0.0)).rgb;
  vec3 e = texture(tSource, vUv).rgb;
  vec3 f = texture(tSource, vUv + t * vec2(2.0, 0.0)).rgb;
  vec3 g = texture(tSource, vUv + t * vec2(-2.0, -2.0)).rgb;
  vec3 h = texture(tSource, vUv + t * vec2(0.0, -2.0)).rgb;
  vec3 i = texture(tSource, vUv + t * vec2(2.0, -2.0)).rgb;
  vec3 j = texture(tSource, vUv + t * vec2(-1.0, 1.0)).rgb;
  vec3 k = texture(tSource, vUv + t * vec2(1.0, 1.0)).rgb;
  vec3 l = texture(tSource, vUv + t * vec2(-1.0, -1.0)).rgb;
  vec3 m = texture(tSource, vUv + t * vec2(1.0, -1.0)).rgb;

  vec3 color;
  if (uPrefilter) {
    color = karis(j, k, l, m) * 0.5
      + karis(a, b, d, e) * 0.125 + karis(b, c, e, f) * 0.125
      + karis(d, e, g, h) * 0.125 + karis(e, f, h, i) * 0.125;
    color = prefilter(max(color, 0.0));
  } else {
    color = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  fragColor = vec4(color, 1.0);
}
`;

export const bloomUpFragment = /* glsl */ `${header}
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uWeight;

void main() {
  vec2 t = uTexel * uRadius;
  vec3 c = texture(tSource, vUv).rgb * 4.0;
  c += (texture(tSource, vUv + vec2(-t.x, 0.0)).rgb + texture(tSource, vUv + vec2(t.x, 0.0)).rgb
     + texture(tSource, vUv + vec2(0.0, -t.y)).rgb + texture(tSource, vUv + vec2(0.0, t.y)).rgb) * 2.0;
  c += texture(tSource, vUv + vec2(-t.x, -t.y)).rgb + texture(tSource, vUv + vec2(t.x, -t.y)).rgb
     + texture(tSource, vUv + vec2(-t.x, t.y)).rgb + texture(tSource, vUv + vec2(t.x, t.y)).rgb;
  fragColor = vec4(c / 16.0 * uWeight, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Final composite: lens / gameplay effects, tone mapping, grading, film grain,
// HUD and output encoding.
// ---------------------------------------------------------------------------
export const compositeFragment = /* glsl */ `${header}
${common}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D tColor;
uniform sampler2D tBloom;
uniform sampler2D tHud;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAspect;

uniform bool uBloom;
uniform float uBloomStrength;
uniform float uExposure;
uniform int uToneMapping;
uniform float uSaturation;
uniform float uContrast;
uniform float uSharpen;
uniform float uChromatic;
uniform float uVignetteOffset;
uniform float uVignetteDarkness;
uniform float uGrain;
uniform float uScanlines;
uniform float uWater;
uniform float uGlitch;
uniform vec4 uGlitchSeed;
uniform float uSpeedLines;
uniform float uDamage;
uniform bool uHud;
uniform bool uRaw;
uniform bool uEncode;
uniform float uSpeedLinesFps;
uniform float uSpeedLinesCount;
uniform float uSpeedLinesDensity;
uniform float uSpeedLinesInner;
uniform float uSpeedLinesOpacity;
uniform vec3 uSpeedLinesColor;
uniform float uWaterAmplitude;
uniform float uWaterFrequency;
uniform float uWaterSpeed;
uniform float uGlitchShift;
uniform float uGlitchSplit;
uniform float uGlitchBands;
uniform vec3 uDamageColor;
uniform float uDamageOpacity;
uniform float uDamageChromatic;
uniform vec3 uVignetteColor;
uniform float uScanlineFrequency;
uniform float uDither;

vec3 acesFitted(vec3 color) {
  const mat3 inputM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 outputM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  color = inputM * color;
  vec3 a = color * (color + 0.0245786) - 0.000090537;
  vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
  return saturate(outputM * (a / b));
}

vec3 agx(vec3 color) {
  const mat3 inset = mat3(0.856627153315983, 0.137318972929847, 0.11189821299995,
                          0.0951212405381588, 0.761241990602591, 0.0767994186031903,
                          0.0482516061458583, 0.101439036467562, 0.811302368396859);
  const mat3 outset = mat3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826,
                           -0.11060664309660323, 1.157823702216272, -0.11060664309660294,
                           -0.016493938717834573, -0.016493938717834257, 1.2519364065950405);
  color = inset * max(color, 0.0);
  color = clamp(log2(max(color, 1e-10)), -12.47393, 4.026069);
  color = (color + 12.47393) / 16.5;
  vec3 x2 = color * color;
  vec3 x4 = x2 * x2;
  color = 15.5 * x4 * x2 - 40.14 * x4 * color + 31.96 * x4 - 6.868 * x2 * color + 0.4298 * x2 + 0.1191 * color - 0.00232;
  color = outset * color;
  return saturate(pow(max(color, 0.0), vec3(2.2)));
}

vec3 sampleScene(vec2 uv) {
  return texture(tColor, uv).rgb;
}

float speedLines(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float frame = floor(uTime * uSpeedLinesFps);
  float slice = floor(a / (2.0 * PI) * floor(uSpeedLinesCount));
  float rnd = hash12(vec2(slice, frame));
  float len = uSpeedLinesInner + hash12(vec2(slice + 31.0, frame)) * 0.35;
  float line = step(1.0 - uSpeedLinesDensity, rnd) * smoothstep(len, len + 0.25, r);
  return line * uSpeedLines;
}

void main() {
  vec2 uv = vUv;

  if (uRaw) {
    vec3 c = sampleScene(uv);
    fragColor = vec4(uEncode ? linearToSRGB(c) : c, 1.0);
    return;
  }

  // underwater-like wobble while falling into the void
  if (uWater > 0.0) {
    float t = uTime * uWaterSpeed;
    float amplitude = uWaterAmplitude * uWater;
    float x = uv.y * uWaterFrequency + t * 0.7;
    float y = uv.x * uWaterFrequency + t * 0.3;
    uv.x += cos(x + y) * amplitude * cos(y);
    uv.y += sin(x - y) * amplitude * cos(y);
  }

  // digital glitch when the player is hit
  vec2 glitchOffset = vec2(0.0);
  if (uGlitch > 0.0) {
    float band = floor(uv.y * (8.0 + uGlitchSeed.x * uGlitchBands));
    float r = hash12(vec2(band, uGlitchSeed.y * 100.0));
    if (r < uGlitch * 0.5) uv.x += (hash12(vec2(band, uGlitchSeed.z * 100.0)) - 0.5) * uGlitchShift * uGlitch;
    if (abs(uv.y - uGlitchSeed.w) < 0.02 * uGlitch) uv.y = 1.0 - uv.y;
    glitchOffset = vec2(cos(uGlitchSeed.x * 6.28), sin(uGlitchSeed.x * 6.28)) * uGlitchSplit * uGlitch;
  }

  vec2 dir = uv - 0.5;
  float ca = uChromatic + uDamage * uDamageChromatic;
  vec3 color;
  color.r = sampleScene(uv + dir * ca + glitchOffset).r;
  color.g = sampleScene(uv).g;
  color.b = sampleScene(uv - dir * ca - glitchOffset).b;

  if (uSharpen > 0.0) {
    vec3 n = sampleScene(uv + vec2(uTexel.x, 0.0)) + sampleScene(uv - vec2(uTexel.x, 0.0))
           + sampleScene(uv + vec2(0.0, uTexel.y)) + sampleScene(uv - vec2(0.0, uTexel.y));
    color = max(color + (color - n * 0.25) * uSharpen, 0.0);
  }

  if (uBloom) color += texture(tBloom, uv).rgb * uBloomStrength;

  color *= uExposure;
  if (uToneMapping == 1) color = acesFitted(color);
  else if (uToneMapping == 2) color = agx(color);
  else color = saturate(color);

  // grading
  float l = luma(color);
  color = mix(vec3(l), color, uSaturation);
  color = saturate((color - 0.5) * uContrast + 0.5);

  // speed lines
  float sl = speedLines(vUv);
  color = mix(color, uSpeedLinesColor, sl * uSpeedLinesOpacity);

  // damage: red pulse on the borders
  vec2 vd = (vUv - 0.5) * vec2(uAspect, 1.0);
  float edge = smoothstep(0.35, 0.95, length(vd));
  color = mix(color, uDamageColor, edge * uDamage * uDamageOpacity);

  // vignette (same formula of the old VignetteShader)
  vec2 vuv = (vUv - 0.5) * uVignetteOffset;
  color = mix(color, (1.0 - uVignetteDarkness) * uVignetteColor, saturate(dot(vuv, vuv)));
  color = max(color, 0.0);

  // film grain + scanlines
  float n = hash12(vUv * uResolution + fract(uTime * 13.37) * 1000.0);
  vec3 grain = color + color * clamp(0.1 + n, 0.0, 1.0);
  vec2 sc = vec2(sin(vUv.y * uResolution.y * uScanlineFrequency), cos(vUv.y * uResolution.y * uScanlineFrequency));
  grain += color * vec3(sc.x, sc.y, sc.x) * uScanlines;
  color = color + uGrain * (grain - color);

  if (uHud) {
    vec4 hud = texture(tHud, vUv);
    vec3 hudColor = hud.rgb * hud.rgb; // stored with gamma 2 for precision
    color = color * (1.0 - hud.a) + hudColor;
  }

  color = saturate(color);
  if (uEncode) color = linearToSRGB(color);
  // dithering to hide banding
  color += (interleavedGradientNoise(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * uDither / 255.0;
  fragColor = vec4(color, 1.0);
}
`;

// ---------------------------------------------------------------------------
// FXAA (based on the algorithm by Timothy Lottes), run on the encoded LDR image.
// ---------------------------------------------------------------------------
export const fxaaFragment = /* glsl */ `${header}
${common}
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tSource;
uniform vec2 uTexel;

uniform float uEdgeThresholdMin;
uniform float uEdgeThresholdMax;
uniform float uSubpixelQuality;
#define EDGE_THRESHOLD_MIN uEdgeThresholdMin
#define EDGE_THRESHOLD_MAX uEdgeThresholdMax
#define SUBPIXEL_QUALITY uSubpixelQuality
#define ITERATIONS 12

float lum(vec2 uv) { return luma(texture(tSource, uv).rgb); }

float quality(int i) {
  return i < 5 ? 1.0 : (i == 5 ? 1.5 : (i < 10 ? 2.0 : (i == 10 ? 4.0 : 8.0)));
}

void main() {
  vec3 colorCenter = texture(tSource, vUv).rgb;
  float lumaCenter = luma(colorCenter);
  float lumaDown = lum(vUv + vec2(0.0, -uTexel.y));
  float lumaUp = lum(vUv + vec2(0.0, uTexel.y));
  float lumaLeft = lum(vUv + vec2(-uTexel.x, 0.0));
  float lumaRight = lum(vUv + vec2(uTexel.x, 0.0));

  float lumaMin = min(lumaCenter, min(min(lumaDown, lumaUp), min(lumaLeft, lumaRight)));
  float lumaMax = max(lumaCenter, max(max(lumaDown, lumaUp), max(lumaLeft, lumaRight)));
  float lumaRange = lumaMax - lumaMin;
  if (lumaRange < max(EDGE_THRESHOLD_MIN, lumaMax * EDGE_THRESHOLD_MAX)) {
    fragColor = vec4(colorCenter, 1.0);
    return;
  }

  float lumaDownLeft = lum(vUv + vec2(-uTexel.x, -uTexel.y));
  float lumaUpRight = lum(vUv + vec2(uTexel.x, uTexel.y));
  float lumaUpLeft = lum(vUv + vec2(-uTexel.x, uTexel.y));
  float lumaDownRight = lum(vUv + vec2(uTexel.x, -uTexel.y));

  float lumaDownUp = lumaDown + lumaUp;
  float lumaLeftRight = lumaLeft + lumaRight;
  float lumaLeftCorners = lumaDownLeft + lumaUpLeft;
  float lumaDownCorners = lumaDownLeft + lumaDownRight;
  float lumaRightCorners = lumaDownRight + lumaUpRight;
  float lumaUpCorners = lumaUpRight + lumaUpLeft;

  float edgeHorizontal = abs(-2.0 * lumaLeft + lumaLeftCorners) + abs(-2.0 * lumaCenter + lumaDownUp) * 2.0 + abs(-2.0 * lumaRight + lumaRightCorners);
  float edgeVertical = abs(-2.0 * lumaUp + lumaUpCorners) + abs(-2.0 * lumaCenter + lumaLeftRight) * 2.0 + abs(-2.0 * lumaDown + lumaDownCorners);
  bool isHorizontal = edgeHorizontal >= edgeVertical;

  float luma1 = isHorizontal ? lumaDown : lumaLeft;
  float luma2 = isHorizontal ? lumaUp : lumaRight;
  float gradient1 = luma1 - lumaCenter;
  float gradient2 = luma2 - lumaCenter;
  bool is1Steepest = abs(gradient1) >= abs(gradient2);
  float gradientScaled = 0.25 * max(abs(gradient1), abs(gradient2));

  float stepLength = isHorizontal ? uTexel.y : uTexel.x;
  float lumaLocalAverage;
  if (is1Steepest) {
    stepLength = -stepLength;
    lumaLocalAverage = 0.5 * (luma1 + lumaCenter);
  } else {
    lumaLocalAverage = 0.5 * (luma2 + lumaCenter);
  }

  vec2 currentUv = vUv;
  if (isHorizontal) currentUv.y += stepLength * 0.5;
  else currentUv.x += stepLength * 0.5;

  vec2 offset = isHorizontal ? vec2(uTexel.x, 0.0) : vec2(0.0, uTexel.y);
  vec2 uv1 = currentUv - offset;
  vec2 uv2 = currentUv + offset;
  float lumaEnd1 = lum(uv1) - lumaLocalAverage;
  float lumaEnd2 = lum(uv2) - lumaLocalAverage;
  bool reached1 = abs(lumaEnd1) >= gradientScaled;
  bool reached2 = abs(lumaEnd2) >= gradientScaled;
  bool reachedBoth = reached1 && reached2;
  if (!reached1) uv1 -= offset;
  if (!reached2) uv2 += offset;

  if (!reachedBoth) {
    for (int i = 2; i < ITERATIONS; i++) {
      if (!reached1) lumaEnd1 = lum(uv1) - lumaLocalAverage;
      if (!reached2) lumaEnd2 = lum(uv2) - lumaLocalAverage;
      reached1 = abs(lumaEnd1) >= gradientScaled;
      reached2 = abs(lumaEnd2) >= gradientScaled;
      reachedBoth = reached1 && reached2;
      if (!reached1) uv1 -= offset * quality(i);
      if (!reached2) uv2 += offset * quality(i);
      if (reachedBoth) break;
    }
  }

  float distance1 = isHorizontal ? (vUv.x - uv1.x) : (vUv.y - uv1.y);
  float distance2 = isHorizontal ? (uv2.x - vUv.x) : (uv2.y - vUv.y);
  bool isDirection1 = distance1 < distance2;
  float distanceFinal = min(distance1, distance2);
  float edgeThickness = distance1 + distance2;
  float pixelOffset = -distanceFinal / edgeThickness + 0.5;
  bool isLumaCenterSmaller = lumaCenter < lumaLocalAverage;
  bool correctVariation = ((isDirection1 ? lumaEnd1 : lumaEnd2) < 0.0) != isLumaCenterSmaller;
  float finalOffset = correctVariation ? pixelOffset : 0.0;

  float lumaAverage = (1.0 / 12.0) * (2.0 * (lumaDownUp + lumaLeftRight) + lumaLeftCorners + lumaRightCorners);
  float subPixelOffset1 = saturate(abs(lumaAverage - lumaCenter) / lumaRange);
  float subPixelOffset2 = (-2.0 * subPixelOffset1 + 3.0) * subPixelOffset1 * subPixelOffset1;
  float subPixelOffsetFinal = subPixelOffset2 * subPixelOffset2 * SUBPIXEL_QUALITY;
  finalOffset = max(finalOffset, subPixelOffsetFinal);

  vec2 finalUv = vUv;
  if (isHorizontal) finalUv.y += finalOffset * stepLength;
  else finalUv.x += finalOffset * stepLength;
  fragColor = vec4(texture(tSource, finalUv).rgb, 1.0);
}
`;
