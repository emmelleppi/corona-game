import React, { useEffect, useCallback, useRef } from "react";
import { useMachine } from "@xstate/react";
import * as THREE from "three";

import StartScreen from "./dom/StartScreen";
import GameOverScreen from "./dom/GameOverScreen";
import WinScreen from "./dom/WinScreen";
import Game from "./Game";
import { GAME_ORCHESTRATOR } from "./machines";
import { mapApi, quadtreeApi, serviceApi } from "./store";
import { MAP, CORONA } from "./config";
import UnsupportedBrowser from "./dom/UnsupportedBrowsers";
import ThemeSong from "./sounds/Theme.mp3";
import useSound from "use-sound";

const App = React.memo(
  function App(props) {
    const { game, send } = props
  
    const update = useCallback(
      function update() {
        const { tree } = quadtreeApi.getState();
        const isGameStarted = game.current.value === "gameplay"
  
        if (!(tree && isGameStarted)) return;
  
        const { context } = game.current;
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
            value?.active === "idle" ||
            value?.active === "seek" ||
            value?.active === "preattack"
          ) {
            const isCandidate =
              candidates.findIndex((candidate) => id === candidate.id) !== -1;
  
            if (isCandidate) {
              const distance = new THREE.Vector3(x, y, z).distanceTo(
                phyRef.current.position
              );
  
              if (value?.active === "idle") {
  
                send("SEEK");
  
              } else if (
                value?.active === "seek" &&
                distance <= CORONA.ATTACK_DISTANCE
              ) {
  
                send("ATTACK");
  
              } else if (
                value?.active === "preattack" &&
                distance > CORONA.ATTACK_DISTANCE
              ) {
  
                send("SEEK");
  
              }
  
            } else {
              if (value?.active === "seek" || value?.active === "preattack") {
                send("IDLE");
              }
            }
          }
        }
      },
      [game]
    );
      
    useEffect(() => {
      const intervalId = window.requestInterval(update, 500);
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
  
    return <Game />
  }
)

function AppEntryPoint() {
  const [current, send, service] = useMachine(GAME_ORCHESTRATOR);

  const [playTheme, { isPlaying }] = useSound(ThemeSong, { volume: 0.3 });

  const game = useRef()

  useEffect(() => {
    const subscription = service.subscribe(gameState => void (game.current = gameState));
    return subscription.unsubscribe;
  }, [service]);

  useEffect(() => void serviceApi.getState().setService(service), [service]);

  useEffect(() => void (!isPlaying && playTheme()), [isPlaying, playTheme])

  useEffect(() => {
    if (current.matches("win") || current.matches("gameover")) {
      const onClick = () => send("RESTART")
      document.addEventListener("click", onClick, false);
  
      return () => void document.removeEventListener("click", onClick)
    }
  }, [current, send])

  return (
    <UnsupportedBrowser>
      <App game={game} send={send} />
      <StartScreen hidden={!current.matches("waitPlayer")} />
      <GameOverScreen hidden={!current.matches("gameover")} />
      <WinScreen hidden={!current.matches("win")} />
    </UnsupportedBrowser>
  )
}

export default AppEntryPoint;
