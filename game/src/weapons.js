// Rafa's four weapons. Fists, Quill 9, Strip SMG, Harbor 12. Ammo lives on the slot.

export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 18, range: 2.2, gap: 0.46, auto: false, pellets: 1, spread: 0, mag: 0, reserve: 0 },
  { id: 'quill9', name: 'Quill 9', damage: 28, range: 50, gap: 0.3, auto: false, pellets: 1, spread: 0.012, mag: 12, reserve: 36 },
  { id: 'stripsmg', name: 'Strip SMG', damage: 13, range: 36, gap: 0.08, auto: true, pellets: 1, spread: 0.05, mag: 30, reserve: 90 },
  { id: 'harbor12', name: 'Harbor 12', damage: 10, range: 16, gap: 0.7, auto: false, pellets: 6, spread: 0.11, mag: 6, reserve: 18 },
];

export function createLoadout() {
  return {
    index: 0,
    cool: 0,
    shot: 0,
    slots: WEAPONS.map((w) => ({
      id: w.id,
      name: w.name,
      damage: w.damage,
      range: w.range,
      gap: w.gap,
      auto: w.auto,
      pellets: w.pellets,
      spread: w.spread,
      mag: w.mag,
      rounds: w.mag,
      reserve: w.reserve,
    })),
  };
}

export function currentWeapon(loadout) {
  return loadout.slots[loadout.index];
}

export function selectWeapon(loadout, index) {
  if (index < 0 || index >= loadout.slots.length || index === loadout.index) return;
  loadout.index = index;
  loadout.cool = Math.max(loadout.cool, 0.12);
}

export function tickLoadout(loadout, dt) {
  if (loadout.cool > 0) loadout.cool = Math.max(0, loadout.cool - dt);
}

// Returns the weapon if this frame sends a shot. Semi-auto needs the edge; full-auto needs the hold.
export function pullTrigger(loadout, held, edge) {
  const w = currentWeapon(loadout);
  if (loadout.cool > 0) return null;
  if (w.auto ? !held : !edge) return null;
  if (w.mag > 0) {
    if (w.rounds <= 0) return null;
    w.rounds -= 1;
  }
  loadout.cool = w.gap;
  loadout.shot += 1;
  return w;
}

export function reloadWeapon(loadout) {
  const w = currentWeapon(loadout);
  if (w.mag <= 0 || w.rounds >= w.mag || w.reserve <= 0) return false;
  const take = Math.min(w.mag - w.rounds, w.reserve);
  w.rounds += take;
  w.reserve -= take;
  loadout.cool = Math.max(loadout.cool, 0.85);
  return true;
}
