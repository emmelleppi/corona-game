import React, { Suspense, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { useThree } from "react-three-fiber";

import Corona from "./Corona";
import { useCorona, useMapBBoxes, COLLISION_GROUP } from "./store";

const NUMBER_OF_SPAWNS = 15

function CoronaManager() {

    const { coronas, addCorona } = useCorona(s => s)
    const mapBBoxes = useMapBBoxes(s => s.mapBBoxes)
    const raycast = useRef(new THREE.Raycaster())

    const { scene } = useThree()

    const isIntersect = useCallback(
        function isIntersect(position) {
            raycast.current.set(new THREE.Vector3(position[0], position[1], position[2]), new THREE.Vector3(0, -1, 0))
            const intersects = raycast.current.intersectObjects(scene.children);
            const tilesIntersects = intersects?.filter(({ object }) => object?.userData?.type === COLLISION_GROUP.TILES)
            return tilesIntersects?.length > 0
        }, [raycast, scene])

    useEffect(() => {
        if (mapBBoxes.length === NUMBER_OF_SPAWNS) {
            const positions = []

            do {
                const bbox = mapBBoxes[Math.round(Math.random() * (mapBBoxes.length - 1))]
                const x = bbox.min.x + (bbox.max.x - bbox.min.x) * Math.random()
                const z = bbox.min.z + (bbox.max.z - bbox.min.z) * Math.random()

                if (isIntersect([x, 1, z])) {
                    positions.push([x, 0, z])
                }
            } while (positions.length < 10)

            positions.forEach(addCorona)
        }
    }, [addCorona, mapBBoxes, isIntersect])

    return (
        coronas.map(({ id, position, life, isDead, isAttacking, isSeeking }) => (
            <Corona
                key={id}
                id={id}
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