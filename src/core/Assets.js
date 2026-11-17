import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import themeUrl from "../assets/sounds/Theme.mp3?url";
import jumpUrl from "../assets/sounds/Jump.wav?url";
import sprintUrl from "../assets/sounds/Sprint.wav?url";
import alertUrl from "../assets/sounds/Alert.wav?url";
import coronaHitUrl from "../assets/sounds/Player_Hit.wav?url";
import coronaHit2Url from "../assets/sounds/Player_Hit_2.wav?url";
import playerHitUrl from "../assets/sounds/Hit.wav?url";
import playerHit2Url from "../assets/sounds/Hit_2.wav?url";

export const SOUNDS = {
  theme: themeUrl,
  jump: jumpUrl,
  sprint: sprintUrl,
  alert: alertUrl,
  coronaHit: coronaHitUrl,
  coronaHit2: coronaHit2Url,
  playerHit: playerHitUrl,
  playerHit2: playerHit2Url,
};

const BASE = import.meta.env.BASE_URL;

// Loads every asset needed by the game, reporting the progress.
export async function loadAssets(audio, onProgress = () => {}) {
  const gltf = new GLTFLoader();
  const textures = new THREE.TextureLoader();

  let done = 0;
  const jobs = [];
  const track = (p) => {
    jobs.push(p);
    p.then(() => onProgress(++done / jobs.length));
    return p;
  };

  const [map, corona, heart, bat, pow] = await Promise.all([
    track(gltf.loadAsync(`${BASE}map.glb`)),
    track(gltf.loadAsync(`${BASE}corona.glb`)),
    track(gltf.loadAsync(`${BASE}heart.glb`)),
    track(gltf.loadAsync(`${BASE}baseball_bat.glb`)),
    track(textures.loadAsync(`${BASE}pow.png`)),
    track(document.fonts.load("100px Bangers").catch(() => null)),
    ...Object.entries(SOUNDS).map(([name, url]) =>
      track(audio.load(name, url).catch((e) => console.warn(name, e)))
    ),
  ]);

  pow.colorSpace = THREE.SRGBColorSpace;
  pow.anisotropy = 4;

  const meshesOf = (g) => {
    const out = {};
    g.scene.traverse((o) => o.isMesh && (out[o.name] = o));
    return out;
  };

  return {
    mapNodes: meshesOf(map),
    coronaGeometry: meshesOf(corona).Cube.geometry,
    heartGeometry: meshesOf(heart).Love.geometry,
    batNodes: meshesOf(bat),
    powTexture: pow,
  };
}
