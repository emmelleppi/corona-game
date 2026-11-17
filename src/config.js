// Gameplay constants. Durations are expressed in seconds, speeds in units/s.

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
  INIT_POSITION: [0, 30, 10],
  // Below this height the game is over (old "floor" plane).
  KILL_Y: -100,
  HIT_FEEDBACK_DURATION: 0.5,
  // Speed above which the speed lines appear.
  SPEED_LINES_THRESHOLD: 14,
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
};

export const CORONA = {
  LIFE: 3,
  RADIUS: 0.5,
  Y_AXIS: 1,
  RENDER_SCALE: 0.4,
  ORIENTATION_THRESHOLD: 0.5,
  SEEK_ALERT_DURATION: 2,
  PREATTACK_DURATION: 1,
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
  KNOCKBACK: 1.3,
  STEERING_INTERVAL: 0.25,
  LOOK_AHEAD: 1,
};

export const GAME = {
  NUMBER_OF_INIT_SPAWNS: 20,
  NUMBER_OF_MAX_SPAWNS: 40,
  INIT_ANIMATION_DURATION: 1,
  PREGAME_CAMERA_SWITCH: 3,
};

export const TRAMPOLINE = {
  RADIUS: 1,
  // Top of the start platform, right below the player.
  TOP: PLAYER.INIT_POSITION[1] - 0.5,
  THICKNESS: 0.3,
};

export const COLORS = {
  BACKGROUND: 0x3b163a,
  MAP_INNER: 0xffffff,
  MAP_OUTER: 0x5c3841,
  CORONA: 0x1e9983,
  CORONA_DEAD: 0xff0000,
  BAT_METAL: 0xb8b5c3,
  BAT_METAL_HIT: 0x76747e,
  BAT_HANDLE: 0x454194,
  BAT_HANDLE_HIT: 0x740000,
  HEART: 0xff0000,
};
