// Sunset sky dome (vertex colours), warm fog, and one shadow-casting sun.

import * as THREE from '../vendor/three.module.min.js';

const HORIZON = new THREE.Color(0xf4a06a);
const MID = new THREE.Color(0xe36a58);
const ZENITH = new THREE.Color(0x243e78);
const GROUND = new THREE.Color(0xc47a48);
const SUN_COLOR = new THREE.Color(0xfff0d0);

function lerpColor(a, b, t, out) {
  out.copy(a).lerp(b, t);
  return out;
}

export function createSky(scene, fog) {
  const near = fog?.near ?? 50;
  const far = fog?.far ?? 380;
  scene.fog = new THREE.Fog(HORIZON.getHex(), near, far);
  scene.background = HORIZON.clone();

  const geo = new THREE.SphereGeometry(900, 28, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 900;
    if (y < 0) lerpColor(GROUND, HORIZON, (y + 1) * 0.85, tmp);
    else if (y < 0.18) lerpColor(HORIZON, MID, y / 0.18, tmp);
    else lerpColor(MID, ZENITH, Math.min(1, (y - 0.18) / 0.7), tmp);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);

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
  // Sun sits low in the west. Offset is in world space from the camera target.
  const sunOffset = new THREE.Vector3(-70, 36, -28);

  return {
    dome,
    sun,
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
