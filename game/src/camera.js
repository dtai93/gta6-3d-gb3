// Third-person chase camera. One yaw/pitch places the camera; movement reads that camera.
// Local camera forward is -Z. Yaw 0 looks toward world -Z. Pitch > 0 raises the camera.

import * as THREE from '../vendor/three.module.min.js';
import { CAM } from './config.js';

const UP = new THREE.Vector3(0, 1, 0);
const fwdScratch = new THREE.Vector3();
const rightScratch = new THREE.Vector3();

// Valid only until the next planarBasis call. Copy the components before calling again.
export function planarBasis(camera) {
  camera.getWorldDirection(fwdScratch);
  fwdScratch.y = 0;
  if (fwdScratch.lengthSq() < 1e-8) fwdScratch.set(0, 0, -1);
  else fwdScratch.normalize();
  rightScratch.crossVectors(fwdScratch, UP);
  return { fwd: fwdScratch, right: rightScratch };
}

export function createChaseCamera() {
  return {
    yaw: 0.4,
    pitch: CAM.pitch,
    dist: CAM.dist,
    lookY: CAM.lookY,
    frozen: false,
    shake: 0,
    shakeT: 0,
  };
}

export function addCameraShake(rig, amount) {
  rig.shake = Math.min(0.85, rig.shake + amount);
}

export function updateChaseCamera(camera, rig, focus) {
  const pitch = Math.max(CAM.minPitch, Math.min(CAM.maxPitch, rig.pitch));
  rig.pitch = pitch;
  const cy = Math.cos(pitch);
  const sy = Math.sin(pitch);
  // Horizontal look direction for this yaw. yaw 0 → (0, 0, -1).
  const lx = -Math.sin(rig.yaw);
  const lz = -Math.cos(rig.yaw);
  const back = rig.dist * cy;
  const lift = rig.dist * sy;
  const y = focus.y + lift;
  camera.position.set(focus.x - lx * back, y, focus.z - lz * back);
  camera.lookAt(focus.x, focus.y, focus.z);
  // Position-only kick. Rotation stays aimed at focus, so planarBasis does not wobble.
  if (rig.shake > 0.001) {
    rig.shakeT += 1;
    const s = rig.shake;
    const t = rig.shakeT;
    camera.position.x += Math.sin(t * 1.7) * s * 0.2;
    camera.position.y += Math.cos(t * 2.4) * s * 0.12;
    camera.position.z += Math.sin(t * 1.3) * s * 0.2;
    rig.shake *= 0.9;
  }
}

export function applyMouseLook(rig, sample) {
  if (rig.frozen) return;
  rig.yaw -= sample.yaw * CAM.yawSpeed;
  rig.pitch -= sample.pitch * CAM.pitchSpeed;
}
