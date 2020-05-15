import { createRef } from "react";
import { Machine, actions, spawn } from "xstate";
import { v4 as uuid } from "uuid";
import * as THREE from "three";

import { mapApi, raycasterApi, playerApi } from "./store";
import { getRandomUnity } from "./utility/math";
import { CORONA, GAME } from "./config";

const {
  NUMBER_OF_INIT_SPAWNS,
  NUMBER_OF_MAX_SPAWNS,
  INIT_ANIMATION_DURATION,
} = GAME;
const {
  LIFE,
  Y_AXIS,
  ORIENTATION_THRESHOLD,
  SEEK_ALERT_DURATION,
  PREATTACK_DURATION,
  UNDER_ATTACK_DURATION,
  SPAWN_ANIMATION_DURATION,
  SPAWN_INTERVAL,
  ATTACK_DISTANCE,
} = CORONA;

const { send, sendParent, assign } = actions;

function getRandDamage() {
  const rand = Math.random();

  if (rand < 0.1 || rand > 0.9) {
    return 3;
  }
  if (rand < 0.2 || rand > 0.8) {
    return 2;
  }
  return 1;
}

const createCorona = (isActive = false, initPosition = [0, 0, 0]) => {
  return {
    id: uuid(),
    life: LIFE,
    isActive,
    isUnderAttack: false,
    seekAlert: false,
    phyRef: createRef(),
    orientation: createRef(),
    initPosition,
  };
};

function updateSeekingOrientation({ phyRef, orientation }) {
  const player = playerApi.getState().playerBody;

  const dir = player.current.position
    .clone()
    .sub(phyRef.current.position)
    .normalize();
  dir.y = 0;
  const diff = dir.clone().sub(orientation.current);

  if (diff.length() > ORIENTATION_THRESHOLD) {
    orientation.current = dir;
  }
}

export const GAME_ORCHESTRATOR = Machine(
  {
    id: "GAME_ORCHESTRATOR",
    context: {
      coronas: [],
    },
    initial: "waitForInit",
    states: {
      waitForInit: {
        on: {
          INIT: "initializing",
        },
      },
      initializing: {
        entry: [
          assign({
            coronas: () => {
              const { mapBBoxes } = mapApi.getState();
              const { actions } = raycasterApi.getState();

              const toSpawn = new Array(NUMBER_OF_INIT_SPAWNS)
                .fill()
                .map(() => {
                  let position = null;

                  do {
                    const bbox =
                      mapBBoxes[
                        Math.round(Math.random() * (mapBBoxes.length - 1))
                      ];
                    const x =
                      bbox.min.x + (bbox.max.x - bbox.min.x) * Math.random();
                    const z =
                      bbox.min.z + (bbox.max.z - bbox.min.z) * Math.random();
                    if (actions.isIntersect([x, 1, z])) {
                      position = [x, Y_AXIS, z];
                    }
                  } while (!position);

                  return createCorona(false, position);
                });

              return toSpawn.map((corona) => ({
                ...corona,
                ref: spawn(CORONA_MACHINE.withContext(corona)),
              }));
            },
          }),
          send("WAIT_USER"),
        ],
        on: {
          WAIT_USER: "waitUser",
        },
      },
      waitUser: {
        on: {
          ANIMATION: "initAnimation",
        },
      },
      initAnimation: {
        after: {
          INIT_ANIMATION_DURATION: "start",
        },
      },
      start: {
        entry: ["activateCoronas"],
        on: {
          "": { target: "end", cond: "isGameEnded" },
        },
      },
      end: {},
    },
    on: {
      "ORCHESTRATOR.addCorona": [
        {
          actions: "addCorona",
          cond: "notMaxCoronaNumber",
        },
        {
          actions: "skipSpawning",
          cond: "isMaxCoronaNumber",
        },
      ],
      "ORCHESTRATOR.checkSpawning": [
        {
          actions: "skipSpawning",
          cond: "isMaxCoronaNumber",
        },
      ],
      "ORCHESTRATOR.removeCorona": [{ actions: "removeCorona" }],
    },
  },
  {
    guards: {
      isGameEnded: ({ coronas }) => coronas.length === 0,
      isMaxCoronaNumber: ({ coronas }) =>
        coronas.length >= NUMBER_OF_MAX_SPAWNS,
      notMaxCoronaNumber: ({ coronas }) =>
        coronas.length < NUMBER_OF_MAX_SPAWNS,
    },
    actions: {
      activateCoronas: ({ coronas }) =>
        coronas.forEach((corona) => corona.ref.send("GAME_ON")),
      addCorona: assign({
        coronas: ({ coronas }, e) => {
          const { phyRef, id } = e.corona;
          const { x, y, z } = phyRef.current.position;

          coronas.forEach((corona) => {
            if (id === corona.id) {
              corona.ref.send("IDLE");
            }
          });

          const newCorona = createCorona(true, [x, y, z]);

          return coronas.concat({
            ...newCorona,
            ref: spawn(CORONA_MACHINE.withContext(newCorona)),
          });
        },
      }),
      skipSpawning: ({ coronas }, e) => {
        coronas.forEach((corona) => {
          if (e.corona.id === corona.id) {
            corona.ref.send("IDLE");
          }
        });
      },
      removeCorona: assign({
        coronas: ({ coronas }, e) =>
          coronas.filter((corona) => corona.id !== e.corona.id),
      }),
    },
    delays: {
      INIT_ANIMATION_DURATION,
    },
  }
);

const CORONA_MACHINE = Machine(
  {
    id: `CORONA_MACHINE`,
    initial: "live",
    context: {
      id: uuid(),
      life: LIFE,
      isActive: false,
      isUnderAttack: false,
      seekAlert: false,
      phyRef: createRef(),
      orientation: createRef(),
      initPosition: [0, 0, 0],
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
          RESET_IS_UNDER_ATTACK: { actions: "resetIsUnderAttack" },
          ATTACKED: {
            actions: [
              "decreaseLife",
              "setIsUnderAttack",
              send("RESET_IS_UNDER_ATTACK", {
                delay: UNDER_ATTACK_DURATION,
                id: "resetIsUnderAttackTimerFromPreattacking",
              }),
              send("DEAD"),
            ],
            cond: "isActive",
          },
        },
        states: {
          idle: {
            on: {
              SEEK: { target: "seeking", cond: "isActive" },
              IDLE: "idle",
            },
            activities: ["update"],
            after: {
              SPAWN_INTERVAL: { target: "spawning", cond: "isActive" },
            },
          },
          seeking: {
            entry: [
              "setSeekAlert",
              send("RESET_SEEK_ALERT", {
                delay: SEEK_ALERT_DURATION,
                id: "resetSeekTimer",
              }),
            ],
            on: {
              IDLE: { target: "idle", actions: "resetSeekAlert" },
              ATTACK: {
                target: "attacking",
                actions: "resetSeekAlert",
              },
              RESET_SEEK_ALERT: { actions: "resetSeekAlert" },
            },
            activities: ["seekingUpdate"],
            after: {
              SPAWN_INTERVAL: "spawning",
            },
          },
          preattacking: {
            on: {
              IDLE: { target: "idle", actions: "resetIsUnderAttack" },
              SEEK: { target: "seeking", actions: "resetIsUnderAttack" },
              ATTACK: { target: "attacking", actions: "resetIsUnderAttack" },
            },
            activities: ["update"],
            after: { PREATTACK_DURATION: "attacking" },
          },
          attacking: {
            on: {
              PRE_ATTACK: "preattacking",
              ATTACKED: "preattacking",
            },
          },
          spawning: {
            entry: [
              sendParent((ctx) => ({
                type: "ORCHESTRATOR.checkSpawning",
                corona: ctx,
              })),
            ],
            on: {
              IDLE: "idle",
            },
            after: { SPAWN_ANIMATION_DURATION: "spawned" },
          },
          spawned: {
            entry: [
              sendParent((ctx) => ({
                type: "ORCHESTRATOR.addCorona",
                corona: ctx,
              })),
            ],
            on: {
              IDLE: "idle",
            },
          },
        },
      },
      dead: {
        on: {
          DEATH: "death",
        },
      },
      death: {
        type: "final",
        entry: [
          sendParent((ctx) => ({
            type: "ORCHESTRATOR.removeCorona",
            corona: ctx,
          })),
        ],
      },
    },
  },
  {
    guards: {
      isDead: ({ life }) => life <= 0,
      isActive: ({ isActive }) => isActive,
      isNotActive: ({ isActive }) => !isActive,
    },
    actions: {
      decreaseLife: assign({
        life: (context) => context.life - getRandDamage(),
      }),
      setIsActive: assign({ isActive: true }),
      resetIsActive: assign({ isActive: false }),
      setAttack: assign({ attack: true }),
      resetAttack: assign({ attack: false }),
      setSeekAlert: assign({ seekAlert: true }),
      resetSeekAlert: assign({ seekAlert: false }),
      setIsUnderAttack: assign({ isUnderAttack: true }),
      resetIsUnderAttack: assign({ isUnderAttack: false }),
      initOrientation: ({ orientation }) =>
        (orientation.current = new THREE.Vector3(
          getRandomUnity(),
          0,
          getRandomUnity()
        ).normalize()),
    },
    activities: {
      update: ({ orientation, phyRef }) => {
        const { isIntersect } = raycasterApi.getState().actions;

        const intervalId = window.requestInterval(() => {
          if (!phyRef.current) return;

          const { x, y, z } = phyRef.current.position;

          if (
            !isIntersect([
              x + orientation.current.x,
              y,
              z + orientation.current.z,
            ])
          ) {
            const axis = new THREE.Vector3(0, 1, 0);
            const angle = Math.PI / 2 + Math.random() * Math.PI;
            orientation.current.applyAxisAngle(axis, angle);
          }
        }, 100);
        return () => window.clearRequestInterval(intervalId);
      },
      seekingUpdate: ({ phyRef, orientation }) => {
        const { isIntersect } = raycasterApi.getState().actions;
        const player = playerApi.getState().playerBody;

        const intervalId = window.requestInterval(() => {
          if (!phyRef.current) return;

          const { x, y, z } = phyRef.current.position;
          if (
            isIntersect([
              x + orientation.current.x,
              y,
              z + orientation.current.z,
            ])
          ) {
            const distance = player.current.position
              .clone()
              .distanceTo(phyRef.current.position);

            if (distance > ATTACK_DISTANCE) {
              updateSeekingOrientation({ phyRef, orientation });
            }
          } else {
            const axis = new THREE.Vector3(0, 1, 0);
            const angle = Math.PI / 2 + Math.random() * Math.PI;
            orientation.current.applyAxisAngle(axis, angle);
          }
        }, 100);
        return () => window.clearRequestInterval(intervalId);
      },
    },
    delays: {
      SPAWN_INTERVAL: () => SPAWN_INTERVAL + Math.random() * SPAWN_INTERVAL,
      SPAWN_ANIMATION_DURATION,
      PREATTACK_DURATION,
    },
  }
);
