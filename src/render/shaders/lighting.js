import { header, common } from "./common.js";

// Deferred toon lighting + outlines + fog, all in one fullscreen pass.
export const lightingFragment = /* glsl */ `${header}
precision highp sampler2DShadow;
${common}

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D tAlbedo;
uniform sampler2D tNormal;
uniform sampler2D tExtra;
uniform sampler2D tDepth;
uniform sampler2DShadow tShadow;

uniform vec2 uResolution;
uniform mat4 uProjInv;
uniform mat4 uViewInv;
uniform float uNear;
uniform float uFar;
uniform float uTime;

uniform vec3 uBackground;

uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmbient;
uniform vec3 uGroundAmbient;
uniform vec3 uDiscoDirA;
uniform vec3 uDiscoColorA;
uniform vec3 uDiscoDirB;
uniform vec3 uDiscoColorB;
uniform vec3 uRimColor;
uniform vec3 uShadowTint;

uniform float uWorldBands;
uniform float uCharacterBands;
uniform float uBandSoftness;
uniform float uSpecular;
uniform float uRim;

uniform bool uShadows;
uniform mat4 uShadowMatrix;
uniform float uShadowTexel;
uniform float uShadowBias;

uniform bool uFog;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

uniform bool uOutlines;
uniform bool uWorldOutlines;
uniform vec3 uOutlineColor;
uniform float uOutlineWidth;
uniform float uDepthThreshold;
uniform float uNormalThreshold;

uniform float uShadowNormalOffset;
uniform float uShadowSlopeOffset;
uniform float uShadowSoftness;
uniform float uDiscoBands;
uniform float uShininess;
uniform float uSpecularSize;
uniform float uRimThreshold;
uniform float uRimWidth;
uniform float uOutlineFogFade;
uniform float uSilhouetteBias;
uniform float uEdgeSoftness;
uniform float uAmbientBias;

uniform int uDebug;

float linearDepth(float d) {
  float z = d * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}

vec3 viewPosition(vec2 uv, float d) {
  vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}

// Quantised light with anti-aliased steps between the bands.
float toon(float x, float bands) {
  float s = saturate(x) * bands;
  float i = floor(s);
  float f = s - i;
  float w = max(uBandSoftness, 1e-3);
  return (i + smoothstep(0.5 - w, 0.5 + w, f)) / bands;
}

float shadowFactor(vec3 worldPos, vec3 worldNormal, float ndl) {
  if (!uShadows) return 1.0;
  vec3 p = worldPos + worldNormal * (uShadowNormalOffset + uShadowSlopeOffset * (1.0 - ndl));
  vec4 sc = uShadowMatrix * vec4(p, 1.0);
  sc.xyz = sc.xyz / sc.w * 0.5 + 0.5;
  if (any(lessThan(sc.xyz, vec3(0.0))) || any(greaterThan(sc.xyz, vec3(1.0)))) return 1.0;
  float z = sc.z - uShadowBias;
  float sum = 0.0;
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
      sum += texture(tShadow, vec3(sc.xy + vec2(x, y) * uShadowTexel, z));
  sum /= 9.0;
  // toon-ify the penumbra
  return smoothstep(0.5 - max(uShadowSoftness, 1e-3), 0.5 + max(uShadowSoftness, 1e-3), sum);
}

struct Sample {
  float depth;
  float id;
  float outline;
  float mat;
  vec3 normal;
};

Sample fetchSample(vec2 uv) {
  Sample s;
  float d = texture(tDepth, uv).r;
  vec4 n = texture(tNormal, uv);
  s.depth = linearDepth(d);
  s.id = n.z;
  s.outline = n.w;
  s.normal = decodeNormal(n.xy);
  s.mat = texture(tAlbedo, uv).a;
  return s;
}

float outlineFactor(vec2 uv, Sample c) {
  if (!uOutlines || c.mat < 0.5) return 0.0;
  float px = uOutlineWidth * uResolution.y / 1080.0;
  vec2 t = px / uResolution;
  vec2 offs[4] = vec2[4](vec2(t.x, 0.0), vec2(-t.x, 0.0), vec2(0.0, t.y), vec2(0.0, -t.y));

  float edge = 0.0;
  float depthLap = 0.0;
  float normalEdge = 0.0;
  Sample s[4];
  for (int i = 0; i < 4; i++) {
    s[i] = fetchSample(uv + offs[i]);
    // silhouettes of characters: different object id, drawn on the closest side
    bool idChange = abs(s[i].id - c.id) > 0.5;
    bool wantsOutline = c.outline > 0.5 || s[i].outline > 0.5;
    if (idChange && wantsOutline && c.depth <= s[i].depth * (1.0 + uSilhouetteBias)) edge = 1.0;
    if (s[i].mat > 0.5 && c.mat != MAT_SKY && s[i].mat != MAT_SKY)
      normalEdge = max(normalEdge, 1.0 - dot(c.normal, s[i].normal));
  }

  if (uWorldOutlines && c.mat != MAT_SKY) {
    // laplacian of the inverse depth: zero on planes, negative on the front
    // side of a depth discontinuity
    float lx = c.depth / s[0].depth + c.depth / s[1].depth - 2.0;
    float ly = c.depth / s[2].depth + c.depth / s[3].depth - 2.0;
    depthLap = max(-lx, -ly);
    edge = max(edge, smoothstep(uDepthThreshold, uDepthThreshold * (1.0 + max(uEdgeSoftness, 1e-3)), depthLap));
    edge = max(edge, smoothstep(uNormalThreshold, uNormalThreshold * (1.0 + max(uEdgeSoftness, 1e-3) * 0.5), normalEdge));
  }
  return edge;
}

void main() {
  vec4 albedoMat = texture(tAlbedo, vUv);
  vec4 normalData = texture(tNormal, vUv);
  vec4 extra = texture(tExtra, vUv);
  float rawDepth = texture(tDepth, vUv).r;
  float mat = floor(albedoMat.a + 0.5);
  vec3 albedo = albedoMat.rgb;

  if (uDebug == 1) { fragColor = vec4(albedo, 1.0); return; }
  if (uDebug == 2) { fragColor = vec4(decodeNormal(normalData.xy) * 0.5 + 0.5, 1.0); return; }
  if (uDebug == 3) { fragColor = vec4(vec3(1.0 - saturate(linearDepth(rawDepth) / 80.0)), 1.0); return; }
  if (uDebug == 4) { fragColor = vec4(abs(extra.xy) * 50.0, 0.0, 1.0); return; }

  if (mat < 0.5) {
    fragColor = vec4(uBackground, 1.0);
    return;
  }

  vec3 viewPos = viewPosition(vUv, rawDepth);
  float dist = length(viewPos);
  vec3 n = decodeNormal(normalData.xy);
  vec3 v = normalize(-viewPos);
  vec3 worldPos = (uViewInv * vec4(viewPos, 1.0)).xyz;
  vec3 worldNormal = normalize(mat3(uViewInv) * n);

  vec3 color;
  float shadow = 1.0;

  if (mat == MAT_SKY) {
    color = albedo;
  } else if (mat == MAT_UNLIT) {
    color = albedo * (1.0 + extra.z);
  } else {
    bool character = mat == MAT_CHARACTER;
    float bands = character ? uCharacterBands : uWorldBands;

    float ndl = dot(n, uSunDir);
    shadow = shadowFactor(worldPos, worldNormal, saturate(ndl));
    float sun = toon(saturate(ndl) * shadow, bands);

    vec3 ambient = mix(uGroundAmbient, uSkyAmbient, saturate(worldNormal.y * 0.5 + 0.5 + uAmbientBias));
    // shadows keep a coloured tint instead of going grey
    vec3 lit = ambient * mix(uShadowTint, vec3(1.0), sun) + uSunColor * sun;

    lit += uDiscoColorA * toon(dot(n, uDiscoDirA), uDiscoBands);
    lit += uDiscoColorB * toon(dot(n, uDiscoDirB), uDiscoBands);

    color = albedo * lit;

    if (character) {
      vec3 h = normalize(uSunDir + v);
      float spec = pow(saturate(dot(n, h)), uShininess) * shadow;
      color += uSunColor * smoothstep(0.5 - max(uSpecularSize, 1e-3), 0.5, spec) * uSpecular * (0.4 + extra.w);
      float fres = 1.0 - saturate(dot(n, v));
      float rim = smoothstep(uRimThreshold, uRimThreshold + max(uRimWidth, 1e-3), fres * (0.6 + 0.4 * saturate(ndl + 0.5)));
      color += uRimColor * rim * uRim;
    }

    color += albedo * extra.z;
  }

  if (uDebug == 5) { fragColor = vec4(vec3(shadow), 1.0); return; }

  float fog = 0.0;
  if (uFog && mat != MAT_SKY) {
    fog = saturate((dist - uFogNear) / (uFogFar - uFogNear));
    fog = fog * fog * (3.0 - 2.0 * fog);
    color = mix(color, uFogColor, fog);
  }

  Sample c;
  c.depth = linearDepth(rawDepth);
  c.id = normalData.z;
  c.outline = normalData.w;
  c.mat = mat;
  c.normal = n;
  float edge = outlineFactor(vUv, c);
  if (uDebug == 6) { fragColor = vec4(vec3(1.0 - edge), 1.0); return; }

  vec3 outlineColor = mix(uOutlineColor, uFogColor, fog * uOutlineFogFade);
  color = mix(color, outlineColor, edge);

  fragColor = vec4(color, 1.0);
}
`;
