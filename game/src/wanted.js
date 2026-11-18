// Wanted heat for Port Solano. Stars climb from crimes, hold inside a search
// circle while someone has a line of sight, and cool off once Rafa is lost.

const WEIGHT = {
  assault: 0.6,
  carjack: 1,
  gunfire: 0.72,
  rundown: 0.9,
  officer: 1.45,
  kill: 1.15,
};

export function createWanted() {
  return {
    stars: 0,
    heat: 0,
    seen: false,
    searchX: 0,
    searchZ: 0,
    searchR: 36,
    hidden: 0,
    lastCrime: '',
  };
}

export function reportCrime(wanted, kind, x, z) {
  const add = WEIGHT[kind] || 0.8;
  wanted.heat = Math.min(5, wanted.heat + add);
  wanted.stars = wanted.heat < 0.2 ? 0 : Math.ceil(wanted.heat - 1e-4);
  if (wanted.stars < 1) wanted.stars = 1;
  wanted.searchX = x;
  wanted.searchZ = z;
  wanted.searchR = 28 + wanted.stars * 8;
  wanted.hidden = 0;
  wanted.lastCrime = kind;
}

export function setWantedStars(wanted, stars, x, z) {
  const n = Math.max(0, Math.min(5, stars | 0));
  wanted.stars = n;
  wanted.heat = n;
  wanted.searchX = x;
  wanted.searchZ = z;
  wanted.searchR = 28 + n * 8;
  wanted.seen = false;
  wanted.hidden = 0;
  wanted.lastCrime = n ? 'set' : '';
}

export function updateWanted(wanted, dt, x, z) {
  if (wanted.heat <= 0) {
    wanted.heat = 0;
    wanted.stars = 0;
    return;
  }
  if (wanted.seen) {
    wanted.searchX = x;
    wanted.searchZ = z;
    wanted.searchR = 24 + wanted.stars * 7;
    wanted.hidden = 0;
  } else {
    wanted.hidden += dt;
    const dx = x - wanted.searchX;
    const dz = z - wanted.searchZ;
    const inside = dx * dx + dz * dz < wanted.searchR * wanted.searchR;
    if (wanted.hidden > 1.25) {
      const rate = inside ? 0.075 : 0.22;
      wanted.heat = Math.max(0, wanted.heat - rate * dt);
    }
    wanted.searchR = Math.min(140, wanted.searchR + dt * 3.2);
  }
  wanted.stars = wanted.heat < 0.2 ? 0 : Math.ceil(wanted.heat - 1e-4);
}

export function inSearchZone(wanted, x, z) {
  const dx = x - wanted.searchX;
  const dz = z - wanted.searchZ;
  return dx * dx + dz * dz <= wanted.searchR * wanted.searchR;
}
