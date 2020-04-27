import create from 'zustand'
import produce from "immer"
import * as THREE from "three";
import { v4 as uuidv4 } from "uuid";
import { getRandomUnity } from './utility/math';

export const INITIAL_LIFE = 100
const NUMBER_OF_SPAWNS = 20
const NUMBER_OF_MAP_BBOX = 15

export const CORONA_STATUS = {
    IDLE: 0,
    SEEKING: 1,
    ATTACK: 2,
    DEAD: 3
}

export const COLLISION_GROUP = {
    CORONA: 1,
    WALLS: 2,
    TILES: 4,
    BODY: 8,
    CHEST: 16,
    BAT: 32,
}


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
                set({ jump: value })            
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


export const [usePlayer, playerApi] = create((set) => ({
    life: INITIAL_LIFE,
    isAttacking: false,
    playerBody: null,
    playerApi: null,
    actions: {
        init(playerBody, playerApi) {
            set({ playerBody, playerApi })
        },
        decreaseLife(x) { set(produce(state => void (state.life -= x / 10))) },
        resetLife() { set({ life: INITIAL_LIFE }) },
        setAttacking() { set({ isAttacking: true }) },
        resetAttacking() { set({ isAttacking: false }) },
    }
}))

export const [useCorona, coronaApi] = create((set, get) => ({
    coronas: [],
    raycast: new THREE.Raycaster(),
    actions: {
        initCoronas() {
            const { actions } = get();
            new Array(NUMBER_OF_SPAWNS).fill().forEach(() => actions.addCorona());
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

                    const position = []

                    do {
                        const bbox = mapBBoxes[Math.round(Math.random() * (mapBBoxes.length - 1))]
                        const x = bbox.min.x + (bbox.max.x - bbox.min.x) * Math.random()
                        const z = bbox.min.z + (bbox.max.z - bbox.min.z) * Math.random()
        
                        if (actions.isIntersect([x, 1, z])) {
                            position.push(x, 0.6, z)
                        }
                    } while(position.length === 0)
        
                    state.coronas.push({
                        id: uuidv4(),
                        initPosition: position,
                        store: createNewCorona(get)
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
        life: 1,
        status: CORONA_STATUS.IDLE,
        orientation: new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize(),
        isUnderAttack: false,
        ref: null,
        actions: {
            decreaseLife(x) {
                set(produce(state => {
                    state.life -= x
                    if (state.life < 0) {
                        state.status = CORONA_STATUS.DEAD
                    }
                }))
            },
            setStatus(status) {
                set(produce(state => void (state.status = status)))
            },
            setOrientation(orientation) {
                set(produce(state => void (state.orientation = orientation)))
            },
            setIsUnderAttack() {
                const callback = get().actions.resetIsUnderAttack
                set(produce(state => void (state.isUnderAttack = true)))
                setTimeout(() => callback(), 300)
            },
            resetIsUnderAttack() {
                set(produce(state => void (state.isUnderAttack = false)))
            },
            handleAttack(damage) {
                const isPlayerAttacking = playerApi.getState().isAttacking
    
                if (isPlayerAttacking) {
                    const actions = get().actions
                    actions.decreaseLife(damage)
                    // actions.setIsUnderAttack()
                }
            },
            setRef(ref) {
                set(produce(state => void (state.ref = ref)))
            },
            updateSeekingOrientation(position) {
                const { status } = get()
                if (status === CORONA_STATUS.SEEKING) {
                    const { actions, ref } = get()
                    const { x, y, z } = ref.current.position
    
                    const dir = new THREE.Vector3()
                    dir.subVectors(new THREE.Vector3(...position), new THREE.Vector3(x, y, z)).normalize();
                    dir.y = 0
                    actions.setOrientation(dir.clone())
                }
            },
            update() {
                const { isIntersect } = getManager().actions
                const { ref, orientation, status, actions } = get()
                const { x, y, z } = ref.current.position

                if (isIntersect([x + orientation.x / 25, y, z + orientation.z / 25])) {
                    
                    const player = playerApi.getState().playerBody
                    const line = new THREE.Line3(player.current.position , new THREE.Vector3(x, y, z))
                    const distance = line.distance()
                    
                    if (distance < 1 && status !== CORONA_STATUS.ATTACK) {

                        actions.setStatus(CORONA_STATUS.ATTACK)

                    } else if (distance >= 1 && distance < 4) {

                        if (status !== CORONA_STATUS.SEEKING) {
                            actions.setStatus(CORONA_STATUS.SEEKING)
                        }

                    } else {
                        if (status !== CORONA_STATUS.IDLE) {
                            actions.setStatus(CORONA_STATUS.IDLE)
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
    addMapItem: x => set(produce(({ mapItems, mapBBoxes }) => {

        const box = new THREE.Box3();
        x.geometry.computeBoundingBox();
        box.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld);

        mapItems.push(x)
        mapBBoxes.push(box)

        if (mapItems.length === NUMBER_OF_MAP_BBOX) {
            const { actions } = coronaApi.getState()
            actions.initCoronas()
        }
    })),
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
}))