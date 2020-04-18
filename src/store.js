import { createRef } from "react";
import create from 'zustand'
import { v4 as uuid } from 'uuid';

export const batRef = createRef()
export const bodyRef = createRef()
export const batGroupRef = createRef()
export const isAttackingRef = createRef(false)

export const COLLISION_GROUP = {
    CORONA: 1,
    WALLS: 2,
    TILES: 4,
    BODY: 8,
    CHEST: 16,
    BAT: 32,
}

export const [useLife] = create(set => ({
    life: 100,
    increase: x => set(state => ({ life: state.life + x })),
    decrease: x => set(state => ({ life: state.life - x / 10 })),
    reset: () => set({ life: 100 })
}))

export const [useOutline] = create(set => ({
    outline: [],
    addOutline: x => set(state => ({ outline: [...state.outline, x] })),
}))

export const [useCorona] = create(set => ({
    coronas: [],
    addCorona: position => set(state => ({ coronas: [...state.coronas, { id: uuid(), position }]})),
    removeCorona: id => set(state => ({ coronas: state.coronas.filter(x => x.id !== id) })),
}))

export const [useMapBBoxes] = create(set => ({
    mapBBoxes: [],
    addMapBBoxes: x => set(state => ({ mapBBoxes: [...state.mapBBoxes, x] })),
}))