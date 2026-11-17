import "./styles.css";
import * as THREE from "three";

import { Input } from "./core/Input.js";
import { AudioManager } from "./core/Audio.js";
import { loadAssets } from "./core/Assets.js";
import { Level } from "./world/Level.js";
import { Pipeline } from "./render/Pipeline.js";
import { Game, GAME_STATE } from "./game/Game.js";
import { createExclamationTexture } from "./game/fx.js";
import { Hud } from "./ui/Hud.js";
import { Screens } from "./ui/Screens.js";
import { createGui } from "./ui/Gui.js";
import { loadSettings, saveSettings } from "./ui/settings.js";

const screens = new Screens();

function isMobile() {
  const touchOnly =
    navigator.maxTouchPoints > 0 &&
    !window.matchMedia("(pointer: fine)").matches;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || touchOnly;
}

function createRenderer(canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // no MSAA: TAA / FXAA run in the post-processing chain
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    const gl = renderer.getContext();
    if (!gl.getExtension("EXT_color_buffer_float")) return null;
    return renderer;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function main() {
  if (isMobile()) {
    screens.unsupported("This site is not supported on mobile browsers.");
    return;
  }

  const canvas = document.getElementById("game");
  const renderer = createRenderer(canvas);
  if (!renderer) {
    screens.unsupported(
      "Your browser does not support WebGL 2 with float render targets."
    );
    return;
  }
  renderer.info.autoReset = false;

  const settings = loadSettings();
  const audio = new AudioManager();
  audio.setVolume(settings.volume);
  audio.setMusicVolume(settings.musicVolume);
  audio.setMuted(settings.muted);
  screens.setMuted(settings.muted);

  const input = new Input(canvas);

  screens.setState(GAME_STATE.LOADING, false);
  const assets = await loadAssets(audio, (p) => screens.setProgress(p));
  assets.exclamationTexture = createExclamationTexture();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 300);
  scene.add(camera);

  const level = new Level(assets.mapNodes);
  scene.add(level);

  const pipeline = new Pipeline(renderer, settings);
  const hud = new Hud(assets);
  const game = new Game({
    scene,
    camera,
    level,
    assets,
    input,
    audio,
    settings,
  });

  // ------------------------------------------------------------- wiring ----
  const refreshScreens = () => {
    screens.setState(game.state, game.paused);
    hud.setVisible(game.state === GAME_STATE.GAMEPLAY && !game.paused);
  };
  game.on("state", refreshScreens);
  game.on("pause", refreshScreens);
  game.on("life", (life) => hud.setLife(life));
  game.on("remaining", (n) => hud.setRemaining(n));
  game.on("cut", () => pipeline.cut());
  game.on("coronaAlert", () => audio.play("alert", { volume: 0.7 }));
  game.on("toggleMute", () => {
    settings.muted = audio.toggleMute();
    screens.setMuted(settings.muted);
    saveSettings(settings);
  });

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio)
    );
    renderer.setSize(w, h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    pipeline.setSize(size.x, size.y);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    hud.resize(w, h);
  };
  window.addEventListener("resize", resize);
  resize();

  createGui(settings, {
    audio,
    onResize: () => {
      resize();
      screens.setMuted(settings.muted);
    },
  });

  // --------------------------------------------------------------- loop ----
  const stats = document.getElementById("stats");
  let frames = 0;
  let statsTime = 0;
  let last = performance.now();
  let elapsed = 0;

  game.start();
  audio.playMusic("theme");

  if (import.meta.env.DEV)
    window.__game = { game, settings, pipeline, camera, scene, renderer };

  renderer.setAnimationLoop((now) => {
    const dt = Math.min(1 / 20, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;

    renderer.info.reset();
    game.update(dt);
    hud.update(dt, elapsed);
    pipeline.shadowFocus.copy(camera.position);

    pipeline.render({
      scene,
      camera,
      hudScene: hud.visible ? hud.scene : null,
      hudCamera: hud.camera,
      time: elapsed,
      effects: game.getEffects(),
    });

    // fps counter
    frames++;
    statsTime += dt;
    stats.classList.toggle("hidden", !settings.showStats);
    if (statsTime >= 0.5) {
      if (settings.showStats) {
        const i = renderer.info;
        stats.textContent =
          `${Math.round(frames / statsTime)} fps\n` +
          `${i.render.calls} draw calls\n` +
          `${(i.render.triangles / 1000).toFixed(1)}k triangles\n` +
          `${game.coronas.length} coronas`;
      }
      frames = 0;
      statsTime = 0;
    }
  });
}

main().catch((e) => {
  console.error(e);
  screens.unsupported(`Something went wrong: ${e.message}`);
});
