// Deterministic mulberry32. Every city layout and shot uses this, never Math.random.

export function makeRng(seed) {
  let s = (Math.floor(Number(seed)) >>> 0) || 1;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngRange(rng, min, max) {
  return min + (max - min) * rng();
}

export function rngInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
