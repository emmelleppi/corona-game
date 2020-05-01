import React, { useCallback, useEffect, useRef } from "react";
import { useThree, useFrame } from "react-three-fiber";

import { PointerLockControls } from "./PointerLockControls";
import lerp from "lerp";
import * as easing from './utility/easing'
import { usePlayer, useInteraction } from "./store";
import { PerspectiveCamera } from "drei";

function GestureHandler(props) {
    const { children } = props

    const { scene, setDefaultCamera } = useThree();

    const time = useRef(0)
    const controls = useRef();
    const camera = useRef();
    const api = usePlayer(s => s.playerApi)

    const { boost } = useInteraction(s => s)
    const { onDocumentKeyDown, onDocumentKeyUp } = useInteraction(s => s.actions)

    useFrame(() => {
        time.current += boost ? 1 : -1
        time.current = Math.min(Math.max(time.current, 0), 25)
        if (time.current >= 0 && time.current <= 25) {
            const fov = lerp(70, 100, easing.easeOutQuad(time.current / 25))
            camera.current.fov = fov
            camera.current.updateProjectionMatrix()
        }
    })
    
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
            return api.position.subscribe(([x, y, z]) => void camera.current.position.set(
                x,
                y + 0.2,
                z
            ))
        }
    }, [api, camera])

    return(
        <PerspectiveCamera ref={camera}  >
            {children}
        </PerspectiveCamera>
    )
}

export default GestureHandler