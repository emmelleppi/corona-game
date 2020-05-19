import React, { useEffect } from "react";
import * as THREE from "three";
import { useService } from "@xstate/react";

import { CoronaRenderer } from "../Corona";
import { serviceApi } from "../store";

const colors = ["#161616", "#333333", "#1E9983"].map(
  (col) => `#${new THREE.Color(col).convertSRGBToLinear().getHexString()}`
);

// Objects
class RemainingController {
  constructor(x, y, ctx, canvas, n) {
    this.border = 6;
    this.radius = 55 + this.border;

    this.x = x + this.border;
    this.y = y + this.border;

    this.offset = {
      x: 0,
      y: 0,
    };

    this.max = n;
    this.remaining = this.max;
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
      this.remaining,
      -this.offset.x + this.x + this.radius + 8,
      -this.offset.y + this.y + this.radius - 16
    );

    this.c.font = "16px Bangers";

    this.c.fillText(
      "l e f t",
      this.x + this.radius + 8 + 20,
      this.y + this.radius + 30
    );

    this.c.shadowColor = "transparent";
  }

  update() {
    this.c.fillStyle = "transparent";
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.draw();
  }
}

const Remaining = React.memo(
  function Remaining(props) {
    const { coronasNum } = props

    const canvas = React.useRef();
    const ctx = React.useRef();
    const remainingController = React.useRef();
  
    const spriteMaterial = React.useRef();
  
    useEffect(() => {
      canvas.current = document.createElement("canvas");
  
      canvas.current.width = 1024;
      canvas.current.height = 1024;
  
      ctx.current = canvas.current.getContext("2d");
  
      ctx.current.scale(4, 4);
  
      // set this to number of initial coronas, to draw proportianl fill of green circle
      remainingController.current = new RemainingController(
        40,
        40,
        ctx.current,
        canvas.current,
        20
      );
    }, []);
  
    useEffect(
      () => {
        remainingController.current.remaining = coronasNum;
        remainingController.current.update();
        spriteMaterial.current.map = new THREE.CanvasTexture(canvas.current);
      },
      [coronasNum]
    );
  
    return (
      <>
        <group
          position={[
            window.innerWidth / 2 - 120,
            -window.innerHeight / 2 + 80,
            1,
          ]}
        >
          <sprite scale={[256, 256, 256]}>
            <spriteMaterial attach="material" fog={false} ref={spriteMaterial} />
          </sprite>
          <group position={[30, 10, -50]} scale={[40, 40, 40]}>
            <CoronaRenderer />
          </group>
        </group>
      </>
    );
  }
)

function RemainingEntryPoint() {
  const [{ context }] = useService(serviceApi.getState().service);
  const { coronas } = context

  return <Remaining coronasNum={coronas.length} />
}

export default RemainingEntryPoint