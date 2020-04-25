import React, { Suspense, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { useThree, useLoader } from "react-three-fiber";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import Corona from "./Corona";
import { useCorona, useMapBBoxes, COLLISION_GROUP, usePowTexture, useExclamationTexture } from "./store";

const NUMBER_OF_SPAWNS = 10
const NUMBER_OF_MAP_BBOX = 15

function CoronaManager() {

    const { coronas, addCorona } = useCorona(s => s)
    const mapBBoxes = useMapBBoxes(s => s.mapBBoxes)
    const raycast = useRef(new THREE.Raycaster())

    const { scene } = useThree()

    const { nodes } = useLoader(GLTFLoader, '/corona.glb',
        loader => {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco-gltf/");
        loader.setDRACOLoader(dracoLoader);
        }
    )

    const setPowTexture = usePowTexture(s => s.setPowTexture)
    const powTexture = useLoader(THREE.TextureLoader, "/pow.png")
    useEffect(() => {
        setPowTexture(powTexture)
    }, [setPowTexture, powTexture])
    
    const setExclamationTexture = useExclamationTexture(s => s.setExclamationTexture)
    useEffect(() => {
        const WIDTH = 200
        const HEIGHT = 200
        const canvas = document.createElement("canvas")
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext("2d");
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillStyle = "red";
    
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 10;
        
        ctx.font = "200px Bangers";
        ctx.fillText("!", WIDTH / 2, HEIGHT / 2);
        ctx.strokeText("!", WIDTH / 2, WIDTH / 2);
    
        setExclamationTexture(new THREE.CanvasTexture(canvas))
      }, [setExclamationTexture])

    const isIntersect = useCallback(
        function isIntersect(position) {
            raycast.current.set(new THREE.Vector3(position[0], position[1], position[2]), new THREE.Vector3(0, -1, 0))
            const intersects = raycast.current.intersectObjects(scene.children);
            const tilesIntersects = intersects?.filter(({ object }) => object?.userData?.type === COLLISION_GROUP.TILES)
            return tilesIntersects?.length > 0
        }, [raycast, scene])

    useEffect(() => {
        if (mapBBoxes.length === NUMBER_OF_MAP_BBOX) {
            const positions = []

            do {
                const bbox = mapBBoxes[Math.round(Math.random() * (mapBBoxes.length - 1))]
                const x = bbox.min.x + (bbox.max.x - bbox.min.x) * Math.random()
                const z = bbox.min.z + (bbox.max.z - bbox.min.z) * Math.random()

                if (isIntersect([x, 1, z])) {
                    positions.push([x, 0.6, z])
                }
            } while (positions.length < NUMBER_OF_SPAWNS)

            positions.forEach(addCorona)
        }
    }, [addCorona, mapBBoxes, isIntersect])

    return (
        coronas.map(({ id, position, life, isDead, isAttacking, isSeeking }) => (
            <Corona
                key={id}
                id={id}
                nodes={nodes}
                position={position}
                isDead={isDead}
                life={life}
                isAttacking={isAttacking}
                isSeeking={isSeeking}
            />
        ))
    )

}

export default CoronaManager