import * as THREE from "three";
import { World } from "./World.js";
import { Sky } from "./Sky.js";
import {
  createWorldMaterial,
  createUnlitMaterial,
  setupGBufferMesh,
} from "../render/materials.js";
import { COLORS, PLAYER, TRAMPOLINE } from "../config.js";

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

    const [x, , z] = PLAYER.INIT_POSITION;
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(
        TRAMPOLINE.RADIUS,
        TRAMPOLINE.RADIUS * 0.85,
        TRAMPOLINE.THICKNESS,
        48
      ),
      createUnlitMaterial(0x2a2233, 0xff4fb0)
    );
    pad.position.set(x, TRAMPOLINE.TOP - TRAMPOLINE.THICKNESS / 2, z);
    setupGBufferMesh(pad, { objectId: 1, castShadow: true });
    this.add(pad);
    this.pad = pad;
  }

  update(dt) {
    this.sky.update(dt);
  }
}
