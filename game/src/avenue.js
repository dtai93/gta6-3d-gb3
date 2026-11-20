// Causeway dressing along x = 3*SPAN: hotel crowns, signs, billboards, palms, curbs.

import * as THREE from '../vendor/three.module.min.js';
import { SPAN, ROAD_W } from './config.js';
import { addGlow } from './glow.js';

const AX = 3 * SPAN;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const GLOW = new THREE.MeshBasicMaterial({ color: 0xffffff });
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

const SIGNS = [
  ['TIDE HOTEL', 'ROOMS ON THE WATER'],
  ['CORAL INN', 'THE WARM SIDE'],
  ['VESPER', 'OPEN ALL NIGHT'],
  ['PALM COURT', 'HEIGHTS ABOVE'],
  ['SOL TOWER', 'PORT SOLANO'],
  ['REEF HOUSE', 'HARBOR LIGHT'],
];

const BOARDS = [
  ['LAGOON FM', 'GLASS TIDE', '#1a1030', '#5df6e4'],
  ['REEF SODA', 'COLD AND LOCAL', '#0c4a58', '#ffe08a'],
  ['VESPER', 'NEON STRIP', '#2a1030', '#ff4f9a'],
  ['PALM HOURS', 'AFTER DARK', '#143028', '#f6e7a0'],
  ['HARBOR WIRE', 'PORT RADIO', '#1a2438', '#ffd27a'],
  ['TIDE LINE', 'WATERFRONT', '#8c2438', '#fff1e4'],
];

function put(mesh, i, x, y, z, sx, sy, sz, color, yaw) {
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  _q.setFromAxisAngle(_up, yaw || 0);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
  if (color !== undefined) mesh.setColorAt(i, _c.setHex(color));
}

function spawn(root, spots, mat, shadow) {
  if (!spots.length) return null;
  const mesh = new THREE.InstancedMesh(BOX, mat, spots.length);
  if (shadow) mesh.castShadow = true;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    put(mesh, i, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  root.add(mesh);
  return mesh;
}

function avenueBuilds(builds) {
  const list = [];
  for (let i = 0; i < builds.length; i++) {
    const b = builds[i];
    if (Math.abs(b.cx - AX) < 36 && b.cz > 12 && b.cz < 200) list.push(b);
  }
  list.sort((a, b) => a.cz - b.cz);
  return list;
}

function gridX(wins, cx, y0, cz, bw, h, bd, color) {
  const cols = Math.max(2, Math.floor(bd / 2.1));
  const rows = Math.max(2, Math.floor(h / 2.3));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const y = y0 + (r + 0.5) * (h / rows);
      const z = cz - bd / 2 + (c + 0.5) * (bd / cols);
      wins.push([cx + bw / 2 + 0.07, y, z, 0.06, 0.62, 0.48, color]);
      wins.push([cx - bw / 2 - 0.07, y, z, 0.06, 0.62, 0.48, color]);
    }
  }
}

function addCrowns(root, list) {
  const mass = [];
  const wins = [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const neon = b.name === 'Neon Strip';
    const lite = neon ? 0x71839b : 0xfff3e2;
    const hot = neon ? (i % 2 ? 0xff579d : 0x58f4db) : 0xffe2a4;
    const k = i % 4;
    if (k === 0) {
      const bw = b.bw * 0.58;
      const bd = b.bd * 0.58;
      const h = Math.max(4, b.h * 0.38);
      mass.push([b.cx, b.h + h / 2, b.cz, bw, h, bd, lite]);
      gridX(wins, b.cx, b.h, b.cz, bw, h, bd, hot);
    } else if (k === 1) {
      const h1 = Math.max(5, b.h * 0.48);
      mass.push([b.cx - b.bw * 0.22, b.h + h1 / 2, b.cz, b.bw * 0.3, h1, b.bd * 0.62, lite]);
      mass.push([b.cx + b.bw * 0.2, b.h + h1 * 0.28, b.cz, b.bw * 0.26, h1 * 0.45, b.bd * 0.4, lite]);
      gridX(wins, b.cx - b.bw * 0.22, b.h, b.cz, b.bw * 0.3, h1, b.bd * 0.62, hot);
    } else if (k === 2) {
      mass.push([b.cx, b.h + b.h * 0.08, b.cz, b.bw * 0.82, b.h * 0.16, b.bd * 0.82, lite]);
      const h = b.h * 0.22;
      mass.push([b.cx, b.h + b.h * 0.16 + h / 2, b.cz, b.bw * 0.46, h, b.bd * 0.46, lite]);
      mass.push([b.cx, b.h + b.h * 0.4, b.cz, 0.28, b.h * 0.34, 0.28, 0x2a3038]);
      gridX(wins, b.cx, b.h + b.h * 0.16, b.cz, b.bw * 0.46, h, b.bd * 0.46, hot);
    } else {
      const h = Math.max(3.2, b.h * 0.3);
      mass.push([b.cx, b.h + h / 2, b.cz + b.bd * 0.12, b.bw * 0.42, h, b.bd * 0.32, lite]);
      mass.push([b.cx, b.h + 0.4, b.cz - b.bd * 0.08, b.bw * 0.88, 0.7, b.bd * 0.36, lite]);
      gridX(wins, b.cx, b.h, b.cz + b.bd * 0.12, b.bw * 0.42, h, b.bd * 0.32, hot);
    }
  }
  const lambert = new THREE.MeshLambertMaterial({ color: 0xffffff });
  spawn(root, mass, lambert, true);
  return spawn(root, wins, GLOW, false);
}

function boardTex(title, sub, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg;
  g.fillRect(0, 0, 512, 18);
  g.fillRect(0, 238, 512, 18);
  g.fillRect(0, 18, 18, 220);
  g.font = 'bold 68px sans-serif';
  g.textAlign = 'center';
  g.fillText(title, 264, 118);
  g.font = '28px sans-serif';
  g.fillText(sub, 264, 176);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addBoards(root, list) {
  let n = 0;
  for (let i = 0; i < list.length && n < BOARDS.length; i += 2) {
    const b = list[i];
    const spec = BOARDS[n];
    const west = b.cx < AX;
    const x = west ? b.cx + b.bw / 2 + 0.2 : b.cx - b.bw / 2 - 0.2;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 3.6),
      new THREE.MeshBasicMaterial({ map: boardTex(spec[0], spec[1], spec[2], spec[3]), side: THREE.DoubleSide }),
    );
    board.position.set(x, Math.min(11, Math.max(6.5, b.h * 0.42)), b.cz);
    board.rotation.y = west ? -Math.PI / 2 : Math.PI / 2;
    root.add(board);
    const sign = SIGNS[n];
    const roof = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 2.1),
      new THREE.MeshBasicMaterial({ map: boardTex(sign[0], sign[1], spec[2], spec[3]), side: THREE.DoubleSide }),
    );
    if (b.cz > 24 && b.cz < 100) {
      roof.position.set(b.cx, b.h + 2.05, b.cz);
      root.add(roof);
    }
    n += 1;
  }
}

function addCoverBoards(root) {
  const spots = [
    ['LAGOON FM', 'GLASS TIDE', '#1a1030', '#5df6e4', 110, 7.1, 36],
    ['REEF SODA', 'COLD AND LOCAL', '#0c4a58', '#ffe08a', 151, 7.8, 48],
    ['TIDE HOTEL', 'ON THE WATER', '#8c2438', '#fff1e4', 112, 6.4, 22],
  ];
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 2.5),
      new THREE.MeshBasicMaterial({ map: boardTex(s[0], s[1], s[2], s[3]), side: THREE.DoubleSide }),
    );
    board.position.set(s[4], s[5], s[6]);
    root.add(board);
  }
}

function palmGeo() {
  const bits = [];
  const trunk = new THREE.CylinderGeometry(0.09, 0.15, 3.4, 5).toNonIndexed();
  trunk.translate(0, 1.7, 0);
  bits.push([trunk, 0.78, 0.52, 0.3]);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.ConeGeometry(0.12, 1.85, 4).toNonIndexed();
    frond.translate(0, 0.9, 0);
    frond.rotateZ(1.2);
    frond.rotateY((i / 6) * Math.PI * 2);
    frond.translate(0, 3.45, 0);
    bits.push([frond, 0.3, 0.82, 0.38]);
  }
  let count = 0;
  for (let k = 0; k < bits.length; k++) count += bits[k][0].attributes.position.count;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  let o = 0;
  for (let k = 0; k < bits.length; k++) {
    const p = bits[k][0].attributes.position;
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
  return geo;
}

function addPalms(root) {
  const spots = [];
  const edge = ROAD_W * 0.5 + 1.35;
  for (let z = 8; z < GRID_END; z += 11) {
    const s = 0.92 + ((z / 11) % 3) * 0.06;
    spots.push([AX - edge, 0, z, s, s, s]);
    spots.push([AX + edge, 0, z, s, s * 1.04, s]);
  }
  const mesh = new THREE.InstancedMesh(
    palmGeo(),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
    spots.length,
  );
  mesh.castShadow = true;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    put(mesh, i, s[0], s[1], s[2], s[3], s[4], s[5]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
}

const GRID_END = 5 * SPAN;

function addCurbs(root) {
  const stripes = [];
  for (let iz = 1; iz <= 4; iz++) {
    const z = iz * SPAN;
    for (let i = -4; i <= 4; i++) {
      stripes.push([AX + i * 1.15, 0.21, z, 0.48, 0.04, 2.8, 0xf7f4ee]);
    }
  }
  const colors = [0xe10600, 0xf4f6f8, 0x111318, 0xf0c400, 0x1f78d0, 0xff6a14];
  const bodies = [];
  const tops = [];
  let n = 0;
  for (let z = 20; z < GRID_END; z += 16) {
    if (Math.abs(z - 66) < 18) continue;
    const yaw = n % 2 ? 0 : Math.PI;
    const color = colors[n % colors.length];
    for (let side = -1; side <= 1; side += 2) {
      const x = AX + side * 5.05;
      bodies.push([x, 0.48, z, 1.55, 0.5, 3.5, color, yaw]);
      tops.push([x, 0.95, z, 1.3, 0.36, 1.7, 0xd5e6f0, yaw]);
    }
    n += 1;
  }
  spawn(root, stripes, GLOW, false);
  const lambert = new THREE.MeshLambertMaterial({ color: 0xffffff });
  spawn(root, bodies, lambert, true);
  spawn(root, tops, lambert, false);
  const half = ROAD_W * 0.5 + 0.15;
  for (let z = 12; z < GRID_END; z += 22) {
    addGlow(root, AX - half, 4.5, z, 0xffb15a, 1.35);
    addGlow(root, AX + half, 4.5, z, 0xffb15a, 1.35);
  }
}

export function dressAvenue(root, builds) {
  const list = avenueBuilds(builds);
  const windows = addCrowns(root, list);
  addBoards(root, list);
  addCoverBoards(root);
  addPalms(root);
  addCurbs(root);
  return windows ? [windows] : [];
}
