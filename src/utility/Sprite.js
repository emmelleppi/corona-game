import * as THREE from "three"
import React, { useState } from "react"
import { useLoader, useFrame } from "react-three-fiber"
import { PlainAnimator } from "three-plain-animator/lib/plain-animator"

export default ({ textureSrc, plainAnimatorArgs, IconPosition, IconSize }) => {
    const spriteTexture = useLoader(THREE.TextureLoader, textureSrc)
    // This is how you keep local variables
    const [animator] = useState(() => new PlainAnimator(spriteTexture, ...plainAnimatorArgs))
    // And useFrame takes care of render-loop effects
    // This effect is cleared automatically when the component unmounts
    useFrame(() => animator.animate())
    return (
        <mesh position={IconPosition}>
            <boxBufferGeometry attach="geometry" args={IconSize} />
            <meshStandardMaterial attach="material" map={spriteTexture} alphaMap={spriteTexture} transparent={true} />
        </mesh>
    )
}
