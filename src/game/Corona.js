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
  CORONA.SPAWN_INTERVAL + Math.random() * CORONA.SPAWN_INTERVAL;
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
    this.life = CORONA.LIFE;
    this.awake = awake;
    this.state = CORONA_STATE.IDLE;
    this.stateTime = 0;
    this.removed = false;

    this.position = new THREE.Vector3(position.x, CORONA.Y_AXIS, position.z);
    this.orientation = new THREE.Vector3(
      getRandomUnity(),
      0,
      getRandomUnity()
    ).normalize();
    this.avoid = new THREE.Vector3();
    this.avoidTime = 0;
    this.spawnTimer = randomSpawnInterval();
    this.steerTimer = Math.random() * CORONA.STEERING_INTERVAL;
    this.thinkTimer = Math.random() * CORONA.THINK_INTERVAL;
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
    this.group.scale.setScalar(CORONA.RENDER_SCALE);
    this.rotationGroup = new THREE.Group();
    this.bobGroup = new THREE.Group();
    this.material = createCharacterMaterial(COLORS.CORONA, {
      side: THREE.DoubleSide,
      specular: CORONA.SPECULAR,
    });
    this.mesh = new THREE.Mesh(assets.coronaGeometry, this.material);
    setupGBufferMesh(this.mesh, { objectId: this.id, castShadow: true });
    this.bobGroup.add(this.mesh);
    this.rotationGroup.add(this.bobGroup);
    this.group.add(this.rotationGroup);

    this.exclamation = new Billboard(assets.exclamationTexture, {
      brightness: 1.4,
    });
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
          this.seekAlert = CORONA.SEEK_ALERT_DURATION;
          this.game.emit("coronaAlert", this);
        }
        break;
      case CORONA_STATE.ATTACK: {
        this.attackOrigin.copy(this.position);
        const eye = this.game.playerEye;
        _dir.subVectors(eye, this.position).normalize();
        this.attackTarget
          .copy(this.position)
          .addScaledVector(_dir, CORONA.ATTACK_DISTANCE * CORONA.LUNGE_FACTOR)
          .setY(CORONA.Y_AXIS);
        this.attackHit = false;
        break;
      }
      case CORONA_STATE.PREATTACK:
        this.spinTime = 0;
        if (prev === CORONA_STATE.ATTACK)
          this.returning = CORONA.LUNGE_RETURN_TIME;
        break;
      case CORONA_STATE.SPAWN:
        this.spinTime = 0;
        break;
      case CORONA_STATE.DEAD: {
        // big "home run": away from the player and up in the air
        const eye = this.game.playerEye;
        _dir.subVectors(eye, this.position).normalize();
        this.velocity.set(
          -CORONA.DEATH_SPEED * _dir.x,
          CORONA.DEATH_UP_SPEED,
          -CORONA.DEATH_SPEED * _dir.z
        );
        this.spin.set(
          randRange(-CORONA.DEATH_SPIN, CORONA.DEATH_SPIN),
          randRange(-CORONA.DEATH_SPIN, CORONA.DEATH_SPIN),
          randRange(-CORONA.DEATH_SPIN, CORONA.DEATH_SPIN)
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
    this.underAttack = CORONA.UNDER_ATTACK_DURATION;
    this.flash = 1;
    this.powSize = randRange(CORONA.POW_SIZE_MIN, CORONA.POW_SIZE_MAX);
    const k = Math.random() * (Math.random() > 0.5 ? 1 : -1);
    this.pow.position.set(k, 1.5 + k, 0);
    this.pow.rotationZ = randRange(-0.4, 0.4);

    _dir.subVectors(from, this.position).setY(0).normalize();
    if (this.life <= 0) {
      this.setState(CORONA_STATE.DEAD);
    } else {
      this.knockback.copy(_dir).multiplyScalar(-CORONA.KNOCKBACK);
      this.knockbackTime = CORONA.KNOCKBACK_TIME;
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
      if (distance < CORONA.SEEK_DISTANCE) this.setState(CORONA_STATE.SEEK);
    } else if (s === CORONA_STATE.SEEK) {
      if (distance <= CORONA.ATTACK_DISTANCE)
        this.setState(CORONA_STATE.ATTACK);
      else if (distance > CORONA.SEEK_DISTANCE * CORONA.LOSE_DISTANCE_FACTOR)
        this.setState(CORONA_STATE.IDLE);
    } else if (s === CORONA_STATE.PREATTACK) {
      if (distance > CORONA.ATTACK_DISTANCE) this.setState(CORONA_STATE.SEEK);
    }
  }

  steer() {
    const world = this.game.world;
    const p = this.position;
    const o = this.orientation;
    const aheadOnGround = world.isGround(
      p.x + o.x * CORONA.LOOK_AHEAD,
      p.z + o.z * CORONA.LOOK_AHEAD
    );
    if (this.state === CORONA_STATE.SEEK && aheadOnGround) {
      const eye = this.game.playerEye;
      const distance = eye.distanceTo(p);
      if (distance > CORONA.ATTACK_DISTANCE) {
        _dir.set(eye.x - p.x, 0, eye.z - p.z).normalize();
        if (_v.subVectors(_dir, o).length() > CORONA.ORIENTATION_THRESHOLD)
          o.copy(_dir);
      }
    } else if (!aheadOnGround) {
      randomTurn(o);
    }
  }

  move(dt, speed) {
    const world = this.game.world;
    const avoidK = 1 / (1 + this.avoidTime * 1.2);
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
    this.flash = Math.max(0, this.flash - dt * CORONA.HIT_FLASH_DECAY);
    this.avoidTime += dt;

    if (this.state === CORONA_STATE.DEAD) {
      this.updateDeath(dt);
      return;
    }

    // knockback after a hit (stays on the islands)
    if (this.knockbackTime > 0) {
      const k =
        Math.min(dt, this.knockbackTime) /
        Math.max(1e-3, CORONA.KNOCKBACK_TIME);
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
      this.thinkTimer = CORONA.THINK_INTERVAL;
      this.think(this.game.playerEye.distanceTo(this.position));
    }

    this.steerTimer -= dt;
    if (this.steerTimer <= 0) {
      this.steerTimer = CORONA.STEERING_INTERVAL;
      this.steer();
    }

    switch (this.state) {
      case CORONA_STATE.IDLE:
        this.move(dt, CORONA.IDLE_VELOCITY);
        this.spawnTimer -= dt;
        if (this.awake && this.spawnTimer <= 0) this.startSpawn();
        break;
      case CORONA_STATE.SEEK:
        this.move(dt, CORONA.SEEK_VELOCITY);
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) this.startSpawn();
        break;
      case CORONA_STATE.ATTACK: {
        const k = easeOutCubic(
          Math.min(1, this.stateTime / Math.max(1e-3, CORONA.LUNGE_TIME))
        );
        this.position.lerpVectors(this.attackOrigin, this.attackTarget, k);
        if (!this.attackHit && this.game.checkCoronaHitsPlayer(this))
          this.attackHit = true;
        if (this.stateTime >= CORONA.ATTACK_DURATION) {
          this.setState(CORONA_STATE.PREATTACK);
        }
        break;
      }
      case CORONA_STATE.PREATTACK:
        if (this.returning > 0) {
          this.returning = Math.max(0, this.returning - dt);
          const k =
            1 - this.returning / Math.max(1e-3, CORONA.LUNGE_RETURN_TIME);
          this.position.lerpVectors(
            this.attackTarget,
            this.attackOrigin,
            easeOutCubic(k)
          );
        }
        if (this.stateTime >= CORONA.PREATTACK_DURATION)
          this.setState(CORONA_STATE.ATTACK);
        break;
      case CORONA_STATE.SPAWN:
        if (this.stateTime >= CORONA.SPAWN_ANIMATION_DURATION) {
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
    this.velocity.y -= CORONA.DEATH_GRAVITY * dt;
    this.position.addScaledVector(this.velocity, dt);
    // bounce on the islands
    if (
      this.position.y < CORONA.RADIUS * CORONA.RENDER_SCALE * 2 &&
      this.velocity.y < 0
    ) {
      const ground = this.game.world.groundHeightAt(
        this.position.x,
        this.position.z
      );
      if (ground > -Infinity && this.position.y > ground - 1) {
        this.position.y = ground + CORONA.RADIUS * CORONA.RENDER_SCALE * 2;
        this.velocity.y *= -CORONA.DEATH_BOUNCE;
        this.velocity.x *= 0.7;
        this.velocity.z *= 0.7;
      }
    }
    this.rotationGroup.rotation.x += this.spin.x * dt;
    this.rotationGroup.rotation.y += this.spin.y * dt;
    this.rotationGroup.rotation.z += this.spin.z * dt;

    const t = this.stateTime / CORONA.DEATH_DURATION;
    this.material.uniforms.uOpacity.value = Math.max(0, 1 - t);
    this.material.uniforms.uFlash.value = 0;
    this.material.uniforms.uColor.value.set(COLORS.CORONA_DEAD);
    this.group.position.copy(this.position);
    this.pow.visible = this.underAttack > 0;
    if (t >= 1 || this.position.y < -60) this.removed = true;
  }

  updateVisual(dt, time) {
    const seeking = this.state === CORONA_STATE.SEEK;
    const multiplier = CORONA.BOB_FREQUENCY * (seeking ? 2 : 1);
    // the bob phase is accumulated so that changing the frequency is smooth
    this.bobPhase = (this.bobPhase ?? this.rand) + dt * multiplier;
    const s = Math.sin(this.bobPhase);
    this.bobGroup.position.y = s * CORONA.BOB_AMPLITUDE;
    let h = 1 - s * CORONA.SQUASH;
    let v = 1 + s * CORONA.STRETCH;

    if (this.state === CORONA_STATE.PREATTACK) {
      this.spinTime += dt * CORONA.PREATTACK_SPIN_SPEED;
      this.rotationGroup.rotation.y = easeInQuad(this.spinTime);
    } else if (this.state === CORONA_STATE.SPAWN) {
      this.spinTime += dt * CORONA.SPAWN_SPIN_SPEED;
      this.rotationGroup.rotation.y = easeInQuad(this.spinTime);
      h = v = 1 + CORONA.SPAWN_GROWTH * easeInElastic(this.spinTime / 8);
    }
    this.mesh.scale.set(h, v, h);

    // live tunables
    this.position.y = CORONA.Y_AXIS;
    this.group.scale.setScalar(CORONA.RENDER_SCALE);
    this.exclamation.position.set(0, CORONA.EXCLAMATION_HEIGHT, 0);
    const u = this.material.uniforms;
    u.uColor.value.set(COLORS.CORONA);
    u.uFlashColor.value.set(COLORS.CORONA_FLASH);
    u.uSpecular.value = CORONA.SPECULAR;

    this.group.position.copy(this.position);
    u.uFlash.value = this.flash;
    this.material.uniforms.uEmissive.value =
      this.state === CORONA_STATE.SPAWN ? (0.3 * this.spinTime) / 8 : 0;

    this.exclamation.visible = this.seekAlert > 0;
    if (this.exclamation.visible) {
      const a = Math.min(1, (CORONA.SEEK_ALERT_DURATION - this.seekAlert) * 8);
      const pop = 1 + Math.sin(Math.min(1, a) * Math.PI) * 0.3;
      this.exclamation.setScale(
        CORONA.EXCLAMATION_SIZE * CORONA.RENDER_SCALE * pop
      );
      this.exclamation.opacity = Math.min(1, this.seekAlert * 4);
    }
    this.pow.visible = this.underAttack > 0;
    if (this.pow.visible) {
      const k = this.underAttack / CORONA.UNDER_ATTACK_DURATION;
      this.pow.opacity = Math.min(1, k * 3);
      this.pow.setScale((this.powSize ?? 1.5) * CORONA.RENDER_SCALE);
    }
  }
}

// Pushes overlapping coronas apart (they used to be physic spheres).
export function separateCoronas(coronas) {
  const minDist = CORONA.RADIUS * 2;
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
      a.avoid.set(nx * CORONA.SEPARATION, 0, nz * CORONA.SEPARATION);
      a.avoidTime = 0;
      b.avoid.set(-nx * CORONA.SEPARATION, 0, -nz * CORONA.SEPARATION);
      b.avoidTime = 0;
    }
  }
}
