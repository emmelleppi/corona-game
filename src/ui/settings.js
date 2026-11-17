import { PLAYER, CORONA } from "../config.js";

const STORAGE_KEY = "kill-da-corona:settings:v1";

export const DEFAULT_SETTINGS = {
  // rendering
  antialiasing: "TAA",
  renderScale: 1,
  maxPixelRatio: 2,
  taaFeedback: 0.9,
  taaVarianceGamma: 1.1,
  sharpen: 0.2,
  debugView: "Final",
  showStats: false,

  // toon
  worldBands: 3,
  characterBands: 5,
  bandSoftness: 0.04,
  specular: 0.5,
  rim: 0.35,
  rimColor: "#ffd6f0",

  // outlines
  outlines: true,
  worldOutlines: true,
  outlineWidth: 1.6,
  outlineColor: "#14061a",
  depthThreshold: 0.12,
  normalThreshold: 0.35,

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

  // shadows
  shadows: true,
  shadowResolution: 2048,
  shadowExtent: 45,
  shadowBias: 0.0004,

  // fog
  fog: true,
  fogColor: "#5b2a62",
  fogNear: 15,
  fogFar: 85,

  // post
  bloom: true,
  bloomStrength: 0.35,
  bloomThreshold: 1.2,
  bloomRadius: 1,
  toneMapping: "ACES",
  exposure: 1,
  saturation: 1.1,
  contrast: 1.04,
  chromaticAberration: 0.0015,
  vignetteOffset: 0.95,
  vignetteDarkness: 1.0,
  grain: 0.12,
  scanlines: 0.02,
  speedLines: true,

  // gameplay
  fov: 70,
  boostFov: 100,
  mouseSensitivity: 1,
  invertY: false,
  playerSpeed: PLAYER.SPEED,
  groundAcceleration: PLAYER.GROUND_ACCELERATION,
  jumpImpulse: PLAYER.JUMP_IMPULSE,
  seekDistance: CORONA.SEEK_DISTANCE,

  // audio
  volume: 1,
  musicVolume: 0.2,
  muted: false,
};

export function loadSettings() {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    for (const key of Object.keys(saved))
      if (key in settings && typeof saved[key] === typeof settings[key])
        settings[key] = saved[key];
  } catch {
    // storage not available: defaults
  }
  return settings;
}

let saveTimeout = null;
export function saveSettings(settings) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, 200);
}

export function resetSettings(settings) {
  Object.assign(settings, DEFAULT_SETTINGS);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
