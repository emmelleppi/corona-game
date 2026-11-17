import * as THREE from "three";
import { PLAYER } from "../config.js";

const _wish = new THREE.Vector3();
const _horizontal = new THREE.Vector3();

// Kinematic rolling-ball character controller. It replaces the cannon sphere
// that was spun with an angular velocity: same speeds, same gravity, same
// jump impulses, but with frame-rate independent integration.
export class Player {
  constructor(world, settings) {
    this.world = world;
    this.settings = settings;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.coyote = 0;
    this.life = PLAYER.INITIAL_LIFE;
    this.hitTimer = 0;
    this.landImpact = 0;
    this.reset();
  }

  reset() {
    this.position.fromArray(PLAYER.INIT_POSITION);
    this.velocity.set(0, 0, 0);
    this.life = PLAYER.INITIAL_LIFE;
    this.hitTimer = 0;
    this.grounded = false;
    this.coyote = 0;
  }

  // Position of the camera / "chest" (it was a cylinder locked above the body).
  getEyePosition(target) {
    return target.copy(this.position).setY(this.position.y + PLAYER.EYE_HEIGHT);
  }

  get speed() {
    return this.velocity.length();
  }

  damage(amount) {
    this.life = Math.max(0, this.life - amount);
    this.hitTimer = PLAYER.HIT_FEEDBACK_DURATION;
  }

  // input: {forward, backward, left, right, jump, boost}; yaw: camera yaw.
  update(dt, input, yaw) {
    const s = this.settings;
    const events = { jumped: false, landed: 0 };
    this.hitTimer = Math.max(0, this.hitTimer - dt);

    // movement direction on the ground plane (camera pitch is ignored, looking
    // down does not slow the player any more)
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    _wish.set(fx * forward - fz * strafe, 0, fz * forward + fx * strafe);
    if (_wish.lengthSq() > 0) _wish.normalize();

    const targetSpeed = s.playerSpeed * (input.boost ? PLAYER.BOOST_FACTOR : 1);
    _horizontal.set(this.velocity.x, 0, this.velocity.z);

    if (this.grounded) {
      // accelerate towards the wished velocity (rolling friction)
      const tx = _wish.x * targetSpeed;
      const tz = _wish.z * targetSpeed;
      const dx = tx - this.velocity.x;
      const dz = tz - this.velocity.z;
      const d = Math.hypot(dx, dz);
      const maxDelta = s.groundAcceleration * dt;
      const k = d > maxDelta ? maxDelta / d : 1;
      this.velocity.x += dx * k;
      this.velocity.z += dz * k;
    } else if (_wish.lengthSq() > 0) {
      // a bit of air control, without gaining speed
      const before = _horizontal.length();
      this.velocity.x += _wish.x * PLAYER.AIR_ACCELERATION * dt;
      this.velocity.z += _wish.z * PLAYER.AIR_ACCELERATION * dt;
      const after = Math.hypot(this.velocity.x, this.velocity.z);
      const limit = Math.max(before, targetSpeed);
      if (after > limit) {
        this.velocity.x *= limit / after;
        this.velocity.z *= limit / after;
      }
    }

    // jump (holding space keeps hopping, like before)
    if (input.jump && (this.grounded || this.coyote > 0)) {
      // forward kick, capped so that bunny hopping can not stack it forever
      const before = Math.hypot(this.velocity.x, this.velocity.z);
      this.velocity.y = s.jumpImpulse;
      this.velocity.x += _wish.x * PLAYER.JUMP_FORWARD_IMPULSE;
      this.velocity.z += _wish.z * PLAYER.JUMP_FORWARD_IMPULSE;
      const after = Math.hypot(this.velocity.x, this.velocity.z);
      const limit = Math.max(before, targetSpeed + PLAYER.JUMP_FORWARD_IMPULSE);
      if (after > limit) {
        this.velocity.x *= limit / after;
        this.velocity.z *= limit / after;
      }
      this.grounded = false;
      this.coyote = 0;
      events.jumped = true;
    }

    this.velocity.y -= PLAYER.GRAVITY * dt;
    this.velocity.multiplyScalar(Math.pow(1 - PLAYER.LINEAR_DAMPING, dt));

    // integrate + collide with small sub-steps (no tunnelling when falling fast)
    const wasGrounded = this.grounded;
    const fallSpeed = -this.velocity.y;
    const travel = this.velocity.length() * dt;
    const steps = Math.min(
      16,
      Math.max(1, Math.ceil(travel / (PLAYER.RADIUS * 0.25)))
    );
    const h = dt / steps;
    let grounded = false;
    for (let i = 0; i < steps; i++) {
      this.position.addScaledVector(this.velocity, h);
      const ground = this.world.collideSphere(
        this.position,
        this.velocity,
        PLAYER.RADIUS
      );
      if (ground > 0.6) grounded = true;
    }

    if (grounded) this.coyote = PLAYER.COYOTE_TIME;
    else this.coyote = Math.max(0, this.coyote - dt);
    if (grounded && !wasGrounded) events.landed = fallSpeed;
    this.grounded = grounded;
    return events;
  }
}
