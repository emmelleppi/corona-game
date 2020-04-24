import React, { useRef, useEffect, forwardRef } from 'react'
import { useFrame, useThree } from 'react-three-fiber'
import * as THREE from 'three'
import { Vector3 } from 'three'

import Renderer from './Renderer'
import PhysicsBody from './PhysBody'
import { getRandomUnity } from '../utility/math'

class Corona {

    constructor({ id, position, scene, group }) {
        this.id = id
        this.scene = scene

        this.position = new THREE.Vector3(...position)
        this.direction = new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize()

        this.moveSpeed = 0.05

        this.raycaster = new THREE.Raycaster()

        this.cache = {}
        this.group = group

        this.isSeeking = false
        this.isGrounded = true
    }

    // draws helpers
    awake() {
        if (this.debug) {
            const geometry = new THREE.CircleGeometry(1, 32);

            for (let i = geometry.vertices.length - 1; i >= 0; i--) {
                const v = geometry.vertices[i]

                this.group.add(new THREE.ArrowHelper(new Vector3(v.x, 0, v.y), new Vector3(0, 0, 0), 2, 0xff0000));

            }
        }
    }

    update({ clock }) {
        this.deltaTime = clock.getDelta()

        this.checkForPlayer()
        this.lookAround()
        this.move()
        if (this.isSeeking) {
        } else {
        }
    }

    updateDirection() {
        if (this.isSeeking) {
            const direction = new THREE.Vector3()
            direction.subVectors(this.player.position, this.position)
                .setY(0)
                .normalize()
                .multiplyScalar(this.moveSpeed * 1.5)
            this.direction = direction.clone()
        } else {
            this.direction = new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize().multiplyScalar(this.moveSpeed)
        }
    }

    // move to solid ground
    move() {
        const newPosition = this.position.clone()
        newPosition.add(this.direction)

        this.checkGround(newPosition)

        if (!this.isGrounded) {
            this.updateDirection()
        } else {
            this.position.copy(newPosition)
        }
    }

    checkForPlayer() {
        const distance = this.position.distanceTo(this.player.position)

        if (distance < 10) {
            if (!this.isSeeking) {
                this.isSeeking = true
            }
            this.updateDirection()
        } else {
            if (this.isSeeking) {
                this.isSeeking = false
            }
        }
    }

    // raycasts for other corona or player
    lookAround() {
        const geometry = new THREE.CircleGeometry(1, 8);

        for (let i = geometry.vertices.length - 1; i >= 0; i--) {
            const v = geometry.vertices[i]

            this.raycaster.set(this.position, new THREE.Vector3(v.x, 0, v.y))
            this.raycaster.far = 20

            const intersects = this.raycaster.intersectObjects([this.player])

            if (intersects.length > 0) {

            }
        }
    }

    seek() {
    }

    checkGround(position) {
        this.raycaster.set(position, new THREE.Vector3(this.direction.x, -1, this.direction.z))
        this.raycaster.far = 10

        const intersects = this.raycaster.intersectObjects(this.scene.children)

        this.isGrounded = intersects.length > 0
    }
}

const NewCorona = forwardRef((props, player) => {
    const { id, position } = props

    const { scene } = useThree()

    const transform = useRef()
    const thisCorona = useRef(new Corona({ id, position, scene }))

    useEffect(() => {
        thisCorona.current.player = player.current
        thisCorona.current.group = transform.current
        thisCorona.current.awake()
        
    }, [thisCorona, player, transform])
    
    useFrame(({ clock }) => {
        thisCorona.current.update({ clock })
        transform.current.position.copy(thisCorona.current.position)
    })

    return (
        <group ref={transform}>
            <mesh>
                <sphereBufferGeometry attach="geometry" args={[0.2, 8, 8]} />
                <meshBasicMaterial attach="material" color="red" />
            </mesh>
            <Renderer corona={thisCorona} />
            {/* <PhysicsBody ref={thisCorona} /> */}
            {/* <Renderer ref={thisCorona} /> */}
        </group>
    )

})

export default NewCorona