import React, { useEffect } from 'react'
import { TweenLite } from 'gsap'
import * as THREE from 'three'
import { useFrame } from 'react-three-fiber'
import { usePlayer } from '../store'

const colors = [
  "#161616",
  "#780F5F",
  "#F35B5B",
].map(col => `#${new THREE.Color(col).convertSRGBToLinear().getHexString()}`)

// Objects
class HealthBarController {
  constructor(x, y, ctx, canvas) {
    this.border = 6;
    this.radius = 55 + this.border;

    this.x = x + this.border;
    this.y = y + this.border;

    this.offset = {
      x: 0,
      y: 0
    };

    this.health = 100;
    this.tempHealth = 100;
    this.canvas = canvas
    this.c = ctx
  }

  drawClippedCircle(offset, color = colors[2]) {
    this.c.save();
    this.c.lineWidth = 1;
    this.c.beginPath();
    this.c.rect(
      this.x + -10,
      this.y + 4 + offset + this.offset.y,
      this.radius * 2 + 20,
      this.radius * 2 + this.border * 2
    );
    this.c.clip();
    this.c.closePath();

    this.c.beginPath();
    this.c.arc(
      this.x + this.radius + this.offset.x,
      this.y + this.radius + this.offset.y,
      this.radius,
      0,
      Math.PI * 2,
      false
    );
    this.c.fillStyle = color;
    this.c.fill();
    this.c.closePath();

    this.c.restore();
  }

  draw() {
    // shadow
    this.c.beginPath();
    this.c.arc(
      this.x + this.radius + this.border + this.offset.x * 0.5,
      this.y + this.radius + this.border + this.offset.y * 0.5,
      this.radius,
      0,
      Math.PI * 2,
      false
    );
    this.c.lineWidth = 8;
    this.c.strokeStyle = colors[0];
    this.c.stroke();

    // main
    this.drawClippedCircle(100 - this.tempHealth, colors[1]);
    this.drawClippedCircle(100 - this.health);

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
    this.c.fillText(
      "h e a l t h",
      this.x + 20,
      this.y + this.radius + 30
    );

    this.c.shadowColor = "transparent";

    // outer
    this.c.beginPath();
    this.c.arc(
      this.x + this.radius + this.offset.x,
      this.y + this.radius + this.offset.y,
      this.radius,
      0,
      Math.PI * 2,
      false
    );
    this.c.fillStyle = "transparent";
    this.c.strokeStyle = "#fff";
    this.c.stroke();
    this.c.closePath();
  }

  damage(damage) {
    this.health = this.health - damage;

    const offset = {
      x: 0,
      y: 0
    };

    const shake = 4 * (damage / 20);

    TweenLite.fromTo(
      offset,
      0.12,
      {
        x: -shake,
        y: 0
      },
      {
        x: shake,
        y: 0,
        repeat: 2,
        yoyo: true,
        onUpdate: () => {
          this.offset.x = offset.x;
          this.offset.y = offset.y;
        },
        onComplete: () => {
          this.offset.x = 0;
          this.offset.y = 0;
        }
      }
    );
  }

  update(t) {
    this.c.fillStyle = "transparent";
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.draw();


    if (this.tempHealth > this.health) {
      this.tempHealth -= 0.5;
    }

    if (this.tempHealth < this.health) {
      this.tempHealth = this.health;
    }

    if (this.health <= 0) {
      this.health = 100;
    }
  }
}

export default function Health() {

  const canvas = React.useRef()
  const ctx = React.useRef()
  const healthController = React.useRef()

  const spriteMaterial = React.useRef()

  const playerLife = usePlayer(s => s.life)

  useEffect(() => {
    canvas.current = document.createElement('canvas')

    canvas.current.width = 1024
    canvas.current.height = 1024

    ctx.current = canvas.current.getContext('2d')

    ctx.current.scale(4, 4)

    healthController.current = new HealthBarController(40, 40, ctx.current, canvas.current)
  }, [])

  useEffect(() => {
    healthController.current.damage(
      healthController.current.health - playerLife
    )
  }, [playerLife])


  useFrame(() => {
    if (ctx.current) {
      healthController.current.update()

      const canvasTexture = new THREE.CanvasTexture(canvas.current);
      spriteMaterial.current.map = canvasTexture
    }
  })

  return (
    <sprite position={[-window.innerWidth / 2 + 120, -window.innerHeight / 2 + 80, 1]} scale={[256, 256, 256]}>
      <spriteMaterial
        attach="material"
        fog={false}
        ref={spriteMaterial}
      />
    </sprite>
  )

}