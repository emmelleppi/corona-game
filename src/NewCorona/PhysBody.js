import React, { useRef, useEffect, useState, useCallback, forwardRef, Suspense } from 'react'
import { useLoader, useFrame, useResource } from 'react-three-fiber'
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useSphere, useParticle, useLockConstraint, useConeTwistConstraint } from 'use-cannon';

import { COLLISION_GROUP, bodyRef, useOutline, useCorona, usePlayerAttack } from "../store"

const Y_BIAS = .6

function PhysicsBody({ corona }) {

    const { id, position } = corona

    const [myBody, myBodyApi] = useSphere(() => ({
        args: 0.2,
        mass: 0.2,
        position: [position[0], position[1] + Y_BIAS, position[2]],
        collisionFilter: COLLISION_GROUP.CORONA,
        collisionFilterMask: COLLISION_GROUP.CHEST | COLLISION_GROUP.BAT | COLLISION_GROUP.CORONA | COLLISION_GROUP.TILES,
        onCollide: e => console.log('on collide')
    }))

    const [lock, lockApi] = useParticle(() => ({
        args: [0.05, 0.2, 0.5, 16],
        position: [position[0], position[1] + Y_BIAS, position[2]],
        material: { friction: 0, restitution: 0.2 },
        linearDamping: 0.1,
        angularDamping: 0.1,
        type: "Kinetic"
    }))

    useEffect(() => {
        corona.physicsBody = lock.currents
        corona.collider = myBody.current
    }, [])

    return (
        <>
            <mesh ref={lock} />
            <mesh ref={myBody} userData={{ type: COLLISION_GROUP.CORONA, id }} />
        </>
    )


}

export default PhysicsBody