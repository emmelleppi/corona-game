import {
  PLAYER,
  BAT,
  CORONA,
  GAME,
  COLORS,
  TRAMPOLINE,
  FX,
} from "../config.js";

// Gameplay constants (config.js) are plain mutable objects read at use time,
// so the settings panel can tune them live. Only the values that differ from
// the defaults are persisted, apart from the render settings.
const STORAGE_KEY = "kill-da-corona:tuning:v1";

export const TUNABLES = { PLAYER, BAT, CORONA, GAME, COLORS, TRAMPOLINE, FX };

const DEFAULTS = structuredClone(TUNABLES);

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

// Deep merge of `source` into `target`, only for existing keys of the same type.
function merge(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (!(key in target)) continue;
    const current = target[key];
    if (isObject(current) && isObject(value)) merge(current, value);
    else if (Array.isArray(current) && Array.isArray(value))
      value.forEach((v, i) => {
        if (typeof v === typeof current[i]) current[i] = v;
      });
    else if (typeof value === typeof current) target[key] = value;
  }
}

function diff(current, defaults) {
  if (isObject(current)) {
    const out = {};
    for (const key of Object.keys(current)) {
      const d = diff(current[key], defaults?.[key]);
      if (d !== undefined) out[key] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return JSON.stringify(current) === JSON.stringify(defaults)
    ? undefined
    : structuredClone(current);
}

export const tuningDiff = () => diff(TUNABLES, DEFAULTS) || {};

export function applyTuning(values) {
  merge(TUNABLES, values);
}

export function loadTuning() {
  try {
    applyTuning(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    // storage not available: defaults
  }
}

let timeout = null;
export function saveTuning() {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tuningDiff()));
    } catch {
      // ignore
    }
  }, 200);
}

export function resetTuning() {
  // in place, so the GUI controllers keep pointing to the same objects
  merge(TUNABLES, structuredClone(DEFAULTS));
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
