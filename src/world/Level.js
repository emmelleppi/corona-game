import * as THREE from "three";
import { World } from "./World.js";
import { Sky } from "./Sky.js";
import {
  createWorldMaterial,
  createUnlitMaterial,
  setupGBufferMesh,
} from "../render/materials.js";
import { COLORS, PLAYER, TRAMPOLINE, trampolineTop } from "../config.js";

// Floating islands (map.glb), sky dome and start platform.
export class Level extends THREE.Group {
  constructor(mapNodes) {
    super();
    const inner = createWorldMaterial(COLORS.MAP_INNER, 1);
    const outer = createWorldMaterial(COLORS.MAP_OUTER, 0);

    const meshes = [];
    for (const [name, node] of Object.entries(mapNodes)) {
      const index =
        name === "Curve" ? 0 : parseInt(name.replace("Curve", ""), 10);
      const material = index >= 1 && index <= 21 ? inner : outer;
      const mesh = new THREE.Mesh(node.geometry, material);
      mesh.name = name;
      node.updateWorldMatrix(true, false);
      mesh.applyMatrix4(node.matrixWorld);
      setupGBufferMesh(mesh, { objectId: 0, castShadow: true });
      meshes.push(mesh);
      this.add(mesh);
    }
    this.updateMatrixWorld(true);
    this.world = new World(meshes);

    this.sky = new Sky();
    this.add(this.sky);

    // start platform: unit cylinder scaled from the (tunable) config
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 0.85, 1, 48),
      createUnlitMaterial(COLORS.PAD, COLORS.PAD_GLOW)
    );
    setupGBufferMesh(pad, { objectId: 1, castShadow: true });
    this.add(pad);
    this.pad = pad;
    this.inner = inner;
    this.outer = outer;
    this.applyConfig();
  }

  // Applies the live tunable values (colors, start platform placement).
  applyConfig() {
    this.inner.uniforms.uColor.value.set(COLORS.MAP_INNER);
    this.outer.uniforms.uColor.value.set(COLORS.MAP_OUTER);
    const pu = this.pad.material.uniforms;
    pu.uColor.value.set(COLORS.PAD);
    pu.uGlowColor.value.set(COLORS.PAD_GLOW);
    const [x, , z] = PLAYER.INIT_POSITION;
    const r = TRAMPOLINE.RADIUS;
    const h = TRAMPOLINE.THICKNESS;
    this.pad.scale.set(r, h, r);
    this.pad.position.set(x, trampolineTop() - h / 2, z);
  }

  update(dt, settings) {
    this.applyConfig();
    this.sky.update(dt, settings);
  }
}
