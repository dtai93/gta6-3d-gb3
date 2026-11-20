// Waterfront reputation earned through jobs and dockside work.

export const RESPECT_RANKS = [
  { at: 0, title: 'Pier Hand' },
  { at: 250, title: 'Tide Runner' },
  { at: 700, title: 'Harbor Fixer' },
  { at: 1500, title: 'Breakwater Broker' },
  { at: 3000, title: 'Port Keeper' },
];

export function createRespect(rp = 0) {
  return { rp: Math.max(0, Math.floor(Number(rp) || 0)) };
}

export function addRespect(state, amount) {
  state.rp = Math.max(0, state.rp + Math.max(0, Math.floor(amount || 0)));
  return respectView(state);
}

export function respectView(state) {
  let rank = RESPECT_RANKS[0];
  let next = null;
  for (let i = 0; i < RESPECT_RANKS.length; i++) {
    if (state.rp >= RESPECT_RANKS[i].at) rank = RESPECT_RANKS[i];
    else { next = RESPECT_RANKS[i]; break; }
  }
  return { rp: state.rp, title: rank.title, next: next ? next.at : null };
}
