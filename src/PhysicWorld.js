import React, { Suspense, useEffect, useCallback, useRef } from "react";
import { Physics } from "use-cannon";
import * as THREE from "three";

import FirstPersonCamera from "./FirstPersonCamera";
import Map from "./Map";
import PhysicBat from "./PhysicBat";
import Corona from "./Corona";
import { useCorona, useMapBBoxes, COLLISION_GROUP } from "./store";
import { useThree } from "react-three-fiber";

function PhysicWorld(props) {
  const { callbacks } = props;
  const raycast = useRef(new THREE.Raycaster())

  const { scene } = useThree()

  const coronas = useCorona(s => s.coronas)
  const mapBBoxes = useMapBBoxes(s => s.mapBBoxes)
  const addCorona = useCorona(s => s.addCorona)

  const isIntersect = useCallback(
    function isIntersect(position) {
      raycast.current.set(new THREE.Vector3(position[0], position[1], position[2]), new THREE.Vector3(0, -1, 0))
      const intersects = raycast.current.intersectObjects(scene.children);
      const tilesIntersects = intersects?.filter(({ object }) => object?.userData?.type === COLLISION_GROUP.TILES)
      return tilesIntersects?.length > 0
    }, [raycast, scene])

  useEffect(() => {
    if (mapBBoxes.length === 15) {
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
    <Physics gravity={[0, -20, 0]} tolerance={0.0001} allowSleep={false} >
      <PhysicBat />
      {coronas.map(({ id, position }) => <Corona key={id} id={id} position={position} />)}
      <FirstPersonCamera callbacks={callbacks} position={[0, 30, 0]} />
      <Suspense fallback={null}>
        <Map />
      </Suspense>
    </Physics>
  )
}

export default PhysicWorld;