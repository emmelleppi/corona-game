import React, { Suspense, useState } from "react";
import { useFrame, useThree, createPortal } from "react-three-fiber";
import * as THREE from "three";
import "styled-components/macro"

import SpeedLines from "./hud/SpeedLines";
import { useLife } from "./store";

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

        const width = window.innerWidth;
        const height = window.innerHeight;

        const cam = new THREE.OrthographicCamera(
            - width / 2,
            width / 2,
            height / 2,
            - height / 2,
            1,
            10
        );

        cam.position.z = 10;

        cam.left = - width / 2;
        cam.right = width / 2;
        cam.top = height / 2;
        cam.bottom = - height / 2;
        cam.updateProjectionMatrix();

        return cam;
    });

    useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene, camera)), 10)

    return createPortal(
        <>
            <Suspense fallback={null}>
                <ambientLight intensity={1} />
                <SpeedLines />
            </Suspense>
        </>,
        scene
    );
}

export default Hud