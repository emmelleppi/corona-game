// Gameplay constants. Durations are expressed in seconds, speeds in units/s.
// These objects are mutable and always read at use time: the settings panel
// (src/ui/Gui.js) tunes them live and src/ui/tuning.js persists the changes.

export const PLAYER = {
  INITIAL_LIFE: 100,
  RADIUS: 0.5,
  // Height of the eyes (camera) above the centre of the rolling body.
  EYE_HEIGHT: 0.75,
  // Rolling speed: angular velocity (28 rad/s) * radius (0.5) of the old physics body.
  SPEED: 14,
  BOOST_FACTOR: 2.5,
  GROUND_ACCELERATION: 26,
  AIR_ACCELERATION: 8,
  LINEAR_DAMPING: 0.1,
  GRAVITY: 40,
  JUMP_IMPULSE: 16,
  // Horizontal kick applied in the movement direction when jumping.
  JUMP_FORWARD_IMPULSE: 16,
  COYOTE_TIME: 0.12,
  // Minimum normal.y of a surface the player can stand (and jump) on.
  GROUND_NORMAL_Y: 0.6,
  INIT_POSITION: [0, 30, 10],
  // Below this height the game is over (old "floor" plane).
  KILL_Y: -100,
  HIT_FEEDBACK_DURATION: 0.5,
  // Speed above which the speed lines appear (full at twice this value).
  SPEED_LINES_THRESHOLD: 14,
  // Damage received from a corona lunge (uniform integer range).
  DAMAGE_MIN: 1,
  DAMAGE_MAX: 5,
  // "Chest" capsule hit by the coronas, around the eyes.
  CHEST_RADIUS: 0.2,
  CHEST_HALF_HEIGHT: 0.25,
  // Fall speed above which landing shakes the camera and raises dust.
  LANDING_IMPACT_SPEED: 12,
};

export const BAT = {
  // The hit capsule is longer than the visual bat, like the old physic box (1.5).
  REACH_HALF_LENGTH: 0.75,
  RADIUS: 0.05,
  // Swing keyframes, in seconds (they were frames at 60fps: 1, 5, 15, 90).
  SWING_INIT: 1 / 60,
  SWING_HALF: 5 / 60,
  SWING_END: 15 / 60,
  SWING_IDLE: 90 / 60,
  // Damage dealt: 3 with CRIT_CHANCE, 2 with STRONG_CHANCE, 1 otherwise.
  CRIT_CHANCE: 0.2,
  STRONG_CHANCE: 0.2,
  // First person placement of the bat (camera space).
  POSITION_X: 0.1,
  POSITION_Y: -0.3,
  POSITION_Z: -0.5,
  IDLE_WOBBLE_SPEED: 6,
  IDLE_WOBBLE_AMOUNT: 1 / 6,
  // swing spring (react-spring like tension / friction)
  SPRING_TENSION: 210,
  SPRING_FRICTION: 10,
  METAL_SPECULAR: 1.5,
  HANDLE_SPECULAR: 0.3,
};

export const CORONA = {
  LIFE: 3,
  RADIUS: 0.5,
  Y_AXIS: 1,
  RENDER_SCALE: 0.4,
  ORIENTATION_THRESHOLD: 0.5,
  SEEK_ALERT_DURATION: 2,
  PREATTACK_DURATION: 1,
  // Telegraphed wind-up before the first lunge of a chase (it used to lunge
  // with no warning as soon as it was in range).
  FIRST_WINDUP: 0.45,
  // last fraction of a wind-up with the anticipation squash and warning flash
  WINDUP_TELEGRAPH: 0.6,
  WINDUP_SQUASH: 0.25,
  WINDUP_FLASH: 0.8,
  WINDUP_ALERT_PITCH: 1.6,
  // a wind-up is abandoned only past ATTACK_DISTANCE * this (hysteresis)
  WINDUP_LEAVE_FACTOR: 1.5,
  // minimum time between two wind-up alert sounds of the same corona
  WINDUP_ALERT_COOLDOWN: 1.5,
  ATTACK_DURATION: 0.2,
  UNDER_ATTACK_DURATION: 0.3,
  SPAWN_ANIMATION_DURATION: 3,
  SPAWN_INTERVAL: 10,
  DEATH_DURATION: 1.6,
  IDLE_VELOCITY: 1.2,
  SEEK_VELOCITY: 2,
  ATTACK_DISTANCE: 2,
  // Distance at which an idle corona notices the player (it was a quadtree cell).
  SEEK_DISTANCE: 16,
  // A seeking corona gives up when the player is farther than this factor.
  LOSE_DISTANCE_FACTOR: 1.4,
  THINK_INTERVAL: 0.25,
  STEERING_INTERVAL: 0.25,
  LOOK_AHEAD: 1,
  // lunge: fraction of ATTACK_DISTANCE travelled, time to reach it, time to come back
  LUNGE_FACTOR: 0.8,
  LUNGE_TIME: 0.08,
  LUNGE_RETURN_TIME: 0.15,
  KNOCKBACK: 1.3,
  KNOCKBACK_TIME: 0.12,
  // strength of the push between overlapping coronas
  SEPARATION: 0.5,
  // "home run" when a corona dies
  DEATH_SPEED: 28,
  DEATH_UP_SPEED: 14,
  DEATH_SPIN: 12,
  DEATH_GRAVITY: 40,
  DEATH_BOUNCE: 0.45,
  // animation
  BOB_FREQUENCY: 10,
  BOB_AMPLITUDE: 0.5,
  SQUASH: 0.125,
  STRETCH: 0.1,
  PREATTACK_SPIN_SPEED: 4.2,
  SPAWN_SPIN_SPEED: 3,
  SPAWN_GROWTH: 1.5,
  HIT_FLASH_DECAY: 6,
  SPECULAR: 1,
  EXCLAMATION_HEIGHT: 2.5,
  EXCLAMATION_SIZE: 2,
  // POW size grows with the damage (1 -> min, 3 -> max)
  POW_SIZE_MIN: 1,
  POW_SIZE_MAX: 2,
};

export const GAME = {
  NUMBER_OF_INIT_SPAWNS: 20,
  NUMBER_OF_MAX_SPAWNS: 40,
  // No corona spawns closer than this to the start platform.
  SPAWN_EXCLUSION_RADIUS: 8,
  INIT_ANIMATION_DURATION: 1,
  PREGAME_CAMERA_SWITCH: 3,
  // pre-game camera, following a corona
  ATTRACT_DISTANCE: 2,
  ATTRACT_HEIGHT: 1,
  ATTRACT_SMOOTHING: 0.2,
  // ignore clicks on the win / game over screens for this long
  RESTART_DELAY: 0.5,
  // feedback when the player is hit
  GLITCH_DURATION: 0.3,
  GLITCH_STRENGTH: 0.5,
  DAMAGE_FLASH_DECAY: 1.8,
  // camera shake amounts (0..1)
  SHAKE_PLAYER_HIT: 0.6,
  SHAKE_BAT_HIT: 0.25,
  // extra shake per damage point above 1, and on a kill
  SHAKE_BAT_DAMAGE: 0.1,
  SHAKE_KILL: 0.6,
  // hit-stop: the world runs at HIT_STOP_SCALE speed for a moment on impact
  HIT_STOP: 0.05,
  HIT_STOP_KILL: 0.09,
  HIT_STOP_SCALE: 0.05,
  // floating damage numbers
  DAMAGE_POPUP_DURATION: 0.8,
  DAMAGE_POPUP_RISE: 1.2,
  DAMAGE_POPUP_SIZE: 0.5,
  SHAKE_LANDING_MAX: 0.5,
  SHAKE_DECAY: 2.5,
  SHAKE_AMPLITUDE: 0.08,
  // falling into the void: wobble/vignette growth per unit below the islands
  VOID_EFFECT_SCALE: 0.1,
  VOID_VIGNETTE_OFFSET: 0.95,
  VOID_VIGNETTE_DARKNESS: 1.6,
  // sound volumes
  ALERT_VOLUME: 0.7,
  PLAYER_HIT_VOLUME: 0.8,
  CORONA_HIT_VOLUME: 1,
  // bat hit sound pitch: base + step * damage
  HIT_PITCH_BASE: 0.8,
  HIT_PITCH_STEP: 0.15,
  SWING_VOLUME: 0.5,
  JUMP_VOLUME: 1,
  SPRINT_VOLUME: 1,
};

export const TRAMPOLINE = {
  RADIUS: 1,
  // The top of the start platform is this far below the spawn point.
  OFFSET: 0.5,
  THICKNESS: 0.3,
};

export const trampolineTop = () => PLAYER.INIT_POSITION[1] - TRAMPOLINE.OFFSET;

export const COLORS = {
  MAP_INNER: 0xffffff,
  MAP_OUTER: 0x5c3841,
  CORONA: 0x1e9983,
  CORONA_DEAD: 0xff0000,
  CORONA_FLASH: 0xffffff,
  CORONA_WARNING: 0xff3355,
  BAT_METAL: 0xb8b5c3,
  BAT_METAL_HIT: 0x76747e,
  BAT_HANDLE: 0x454194,
  BAT_HANDLE_HIT: 0x740000,
  HEART: 0xff0000,
  PAD: 0x2a2233,
  PAD_GLOW: 0xff4fb0,
};

// Particle bursts.
export const FX = {
  hit: {
    count: 16,
    speed: 6,
    up: 3,
    size: 0.15,
    life: 0.5,
    gravity: 12,
    drag: 2,
    colors: [0x1e9983, 0x9dffe6, 0xffffff],
  },
  kill: {
    count: 40,
    speed: 10,
    up: 3,
    size: 0.22,
    life: 0.9,
    gravity: 12,
    drag: 2,
    colors: [0xff2a2a, 0xffd23f, 0xffffff],
  },
  spark: {
    count: 6,
    speed: 4,
    up: 2,
    size: 0.5,
    life: 0.35,
    gravity: 0,
    drag: 2,
    colors: [0xfff3a0],
  },
  spawn: {
    count: 18,
    speed: 6,
    up: 2,
    size: 0.25,
    life: 0.6,
    gravity: 12,
    drag: 2,
    colors: [0x1e9983, 0x7affd8, 0xffffff],
  },
  landing: {
    count: 24,
    speed: 5,
    up: 0.5,
    size: 0.3,
    life: 0.5,
    gravity: 2,
    drag: 2,
    colors: [0xe8d8f0],
  },
};
