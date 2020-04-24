import * as THREE from "three"
import React, { useState, useEffect, useRef, useCallback } from "react"
import { useLoader, useFrame } from "react-three-fiber"
import { PlainAnimator } from "three-plain-animator/lib/plain-animator"
import { bodyApi } from "../store"

function Sprite(props) {

    const { textureSrc, plainAnimatorArgs, IconPosition, IconSize } = props

    const [animate, setAnimate] = useState(false)
    const onSuscribe = useRef()
    const spriteTexture = useLoader(THREE.TextureLoader, textureSrc)
    // This is how you keep local variables

    const [animator] = useState(() => new PlainAnimator(spriteTexture, ...plainAnimatorArgs))
    // And useFrame takes care of render-loop effects
    // This effect is cleared automatically when the component unmounts

    const handleSubscribe = useCallback(
        function handleSubscribe(v) {
            // v è un array [x,y,z]
        },
        [animate, setAnimate]
    )

    useEffect(() => {
        bodyApi.current.velocity.subscribe(v => onSuscribe.current(v))
    }, [bodyApi])

    useEffect(() => {
        onSuscribe.current = handleSubscribe
    }, [onSuscribe])

    useFrame(() => {
        if (animate) {
            animator.animate()
        }
    })

    return (
        <mesh position={IconPosition} visible={animate} >
            <boxBufferGeometry attach="geometry" args={IconSize} />
            <meshStandardMaterial attach="material" map={spriteTexture} alphaMap={spriteTexture} transparent={true} />
        </mesh>
    )
}

export default Sprite