import React, { useEffect, useCallback } from "react";
import { useMachine } from "@xstate/react";
import * as THREE from "three";

import StartScreen from "./dom/StartScreen";
import GameOverScreen from "./dom/GameOverScreen";
import WinScreen from "./dom/WinScreen";
import Game from "./Game";
import { GAME_ORCHESTRATOR } from "./machines";
import { mapApi, quadtreeApi, serviceApi } from "./store";
import { MAP, CORONA } from "./config";

function App() {
  const [current, send, service] = useMachine(GAME_ORCHESTRATOR);

  const update = useCallback(
    function update() {
      const { tree } = quadtreeApi.getState();
      const isGameStarted = current.matches("start")

      if (!(tree && isGameStarted)) return;

      const { context } = current;
      const { coronas, playerBody } = context;
      tree.clear();

      for (let i = 0; i < coronas.length; i++) {
        const { state } = coronas[i].ref;
        const { context } = state;
        const { id, phyRef } = context;

        if (phyRef?.current) {
          const { x = 0, z = 0 } = phyRef?.current?.position;

          tree.insert({
            id,
            x: x + 55,
            y: z + 85,
            width: 1,
            height: 1,
          });
        }
      }

      const {
        x = 0,
        y = 0,
        z = 0,
      } = playerBody?.current?.position || {};
      
      const candidates = tree.retrieve({
        x: x + 55,
        y: z + 85,
        width: 1,
        height: 1,
      });

      for (let i = 0; i < coronas.length; i++) {
        const { state, send } = coronas[i].ref;
        const { context, value } = state;
        const { id, phyRef } = context;

        if (
          value?.live === "idle" ||
          value?.live === "seeking" ||
          value?.live === "preattacking"
        ) {
          const isCandidate =
            candidates.findIndex((candidate) => id === candidate.id) !== -1;

          if (isCandidate) {
            const distance = new THREE.Vector3(x, y, z).distanceTo(
              phyRef.current.position
            );

            if (value?.live === "idle") {

              send("SEEK");

            } else if (
              value?.live === "seeking" &&
              distance <= CORONA.ATTACK_DISTANCE
            ) {

              send("ATTACK");

            } else if (
              value?.live === "preattacking" &&
              distance > CORONA.ATTACK_DISTANCE
            ) {

              send("SEEK");

            }

          } else {
            if (value?.live === "seeking" || value?.live === "preattacking") {
              send("IDLE");
            }
          }
        }
      }
    },
    [current]
  );
  
  useEffect(() => void serviceApi.getState().setService(service), [service]);

  useEffect(() => {
    const intervalId = window.requestInterval(update, 250);
    return () => window.clearRequestInterval(intervalId);
  }, [update]);

  useEffect(
    () =>
      mapApi.subscribe(({ mapItems }) => {
        if (mapItems.length === MAP.NUMBER_OF_BBOX) {
          send("INIT");
        }
      }),
    [send]
  );

  useEffect(() => {
    if (current.matches("win") || current.matches("gameover")) {
      const onClick = () => send("RESTART")
      document.addEventListener("click", onClick, false);
  
      return () => void document.removeEventListener("click", onClick)
    }
  }, [current, send])

  return (
    <>
      <Game />
      <StartScreen hidden={!current.matches("waitUser")} />
      <GameOverScreen hidden={!current.matches("gameover")} />
      <WinScreen hidden={!current.matches("win")} />
    </>
  );
}

export default App;
