import React, { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useLoader, useFrame } from "react-three-fiber";
import lerp from "lerp"

import Sprite from '../utility/Sprite'

import * as easing from '../utility/easing'

import { noise } from '../utility/noise'

function SpeedLines(props) {

    const scale = [window.innerWidth, window.innerHeight, 1]

    return (
        <>
            <Sprite IconPosition={[0, 0, 1]} IconSize={scale} textureSrc="/speed-spritesheet.png" plainAnimatorArgs={[1, 28, 28, 24]} />
        </>
    )
}

export default SpeedLines;
