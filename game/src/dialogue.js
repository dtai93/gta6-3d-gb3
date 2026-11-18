// Original cast and canvas portraits. No borrowed faces or names.

export const CAST = {
  rafa: { name: 'Rafa Quill', skin: '#d9a27a', hair: '#1b140f', shirt: '#d4543c', bg: '#3a241c', extra: 'stubble' },
  nia: { name: 'Nia Voss', skin: '#c6865a', hair: '#141414', shirt: '#1aa6a6', bg: '#102428', extra: 'bob' },
  mateo: { name: 'Mateo Sol', skin: '#e0b07a', hair: '#3a2414', shirt: '#3d6b3a', bg: '#24301c', extra: 'cap' },
  cleo: { name: 'Cleo Marsh', skin: '#e8b89a', hair: '#e23e8c', shirt: '#2a2340', bg: '#301828', extra: 'shades' },
  jun: { name: 'Jun Park', skin: '#f0c9a0', hair: '#1a1a1a', shirt: '#f2f2f2', bg: '#241828', extra: 'streak' },
  inez: { name: 'Inez Calder', skin: '#c48a62', hair: '#d9d4ce', shirt: '#6e2430', bg: '#2a1818', extra: 'bun' },
  lalo: { name: 'Lalo Brine', skin: '#e6c8a8', hair: '#6a6e74', shirt: '#efe6d4', bg: '#1c1e24', extra: 'slick' },
};

export function paintPortrait(canvas, id) {
  const who = CAST[id] || CAST.rafa;
  const g = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  g.fillStyle = who.bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = who.shirt;
  g.beginPath();
  g.ellipse(w * 0.5, h * 1.02, w * 0.42, h * 0.32, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = who.skin;
  g.fillRect(w * 0.42, h * 0.62, w * 0.16, h * 0.16);
  g.beginPath();
  g.ellipse(w * 0.5, h * 0.46, w * 0.22, h * 0.26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = who.hair;
  if (who.extra === 'cap') {
    g.fillRect(w * 0.26, h * 0.2, w * 0.48, h * 0.16);
    g.fillRect(w * 0.2, h * 0.32, w * 0.6, h * 0.06);
  } else if (who.extra === 'bun') {
    g.beginPath();
    g.arc(w * 0.5, h * 0.18, w * 0.1, 0, Math.PI * 2);
    g.fill();
    g.fillRect(w * 0.28, h * 0.24, w * 0.44, h * 0.16);
  } else {
    g.beginPath();
    g.ellipse(w * 0.5, h * 0.34, w * 0.26, h * 0.2, 0, Math.PI, 0);
    g.fill();
  }
  if (who.extra === 'streak') {
    g.fillStyle = '#ff4fa3';
    g.fillRect(w * 0.64, h * 0.26, w * 0.05, h * 0.22);
  }
  g.fillStyle = '#1a120e';
  if (who.extra === 'shades') {
    g.fillRect(w * 0.3, h * 0.42, w * 0.4, h * 0.08);
  } else {
    g.fillRect(w * 0.36, h * 0.44, w * 0.07, h * 0.04);
    g.fillRect(w * 0.56, h * 0.44, w * 0.07, h * 0.04);
  }
  if (who.extra === 'stubble') {
    g.fillStyle = 'rgba(40,24,16,0.35)';
    g.fillRect(w * 0.4, h * 0.56, w * 0.2, h * 0.06);
  }
  g.strokeStyle = '#6e3040';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(w * 0.5, h * 0.58, w * 0.06, 0.2, Math.PI - 0.2);
  g.stroke();
  if (who.extra === 'bob') {
    g.fillStyle = '#e6b13a';
    g.beginPath();
    g.arc(w * 0.76, h * 0.5, w * 0.035, 0, Math.PI * 2);
    g.fill();
  }
}

export function createDialogue() {
  return { who: '', name: '', text: '', timer: 0 };
}

export function say(dialogue, who, text, seconds) {
  const c = CAST[who] || CAST.rafa;
  dialogue.who = who;
  dialogue.name = c.name;
  dialogue.text = text;
  dialogue.timer = seconds || 4;
}

export function updateDialogue(dialogue, dt) {
  if (dialogue.timer <= 0) return;
  dialogue.timer -= dt;
  if (dialogue.timer <= 0) {
    dialogue.timer = 0;
    dialogue.text = '';
    dialogue.who = '';
  }
}
