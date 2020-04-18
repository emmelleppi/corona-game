import React from "react";
import { useFrame } from "react-three-fiber";
import { useBox } from "use-cannon";

import * as THREE from "three";

import { batRef, COLLISION_GROUP, useLife } from "./store"


function PhysicBat() {
  const { decrease } = useLife(s => s)

  const [mybody, api] = useBox(() => ({
    args: [0.03, 0.3, 0.03],
    type: "Kinematic",
    mass: 10,
    material: { friction: 1, restitution: 1 },
    linearDamping: 1,
    angularDamping: 1,
    collisionFilterGroup: COLLISION_GROUP.BAT,
    collisionFilterMask: COLLISION_GROUP.CORONA,
    onCollide: e => {
      
      const { body, contact } = e
      
      if (body?.userData?.type === COLLISION_GROUP.CORONA) {

        const { impactVelocity } = contact
        const absVelocity = Math.abs(impactVelocity)
        decrease(absVelocity)
        
      }

    }
  }));

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