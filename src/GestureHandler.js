import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSpring, a, config } from 'react-spring/three';
import * as THREE from "three"
import { useService } from "@xstate/react";

import { PointerLockControls } from "./PointerLockControls";
import { useInteraction, playerApi, serviceApi } from "./store";

function PreGameMode() {
  const [index, setIndex] = useState(0)
  const t = useRef(0)
  
  const { camera } = useThree();

  const [{ context }] = useService(serviceApi.getState().service);
  const { coronas } = context

  const [corona] = useService(coronas[index].ref);

  const { ref, orientation } = useMemo(() => {
    const { context } = corona
    const { phyRef, orientation } = context

    return { ref: phyRef, orientation }
  }, [corona])

  useFrame(
    function({ clock }) {
      t.current += clock.getDelta() * 1000

      if (t.current > 50) {
        t.current = 0;
        setIndex(index => (index + 1) % coronas.length)
      }

      if (ref.current && orientation.current) {
        const { x, y, z } = ref.current.position

        const lookAtVector = new THREE.Vector3(x - 2 * orientation.current.x, y + 1, z - 2 * orientation.current.z);

        camera.position.lerp(lookAtVector, 0.2);
        camera.lookAt(x, y, z);
      }
    }
  )

  return null
}

function GestureHandler(props) {
  const { children } = props

  const { scene, setDefaultCamera, size } = useThree();

  const controls = useRef();
  const camera = useRef();

  const playerBody = useMemo(() => playerApi.getState().playerBody, [])

  const [current, send] = useService(serviceApi.getState().service);

  const {
    isGameStarted,
    isStartAnimation,
    isWaitingUser
  } = useMemo(() => ({
    isGameStarted: current.matches('start'),
    isStartAnimation: current.matches('initAnimation'),
    isWaitingUser: current.matches('waitUser'),
  }), [current])

  const { boost } = useInteraction(s => s)
  const { onDocumentKeyDown, onDocumentKeyUp } = useInteraction(s => s.actions)

  const spring = useSpring({ fov: boost ? 100 : 70, config: config.molasses })

  const lockPointerLock = useCallback(
    function lockPointerLock() {
      if (controls.current) {
        send("ANIMATION")
        controls.current.lock();
      }
    },
    [send, controls]
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
      controls.current.unlock()
      scene.remove(obj);
    }
  }, [controls, lockPointerLock, scene])

  useEffect(() => {
    document.addEventListener("keydown", onDocumentKeyDown, false);
    document.addEventListener("keyup", onDocumentKeyUp, false);

    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("keyup", onDocumentKeyUp);
    };
  }, [onDocumentKeyDown, onDocumentKeyUp]);

  useEffect(() => void (isStartAnimation && camera.current.lookAt(0, -1, -0.5)), [isStartAnimation, camera])

  useFrame(
    function() {
      if (playerBody.current) {
        if (isGameStarted) {
          camera.current.position.copy(playerBody.current.position)
        }
        if (isStartAnimation) {
          camera.current.position.lerp(playerBody.current.position, 0.1)
        }
      }
    }
  )

  return (
    <a.perspectiveCamera
      ref={camera}
      args={[60, size.width / size.height, .1, 300]}
      {...spring}
      onUpdate={camera => {
        camera.aspect = size.width / size.height
        camera.updateProjectionMatrix()
      }}
    >
      {isWaitingUser && <PreGameMode />}
      {isGameStarted && children}
    </a.perspectiveCamera>
  )
}

export default GestureHandler