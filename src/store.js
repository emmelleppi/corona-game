import create from 'zustand'
import produce from "immer"
import * as THREE from "three";
import { v4 as uuidv4 } from "uuid";
import { getRandomUnity } from './utility/math';
import { createRef } from "react"
import Quadtree from '@timohausmann/quadtree-js';
import { addEffect } from 'react-three-fiber'

export const INITIAL_LIFE = 100
const NUMBER_OF_SPAWNS = 4
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
  coronaSub: null,
  init() {},
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
    decreaseLife() {
      set(produce(state => void (state.life -= Math.floor(1 + Math.random() * 5))))
    },
    resetLife() { set({ life: INITIAL_LIFE }) },
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
    spawn(position) {

      const { coronas } = coronaApi.getState()

      if (coronas.length > 50) return

      set(produce(state => {

        state.coronas.push({
          id: uuidv4(),
          initPosition: position,
          store: createNewCorona(get),
        })

      }))

    },
    removeCorona(id) {
      set(produce(state => void (state.coronas = state.coronas.filter(x => x.id !== id))))
    },
  },
}))

function createNewCorona(getManager) {
  return create((set, get) => ({
    life: 2,
    status: CORONA_STATUS.IDLE,
    orientation: create((set, get) => ({
      coords: new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize(),
      setCoords(coords) { set({ coords }) },
    })),
    isUnderAttack: false,
    seekAlert: false,
    ref: createRef(),
    actions: {
      decreaseLife() {
        set(produce(state => {
          state.life -= Math.random() > 0.5 ? 1 : 2
          state.status = state.life < 0 ? CORONA_STATUS.DEAD : CORONA_STATUS.PRE_ATTACK
        }))
      },
      setStatus(newStatus) {
        const { status, actions } = get()
        if (status !== newStatus) {

          set({ status: newStatus })

          if (newStatus === CORONA_STATUS.SEEKING) {
            actions.setSeekAlert()
          }
          if (newStatus === CORONA_STATUS.PRE_ATTACK) {
            setTimeout(() => set({ status: CORONA_STATUS.ATTACK }), 2000)
          }
        }
      },
      setOrientation(_orientation) {
        const { setCoords } = get().orientation[1].getState()
        setCoords(_orientation)
      },
      setIsUnderAttack() {
        const callback = get().actions.resetIsUnderAttack
        set({ isUnderAttack: true })
        setTimeout(callback, 300)
      },
      resetIsUnderAttack() { set({ isUnderAttack: false }) },
      setSeekAlert() {
        const callback = get().actions.resetSeekAlert
        set({ seekAlert: true })
        setTimeout(callback, 5000)
      },
      resetSeekAlert() { set({ seekAlert: false }) },
      handleAttack() {
          const actions = get().actions
          actions.decreaseLife()
          actions.setIsUnderAttack()
      },
      updateSeekingOrientation() {
        const { ref } = get()

        const player = playerApi.getState().playerBody
        const { actions, orientation } = get()

        const dir = player.current.position.clone().sub(ref.current.position).normalize()
        dir.y = 0
        const diff = dir.clone().sub(orientation[1].getState().coords)

        if (diff.length() > ORIENTATION_THRESHOLD) {
          actions.setOrientation(dir)
        }
      },
      spawn() {
        const { coronas } = getManager()
        const { ref } = get()
        const { isStarted } = gameApi.getState()

        if (!isStarted || !ref.current || coronas.length > 50) return
        
        const position = ref.current.position.clone().add(
          new THREE.Vector3(getRandomUnity(), 0, getRandomUnity())
        ).toArray()

        coronaApi.getState().actions.spawn(position)
      },
      update() {
        const { ref, orientation, status, actions } = get()
        if (!ref.current) return
          
        if (status === CORONA_STATUS.DEAD || status === CORONA_STATUS.ATTACK) return
          
        const _orientation = orientation[1].getState().coords
        const { x, y, z } = ref.current.position
        const { isIntersect } = getManager().actions

        if (isIntersect([x + _orientation.x, y, z + _orientation.z])) {

          const player = playerApi.getState().playerBody
          const distance = player.current.position.clone().distanceTo(ref.current.position)

          if (status === CORONA_STATUS.SEEKING) {
            
            if (distance <= 1) {
              actions.setStatus(CORONA_STATUS.PRE_ATTACK)
            } else {
              actions.updateSeekingOrientation()
            }

          }
          if (status === CORONA_STATUS.PRE_ATTACK && distance > 1) {
            actions.setStatus(CORONA_STATUS.IDLE)
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
    const { update } = get()
    const { mapBBox } = mapApi.getState()
    const { min, max } = mapBBox

    const tree = new Quadtree({
      x: 0,
      y: 0,
      width: max.x - min.x,
      height: max.z - min.z,
    }, 4);

    set({ tree })
    addEffect(update)
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
  fiveTone: null,
  setFiveTone: x => set({ fiveTone: x }),
  exclamationTexture: null,
  setExclamationTexture: x => set({ exclamationTexture: x }),
  coronaNodes: null,
  setCoronaNodes: x => set({ coronaNodes: x }),
  coronaShadow: null,
  setCoronaShadow: x => set({ coronaShadow: x }),
}))