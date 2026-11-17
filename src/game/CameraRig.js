import * as THREE from "three";
import { Spring, SPRING_PRESETS } from "../core/Spring.js";

const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const LIMIT = Math.PI / 2 - 0.01;

// First person camera: mouse look, boost FOV spring, screen shake.
export class CameraRig {
  constructor(camera, settings) {
    this.camera = camera;
    this.settings = settings;
    this.yaw = 0;
    this.pitch = 0;
    this.fov = new Spring(settings.fov, SPRING_PRESETS.molasses);
    this.shake = 0;
    this.shakeOffset = new THREE.Vector3();
  }

  look(dx, dy) {
    const k = 0.002 * this.settings.mouseSensitivity;
    this.yaw -= dx * k;
    this.pitch -= dy * k * (this.settings.invertY ? -1 : 1);
    this.pitch = Math.max(-LIMIT, Math.min(LIMIT, this.pitch));
  }

  lookAt(from, to) {
    _m.lookAt(from, to, this.camera.up);
    _q.setFromRotationMatrix(_m);
    _euler.setFromQuaternion(_q, "YXZ");
    this.yaw = _euler.y;
    this.pitch = _euler.x;
  }

  applyRotation() {
    _euler.set(this.pitch, this.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(_euler);
  }

  addShake(amount) {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(dt, boost) {
    const s = this.settings;
    this.fov.set(boost ? s.boostFov : s.fov);
    this.fov.update(dt);
    this.camera.fov = this.fov.value;

    this.shake = Math.max(0, this.shake - dt * 2.5);
    const a = this.shake * this.shake * 0.08;
    this.shakeOffset.set(
      (Math.random() - 0.5) * a,
      (Math.random() - 0.5) * a,
      (Math.random() - 0.5) * a
    );
  }
}
