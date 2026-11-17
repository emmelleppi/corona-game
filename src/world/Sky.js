import * as THREE from "three";
import { createSkyMaterial, setupGBufferMesh } from "../render/materials.js";

const WORDS = ["KILL", "THE", "CORONA", "STAY", "THE", "FUCK", "HOME!"];
const ROW = 512;
const WIDTH = 1024;

// Atlas with one slogan per row: red channel = fill, green channel = outline.
function createWordsTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = ROW * WORDS.length;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "250px Bangers";
  ctx.lineJoin = "round";
  WORDS.forEach((word, i) => {
    const y = ROW * i + ROW / 2 + 10;
    ctx.lineWidth = 26;
    ctx.strokeStyle = "rgb(0,255,0)";
    ctx.strokeText(word, WIDTH / 2, y);
    ctx.fillStyle = "rgb(255,0,0)";
    ctx.fillText(word, WIDTH / 2, y);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export class Sky extends THREE.Mesh {
  constructor() {
    const texture = createWordsTexture();
    super(
      new THREE.SphereGeometry(120, 64, 32),
      createSkyMaterial(texture, WORDS.length)
    );
    setupGBufferMesh(this, { objectId: 0, castShadow: false });
    this.position.set(0, 20, 0);
    this.frustumCulled = false;
    this.word = 0;
    this.timer = 0;
    this.fade = 1;
  }

  update(dt, settings) {
    const u = this.material.uniforms;
    this.timer += dt;
    if (this.timer > settings.sloganInterval) {
      this.timer = 0;
      u.uWordA.value = this.word;
      this.word = (this.word + 1) % WORDS.length;
      u.uWordB.value = this.word;
      this.fade = 0;
    }
    this.fade = Math.min(1, this.fade + dt * settings.sloganFadeSpeed);
    u.uWordMix.value = this.fade;
  }
}
