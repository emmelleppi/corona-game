import React, { Suspense } from "react";
import { Physics, useBox, usePlane } from "use-cannon";

import Player from "./Player";
import Map from "./Map";
import CoronaManager from "./CoronaManager";
import { COLLISION_GROUP, PLAYER } from "./config";
import { serviceApi } from "./store";
import { useService } from "@xstate/react";

function Trampoline() {
  const [x, y, z] = PLAYER.INIT_POSITION;

  const [planeBody] = useBox(() => ({
    args: [1, 1, 1],
    position: [x, y - 1, z],
    rotation: [-Math.PI / 2, 0, 0],
    type: "Static",
    collisionFilterGroup: COLLISION_GROUP.TILES,
  }));

  return (
    <mesh ref={planeBody}>
      <circleBufferGeometry args={[1, 32, 32]} attach="geometry" />
      <meshToonMaterial
        attach="material"
        color={0x333333}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

function Floor() {
  const [,send] = useService(serviceApi.getState().service);

  const [planeBody] = usePlane(() => ({
    args: [100, 100],
    position: [0, -100, 0],
    rotation: [-Math.PI / 2, 0, 0],
    type: "Static",
    collisionFilterGroup: COLLISION_GROUP.TILES,
    collisionFilterMask: COLLISION_GROUP.BODY,
    onCollide: () => send("GAMEOVER")
  }));

  return (
    <mesh ref={planeBody} />
  );
}

function PhysicWorld() {
  
  return (
    <Physics gravity={[0, -40, 0]} tolerance={0.0001} allowSleep={false}>
      <Player position={PLAYER.INIT_POSITION} />
      <Trampoline />
      <Floor />
      <Suspense fallback={null}>
        <Map />
        <CoronaManager />
      </Suspense>
    </Physics>
  );
}

export default PhysicWorld;
