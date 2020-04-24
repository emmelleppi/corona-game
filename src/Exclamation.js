import React from "react";
import * as THREE from "three";
import { useUpdate } from "react-three-fiber";

const WIDTH = 200
const HEIGHT = 200

function Exclamation(props) {

  const materialRef = useUpdate(material => {
    const canvas = document.createElement("canvas")
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    ctx.fillStyle = "red";

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 10;
    
    ctx.font = "200px Bangers";
    ctx.fillText("!", WIDTH / 2, HEIGHT / 2);
    ctx.strokeText("!", WIDTH / 2, WIDTH / 2);

    material.map = new THREE.CanvasTexture(canvas)
  }, [])

  return (
    <sprite {...props} >
      <spriteMaterial
        ref={materialRef}
        attach="material"
        color={0xffffff}
        transparent
        alphaTest={0.5}
      />
    </sprite>
  );
}

export default Exclamation;
