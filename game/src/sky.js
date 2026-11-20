// Sunset sky dome (vertex colours), warm fog, and one shadow-casting sun.
// updateSkyHour keeps 17:00–19:30 on this sunset. Night and noon blend away from it.

import * as THREE from '../vendor/three.module.min.js';
import { addGlow } from './glow.js';

const HORIZON = new THREE.Color(0xffd27a);
const MID = new THREE.Color(0xf06496);
const ZENITH = new THREE.Color(0x351a78);
const GROUND = new THREE.Color(0x4e2a58);
const SUN_COLOR = new THREE.Color(0xffd7a0);

const NIGHT = {
  h: new THREE.Color(0x24365c), m: new THREE.Color(0x12182e), z: new THREE.Color(0x070b16),
  g: new THREE.Color(0x141820), sun: 0x9bb4ff, sunI: 0.32, hemi: 0x7a88c4, hemiI: 0.5, ground: 0x1a120e,
  fog: 0x12182a,
};
const DAY = {
  h: new THREE.Color(0x9fd4f2), m: new THREE.Color(0x5aa6e4), z: new THREE.Color(0x2458a8),
  g: new THREE.Color(0xcbb892), sun: 0xfff4e0, sunI: 1.45, hemi: 0xffe6c8, hemiI: 0.72, ground: 0x6a88b0,
  fog: 0xa8cfe6,
};
const SET = {
  h: HORIZON, m: MID, z: ZENITH, g: GROUND,
  sun: 0xffd7a0, sunI: 1.7, hemi: 0xffc2b0, hemiI: 0.58, ground: 0x5a6a88,
  fog: 0xc46e96,
};

const tmp = new THREE.Color();
const mixH = new THREE.Color();
const mixM = new THREE.Color();
const mixZ = new THREE.Color();
const mixG = new THREE.Color();

function lerpColor(a, b, t, out) {
  out.copy(a).lerp(b, t);
  return out;
}

function paintDome(dome, horizon, mid, zenith, ground) {
  const pos = dome.geometry.attributes.position;
  const colors = dome.geometry.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 900;
    if (y < 0) lerpColor(ground, horizon, (y + 1) * 0.85, tmp);
    else if (y < 0.16) lerpColor(horizon, mid, y / 0.16, tmp);
    else lerpColor(mid, zenith, Math.min(1, (y - 0.16) / 0.48), tmp);
    colors.setXYZ(i, tmp.r, tmp.g, tmp.b);
  }
  colors.needsUpdate = true;
}

function mixPal(a, b, t) {
  mixH.copy(a.h).lerp(b.h, t);
  mixM.copy(a.m).lerp(b.m, t);
  mixZ.copy(a.z).lerp(b.z, t);
  mixG.copy(a.g).lerp(b.g, t);
  return {
    h: mixH, m: mixM, z: mixZ, g: mixG,
    sun: tmp.copy(new THREE.Color(a.sun)).lerp(new THREE.Color(b.sun), t).getHex(),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
    hemi: new THREE.Color(a.hemi).lerp(new THREE.Color(b.hemi), t).getHex(),
    ground: new THREE.Color(a.ground).lerp(new THREE.Color(b.ground), t).getHex(),
    fog: new THREE.Color(a.fog).lerp(new THREE.Color(b.fog), t).getHex(),
  };
}

export function createSky(scene, fog) {
  const near = fog?.near ?? 50;
  const far = fog?.far ?? 380;
  scene.fog = new THREE.Fog(0xc46e96, near, far);
  scene.background = HORIZON.clone();

  const geo = new THREE.SphereGeometry(900, 28, 18);
  const pos = geo.attributes.position;
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
  const dome = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);
  paintDome(dome, HORIZON, MID, ZENITH, GROUND);

  const hemi = new THREE.HemisphereLight(0xffc2b0, 0x5a6a88, 0.58);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(SUN_COLOR, 1.62);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.04;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 280;
  scene.add(sun);
  scene.add(sun.target);

  const anchor = new THREE.Vector3();
  const sunOffset = new THREE.Vector3(52, 40, -58);
  const sunDir = new THREE.Vector3();
  const glare = addGlow(scene, 0, 80, 0, 0xffc15a, 78);
  const halo = addGlow(scene, 0, 80, 0, 0xff6aa4, 150);
  glare.material.opacity = 0.9;
  halo.material.opacity = 0.36;

  return {
    dome, sun, hemi, scene, sunOffset, glare, halo, sunDir,
    follow(target, span) {
      anchor.copy(target);
      sun.target.position.copy(anchor);
      sun.position.copy(anchor).add(sunOffset);
      sunDir.copy(sunOffset).normalize();
      glare.position.copy(anchor).addScaledVector(sunDir, 280);
      halo.position.copy(glare.position);
      const s = Math.max(18, Math.min(120, span || 40));
      const cam = sun.shadow.camera;
      cam.left = -s;
      cam.right = s;
      cam.top = s;
      cam.bottom = -s;
      cam.updateProjectionMatrix();
      dome.position.copy(anchor);
    },
  };
}

function applyPalette(sky, pal) {
  paintDome(sky.dome, pal.h, pal.m, pal.z, pal.g);
  sky.scene.background.copy(pal.h);
  sky.scene.fog.color.setHex(pal.fog);
  sky.sun.color.setHex(pal.sun);
  sky.sun.intensity = pal.sunI;
  sky.hemi.color.setHex(pal.hemi);
  sky.hemi.groundColor.setHex(pal.ground);
  sky.hemi.intensity = pal.hemiI;
}

export function updateSkyHour(sky, hour, ferryWindow = false) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 17 && h < 19.5) {
    applyPalette(sky, SET);
    if (ferryWindow) sky.hemi.intensity += 0.04;
    sky.sunOffset.set(52, 40, -58);
    sky.glare.material.opacity = 0.9;
    sky.halo.material.opacity = 0.36;
    return;
  }
  let pal;
  if (h >= 19.5 && h < 22) pal = mixPal(SET, NIGHT, (h - 19.5) / 2.5);
  else if (h >= 22 || h < 5) pal = NIGHT;
  else if (h >= 5 && h < 7) pal = mixPal(NIGHT, DAY, (h - 5) / 2);
  else if (h >= 16 && h < 17) pal = mixPal(DAY, SET, h - 16);
  else pal = DAY;
  applyPalette(sky, pal);
  if (ferryWindow) sky.hemi.intensity += 0.04;
  const night = h >= 20 || h < 5.5;
  sky.sunOffset.set(night ? -48 : 52, night ? 14 : 40, night ? -28 : -58);
  sky.glare.material.opacity = night ? 0.04 : 0.4;
  sky.halo.material.opacity = night ? 0.02 : 0.16;
}
