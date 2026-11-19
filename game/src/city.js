// Seeded Port Solano: coast, road grid, blocks, building colliders. Props are added beside these meshes.

import * as THREE from '../vendor/three.module.min.js';
import { SPAN, ROAD_W, GRID_X, GRID_Z, blockBounds, districtOf } from './config.js';
import { rngInt, pick } from './rng.js';
import { dressAvenue } from './avenue.js';

const PALETTE = {
  'Coral Shore': [0xffe4c4, 0xfff8ef, 0xf0a088, 0xf7cbb4],
  'Old Harbor': [0xd2b498, 0xa88870, 0xe4d2bc, 0x7f8e9a],
  'Neon Strip': [0x554650, 0x614d65, 0x3f4358, 0x4a3e48],
  'Palm Heights': [0xffe6c2, 0xf4efe4, 0xe4d0a8, 0xd5e4d8],
  'Industrial Docks': [0x9aa2aa, 0x727a82, 0xb4bac0, 0x5c656e],
};

const FLOORS = {
  'Coral Shore': [3, 7],
  'Old Harbor': [2, 5],
  'Neon Strip': [8, 16],
  'Palm Heights': [1, 3],
  'Industrial Docks': [1, 2],
};

const WALK_TINT = {
  'Coral Shore': 0xe6d5bc,
  'Old Harbor': 0xc9b7a2,
  'Neon Strip': 0xb9b8c6,
  'Palm Heights': 0xddd6c6,
  'Industrial Docks': 0xb7b9b6,
};

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function paintBox() {
  const geo = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const up = nrm.getY(i) > 0.6;
    const nx = nrm.getX(i);
    const shade = up ? 0.94 : 0.5 + pos.getY(i) * 0.42;
    const lit = nx > 0.4;
    const warm = lit ? 1.12 : 0.9;
    const cool = lit ? 0.94 : 1.0;
    col[i * 3] = shade * warm;
    col[i * 3 + 1] = shade * 0.98;
    col[i * 3 + 2] = shade * cool;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

const _up = new THREE.Vector3(0, 1, 0);

function compose(mesh, i, x, y, z, sx, sy, sz, color, yaw) {
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  _q.setFromAxisAngle(_up, yaw || 0);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
  if (color !== undefined) mesh.setColorAt(i, _c.setHex(color));
}

function spawnColored(root, geo, mat, spots, shadow) {
  if (!spots.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  if (shadow) mesh.castShadow = true;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    compose(mesh, i, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  root.add(mesh);
  return mesh;
}

export function districtAt(x, z) {
  if (z < SPAN * 0.2) return x >= SPAN * 3 ? 'Old Harbor' : 'Coral Shore';
  const ix = Math.min(GRID_X - 1, Math.max(0, Math.floor(x / SPAN)));
  const iz = Math.min(GRID_Z - 1, Math.max(0, Math.floor(z / SPAN)));
  return districtOf(ix, iz);
}

export function createCity(scene, rng) {
  const colliders = [];
  const root = new THREE.Group();
  scene.add(root);
  const cityW = GRID_X * SPAN;
  const cityD = GRID_Z * SPAN;

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(cityW + 36, cityD + 36),
    new THREE.MeshLambertMaterial({ color: 0x46444d }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(cityW / 2, 0, cityD / 2);
  asphalt.receiveShadow = true;
  root.add(asphalt);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(cityW + 90, 42),
    new THREE.MeshLambertMaterial({ color: 0xf2d6a4 }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(cityW / 2, 0.02, -17);
  beach.receiveShadow = true;
  root.add(beach);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(cityW + 520, 480),
    new THREE.MeshLambertMaterial({ color: 0x1498b4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(cityW / 2, -0.45, -280);
  root.add(water);

  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(cityW + 90, 2.8),
    new THREE.MeshBasicMaterial({ color: 0xf4f1e8 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(cityW / 2, 0.03, -3.4);
  root.add(foam);

  const blocks = [];
  const builds = [];
  for (let iz = 0; iz < GRID_Z; iz++) {
    for (let ix = 0; ix < GRID_X; ix++) {
      const b = blockBounds(ix, iz);
      const name = districtOf(ix, iz);
      blocks.push({ b, name });
      const lots = name === 'Industrial Docks' ? 1 : name === 'Palm Heights' ? rngInt(rng, 1, 2) : rngInt(rng, 2, 3);
      const pad = 1.35;
      const innerW = b.x1 - b.x0 - pad * 2;
      const innerD = b.z1 - b.z0 - pad * 2;
      const gap = 1.6;
      const lotW = (innerW - gap * (lots - 1)) / lots;
      const range = FLOORS[name];
      for (let i = 0; i < lots; i++) {
        const bw = lotW * (0.8 + rng() * 0.18);
        const bd = innerD * (name === 'Industrial Docks' ? 0.88 : 0.52 + rng() * 0.38);
        const cx = b.x0 + pad + i * (lotW + gap) + lotW * 0.5;
        const cz = (b.z0 + b.z1) * 0.5 + (rng() - 0.5) * Math.max(0, innerD - bd) * 0.3;
        const h = rngInt(rng, range[0], range[1]) * 3.05;
        builds.push({ cx, cz, bw, bd, h, color: pick(rng, PALETTE[name]), name });
        colliders.push({ minX: cx - bw / 2, maxX: cx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2 });
      }
    }
  }

  const walkGeo = new THREE.BoxGeometry(1, 0.16, 1);
  const walks = new THREE.InstancedMesh(walkGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), blocks.length);
  walks.receiveShadow = true;
  blocks.forEach((block, i) => {
    const b = block.b;
    compose(walks, i, (b.x0 + b.x1) / 2, 0.08, (b.z0 + b.z1) / 2, b.x1 - b.x0, 1, b.z1 - b.z0, WALK_TINT[block.name]);
  });
  walks.instanceMatrix.needsUpdate = true;
  walks.instanceColor.needsUpdate = true;
  root.add(walks);

  const buildingMesh = new THREE.InstancedMesh(
    paintBox(),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    builds.length,
  );
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  builds.forEach((b, i) => compose(buildingMesh, i, b.cx, 0, b.cz, b.bw, b.h, b.bd, b.color));
  buildingMesh.instanceMatrix.needsUpdate = true;
  buildingMesh.instanceColor.needsUpdate = true;
  root.add(buildingMesh);

  addMarkings(root, cityW, cityD);
  const glow = addWindows(root, builds);
  addPalms(root, rng, cityW);
  const lamps = addLamps(root);
  addCars(root, rng);
  addSigns(root);
  const avenueGlow = dressAvenue(root, builds);

  return {
    colliders,
    spawn: { x: SPAN * 3, z: SPAN * 1.15 },
    root,
    builds,
    glow: [glow.windows, glow.bands, lamps].concat(avenueGlow),
  };
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const GLOW = new THREE.MeshBasicMaterial({ color: 0xffffff });

function addMarkings(root, cityW, cityD) {
  const dashes = [];
  for (let ix = 0; ix <= GRID_X; ix++) {
    for (let z = 4; z < cityD; z += 5.2) dashes.push([ix * SPAN, 0.18, z, 0.18, 0.04, 2.2, 0xf0d15a]);
  }
  for (let iz = 0; iz <= GRID_Z; iz++) {
    for (let x = 4; x < cityW; x += 5.2) dashes.push([x, 0.18, iz * SPAN, 2.2, 0.04, 0.18, 0xf0d15a]);
  }
  const half = ROAD_W * 0.5 - 0.45;
  const edges = [];
  for (let ix = 0; ix <= GRID_X; ix++) {
    edges.push([ix * SPAN - half, 0.17, cityD / 2, 0.14, 0.03, cityD, 0xe8e4da]);
    edges.push([ix * SPAN + half, 0.17, cityD / 2, 0.14, 0.03, cityD, 0xe8e4da]);
  }
  for (let iz = 0; iz <= GRID_Z; iz++) {
    edges.push([cityW / 2, 0.17, iz * SPAN - half, cityW, 0.03, 0.14, 0xe8e4da]);
    edges.push([cityW / 2, 0.17, iz * SPAN + half, cityW, 0.03, 0.14, 0xe8e4da]);
  }
  spawnColored(root, BOX, GLOW, dashes);
  spawnColored(root, BOX, GLOW, edges);
}

function addWindows(root, builds) {
  const spots = [];
  const bands = [];
  for (let i = 0; i < builds.length; i++) {
    const b = builds[i];
    const rows = Math.max(1, Math.floor((b.h - 1.2) / 3.05));
    const colsX = Math.max(2, Math.floor(b.bw / 1.85));
    const colsZ = Math.max(2, Math.floor(b.bd / 1.85));
    const neon = b.name === 'Neon Strip';
    for (let row = 0; row < rows; row++) {
      const y = 1.7 + row * 3.05;
      for (let c = 0; c < colsX; c++) {
        const x = b.cx - b.bw / 2 + (c + 0.5) * (b.bw / colsX);
        const lit = neon ? ((c + row) % 2 ? 0x5ff6ea : 0xff4d9a) : ((row + c) % 3 === 0 ? 0xffe7b0 : 0x152033);
        spots.push([x, y, b.cz + b.bd / 2 + 0.08, 0.52, 0.78, 0.06, lit]);
        spots.push([x, y, b.cz - b.bd / 2 - 0.08, 0.52, 0.78, 0.06, lit]);
      }
      for (let c = 0; c < colsZ; c++) {
        const z = b.cz - b.bd / 2 + (c + 0.5) * (b.bd / colsZ);
        const lit = neon ? ((c + row) % 2 ? 0xff4d9a : 0x5ff6ea) : ((row + c) % 3 === 0 ? 0xffe7b0 : 0x152033);
        spots.push([b.cx + b.bw / 2 + 0.08, y, z, 0.06, 0.78, 0.52, lit]);
        spots.push([b.cx - b.bw / 2 - 0.08, y, z, 0.06, 0.78, 0.52, lit]);
      }
    }
    if (neon) {
      const glow = i % 2 ? 0xff2d78 : 0x24f0d4;
      bands.push([b.cx, b.h - 0.45, b.cz + b.bd / 2, b.bw * 0.92, 0.7, 0.28, glow]);
      bands.push([b.cx, b.h - 0.45, b.cz - b.bd / 2, b.bw * 0.92, 0.7, 0.28, glow]);
      bands.push([b.cx + b.bw / 2, b.h - 0.45, b.cz, 0.28, 0.7, b.bd * 0.92, glow]);
      bands.push([b.cx - b.bw / 2, b.h - 0.45, b.cz, 0.28, 0.7, b.bd * 0.92, glow]);
    }
  }
  return {
    windows: spawnColored(root, BOX, GLOW, spots),
    bands: spawnColored(root, BOX, GLOW, bands),
  };
}

function palmGeometry() {
  const bits = [];
  const trunk = new THREE.CylinderGeometry(0.1, 0.16, 3.2, 5).toNonIndexed();
  trunk.translate(0, 1.6, 0);
  bits.push([trunk, 0.78, 0.52, 0.3]);
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.ConeGeometry(0.14, 1.7, 4).toNonIndexed();
    frond.translate(0, 0.85, 0);
    frond.rotateZ(1.25);
    frond.rotateY((i / 5) * Math.PI * 2);
    frond.translate(0, 3.3, 0);
    bits.push([frond, 0.28, 0.78, 0.36]);
  }
  let count = 0;
  for (let k = 0; k < bits.length; k++) count += bits[k][0].attributes.position.count;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  let o = 0;
  for (let k = 0; k < bits.length; k++) {
    const g = bits[k][0];
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n = (o + i) * 3;
      pos[n] = p.getX(i);
      pos[n + 1] = p.getY(i);
      pos[n + 2] = p.getZ(i);
      col[n] = bits[k][1];
      col[n + 1] = bits[k][2];
      col[n + 2] = bits[k][3];
    }
    o += p.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

function addPalms(root, rng, cityW) {
  const spots = [];
  for (let x = -4; x <= cityW + 6; x += 8) spots.push([x, 0, -7.5, 0.9 + rng() * 0.35, 0.9, 0.9]);
  for (let ix = 0; ix < GRID_X; ix++) {
    for (let iz = 0; iz < GRID_Z; iz++) {
      const name = districtOf(ix, iz);
      if (name !== 'Palm Heights' && name !== 'Coral Shore' && name !== 'Old Harbor') continue;
      const b = blockBounds(ix, iz);
      const scale = 0.75 + rng() * 0.35;
      spots.push([b.x0 + 0.9, 0, b.z0 + 0.9, scale, scale, scale]);
      if (name === 'Palm Heights') spots.push([b.x1 - 0.9, 0, b.z1 - 0.9, scale, scale, scale]);
    }
  }
  const mesh = new THREE.InstancedMesh(
    palmGeometry(),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
    spots.length,
  );
  mesh.castShadow = true;
  spots.forEach((s, i) => compose(mesh, i, s[0], s[1], s[2], s[3], s[4], s[5]));
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
}

function addLamps(root) {
  const poles = [];
  const bulbs = [];
  const half = ROAD_W * 0.5 + 0.15;
  function drop(x, z) {
    poles.push([x, 0, z, 0.16, 4.4, 0.16, 0x2c3138]);
    bulbs.push([x, 4.45, z, 0.34, 0.34, 0.34, 0xffb15a]);
  }
  for (let ix = 0; ix <= GRID_X; ix++) {
    for (let z = 10; z < GRID_Z * SPAN; z += 22) {
      drop(ix * SPAN - half, z);
      drop(ix * SPAN + half, z);
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.5, 0.7, 1, 5);
  poleGeo.translate(0, 0.5, 0);
  spawnColored(root, poleGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), poles, true);
  const bulbGeo = new THREE.SphereGeometry(0.5, 6, 5);
  return spawnColored(root, bulbGeo, GLOW, bulbs);
}

const CAR_COLORS = [0xe10600, 0xf6f7f8, 0x14171c, 0xf0c400, 0x1f78d0, 0xff6a14];

function addCars(root, rng) {
  const bodies = [];
  const tops = [];
  for (let ix = 0; ix <= GRID_X; ix++) {
    for (let iz = 0; iz < GRID_Z; iz++) {
      if (ix === 3 && iz === 1) continue;
      if (rng() < 0.42) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const x = ix * SPAN + side * 3.7;
      const z = iz * SPAN + 11 + rng() * (SPAN - 22);
      const color = pick(rng, CAR_COLORS);
      const yaw = rng() < 0.5 ? 0 : Math.PI;
      bodies.push([x, 0.5, z, 1.7, 0.55, 3.8, color, yaw]);
      tops.push([x, 1.0, z, 1.45, 0.42, 1.9, 0xd5e4ee, yaw]);
    }
  }
  spawnColored(root, BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), bodies, true);
  spawnColored(root, BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), tops);
}

function makeSign(title, sub, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg;
  g.fillRect(0, 0, 512, 16);
  g.fillRect(0, 240, 512, 16);
  g.font = 'bold 72px sans-serif';
  g.textAlign = 'center';
  g.fillText(title, 256, 120);
  g.font = '32px sans-serif';
  g.fillText(sub, 256, 185);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6, 5), new THREE.MeshLambertMaterial({ color: 0x24282e }));
  pole.position.y = 3;
  board.position.y = 7.4;
  const group = new THREE.Group();
  group.add(pole, board);
  return group;
}

function addSigns(root) {
  const signs = [
    ['CORAL SHORE', 'the warm side', '#e26a4a', '#fff4e8', 36, 8],
    ['NEON STRIP', 'open all night', '#241433', '#3df0dc', 150, 120],
    ['REEF 98', 'port solano radio', '#123044', '#ffd27a', 96, 70],
    ['OLD HARBOR', 'co-op market', '#6e5344', '#f3e6d4', 210, 18],
  ];
  for (let i = 0; i < signs.length; i++) {
    const s = signs[i];
    const sign = makeSign(s[0], s[1], s[2], s[3]);
    sign.position.set(s[4], 0, s[5]);
    sign.rotation.y = i === 1 ? 0.6 : -0.4;
    root.add(sign);
  }
}
