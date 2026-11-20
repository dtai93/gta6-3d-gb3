// Keyboard axes plus pointer-lock mouse. sample() returns one frame and clears mouse deltas.

const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];

function held(keys, names) {
  for (let i = 0; i < names.length; i++) if (keys.has(names[i])) return true;
  return false;
}

export function createInput(dom) {
  const keys = new Set();
  const edges = new Set();
  const buttons = new Set();
  const mouse = { dx: 0, dy: 0, locked: false };

  function down(e) {
    if (!keys.has(e.code)) edges.add(e.code);
    keys.add(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  }
  function up(e) { keys.delete(e.code); }
  function mouseDown(e) {
    if (!buttons.has(e.button)) {
      if (e.button === 0) edges.add('Mouse0');
      if (e.button === 2) edges.add('Mouse2');
    }
    buttons.add(e.button);
  }
  function mouseUp(e) { buttons.delete(e.button); }
  function move(e) {
    if (document.pointerLockElement !== dom) return;
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
  }
  function lockChange() {
    mouse.locked = document.pointerLockElement === dom;
  }
  function requestLock() {
    if (document.pointerLockElement !== dom && dom.requestPointerLock) dom.requestPointerLock();
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousemove', move);
  window.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  document.addEventListener('pointerlockchange', lockChange);
  dom.addEventListener('click', requestLock);
  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    get locked() { return mouse.locked; },
    release() {
      if (document.exitPointerLock) document.exitPointerLock();
    },
    sample() {
      const forward = (held(keys, FORWARD) ? 1 : 0) - (held(keys, BACK) ? 1 : 0);
      const strafe = (held(keys, RIGHT) ? 1 : 0) - (held(keys, LEFT) ? 1 : 0);
      const frame = {
        forward,
        strafe,
        run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        jump: keys.has('Space'),
        use: edges.has('KeyF'),
        fire: buttons.has(0),
        fireEdge: edges.has('Mouse0'),
        aim: buttons.has(2),
        reload: edges.has('KeyR'),
        slot: edges.has('Digit1') ? 1 : edges.has('Digit2') ? 2 : edges.has('Digit3') ? 3 : edges.has('Digit4') ? 4 : 0,
        radio: edges.has('KeyQ'),
        pause: edges.has('Escape'),
        map: edges.has('KeyM'),
        crew: edges.has('KeyC'),
        race: edges.has('KeyX'),
        garage: edges.has('KeyG'),
        yaw: mouse.dx,
        pitch: mouse.dy,
      };
      mouse.dx = 0;
      mouse.dy = 0;
      edges.clear();
      return frame;
    },
  };
}
