import create from 'zustand'
import produce from "immer"
import * as THREE from "three";
import { createRef } from "react"
import Quadtree from '@timohausmann/quadtree-js';

export const INITIAL_LIFE = 100
export const NUMBER_OF_MAP_BBOX = 43

export const CORONA_STATUS = {
  IDLE: 0,
  SEEKING: 1,
  PRE_ATTACK: 2,
  ATTACK: 3,
  DEAD: 4
}

export const COLLISION_GROUP = {
  CORONA: 1,
  TILES: 4,
  BODY: 8,
  CHEST: 16,
  BAT: 32,
}

export const [useGameService, serviceApi] = create(set => ({
  service: null,
  setService: service => set({ service })
}))

export const [useInteraction, interactionApi] = create((set, get) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  boost: false,
  callbacks: [],
  actions: {
    onDocumentKey(keyCode, value) {
      const { 
        forward,
        backward,
        left,
        right,
        jump,
        boost,
      } = get()

      if (keyCode === 83 && forward !== value) {
        set({ forward: value })
      } else if (keyCode === 87 && backward !== value) {
        set({ backward: value })
      }

      if (keyCode === 65 && left !== value) {
        set({ left: value })
      } else if (keyCode === 68 && right !== value) {
        set({ right: value })
      }

      if (keyCode === 32 && jump !== value) {
        const { isIntersect } = playerApi.getState().actions
        set({ jump: value && isIntersect() })
      }

      if (keyCode === 16 && boost !== value) {
        set({ boost: value })
      }
    },
    onDocumentKeyDown(event) {
      const keyCode = event.which;
      const { actions } = get()
      actions.onDocumentKey(keyCode, true)
    },
    onDocumentKeyUp(event) {
      const keyCode = event.which;
      const { actions } = get()
      actions.onDocumentKey(keyCode, false)
    },
    addCallback(callback) {
      set(produce(state => void state.callbacks.push(callback)))
    }
  }

}))


export const [usePlayer, playerApi] = create((set, get) => ({
  life: INITIAL_LIFE,
  playerBody: createRef(),
  playerApi: null,
  actions: {
    init(playerApi) {
      set({ playerApi })
    },
    isIntersect() {
      const { playerBody } = get();
      const { isIntersect } = raycasterApi.getState().actions
      const { x, y, z } = playerBody.current.position
      return isIntersect([x, y, z])
    },
    decreaseLife() {
      set(produce(state => void (state.life -= Math.floor(1 + Math.random() * 5))))
    },
    resetLife() { set({ life: INITIAL_LIFE }) },
  }
}))

export const [useRaycaster, raycasterApi] = create((set, get) => ({
  raycast: new THREE.Raycaster(),
  actions: {
    isIntersect(position) {
      const { raycast } = get();
      const { mapItems } = mapApi.getState()

      raycast.set(new THREE.Vector3(...position), new THREE.Vector3(0, -1, 0))

      const intersects = raycast.intersectObjects(mapItems);
      return intersects?.length > 0
    },
  }
}))

export const [useMap, mapApi] = create(set => ({
  mapItems: [],
  mapBBoxes: [],
  mapBBox: new THREE.Box3(),
  addMapItem: x => set(produce(({ mapBBox, mapItems, mapBBoxes }) => {
    const box = new THREE.Box3();
    x.geometry.computeBoundingBox();
    box.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld);

    mapItems.push(x)
    mapBBoxes.push(box)
    mapBBox.union(box)

    if (mapItems.length === NUMBER_OF_MAP_BBOX) {
      const { initQuadtree } = quadtreeApi.getState()
      initQuadtree()
    }
  })),
}))

export const [useQuadtree, quadtreeApi] = create((set, get) => ({
  tree: null,
  initQuadtree() {
    const { mapBBox } = mapApi.getState()
    const { min, max } = mapBBox

    const tree = new Quadtree({
      x: 0,
      y: 0,
      width: max.x - min.x,
      height: max.z - min.z,
    }, 4);

    set({ tree })
  }
}))

export const [useOutline, outlineApi] = create(set => ({
  outline: [],
  addOutline: x => set(state => ({ outline: [...state.outline, x] })),
  removeOutline: x => set(state => ({ outline: state.outline.filter(({ uuid }) => x.uuid !== uuid) })),
}))

export const [useAssets] = create(set => ({
  powTexture: null,
  setPowTexture: x => set({ powTexture: x }),
  fiveTone: null,
  setFiveTone: x => set({ fiveTone: x }),
  exclamationTexture: null,
  setExclamationTexture: x => set({ exclamationTexture: x }),
  coronaNodes: null,
  setCoronaNodes: x => set({ coronaNodes: x }),
  coronaShadow: null,
  setCoronaShadow: x => set({ coronaShadow: x }),
}))