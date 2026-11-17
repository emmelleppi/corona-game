export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const randRange = (a, b) => a + Math.random() * (b - a);
export const getRandomUnity = () =>
  Math.random() * (Math.random() > 0.5 ? -1 : 1);

// Frame-rate independent version of `x.lerp(target, factor)` called once per
// frame at 60fps.
export const damp60 = (factor, dt) => 1 - Math.pow(1 - factor, dt * 60);

export const easeInQuad = (t) => t * t;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeInElastic = (x) => {
  const c4 = (2 * Math.PI) / 3;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
};
export const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// Halton low discrepancy sequence, used for the TAA jitter.
export function halton(index, base) {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

// Damage dealt by the bat: 3 (crit), 2 (strong) or 1.
export function getRandDamage(critChance, strongChance) {
  const rand = Math.random();
  if (rand < critChance) return 3;
  if (rand < critChance + strongChance) return 2;
  return 1;
}

// Uniform integer in [min, max].
export const randInt = (min, max) =>
  Math.floor(min + Math.random() * (Math.max(min, max) - min + 1));
