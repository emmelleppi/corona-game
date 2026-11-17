import GUI from "lil-gui";
import {
  AA_MODES,
  DEBUG_VIEW_NAMES,
  TONE_MAPPING_NAMES,
} from "../render/Pipeline.js";
import { saveSettings, resetSettings } from "./settings.js";

// Settings panel (toggle with G). Every change is persisted in localStorage.
export function createGui(settings, { onResize, audio }) {
  const gui = new GUI({ title: "Settings  ·  G" });
  gui.close();
  gui.domElement.classList.add("game-gui");

  const save = () => saveSettings(settings);
  gui.onChange(save);

  const quality = gui.addFolder("Quality");
  quality.add(settings, "antialiasing", AA_MODES).name("anti-aliasing");
  quality
    .add(settings, "renderScale", 0.5, 1.5, 0.05)
    .name("render scale")
    .onFinishChange(onResize);
  quality
    .add(settings, "maxPixelRatio", 1, 3, 0.25)
    .name("max pixel ratio")
    .onFinishChange(onResize);
  quality.add(settings, "taaFeedback", 0.7, 0.98, 0.01).name("TAA feedback");
  quality
    .add(settings, "taaVarianceGamma", 0.5, 2, 0.05)
    .name("TAA clip gamma");
  quality.add(settings, "sharpen", 0, 1, 0.05).name("TAA sharpen");
  quality.add(settings, "shadows");
  quality
    .add(settings, "shadowResolution", [1024, 2048, 4096])
    .name("shadow map");
  quality.add(settings, "showStats").name("show fps");
  quality.add(settings, "debugView", DEBUG_VIEW_NAMES).name("G-buffer view");

  const toon = gui.addFolder("Toon & Outline").close();
  toon.add(settings, "worldBands", 1, 8, 1).name("world bands");
  toon.add(settings, "characterBands", 1, 8, 1).name("character bands");
  toon.add(settings, "bandSoftness", 0, 0.5, 0.01).name("band softness");
  toon.add(settings, "specular", 0, 2, 0.05);
  toon.add(settings, "rim", 0, 2, 0.05);
  toon.addColor(settings, "rimColor").name("rim color");
  toon.add(settings, "outlines");
  toon.add(settings, "worldOutlines").name("world outlines");
  toon.add(settings, "outlineWidth", 0.5, 4, 0.1).name("outline width");
  toon.addColor(settings, "outlineColor").name("outline color");
  toon.add(settings, "depthThreshold", 0.01, 0.5, 0.01).name("depth threshold");
  toon.add(settings, "normalThreshold", 0.05, 1, 0.01).name("normal threshold");

  const light = gui.addFolder("Lighting").close();
  light.addColor(settings, "sunColor").name("sun color");
  light.add(settings, "sunIntensity", 0, 3, 0.05).name("sun intensity");
  light.add(settings, "sunElevation", 10, 90, 1).name("sun elevation");
  light.add(settings, "sunAzimuth", -180, 180, 1).name("sun azimuth");
  light.add(settings, "ambientIntensity", 0, 2, 0.05).name("ambient");
  light.addColor(settings, "skyAmbient").name("sky ambient");
  light.addColor(settings, "groundAmbient").name("ground ambient");
  light.addColor(settings, "shadowTint").name("shadow tint");
  light.addColor(settings, "discoColorA").name("disco light A");
  light.addColor(settings, "discoColorB").name("disco light B");
  light.add(settings, "discoIntensity", 0, 2, 0.05).name("disco intensity");
  light.add(settings, "discoSpeed", 0, 3, 0.05).name("disco speed");
  light.add(settings, "fog");
  light.addColor(settings, "fogColor").name("fog color");
  light.add(settings, "fogNear", 0, 100, 1).name("fog near");
  light.add(settings, "fogFar", 10, 250, 1).name("fog far");

  const post = gui.addFolder("Post-processing").close();
  post.add(settings, "toneMapping", TONE_MAPPING_NAMES).name("tone mapping");
  post.add(settings, "exposure", 0.2, 3, 0.05);
  post.add(settings, "saturation", 0, 2, 0.05);
  post.add(settings, "contrast", 0.5, 1.5, 0.01);
  post.add(settings, "bloom");
  post.add(settings, "bloomStrength", 0, 2, 0.05).name("bloom strength");
  post.add(settings, "bloomThreshold", 0, 3, 0.05).name("bloom threshold");
  post.add(settings, "bloomRadius", 0.5, 3, 0.1).name("bloom radius");
  post
    .add(settings, "chromaticAberration", 0, 0.01, 0.0005)
    .name("chromatic aberr.");
  post.add(settings, "vignetteOffset", 0, 2, 0.05).name("vignette offset");
  post.add(settings, "vignetteDarkness", 0, 2, 0.05).name("vignette darkness");
  post.add(settings, "grain", 0, 0.6, 0.01).name("film grain");
  post.add(settings, "scanlines", 0, 0.2, 0.005);
  post.add(settings, "speedLines").name("speed lines");

  const game = gui.addFolder("Game").close();
  game.add(settings, "fov", 50, 100, 1).name("fov");
  game.add(settings, "boostFov", 60, 120, 1).name("boost fov");
  game
    .add(settings, "mouseSensitivity", 0.1, 4, 0.05)
    .name("mouse sensitivity");
  game.add(settings, "invertY").name("invert Y");

  const sound = gui.addFolder("Audio").close();
  sound.add(settings, "volume", 0, 1, 0.01).onChange((v) => audio.setVolume(v));
  sound
    .add(settings, "musicVolume", 0, 1, 0.01)
    .name("music")
    .onChange((v) => audio.setMusicVolume(v));
  sound
    .add(settings, "muted")
    .name("mute (M)")
    .onChange((v) => audio.setMuted(v))
    .listen();

  gui
    .add(
      {
        reset() {
          resetSettings(settings);
          gui.controllersRecursive().forEach((c) => c.updateDisplay());
          audio.setVolume(settings.volume);
          audio.setMusicVolume(settings.musicVolume);
          audio.setMuted(settings.muted);
          onResize();
        },
      },
      "reset"
    )
    .name("reset defaults");

  const toggle = () => gui.show(gui._hidden);
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyG" && !e.repeat) toggle();
  });

  return gui;
}
