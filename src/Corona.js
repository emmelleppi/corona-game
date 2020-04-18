/*
auto-generated by: https://github.com/react-spring/gltfjsx
*/

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useLoader, useFrame, useResource } from 'react-three-fiber'
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useSphere, useParticle, useConeTwistConstraint } from 'use-cannon';
import { useSpring, a, config } from 'react-spring/three';
import * as THREE from "three";

import { isAttackingRef, COLLISION_GROUP, bodyRef, useOutline, useCorona } from "./store"
import { getRandomUnity } from './utils';
import Exclamation from './Exclamation';
import Pow from './Pow';

const ATTACK_DURATION = 50
const Y_BIAS = 1.1

function Corona(props) {
  const { position, id } = props

  const [isDeath, setIsDeath] = useState(false)
  const [seek, setSeek] = useState(false)
  const [attack, setAttack] = useState(false)
  const [attacked, setAttacked] = useState(false)
  
  const onCollide = useRef()
  const group = useRef()
  const time = useRef(0)
  const velocity = useRef()
  const orientation = useRef()
  const raycast = useRef(new THREE.Raycaster())
  const life = useRef(2)

  const removeCorona = useCorona(s => s.removeCorona)

  const addOutline = useOutline(s => s.addOutline)
  const removeOutline = useOutline(s => s.removeOutline)
  
  useEffect(() => {
    addOutline(group.current);
  }, [addOutline, group]);

  const { nodes } = useLoader(GLTFLoader, '/corona.glb',
    loader => {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/draco-gltf/");
      loader.setDRACOLoader(dracoLoader);
    }
  )

  const fiveTone = useLoader(THREE.TextureLoader, "/fiveTone.jpg")
  fiveTone.minFilter = THREE.NearestFilter;
  fiveTone.magFilter = THREE.NearestFilter

  const [mybody, mybodyApi] = useSphere(() => ({
    args: 0.2,
    mass: .1,
    position,
    material: { friction: 0, restitution: 0 },
    linearDamping: 0.1,
    angularDamping: 0.1,
    collisionFilterGroup: COLLISION_GROUP.CORONA,
    collisionFilterMask: COLLISION_GROUP.CHEST | COLLISION_GROUP.BAT | COLLISION_GROUP.CORONA | COLLISION_GROUP.TILES,
    onCollide: e => onCollide.current(e)
  }))
  
  const [lock, lockApi] = useParticle(() => ({
    args: [0.05, 0.2, 0.5, 16],
    mass: 0,
    position: [position[0], position[1] + Y_BIAS ,position[2]],
    material: { friction: 0, restitution: 0.2 },
    linearDamping: 0.1,
    angularDamping: 0.1,
    type:"Kinetic"
  }))

  const [ , , { disable }] = useConeTwistConstraint(lock, mybody, {
    pivotA: [0, 0, 0],
    pivotB: [0, .5, 0],
    twistAngle: .1,
  })
  
  const handleCollide = useCallback(
    function handleCollide(e) {
      
      const { contact, body } = e
      const { impactVelocity, ni } = contact

      mybodyApi.rotation.set(
        mybody.current.rotation.x + ni[0],
        mybody.current.rotation.y + ni[1],
        mybody.current.rotation.z + ni[2]
      )
      
      if (isAttackingRef.current && body?.userData?.type === COLLISION_GROUP.BAT) {

        const absVelocity = Math.abs(impactVelocity)
        life.current -= absVelocity

        setAttacked(s => { if (!s) return true })
        
        if (life.current < 0) {
          disable()
          setIsDeath(true)

          const dir = new THREE.Vector3()
          dir.subVectors(bodyRef.current.position, mybody.current.position).normalize();
          mybodyApi.applyImpulse([-dir.x, -3, -dir.z], [0,0,0])
        }
      }

    },
    [mybody, bodyRef, mybodyApi, isAttackingRef, life, setIsDeath, disable]
  )

  const updateOrientation = useCallback(
    function updateOrientation() {
      velocity.current = new THREE.Vector2(getRandomUnity(), getRandomUnity()).normalize()
      orientation.current =  new THREE.Vector3(velocity.current.x, 0, velocity.current.y).normalize()
    },
    [velocity, orientation]
  )
  
  const [springProps, set] = useSpring(() => ({ opacity: 1, config: config.molasses }))
  const [resourceRef, material] = useResource()

  const getIntersects = useCallback(
    function getIntersects(position, orientation, scene, collisionArray) {

      raycast.current.set(position, orientation)
      const intersects = raycast.current.intersectObjects(scene.children);
      
      return intersects.filter(({ object }) => collisionArray.includes(object?.userData?.type))
    }, [raycast])

  const updatePosition = useCallback(
    function updatePosition(scene) {
      const bodies = getIntersects(mybody.current.position, orientation.current, scene, [COLLISION_GROUP.BODY, COLLISION_GROUP.CORONA])
      const tiles = getIntersects(
        new THREE.Vector3(
          mybody.current.position.x + velocity.current.x / 25,
          mybody.current.position.y,
          mybody.current.position.z  + velocity.current.y / 25
        ),
        new THREE.Vector3(0, -1, 0),
        scene,
        [COLLISION_GROUP.TILES]
      )
      
      if (bodies?.[0]?.distance < 0.5 || tiles?.length === 0) {
        updateOrientation()
      } else {
        lockApi.position.set(lock.current.position.x + velocity.current.x / 50, position[1] + Y_BIAS, lock.current.position.z + velocity.current.y / 50)
      }
    },
    [raycast, mybody, orientation, lockApi, updateOrientation, velocity]
  )

  const seekBody = useCallback(
    function seekBody() {
      const dir = new THREE.Vector3()
      dir.subVectors(bodyRef.current.position, mybody.current.position).normalize();
      
      lockApi.position.set(lock.current.position.x + dir.x / 40, position[1] + Y_BIAS, lock.current.position.z + dir.z / 40)
    },
    [bodyRef, mybody, lockApi]
  )

  const checkProximityToBody = useCallback(
    function checkProximityToBody(scene) {
      const line = new THREE.Line3(mybody.current.position, bodyRef.current.position)
      const distance = line.distance()

      if (seek && !attack && distance < 1) {

        setSeek(false)
        setAttack(true)

      } else if (distance >= 1 && distance < 4) {
        
        if (attack) {
          setSeek(true)
          setAttack(false)
        }

        const dir = new THREE.Vector3()
        dir.subVectors(bodyRef.current.position, mybody.current.position).normalize();
        
        raycast.current.set(mybody.current.position, dir)
        const intersect = raycast.current.intersectObjects(scene.children);

        if (intersect[0]?.object?.userData?.type === COLLISION_GROUP.CHEST) {
          setSeek(true)
        }

      } else {
        if (seek) {
          setSeek(false)
        }
        if (attack) {
          setAttack(false)
        }
      }
    },
    [raycast, seek, setSeek]
  )

  const handleAttack = useCallback(
    function handleAttack() {
      if (time.current === ATTACK_DURATION) {
        const dir = new THREE.Vector3()
        dir.subVectors(bodyRef.current.position, mybody.current.position).normalize();
        mybodyApi.applyImpulse([dir.x, 0, dir.z], [0,0,0])
        time.current = 0
      }

      time.current += 1
    },
    [time]
  )
  
  useEffect(() => {
    onCollide.current = handleCollide
  }, [onCollide, handleCollide])

  useEffect(() => {
    if (isDeath) {
      set({ opacity: 0, config: config.molasses, onStart: () => removeOutline(group.current), onRest: () => removeCorona(id) })
    }
  }, [isDeath, removeCorona, group, removeOutline])

  useEffect(() => {
    updateOrientation()
  }, [updateOrientation])

  useEffect(() => {
    if (attacked) {
      setTimeout(() => setAttacked(false), 300)
    }
  }, [attacked, setAttacked])

  useFrame(({ scene }) => {
    group.current.position.x = mybody.current.position.x
    group.current.position.y = mybody.current.position.y
    group.current.position.z = mybody.current.position.z
    
    group.current.rotation.x = mybody.current.rotation.x
    group.current.rotation.y = mybody.current.rotation.y
    group.current.rotation.z = mybody.current.rotation.z

    if (!isDeath) {

      checkProximityToBody(scene)
  
      if (attack) {
        handleAttack()
      }else if (seek) {
        seekBody()
      } else {
        updatePosition(scene)
      }
    }

  })

  return  (
    <>
      <a.meshToonMaterial
        transparent
        color={isDeath ? 0xff0000 : 0x469963}
        shininess={1}
        specular={0}
        gradientMap={fiveTone}
        ref={resourceRef}
        {...springProps}
       />

      <mesh ref={lock} />
      <mesh ref={mybody} userData={{ type: COLLISION_GROUP.CORONA }} />
      
      <group ref={group} dispose={null} scale={[0.1, 0.1,0.1]} >
        <Exclamation position={[0, 2.5, 0]} scale={[2, 2, 1]} visible={(seek && !attack)}/>
        <Pow position={[0, 1.5, 0]} scale={[2, 2, 1]} visible={attacked && !seek} />
        <mesh castShadow={!isDeath} material={material} geometry={nodes.Cube_0.geometry} name="Cube_0" />
        <mesh castShadow={!isDeath} material={material} geometry={nodes.Cube_1.geometry} name="Cube_1" />
        <mesh castShadow={!isDeath} material={material} geometry={nodes.Cube_2.geometry} name="Cube_2" />
        <mesh castShadow={!isDeath} material={material} geometry={nodes.Cube_3.geometry} name="Cube_3" />
      </group>
    </>
  )
}

export default Corona