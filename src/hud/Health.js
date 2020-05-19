import React, { useEffect } from "react";
import * as THREE from "three";
import { useService } from "@xstate/react";

import { serviceApi } from "../store";
import Heart from "../Heart";
import { PLAYER } from "../config";

const colors = ["#161616", "#780F5F", "#F35B5B"].map(
  (col) => `#${new THREE.Color(col).convertSRGBToLinear().getHexString()}`
);

// Objects
class HealthBarController {
  constructor(x, y, ctx, canvas) {
    this.border = 6;
    this.radius = 55 + this.border;

    this.x = x + this.border;
    this.y = y + this.border;

    this.offset = {
      x: 0,
      y: 0,
    };

    this.health = PLAYER.INITIAL_LIFE;
    this.canvas = canvas;
    this.c = ctx;
  }

  draw() {
    // main
    this.c.font = "82px Bangers";
    this.c.textAlign = "center";
    this.c.fillStyle = "white";
    this.c.textBaseline = "middle";

    this.c.shadowOffsetX = 6;
    this.c.shadowOffsetY = 6;

    this.c.shadowColor = colors[0];

    this.c.fillText(
      this.health,
      -this.offset.x + this.x + this.radius + 8,
      -this.offset.y + this.y + this.radius - 16
    );

    this.c.font = "16px Bangers";

    this.c.textAlign = "left";
    this.c.fillText("h e a l t h", this.x + 20, this.y + this.radius + 30);

    this.c.shadowColor = "transparent";
  }

  update(life = PLAYER.INITIAL_LIFE) {
    this.health = life;
    this.c.fillStyle = "transparent";
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.draw();
  }
}

const Health = React.memo(
  function Health(props) {
    const { playerLife } = props

    const canvas = React.useRef();
    const ctx = React.useRef();
    const healthController = React.useRef();
  
    const spriteMaterial = React.useRef();
  
    useEffect(() => {
      canvas.current = document.createElement("canvas");
  
      canvas.current.width = 1024;
      canvas.current.height = 1024;
  
      ctx.current = canvas.current.getContext("2d");
  
      ctx.current.scale(4, 4);
  
      healthController.current = new HealthBarController(
        40,
        40,
        ctx.current,
        canvas.current
      );
      healthController.current.update();
      spriteMaterial.current.map = new THREE.CanvasTexture(canvas.current);
    }, []);
  
    useEffect(
      () => {
        healthController.current.update(playerLife);
        spriteMaterial.current.map = new THREE.CanvasTexture(canvas.current);
      },
      [playerLife]
    );
  
    return (
      <group
        position={[-window.innerWidth / 2 + 80, -window.innerHeight / 2 + 80, 1]}
      >
        <sprite position={[70, 0, 0]} scale={[256, 256, 256]}>
          <spriteMaterial attach="material" fog={false} ref={spriteMaterial} />
        </sprite>
        <Heart scale={[256 * 5, 256 * 5, 256 * 5]} position={[0, 0, -50]} />
      </group>
    );
  }
)

function HealthEntryPoint() {
  const [{ context }] = useService(serviceApi.getState().service);
  const { playerLife } = context

  return <Health playerLife={playerLife} />
}

export default HealthEntryPoint