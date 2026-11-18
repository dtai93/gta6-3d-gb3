// Sunset sky dome (vertex colours), warm fog, and one shadow-casting sun.
// updateSkyHour keeps 17:00–19:30 on this sunset. Night and noon blend away from it.

import * as THREE from '../vendor/three.module.min.js';

const HORIZON = new THREE.Color(0xf4a06a);
const MID = new THREE.Color(0xe36a58);
const ZENITH = new THREE.Color(0x243e78);
const GROUND = new THREE.Color(0xc47a48);
const SUN_COLOR = new THREE.Color(0xfff0d0);

const NIGHT = {
  h: new THREE.Color(0x24365c), m: new THREE.Color(0x12182e), z: new THREE.Color(0x070b16),
  g: new THREE.Color(0x141820), sun: 0x9bb4ff, sunI: 0.32, hemi: 0x7a88c4, hemiI: 0.5, ground: 0x1a120e,
};
const DAY = {
  h: new THREE.Color(0x9fd4f2), m: new THREE.Color(0x5aa6e4), z: new THREE.Color(0x2458a8),
  g: new THREE.Color(0xcbb892), sun: 0xfff4e0, sunI: 1.55, hemi: 0xffe0c4, hemiI: 1.05, ground: 0x8a7048,
};
const SET = {
  h: HORIZON, m: MID, z: ZENITH, g: GROUND,
  sun: 0xfff0d0, sunI: 1.45, hemi: 0xffc8a4, hemiI: 0.9, ground: 0x5a5048,
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
    else if (y < 0.18) lerpColor(horizon, mid, y / 0.18, tmp);
    else lerpColor(mid, zenith, Math.min(1, (y - 0.18) / 0.7), tmp);
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
  };
}

export function createSky(scene, fog) {
  const near = fog?.near ?? 50;
  const far = fog?.far ?? 380;
  scene.fog = new THREE.Fog(HORIZON.getHex(), near, far);
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

  const hemi = new THREE.HemisphereLight(0xffc8a4, 0x5a5048, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(SUN_COLOR, 1.45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.04;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 280;
  scene.add(sun);
  scene.add(sun.target);

  const anchor = new THREE.Vector3();
  const sunOffset = new THREE.Vector3(-70, 36, -28);

  return {
    dome, sun, hemi, scene, sunOffset,
    follow(target, span) {
      anchor.copy(target);
      sun.target.position.copy(anchor);
      sun.position.copy(anchor).add(sunOffset);
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
  sky.scene.fog.color.copy(pal.h);
  sky.sun.color.setHex(pal.sun);
  sky.sun.intensity = pal.sunI;
  sky.hemi.color.setHex(pal.hemi);
  sky.hemi.groundColor.setHex(pal.ground);
  sky.hemi.intensity = pal.hemiI;
}

export function updateSkyHour(sky, hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 17 && h < 19.5) {
    applyPalette(sky, SET);
    sky.sunOffset.set(-70, 36, -28);
    return;
  }
  let pal;
  if (h >= 19.5 && h < 22) pal = mixPal(SET, NIGHT, (h - 19.5) / 2.5);
  else if (h >= 22 || h < 5) pal = NIGHT;
  else if (h >= 5 && h < 7) pal = mixPal(NIGHT, DAY, (h - 5) / 2);
  else if (h >= 16 && h < 17) pal = mixPal(DAY, SET, h - 16);
  else pal = DAY;
  applyPalette(sky, pal);
  const night = h >= 20 || h < 5.5;
  sky.sunOffset.set(night ? -48 : -70, night ? 14 : 36, -28);
}
