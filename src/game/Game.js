import * as THREE from "three";
import { Emitter } from "../core/Emitter.js";
import { Player } from "./Player.js";
import { Bat, distanceToSweptBat, distanceToSegment } from "./Bat.js";
import { Corona, separateCoronas } from "./Corona.js";
import { CameraRig } from "./CameraRig.js";
import { Particles, Popups } from "./fx.js";
import { CORONA, GAME, PLAYER, BAT, FX } from "../config.js";
import {
  damp60,
  easeInOutCubic,
  getRandDamage,
  randInt,
  clamp,
} from "../core/math.js";

export const GAME_STATE = {
  LOADING: "loading",
  WAIT_PLAYER: "waitPlayer",
  INIT_ANIMATION: "initAnimation",
  GAMEPLAY: "gameplay",
  WIN: "win",
  GAMEOVER: "gameover",
};

const _v = new THREE.Vector3();
const _target = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const MAP_CENTER = new THREE.Vector3(0, -1, -0.5);

// Game orchestrator: a small explicit state machine replacing the xstate
// GAME_ORCHESTRATOR. Every timer runs on the game clock, so pausing the game
// pauses everything.
export class Game extends Emitter {
  constructor({ scene, camera, level, assets, input, audio, settings }) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.level = level;
    this.world = level.world;
    this.assets = assets;
    this.input = input;
    this.audio = audio;
    this.settings = settings;

    this.state = GAME_STATE.LOADING;
    this.stateTime = 0;
    this.time = 0;
    this.paused = false;
    this.coronas = [];
    this.followIndex = 0;
    this.followTimer = 0;
    this.playerEye = new THREE.Vector3();
    this.glitch = 0;
    this.damageFx = 0;

    this.player = new Player(this.world, settings);
    this.rig = new CameraRig(camera, settings);
    this.bat = new Bat(assets.batNodes);
    this.bat.visible = false;
    camera.add(this.bat);

    this.particles = new Particles();
    scene.add(this.particles);
    this.popups = new Popups();
    scene.add(this.popups);
    this.hitStop = 0;

    this.on("coronaWindup", () =>
      audio.play("alert", {
        volume: GAME.ALERT_VOLUME * 0.6,
        rate: CORONA.WINDUP_ALERT_PITCH,
      })
    );
    this.on("spawnDenied", (c) => {
      this.particles.burst(c.position, {
        ...FX.spawn,
        count: FX.spawn.count * 2,
      });
      this.popups.spawn(
        "denied",
        _v.copy(c.position).setY(c.position.y + 0.8),
        {
          size: GAME.DAMAGE_POPUP_SIZE * 1.3,
          duration: GAME.DAMAGE_POPUP_DURATION * 1.5,
          rise: GAME.DAMAGE_POPUP_RISE,
        }
      );
    });

    this.coronaGroup = new THREE.Group();
    scene.add(this.coronaGroup);

    this.initFrom = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
    };

    input.on("click", () => this.onClick());
    input.on("unlock", () => this.onUnlock());
    input.on("lock", () => this.onLock());
    input.on("keydown", (code) => {
      if (code === "KeyM") this.emit("toggleMute");
      if ((code === "ShiftLeft" || code === "ShiftRight") && this.playerActive)
        audio.play("sprint", { volume: GAME.SPRINT_VOLUME });
    });
  }

  get playerActive() {
    return this.state === GAME_STATE.GAMEPLAY || this.state === GAME_STATE.WIN;
  }

  get remaining() {
    return this.coronas.length;
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
    this.emit("state", state);
  }

  // ---------------------------------------------------------------- flow ---
  start() {
    this.resetRound();
    this.setState(GAME_STATE.WAIT_PLAYER);
  }

  resetRound() {
    for (const c of this.coronas) this.removeCoronaVisual(c);
    this.coronas = [];
    for (let i = 0; i < GAME.NUMBER_OF_INIT_SPAWNS; i++) {
      // do not spawn right below the start platform
      let p;
      let attempts = 0;
      do {
        p = this.world.randomGroundPoint();
      } while (
        ++attempts < 50 &&
        Math.hypot(
          p.x - PLAYER.INIT_POSITION[0],
          p.z - PLAYER.INIT_POSITION[2]
        ) < GAME.SPAWN_EXCLUSION_RADIUS
      );
      this.addCorona(p, false);
    }
    this.player.reset();
    this.player.getEyePosition(this.playerEye);
    this.bat.reset();
    this.particles.clear();
    this.popups.clear();
    this.hitStop = 0;
    this.emit("life", this.player.life);
    this.emit("remaining", this.remaining);
  }

  startInitAnimation() {
    this.initFrom.position.copy(this.camera.position);
    this.initFrom.quaternion.copy(this.camera.quaternion);
    this.player.reset();
    this.player.getEyePosition(this.playerEye);
    this.rig.lookAt(this.playerEye, MAP_CENTER);
    this.setState(GAME_STATE.INIT_ANIMATION);
    this.emit("life", this.player.life);
  }

  startGameplay() {
    for (const c of this.coronas) c.wake(true);
    this.bat.visible = true;
    this.setState(GAME_STATE.GAMEPLAY);
  }

  gameOver() {
    for (const c of this.coronas) c.wake(false);
    this.bat.visible = false;
    this.followTimer = 0;
    this.emit("cut");
    this.setState(GAME_STATE.GAMEOVER);
  }

  win() {
    this.setState(GAME_STATE.WIN);
  }

  restart() {
    this.resetRound();
    this.startInitAnimation();
  }

  // ---------------------------------------------------------------- input --
  onClick() {
    if (this.state === GAME_STATE.LOADING) return;
    if (!this.input.locked) this.input.lock();

    if (this.paused) {
      this.setPaused(false);
      return;
    }
    switch (this.state) {
      case GAME_STATE.WAIT_PLAYER:
        this.startInitAnimation();
        break;
      case GAME_STATE.WIN:
      case GAME_STATE.GAMEOVER:
        if (this.stateTime > GAME.RESTART_DELAY) this.restart();
        break;
      case GAME_STATE.GAMEPLAY:
        if (this.input.locked && this.bat.swing()) {
          this.audio.playWhoosh({ volume: GAME.SWING_VOLUME });
          this.emit("swing");
        }
        break;
    }
  }

  onUnlock() {
    if (
      this.state === GAME_STATE.GAMEPLAY ||
      this.state === GAME_STATE.INIT_ANIMATION
    )
      this.setPaused(true);
  }

  onLock() {
    if (this.paused) this.setPaused(false);
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.emit("pause", paused);
  }

  // ------------------------------------------------------------- coronas ---
  addCorona(position, awake) {
    const corona = new Corona(this, position, awake);
    this.coronas.push(corona);
    this.coronaGroup.add(corona.group);
    this.emit("remaining", this.remaining);
    return corona;
  }

  removeCoronaVisual(corona) {
    this.coronaGroup.remove(corona.group);
    corona.dispose();
  }

  canSpawnCorona() {
    return this.coronas.length < GAME.NUMBER_OF_MAX_SPAWNS;
  }

  reproduce(parent) {
    if (!this.canSpawnCorona()) return;
    const child = this.addCorona(parent.position, parent.awake);
    child.orientation.copy(parent.orientation).negate();
    this.particles.burst(_v.copy(parent.position), FX.spawn);
    this.emit("coronaSpawn", child);
  }

  // A lunging corona touching the player "chest".
  checkCoronaHitsPlayer(corona) {
    if (this.state !== GAME_STATE.GAMEPLAY) return false;
    const eyeY = this.player.position.y + PLAYER.EYE_HEIGHT;
    _a.copy(this.player.position).setY(eyeY - PLAYER.CHEST_HALF_HEIGHT);
    _b.copy(this.player.position).setY(eyeY + PLAYER.CHEST_HALF_HEIGHT);
    if (
      distanceToSegment(corona.position, _a, _b) >
      CORONA.RADIUS + PLAYER.CHEST_RADIUS
    )
      return false;
    const damage = randInt(PLAYER.DAMAGE_MIN, PLAYER.DAMAGE_MAX);
    this.player.damage(damage);
    this.glitch = GAME.GLITCH_DURATION;
    this.damageFx = 1;
    this.rig.addShake(GAME.SHAKE_PLAYER_HIT);
    this.audio.play(Math.random() > 0.5 ? "playerHit" : "playerHit2", {
      volume: GAME.PLAYER_HIT_VOLUME,
    });
    this.emit("life", this.player.life);
    this.emit("playerHit", damage);
    return true;
  }

  checkBatHits() {
    if (!this.bat.isAttacking) return;
    for (const c of this.coronas) {
      if (!c.canBeHit || c.lastSwing === this.bat.swingId) continue;
      if (distanceToSweptBat(c.position, this.bat) > CORONA.RADIUS + BAT.RADIUS)
        continue;
      c.lastSwing = this.bat.swingId;
      const damage = getRandDamage(BAT.CRIT_CHANCE, BAT.STRONG_CHANCE);
      if (!c.hit(damage, this.playerEye)) continue;
      const killed = !c.alive;
      // impact scales with the damage: pitch, shake, hit-stop, POW, popup
      this.audio.play(Math.random() > 0.5 ? "coronaHit" : "coronaHit2", {
        volume: GAME.CORONA_HIT_VOLUME,
        rate: GAME.HIT_PITCH_BASE + GAME.HIT_PITCH_STEP * damage,
      });
      this.rig.addShake(
        killed
          ? GAME.SHAKE_KILL
          : GAME.SHAKE_BAT_HIT + GAME.SHAKE_BAT_DAMAGE * (damage - 1)
      );
      this.hitStop = Math.max(
        this.hitStop,
        killed ? GAME.HIT_STOP_KILL : GAME.HIT_STOP
      );
      this.particles.burst(c.position, killed ? FX.kill : FX.hit);
      this.particles.burst(c.position, { ...FX.spark, shape: 1 });
      const popupAt = _v.copy(c.position).setY(c.position.y + 0.6);
      this.popups.spawn(
        killed ? "kill" : String(Math.min(3, damage)),
        popupAt,
        {
          size: GAME.DAMAGE_POPUP_SIZE * (killed ? 1.4 : 0.8 + 0.2 * damage),
          duration: GAME.DAMAGE_POPUP_DURATION,
          rise: GAME.DAMAGE_POPUP_RISE,
        }
      );
      this.emit("coronaHit", c);
    }
  }

  // Visual tunables edited in the settings panel, applied even when paused.
  applyLiveConfig() {
    this.level.applyConfig();
    for (const c of this.coronas) c.applyLook();
    this.bat.applyLook(this.player.hitTimer);
  }

  // --------------------------------------------------------------- update --
  update(dt) {
    if (this.state === GAME_STATE.LOADING) return;
    // mouse look works even while paused frames are rendered
    const [dx, dy] = this.input.consumeMouse();
    if (!this.paused && this.input.locked && this.playerActive)
      this.rig.look(dx, dy);
    if (this.paused) {
      this.applyLiveConfig();
      this.updateCamera(0);
      return;
    }

    // hit-stop: the world slows down for a few frames on a bat impact, while
    // the camera, the effects and the popups keep the real time
    const worldDt = this.hitStop > 0 ? dt * GAME.HIT_STOP_SCALE : dt;
    this.hitStop = Math.max(0, this.hitStop - dt);

    this.time += worldDt;
    this.stateTime += dt;
    this.level.update(dt, this.settings);
    this.glitch = Math.max(0, this.glitch - dt);
    this.damageFx = Math.max(0, this.damageFx - dt * GAME.DAMAGE_FLASH_DECAY);

    // player
    if (this.playerActive) {
      const events = this.player.update(worldDt, this.input, this.rig.yaw);
      if (events.jumped) this.audio.play("jump", { volume: GAME.JUMP_VOLUME });
      if (events.landed > PLAYER.LANDING_IMPACT_SPEED) {
        this.rig.addShake(Math.min(GAME.SHAKE_LANDING_MAX, events.landed / 80));
        this.particles.burst(
          _v
            .copy(this.player.position)
            .setY(this.player.position.y - PLAYER.RADIUS * 0.8),
          {
            ...FX.landing,
            count: Math.min(FX.landing.count, Math.floor(events.landed / 2)),
          }
        );
      }
    }
    this.player.getEyePosition(this.playerEye);

    // coronas
    for (const c of this.coronas) c.update(worldDt);
    separateCoronas(this.coronas);
    let removed = false;
    for (let i = this.coronas.length - 1; i >= 0; i--) {
      if (this.coronas[i].removed) {
        this.removeCoronaVisual(this.coronas[i]);
        this.coronas.splice(i, 1);
        removed = true;
      }
    }
    if (removed) this.emit("remaining", this.remaining);

    // camera + bat
    this.updateCamera(dt);
    if (this.playerActive) {
      this.bat.update(worldDt, this.player.hitTimer);
      this.bat.updateSegment();
      this.checkBatHits();
    }
    this.particles.sizeScale = this.settings.particleScale;
    this.particles.update(worldDt);
    this.popups.update(dt);

    // state transitions
    switch (this.state) {
      case GAME_STATE.INIT_ANIMATION:
        if (this.stateTime >= GAME.INIT_ANIMATION_DURATION)
          this.startGameplay();
        break;
      case GAME_STATE.GAMEPLAY:
        if (this.coronas.length === 0) this.win();
        else if (
          this.player.life <= 0 ||
          this.player.position.y < PLAYER.KILL_Y
        )
          this.gameOver();
        break;
    }
  }

  updateCamera(dt) {
    const cam = this.camera;
    const boost = this.playerActive && this.input.boost;
    this.rig.update(dt, boost);

    switch (this.state) {
      case GAME_STATE.WAIT_PLAYER:
      case GAME_STATE.GAMEOVER:
        this.followCorona(dt);
        break;
      case GAME_STATE.INIT_ANIMATION: {
        const t = easeInOutCubic(
          clamp(this.stateTime / GAME.INIT_ANIMATION_DURATION, 0, 1)
        );
        cam.position.lerpVectors(this.initFrom.position, this.playerEye, t);
        this.rig.applyRotation();
        _q.copy(cam.quaternion);
        cam.quaternion.slerpQuaternions(this.initFrom.quaternion, _q, t);
        break;
      }
      default:
        cam.position.copy(this.playerEye).add(this.rig.shakeOffset);
        this.rig.applyRotation();
    }
  }

  // Pre-game camera: follows a random corona, switching every 3 seconds.
  followCorona(dt) {
    const alive = this.coronas.filter((c) => c.alive);
    if (!alive.length) return;
    this.followTimer -= dt;
    if (this.followTimer <= 0 || !alive[this.followIndex]) {
      this.followTimer = GAME.PREGAME_CAMERA_SWITCH;
      this.followIndex = Math.floor(Math.random() * alive.length);
      const c = alive[this.followIndex];
      this.camera.position.set(
        c.position.x - GAME.ATTRACT_DISTANCE * c.orientation.x,
        c.position.y + GAME.ATTRACT_HEIGHT,
        c.position.z - GAME.ATTRACT_DISTANCE * c.orientation.z
      );
      this.emit("cut");
    }
    const c = alive[this.followIndex];
    _target.set(
      c.position.x - GAME.ATTRACT_DISTANCE * c.orientation.x,
      c.position.y + GAME.ATTRACT_HEIGHT,
      c.position.z - GAME.ATTRACT_DISTANCE * c.orientation.z
    );
    this.camera.position.lerp(_target, damp60(GAME.ATTRACT_SMOOTHING, dt));
    this.camera.lookAt(c.position);
    _v.copy(this.camera.position);
    this.rig.lookAt(_v, c.position);
  }

  // Values driving the post-processing effects.
  getEffects() {
    const fx = { glitch: 0, water: 0, damage: this.damageFx, speedLines: 0 };
    if (this.glitch > 0) fx.glitch = GAME.GLITCH_STRENGTH;
    if (this.state === GAME_STATE.GAMEPLAY || this.state === GAME_STATE.WIN) {
      const y = this.player.position.y;
      if (y <= 0) {
        const k = GAME.VOID_EFFECT_SCALE;
        fx.water = -y * k;
        fx.vignetteOffset = GAME.VOID_VIGNETTE_OFFSET + y * k;
        fx.vignetteDarkness = GAME.VOID_VIGNETTE_DARKNESS - y * k;
      }
      const v = this.player.speed;
      const th = PLAYER.SPEED_LINES_THRESHOLD;
      if (v > th) fx.speedLines = Math.min(1, (v - th) / th);
    }
    return fx;
  }
}
