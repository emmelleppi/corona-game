import * as THREE from "three";
import {
  createBillboardMaterial,
  createParticleMaterial,
  setupForwardObject,
} from "../render/materials.js";

const quad = new THREE.PlaneGeometry(1, 1);

// Camera facing quad rendered in the forward pass.
export class Billboard extends THREE.Mesh {
  constructor(texture, opts) {
    super(quad, createBillboardMaterial(texture, opts));
    setupForwardObject(this);
    this.visible = false;
  }

  setScale(x, y = x) {
    this.material.uniforms.uScale.value.set(x, y);
  }

  set opacity(v) {
    this.material.uniforms.uOpacity.value = v;
  }

  set rotationZ(v) {
    this.material.uniforms.uRotation.value = v;
  }
}

const MAX_PARTICLES = 1024;

// CPU simulated particles (hit sparks, death bursts, landing dust...).
export class Particles extends THREE.Points {
  constructor() {
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(
      new Float32Array(MAX_PARTICLES * 3),
      3
    );
    const color = new THREE.BufferAttribute(
      new Float32Array(MAX_PARTICLES * 4),
      4
    );
    const size = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1);
    const shape = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1);
    [position, color, size, shape].forEach((a) =>
      a.setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute("position", position);
    geometry.setAttribute("aColor", color);
    geometry.setAttribute("aSize", size);
    geometry.setAttribute("aShape", shape);
    super(geometry, createParticleMaterial());
    setupForwardObject(this);

    this.items = [];
    this.tmpColor = new THREE.Color();
  }

  burst(
    origin,
    {
      count = 12,
      color = 0xffffff,
      colors = null,
      speed = 4,
      up = 2,
      size = 0.15,
      life = 0.6,
      gravity = 12,
      drag = 2,
      shape = 0,
      spread = 1,
    } = {}
  ) {
    for (let i = 0; i < count && this.items.length < MAX_PARTICLES; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      const c = new THREE.Color(
        colors ? colors[Math.floor(Math.random() * colors.length)] : color
      );
      this.items.push({
        p: origin.clone().addScaledVector(dir, 0.1 * spread),
        v: dir
          .multiplyScalar(speed * (0.4 + Math.random() * 0.6))
          .add(new THREE.Vector3(0, up * Math.random(), 0)),
        color: c,
        size: size * (0.6 + Math.random() * 0.8),
        life: life * (0.6 + Math.random() * 0.4),
        age: 0,
        gravity,
        drag,
        shape,
      });
    }
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dt;
      if (it.age >= it.life) {
        items[i] = items[items.length - 1];
        items.pop();
        continue;
      }
      it.v.y -= it.gravity * dt;
      it.v.multiplyScalar(Math.exp(-it.drag * dt));
      it.p.addScaledVector(it.v, dt);
    }

    const g = this.geometry;
    const pos = g.attributes.position.array;
    const col = g.attributes.aColor.array;
    const size = g.attributes.aSize.array;
    const shape = g.attributes.aShape.array;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const t = it.age / it.life;
      pos[i * 3] = it.p.x;
      pos[i * 3 + 1] = it.p.y;
      pos[i * 3 + 2] = it.p.z;
      col[i * 4] = it.color.r;
      col[i * 4 + 1] = it.color.g;
      col[i * 4 + 2] = it.color.b;
      col[i * 4 + 3] = 1 - t * t;
      size[i] = it.size * (1 - t * 0.5);
      shape[i] = it.shape;
    }
    g.setDrawRange(0, items.length);
    if (items.length)
      for (const name of ["position", "aColor", "aSize", "aShape"]) {
        g.attributes[name].needsUpdate = true;
        g.attributes[name].clearUpdateRanges();
        g.attributes[name].addUpdateRange(
          0,
          items.length * g.attributes[name].itemSize
        );
      }
    this.visible = items.length > 0;
  }

  clear() {
    this.items.length = 0;
  }
}

// "!" texture drawn with the game font.
export function createExclamationTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "280px Bangers";
  ctx.lineJoin = "round";
  ctx.lineWidth = 22;
  ctx.strokeStyle = "black";
  ctx.strokeText("!", size / 2, size / 2 + 10);
  ctx.fillStyle = "#ff2a2a";
  ctx.fillText("!", size / 2, size / 2 + 10);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
