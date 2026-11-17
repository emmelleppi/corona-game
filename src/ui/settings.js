const STORAGE_KEY = "kill-da-corona:settings:v1";

export const DEFAULT_SETTINGS = {
  // rendering
  antialiasing: "TAA",
  renderScale: 1,
  maxPixelRatio: 2,
  taaFeedback: 0.9,
  taaVarianceGamma: 1.1,
  taaMotionFeedback: 0.85,
  taaMotionPixels: 30,
  taaJitterSamples: 16,
  taaJitterScale: 1,
  sharpen: 0.2,
  fxaaEdgeMin: 0.0312,
  fxaaEdgeMax: 0.125,
  fxaaSubpixel: 0.75,
  debugView: "Final",
  showStats: false,

  // toon
  worldBands: 3,
  characterBands: 5,
  bandSoftness: 0.04,
  specular: 0.5,
  rim: 0.35,
  rimColor: "#ffd6f0",
  rimThreshold: 0.62,
  rimWidth: 0.06,
  shininess: 48,
  specularSize: 0.05,
  hitFlashEmissive: 1.5,

  // outlines
  outlines: true,
  worldOutlines: true,
  outlineWidth: 1.6,
  outlineColor: "#14061a",
  depthThreshold: 0.12,
  normalThreshold: 0.35,
  edgeSoftness: 1,
  silhouetteBias: 0.002,
  outlineFogFade: 0.85,

  // lights
  background: "#3b163a",
  sunColor: "#fff2d0",
  sunIntensity: 0.7,
  sunElevation: 62,
  sunAzimuth: 35,
  ambientIntensity: 0.62,
  skyAmbient: "#d9c4ff",
  groundAmbient: "#7d4a6e",
  shadowTint: "#9a8cc4",
  discoColorA: "#ff2050",
  discoColorB: "#3050ff",
  discoIntensity: 0.25,
  discoSpeed: 0.5,
  discoElevation: 45,
  discoBands: 2,
  ambientBias: 0,

  // shadows
  shadows: true,
  shadowResolution: 2048,
  shadowExtent: 45,
  shadowBias: 0.0004,
  shadowNormalOffset: 0.06,
  shadowSlopeOffset: 0.12,
  shadowSoftness: 0.15,
  shadowDistance: 150,

  // fog
  fog: true,
  fogColor: "#5b2a62",
  fogNear: 15,
  fogFar: 85,

  // islands
  tileSize: 2.5,
  tileVariation: 0.06,
  checkerDarken: 0.07,
  groutWidth: 0.05,
  groutColor: "#c7bddb",
  borderBrightness: 1.3,
  borderNoise: 0.1,
  borderDots: 0.35,
  borderDotsBrightness: 1.25,
  cliffBrightness: 1.7,
  cliffBottomColor: "#290f29",
  cliffDarkening: 0.7,
  sedimentFrequency: 0.9,
  sedimentContrast: 0.12,
  undersideColor: "#170817",
  padPulseSpeed: 4,
  padGlow: 1.5,
  padBaseGlow: 0.15,

  // sky
  skyTop: "#261340",
  skyHorizon: "#6a2c6e",
  skyGradientLow: -0.2,
  skyGradientHigh: 0.7,
  skyText: "#d95b9a",
  skyTextOutline: "#673366",
  sloganRepeats: 4,
  sloganScroll: 0.01,
  sloganHeight: 0.77,
  sloganShimmer: 0.15,
  sloganInterval: 3,
  sloganFadeSpeed: 2.5,
  sparkleScale: 30,
  sparkleDensity: 0.14,
  sparkleSize: 0.08,
  sparkleIntensity: 1.5,
  sparkleColor: "#ffccf2",

  // post
  bloom: true,
  bloomStrength: 0.35,
  bloomThreshold: 1.2,
  bloomRadius: 1,
  bloomKnee: 0.5,
  bloomLevels: 6,
  bloomMipWeight: 1,
  toneMapping: "ACES",
  exposure: 1,
  saturation: 1.1,
  contrast: 1.04,
  chromaticAberration: 0.0015,
  vignetteOffset: 0.95,
  vignetteDarkness: 1.0,
  vignetteColor: "#ffffff",
  grain: 0.12,
  scanlines: 0.02,
  scanlineFrequency: 1.2,
  dither: 1,
  speedLines: true,
  speedLinesColor: "#ffffff",
  speedLinesOpacity: 0.55,
  speedLinesDensity: 0.28,
  speedLinesCount: 180,
  speedLinesInner: 0.25,
  speedLinesFps: 24,
  waterAmplitude: 0.015,
  waterFrequency: 6,
  waterSpeed: 3,
  glitchShift: 0.12,
  glitchSplit: 0.012,
  glitchBands: 24,
  damageColor: "#bf0014",
  damageOpacity: 0.8,
  damageChromatic: 0.004,

  // sprites & particles
  billboardSoftness: 0.25,
  particleSoftness: 0.2,
  particleEdge: 0.2,
  particleCore: 0.8,
  particleScale: 1,

  // camera & controls
  fov: 70,
  boostFov: 100,
  fovSpringTension: 280,
  fovSpringFriction: 120,
  cameraNear: 0.1,
  cameraFar: 300,
  mouseSensitivity: 1,
  invertY: false,
  shakeScale: 1,
  maxFrameTime: 0.05,

  // HUD
  hudScale: 1,
  crosshairSize: 18,
  crosshairColor: "#ffffff",
  hudIconOutline: 3,
  hudOutlineColor: "#14061a",
  hudBands: 4,
  hudAmbient: 0.35,
  hudSpecular: 0.6,
  hudRim: 0.15,
  hudPulseSpeed: 10,
  hudSquash: 0.125,
  hudStretch: 0.1,

  // audio
  volume: 1,
  musicVolume: 0.2,
  sfxVolume: 1,
  muted: false,
};

// Debug helpers are never persisted.
const TRANSIENT = new Set(["debugView", "showStats"]);

export function loadSettings() {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    for (const key of Object.keys(saved))
      if (
        key in settings &&
        !TRANSIENT.has(key) &&
        typeof saved[key] === typeof settings[key]
      )
        settings[key] = saved[key];
  } catch {
    // storage not available: defaults
  }
  return settings;
}

// Only the values that differ from the defaults are stored, so improving a
// default later reaches everybody who did not touch it.
export function diffSettings(settings) {
  const diff = {};
  for (const [key, value] of Object.entries(settings))
    if (!TRANSIENT.has(key) && value !== DEFAULT_SETTINGS[key])
      diff[key] = value;
  return diff;
}

let saveTimeout = null;
export function saveSettings(settings) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diffSettings(settings)));
    } catch {
      // ignore
    }
  }, 200);
}

export function applySettings(settings, values) {
  for (const [key, value] of Object.entries(values || {}))
    if (
      key in DEFAULT_SETTINGS &&
      typeof value === typeof DEFAULT_SETTINGS[key]
    )
      settings[key] = value;
}

export function resetSettings(settings) {
  const keep = { debugView: settings.debugView, showStats: settings.showStats };
  Object.assign(settings, DEFAULT_SETTINGS, keep);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
