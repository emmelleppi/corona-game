import { header, common } from "./common.js";

// Forward pass materials, drawn on top of the lit image. They do a manual,
// soft depth test against the G-Buffer depth.

const softDepth = /* glsl */ `
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
uniform float uBillboardSoftness;
uniform float uParticleSoftness;
uniform float uParticleEdge;
uniform float uParticleCore;
float sceneLinearDepth() {
  float d = texture(tDepth, gl_FragCoord.xy / uResolution).r;
  float z = d * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
`;

export const billboardVertex = /* glsl */ `${header}
in vec3 position;
in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uScale;
uniform float uRotation;
out vec2 vUv;
out float vViewZ;
void main() {
  vUv = uv;
  vec4 center = viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float c = cos(uRotation);
  float s = sin(uRotation);
  vec2 p = position.xy * uScale;
  center.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vViewZ = -center.z;
  gl_Position = projectionMatrix * center;
}
`;

export const billboardFragment = /* glsl */ `${header}
${common}
${softDepth}
in vec2 vUv;
in float vViewZ;
out vec4 fragColor;
uniform sampler2D tMap;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uBrightness;
void main() {
  vec4 tex = texture(tMap, vUv);
  float alpha = smoothstep(0.35, 0.65, tex.a) * uOpacity;
  alpha *= saturate((sceneLinearDepth() - vViewZ) / max(uBillboardSoftness, 1e-3));
  if (alpha < 0.002) discard;
  fragColor = vec4(tex.rgb * uColor * uBrightness, alpha);
}
`;

export const particleVertex = /* glsl */ `${header}
in vec3 position;
in vec4 aColor;
in float aSize;
in float aShape;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uPixelScale;
out vec4 vColor;
out float vViewZ;
out float vShape;
void main() {
  vec4 viewPos = viewMatrix * modelMatrix * vec4(position, 1.0);
  vColor = aColor;
  vShape = aShape;
  vViewZ = -viewPos.z;
  gl_PointSize = aSize * uPixelScale / max(0.05, -viewPos.z);
  gl_Position = projectionMatrix * viewPos;
}
`;

export const particleFragment = /* glsl */ `${header}
${common}
${softDepth}
in vec4 vColor;
in float vViewZ;
in float vShape;
out vec4 fragColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float shape;
  if (vShape > 0.5) {
    // 4 point star
    float a = abs(p.x) * abs(p.y);
    shape = 1.0 - smoothstep(0.02, 0.06, a) * smoothstep(0.0, 1.0, length(p)) - smoothstep(0.85, 1.0, length(p));
    shape = saturate(shape);
  } else {
    float r = length(p);
    shape = 1.0 - smoothstep(1.0 - max(uParticleEdge, 1e-3), 1.0, r);
  }
  // toon core: brighter centre
  float core = 1.0 - smoothstep(0.25, 0.35, length(p));
  float alpha = shape * vColor.a;
  alpha *= saturate((sceneLinearDepth() - vViewZ) / max(uParticleSoftness, 1e-3));
  if (alpha < 0.002) discard;
  fragColor = vec4(vColor.rgb * (1.0 + core * uParticleCore), alpha);
}
`;

// ---------------------------------------------------------------------------
// HUD: toon shaded icons + inverted hull outline, rendered in an offscreen
// super-sampled target and composited at the end.
// ---------------------------------------------------------------------------
export const hudVertex = /* glsl */ `${header}
in vec3 position;
in vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform float uOutline;
out vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  p.xyz += vNormal * uOutline;
  gl_Position = projectionMatrix * p;
}
`;

export const hudFragment = /* glsl */ `${header}
${common}
in vec3 vNormal;
out vec4 fragColor;
uniform vec3 uColor;
uniform bool uIsOutline;
uniform float uBands;
uniform float uHudSpecular;
uniform float uHudRim;
uniform float uHudAmbient;
void main() {
  vec3 color;
  if (uIsOutline) {
    color = uColor;
  } else {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 l = normalize(vec3(-0.4, 0.7, 0.6));
    float d = saturate(dot(n, l));
    float t = floor(d * uBands + 0.5) / uBands;
    color = uColor * (uHudAmbient + (1.1 - uHudAmbient) * t);
    vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
    color += step(0.96, dot(n, h)) * uHudSpecular;
    float rim = step(0.7, 1.0 - n.z);
    color += rim * uHudRim;
  }
  fragColor = vec4(sqrt(saturate(color)), 1.0);
}
`;
