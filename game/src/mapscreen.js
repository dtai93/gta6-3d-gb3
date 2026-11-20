// Full-city map. North is +Z, up the canvas. Ocean sits at z < 0.

import { GRID_X, GRID_Z, SPAN } from './config.js';
import { ACTIVITIES } from './activities.js';
import { DOCK_CREW } from './crew.js';

const MARKS = [
  [1, 1, 'CORAL SHORE'],
  [4, 0, 'OLD HARBOR'],
  [3, 2, 'NEON STRIP'],
  [0, 4, 'PALM HEIGHTS'],
  [5, 2, 'INDUSTRIAL DOCKS'],
];

export function drawWorldMap(canvas, s) {
  const w = canvas.width = Math.max(640, canvas.clientWidth || 1280);
  const h = canvas.height = Math.max(480, canvas.clientHeight || 800);
  const ctx = canvas.getContext('2d');
  const mapW = Math.floor(w * 0.69);
  const minX = -36;
  const maxX = GRID_X * SPAN + 24;
  const minZ = -48;
  const maxZ = GRID_Z * SPAN + 18;
  function P(x, z) {
    const u = (x - minX) / (maxX - minX);
    const v = (z - minZ) / (maxZ - minZ);
    return [28 + u * (mapW - 56), h - 28 - v * (h - 56)];
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
  for (const activity of ACTIVITIES) {
    const p = P(activity.x, activity.z);
    const story = activity.kind === 'STORY';
    if (activity.kind === 'SAFEHOUSE') { p[0] -= 11; p[1] += 12; }
    else if (story) { p[0] += 15; p[1] -= 15; }
    ctx.fillStyle = activity.kind === 'SAFEHOUSE' ? '#ffc14a' : activity.kind === 'RACE' ? '#74e5d3' : story ? '#d9b7ff' : '#f4986a';
    ctx.strokeStyle = '#12232a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#10212a';
    ctx.font = '900 11px sans-serif';
    ctx.fillText(activity.kind === 'SAFEHOUSE' ? 'H' : activity.kind === 'RACE' ? 'R' : story ? 'C' : 'G', p[0], p[1] + 4);
    ctx.fillStyle = '#fff4df';
    ctx.font = '800 13px sans-serif';
    ctx.textAlign = activity.kind === 'SAFEHOUSE' ? 'right' : 'left';
    const labelX = activity.kind === 'SAFEHOUSE' ? p[0] - 13 : p[0] + 13;
    ctx.fillText(story ? 'CONTACT' : activity.kind, labelX, p[1] + 4);
    ctx.textAlign = 'center';
  }
  const job = s.mission;
  if (job && job.hasBlip) {
    const p = P(job.x, job.z);
    p[0] -= 14;
    p[1] -= 14;
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
  ctx.fillStyle = 'rgba(7,14,20,0.96)';
  ctx.fillRect(mapW, 0, w - mapW, h);
  ctx.strokeStyle = '#8f8067';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mapW, 0);
  ctx.lineTo(mapW, h);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff8ee';
  ctx.font = '900 25px sans-serif';
  ctx.fillText('PORT SOLANO', 30, 42);
  ctx.font = '800 15px sans-serif';
  ctx.fillStyle = '#ffd27a';
  ctx.fillText('PAUSE MAP + STATS  ·  M OR ESC CLOSES', 30, 67);
  ctx.font = '800 14px sans-serif';
  ctx.fillStyle = '#bce6e4';
  ctx.fillText((s.district || '').toUpperCase() + '  ·  RAFA QUILL', 30, 91);

  const sx = mapW + 24;
  const sw = w - sx - 20;
  ctx.fillStyle = '#ffc14a';
  ctx.font = '900 19px sans-serif';
  ctx.fillText('WATERFRONT RESPECT', sx, 42);
  ctx.fillStyle = '#fff8ee';
  ctx.font = '900 21px sans-serif';
  ctx.fillText(s.respect.title.toUpperCase(), sx, 70);
  ctx.font = '700 15px sans-serif';
  ctx.fillStyle = '#ffe4ae';
  ctx.fillText(s.respect.rp.toLocaleString('en-US') + ' RP', sx, 94);

  const stats = [
    ['STORY JOBS', s.career.jobsDone + ' / ' + s.missions.length],
    ['CARS TAKEN', String(s.career.carsStolen)],
    ['HEAT ESCAPES', String(s.career.heatEscaped)],
    ['DISTANCE', s.career.distanceKm.toFixed(1) + ' KM'],
    ['RACE WINS', String(s.career.racesWon)],
    ['BEST SOLANO SPRINT', s.career.bestRace ? s.career.bestRace.toFixed(1) + 'S' : 'NO TIME'],
  ];
  let sy = 130;
  for (const [label, value] of stats) {
    ctx.fillStyle = '#9fb0b4';
    ctx.font = '800 11px sans-serif';
    ctx.fillText(label, sx, sy);
    ctx.fillStyle = '#fff8ee';
    ctx.font = '900 17px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value, sx + sw, sy);
    ctx.textAlign = 'left';
    sy += 38;
  }
  sy += 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + sw, sy);
  ctx.stroke();
  sy += 28;
  ctx.fillStyle = '#ffc14a';
  ctx.font = '900 17px sans-serif';
  ctx.fillText('STORY CHECKLIST', sx, sy);
  sy += 23;
  for (let i = 0; i < s.missions.length; i++) {
    const done = i < s.cleared;
    ctx.fillStyle = done ? '#8de0ad' : '#e5ddd0';
    ctx.font = '700 14px sans-serif';
    ctx.fillText((done ? '✓ ' : '○ ') + s.missions[i], sx, sy);
    sy += 22;
  }
  sy += 9;
  ctx.fillStyle = '#72d9d2';
  ctx.font = '900 17px sans-serif';
  ctx.fillText('DOCK CREW  ·  C CALLS NEXT FAVOR', sx, sy);
  sy += 23;
  for (const member of DOCK_CREW) {
    ctx.fillStyle = '#fff8ee';
    ctx.font = '800 14px sans-serif';
    ctx.fillText(member.name.toUpperCase() + '  /  ' + member.ability.toUpperCase(), sx, sy);
    sy += 22;
  }
  sy += 8;
  ctx.fillStyle = '#ffc14a';
  ctx.font = '900 17px sans-serif';
  ctx.fillText('SAVE SLOTS  ·  PAUSE TO WRITE', sx, sy);
  sy += 23;
  for (let i = 0; i < s.saveSlots.length; i++) {
    const save = s.saveSlots[i];
    ctx.fillStyle = save ? '#e5ddd0' : '#91a2a4';
    ctx.font = '700 13px sans-serif';
    const label = save
      ? 'SLOT ' + (i + 1) + '  ·  DAY ' + save.day + '  ·  ' + (save.district || 'PORT SOLANO') + '  ·  $' + Math.floor(save.cash)
      : 'SLOT ' + (i + 1) + '  ·  EMPTY';
    ctx.fillText(label, sx, sy);
    sy += 21;
  }
  ctx.fillStyle = '#ffd7b0';
  ctx.font = '700 12px sans-serif';
  const nextJob = s.mission;
  const jobLine = nextJob && nextJob.hasBlip ? 'NEXT JOB  ·  ' + nextJob.title : 'NEXT JOB  ·  PORT SOLANO FREE ROAM';
  ctx.fillText(jobLine.slice(0, 40), sx, h - 28);
}
