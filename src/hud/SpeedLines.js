import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useLoader, useFrame } from "react-three-fiber";
import lerp from "lerp"
import { bodyApi } from "../store"

import Sprite from '../utility/Sprite'
import { Vector3 } from "three";

function SpeedLines(props) {

    const scale = [window.innerWidth, window.innerHeight, 1]

    const TH = 8

    const [visible, setVisible] = useState(false)
    const handleV = React.useCallback((varr) => {
        const v = new Vector3(...varr).length()

        if (v > TH) {
            setVisible((v - TH) / TH)
        } else {
            setVisible(false)
        }
    }, [setVisible])

    useEffect(() => {
        if (bodyApi.current) {
            bodyApi.current.velocity.subscribe(handleV)
        }
    }, [bodyApi.current, handleV])


    return (
        <>
            <Sprite
                visible={visible}
                opacity={visible}
                IconPosition={[0, 0, 1]}
                IconSize={scale}
                textureSrc="/speed-spritesheet.png"
                plainAnimatorArgs={[1, 28, 28, 24]}
            />
        </>
    )
}

export default SpeedLines;
