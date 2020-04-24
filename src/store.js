import { createRef } from "react";
import create from 'zustand'
import { v4 as uuid } from 'uuid';
import produce from "immer"

export const INITIAL_LIFE = 100

export const bodyRef = createRef()
export const bodyApi = createRef()

export const COLLISION_GROUP = {
    CORONA: 1,
    WALLS: 2,
    TILES: 4,
    BODY: 8,
    CHEST: 16,
    BAT: 32,
}

export const [useLife, lifeApi] = create(set => ({
    life: INITIAL_LIFE,
    increase: x => set(state => ({ life: state.life + x })),
    decrease: x => set(state => ({ life: state.life - x / 10 })),
    reset: () => set({ life: INITIAL_LIFE })
}))

export const [usePlayerAttack] = create(set => ({
    isAttacking: false,
    setAttacking: () => set({ isAttacking: true }),
    resetAttacking: () => set({ isAttacking: false })
}))

export const [useOutline] = create(set => ({
    outline: [],
    addOutline: x => set(state => ({ outline: [...state.outline, x] })),
    removeOutline: x => set(state => ({ outline: state.outline.filter(({ uuid }) => x.uuid !== uuid) })),
}))

let ci = 0;
export const [useCorona] = create(set => ({
    coronas: [],
    addCorona: position => set(state => ({ coronas: [...state.coronas, { id: ci++, position, life: 1, isAttacking: false, isSeeking: false, isDead: false }] })),
    removeCorona: id => set(state => ({ coronas: state.coronas.filter(x => x.id !== id) })),
    decreaseLife: (id, x) => set(state => produce(state, draft => {
        draft.coronas.forEach(item => {
            if (item.id === id) {
                item.life -= x / 2
                if (item.life < 0) {
                    item.isDead = true
                    item.isSeeking = false
                    item.isAttacking = false
                }
            }
        })
        return draft
    })),
    setAttacking: id => set(state => produce(state, draft => {
        draft.coronas.forEach(item => {
            if (item.id === id) {
                item.isAttacking = true
            }
        })
        return draft
    })),
    resetAttacking: id => set(state => produce(state, draft => {
        draft.coronas.forEach(item => {
            if (item.id === id) {
                item.isAttacking = false
            }
        })
        return draft
    })),
    setSeeking: id => set(state => produce(state, draft => {
        draft.coronas.forEach(item => {
            if (item.id === id) {
                item.isSeeking = true
            }
        })
        return draft
    })),
    resetSeeking: id => set(state => produce(state, draft => {
        draft.coronas.forEach(item => {
            if (item.id === id) {
                item.isSeeking = false
            }
        })
        return draft
    }))
}))

export const [useMapBBoxes] = create(set => ({
    mapBBoxes: [],
    addMapBBoxes: x => set(state => ({ mapBBoxes: [...state.mapBBoxes, x] })),
}))