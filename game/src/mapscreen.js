// Full-city map. North is +Z, up the canvas. Ocean sits at z < 0.

import { GRID_X, GRID_Z, SPAN } from './config.js';
import { SAFEHOUSE } from './save.js';

const MARKS = [
  [1, 0, 'CORAL SHORE'],
  [4, 0, 'OLD HARBOR'],
  [3, 2, 'NEON STRIP'],
  [0, 4, 'PALM HEIGHTS'],
  [5, 2, 'INDUSTRIAL DOCKS'],
];

export function drawWorldMap(canvas, s) {
  const w = canvas.width = Math.max(640, canvas.clientWidth || 1280);
  const h = canvas.height = Math.max(480, canvas.clientHeight || 800);
  const ctx = canvas.getContext('2d');
  const minX = -36;
  const maxX = GRID_X * SPAN + 24;
  const minZ = -48;
  const maxZ = GRID_Z * SPAN + 18;
  function P(x, z) {
    const u = (x - minX) / (maxX - minX);
    const v = (z - minZ) / (maxZ - minZ);
    return [28 + u * (w - 56), h - 28 - v * (h - 56)];
  }
  ctx.fillStyle = '#102430';
  ctx.fillRect(0, 0, w, h);
  const shore = P(0, 0)[1];
  ctx.fillStyle = '#1a6e86';
  ctx.fillRect(0, shore, w, h - shore);
  ctx.fillStyle = '#d7c39a';
  ctx.fillRect(0, shore - 18, w, 18);
  ctx.fillStyle = '#1e3a34';
  const land = P(0, maxZ);
  ctx.fillRect(0, 0, w, land[1]);
  ctx.strokeStyle = '#efe6d4';
  ctx.lineWidth = 5;
  for (let i = 0; i <= GRID_X; i++) {
    const a = P(i * SPAN, 0);
    const b = P(i * SPAN, GRID_Z * SPAN);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (let j = 0; j <= GRID_Z; j++) {
    const a = P(0, j * SPAN);
    const b = P(GRID_X * SPAN, j * SPAN);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe7c4';
  ctx.font = '700 18px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < MARKS.length; i++) {
    const m = MARKS[i];
    const p = P((m[0] + 0.5) * SPAN, (m[1] + 0.5) * SPAN);
    ctx.fillText(m[2], p[0], p[1]);
  }
  const home = P(SAFEHOUSE.x, SAFEHOUSE.z);
  ctx.fillStyle = '#ffc14a';
  ctx.fillRect(home[0] - 7, home[1] - 7, 14, 14);
  ctx.fillStyle = '#1a1208';
  ctx.font = '800 13px sans-serif';
  ctx.fillText('SAFEHOUSE', home[0], home[1] - 14);
  const job = s.mission;
  if (job && job.hasBlip) {
    const p = P(job.x, job.z);
    ctx.fillStyle = '#ffc14a';
    ctx.beginPath();
    ctx.arc(p[0], p[1], 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1208';
    ctx.font = '800 12px sans-serif';
    ctx.fillText('JOB', p[0], p[1] - 16);
  }
  const cops = s.police || [];
  ctx.fillStyle = '#ff3a3a';
  for (let i = 0; i < cops.length; i++) {
    const p = P(cops[i].x, cops[i].z);
    ctx.fillRect(p[0] - 5, p[1] - 5, 10, 10);
  }
  const you = P(s.x, s.z);
  ctx.save();
  ctx.translate(you[0], you[1]);
  ctx.rotate(Math.PI + (s.yaw || 0));
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(10, 12);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff8ee';
  ctx.textAlign = 'left';
  ctx.font = '800 28px sans-serif';
  ctx.fillText('PORT SOLANO', 36, 48);
  ctx.font = '700 14px sans-serif';
  ctx.fillStyle = '#ffd7b0';
  ctx.fillText('WORLD MAP  ·  M OR ESC CLOSES', 36, 72);
  ctx.fillText(s.district ? s.district.toUpperCase() : '', 36, 94);
}
