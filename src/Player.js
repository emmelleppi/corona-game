import React, {
  useCallback,
  useEffect,
  Suspense,
  useState,
  useRef,
} from "react";
import { useThree, useFrame } from "react-three-fiber";
import { useSphere, useCylinder } from "use-cannon";
import * as THREE from "three";
import useSound from "use-sound";
import { useService } from "@xstate/react";

import {
  usePlayer,
  useInteraction,
  interactionApi,
  playerApi,
  serviceApi,
} from "./store";
import BaseballBat from "./BaseballBat";
import jumpSfx from "./sounds/Jump.wav";
import boostSfx from "./sounds/Sprint.wav";
import GestureHandler from "./GestureHandler";
import { PLAYER, COLLISION_GROUP } from "./config";

const {
  JUMP_IMPULSE,
  VELOCITY,
  BOOST_FACTOR,
  BODY_RADIUS,
  BODY_LINEAR_DAMPING,
  BODY_ANGULAR_DAMPING,
  Y_AXIS,
} = PLAYER;

function PhyPlayer(props) {
  const { position } = props;

  const isOnTiles = useRef(false);
  const onCollide = useRef();

  const { camera } = useThree();

  const [{ context }] = useService(serviceApi.getState().service);

  const { actions, playerBody } = usePlayer((s) => s);

  const { left, right, forward, backward, jump, boost } = useInteraction(
    (s) => s
  );

  const [mybody, api] = useSphere(() => ({
    mass: 1,
    args: BODY_RADIUS,
    type: "Dynamic",
    position,
    linearDamping: BODY_LINEAR_DAMPING,
    angularDamping: BODY_ANGULAR_DAMPING,
    collisionFilterGroup: COLLISION_GROUP.BODY,
    collisionFilterMask: COLLISION_GROUP.TILES,
    onCollide: (e) => {
      const { body } = e;
      if (!body) return;
      const { type } = body?.userData;
      if (type === COLLISION_GROUP.TILES && !isOnTiles.current) {
        isOnTiles.current = true;
      }
    },
  }));

  const [chest, chestApi] = useCylinder(
    () => ({
      type: "Dynamic",
      args: [0.2, 0.1, 0.5, 32],
      onCollide: (e) => onCollide.current(e),
    }),
    playerBody
  );

  const handleCollide = useCallback(
    function handleCollide(e) {
      const { body } = e;

      if (!body) return;

      const { type, id } = body?.userData;

      if (type === COLLISION_GROUP.CORONA) {
        const { coronas } = context;
        const collidingCorona = coronas?.filter(
          (corona) => corona.id === id
        )?.[0];

        if (collidingCorona?.ref?.state?.value?.live === "attacking") {
          const { actions } = playerApi.getState();
          actions.decreaseLife();
        }
      }
    },
    [context]
  );

  useEffect(() => void (onCollide.current = handleCollide), [
    onCollide,
    handleCollide,
  ]);
  useEffect(() => void actions.init(api), [actions, api]);
  useEffect(
    () =>
      api.position.subscribe(
        ([x, y, z]) => void chestApi.position.set(x, y + Y_AXIS, z)
      ),
    [api, chestApi]
  );

  useFrame(function () {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    let x = 0;
    let y = 0;

    if (backward) {
      x += direction.z;
      y += -direction.x;
    } else if (forward) {
      x += -direction.z;
      y += direction.x;
    }
    if (left) {
      x += -direction.x;
      y += -direction.z;
    } else if (right) {
      x += direction.x;
      y += direction.z;
    }

    x = Math.min(1, Math.max(x, -1));
    y = Math.min(1, Math.max(y, -1));

    if (x !== 0 || y !== 0) {
      const velocity = VELOCITY * (boost ? BOOST_FACTOR : 1);
      api.angularVelocity.set(velocity * x, 0, velocity * y);
    } else {
      api.angularVelocity.set(0, 0, 0);
    }

    if (jump && isOnTiles.current) {
      api.applyImpulse(
        [JUMP_IMPULSE * -y, JUMP_IMPULSE, JUMP_IMPULSE * x],
        [0, 0, 0]
      );
      isOnTiles.current = false;
    }
  });

  return (
    <>
      <mesh ref={mybody} />
      <mesh ref={chest} userData={{ type: COLLISION_GROUP.CHEST }}>
        <cylinderBufferGeometry
          attach="geometry"
          args={[0.15, 0.05, 0.5, 32]}
        />
        <meshBasicMaterial attach="material" transparent opacity={0} />
      </mesh>
      <Player />
    </>
  );
}

function Player() {
  const [hasJump, setHasJump] = useState(false);
  const [hasBoost, setHasBoost] = useState(false);

  const [playJumpSfx] = useSound(jumpSfx);
  const [playBoostSfx] = useSound(boostSfx);

  const onSubscribe = useCallback(
    function onSubscribe({ jump, boost }) {
      if (jump && !hasJump) {
        playJumpSfx();
        setHasJump(true);
      }
      if (!jump && hasJump) {
        setHasJump(false);
      }
      if (boost && !hasBoost) {
        playBoostSfx();
        setHasBoost(true);
      }
      if (!boost && hasBoost) {
        setHasBoost(false);
      }
    },
    [hasJump, setHasJump, hasBoost, setHasBoost, playBoostSfx, playJumpSfx]
  );

  useEffect(() => interactionApi.subscribe(onSubscribe), [onSubscribe]);

  return (
    <GestureHandler>
      <Suspense fallback={null}>
        <BaseballBat position={[0.1, -0.3, -0.5]} />
      </Suspense>
    </GestureHandler>
  );
}

export default PhyPlayer;
