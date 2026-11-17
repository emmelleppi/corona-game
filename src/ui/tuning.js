import { PLAYER, BAT, CORONA, GAME, COLORS } from "../config.js";

// Gameplay constants (config.js) are plain mutable objects read at use time,
// so the settings panel can tune them live. Overrides are persisted apart
// from the render settings.
const STORAGE_KEY = "kill-da-corona:tuning:v1";

export const TUNABLES = { PLAYER, BAT, CORONA, GAME, COLORS };

const DEFAULTS = structuredClone(TUNABLES);

export function loadTuning() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    for (const [group, values] of Object.entries(saved)) {
      const target = TUNABLES[group];
      if (!target) continue;
      for (const [key, value] of Object.entries(values))
        if (key in target && typeof value === typeof target[key])
          target[key] = value;
    }
  } catch {
    // storage not available: defaults
  }
}

let timeout = null;
export function saveTuning() {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    const diff = {};
    for (const [group, values] of Object.entries(TUNABLES))
      for (const [key, value] of Object.entries(values))
        if (JSON.stringify(value) !== JSON.stringify(DEFAULTS[group][key]))
          (diff[group] ||= {})[key] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diff));
    } catch {
      // ignore
    }
  }, 200);
}

export function resetTuning() {
  for (const [group, values] of Object.entries(DEFAULTS))
    Object.assign(TUNABLES[group], structuredClone(values));
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function exportTuning() {
  return structuredClone(TUNABLES);
}
