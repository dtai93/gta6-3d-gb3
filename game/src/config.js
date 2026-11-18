// World scale, movement, and the four staged screenshot poses.
// Roads run on the grid lines ix * SPAN / iz * SPAN. Blocks sit between them.
// Yaw 0 faces world -Z (inland). Camera yaw uses the same zero.

export const SPAN = 44;
export const ROAD_W = 12;
export const GRID_X = 6;
export const GRID_Z = 5;

export const PLAYER = {
  radius: 0.42,
  walk: 4.4,
  run: 8.6,
  jump: 6.4,
  gravity: 20,
};

export const CAM = {
  dist: 7.6,
  pitch: 0.28,
  lookY: 1.35,
  minPitch: -0.22,
  maxPitch: 1.18,
  yawSpeed: 0.0022,
  pitchSpeed: 0.0018,
};

// Frozen poses. lookY is the camera's look height above the ground point.
export const SHOTS = {
  chase: { x: 132, z: 66, face: 0.2, yaw: 0.45, pitch: 0.34, dist: 13, lookY: 1.3 },
  onfoot: { x: 176, z: 110, face: 1.15, yaw: 1.4, pitch: 0.2, dist: 6.2, lookY: 1.4 },
  city: { x: 132, z: 88, face: 0.4, yaw: 0.75, pitch: 0.98, dist: 155, lookY: 6 },
  start: { x: 154, z: 72, face: 0, yaw: 0.5, pitch: 0.7, dist: 200, lookY: 10 },
};

export function blockBounds(ix, iz) {
  const inset = ROAD_W * 0.5;
  return {
    x0: ix * SPAN + inset,
    z0: iz * SPAN + inset,
    x1: (ix + 1) * SPAN - inset,
    z1: (iz + 1) * SPAN - inset,
  };
}

export function districtOf(ix, iz) {
  if (ix >= 5 && iz >= 1) return 'Industrial Docks';
  if (iz <= 0 && ix >= 3) return 'Old Harbor';
  if (iz <= 1 && ix <= 2) return 'Coral Shore';
  if (iz >= 4 || (iz >= 3 && ix <= 1)) return 'Palm Heights';
  return 'Neon Strip';
}
