import * as THREE from "three";
import { fullscreenVertex } from "./shaders/common.js";

const geometry = new THREE.BufferGeometry();
geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)
);
geometry.setAttribute(
  "uv",
  new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)
);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// A fullscreen triangle rendered with a custom RawShaderMaterial.
export class FullscreenPass {
  constructor(fragmentShader, uniforms = {}, options = {}) {
    this.material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      ...options,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.uniforms = this.material.uniforms;
  }

  render(renderer, target) {
    renderer.setRenderTarget(target);
    renderer.render(this.mesh, camera);
  }

  dispose() {
    this.material.dispose();
  }
}
