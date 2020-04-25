import React, { useState } from "react"
import * as THREE from "three"
import { useLoader, useFrame } from "react-three-fiber"
import { PlainAnimator } from "three-plain-animator/lib/plain-animator"

function Sprite(props) {

    const { textureSrc, plainAnimatorArgs, IconPosition, IconSize, visible, opacity } = props

    const spriteTexture = useLoader(THREE.TextureLoader, textureSrc)
    // This is how you keep local variables

    const [animator] = useState(() => new PlainAnimator(spriteTexture, ...plainAnimatorArgs))
    // And useFrame takes care of render-loop effects
    // This effect is cleared automatically when the component unmounts

    useFrame(() => {
        if (visible) {
            animator.animate()
        }
    })

    return (
        <mesh position={IconPosition} visible={visible} >
            <boxBufferGeometry attach="geometry" args={IconSize} />
            <meshStandardMaterial transparent opacity={opacity} attach="material" map={spriteTexture} alphaMap={spriteTexture} transparent={true} />
        </mesh>
    )
}

export default Sprite