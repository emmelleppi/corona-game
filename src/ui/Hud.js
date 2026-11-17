import * as THREE from "three";
import { createHudMaterial, hudUniforms } from "../render/materials.js";
import { COLORS } from "../config.js";

const HEART_SCALE = 1250;
const CORONA_SCALE = 38;

// Heads-up display. Numbers are DOM (crisp text with the game font), the
// icons are small toon shaded 3D models rendered by the pipeline in a
// super-sampled offscreen target.
export class Hud {
  constructor(assets, settings) {
    this.settings = settings;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.visible = false;

    this.heart = this.createIcon(assets.heartGeometry, COLORS.HEART);
    this.corona = this.createIcon(assets.coronaGeometry, COLORS.CORONA);

    this.root = document.getElementById("hud");
    this.lifeEl = document.getElementById("hud-life");
    this.remainingEl = document.getElementById("hud-remaining");
    this.life = null;
    this.remaining = null;
    this.bump = { life: 0, remaining: 0 };
    this.width = 1;
    this.height = 1;
    this.box = 230;
    this.icons = [];
  }

  createIcon(geometry, color) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, createHudMaterial(color));
    const outline = new THREE.Mesh(
      geometry,
      createHudMaterial(0x14061a, { outline: 3, isOutline: true })
    );
    group.add(outline, mesh);
    group.userData.mesh = mesh;
    group.userData.outline = outline;
    this.scene.add(group);
    return group;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    const c = this.camera;
    c.left = 0;
    c.right = width;
    c.top = height;
    c.bottom = 0;
    c.updateProjectionMatrix();
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
    // a corona reproduced: the counter flashes red
    if (this.remaining !== null && n > this.remaining) {
      this.remainingEl.classList.remove("warn");
      void this.remainingEl.offsetWidth;
      this.remainingEl.classList.add("warn");
    }
    this.remaining = n;
    this.remainingEl.textContent = n;
  }

  applyStyle(icon, color) {
    const s = this.settings;
    icon.userData.mesh.material.uniforms.uColor.value.set(color);
    const o = icon.userData.outline.material.uniforms;
    o.uColor.value.set(s.hudOutlineColor);
    o.uOutline.value = s.hudIconOutline * s.hudScale;
  }

  update(dt, time) {
    const s = this.settings;
    const k = s.hudScale;
    hudUniforms.uBands.value = s.hudBands;
    hudUniforms.uHudAmbient.value = s.hudAmbient;
    hudUniforms.uHudSpecular.value = s.hudSpecular;
    hudUniforms.uHudRim.value = s.hudRim;
    this.applyStyle(this.heart, COLORS.HEART);
    this.applyStyle(this.corona, COLORS.CORONA);

    // DOM sizes follow the HUD scale
    const root = document.documentElement.style;
    root.setProperty("--hud-scale", k);
    root.setProperty("--crosshair-size", `${s.crosshairSize}px`);
    root.setProperty("--crosshair-color", s.crosshairColor);

    this.heart.position.set(78 * k, 100 * k, 0);
    this.corona.position.set(this.width - 78 * k, 100 * k, 0);
    // square around each icon, rendered in its own atlas tile
    this.box = 230 * k;
    this.icons = [
      {
        object: this.heart,
        x: this.heart.position.x,
        y: this.heart.position.y,
      },
      {
        object: this.corona,
        x: this.corona.position.x,
        y: this.corona.position.y,
      },
    ];

    // same squash & stretch of the old HUD heart / corona
    const p = Math.sin(s.hudPulseSpeed * time);
    const h = 1 - p * s.hudSquash;
    const v = 1 + p * s.hudStretch;
    this.bump.life = Math.max(0, this.bump.life - dt * 4);
    this.bump.remaining = Math.max(0, this.bump.remaining - dt * 4);

    const heartK = HEART_SCALE * k * (1 + this.bump.life * 0.35);
    this.heart.scale.set(heartK * h, heartK * v, heartK * h);
    this.heart.rotation.y = Math.sin(time * 1.3) * 0.35;

    const coronaK = CORONA_SCALE * k * (1 + this.bump.remaining * 0.3);
    this.corona.scale.set(coronaK * h, coronaK * v, coronaK * h);
    this.corona.rotation.y = time * 0.8;
    this.corona.rotation.x = 0.3;

    this.lifeEl.style.transform = `scale(${1 + this.bump.life * 0.3})`;
    this.remainingEl.style.transform = `scale(${1 + this.bump.remaining * 0.3})`;
  }
}
