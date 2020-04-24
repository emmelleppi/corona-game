import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from 'react-three-fiber'
import * as THREE from 'three'

import Renderer from './Renderer'
import PhysicsBody from './PhysBody'
import { getRandomUnity } from '../utils'
import { Vector3 } from 'three'

class Corona {

    constructor({ id, position, scene, group }) {
        this.scene = scene
        this.id = id
        this.position = new Vector3(...position)
        this.direction = new Vector3(getRandomUnity(), 0, getRandomUnity())

        this.moveSpeed = 400

        this.raycaster = new THREE.Raycaster()

        this.cache = {}
        this.group = group

        this.isSeeking = false
    }

    // draws helpers
    awake() {
        // const geometry = new THREE.CircleGeometry(1, 32);

        // for (let i = geometry.vertices.length - 1; i >= 0; i--) {
        //     const v = geometry.vertices[i]

        //     this.group.add(new THREE.ArrowHelper(new Vector3(v.x, 0, v.y), new Vector3(0, 0, 0), 2, 0xff0000));

        // }
    }

    update({ clock }) {
        this.deltaTime = clock.getDelta()

        this.lookAround()
        this.move()
    }

    // move to solid ground
    move() {

        const move = new Vector3()

        move.copy(this.direction)
        move.multiplyScalar(this.moveSpeed)

        const newPosition = new Vector3()

        newPosition.copy(this.position)
        newPosition.add(move)

        this.position.copy(newPosition)

        this.raycaster.set(
            newPosition,
            new THREE.Vector3(0, -1, 0)
        )
        this.raycaster.far = 10
        const intersects = this.raycaster.intersectObjects(this.scene.children, true)
        const isGrounded = intersects.length > 0

    }

    // raycasts for other corona or player
    lookAround() {

        const geometry = new THREE.CircleGeometry(1, 32);

        for (let i = geometry.vertices.length - 1; i >= 0; i--) {
            const v = geometry.vertices[i]

            this.raycaster.set(
                this.position,
                new Vector3(v.x, 0, v.y)
            )

            this.raycaster.far = 2

            const intersects = this.raycaster.intersectObjects([this.player], true)

            if (intersects.length > 0) {
                this.isSeeking = true
                continue
            }

        }


    }

}


function NewCorona({
    id,
    position,
    player
}) {

    const { scene } = useThree()

    const transform = useRef()
    const thisCorona = useRef(new Corona({ id, position, scene }))

    useFrame(({ clock }) => {
        thisCorona.current.update({ clock })

        transform.current.position.copy(
            thisCorona.current.position
        )
    })

    useEffect(() => {

        thisCorona.current.group = transform.current
        thisCorona.current.player = player.current
        thisCorona.current.awake()

    }, [])

    return (
        <group ref={transform}>
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial attach="material" wireframe />
                <circleGeometry attach="geometry" rotateY={Math.PI} args={[2, 32]} />
            </mesh>
            <PhysicsBody corona={thisCorona.current} />
            <Renderer corona={thisCorona.current} />
        </group>
    )

}

export default NewCorona