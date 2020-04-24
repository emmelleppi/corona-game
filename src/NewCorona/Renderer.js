import React, { useRef, useEffect, Suspense, forwardRef } from 'react'
import { useLoader, useResource, useFrame } from 'react-three-fiber'
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import { useOutline } from "../store"

import Exclamation from '../Exclamation';
import Pow from '../Pow';
import { useSpring, a, config } from 'react-spring/three';


const Renderer = forwardRef((props, ref) => {
    const { corona } = props

    const { isDead, isSeeking, isAttacking, isUnderAttack } = corona

    const group = useRef()
    const rotationGroup = useRef()

    const { addOutline, removeOutline } = useOutline(s => s)
    const [resourceRef, material] = useResource()

    const [springProps, set] = useSpring(() => ({ opacity: 1, config: config.molasses }))

    useEffect(() => void addOutline(group.current), [addOutline, group]);
    useEffect(() => {
        if (isDead) {
            removeOutline(group.current)
            set({
                opacity: 0,
                config: config.molasses,
                onRest: () => console.log('death callback')
            })
        }
    }, [isDead])

    const { nodes } = useLoader(GLTFLoader, '/corona.glb',
        loader => {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath("/draco-gltf/");
            loader.setDRACOLoader(dracoLoader);
        }
    )

    const rand = React.useRef(Math.floor(Math.random() * 10) + 1)

    useFrame(({ clock }) => {
        const multiplier = (isSeeking ? 2 : 1)

        group.current.position.y += 0

        console.log(corona)
    })

    return (
        <>
            <a.meshToonMaterial
                transparent
                color={isDead ? 0xff0000 : 0x1E9983}
                shininess={0.3}
                specular={0xaaaaaa}
                ref={resourceRef}
                {...springProps}
            />

            <group name="Corona Renderer" position={[0, 0, 0]} ref={group} dispose={null} scale={[0.3, 0.3, 0.3]} >
                <Suspense fallback={null}>
                    <Exclamation position={[0, 2.5, 0]} scale={[2, 2, 1]} visible={(isSeeking && !isAttacking)} />
                    <Pow position={[0, 1.5, 0]} scale={[2, 2, 1]} visible={isUnderAttack && !isSeeking} />
                </Suspense>
                <group ref={rotationGroup} >
                    <mesh castShadow material={material} geometry={nodes.Cube_0.geometry} name="Cube_0" />
                    <mesh castShadow material={material} geometry={nodes.Cube_1.geometry} name="Cube_1" />
                    <mesh castShadow material={material} geometry={nodes.Cube_2.geometry} name="Cube_2" />
                    <mesh castShadow material={material} geometry={nodes.Cube_3.geometry} name="Cube_3" />
                </group>
            </group>
        </>
    )

})

export default Renderer