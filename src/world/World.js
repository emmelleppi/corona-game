import * as THREE from "three";
import { TRAMPOLINE, PLAYER } from "../config.js";

const CELL = 4; // spatial hash cell size for the collision triangles
const FOOTPRINT_RES = 0.25; // resolution of the walkable footprint grid

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _p = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();
const _ap = new THREE.Vector3();
const _bp = new THREE.Vector3();
const _cp = new THREE.Vector3();

// Closest point on triangle abc to point p (Ericson, Real-Time Collision Detection).
function closestPointOnTriangle(p, a, b, c, target) {
  _ab.subVectors(b, a);
  _ac.subVectors(c, a);
  _ap.subVectors(p, a);
  const d1 = _ab.dot(_ap);
  const d2 = _ac.dot(_ap);
  if (d1 <= 0 && d2 <= 0) return target.copy(a);

  _bp.subVectors(p, b);
  const d3 = _ab.dot(_bp);
  const d4 = _ac.dot(_bp);
  if (d3 >= 0 && d4 <= d3) return target.copy(b);

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return target.copy(a).addScaledVector(_ab, v);
  }

  _cp.subVectors(p, c);
  const d5 = _ab.dot(_cp);
  const d6 = _ac.dot(_cp);
  if (d6 >= 0 && d5 <= d6) return target.copy(c);

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return target.copy(a).addScaledVector(_ac, w);
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return target.copy(b).addScaledVector(_cp.subVectors(c, b), w);
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return target.copy(a).addScaledVector(_ab, v).addScaledVector(_ac, w);
}

// Static collision world built from the map meshes. It replaces the old
// physics engine: sphere vs triangle soup collisions for the player and a
// rasterised "walkable footprint" for the AI (it replaces the down raycasts).
export class World {
  constructor(meshes) {
    this.bbox = new THREE.Box3();
    const tris = [];

    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true);
      const geo = mesh.geometry;
      const pos = geo.attributes.position;
      const index = geo.index;
      const count = index ? index.count : pos.count;
      for (let i = 0; i < count; i += 3) {
        const ia = index ? index.getX(i) : i;
        const ib = index ? index.getX(i + 1) : i + 1;
        const ic = index ? index.getX(i + 2) : i + 2;
        _a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
        _b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
        _c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
        _ab.subVectors(_b, _a);
        _ac.subVectors(_c, _a);
        const n = new THREE.Vector3().crossVectors(_ab, _ac);
        const area = n.length();
        if (area < 1e-6) continue; // skip degenerate triangles
        n.divideScalar(area);
        tris.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
        this.bbox.expandByPoint(_a).expandByPoint(_b).expandByPoint(_c);
      }
    }

    this.triangles = new Float32Array(tris);
    this.triangleCount = this.triangles.length / 9;
    this.buildGrid();
    this.buildFootprint();
    this.stamp = new Uint32Array(this.triangleCount);
    this.queryId = 0;
  }

  buildGrid() {
    const { min, max } = this.bbox;
    this.gridMinX = min.x - CELL;
    this.gridMinZ = min.z - CELL;
    this.gridW = Math.ceil((max.x - this.gridMinX + CELL) / CELL);
    this.gridH = Math.ceil((max.z - this.gridMinZ + CELL) / CELL);
    const cells = Array.from({ length: this.gridW * this.gridH }, () => []);
    const t = this.triangles;
    for (let i = 0; i < this.triangleCount; i++) {
      const o = i * 9;
      const x0 = Math.min(t[o], t[o + 3], t[o + 6]);
      const x1 = Math.max(t[o], t[o + 3], t[o + 6]);
      const z0 = Math.min(t[o + 2], t[o + 5], t[o + 8]);
      const z1 = Math.max(t[o + 2], t[o + 5], t[o + 8]);
      const cx0 = Math.floor((x0 - this.gridMinX) / CELL);
      const cx1 = Math.floor((x1 - this.gridMinX) / CELL);
      const cz0 = Math.floor((z0 - this.gridMinZ) / CELL);
      const cz1 = Math.floor((z1 - this.gridMinZ) / CELL);
      for (let z = cz0; z <= cz1; z++)
        for (let x = cx0; x <= cx1; x++) cells[z * this.gridW + x].push(i);
    }
    this.cells = cells.map((c) => Uint32Array.from(c));
  }

  // Rasterises the up-facing triangles in a 2D grid: a cell is walkable if
  // there is some ground right below it.
  buildFootprint() {
    const { min, max } = this.bbox;
    this.fpMinX = min.x - 1;
    this.fpMinZ = min.z - 1;
    this.fpW = Math.ceil((max.x - this.fpMinX + 1) / FOOTPRINT_RES);
    this.fpH = Math.ceil((max.z - this.fpMinZ + 1) / FOOTPRINT_RES);
    const height = new Float32Array(this.fpW * this.fpH).fill(-Infinity);
    const t = this.triangles;

    for (let i = 0; i < this.triangleCount; i++) {
      const o = i * 9;
      const ax = t[o],
        ay = t[o + 1],
        az = t[o + 2];
      const bx = t[o + 3],
        by = t[o + 4],
        bz = t[o + 5];
      const cx = t[o + 6],
        cy = t[o + 7],
        cz = t[o + 8];
      // face normal y component
      const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      if (ny <= 1e-6) continue; // not facing up
      const top = Math.max(ay, by, cy);
      const x0 = Math.floor(
        (Math.min(ax, bx, cx) - this.fpMinX) / FOOTPRINT_RES
      );
      const x1 = Math.ceil(
        (Math.max(ax, bx, cx) - this.fpMinX) / FOOTPRINT_RES
      );
      const z0 = Math.floor(
        (Math.min(az, bz, cz) - this.fpMinZ) / FOOTPRINT_RES
      );
      const z1 = Math.ceil(
        (Math.max(az, bz, cz) - this.fpMinZ) / FOOTPRINT_RES
      );
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-9) continue;
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const px = this.fpMinX + (x + 0.5) * FOOTPRINT_RES;
          const pz = this.fpMinZ + (z + 0.5) * FOOTPRINT_RES;
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
          const l3 = 1 - l1 - l2;
          const eps = -1e-4;
          if (l1 >= eps && l2 >= eps && l3 >= eps) {
            const k = z * this.fpW + x;
            if (top > height[k]) height[k] = top;
          }
        }
      }
    }
    this.footprint = height;

    // List of walkable cells, used to pick random spawn points.
    const cells = [];
    for (let i = 0; i < height.length; i++)
      if (height[i] > -Infinity) cells.push(i);
    this.walkable = Uint32Array.from(cells);
  }

  groundHeightAt(x, z) {
    const gx = Math.floor((x - this.fpMinX) / FOOTPRINT_RES);
    const gz = Math.floor((z - this.fpMinZ) / FOOTPRINT_RES);
    if (gx < 0 || gz < 0 || gx >= this.fpW || gz >= this.fpH) return -Infinity;
    return this.footprint[gz * this.fpW + gx];
  }

  // Equivalent of the old "raycast down hits the map" test.
  isGround(x, z, y = Infinity) {
    const h = this.groundHeightAt(x, z);
    return h > -Infinity && h <= y;
  }

  randomGroundPoint(target = new THREE.Vector3(), margin = 0.75) {
    for (let i = 0; i < 200; i++) {
      const k = this.walkable[Math.floor(Math.random() * this.walkable.length)];
      const x = this.fpMinX + ((k % this.fpW) + Math.random()) * FOOTPRINT_RES;
      const z =
        this.fpMinZ +
        (Math.floor(k / this.fpW) + Math.random()) * FOOTPRINT_RES;
      // Keep some distance from the edges so the coronas do not spawn on a cliff.
      if (
        this.isGround(x + margin, z) &&
        this.isGround(x - margin, z) &&
        this.isGround(x, z + margin) &&
        this.isGround(x, z - margin)
      )
        return target.set(x, this.groundHeightAt(x, z), z);
    }
    return target.set(0, 0, 0);
  }

  // Sphere vs world. Moves `position` out of the geometry, removes the
  // velocity going into the surfaces and returns the best ground normal y
  // (or 0 if not touching any floor). Contacts are solved deepest first, so
  // the internal edges between coplanar slabs never push the sphere sideways.
  collideSphere(position, velocity, radius) {
    let ground = 0;
    const id = ++this.queryId;
    const t = this.triangles;
    const r2 = radius * radius;
    const candidates = this.candidates || (this.candidates = []);
    candidates.length = 0;

    const cx0 = Math.floor((position.x - radius * 2 - this.gridMinX) / CELL);
    const cx1 = Math.floor((position.x + radius * 2 - this.gridMinX) / CELL);
    const cz0 = Math.floor((position.z - radius * 2 - this.gridMinZ) / CELL);
    const cz1 = Math.floor((position.z + radius * 2 - this.gridMinZ) / CELL);

    for (let cz = cz0; cz <= cz1; cz++) {
      if (cz < 0 || cz >= this.gridH) continue;
      for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cx >= this.gridW) continue;
        const cell = this.cells[cz * this.gridW + cx];
        for (let j = 0; j < cell.length; j++) {
          const i = cell[j];
          if (this.stamp[i] === id) continue;
          this.stamp[i] = id;
          const o = i * 9;
          const y0 = Math.min(t[o + 1], t[o + 4], t[o + 7]);
          const y1 = Math.max(t[o + 1], t[o + 4], t[o + 7]);
          if (position.y + radius * 2 < y0 || position.y - radius * 2 > y1)
            continue;
          candidates.push(i);
        }
      }
    }

    for (let iter = 0; iter < 6 && candidates.length; iter++) {
      let best = -1;
      let bestDepth = 0;
      let nx = 0,
        ny = 0,
        nz = 0;
      for (let j = 0; j < candidates.length; j++) {
        const o = candidates[j] * 9;
        _a.set(t[o], t[o + 1], t[o + 2]);
        _b.set(t[o + 3], t[o + 4], t[o + 5]);
        _c.set(t[o + 6], t[o + 7], t[o + 8]);
        closestPointOnTriangle(position, _a, _b, _c, _p);
        const dx = position.x - _p.x;
        const dy = position.y - _p.y;
        const dz = position.z - _p.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= r2) continue;
        const d = Math.sqrt(d2);
        const depth = radius - d;
        if (depth <= bestDepth) continue;
        best = j;
        bestDepth = depth;
        if (d > 1e-6) {
          nx = dx / d;
          ny = dy / d;
          nz = dz / d;
        } else {
          _ab.subVectors(_b, _a);
          _ac.subVectors(_c, _a);
          _ab.cross(_ac).normalize();
          nx = _ab.x;
          ny = _ab.y;
          nz = _ab.z;
        }
      }
      if (best < 0) break;
      position.x += nx * bestDepth;
      position.y += ny * bestDepth;
      position.z += nz * bestDepth;
      const vn = velocity.x * nx + velocity.y * ny + velocity.z * nz;
      if (vn < 0) {
        velocity.x -= vn * nx;
        velocity.y -= vn * ny;
        velocity.z -= vn * nz;
      }
      if (ny > ground) ground = ny;
    }

    ground = Math.max(
      ground,
      this.collideTrampoline(position, velocity, radius)
    );
    return ground;
  }

  // The start platform: a flat cylinder right below the spawn point.
  collideTrampoline(position, velocity, radius) {
    const [tx, , tz] = PLAYER.INIT_POSITION;
    const top = TRAMPOLINE.TOP;
    const bottom = top - TRAMPOLINE.THICKNESS;
    const dx = position.x - tx;
    const dz = position.z - tz;
    const rd = Math.hypot(dx, dz);
    const k = rd > TRAMPOLINE.RADIUS ? TRAMPOLINE.RADIUS / rd : 1;
    _p.set(
      tx + dx * k,
      Math.min(top, Math.max(bottom, position.y)),
      tz + dz * k
    );
    _ap.subVectors(position, _p);
    let d = _ap.length();
    if (d >= radius) return 0;
    if (d < 1e-6) {
      _ap.set(0, 1, 0);
      _p.y = top;
      d = 0;
    } else _ap.divideScalar(d);
    position.copy(_p).addScaledVector(_ap, radius);
    const vn = velocity.dot(_ap);
    if (vn < 0) velocity.addScaledVector(_ap, -vn);
    return _ap.y;
  }
}
