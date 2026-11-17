import * as THREE from "three";
import { createHudMaterial } from "../render/materials.js";
import { COLORS } from "../config.js";

// Heads-up display. Numbers are DOM (crisp text with the game font), the
// icons are small toon shaded 3D models rendered by the pipeline in a
// super-sampled offscreen target.
export class Hud {
  constructor(assets) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.visible = false;

    this.heart = this.createIcon(assets.heartGeometry, COLORS.HEART, 3);
    this.corona = this.createIcon(assets.coronaGeometry, COLORS.CORONA, 3);
    this.heart.scale.setScalar(1250);
    this.corona.scale.setScalar(38);

    this.root = document.getElementById("hud");
    this.lifeEl = document.getElementById("hud-life");
    this.remainingEl = document.getElementById("hud-remaining");
    this.life = null;
    this.remaining = null;
    this.bump = { life: 0, remaining: 0 };
  }

  createIcon(geometry, color, outlineWidth) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, createHudMaterial(color));
    const outline = new THREE.Mesh(
      geometry,
      createHudMaterial(0x14061a, { outline: outlineWidth, isOutline: true })
    );
    group.add(outline, mesh);
    group.userData.mesh = mesh;
    this.scene.add(group);
    return group;
  }

  resize(width, height) {
    const c = this.camera;
    c.left = 0;
    c.right = width;
    c.top = height;
    c.bottom = 0;
    c.updateProjectionMatrix();
    this.heart.position.set(78, 100, 0);
    this.corona.position.set(width - 78, 100, 0);
  }

  setVisible(v) {
    this.visible = v;
    this.root.classList.toggle("hidden", !v);
  }

  setLife(life) {
    if (life === this.life) return;
    if (this.life !== null && life < this.life) this.bump.life = 1;
    this.life = life;
    this.lifeEl.textContent = life;
  }

  setRemaining(n) {
    if (n === this.remaining) return;
    if (this.remaining !== null) this.bump.remaining = 1;
    this.remaining = n;
    this.remainingEl.textContent = n;
  }

  update(dt, time) {
    // same squash & stretch of the old HUD heart / corona
    const s = Math.sin(10 * time);
    const h = 1 - s / 8;
    const v = 1 + s / 10;
    this.bump.life = Math.max(0, this.bump.life - dt * 4);
    this.bump.remaining = Math.max(0, this.bump.remaining - dt * 4);

    const heartK = 1 + this.bump.life * 0.35;
    this.heart.scale.set(
      1250 * h * heartK,
      1250 * v * heartK,
      1250 * h * heartK
    );
    this.heart.rotation.y = Math.sin(time * 1.3) * 0.35;

    const coronaK = 1 + this.bump.remaining * 0.3;
    this.corona.scale.set(38 * h * coronaK, 38 * v * coronaK, 38 * h * coronaK);
    this.corona.rotation.y = time * 0.8;
    this.corona.rotation.x = 0.3;

    this.lifeEl.style.transform = `scale(${1 + this.bump.life * 0.3})`;
    this.remainingEl.style.transform = `scale(${1 + this.bump.remaining * 0.3})`;
  }
}
