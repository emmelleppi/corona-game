import * as THREECJS from 'three'
import * as THREE from 'three/build/three.module'

// This hacks around threejs broken module resolution in CJS environments
// See: https://github.com/mrdoob/three.js/issues/17220
Object.assign(THREE, THREECJS)
