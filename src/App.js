import React, { useEffect, useCallback } from "react";
import { useMachine } from '@xstate/react';
import * as THREE from "three";

import StartScreen from './StartScreen'
import Game from './Game'
import { GAME_ORCHESTRATOR } from "./machines";
import { mapApi, quadtreeApi, playerApi, serviceApi } from "./store";

import "./utility/requestInterval"
import "./styles.css";
import { MAP } from "./config";

function App() {
  const [current, send, service] = useMachine(GAME_ORCHESTRATOR);
    
  const update = useCallback(
    function update() {
      const { tree } = quadtreeApi.getState()
      
      if (!tree) return

      const isGameStarted = current.matches("start")
      
      if (isGameStarted) {
        const { context } = current
        const { coronas } = context
        tree.clear();
  
        for (let i = 0; i < coronas.length; i++) {
          const { state } = coronas[i].ref
          const { context } = state
          const { id, phyRef } = context
  
          const { x = 0, z = 0 } = phyRef?.current?.position
  
          tree.insert({
            id,
            x: x + 20,
            y: z + 20,
            width: 1,
            height: 1,
          });
        }
  
        const { x = 0, y = 0, z = 0 } = playerApi.getState()?.playerBody?.current?.position
        const candidates = tree.retrieve({ x: x + 20, y: z + 20, width: 1, height: 1 })
  
        for (let i = 0; i < coronas.length; i++) {

          const { state, send } = coronas[i].ref
          const { context, value } = state
          const { id, phyRef } = context
          
          if (value?.live === "idle" || value?.live === "seeking" || value?.live === "preattacking") {
            
            const isCandidate = candidates.findIndex(candidate => id === candidate.id) !== -1
            
            if (isCandidate) {
              const distance = new THREE.Vector3(x, y, z).distanceTo(phyRef.current.position)
              
              if (value?.live === "idle") {
                send("SEEK")
              } else if (value?.live === "seeking" && distance <= 1) {
                send("PRE_ATTACK")
              } else if (value?.live === "preattacking" && distance > 1) {
                send("SEEK")
              }

            } else {
              
              if (value?.live === "seeking" || value?.live === "preattacking") {
                send("IDLE")
              }

            }
          }
  
        }
  
      }
    },
    [current, send]
  )
  
  useEffect(() => {
    const intervalId = window.requestInterval(update, 500)
    return () => window.clearRequestInterval(intervalId)
  }, [update])

  useEffect(() => mapApi.subscribe(({ mapItems }) => { if (mapItems.length === MAP.NUMBER_OF_MAP_BBOX) { send("INIT") } }), [send])
  useEffect(() => void (serviceApi.getState().setService(service)), [service])

  return (
    <>
      <Game />
      <StartScreen hidden={!current.matches('waitUser')} />
    </>
  );

}

export default App;
