import * as THREE from "three";
import {
  createCharacterMaterial,
  setupGBufferMesh,
  nextObjectId,
} from "../render/materials.js";
import { Billboard } from "./fx.js";
import { CORONA, COLORS } from "../config.js";
import {
  randRange,
  getRandomUnity,
  easeInQuad,
  easeInElastic,
  easeOutCubic,
} from "../core/math.js";

const {
  LIFE,
  Y_AXIS,
  RADIUS,
  RENDER_SCALE,
  ORIENTATION_THRESHOLD,
  SEEK_ALERT_DURATION,
  PREATTACK_DURATION,
  ATTACK_DURATION,
  UNDER_ATTACK_DURATION,
  SPAWN_ANIMATION_DURATION,
  SPAWN_INTERVAL,
  DEATH_DURATION,
  IDLE_VELOCITY,
  SEEK_VELOCITY,
  ATTACK_DISTANCE,
  STEERING_INTERVAL,
  LOOK_AHEAD,
} = CORONA;

export const CORONA_STATE = {
  IDLE: "idle",
  SEEK: "seek",
  PREATTACK: "preattack",
  ATTACK: "attack",
  SPAWN: "spawn",
  DEAD: "dead",
};

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();

const randomSpawnInterval = () =>
  SPAWN_INTERVAL + Math.random() * SPAWN_INTERVAL;
const randomTurn = (orientation) =>
  orientation.applyAxisAngle(UP, Math.PI / 2 + Math.random() * Math.PI);

// A single virus. Behaviour (replaces CORONA_MACHINE):
//   idle    -> wanders around, every 10-20s it reproduces (spawn)
//   seek    -> the player is close: "!" + chase
//   attack  -> lunge towards the player
//   preattack -> spins for 1s, then attacks again
//   spawn   -> 3s growing animation, then a new corona pops out
//   dead    -> flies away, red, fading out
export class Corona {
  constructor(game, position, awake) {
    this.game = game;
    this.id = nextObjectId();
    this.life = LIFE;
    this.awake = awake;
    this.state = CORONA_STATE.IDLE;
    this.stateTime = 0;
    this.removed = false;

    this.position = new THREE.Vector3(position.x, Y_AXIS, position.z);
    this.orientation = new THREE.Vector3(
      getRandomUnity(),
      0,
      getRandomUnity()
    ).normalize();
    this.avoid = new THREE.Vector3();
    this.avoidTime = 0;
    this.spawnTimer = randomSpawnInterval();
    this.steerTimer = Math.random() * STEERING_INTERVAL;
    this.thinkTimer = Math.random() * 0.25;
    this.seekAlert = 0;
    this.underAttack = 0;
    this.flash = 0;

    this.attackOrigin = new THREE.Vector3();
    this.attackTarget = new THREE.Vector3();
    this.attackHit = false;
    this.returning = 0;

    this.knockback = new THREE.Vector3();
    this.knockbackTime = 0;

    this.velocity = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.rand = Math.floor(Math.random() * 10) + 1;
    this.spinTime = 0;

    this.createVisual();
  }

  createVisual() {
    const { assets } = this.game;
    this.group = new THREE.Group();
    this.group.scale.setScalar(RENDER_SCALE);
    this.rotationGroup = new THREE.Group();
    this.bobGroup = new THREE.Group();
    this.material = createCharacterMaterial(COLORS.CORONA, {
      side: THREE.DoubleSide,
      specular: 1,
    });
    this.mesh = new THREE.Mesh(assets.coronaGeometry, this.material);
    setupGBufferMesh(this.mesh, { objectId: this.id, castShadow: true });
    this.bobGroup.add(this.mesh);
    this.rotationGroup.add(this.bobGroup);
    this.group.add(this.rotationGroup);

    this.exclamation = new Billboard(assets.exclamationTexture, {
      brightness: 1.4,
    });
    this.exclamation.position.set(0, 2.5, 0);
    this.group.add(this.exclamation);

    this.pow = new Billboard(assets.powTexture, { brightness: 1.2 });
    this.group.add(this.pow);

    this.group.position.copy(this.position);
  }

  dispose() {
    this.material.dispose();
    this.pow.material.dispose();
    this.exclamation.material.dispose();
  }

  get alive() {
    return this.state !== CORONA_STATE.DEAD;
  }

  get canBeHit() {
    return this.alive && this.awake;
  }

  setState(state) {
    const prev = this.state;
    this.state = state;
    this.stateTime = 0;
    switch (state) {
      case CORONA_STATE.IDLE:
        this.spawnTimer = randomSpawnInterval();
        break;
      case CORONA_STATE.SEEK:
        if (prev === CORONA_STATE.IDLE) {
          this.seekAlert = SEEK_ALERT_DURATION;
          this.game.emit("coronaAlert", this);
        }
        break;
      case CORONA_STATE.ATTACK: {
        this.attackOrigin.copy(this.position);
        const eye = this.game.playerEye;
        _dir.subVectors(eye, this.position).normalize();
        this.attackTarget
          .copy(this.position)
          .addScaledVector(_dir, ATTACK_DISTANCE * 0.8)
          .setY(Y_AXIS);
        this.attackHit = false;
        break;
      }
      case CORONA_STATE.PREATTACK:
        this.spinTime = 0;
        if (prev === CORONA_STATE.ATTACK) this.returning = 0.15;
        break;
      case CORONA_STATE.SPAWN:
        this.spinTime = 0;
        break;
      case CORONA_STATE.DEAD: {
        // big "home run": away from the player and up in the air
        const eye = this.game.playerEye;
        _dir.subVectors(eye, this.position).normalize();
        this.velocity.set(-40 * _dir.x, 20, -40 * _dir.z).multiplyScalar(0.7);
        this.spin.set(
          randRange(-12, 12),
          randRange(-12, 12),
          randRange(-12, 12)
        );
        this.material.uniforms.uColor.value.set(COLORS.CORONA_DEAD);
        this.exclamation.visible = false;
        break;
      }
    }
  }

  wake(awake) {
    this.awake = awake;
    if (this.alive) this.setState(CORONA_STATE.IDLE);
  }

  // Hit by the bat.
  hit(damage, from) {
    if (!this.canBeHit) return false;
    this.life -= damage;
    this.underAttack = UNDER_ATTACK_DURATION;
    this.flash = 1;
    this.pow.setScale(2 * (0.5 + Math.random() / 2));
    const k = Math.random() * (Math.random() > 0.5 ? 1 : -1);
    this.pow.position.set(k, 1.5 + k, 0);
    this.pow.rotationZ = randRange(-0.4, 0.4);

    _dir.subVectors(from, this.position).setY(0).normalize();
    if (this.life <= 0) {
      this.setState(CORONA_STATE.DEAD);
    } else {
      this.knockback.copy(_dir).multiplyScalar(-CORONA.KNOCKBACK);
      this.knockbackTime = 0.12;
      if (this.state === CORONA_STATE.ATTACK)
        this.setState(CORONA_STATE.PREATTACK);
    }
    return true;
  }

  // Periodic proximity check (it was done every 500ms with a quadtree).
  think(distance) {
    if (!this.awake || !this.alive) return;
    const s = this.state;
    if (s === CORONA_STATE.IDLE) {
      if (distance < this.game.settings.seekDistance)
        this.setState(CORONA_STATE.SEEK);
    } else if (s === CORONA_STATE.SEEK) {
      if (distance <= ATTACK_DISTANCE) this.setState(CORONA_STATE.ATTACK);
      else if (
        distance >
        this.game.settings.seekDistance * CORONA.LOSE_DISTANCE_FACTOR
      )
        this.setState(CORONA_STATE.IDLE);
    } else if (s === CORONA_STATE.PREATTACK) {
      if (distance > ATTACK_DISTANCE) this.setState(CORONA_STATE.SEEK);
    }
  }

  steer() {
    const world = this.game.world;
    const p = this.position;
    const o = this.orientation;
    const aheadOnGround = world.isGround(
      p.x + o.x * LOOK_AHEAD,
      p.z + o.z * LOOK_AHEAD
    );
    if (this.state === CORONA_STATE.SEEK && aheadOnGround) {
      const eye = this.game.playerEye;
      const distance = eye.distanceTo(p);
      if (distance > ATTACK_DISTANCE) {
        _dir.set(eye.x - p.x, 0, eye.z - p.z).normalize();
        if (_v.subVectors(_dir, o).length() > ORIENTATION_THRESHOLD)
          o.copy(_dir);
      }
    } else if (!aheadOnGround) {
      randomTurn(o);
    }
  }

  move(dt, speed) {
    const world = this.game.world;
    const avoidK = 0.5 / (0.5 + this.avoidTime * 0.6);
    _v.copy(this.orientation)
      .addScaledVector(this.avoid, avoidK)
      .multiplyScalar(speed * dt);
    const nx = this.position.x + _v.x;
    const nz = this.position.z + _v.z;
    if (world.isGround(nx, nz)) {
      this.position.x = nx;
      this.position.z = nz;
    } else {
      randomTurn(this.orientation);
      this.avoid.set(0, 0, 0);
    }
  }

  update(dt, time) {
    this.stateTime += dt;
    this.seekAlert = Math.max(0, this.seekAlert - dt);
    this.underAttack = Math.max(0, this.underAttack - dt);
    this.flash = Math.max(0, this.flash - dt * 6);
    this.avoidTime += dt;

    if (this.state === CORONA_STATE.DEAD) {
      this.updateDeath(dt);
      return;
    }

    // knockback after a hit (stays on the islands)
    if (this.knockbackTime > 0) {
      const k = Math.min(dt, this.knockbackTime) / 0.12;
      const nx = this.position.x + this.knockback.x * k;
      const nz = this.position.z + this.knockback.z * k;
      if (this.game.world.isGround(nx, nz)) {
        this.position.x = nx;
        this.position.z = nz;
      }
      this.knockbackTime -= dt;
    }

    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.25;
      this.think(this.game.playerEye.distanceTo(this.position));
    }

    this.steerTimer -= dt;
    if (this.steerTimer <= 0) {
      this.steerTimer = STEERING_INTERVAL;
      this.steer();
    }

    switch (this.state) {
      case CORONA_STATE.IDLE:
        this.move(dt, IDLE_VELOCITY);
        this.spawnTimer -= dt;
        if (this.awake && this.spawnTimer <= 0) this.startSpawn();
        break;
      case CORONA_STATE.SEEK:
        this.move(dt, SEEK_VELOCITY);
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) this.startSpawn();
        break;
      case CORONA_STATE.ATTACK: {
        const k = easeOutCubic(Math.min(1, this.stateTime / 0.08));
        this.position.lerpVectors(this.attackOrigin, this.attackTarget, k);
        if (!this.attackHit && this.game.checkCoronaHitsPlayer(this))
          this.attackHit = true;
        if (this.stateTime >= ATTACK_DURATION) {
          this.setState(CORONA_STATE.PREATTACK);
        }
        break;
      }
      case CORONA_STATE.PREATTACK:
        if (this.returning > 0) {
          this.returning = Math.max(0, this.returning - dt);
          const k = 1 - this.returning / 0.15;
          this.position.lerpVectors(
            this.attackTarget,
            this.attackOrigin,
            easeOutCubic(k)
          );
        }
        if (this.stateTime >= PREATTACK_DURATION)
          this.setState(CORONA_STATE.ATTACK);
        break;
      case CORONA_STATE.SPAWN:
        if (this.stateTime >= SPAWN_ANIMATION_DURATION) {
          this.game.reproduce(this);
          this.setState(CORONA_STATE.IDLE);
        }
        break;
    }

    this.updateVisual(dt, time);
  }

  startSpawn() {
    if (this.game.canSpawnCorona()) this.setState(CORONA_STATE.SPAWN);
    else this.spawnTimer = randomSpawnInterval();
  }

  updateDeath(dt) {
    this.velocity.y -= 40 * dt;
    this.position.addScaledVector(this.velocity, dt);
    // bounce on the islands
    if (this.position.y < RADIUS * RENDER_SCALE * 2 && this.velocity.y < 0) {
      const ground = this.game.world.groundHeightAt(
        this.position.x,
        this.position.z
      );
      if (ground > -Infinity && this.position.y > ground - 1) {
        this.position.y = ground + RADIUS * RENDER_SCALE * 2;
        this.velocity.y *= -0.45;
        this.velocity.x *= 0.7;
        this.velocity.z *= 0.7;
      }
    }
    this.rotationGroup.rotation.x += this.spin.x * dt;
    this.rotationGroup.rotation.y += this.spin.y * dt;
    this.rotationGroup.rotation.z += this.spin.z * dt;

    const t = this.stateTime / DEATH_DURATION;
    this.material.uniforms.uOpacity.value = Math.max(0, 1 - t);
    this.material.uniforms.uFlash.value = 0;
    this.group.position.copy(this.position);
    this.pow.visible = this.underAttack > 0;
    if (t >= 1 || this.position.y < -60) this.removed = true;
  }

  updateVisual(dt, time) {
    const seeking = this.state === CORONA_STATE.SEEK;
    const multiplier = 10 * (seeking ? 2 : 1);
    const s = Math.sin(this.rand + time * multiplier);
    this.bobGroup.position.y = s * 0.5;
    let h = 1 - s / 8;
    let v = 1 + s / 10;

    if (this.state === CORONA_STATE.PREATTACK) {
      this.spinTime += dt * 4.2;
      this.rotationGroup.rotation.y = easeInQuad(this.spinTime);
    } else if (this.state === CORONA_STATE.SPAWN) {
      this.spinTime += dt * 3;
      this.rotationGroup.rotation.y = easeInQuad(this.spinTime);
      h = v = 1 + 1.5 * easeInElastic(this.spinTime / 8);
    }
    this.mesh.scale.set(h, v, h);

    this.group.position.copy(this.position);
    this.material.uniforms.uFlash.value = this.flash;
    this.material.uniforms.uEmissive.value =
      this.state === CORONA_STATE.SPAWN ? (0.3 * this.spinTime) / 8 : 0;

    this.exclamation.visible = this.seekAlert > 0;
    if (this.exclamation.visible) {
      const a = Math.min(1, (SEEK_ALERT_DURATION - this.seekAlert) * 8);
      const pop = 1 + Math.sin(Math.min(1, a) * Math.PI) * 0.3;
      this.exclamation.setScale(2 * RENDER_SCALE * pop);
      this.exclamation.opacity = Math.min(1, this.seekAlert * 4);
    }
    this.pow.visible = this.underAttack > 0;
    if (this.pow.visible) {
      const k = this.underAttack / UNDER_ATTACK_DURATION;
      this.pow.opacity = Math.min(1, k * 3);
    }
  }
}

// Pushes overlapping coronas apart (they used to be physic spheres).
export function separateCoronas(coronas) {
  const minDist = RADIUS * 2;
  for (let i = 0; i < coronas.length; i++) {
    const a = coronas[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < coronas.length; j++) {
      const b = coronas[j];
      if (!b.alive) continue;
      const dx = a.position.x - b.position.x;
      const dz = a.position.z - b.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= minDist * minDist) continue;
      let d = Math.sqrt(d2);
      let nx = dx;
      let nz = dz;
      if (d < 1e-4) {
        const angle = Math.random() * Math.PI * 2;
        nx = Math.cos(angle);
        nz = Math.sin(angle);
        d = 1e-4;
      } else {
        nx /= d;
        nz /= d;
      }
      const push = (minDist - d) * 0.5;
      const world = a.game.world;
      if (world.isGround(a.position.x + nx * push, a.position.z + nz * push)) {
        a.position.x += nx * push;
        a.position.z += nz * push;
      }
      if (world.isGround(b.position.x - nx * push, b.position.z - nz * push)) {
        b.position.x -= nx * push;
        b.position.z -= nz * push;
      }
      a.avoid.set(nx * 0.5, 0, nz * 0.5);
      a.avoidTime = 0;
      b.avoid.set(-nx * 0.5, 0, -nz * 0.5);
      b.avoidTime = 0;
    }
  }
}
