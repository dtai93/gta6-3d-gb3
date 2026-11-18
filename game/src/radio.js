// Original stations. Q cycles the dial while driving or on foot.

export const STATIONS = [
  { name: 'LAGOON FM', track: 'Glass Tide', artist: 'Vela Wren' },
  { name: 'HARBOR WIRE', track: 'Salt on the Dash', artist: 'Low Pier' },
  { name: 'NEON AFTER', track: 'Pink Concrete', artist: 'Kit Vale' },
  { name: 'DOCK STATIC', track: 'Crane Song', artist: 'Red Lamp' },
  { name: 'PALM HOURS', track: 'Slow Water', artist: 'Sola Min' },
];

export function createRadio() {
  return { index: 0 };
}

export function cycleRadio(radio, dir) {
  const n = STATIONS.length;
  radio.index = (radio.index + (dir || 1) + n) % n;
}

export function nowPlaying(radio) {
  const station = STATIONS[radio.index] || STATIONS[0];
  return { station: station.name, track: station.track + ' — ' + station.artist };
}
