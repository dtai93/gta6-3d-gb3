// Title, pause, controls, settings, and the save-slot card.

import { SAVE_SLOTS, readSaves, readSettings, writeSettings } from './save.js';

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
  'C call the next dock-crew favor',
  'X start Solano Sprint at the Old Harbor line',
  'G open Dock Works at Industrial Docks',
  'Walk into the Coral Shore safehouse to save.',
  'A finished job writes an autosave.',
].join('<br>');

export function createMenus(root) {
  const settings = readSettings();
  root.innerHTML = [
    '<section id="boot" hidden>',
    '<div class="col">',
    '<div id="logo"><i>THE CORAL COAST</i>PORT SOLANO</div>',
    '<p id="tag">Six story jobs, dockside races and favors along a sunset shore. Earn your name on the waterfront.</p>',
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
    '<section id="garage" hidden><div class="card panel">',
    '<div id="garage-kicker" class="help">INDUSTRIAL DOCKS · SERVICE STALL</div>',
    '<h2>DOCK WORKS</h2><p id="garage-car"></p>',
    '<div id="garage-list"></div>',
    '<button type="button" id="garage-close" class="mbtn">LEAVE STALL</button>',
    '</div></section>',
  ].join('');

  const boot = root.querySelector('#boot');
  const pause = root.querySelector('#pause');
  const sheet = root.querySelector('#sheet');
  const worldmap = root.querySelector('#worldmap');
  const garage = root.querySelector('#garage');
  const slot = root.querySelector('#slot');
  const cont = root.querySelector('#continue');
  const garageList = root.querySelector('#garage-list');
  let backMode = 'title';
  let selectedSlot = 0;

  const api = {
    mode: 'play',
    settings,
    preview: null,
    saves: readSaves(),
    selectedSlot: 0,
    mapCanvas: root.querySelector('#worldmap-canvas'),
    onNew: null,
    onContinue: null,
    onSave: null,
    onQuit: null,
    onMix: null,
    onGarageAction: null,
  };

  function hideAll() {
    boot.hidden = true;
    pause.hidden = true;
    sheet.hidden = true;
    worldmap.hidden = true;
    garage.hidden = true;
  }

  function paintSlot(saves) {
    api.saves = Array.isArray(saves) ? saves.slice(0, SAVE_SLOTS) : [saves || null];
    while (api.saves.length < SAVE_SLOTS) api.saves.push(null);
    selectedSlot = Math.max(0, Math.min(SAVE_SLOTS - 1, selectedSlot));
    api.selectedSlot = selectedSlot;
    api.preview = api.saves[selectedSlot];
    cont.disabled = !api.preview;
    slot.innerHTML = '<b>PORT SOLANO SAVES · SLOT ' + (selectedSlot + 1) + '</b><div class="save-slots">'
      + api.saves.map((save, i) => '<button type="button" class="slot-choice' + (i === selectedSlot ? ' selected' : '') + '" data-slot="' + i + '">'
        + '<b>SLOT ' + (i + 1) + '</b><span>' + (save
          ? 'DAY ' + save.day + ' · ' + (save.district || 'Port Solano') + '<br>' + money(save.cash) + ' · ' + (save.missionTitle || 'Free roam')
          : 'EMPTY · NEW SHORE RUN') + '</span></button>').join('')
      + '</div>';
    for (const choice of slot.querySelectorAll('.slot-choice')) {
      choice.onclick = () => {
        selectedSlot = Number(choice.dataset.slot);
        paintSlot(api.saves);
      };
    }
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
  api.showGarage = function showGarage(carName) {
    hideAll();
    garage.hidden = false;
    api.mode = 'garage';
    root.querySelector('#garage-car').textContent = carName
      ? 'CURRENT VEHICLE · ' + carName.toUpperCase() + ' · CHARGES COME FROM CASH'
      : 'NO VEHICLE IN THE BAY · BRING A CAR TO BUY SERVICE';
  };
  api.closeGarage = api.showPlay;
  api.setSlot = function setSlot(save) {
    const updated = api.saves.slice();
    updated[selectedSlot] = save;
    paintSlot(updated);
  };

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
    else api.showTitle(api.saves);
  }

  root.addEventListener('pointerdown', () => { if (api.onUnlock) api.onUnlock(); });
  root.querySelector('#new-game').onclick = () => { if (api.onNew) api.onNew(); };
  cont.onclick = () => { if (api.preview && api.onContinue) api.onContinue(api.preview); };
  root.querySelector('#controls').onclick = () => openSheet('controls', 'title');
  root.querySelector('#settings').onclick = () => openSheet('settings', 'title');
  root.querySelector('#resume').onclick = () => api.showPlay();
  root.querySelector('#save-now').onclick = () => { if (api.onSave) api.onSave(); };
  root.querySelector('#open-map').textContent = 'MAP + STATS';
  root.querySelector('#open-map').onclick = () => api.showMap();
  root.querySelector('#pause-controls').onclick = () => openSheet('controls', 'pause');
  root.querySelector('#pause-settings').onclick = () => openSheet('settings', 'pause');
  root.querySelector('#quit-title').onclick = () => { if (api.onQuit) api.onQuit(); };
  root.querySelector('#sheet-back').onclick = goBack;
  root.querySelector('#garage-close').onclick = () => api.closeGarage();
  garageList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-service]');
    if (button && api.onGarageAction) api.onGarageAction(button.dataset.service);
  });
  api.setGarageServices = function setGarageServices(services, carName) {
    if (carName) root.querySelector('#garage-car').textContent = 'CURRENT VEHICLE · ' + carName.toUpperCase() + ' · CASH $' + money(services.cash);
    garageList.innerHTML = services.items.map((service) => '<button type="button" class="mbtn" data-service="' + service.id + '">'
      + service.title.toUpperCase() + '<br><small>' + service.detail + ' · $' + service.cost + '</small></button>').join('');
  };
  return api;
}
