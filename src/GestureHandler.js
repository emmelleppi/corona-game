import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSpring, a, config } from 'react-spring/three';
import * as THREE from "three"

import { PointerLockControls } from "./PointerLockControls";
import { useInteraction, gameApi, useGame, playerApi, useCorona, coronaApi } from "./store";

function PreGameMode() {
  const [index, setIndex] = useState(0)
  const t = useRef(0)
  
  const { camera } = useThree();

  const coronas = useCorona(s => s.coronas)

  const { ref, orientation, coronaNum } = useMemo(() => {
    const { ref, orientation } = coronas?.[index]?.store?.[1]?.getState() || {}
    return { ref, orientation, coronaNum: coronas.length }
  }, [coronas, index])
  
  useFrame(({ clock }) => {
    t.current += clock.getDelta() * 1000

    if (t.current > 15) {
      t.current = 0;
      setIndex(index => (index + 1) % coronaNum)
    }

    if (ref?.current) {
      const { x, y, z } = ref.current.position
      const _orientation = orientation[1].getState().coords

      const lookAtVector = new THREE.Vector3(x - _orientation.x, y + 0.5, z - _orientation.z);

      camera.position.lerp(lookAtVector, 0.2);
      camera.lookAt(x, y, z);
    }
  })

  return null
}

function GestureHandler(props) {
  const { children } = props

  const { scene, setDefaultCamera, size } = useThree();

  const controls = useRef();
  const camera = useRef();

  const playerBody = useMemo(() => playerApi.getState().playerBody, [])

  const { isStarted: isGameStarted, isStartAnimation } = useGame(s => s)
  const { boost } = useInteraction(s => s)
  const { onDocumentKeyDown, onDocumentKeyUp } = useInteraction(s => s.actions)

  const spring = useSpring({ fov: boost ? 100 : 70, config: config.molasses })

  const lockPointerLock = useCallback(
    function lockPointerLock() {
      if (controls.current) {
        const { initGame } = gameApi.getState()
        initGame()
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

  useFrame(() => {
    if (playerBody.current) {
      if (isGameStarted) {
        camera.current.position.copy(playerBody.current.position)
      }
      if (isStartAnimation) {
        camera.current.position.lerp(playerBody.current.position, 0.1)
      }
    }
  })

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
      {!isStartAnimation && <PreGameMode />}
      {isGameStarted && children}
    </a.perspectiveCamera>
  )
}

export default GestureHandler