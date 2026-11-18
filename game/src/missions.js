// Six story jobs: delivery, tail, getaway, robbery, boat-yard heist, finale.
import * as THREE from '../vendor/three.module.min.js';
import { createVehicle, syncVehicle, yawFromDir } from './vehicles.js';

const reach = (x, z, text, next, r = 6) => ({ x, z, r, mode: 'reach', text, next });
const foot = (x, z, text, next, r = 6) => ({ x, z, r, mode: 'foot', text, next });
const sprint = (x, z, text, next, r = 8) => ({ x, z, r, mode: 'sprint', text, next });
const hold = (x, z, text, next, seconds, r = 7) => ({ x, z, r, mode: 'hold', seconds, text, next });
const tail = (x, z, text, next, r = 16) => ({ x, z, r, mode: 'tail', text, next });

export const MISSIONS = [
  {
    n: 1, title: 'CORAL DROP', kind: 'delivery', contact: 'mateo', reward: 800,
    intro: 'Cooler is under the kiosk. Ice, not questions.',
    outro: 'Clean hands. The shore remembers.',
    stages: [
      reach(44, 22, 'Meet Mateo Sol on Coral Shore', 'Pick up the cooler', 5),
      reach(88, 22, 'Take the cooler from the kiosk', 'Drive it to Old Harbor', 5),
      reach(176, 22, 'Deliver the cooler to the pier', 'Collect the cut from Mateo'),
      reach(176, 44, 'Talk to Mateo for the cut', 'Job paid', 5),
    ],
  },
  {
    n: 2, title: 'YELLOW SHADOW', kind: 'tail', contact: 'cleo', reward: 1200,
    intro: 'Yellow cab. No fare light. Two lengths back.',
    outro: 'He never made you. That is the whole trick.',
    stages: [
      tail(132, 88, 'Find the Harbor Cab on the Strip', 'Follow it north', 12),
      tail(132, 132, 'Stay with the cab through Neon Strip', 'Keep back at the turn', 40),
      tail(176, 132, 'Tail it east toward the docks', 'Do not pass him', 40),
      tail(176, 88, 'Watch where the cab stops', 'Call Cleo Marsh', 12),
    ],
  },
  {
    n: 3, title: 'THE TIDE JOB', kind: 'getaway', contact: 'nia', reward: 4500,
    intro: 'The Sprint is hot. The case is in the trunk. Drive.',
    outro: 'Tide goes out. So do we.',
    stages: [
      sprint(132, 88, 'Take the Solano Sprint on the Strip', 'Hit the south causeway'),
      sprint(88, 44, 'Outrun the cruisers on the causeway', 'Ditch the Sprint at Coral Shore'),
      foot(44, 22, 'Leave the car on Coral Shore', 'Hand the case to Nia Voss'),
      reach(44, 44, 'Meet Nia Voss at the lagoon wall', 'Get paid', 5),
    ],
  },
  {
    n: 4, title: 'VESPER TAKE', kind: 'robbery', contact: 'jun', reward: 3200,
    intro: 'Back room of Vesper. Forty seconds, then noise.',
    outro: 'Till is empty. The Strip will talk. Leave.',
    stages: [
      reach(176, 132, 'Reach Vesper Club on the Neon Strip', 'Hold the back room'),
      hold(176, 132, 'Hold the till until the case drops', 'Grab the case', 6),
      reach(176, 110, 'Take the case from the back hall', 'Get clear of the Strip', 5),
      reach(88, 176, 'Escape into Palm Heights', 'Pay Jun Park his cut'),
    ],
  },
  {
    n: 5, title: 'YARD LIGHTS', kind: 'heist', contact: 'inez', reward: 6000,
    intro: 'Crane three. The boat leaves when the lamp goes red.',
    outro: 'Lights out. The yard is ours for an hour.',
    stages: [
      reach(220, 88, 'Enter the boat-yard gate', 'Crack the lockup'),
      hold(220, 132, 'Hold the lockup while it opens', 'Load the skiff', 5),
      reach(220, 44, 'Load the skiff at the dock', 'Leave the Industrial Docks'),
      reach(176, 44, 'Get clear into Old Harbor', 'Meet Inez Calder'),
    ],
  },
  {
    n: 6, title: "BRINE'S CUT", kind: 'finale', contact: 'lalo', reward: 12000,
    intro: 'You sold the tide, Quill. I bought the shore.',
    outro: 'Port Solano keeps the quiet ones. Drive.',
    stages: [
      reach(88, 176, 'Meet the crew in Palm Heights', "Hit Brine's yard"),
      hold(220, 176, "Push into Brine's yard", 'Chase Lalo Brine', 5),
      reach(220, 88, 'Run Lalo down at the crane line', 'Finish it at the pier'),
      reach(132, 22, 'End it on the Old Harbor pier', 'The city is quiet'),
    ],
  },
];

function makeBeacon() {
  const beacon = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc14a, transparent: true, opacity: 0.92 }),
  );
  pole.position.y = 4;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffc14a, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.22;
  beacon.add(pole, ring);
  return { beacon, ring };
}

export function createMissions(scene) {
  const built = makeBeacon();
  scene.add(built.beacon);
  const state = {
    active: -1, stage: 0, progress: 0, cleared: 0, hold: 0,
    banner: '', bannerCash: 0, bannerT: 0, cooldown: 0, lock: false,
    beacon: built.beacon, ring: built.ring, tail: null, sprint: null,
  };
  placeBeacon(state);
  return state;
}

export function objectiveOf(state) {
  if (state.active >= 0) {
    const stage = MISSIONS[state.active].stages[state.stage];
    if (stage.mode === 'tail' && state.tail) return { x: state.tail.x, z: state.tail.z };
    return { x: stage.x, z: stage.z };
  }
  if (state.cleared >= MISSIONS.length) return null;
  const first = MISSIONS[state.cleared].stages[0];
  return { x: first.x, z: first.z };
}

function placeBeacon(state) {
  const spot = objectiveOf(state);
  state.beacon.visible = !!spot;
  if (spot) state.beacon.position.set(spot.x, 0, spot.z);
}

export function pulseBeacon(state, time) {
  if (!state.beacon.visible) return;
  const s = 1 + Math.sin(time * 0.005) * 0.18;
  state.ring.scale.set(s, s, s);
}

export function missionView(state) {
  const spot = objectiveOf(state);
  const blip = { x: spot ? spot.x : 0, z: spot ? spot.z : 0, hasBlip: !!spot };
  if (state.active < 0) {
    if (state.cleared >= MISSIONS.length) {
      return { kicker: 'STORY CLEAR', title: 'PORT SOLANO', text: 'The shore is quiet.', next: 'Free roam', progress: 1, ...blip };
    }
    const m = MISSIONS[state.cleared];
    return {
      kicker: 'JOB OFFER',
      title: 'MISSION ' + m.n + '/6 · ' + m.title,
      text: 'Walk to the gold marker',
      next: m.stages[0].text,
      progress: 0,
      ...blip,
    };
  }
  const m = MISSIONS[state.active];
  const s = m.stages[state.stage];
  return {
    kicker: 'STAGE ' + (state.stage + 1) + '/' + m.stages.length,
    title: 'MISSION ' + m.n + '/6 · ' + m.title,
    text: s.text,
    next: s.next,
    progress: state.progress,
    ...blip,
  };
}

export function exportMission(state) {
  return {
    active: state.active,
    stage: state.stage,
    progress: state.progress,
    cleared: state.cleared,
  };
}

export function restoreMission(state, data) {
  state.active = data.active < 0 ? -1 : (data.active | 0);
  state.stage = data.stage | 0;
  state.progress = data.progress || 0;
  state.cleared = data.cleared | 0;
  state.hold = 0;
  state.lock = false;
  state.banner = '';
  state.bannerT = 0;
  placeBeacon(state);
}

export function stageMission(state, name) {
  state.lock = true;
  if (name === 'chase') {
    state.cleared = 2;
    state.active = 2;
    state.stage = 1;
    state.progress = 0.64;
  } else if (name === 'onfoot') {
    state.cleared = 3;
    state.active = 3;
    state.stage = 1;
    state.progress = 0.48;
  } else if (name === 'city') {
    state.cleared = 0;
    state.active = 0;
    state.stage = 0;
    state.progress = 0.22;
  }
  placeBeacon(state);
}

function finishMission(state, world) {
  const job = MISSIONS[state.active];
  world.pay(job.reward);
  state.banner = job.title;
  state.bannerCash = job.reward;
  state.bannerT = 6;
  state.cleared = job.n;
  state.active = -1;
  state.stage = 0;
  state.progress = 0;
  state.hold = 0;
  state.cooldown = 3.5;
  world.say(job.contact, job.outro, 4.5);
  world.notice('MISSION COMPLETE  +$' + job.reward);
}

function parkCar(state, world, key, typeId, x, z, yaw) {
  if (state[key]) return;
  const car = createVehicle(typeId, x, z, yaw);
  car.ai = false;
  world.scene.add(car.mesh);
  world.cars.push(car);
  syncVehicle(car, 0, 0);
  state[key] = car;
}

function tickTail(state, dt, world) {
  const job = MISSIONS[state.active];
  const stage = job.stages[state.stage];
  if (!state.tail) parkCar(state, world, 'tail', 1, job.stages[0].x, job.stages[0].z + 10, Math.PI);
  const car = state.tail;
  if (state.stage === 0) {
    car.speed = 0;
    car.arrived = false;
    syncVehicle(car, dt, world.time || 0);
    return;
  }
  const dx = stage.x - car.x;
  const dz = stage.z - car.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const near = Math.hypot(world.x - car.x, world.z - car.z) < 48;
  if (dist < 3.2) {
    car.speed = 0;
    car.arrived = true;
  } else if (near) {
    car.arrived = false;
    const step = Math.min(dist, 13 * dt);
    car.x += (dx / dist) * step;
    car.z += (dz / dist) * step;
    car.yaw = yawFromDir(dx, dz);
    car.speed = 13;
  } else {
    car.speed = 0;
  }
  syncVehicle(car, dt, world.time || 0);
}

function fillProgress(state, stage, dist, dt, world) {
  if (stage.mode === 'hold') {
    const inside = dist < stage.r && !world.driven;
    state.hold = inside ? state.hold + dt : Math.max(0, state.hold - dt * 0.4);
    state.progress = Math.min(1, state.hold / (stage.seconds || 5));
    return;
  }
  if (stage.mode === 'tail' && state.tail && state.stage > 0) {
    const left = Math.hypot(stage.x - state.tail.x, stage.z - state.tail.z);
    state.progress = Math.max(0, Math.min(1, 1 - left / 52));
    return;
  }
  state.progress = Math.max(0, Math.min(1, 1 - Math.max(0, dist - stage.r) / 70));
}

function stageClear(state, stage, dist, world) {
  if (stage.mode === 'hold') return state.hold >= (stage.seconds || 5);
  if (stage.mode === 'sprint') {
    return dist < stage.r && world.driven && world.driven.typeId === 0;
  }
  if (stage.mode === 'foot') return dist < stage.r && !world.driven;
  if (stage.mode === 'tail') {
    if (!state.tail) return false;
    if (state.stage === 0) return dist < stage.r;
    return state.tail.arrived && dist < stage.r;
  }
  return dist < stage.r;
}

export function updateMissions(state, dt, world) {
  if (state.lock) return;
  if (state.bannerT > 0) {
    state.bannerT -= dt;
    if (state.bannerT <= 0) state.banner = '';
  }
  if (state.cooldown > 0) state.cooldown -= dt;
  if (state.active < 0) {
    if (state.cooldown <= 0 && state.cleared < MISSIONS.length) {
      const job = MISSIONS[state.cleared];
      const spot = job.stages[0];
      if (Math.hypot(world.x - spot.x, world.z - spot.z) < spot.r + 1.2) {
        state.active = state.cleared;
        state.stage = 0;
        state.hold = 0;
        state.progress = 0;
        world.say(job.contact, job.intro, 4.2);
        world.notice('MISSION ' + job.n + '/6  ' + job.title);
      }
    }
    placeBeacon(state);
    return;
  }
  const job = MISSIONS[state.active];
  if (job.kind === 'tail') tickTail(state, dt, world);
  if (job.kind === 'getaway') {
    const spot = job.stages[0];
    parkCar(state, world, 'sprint', 0, spot.x + 5, spot.z, 0.35);
  }
  const stage = job.stages[state.stage];
  const spot = objectiveOf(state);
  const dist = Math.hypot(world.x - spot.x, world.z - spot.z);
  fillProgress(state, stage, dist, dt, world);
  if (stageClear(state, stage, dist, world)) {
    state.hold = 0;
    if (state.stage + 1 >= job.stages.length) finishMission(state, world);
    else {
      state.stage += 1;
      state.progress = 0;
      world.say(job.contact, job.stages[state.stage].text, 3.2);
    }
  }
  placeBeacon(state);
}
