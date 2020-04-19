import React, { useCallback, useEffect, useRef } from "react";
import { useFrame } from "react-three-fiber";
import { useBox } from "use-cannon";
import * as THREE from "three";

import { batRef, COLLISION_GROUP, useLife, useCorona } from "./store"


function PhysicBat() {
  const onCollide = useRef()

  const { decrease } = useLife(s => s)
  const coronas = useCorona(s => s.coronas)

  const [mybody, api] = useBox(() => ({
    args: [0.03, 0.3, 0.03],
    type: "Kinematic",
    mass: 10,
    material: { friction: 1, restitution: 1 },
    linearDamping: 1,
    angularDamping: 1,
    collisionFilterGroup: COLLISION_GROUP.BAT,
    collisionFilterMask: COLLISION_GROUP.CORONA,
    onCollide: e => onCollide.current(e)
  }));

  const handleCollide = useCallback(
    function handleCollide(e) {
      const { body, contact } = e
      const { type, id } = body?.userData

      if (type === COLLISION_GROUP.CORONA) {
        const { isAttacking } = coronas.filter(item => item.id === id)
        
        if (isAttacking) {
          console.log("bat")
          const { impactVelocity } = contact
          const absVelocity = Math.abs(impactVelocity)
          decrease(absVelocity)
        }
        
      }
    },
    [decrease, coronas]
  )

  useEffect(() => {
    onCollide.current = handleCollide
  }, [onCollide, handleCollide])

  useFrame(() => {
    if (!batRef.current) return

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    
    batRef.current.matrixWorld.decompose( position, quaternion, {} );
    euler.setFromQuaternion(quaternion)

    api.position.set(
      position.x,
      position.y,
      position.z,
    );
    api.rotation.set(
      euler.x,
      euler.y,
      euler.z ,
    );
  })

  return (
    <mesh ref={mybody} userData={{ type: COLLISION_GROUP.BAT }} />
  )
}

export default PhysicBat