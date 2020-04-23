import React, { Suspense, useState } from "react";
import { useFrame, useThree, createPortal } from "react-three-fiber";
import * as THREE from "three";
import "styled-components/macro"

import Pow from "./Pow";
import { useLife } from "./store";
import speed from './speed.jpg'

function DomHud() {

    const { life } = useLife()

    return (
        <div css={`
            z-index: 10;
            position:fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
        `}>

            {/* Health bar */}
            <div
                css={`
                    position: fixed; 
                    border: 8px solid #903D62;
                    background-color: transparent;

                    bottom: 4rem;
                    left: 4rem;

                    width: 320px;
                    height: 32px;
                `}
            >

                <div css={`
                    width: 100%;
                    height: 100%;
                    background-color: #903D62;

                    transform: scaleX(${(life) / 100});
                    transform-origin: right;
                `}></div>

            </div>

        </div>
    )

}

function Hud() {
    const { aspect } = useThree();
    const distance = 15;

    const [scene] = useState(() => new THREE.Scene())
    const [camera] = useState(() => {
        const cam = new THREE.OrthographicCamera(
        -distance * aspect,
        distance * aspect,
        distance,
        -distance,
        0.1,
        100
        );
        return cam;
    });			
    useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene, camera)), 10)

    return createPortal(
        <>
        <Suspense fallback={null}>
            <Pow position={[-25, -12, -1]} scale={[4,4,4]} />
        </Suspense>
        </>,
        scene
    );
}

export default Hud