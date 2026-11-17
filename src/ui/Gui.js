import GUI from "lil-gui";
import {
  AA_MODES,
  DEBUG_VIEW_NAMES,
  TONE_MAPPING_NAMES,
} from "../render/Pipeline.js";
import {
  saveSettings,
  resetSettings,
  diffSettings,
  applySettings,
} from "./settings.js";
import {
  TUNABLES,
  saveTuning,
  resetTuning,
  tuningDiff,
  applyTuning,
} from "./tuning.js";

const { PLAYER, BAT, CORONA, GAME, COLORS, TRAMPOLINE, FX } = TUNABLES;

export const QUALITY_PRESETS = {
  Low: {
    antialiasing: "FXAA",
    renderScale: 0.75,
    maxPixelRatio: 1,
    shadows: true,
    shadowResolution: 1024,
    bloom: true,
    bloomLevels: 4,
  },
  Medium: {
    antialiasing: "TAA",
    renderScale: 1,
    maxPixelRatio: 1.5,
    shadows: true,
    shadowResolution: 2048,
    bloom: true,
    bloomLevels: 5,
  },
  High: {
    antialiasing: "TAA",
    renderScale: 1,
    maxPixelRatio: 2,
    shadows: true,
    shadowResolution: 2048,
    bloom: true,
    bloomLevels: 6,
  },
  Ultra: {
    antialiasing: "TAA + FXAA",
    renderScale: 1.25,
    maxPixelRatio: 2,
    shadows: true,
    shadowResolution: 4096,
    bloom: true,
    bloomLevels: 6,
  },
};

// Everything the user can change, serialised (only the values that differ
// from the defaults).
export const exportConfig = (settings) => ({
  version: 1,
  settings: diffSettings(settings),
  tuning: tuningDiff(),
});

export function importConfig(settings, config) {
  if (!config || typeof config !== "object") throw new Error("Invalid config");
  applySettings(settings, config.settings);
  applyTuning(config.tuning);
  saveSettings(settings);
  saveTuning();
}

const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
export const decodeConfig = (text) =>
  JSON.parse(decodeURIComponent(escape(atob(text))));

// Settings panel (toggle with G). Every change is applied live and persisted
// in localStorage: render settings and gameplay tuning separately.
export function createGui(settings, { onResize, game }) {
  const gui = new GUI({ title: "Settings  ·  G", width: 320 });
  gui.close();
  gui.domElement.classList.add("game-gui");

  gui.onChange(() => {
    saveSettings(settings);
    saveTuning();
  });

  // ---- helpers -------------------------------------------------------------
  const num = (folder, obj, key, min, max, step, name) =>
    folder.add(obj, key, min, max, step).name(name ?? key);
  const col = (folder, obj, key, name) =>
    folder.addColor(obj, key).name(name ?? key);
  const bool = (folder, obj, key, name) =>
    folder.add(obj, key).name(name ?? key);
  const folder = (parent, name) => parent.addFolder(name).close();
  const refresh = () =>
    gui.controllersRecursive().forEach((c) => c.updateDisplay());

  // ---- presets & tools -------------------------------------------------------
  const tools = folder(gui, "⚙ Presets & tools");
  const presetState = { quality: "High" };
  tools
    .add(presetState, "quality", Object.keys(QUALITY_PRESETS))
    .name("quality preset")
    .onChange((name) => {
      Object.assign(settings, QUALITY_PRESETS[name]);
      refresh();
      onResize();
    });
  const actions = {
    copyJson: async () => {
      const text = JSON.stringify(exportConfig(settings), null, 2);
      try {
        await navigator.clipboard.writeText(text);
        flash("copied to clipboard");
      } catch {
        window.prompt("Copy the configuration", text);
      }
    },
    download: () => {
      const blob = new Blob([JSON.stringify(exportConfig(settings), null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kill-da-corona-config.json";
      a.click();
      URL.revokeObjectURL(a.href);
    },
    paste: () => {
      const text = window.prompt("Paste a configuration (JSON)");
      if (!text) return;
      try {
        importConfig(settings, JSON.parse(text));
        refresh();
        onResize();
        flash("configuration imported");
      } catch (e) {
        flash(`invalid configuration: ${e.message}`);
      }
    },
    shareLink: async () => {
      const url = `${location.origin}${location.pathname}#config=${encode(
        exportConfig(settings)
      )}`;
      try {
        await navigator.clipboard.writeText(url);
        flash("share link copied");
      } catch {
        window.prompt("Share link", url);
      }
    },
    resetAll: () => {
      resetSettings(settings);
      resetTuning();
      refresh();
      onResize();
      flash("defaults restored");
    },
    restartRound: () => game.restart(),
  };
  tools.add(actions, "copyJson").name("copy config (JSON)");
  tools.add(actions, "download").name("download config");
  tools.add(actions, "paste").name("import config");
  tools.add(actions, "shareLink").name("copy share link");
  tools.add(actions, "resetAll").name("reset everything");
  tools.add(actions, "restartRound").name("restart round");

  // ---- rendering ---------------------------------------------------------------
  const render = folder(gui, "🎨 Rendering");

  const aa = folder(render, "Resolution & anti-aliasing");
  aa.add(settings, "antialiasing", AA_MODES).name("anti-aliasing");
  num(
    aa,
    settings,
    "renderScale",
    0.25,
    2,
    0.05,
    "render scale"
  ).onFinishChange(onResize);
  num(
    aa,
    settings,
    "maxPixelRatio",
    0.5,
    3,
    0.25,
    "max pixel ratio"
  ).onFinishChange(onResize);
  num(aa, settings, "taaFeedback", 0.5, 0.99, 0.01, "TAA feedback");
  num(aa, settings, "taaVarianceGamma", 0.25, 3, 0.05, "TAA clip gamma");
  num(aa, settings, "taaMotionFeedback", 0.3, 1, 0.01, "TAA motion feedback");
  num(aa, settings, "taaMotionPixels", 1, 100, 1, "TAA motion px");
  num(aa, settings, "taaJitterSamples", 1, 32, 1, "TAA jitter samples");
  num(aa, settings, "taaJitterScale", 0, 2, 0.05, "TAA jitter scale");
  num(aa, settings, "sharpen", 0, 1.5, 0.05, "TAA sharpen");
  num(aa, settings, "fxaaEdgeMin", 0, 0.2, 0.001, "FXAA edge min");
  num(aa, settings, "fxaaEdgeMax", 0, 0.5, 0.005, "FXAA edge max");
  num(aa, settings, "fxaaSubpixel", 0, 1, 0.05, "FXAA subpixel");

  const shadows = folder(render, "Shadows");
  bool(shadows, settings, "shadows", "enabled");
  shadows
    .add(settings, "shadowResolution", [512, 1024, 2048, 4096])
    .name("map size");
  num(shadows, settings, "shadowExtent", 10, 150, 1, "extent");
  num(shadows, settings, "shadowDistance", 50, 400, 5, "light distance");
  num(shadows, settings, "shadowBias", 0, 0.005, 0.0001, "bias");
  num(shadows, settings, "shadowNormalOffset", 0, 0.5, 0.01, "normal offset");
  num(shadows, settings, "shadowSlopeOffset", 0, 0.5, 0.01, "slope offset");
  num(shadows, settings, "shadowSoftness", 0.01, 0.5, 0.01, "softness");

  const toon = folder(render, "Toon shading");
  num(toon, settings, "worldBands", 1, 8, 1, "world bands");
  num(toon, settings, "characterBands", 1, 8, 1, "character bands");
  num(toon, settings, "bandSoftness", 0, 0.5, 0.01, "band softness");
  num(toon, settings, "specular", 0, 3, 0.05);
  num(toon, settings, "shininess", 2, 256, 1);
  num(toon, settings, "specularSize", 0.005, 0.5, 0.005, "specular size");
  num(toon, settings, "rim", 0, 3, 0.05);
  col(toon, settings, "rimColor", "rim color");
  num(toon, settings, "rimThreshold", 0, 1, 0.01, "rim threshold");
  num(toon, settings, "rimWidth", 0.001, 0.5, 0.005, "rim width");
  num(toon, settings, "hitFlashEmissive", 0, 5, 0.1, "hit flash glow");

  const outline = folder(render, "Outlines");
  bool(outline, settings, "outlines", "enabled");
  bool(outline, settings, "worldOutlines", "world outlines");
  num(outline, settings, "outlineWidth", 0.25, 6, 0.05, "width");
  col(outline, settings, "outlineColor", "color");
  num(outline, settings, "depthThreshold", 0.005, 1, 0.005, "depth threshold");
  num(
    outline,
    settings,
    "normalThreshold",
    0.01,
    1.5,
    0.01,
    "normal threshold"
  );
  num(outline, settings, "edgeSoftness", 0, 4, 0.05, "edge softness");
  num(outline, settings, "silhouetteBias", 0, 0.05, 0.0005, "silhouette bias");
  num(outline, settings, "outlineFogFade", 0, 1, 0.01, "fog fade");

  const light = folder(render, "Lights");
  col(light, settings, "background");
  col(light, settings, "sunColor", "sun color");
  num(light, settings, "sunIntensity", 0, 4, 0.05, "sun intensity");
  num(light, settings, "sunElevation", 5, 90, 1, "sun elevation");
  num(light, settings, "sunAzimuth", -180, 180, 1, "sun azimuth");
  num(light, settings, "ambientIntensity", 0, 3, 0.05, "ambient");
  col(light, settings, "skyAmbient", "sky ambient");
  col(light, settings, "groundAmbient", "ground ambient");
  num(light, settings, "ambientBias", -1, 1, 0.05, "ambient bias");
  col(light, settings, "shadowTint", "shadow tint");
  col(light, settings, "discoColorA", "disco light A");
  col(light, settings, "discoColorB", "disco light B");
  num(light, settings, "discoIntensity", 0, 3, 0.05, "disco intensity");
  num(light, settings, "discoSpeed", 0, 5, 0.05, "disco speed");
  num(light, settings, "discoElevation", 0, 89, 1, "disco elevation");
  num(light, settings, "discoBands", 1, 8, 1, "disco bands");

  const fog = folder(render, "Fog");
  bool(fog, settings, "fog", "enabled");
  col(fog, settings, "fogColor", "color");
  num(fog, settings, "fogNear", 0, 200, 1, "near");
  num(fog, settings, "fogFar", 1, 400, 1, "far");

  const post = folder(render, "Post-processing");
  post.add(settings, "toneMapping", TONE_MAPPING_NAMES).name("tone mapping");
  num(post, settings, "exposure", 0.1, 4, 0.05);
  num(post, settings, "saturation", 0, 2.5, 0.05);
  num(post, settings, "contrast", 0.5, 1.8, 0.01);
  bool(post, settings, "bloom");
  num(post, settings, "bloomStrength", 0, 3, 0.05, "bloom strength");
  num(post, settings, "bloomThreshold", 0, 4, 0.05, "bloom threshold");
  num(post, settings, "bloomKnee", 0, 1, 0.05, "bloom knee");
  num(post, settings, "bloomRadius", 0.25, 4, 0.05, "bloom radius");
  num(post, settings, "bloomLevels", 1, 6, 1, "bloom levels");
  num(post, settings, "bloomMipWeight", 0, 2, 0.05, "bloom mip weight");
  num(
    post,
    settings,
    "chromaticAberration",
    0,
    0.02,
    0.0005,
    "chromatic aberr."
  );
  num(post, settings, "vignetteOffset", 0, 2, 0.05, "vignette offset");
  num(post, settings, "vignetteDarkness", 0, 2.5, 0.05, "vignette darkness");
  col(post, settings, "vignetteColor", "vignette tint");
  num(post, settings, "grain", 0, 1, 0.01, "film grain");
  num(post, settings, "scanlines", 0, 0.3, 0.005);
  num(post, settings, "scanlineFrequency", 0.1, 4, 0.05, "scanline freq.");
  num(post, settings, "dither", 0, 4, 0.1);

  const sprites = folder(render, "Sprites & particles");
  num(sprites, settings, "particleScale", 0.1, 4, 0.05, "particle size");
  num(sprites, settings, "particleEdge", 0.01, 1, 0.01, "particle edge");
  num(sprites, settings, "particleCore", 0, 4, 0.05, "particle core glow");
  num(
    sprites,
    settings,
    "particleSoftness",
    0.01,
    2,
    0.01,
    "particle soft depth"
  );
  num(
    sprites,
    settings,
    "billboardSoftness",
    0.01,
    2,
    0.01,
    "sprite soft depth"
  );
  for (const [name, burst] of Object.entries(FX)) {
    const f = folder(sprites, `burst: ${name}`);
    num(f, burst, "count", 0, 120, 1);
    num(f, burst, "speed", 0, 40, 0.5);
    num(f, burst, "up", 0, 20, 0.5);
    num(f, burst, "size", 0.01, 2, 0.01);
    num(f, burst, "life", 0.05, 4, 0.05);
    num(f, burst, "gravity", -20, 60, 0.5);
    num(f, burst, "drag", 0, 10, 0.1);
    burst.colors.forEach((_, i) => col(f, burst.colors, i, `color ${i + 1}`));
  }

  // ---- world -----------------------------------------------------------------------
  const world = folder(gui, "🏝 World");

  const islands = folder(world, "Islands");
  col(islands, COLORS, "MAP_INNER", "tiles color");
  col(islands, COLORS, "MAP_OUTER", "border color");
  num(islands, settings, "tileSize", 0.25, 10, 0.05, "tile size");
  num(islands, settings, "tileVariation", 0, 0.5, 0.01, "tile variation");
  num(islands, settings, "checkerDarken", 0, 0.5, 0.01, "checker");
  num(islands, settings, "groutWidth", 0, 0.3, 0.005, "grout width");
  col(islands, settings, "groutColor", "grout color");
  num(islands, settings, "borderBrightness", 0, 3, 0.05, "border brightness");
  num(islands, settings, "borderNoise", 0, 1, 0.01, "border noise");
  num(islands, settings, "borderDots", 0, 1, 0.01, "border dots");
  num(islands, settings, "borderDotsBrightness", 0, 3, 0.05, "dots brightness");
  num(islands, settings, "cliffBrightness", 0, 4, 0.05, "cliff brightness");
  col(islands, settings, "cliffBottomColor", "cliff bottom");
  num(islands, settings, "cliffDarkening", 0, 1, 0.01, "cliff darkening");
  num(islands, settings, "sedimentFrequency", 0, 5, 0.05, "sediment freq.");
  num(islands, settings, "sedimentContrast", 0, 1, 0.01, "sediment contrast");
  col(islands, settings, "undersideColor", "underside");

  const pad = folder(world, "Start platform");
  col(pad, COLORS, "PAD", "color");
  col(pad, COLORS, "PAD_GLOW", "glow color");
  num(pad, settings, "padGlow", 0, 6, 0.05, "glow");
  num(pad, settings, "padBaseGlow", 0, 2, 0.01, "base glow");
  num(pad, settings, "padPulseSpeed", 0, 20, 0.1, "pulse speed");
  num(pad, TRAMPOLINE, "RADIUS", 0.3, 5, 0.05, "radius");
  num(pad, TRAMPOLINE, "THICKNESS", 0.05, 2, 0.05, "thickness");
  num(pad, TRAMPOLINE, "OFFSET", 0.3, 3, 0.05, "top below spawn");
  num(pad, PLAYER.INIT_POSITION, 0, -50, 50, 0.5, "spawn x");
  num(pad, PLAYER.INIT_POSITION, 1, 2, 80, 0.5, "spawn y");
  num(pad, PLAYER.INIT_POSITION, 2, -80, 80, 0.5, "spawn z");

  const sky = folder(world, "Sky");
  col(sky, settings, "skyTop", "top");
  col(sky, settings, "skyHorizon", "horizon");
  num(sky, settings, "skyGradientLow", -1, 1, 0.01, "gradient start");
  num(sky, settings, "skyGradientHigh", -1, 1, 0.01, "gradient end");
  col(sky, settings, "skyText", "slogan");
  col(sky, settings, "skyTextOutline", "slogan outline");
  num(sky, settings, "sloganRepeats", 1, 12, 1, "slogan repeats");
  num(sky, settings, "sloganHeight", 0.1, 2, 0.01, "slogan height");
  num(sky, settings, "sloganScroll", -0.2, 0.2, 0.005, "slogan scroll");
  num(sky, settings, "sloganShimmer", 0, 1, 0.01, "slogan shimmer");
  num(sky, settings, "sloganInterval", 0.5, 15, 0.1, "slogan interval");
  num(sky, settings, "sloganFadeSpeed", 0.2, 10, 0.1, "slogan fade speed");
  num(sky, settings, "sparkleScale", 2, 120, 1, "sparkle grid");
  num(sky, settings, "sparkleDensity", 0, 1, 0.01, "sparkle density");
  num(sky, settings, "sparkleSize", 0.01, 0.5, 0.005, "sparkle size");
  num(sky, settings, "sparkleIntensity", 0, 6, 0.05, "sparkle intensity");
  col(sky, settings, "sparkleColor", "sparkle color");

  // ---- gameplay ----------------------------------------------------------------------
  const play = folder(gui, "🎮 Gameplay");

  const rules = folder(play, "Rules");
  num(rules, GAME, "NUMBER_OF_INIT_SPAWNS", 1, 100, 1, "coronas at start");
  num(rules, GAME, "NUMBER_OF_MAX_SPAWNS", 1, 200, 1, "max coronas");
  num(rules, GAME, "SPAWN_EXCLUSION_RADIUS", 0, 40, 0.5, "no spawn radius");
  num(rules, PLAYER, "INITIAL_LIFE", 1, 1000, 1, "player life");
  num(rules, PLAYER, "DAMAGE_MIN", 0, 50, 1, "damage taken min");
  num(rules, PLAYER, "DAMAGE_MAX", 0, 50, 1, "damage taken max");
  num(rules, PLAYER, "KILL_Y", -500, -5, 1, "fall death height");
  num(rules, GAME, "RESTART_DELAY", 0, 3, 0.05, "restart delay");
  rules.add(actions, "restartRound").name("restart round");

  const player = folder(play, "Player");
  num(player, PLAYER, "SPEED", 1, 60, 0.5, "speed");
  num(player, PLAYER, "BOOST_FACTOR", 1, 6, 0.05, "boost factor");
  num(player, PLAYER, "GROUND_ACCELERATION", 1, 200, 1, "ground acceleration");
  num(player, PLAYER, "AIR_ACCELERATION", 0, 60, 0.5, "air control");
  num(player, PLAYER, "LINEAR_DAMPING", 0, 0.95, 0.01, "air drag");
  num(player, PLAYER, "GRAVITY", 1, 150, 1, "gravity");
  num(player, PLAYER, "JUMP_IMPULSE", 0, 60, 0.5, "jump");
  num(player, PLAYER, "JUMP_FORWARD_IMPULSE", 0, 60, 0.5, "jump forward kick");
  num(player, PLAYER, "COYOTE_TIME", 0, 0.5, 0.01, "coyote time");
  num(player, PLAYER, "GROUND_NORMAL_Y", 0, 1, 0.01, "max slope (normal y)");
  num(player, PLAYER, "RADIUS", 0.1, 2, 0.05, "body radius");
  num(player, PLAYER, "EYE_HEIGHT", 0, 3, 0.05, "eye height");
  num(player, PLAYER, "CHEST_RADIUS", 0, 2, 0.05, "hit box radius");
  num(player, PLAYER, "CHEST_HALF_HEIGHT", 0, 2, 0.05, "hit box half height");
  num(player, PLAYER, "HIT_FEEDBACK_DURATION", 0, 3, 0.05, "hit feedback time");
  num(player, PLAYER, "LANDING_IMPACT_SPEED", 0, 80, 1, "landing impact speed");

  const bat = folder(play, "Baseball bat");
  num(bat, BAT, "REACH_HALF_LENGTH", 0.1, 3, 0.05, "reach");
  num(bat, BAT, "RADIUS", 0, 1, 0.01, "thickness");
  num(bat, BAT, "CRIT_CHANCE", 0, 1, 0.01, "3 damage chance");
  num(bat, BAT, "STRONG_CHANCE", 0, 1, 0.01, "2 damage chance");
  num(bat, BAT, "SWING_INIT", 0, 0.3, 0.005, "swing start");
  num(bat, BAT, "SWING_HALF", 0, 0.6, 0.005, "swing middle");
  num(bat, BAT, "SWING_END", 0.02, 1.5, 0.01, "swing end / cooldown");
  num(bat, BAT, "SWING_IDLE", 0.1, 5, 0.05, "idle after");
  num(bat, BAT, "SPRING_TENSION", 10, 1000, 5, "spring tension");
  num(bat, BAT, "SPRING_FRICTION", 0, 100, 0.5, "spring friction");
  num(bat, BAT, "POSITION_X", -1, 1, 0.01, "view x");
  num(bat, BAT, "POSITION_Y", -1, 1, 0.01, "view y");
  num(bat, BAT, "POSITION_Z", -2, 0, 0.01, "view z");
  num(bat, BAT, "IDLE_WOBBLE_SPEED", 0, 20, 0.1, "wobble speed");
  num(bat, BAT, "IDLE_WOBBLE_AMOUNT", 0, 1, 0.01, "wobble amount");
  num(bat, BAT, "METAL_SPECULAR", 0, 4, 0.05, "metal specular");
  num(bat, BAT, "HANDLE_SPECULAR", 0, 4, 0.05, "handle specular");
  col(bat, COLORS, "BAT_METAL", "metal");
  col(bat, COLORS, "BAT_HANDLE", "handle");
  col(bat, COLORS, "BAT_METAL_HIT", "metal (hit)");
  col(bat, COLORS, "BAT_HANDLE_HIT", "handle (hit)");

  const corona = folder(play, "Coronas");
  const ai = folder(corona, "Behaviour");
  num(ai, CORONA, "LIFE", 1, 20, 1, "life");
  num(ai, CORONA, "IDLE_VELOCITY", 0, 15, 0.1, "idle speed");
  num(ai, CORONA, "SEEK_VELOCITY", 0, 20, 0.1, "chase speed");
  num(ai, CORONA, "SEEK_DISTANCE", 0, 80, 0.5, "sight distance");
  num(ai, CORONA, "LOSE_DISTANCE_FACTOR", 1, 4, 0.05, "give up factor");
  num(ai, CORONA, "ATTACK_DISTANCE", 0.5, 10, 0.1, "attack distance");
  num(ai, CORONA, "SEEK_ALERT_DURATION", 0, 6, 0.1, "alert duration");
  num(ai, CORONA, "PREATTACK_DURATION", 0, 5, 0.05, "wind-up");
  num(ai, CORONA, "ATTACK_DURATION", 0.02, 2, 0.01, "attack duration");
  num(ai, CORONA, "LUNGE_FACTOR", 0, 2, 0.05, "lunge length");
  num(ai, CORONA, "LUNGE_TIME", 0.005, 1, 0.005, "lunge time");
  num(ai, CORONA, "LUNGE_RETURN_TIME", 0.005, 1, 0.005, "lunge return time");
  num(ai, CORONA, "SPAWN_INTERVAL", 0.5, 60, 0.5, "reproduce every");
  num(ai, CORONA, "SPAWN_ANIMATION_DURATION", 0.1, 10, 0.1, "reproduce time");
  num(ai, CORONA, "KNOCKBACK", 0, 10, 0.05, "knockback");
  num(ai, CORONA, "KNOCKBACK_TIME", 0.01, 1, 0.01, "knockback time");
  num(ai, CORONA, "UNDER_ATTACK_DURATION", 0, 2, 0.05, "hit stun (POW)");
  num(ai, CORONA, "THINK_INTERVAL", 0.02, 2, 0.01, "think interval");
  num(ai, CORONA, "STEERING_INTERVAL", 0.02, 2, 0.01, "steering interval");
  num(ai, CORONA, "LOOK_AHEAD", 0.1, 5, 0.05, "edge look ahead");
  num(ai, CORONA, "ORIENTATION_THRESHOLD", 0, 2, 0.05, "turn threshold");
  num(ai, CORONA, "SEPARATION", 0, 3, 0.05, "separation");
  num(ai, CORONA, "RADIUS", 0.1, 2, 0.05, "hit radius");

  const look = folder(corona, "Look & animation");
  col(look, COLORS, "CORONA", "color");
  col(look, COLORS, "CORONA_DEAD", "dead color");
  col(look, COLORS, "CORONA_FLASH", "hit flash color");
  num(look, CORONA, "SPECULAR", 0, 4, 0.05, "specular");
  num(look, CORONA, "RENDER_SCALE", 0.05, 2, 0.01, "size");
  num(look, CORONA, "Y_AXIS", 0, 5, 0.05, "float height");
  num(look, CORONA, "BOB_FREQUENCY", 0, 40, 0.5, "bob speed");
  num(look, CORONA, "BOB_AMPLITUDE", 0, 3, 0.05, "bob amplitude");
  num(look, CORONA, "SQUASH", 0, 1, 0.005, "squash");
  num(look, CORONA, "STRETCH", 0, 1, 0.005, "stretch");
  num(look, CORONA, "PREATTACK_SPIN_SPEED", 0, 20, 0.1, "wind-up spin");
  num(look, CORONA, "SPAWN_SPIN_SPEED", 0, 20, 0.1, "reproduce spin");
  num(look, CORONA, "SPAWN_GROWTH", 0, 5, 0.05, "reproduce growth");
  num(look, CORONA, "HIT_FLASH_DECAY", 0.5, 30, 0.5, "hit flash decay");
  num(look, CORONA, "EXCLAMATION_HEIGHT", 0, 8, 0.1, "'!' height");
  num(look, CORONA, "EXCLAMATION_SIZE", 0.1, 8, 0.1, "'!' size");
  num(look, CORONA, "POW_SIZE_MIN", 0.1, 6, 0.05, "POW min size");
  num(look, CORONA, "POW_SIZE_MAX", 0.1, 6, 0.05, "POW max size");

  const death = folder(corona, "Death");
  num(death, CORONA, "DEATH_DURATION", 0.1, 6, 0.05, "fade time");
  num(death, CORONA, "DEATH_SPEED", 0, 100, 1, "launch speed");
  num(death, CORONA, "DEATH_UP_SPEED", 0, 100, 1, "launch up");
  num(death, CORONA, "DEATH_SPIN", 0, 60, 0.5, "spin");
  num(death, CORONA, "DEATH_GRAVITY", 0, 150, 1, "gravity");
  num(death, CORONA, "DEATH_BOUNCE", 0, 1, 0.01, "bounce");

  const feedback = folder(play, "Feedback & effects");
  num(feedback, GAME, "GLITCH_DURATION", 0, 2, 0.05, "glitch duration");
  num(feedback, GAME, "GLITCH_STRENGTH", 0, 2, 0.05, "glitch strength");
  num(feedback, settings, "glitchShift", 0, 0.5, 0.005, "glitch shift");
  num(feedback, settings, "glitchSplit", 0, 0.1, 0.001, "glitch RGB split");
  num(feedback, settings, "glitchBands", 0, 100, 1, "glitch bands");
  col(feedback, settings, "damageColor", "damage color");
  num(feedback, settings, "damageOpacity", 0, 1, 0.01, "damage opacity");
  num(
    feedback,
    settings,
    "damageChromatic",
    0,
    0.05,
    0.0005,
    "damage aberration"
  );
  num(feedback, GAME, "DAMAGE_FLASH_DECAY", 0.1, 10, 0.1, "damage fade speed");
  num(feedback, GAME, "VOID_EFFECT_SCALE", 0, 1, 0.005, "falling effect");
  num(feedback, settings, "waterAmplitude", 0, 0.1, 0.001, "falling wobble");
  num(feedback, settings, "waterFrequency", 0, 30, 0.5, "wobble frequency");
  num(feedback, settings, "waterSpeed", 0, 20, 0.1, "wobble speed");
  bool(feedback, settings, "speedLines", "speed lines");
  num(
    feedback,
    PLAYER,
    "SPEED_LINES_THRESHOLD",
    0,
    80,
    0.5,
    "speed lines from"
  );
  col(feedback, settings, "speedLinesColor", "speed lines color");
  num(
    feedback,
    settings,
    "speedLinesOpacity",
    0,
    1,
    0.01,
    "speed lines opacity"
  );
  num(
    feedback,
    settings,
    "speedLinesDensity",
    0,
    1,
    0.01,
    "speed lines density"
  );
  num(feedback, settings, "speedLinesCount", 8, 720, 1, "speed lines count");
  num(
    feedback,
    settings,
    "speedLinesInner",
    0,
    1,
    0.01,
    "speed lines inner radius"
  );
  num(feedback, settings, "speedLinesFps", 1, 60, 1, "speed lines fps");

  // ---- camera, controls, HUD, audio ------------------------------------------------
  const cam = folder(gui, "🎥 Camera & controls");
  num(cam, settings, "fov", 30, 120, 1);
  num(cam, settings, "boostFov", 30, 150, 1, "boost fov");
  num(cam, settings, "fovSpringTension", 10, 1000, 5, "fov spring tension");
  num(cam, settings, "fovSpringFriction", 1, 300, 1, "fov spring friction");
  num(cam, settings, "mouseSensitivity", 0.05, 5, 0.05, "mouse sensitivity");
  bool(cam, settings, "invertY", "invert Y");
  num(cam, settings, "shakeScale", 0, 3, 0.05, "screen shake");
  num(cam, GAME, "SHAKE_PLAYER_HIT", 0, 1, 0.05, "shake: hit taken");
  num(cam, GAME, "SHAKE_BAT_HIT", 0, 1, 0.05, "shake: bat hit");
  num(cam, GAME, "SHAKE_LANDING_MAX", 0, 1, 0.05, "shake: landing");
  num(cam, GAME, "SHAKE_DECAY", 0.1, 10, 0.1, "shake decay");
  num(cam, GAME, "SHAKE_AMPLITUDE", 0, 0.5, 0.005, "shake amplitude");
  num(cam, GAME, "INIT_ANIMATION_DURATION", 0.05, 5, 0.05, "intro duration");
  num(cam, GAME, "PREGAME_CAMERA_SWITCH", 0.5, 15, 0.1, "menu cam switch");
  num(cam, GAME, "ATTRACT_DISTANCE", 0, 15, 0.1, "menu cam distance");
  num(cam, GAME, "ATTRACT_HEIGHT", -2, 10, 0.1, "menu cam height");
  num(cam, GAME, "ATTRACT_SMOOTHING", 0.01, 1, 0.01, "menu cam smoothing");
  num(cam, settings, "cameraNear", 0.01, 1, 0.01, "near plane");
  num(cam, settings, "cameraFar", 50, 1000, 10, "far plane");
  num(cam, settings, "maxFrameTime", 1 / 240, 0.2, 0.001, "max frame time");

  const hud = folder(gui, "🩷 HUD");
  num(hud, settings, "hudScale", 0.4, 2.5, 0.05, "scale");
  num(hud, settings, "crosshairSize", 2, 80, 1, "crosshair size");
  col(hud, settings, "crosshairColor", "crosshair color");
  col(hud, COLORS, "HEART", "heart color");
  num(hud, settings, "hudIconOutline", 0, 10, 0.25, "icon outline");
  col(hud, settings, "hudOutlineColor", "outline color");
  num(hud, settings, "hudBands", 1, 8, 1, "icon bands");
  num(hud, settings, "hudAmbient", 0, 1, 0.01, "icon ambient");
  num(hud, settings, "hudSpecular", 0, 2, 0.05, "icon specular");
  num(hud, settings, "hudRim", 0, 1, 0.01, "icon rim");
  num(hud, settings, "hudPulseSpeed", 0, 40, 0.5, "pulse speed");
  num(hud, settings, "hudSquash", 0, 0.5, 0.005, "squash");
  num(hud, settings, "hudStretch", 0, 0.5, 0.005, "stretch");

  const sound = folder(gui, "🔊 Audio");
  num(sound, settings, "volume", 0, 1, 0.01, "master");
  num(sound, settings, "musicVolume", 0, 1, 0.01, "music");
  num(sound, settings, "sfxVolume", 0, 1, 0.01, "effects");
  bool(sound, settings, "muted", "mute (M)").listen();
  num(sound, GAME, "ALERT_VOLUME", 0, 2, 0.05, "alert");
  num(sound, GAME, "CORONA_HIT_VOLUME", 0, 2, 0.05, "bat hit");
  num(sound, GAME, "PLAYER_HIT_VOLUME", 0, 2, 0.05, "damage");
  num(sound, GAME, "JUMP_VOLUME", 0, 2, 0.05, "jump");
  num(sound, GAME, "SPRINT_VOLUME", 0, 2, 0.05, "boost");

  const debug = folder(gui, "🐞 Debug");
  debug.add(settings, "debugView", DEBUG_VIEW_NAMES).name("G-buffer view");
  bool(debug, settings, "showStats", "show fps");

  // ---- toast + toggle -----------------------------------------------------------------
  const toast = document.createElement("div");
  toast.className = "gui-toast hidden";
  document.body.appendChild(toast);
  let toastTimeout = null;
  function flash(text) {
    toast.textContent = text;
    toast.classList.remove("hidden");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2000);
  }

  window.addEventListener("keydown", (e) => {
    if (
      e.code === "KeyG" &&
      !e.repeat &&
      !(e.target instanceof HTMLInputElement)
    )
      gui.show(gui._hidden);
  });

  return gui;
}
