import React, { Suspense, useState } from "react";
import { useFrame, createPortal } from "react-three-fiber";
import * as THREE from "three";

import SpeedLines from "./hud/SpeedLines";
import Health from "./hud/Health";
import Cursor from "./hud/Cursor";
import Remaining from "./hud/Remaining";
import { useGame } from "./store";

function Hud() {
  const isGameStarted = useGame(s => s.isStarted)

  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => {

    const width = window.innerWidth;
    const height = window.innerHeight;

    const cam = new THREE.OrthographicCamera(
      - width / 2,
      width / 2,
      height / 2,
      - height / 2,
      1,
      10
    );

    cam.position.z = 10;

    cam.left = - width / 2;
    cam.right = width / 2;
    cam.top = height / 2;
    cam.bottom = - height / 2;
    cam.updateProjectionMatrix();

    return cam;
  });

  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene, camera)), 10)

  return createPortal(
    <>
      {isGameStarted && (
        <Suspense fallback={null}>
          <Health />
          <Remaining />
          <SpeedLines />
          <Cursor />
        </Suspense>
      )}
    </>,
    scene
  );
}

export default Hud