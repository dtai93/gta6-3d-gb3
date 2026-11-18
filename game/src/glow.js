// Soft round glow sprites for headlights, light bars, lamps, and the sun disc.

import * as THREE from '../vendor/three.module.min.js';

let tex = null;

export function glowTexture() {
  if (tex) return tex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.28, 'rgba(255,255,255,0.7)');
  grd.addColorStop(0.62, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function addGlow(parent, x, y, z, color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  sprite.position.set(x, y, z);
  sprite.scale.set(size, size, 1);
  parent.add(sprite);
  return sprite;
}
