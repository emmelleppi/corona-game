import React, { useCallback, useEffect, useRef } from "react";
import { useThree } from "react-three-fiber";
import * as THREE from "three";

import { PointerLockControls } from "./PointerLockControls";
import lerp from "lerp";
import * as easing from './utility/easing'
import { useInteraction, usePlayer } from "./store";
import { PerspectiveCamera } from "drei";

const WALKING_STEP = 0.2;

function GestureHandler(props) {
    const { children } = props

    const { scene, setDefaultCamera } = useThree();

    const walking = useRef(0);
    const controls = useRef();
    const camera = useRef();
    const api = usePlayer(s => s.playerApi)

    const { onDocumentKeyDown, onDocumentKeyUp } = useInteraction(s => s.actions)

    const handleV = React.useCallback(
        function handleV(varr) {
            const [x, y, z] = varr
            const v = Math.floor(new THREE.Vector3(x, y, z).length() * 10) / 10
            const fov = lerp(70, 90, easing.easeOutQuad(v / 12))

            camera.current.fov = fov
            camera.current.updateProjectionMatrix()

            const vel = new THREE.Vector2(x, z)

            if (vel.length() > 0) {
                if (walking.current === 0) {
                    walking.current = WALKING_STEP;
                }
            } else {
                if (walking.current > 0) {
                    walking.current += WALKING_STEP;
                }
            
                if (walking.current > 2 * Math.PI) {
                    walking.current = 0;
                }
            }
        },
        [camera, walking]
    )
    
    const lockPointerLock = useCallback(
        function lockPointerLock() {
            if (controls.current) {
                controls.current.lock();
            }
        },
        [controls]
    );

    useEffect(() => void (setDefaultCamera(camera.current)), [setDefaultCamera, camera])

    useEffect(() => {
        const canvas = document.getElementsByTagName("canvas")[0];
        controls.current = new PointerLockControls(camera.current, canvas);
        canvas.addEventListener("click", lockPointerLock, false);
    
        const obj = controls.current.getObject();
        scene.add(obj);

        return () => {
            canvas.removeEventListener("click", lockPointerLock);
            scene.remove(obj);
        }
    }, [controls,lockPointerLock, scene])

    useEffect(() => {
        document.addEventListener("keydown", onDocumentKeyDown, false);
        document.addEventListener("keyup", onDocumentKeyUp, false);
    
        return () => {
            document.removeEventListener("keydown", onDocumentKeyDown);
            document.removeEventListener("keyup", onDocumentKeyUp);
        };
    }, [onDocumentKeyDown, onDocumentKeyUp]);
      
    useEffect(() => {
        if (api) {
            return api.velocity.subscribe(handleV)
        }
    }, [api, handleV])

    useEffect(() => {
        if (api) {
            return api.position.subscribe(([x, y, z]) => void camera.current.position.set(
                x,
                y + 0.5 + (0.05 * (1 - Math.cos(walking.current))) / 2,
                z
            ))
        }
    }, [api, camera])

    return(
        <PerspectiveCamera ref={camera} fov={70} >
            {children}
        </PerspectiveCamera>
    )
}

export default GestureHandler