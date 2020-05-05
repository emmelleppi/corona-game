import React, { useState, useEffect } from "react";
import { Vector3 } from "three";

import { playerApi } from "../store"
import Sprite from '../utility/Sprite'

function SpeedLines() {

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
        if (handleV) {
            return playerApi.getState().playerApi.velocity.subscribe(handleV)
        }
    }, [playerApi, handleV])

    return (
        <>
            <Sprite
                visible={visible}
                opacity={visible}
                IconPosition={[0, 0, 0]}
                IconSize={scale}
                textureSrc="/speed-spritesheet.png"
                plainAnimatorArgs={[1, 28, 28, 24]}
            />
        </>
    )
}

export default SpeedLines;
