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
  const mouse = { dx: 0, dy: 0, locked: false };

  function down(e) {
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  }
  function up(e) { keys.delete(e.code); }
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
  document.addEventListener('pointerlockchange', lockChange);
  dom.addEventListener('click', requestLock);

  return {
    get locked() { return mouse.locked; },
    sample() {
      const forward = (held(keys, FORWARD) ? 1 : 0) - (held(keys, BACK) ? 1 : 0);
      const strafe = (held(keys, RIGHT) ? 1 : 0) - (held(keys, LEFT) ? 1 : 0);
      const frame = {
        forward,
        strafe,
        run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        jump: keys.has('Space'),
        yaw: mouse.dx,
        pitch: mouse.dy,
      };
      mouse.dx = 0;
      mouse.dy = 0;
      return frame;
    },
  };
}
