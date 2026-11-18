// Title, pause, controls, settings, and the save-slot card.

import { readSettings, writeSettings } from './save.js';

function clockText(sec) {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor(sec / 60) % 60;
  const hh = h < 10 ? '0' + h : '' + h;
  const mm = m < 10 ? '0' + m : '' + m;
  return hh + ':' + mm;
}

function money(n) {
  return '$' + String(Math.max(0, Math.floor(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function stars(n) {
  if (!n) return 'WANTED CLEAR';
  let s = '';
  for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
  return s;
}

function playedText(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  const mm = m < 10 ? '0' + m : '' + m;
  return h + 'h ' + mm + 'm';
}

function placeLine(save) {
  if (save.place === 'SAFEHOUSE') return 'Safehouse';
  if (save.place === 'AUTOSAVE') return 'Autosave after the job';
  return 'Manual save';
}

const CONTROLS = [
  'WASD move    SHIFT run    SPACE jump',
  'F enter or exit a car',
  'MOUSE look    LMB fire    RMB aim',
  '1–4 weapons    R reload    Q radio',
  'M world map    ESC pause',
  'Walk into the Coral Shore safehouse to save.',
  'A finished job writes an autosave.',
].join('<br>');

export function createMenus(root) {
  const settings = readSettings();
  root.innerHTML = [
    '<section id="boot" hidden>',
    '<div class="col">',
    '<div id="logo"><i>THE CORAL COAST</i>PORT SOLANO</div>',
    '<p id="tag">Six jobs along a sunset shore. Steal a car, lose the gulls, get paid.</p>',
    '<button type="button" id="new-game" class="mbtn">NEW GAME</button>',
    '<button type="button" id="continue" class="mbtn">CONTINUE</button>',
    '<button type="button" id="controls" class="mbtn">CONTROLS</button>',
    '<button type="button" id="settings" class="mbtn">SETTINGS</button>',
    '<div id="slot" class="panel"></div>',
    '</div></section>',
    '<section id="pause" hidden><div class="card panel">',
    '<div id="pause-kicker">PAUSED</div>',
    '<h2>PORT SOLANO</h2>',
    '<button type="button" id="resume" class="mbtn">RESUME</button>',
    '<button type="button" id="save-now" class="mbtn">SAVE GAME</button>',
    '<button type="button" id="open-map" class="mbtn">WORLD MAP</button>',
    '<button type="button" id="pause-controls" class="mbtn">CONTROLS</button>',
    '<button type="button" id="pause-settings" class="mbtn">SETTINGS</button>',
    '<button type="button" id="quit-title" class="mbtn">QUIT TO TITLE</button>',
    '</div></section>',
    '<section id="sheet" hidden><div class="card panel">',
    '<div id="sheet-kicker"></div><div id="sheet-body"></div>',
    '<button type="button" id="sheet-back" class="mbtn">BACK</button>',
    '</div></section>',
    '<section id="worldmap" hidden><canvas id="worldmap-canvas"></canvas></section>',
  ].join('');

  const boot = root.querySelector('#boot');
  const pause = root.querySelector('#pause');
  const sheet = root.querySelector('#sheet');
  const worldmap = root.querySelector('#worldmap');
  const slot = root.querySelector('#slot');
  const cont = root.querySelector('#continue');
  let backMode = 'title';

  const api = {
    mode: 'play',
    settings,
    preview: null,
    mapCanvas: root.querySelector('#worldmap-canvas'),
    onNew: null,
    onContinue: null,
    onSave: null,
    onQuit: null,
    onMix: null,
  };

  function hideAll() {
    boot.hidden = true;
    pause.hidden = true;
    sheet.hidden = true;
    worldmap.hidden = true;
  }

  function paintSlot(save) {
    api.preview = save;
    cont.disabled = !save;
    if (!save) {
      slot.innerHTML = '<b>SAVE SLOT</b><p>Empty</p><p>Coral Shore safehouse</p><p>New Game starts on the shore road.</p>';
      return;
    }
    const played = save.played ? '<p>PLAYED ' + playedText(save.played) + '</p>' : '';
    slot.innerHTML = '<b>SAVE SLOT · ' + (save.place || 'SAVE') + '</b>'
      + '<p>DAY ' + save.day + ' · ' + clockText(save.clock) + '</p>'
      + played
      + '<p>' + (save.district || 'Port Solano') + ' · ' + placeLine(save) + '</p>'
      + '<p>' + money(save.cash) + ' · ' + (save.missionTitle || '') + '</p>'
      + '<p>' + stars(save.stars) + '</p>';
  }

  function pushMix() {
    writeSettings(api.settings);
    if (api.onMix) api.onMix(api.settings);
  }

  api.showTitle = function showTitle(save) {
    hideAll();
    boot.hidden = false;
    api.mode = 'title';
    paintSlot(save);
  };
  api.showPlay = function showPlay() {
    hideAll();
    api.mode = 'play';
  };
  api.showPause = function showPause() {
    hideAll();
    pause.hidden = false;
    api.mode = 'pause';
  };
  api.showMap = function showMap() {
    hideAll();
    worldmap.hidden = false;
    api.mode = 'map';
  };
  api.setSlot = paintSlot;

  function openSheet(kind, from) {
    backMode = from;
    hideAll();
    sheet.hidden = false;
    api.mode = 'sheet';
    const kicker = root.querySelector('#sheet-kicker');
    const body = root.querySelector('#sheet-body');
    if (kind === 'controls') {
      kicker.textContent = 'CONTROLS';
      body.innerHTML = '<p class="help">' + CONTROLS + '</p>';
      return;
    }
    kicker.textContent = 'SETTINGS';
    const vol = Math.round(api.settings.volume * 100);
    const music = Math.round(api.settings.music * 100);
    const sens = Math.round(api.settings.sens * 100);
    body.innerHTML = '<label>MASTER <input id="vol" type="range" min="0" max="100" value="' + vol + '"></label>'
      + '<label>RADIO <input id="music" type="range" min="0" max="100" value="' + music + '"></label>'
      + '<label>LOOK <input id="sens" type="range" min="45" max="180" value="' + sens + '"></label>';
    body.querySelector('#vol').addEventListener('input', (e) => {
      api.settings.volume = Number(e.target.value) / 100;
      pushMix();
    });
    body.querySelector('#music').addEventListener('input', (e) => {
      api.settings.music = Number(e.target.value) / 100;
      pushMix();
    });
    body.querySelector('#sens').addEventListener('input', (e) => {
      api.settings.sens = Number(e.target.value) / 100;
      pushMix();
    });
  }

  function goBack() {
    if (backMode === 'pause') api.showPause();
    else api.showTitle(api.preview);
  }

  root.addEventListener('pointerdown', () => { if (api.onUnlock) api.onUnlock(); });
  root.querySelector('#new-game').onclick = () => { if (api.onNew) api.onNew(); };
  cont.onclick = () => { if (api.preview && api.onContinue) api.onContinue(api.preview); };
  root.querySelector('#controls').onclick = () => openSheet('controls', 'title');
  root.querySelector('#settings').onclick = () => openSheet('settings', 'title');
  root.querySelector('#resume').onclick = () => api.showPlay();
  root.querySelector('#save-now').onclick = () => { if (api.onSave) api.onSave(); };
  root.querySelector('#open-map').onclick = () => api.showMap();
  root.querySelector('#pause-controls').onclick = () => openSheet('controls', 'pause');
  root.querySelector('#pause-settings').onclick = () => openSheet('settings', 'pause');
  root.querySelector('#quit-title').onclick = () => { if (api.onQuit) api.onQuit(); };
  root.querySelector('#sheet-back').onclick = goBack;
  return api;
}
