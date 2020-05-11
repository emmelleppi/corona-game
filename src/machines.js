import { createRef } from "react";
import { Machine, actions, spawn } from "xstate";
import { v4 as uuid } from 'uuid';
import { addEffect } from "react-three-fiber"
import * as THREE from "three";

import { mapApi, raycasterApi, playerApi } from "./store";
import { getRandomUnity } from "./utility/math"

const NUMBER_OF_INIT_SPAWNS = 8
const NUMBER_OF_MAX_SPAWNS = 50
const ORIENTATION_THRESHOLD = 0.5

const { send, sendParent, assign } = actions;

const createCorona = (isActive = false, initPosition = [0, 0, 0]) => {
  
  return {
    id: uuid(),
    life: 2,
    isActive,
    canSpawn: true,
    isUnderAttack: false,
    seekAlert: false,
    phyRef: createRef(),
    orientation: createRef(),
    initPosition
  };
};

function updateSeekingOrientation({ phyRef, orientation }) {
  const player = playerApi.getState().playerBody

  const dir = player.current.position.clone().sub(phyRef.current.position).normalize()
  dir.y = 0
  const diff = dir.clone().sub(orientation.current)

  if (diff.length() > ORIENTATION_THRESHOLD) {
    orientation.current = dir
  }
}


export const GAME_ORCHESTRATOR = Machine(
  {
    id: "GAME_ORCHESTRATOR",
    context: {
      coronas: []
    },
    initial: "waitForInit",
    states: {
      waitForInit: {
        on: {
          INIT: "initializing"
        },
      },
      initializing: {
        entry: [
          assign({
            coronas: () => {
              const toSpawn = new Array(NUMBER_OF_INIT_SPAWNS)
                .fill()
                .map(() => {
                  const { mapBBoxes } = mapApi.getState()
                  const { actions } = raycasterApi.getState()
        
                  let position = null
        
                  do {
                    const bbox = mapBBoxes[Math.round(Math.random() * (mapBBoxes.length - 1))]
                    const x = bbox.min.x + (bbox.max.x - bbox.min.x) * Math.random()
                    const z = bbox.min.z + (bbox.max.z - bbox.min.z) * Math.random()
                    if (actions.isIntersect([x, 1, z])) {
                      position = [x, 0.6, z]
                    }
                  } while (!position)
        
                  return createCorona(false, position)
                }
              )

              return toSpawn.map(corona => ({
                ...corona,
                ref: spawn(CORONA_MACHINE.withContext(corona))
              }));
            }
          }),
          send("WAIT_USER")
        ],
        on: {
          WAIT_USER: "waitUser"
        }
      },
      waitUser: {
        on: {
          ANIMATION: "initAnimation"
        }
      },
      initAnimation: {
        after: {
          500: "start"
        }
      },
      start: {
        entry: ["activateCoronas"],
        on: {
          "": { target: "end", cond: "isGameEnded" }
        }
      },
      end: {}
    },
    on: {
      "ORCHESTRATOR.addCorona": [
        {
          actions: "disableSpawning",
          cond: "isMaxCoronaNumber"
        },
        {
          actions: "addCorona",
          cond: "notMaxCoronaNumber"
        }
      ],
      "ORCHESTRATOR.removeCorona": [
        { actions: "removeCorona" },
        {
          actions: "enableSpawning",
          cond: "notMaxCoronaNumber"
        }
      ]
    }
  },
  {
    guards: {
      isGameEnded: ({ coronas }) => coronas.length === 0,
      isMaxCoronaNumber: ({ coronas }) => coronas.length >= NUMBER_OF_MAX_SPAWNS,
      notMaxCoronaNumber: ({ coronas }) => coronas.length < NUMBER_OF_MAX_SPAWNS
    },
    actions: {
      activateCoronas: ({ coronas }) =>
        coronas.forEach(corona => corona.ref.send("GAME_ON")),
      addCorona: assign({
        coronas: ({ coronas }, e) => {
          const { phyRef, id } = e.corona
          const { x, y, z } = phyRef.current.position
          
          const newCorona = createCorona(true, [x, y, z]);
          
          coronas.forEach(corona => {
            if (id === corona.id) {
              corona.ref.send("IDLE");
            }
          });

          return coronas.concat({
            ...newCorona,
            ref: spawn(CORONA_MACHINE.withContext(newCorona))
          });
        }
      }),
      removeCorona: assign({
        coronas: ({ coronas }, e) =>
          coronas.filter(corona => corona.id !== e.corona.id)
      }),
      enableSpawning: ({ coronas }) => {
        coronas.forEach(corona => corona.ref.send("ENABLE_SPAWNING"));
      },
      disableSpawning: ({ coronas }) => {
        coronas.forEach(corona => corona.ref.send("DISABLE_SPAWNING"));
      }
    }
  }
);

const CORONA_MACHINE = Machine(
  {
    id: `CORONA_MACHINE`,
    initial: "live",
    context: {
      id: uuid(),
      life: 2,
      isActive: false,
      canSpawn: true,
      isUnderAttack: false,
      seekAlert: false,
      phyRef: createRef(),
      orientation: createRef(),
      initPosition: [0, 0, 0]
    },
    on: {
      DEAD: { cond: "isDead", target: "dead" },
    },
    states: {
      live: {
        initial: "idle",
        entry: ["initOrientation"],
        on: {
          GAME_ON: [{ actions: ["setIsActive", send("IDLE")] }],
          GAME_OFF: [{ actions: "resetIsActive" }],
          ENABLE_SPAWNING: { actions: "setCanSpawn" },
          DISABLE_SPAWNING: { actions: "resetCanSpawn" },
          RESET_IS_UNDER_ATTACK: { actions: "resetIsUnderAttack" },
          ATTACKED: {
            actions: [
              "decreaseLife",
              "setIsUnderAttack",
              send("RESET_IS_UNDER_ATTACK", {
                delay: 300,
                id: "resetIsUnderAttackTimerFromPreattacking"
              }),
              send("DEAD")
            ],
            cond: "isActive"
          }
        },
        states: {
          idle: {
            on: {
              SEEK: { target: "seeking", cond: "isActive" },
              IDLE: "idle"
            },
            activities: ["idleUpdate"],
            after: {
              SPAWN_INTERVAL: {
                target: "spawning",
                cond: "canSpawn"
              }
            }
          },
          seeking: {
            entry: [
              "setSeekAlert",
              send("RESET_SEEK_ALERT", {
                delay: 2000,
                id: "resetSeekTimer"
              })
            ],
            on: {
              IDLE: { target: "idle", actions: "resetSeekAlert" },
              PRE_ATTACK: {
                target: "preattacking",
                actions: "resetSeekAlert"
              },
              RESET_SEEK_ALERT: { actions: "resetSeekAlert" }
            },
            activities: ["seekingUpdate"],
            after: { SPAWN_INTERVAL: "spawning" }
          },
          preattacking: {
            on: {
              IDLE: { target: "idle", actions: "resetIsUnderAttack" },
              SEEK: { target: "seeking", actions: "resetIsUnderAttack" },
              ATTACK: { target: "attacking", actions: "resetIsUnderAttack" }
            },
            activities: ["preattackingUpdate"],
          },
          attacking: {
            on: {
              PRE_ATTACK: "preattacking",
              ATTACKED: "preattacking"
            }
          },
          spawning: {
            entry: [
              sendParent(
                ctx => ({ type: "ORCHESTRATOR.addCorona", corona: ctx }),
                { delay: 1000 }
              )
            ],
            on: {
              IDLE: "idle"
            }
          }
        }
      },
      dead: {
        on: {
          DEATH: "death"
        }
      },
      death: {
        type: "final",
        entry: [
          sendParent(ctx => ({
            type: "ORCHESTRATOR.removeCorona",
            corona: ctx
          }))
        ]
      }
    }
  },
  {
    guards: {
      isDead: ({ life }) => life <= 0,
      isActive: ({ isActive }) => isActive,
      isNotActive: ({ isActive }) => !isActive,
      canSpawn: ({ canSpawn, isActive }) => isActive && canSpawn
    },
    actions: {
      decreaseLife: assign({ life: context => context.life - 1 }),
      setIsActive: assign({ isActive: true }),
      resetIsActive: assign({ isActive: false }),
      setCanSpawn: assign({ canSpawn: true }),
      resetCanSpawn: assign({ canSpawn: false }),
      setSeekAlert: assign({ seekAlert: true }),
      resetSeekAlert: assign({ seekAlert: false }),
      setIsUnderAttack: assign({ isUnderAttack: true }),
      resetIsUnderAttack: assign({ isUnderAttack: false }),
      initOrientation: ({ orientation }) => orientation.current = new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize()
    },
    activities: {
      idleUpdate: ({ orientation, phyRef }) => {
        const { isIntersect } = raycasterApi.getState().actions

        const timerId = setInterval(() => {
          if (!phyRef.current) return
          const { x, y, z } = phyRef.current.position

          if (!isIntersect([x + orientation.current.x, y, z + orientation.current.z])) {
            orientation.current = new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize()
          }

        }, 100);
        return () => clearInterval(timerId)
      },
      seekingUpdate: ({ phyRef, orientation }) => {
        const { isIntersect } = raycasterApi.getState().actions
        const player = playerApi.getState().playerBody
        
        const timerId = setInterval(() => {
          if (!phyRef.current) return

          const { x, y, z } = phyRef.current.position
          if (isIntersect([x + orientation.current.x, y, z + orientation.current.z])) {

            const distance = player.current.position.clone().distanceTo(phyRef.current.position)
      
            if (distance <= 1) {
              send("PRE_ATTACK")
            } else {
              updateSeekingOrientation({ phyRef, orientation })
            }

          } else {
            orientation.current = new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize()
          }

        }, 100);
        return () => clearInterval(timerId)
      },
      preattackingUpdate: ({ phyRef, orientation }) => {
        const { isIntersect } = raycasterApi.getState().actions
        const player = playerApi.getState().playerBody
        
        const timerId = setInterval(() => {
          if (!phyRef.current) return

          const { x, y, z } = phyRef.current.position
        
          if (isIntersect([x + orientation.current.x, y, z + orientation.current.z])) {

            const distance = player.current.position.clone().distanceTo(phyRef.current.position)
            
            if (distance > 1) {
              send("IDLE")
            }

          } else {
            orientation.current = new THREE.Vector3(getRandomUnity(), 0, getRandomUnity()).normalize()
          }

        }, 100);
        return () => clearInterval(timerId)
      }
    },
    delays: {
      SPAWN_INTERVAL: () => 5000 + Math.random() * 5000
    }
  }
);