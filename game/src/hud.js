// DOM overlay: mission, wanted, cash, clock, police, minimap, vitals, radio, dialogue.
import { GRID_X, GRID_Z, SPAN } from './config.js';
import { paintPortrait } from './dialogue.js';

const RANGE = 42;

function money(n) {
  const v = Math.max(0, Math.floor(n));
  return '$' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clockText(day, sec) {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor(sec / 60) % 60;
  const hh = h < 10 ? '0' + h : '' + h;
  const mm = m < 10 ? '0' + m : '' + m;
  return 'DAY ' + day + ' · ' + hh + ':' + mm;
}

function el(root, id) {
  return root.querySelector('#' + id);
}

export function createHud(root) {
  const weapons = el(root, 'weapons');
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const node = document.createElement('div');
    node.className = 'slot';
    node.innerHTML = '<span></span><b></b>';
    weapons.appendChild(node);
    slots.push(node);
  }
  return {
    root,
    slots,
    lastWho: '',
    missionKicker: el(root, 'mission-kicker'),
    missionTitle: el(root, 'mission-title'),
    missionText: el(root, 'mission-text'),
    missionFill: el(root, 'mission-fill'),
    missionNext: el(root, 'mission-next'),
    stars: el(root, 'stars'),
    insight: el(root, 'insight'),
    cash: el(root, 'cash'),
    cashPop: el(root, 'cashpop'),
    clock: el(root, 'clock'),
    units: el(root, 'units'),
    notice: el(root, 'notice'),
    hp: el(root, 'hp').querySelector('b'),
    ar: el(root, 'ar').querySelector('b'),
    talk: el(root, 'talk'),
    portrait: el(root, 'portrait'),
    speaker: el(root, 'speaker'),
    line: el(root, 'line'),
    radioStation: el(root, 'radio-station'),
    radioTrack: el(root, 'radio-track'),
    map: el(root, 'minimap'),
    district: el(root, 'district'),
    speed: el(root, 'speed'),
    veh: el(root, 'veh-name'),
    cond: el(root, 'cond').querySelector('b'),
    cross: el(root, 'crosshair'),
    wheel: el(root, 'wheel'),
    complete: el(root, 'complete'),
    doneTitle: el(root, 'done-title'),
    doneCash: el(root, 'done-cash'),
  };
}

function drawMap(canvas, s) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const px = s.x;
  const pz = s.z;
  function P(x, z) {
    return [w / 2 + ((x - px) / RANGE) * (w / 2), h / 2 - ((z - pz) / RANGE) * (h / 2)];
  }
  ctx.fillStyle = '#1a3c34';
  ctx.fillRect(0, 0, w, h);
  const shore = P(px, 0);
  ctx.fillStyle = '#1c7f96';
  ctx.fillRect(0, shore[1], w, h);
  ctx.strokeStyle = '#c8bfae';
  ctx.lineWidth = 14;
  ctx.lineCap = 'square';
  const maxX = GRID_X * SPAN;
  const maxZ = GRID_Z * SPAN;
  for (let i = 0; i <= GRID_X; i++) {
    const a = P(i * SPAN, 0);
    const b = P(i * SPAN, maxZ);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (let j = 0; j <= GRID_Z; j++) {
    const a = P(0, j * SPAN);
    const b = P(maxX, j * SPAN);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  const job = s.mission;
  if (job && job.hasBlip) {
    const p = P(job.x, job.z);
    ctx.fillStyle = '#ffc14a';
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const cops = s.police || [];
  for (let i = 0; i < cops.length; i++) {
    const p = P(cops[i].x, cops[i].z);
    ctx.beginPath();
    ctx.fillStyle = cops[i].kind === 'air' ? '#8fd4ff' : '#ff3b3b';
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 3;
    if (cops[i].kind === 'air') {
      ctx.moveTo(p[0], p[1] - 12);
      ctx.lineTo(p[0] + 11, p[1]);
      ctx.lineTo(p[0], p[1] + 12);
      ctx.lineTo(p[0] - 11, p[1]);
    } else {
      ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI + (s.yaw || 0));
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7, 9);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function updateHud(hud, s) {
  const job = s.mission;
  hud.missionKicker.textContent = job.kicker;
  hud.missionTitle.textContent = job.title;
  hud.missionText.textContent = job.text;
  hud.missionFill.style.width = Math.round(Math.max(0, Math.min(1, job.progress)) * 100) + '%';
  hud.missionNext.innerHTML = '<b>NEXT</b>  ' + job.next;
  let stars = '';
  if (s.down === 'wasted') stars = 'WASTED';
  else if (s.down === 'busted') stars = 'BUSTED';
  else {
    for (let i = 0; i < 5; i++) stars += i < s.stars ? '★' : '☆';
  }
  hud.stars.textContent = stars;
  hud.stars.style.textShadow = s.stars > 0
    ? '0 2px 5px rgba(24,10,16,0.85), 0 0 10px rgba(255,193,74,0.28)'
    : '0 1px 3px rgba(0,0,0,0.8)';
  hud.insight.hidden = !(s.inSight && s.stars > 0 && s.down !== 'wasted' && s.down !== 'busted');
  hud.cash.textContent = money(s.cash);
  if (s.cashPop > 0) {
    hud.cashPop.hidden = false;
    hud.cashPop.textContent = '+$' + String(Math.round(s.cashPop)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else hud.cashPop.hidden = true;
  hud.clock.textContent = clockText(s.day, s.clock);
  const rows = s.police || [];
  if (!rows.length) hud.units.textContent = 'NO UNITS IN RANGE';
  else {
    let html = '';
    const n = Math.min(4, rows.length);
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const role = r.role === 'chase' ? 'CHASE' : r.role === 'ram' ? 'RAMMING' : r.role === 'roadblock' ? 'ROADBLOCK' : r.role === 'air' ? 'SPOTLIGHT' : r.role;
      const chip = role === 'CHASE' ? 'chase' : role === 'RAMMING' ? 'ram' : role === 'ROADBLOCK' ? 'block' : role === 'SPOTLIGHT' ? 'air' : 'other';
      html += '<div class="unit"><span>' + r.callsign + '</span><i class="role-' + chip + '">' + role + '</i><span>' + Math.round(r.dist) + 'm</span></div>';
    }
    hud.units.innerHTML = html;
  }
  hud.notice.hidden = !s.notice;
  if (s.notice) hud.notice.textContent = s.notice;
  hud.hp.style.width = Math.max(0, Math.min(100, s.health)) + '%';
  hud.ar.style.width = Math.max(0, Math.min(100, s.armour)) + '%';
  const loadout = s.loadout;
  for (let i = 0; i < hud.slots.length; i++) {
    const slot = loadout.slots[i];
    const node = hud.slots[i];
    node.className = i === loadout.index ? 'slot on' : 'slot';
    node.querySelector('span').textContent = (i + 1) + '  ' + slot.name.toUpperCase();
    node.querySelector('b').textContent = slot.mag ? slot.rounds + '/' + slot.reserve : '—';
  }
  const line = s.dialogue;
  hud.talk.hidden = !line.text;
  if (line.text) {
    hud.speaker.textContent = line.name.toUpperCase();
    hud.line.textContent = line.text;
    if (hud.lastWho !== line.who) {
      paintPortrait(hud.portrait, line.who);
      hud.lastWho = line.who;
    }
  }
  hud.radioStation.textContent = s.radio.station;
  hud.radioTrack.textContent = s.radio.track;
  hud.district.textContent = (s.district || '').toUpperCase();
  if (s.driven) {
    const kmh = Math.round(Math.abs(s.driven.speed) * 3.6);
    hud.speed.innerHTML = kmh + '<small> KM/H</small>';
    hud.veh.textContent = s.driven.type.name.toUpperCase();
    const cond = Math.max(0, Math.min(1, s.driven.condition));
    hud.cond.style.width = Math.round(cond * 100) + '%';
    hud.cond.style.background = cond > 0.55 ? '#7dff6a' : cond > 0.28 ? '#ffc14a' : '#ff4d5a';
  } else {
    hud.speed.innerHTML = '0<small> KM/H</small>';
    hud.veh.textContent = 'ON FOOT';
    hud.cond.style.width = '100%';
    hud.cond.style.background = '#7dff6a';
  }
  drawMap(hud.map, s);
  hud.cross.style.display = s.crosshair ? 'block' : 'none';
  if (hud.wheel) {
    hud.wheel.hidden = !s.wheel;
    const segs = hud.wheel.querySelectorAll('.wseg');
    for (let i = 0; i < segs.length; i++) segs[i].className = 'wseg s' + i + (i === loadout.index ? ' on' : '');
  }
  if (s.banner) {
    hud.complete.hidden = false;
    hud.doneTitle.textContent = s.banner;
    hud.doneCash.textContent = '+$' + s.bannerCash.toLocaleString('en-US');
  } else hud.complete.hidden = true;
}
