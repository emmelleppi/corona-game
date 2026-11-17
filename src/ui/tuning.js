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

const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const isPrimitive = (v) => v !== null && typeof v !== "object";
const sameKind = (a, b) =>
  isPrimitive(a) &&
  isPrimitive(b) &&
  typeof a === typeof b &&
  (typeof a !== "number" || Number.isFinite(b));

// Deep merge of `source` into `target`: nested objects and arrays are merged
// in place (the GUI controllers keep their bindings), leaves are only
// replaced by finite values of the same type. Anything else is ignored.
function merge(target, source) {
  if (!isObject(source)) return;
  for (const [key, value] of Object.entries(source)) {
    if (!Object.prototype.hasOwnProperty.call(target, key)) continue;
    const current = target[key];
    if (isObject(current)) merge(current, value);
    else if (Array.isArray(current)) {
      if (!Array.isArray(value)) continue;
      current.forEach((c, i) => {
        if (sameKind(c, value[i])) current[i] = value[i];
      });
    } else if (sameKind(current, value)) target[key] = value;
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
