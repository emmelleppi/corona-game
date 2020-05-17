import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSpring, a, config } from "react-spring/three";
import * as THREE from "three";
import { useService } from "@xstate/react";

import { PointerLockControls } from "./PointerLockControls";
import { useInteraction, serviceApi } from "./store";
import useInterval from "./utility/useInterval"

function FollowCorona(props) {
  const { interpreter } = props

  const { camera } = useThree();

  const [{ context }] = useService(interpreter);

  useFrame(function () {
    const { phyRef, orientation } = context;

    if (phyRef.current && orientation.current) {
      const { x, y, z } = phyRef.current.position;

      const lookAtVector = new THREE.Vector3(
        x - 2 * orientation.current.x,
        y + 1,
        z - 2 * orientation.current.z
      );

      camera.position.lerp(lookAtVector, 0.2);
      camera.lookAt(x, y, z);
    }
  });

  return null
}

function PreGameMode(props) {
  const { coronas } = props

  const [index, setIndex] = useState(0);

  useInterval(() => setIndex((index) => (index + 1) % coronas.length), 3000)

  return <FollowCorona interpreter={coronas[index]?.ref} />;
}

function GestureHandler(props) {
  const { children } = props;

  const { scene, setDefaultCamera, size } = useThree();

  const controls = useRef();
  const camera = useRef();
  
  const [current, send] = useService(serviceApi.getState().service);
  const { playerBody, showPlayer, coronas } = current?.context

  const { isGameStarted, isStartAnimation } = useMemo(
    () => ({
      isGameStarted: current.matches("start") || current.matches("win"),
      isStartAnimation: current.matches("initAnimation"),
    }),
    [current]
  );

  const { boost } = useInteraction((s) => s);
  const { onDocumentKeyDown, onDocumentKeyUp } = useInteraction(
    (s) => s.actions
  );

  const spring = useSpring({ fov: boost ? 100 : 70, config: config.molasses });

  const lockPointerLock = useCallback(
    function lockPointerLock() {
      if (controls.current) {
        send("ANIMATION");
        controls.current.lock();
      }
    },
    [send, controls]
  );

  useEffect(() => void setDefaultCamera(camera.current), [
    setDefaultCamera,
    camera,
  ]);

  useEffect(() => {
    const canvas = document.getElementsByTagName("canvas")[0];
    controls.current = new PointerLockControls(camera.current, canvas);
    canvas.addEventListener("click", lockPointerLock, false);

    const obj = controls.current.getObject();
    scene.add(obj);

    return () => {
      canvas.removeEventListener("click", lockPointerLock);
      controls.current.unlock();
      scene.remove(obj);
    };
  }, [controls, lockPointerLock, scene]);

  useEffect(() => {
    document.addEventListener("keydown", onDocumentKeyDown, false);
    document.addEventListener("keyup", onDocumentKeyUp, false);

    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("keyup", onDocumentKeyUp);
    };
  }, [onDocumentKeyDown, onDocumentKeyUp]);

  useEffect(
    () => void (isStartAnimation && camera.current.lookAt(0, -1, -0.5)),
    [isStartAnimation, camera]
  );

  useFrame(function () {
    if (playerBody.current) {
      if (isGameStarted) {
        camera.current.position.copy(playerBody.current.position);
      }
      if (isStartAnimation) {
        camera.current.position.lerp(playerBody.current.position, 0.1);
      }
    }
  });

  return (
    <a.perspectiveCamera
      ref={camera}
      args={[60, size.width / size.height, 0.1, 300]}
      {...spring}
      onUpdate={(camera) => {
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
      }}
    >
      {!showPlayer && coronas.length > 0 && <PreGameMode coronas={coronas} />}
      {children}
    </a.perspectiveCamera>
  );
}

export default GestureHandler;
