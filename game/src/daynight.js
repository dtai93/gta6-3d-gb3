// Night factor for windows, neon bands, and street lamps. Sunset stays at scale 1.

function glowScale(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 17 && h < 19.5) return 1.28;
  if (h >= 19.5 && h < 22) return 1 + ((h - 19.5) / 2.5) * 0.85;
  if (h >= 22 || h < 5) return 1.85;
  if (h >= 5 && h < 7) return 1.85 + ((h - 5) / 2) * (0.62 - 1.85);
  return 0.62;
}

export function createNeon(meshes) {
  const sets = [];
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    if (!mesh || !mesh.instanceColor) continue;
    sets.push({ mesh, base: Float32Array.from(mesh.instanceColor.array) });
  }
  return sets;
}

export function updateNeon(sets, hour) {
  const gamma = 1 / glowScale(hour);
  for (let s = 0; s < sets.length; s++) {
    const set = sets[s];
    const colors = set.mesh.instanceColor.array;
    const base = set.base;
    for (let i = 0; i < colors.length; i++) colors[i] = Math.pow(Math.max(0, base[i]), gamma);
    set.mesh.instanceColor.needsUpdate = true;
  }
}
