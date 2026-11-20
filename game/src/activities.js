// Port Solano's side-activity directory and compact career ledger.

import { DOCK_GARAGE, RACE_LINE } from './config.js';

export const ACTIVITIES = [
  { id: 'safehouse', title: 'Coral Shore Safehouse', kind: 'SAFEHOUSE', x: 44, z: 22 },
  { id: 'story', title: 'Story Contact', kind: 'STORY', x: 44, z: 22 },
  { id: 'race', title: 'Solano Sprint', kind: 'RACE', x: RACE_LINE.x, z: RACE_LINE.z },
  { id: 'garage', title: 'Industrial Docks Stall', kind: 'GARAGE', x: DOCK_GARAGE.x, z: DOCK_GARAGE.z },
];

export function createActivities(saved = {}) {
  return {
    carsStolen: Math.max(0, saved.carsStolen | 0),
    heatEscaped: Math.max(0, saved.heatEscaped | 0),
    distanceKm: Math.max(0, Number(saved.distanceKm) || 0),
    jobsDone: Math.max(0, saved.jobsDone | 0),
    racesWon: Math.max(0, saved.racesWon | 0),
    bestRace: Math.max(0, Number(saved.bestRace) || 0),
  };
}

export function recordCarStolen(stats) {
  stats.carsStolen += 1;
}

export function recordHeatEscape(stats) {
  stats.heatEscaped += 1;
}

export function recordDistance(stats, metres) {
  if (Number.isFinite(metres) && metres > 0) stats.distanceKm += metres / 1000;
}

export function recordJob(stats) {
  stats.jobsDone += 1;
}

export function recordRace(stats, seconds) {
  stats.racesWon += 1;
  if (!stats.bestRace || seconds < stats.bestRace) stats.bestRace = seconds;
}

export function harborWatch(seconds) {
  const arrivals = [6 * 60 + 10, 9 * 60 + 10, 12 * 60 + 10, 15 * 60 + 10, 18 * 60 + 10, 21 * 60 + 10];
  const minute = (Math.floor(seconds / 60) % 1440 + 1440) % 1440;
  let next = arrivals.find((time) => time > minute);
  if (next == null) next = arrivals[0] + 1440;
  const wait = next - minute;
  const arrival = next % 1440;
  const hh = String(Math.floor(arrival / 60)).padStart(2, '0');
  const mm = String(arrival % 60).padStart(2, '0');
  return {
    open: wait <= 18,
    text: 'FERRY ' + hh + ':' + mm + ' · ' + (wait <= 18 ? 'WINDOW OPEN' : Math.floor(wait) + 'M'),
  };
}

export function careerView(stats) {
  return {
    carsStolen: stats.carsStolen,
    heatEscaped: stats.heatEscaped,
    distanceKm: stats.distanceKm,
    jobsDone: stats.jobsDone,
    racesWon: stats.racesWon,
    bestRace: stats.bestRace,
  };
}
