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
  };
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
}

export function applyMouseLook(rig, sample) {
  if (rig.frozen) return;
  rig.yaw -= sample.yaw * CAM.yawSpeed;
  rig.pitch -= sample.pitch * CAM.pitchSpeed;
}
