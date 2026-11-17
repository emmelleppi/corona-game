import * as THREE from "three";
import { SpringArray, SPRING_PRESETS } from "../core/Spring.js";
import {
  createCharacterMaterial,
  setupGBufferMesh,
  nextObjectId,
} from "../render/materials.js";
import { BAT, COLORS } from "../config.js";

const MOVES = {
  init: {
    rotation: [Math.PI, -Math.PI / 12, -Math.PI],
    position: [0.1, 0.1, 0.1],
  },
  half: {
    rotation: [(-Math.PI * 2) / 6, Math.PI / 8, -Math.PI],
    position: [-0.5, -0.5, 0.2],
  },
  end: {
    rotation: [Math.PI / 2, -Math.PI / 24, -Math.PI],
    position: [0.3, 0, 0],
  },
};

const _a = new THREE.Vector3();
const _axis = new THREE.Vector3();

// First person baseball bat: springy swing animation + hit capsule.
export class Bat extends THREE.Group {
  constructor(batNodes) {
    super();
    this.position.set(0.1, -0.3, -0.5);
    this.rotation.set(Math.PI / 2, 0, 0);

    this.swingGroup = new THREE.Group();
    this.swingGroup.scale.set(0.02, 0.12, 0.02);
    this.add(this.swingGroup);

    this.rotSpring = new SpringArray(MOVES.end.rotation, SPRING_PRESETS.bat);
    this.posSpring = new SpringArray(MOVES.end.position, SPRING_PRESETS.bat);

    const id = nextObjectId();
    this.metal = createCharacterMaterial(COLORS.BAT_METAL, { specular: 1.5 });
    this.handle = createCharacterMaterial(COLORS.BAT_HANDLE, { specular: 0.3 });
    // glTF primitives: Cylinder_1 = grip, Cylinder_2 = barrel, Cylinder_3 = ring
    const parts = [
      [batNodes.Cylinder_2, this.metal],
      [batNodes.Cylinder_1, this.handle],
      [batNodes.Cylinder_3, this.handle],
    ];
    for (const [node, material] of parts) {
      if (!node) continue;
      const mesh = new THREE.Mesh(node.geometry, material);
      mesh.frustumCulled = false;
      setupGBufferMesh(mesh, { objectId: id, castShadow: false });
      this.swingGroup.add(mesh);
    }

    this.time = BAT.SWING_IDLE;
    this.isAttacking = false;
    this.swingId = 0;
    this.prevSegment = [new THREE.Vector3(), new THREE.Vector3()];
    this.segment = [new THREE.Vector3(), new THREE.Vector3()];
    this.hasSegment = false;
  }

  swing() {
    if (this.time > BAT.SWING_END) {
      this.time = 0;
      return true;
    }
    return false;
  }

  reset() {
    this.time = BAT.SWING_IDLE;
    this.isAttacking = false;
    this.rotation.set(Math.PI / 2, 0, 0);
  }

  update(dt, hitAmount) {
    const prev = this.time;
    this.time += dt;
    const t = this.time;
    const crossed = (k) => prev < k && t >= k;

    if (crossed(BAT.SWING_INIT)) {
      this.isAttacking = true;
      this.swingId++;
      this.rotation.set(Math.PI / 2, 0, 0);
      this.rotSpring.set(MOVES.init.rotation);
      this.posSpring.set(MOVES.init.position);
    } else if (crossed(BAT.SWING_HALF)) {
      this.rotSpring.set(MOVES.half.rotation);
      this.posSpring.set(MOVES.half.position);
    } else if (crossed(BAT.SWING_END)) {
      this.isAttacking = false;
      this.rotSpring.set(MOVES.end.rotation);
      this.posSpring.set(MOVES.end.position);
    } else if (t > BAT.SWING_IDLE) {
      // idle wobble
      this.rotation.x = Math.PI / 2 + Math.cos(t * 6) / 6;
      this.rotation.y = Math.sin(t * 6) / 6;
    }

    this.rotSpring.update(dt);
    this.posSpring.update(dt);
    this.swingGroup.rotation.set(
      this.rotSpring.get(0),
      this.rotSpring.get(1),
      this.rotSpring.get(2)
    );
    this.swingGroup.position.set(
      this.posSpring.get(0),
      this.posSpring.get(1),
      this.posSpring.get(2)
    );

    // red-ish when the player gets hit
    const k = hitAmount > 0 ? 1 : 0;
    this.metal.uniforms.uColor.value.set(
      k ? COLORS.BAT_METAL_HIT : COLORS.BAT_METAL
    );
    this.handle.uniforms.uColor.value.set(
      k ? COLORS.BAT_HANDLE_HIT : COLORS.BAT_HANDLE
    );
  }

  // World space hit capsule along the bat (call after the matrices update).
  updateSegment() {
    this.prevSegment[0].copy(this.segment[0]);
    this.prevSegment[1].copy(this.segment[1]);
    this.swingGroup.updateWorldMatrix(true, false);
    const m = this.swingGroup.matrixWorld;
    _a.setFromMatrixPosition(m);
    _axis.setFromMatrixColumn(m, 1).normalize();
    this.segment[0].copy(_a).addScaledVector(_axis, -BAT.REACH_HALF_LENGTH);
    this.segment[1].copy(_a).addScaledVector(_axis, BAT.REACH_HALF_LENGTH);
    if (!this.hasSegment) {
      this.prevSegment[0].copy(this.segment[0]);
      this.prevSegment[1].copy(this.segment[1]);
      this.hasSegment = true;
    }
  }
}

const _ab = new THREE.Vector3();
const _ap = new THREE.Vector3();
const _s0 = new THREE.Vector3();
const _s1 = new THREE.Vector3();

export function distanceToSegment(p, a, b) {
  _ab.subVectors(b, a);
  _ap.subVectors(p, a);
  const t = Math.min(
    1,
    Math.max(0, _ap.dot(_ab) / Math.max(1e-8, _ab.lengthSq()))
  );
  return _ap.addScaledVector(_ab, -t).length();
}

// Distance from p to the swept bat (interpolates between the last two frames
// so a fast swing cannot skip a corona).
export function distanceToSweptBat(p, bat) {
  let best = Infinity;
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    _s0.lerpVectors(bat.prevSegment[0], bat.segment[0], t);
    _s1.lerpVectors(bat.prevSegment[1], bat.segment[1], t);
    best = Math.min(best, distanceToSegment(p, _s0, _s1));
  }
  return best;
}
