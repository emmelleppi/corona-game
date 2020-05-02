import create from 'zustand'
import produce from "immer"
import * as THREE from "three";
import { v4 as uuidv4 } from "uuid";
import { getRandomUnity } from './utility/math';
import { createRef } from "react"
import Quadtree from '@timohausmann/quadtree-js';

export const INITIAL_LIFE = 100
const NUMBER_OF_SPAWNS = 30
const NUMBER_OF_MAP_BBOX = 15
const ORIENTATION_THRESHOLD = 0.5

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

export const [useGame, gameApi] = create((set, get) => ({
  isStarted: false,
  isStartAnimation: false,
  win: false,
  coronaSub: null,
  init() {

  },
  initGame() {
    set({ isStartAnimation: true })
    setTimeout(() => set({ isStarted: true }), 500)
    const coronaSub = coronaApi.subscribe(({ coronas }) => {
      if (coronas.length === 0) {
        const { win } = get()
        win()
      }
    })
    set({ coronaSub })
  },
  win() {
    const { initCoronas } = coronaApi.getState().actions
    initCoronas()
  }

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
      if (keyCode === 83) {
        set({ forward: value })
      } else if (keyCode === 87) {
        set({ backward: value })
      }

      if (keyCode === 65) {
        set({ left: value })
      } else if (keyCode === 68) {
        set({ right: value })
      }

      if (keyCode === 32) {
        const { isIntersect } = playerApi.getState().actions
        set({ jump: value && isIntersect() })
      }

      if (keyCode === 16) {
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
  isAttacking: false,
  playerBody: createRef(),
  playerApi: null,
  raycast: new THREE.Raycaster(),
  actions: {
    init(playerApi) {
      set({ playerApi })
    },
    isIntersect() {
      const { raycast, playerBody } = get();
      const { mapItems } = mapApi.getState()

      raycast.set(playerBody.current.position, new THREE.Vector3(0, -1, 0))

      const intersects = raycast.intersectObjects(mapItems);
      return intersects?.length > 0
    },
    decreaseLife(x) {
      set(produce(state => void (state.life -= Math.floor(Math.random(0, x) * 2) + x)))
    },
    resetLife() { set({ life: INITIAL_LIFE }) },
    setAttacking() { set({ isAttacking: true }) },
    resetAttacking() { set({ isAttacking: false }) },
  }
}))

export const [useCorona, coronaApi] = create((set, get) => ({
  coronas: [],
  raycast: new THREE.Raycaster(),
  actions: {
    initCoronas(toSpawn = NUMBER_OF_SPAWNS) {
      const { actions } = get();
      new Array(toSpawn).fill().forEach(() => actions.addCorona());
    },
    isIntersect(position) {
      const { raycast } = get();
      const { mapItems } = mapApi.getState()

      raycast.set(new THREE.Vector3(...position), new THREE.Vector3(0, -1, 0))

      const intersects = raycast.intersectObjects(mapItems);
      return intersects?.length > 0
    },
    addCorona() {
      set(
        produce(
          state => {
            const { actions } = get();
            const { mapBBoxes } = mapApi.getState()

            let position = null

            do {
              const bbox = mapBBoxes[Math.round(Math.random() * (mapBBoxes.length - 1))]
              const x = bbox.min.x + (bbox.max.x - bbox.min.x) * Math.random()
              const z = bbox.min.z + (bbox.max.z - bbox.min.z) * Math.random()
              if (actions.isIntersect([x, 1, z])) {
                position = [x, 0.6, z]
              }
            } while (!position)

            state.coronas.push({
              id: uuidv4(),
              initPosition: position,
              store: createNewCorona(get),
            })
          }
        )
      );
    },
    removeCorona(id) {
      set(produce(state => void (state.coronas = state.coronas.filter(x => x.id !== id))))
    },
  },
}))

function createNewCorona(getManager) {
  return create((set, get) => ({
    life: 3,
    status: CORONA_STATUS.IDLE,
    orientation: new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize(),
    isUnderAttack: false,
    seekAlert: false,
    ref: createRef(),
    actions: {
      decreaseLife() {
        set(produce(state => {
          state.life -= 1
          if (state.life < 0) {
            state.status = CORONA_STATUS.DEAD
          }
        }))
      },
      setStatus(newStatus) {
        const { status, actions } = get()
        if (status !== newStatus) {

          set({ status: newStatus })

          if (newStatus === CORONA_STATUS.SEEKING) {
            actions.setSeekAlert()
          }
        }
      },
      setOrientation(orientation) {
        set(produce(state => void (state.orientation = orientation)))
      },
      setIsUnderAttack() {
        const callback = get().actions.resetIsUnderAttack
        set({ isUnderAttack: true })
        setTimeout(() => callback(), 300)
      },
      resetIsUnderAttack() { set({ isUnderAttack: false }) },
      setSeekAlert() {
        const callback = get().actions.resetSeekAlert
        set({ seekAlert: true })
        setTimeout(() => callback(), 5000)
      },
      resetSeekAlert() { set({ seekAlert: false }) },
      handleAttack() {
        const isPlayerAttacking = playerApi.getState().isAttacking

        if (isPlayerAttacking) {
          const actions = get().actions
          actions.decreaseLife()
          actions.setIsUnderAttack()
        }
      },
      updateSeekingOrientation() {
        const { ref } = get()

        const player = playerApi.getState().playerBody
        const { actions, orientation } = get()

        const dir = player.current.position.clone().sub(ref.current.position).normalize()
        dir.y = 0
        const diff = dir.clone().sub(orientation)

        if (diff.length() > ORIENTATION_THRESHOLD) {
          actions.setOrientation(dir)
        }
      },
      update() {
        const { isIntersect } = getManager().actions
        const { ref, orientation, status, actions } = get()

        if (status === CORONA_STATUS.DEAD) return

        const { x, y, z } = ref.current.position

        if (isIntersect([x + orientation.x / 25, y, z + orientation.z / 25])) {

          if (
            status === CORONA_STATUS.SEEKING ||
            status === CORONA_STATUS.PRE_ATTACK
          ) {

            const player = playerApi.getState().playerBody
            const distance = player.current.position.clone().distanceTo(ref.current.position)

            if (distance < 1) {
              actions.setStatus(CORONA_STATUS.ATTACK)
            } else {
              actions.updateSeekingOrientation()
            }
          }

        } else {

          actions.setOrientation(new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize())

        }

      }
    }
  }))
}

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
      const { actions } = coronaApi.getState()
      const { initQuadtree } = quadtreeApi.getState()
      actions.initCoronas()
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
  },
  update() {
    const { tree } = get()
    const { coronas } = coronaApi.getState()
    const { isStarted } = gameApi.getState()
    
    if (!isStarted) {

      for (let i = 0; i < coronas.length; i++) {
        const { store } = coronas[i]
        const { actions } = store[1].getState()
        const { update } = actions
        update()
      }

    } else {

      tree.clear();

      for (let i = 0; i < coronas.length; i++) {
        const { store, id } = coronas[i]
        const { ref } = store[1].getState()

        const { x = 0, z = 0 } = ref?.current?.position

        tree.insert({
          id,
          x: x + 20,
          y: z + 20,
          width: 1,
          height: 1,
        });
      }

      const { x = 0, z = 0 } = playerApi.getState()?.playerBody?.current?.position
      const candidates = tree.retrieve({ x: x + 20, y: z + 20, width: 1, height: 1 })

      for (let i = 0; i < coronas.length; i++) {
        const { id, store } = coronas[i]
        const { actions, status } = store[1].getState()
        const { setStatus, update } = actions

        if (status === CORONA_STATUS.SEEKING || status === CORONA_STATUS.IDLE) {
          const isCandidate = candidates.findIndex(candidate => id === candidate.id) !== -1
          setStatus(isCandidate ? CORONA_STATUS.SEEKING : CORONA_STATUS.IDLE)
        }
        update()

      }

    }
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
  exclamationTexture: null,
  setExclamationTexture: x => set({ exclamationTexture: x }),
  coronaNodes: null,
  setCoronaNodes: x => set({ coronaNodes: x }),
  coronaShadow: null,
  setCoronaShadow: x => set({ coronaShadow: x }),
}))