import React, { useRef, useState, useEffect } from "react"
import { useFrame, useUpdate } from "react-three-fiber";
import * as THREE from "three";

const TEXT = ["KILL", "THE", "CORONA", "STAY", "THE", "FUCK", "HOME!"];
const WIDTH = Math.pow(2, 10);
const HEIGHT = WIDTH * 2;
const CANVAS_BG_COLOR = "#23213D";

function Sky() {
  const time = useRef(0);
  const ref = useRef();

  const [canvas] = useState(document.createElement("canvas"));
  const [text, setText] = useState(0);

  useEffect(() => {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
  }, [canvas]);

  const materialRef = useUpdate(material => {
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draws debug grid
    // ctx.lineWidth = 20;
    // ctx.strokeStyle = "green";
    // ctx.strokeRect(0, 0, canvas.width / 2, canvas.height / 2)
    // ctx.strokeRect(canvas.width / 2, canvas.height / 2, canvas.width, canvas.height)

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#D95B9A";

    ctx.strokeStyle = '#673366';
    ctx.lineWidth = 10;

    ctx.font = "300px Bangers";

    ctx.fillText(TEXT[text], WIDTH / 2, HEIGHT / 2);
    ctx.strokeText(TEXT[text], WIDTH / 2, HEIGHT / 2);

    const canvasTexture = new THREE.CanvasTexture(canvas)
    canvasTexture.wrapS = THREE.RepeatWrapping;
    canvasTexture.wrapT = THREE.RepeatWrapping;
    canvasTexture.repeat.set(-6, 1);
    material.map = canvasTexture

  }, [text, canvas])

  useFrame(() => {
    time.current += 1;
    if (time.current === 100) {
      setText(s => (s + 1) % TEXT.length);
      time.current = 0;
    }
  });

  return (
    <group position={[0, 20, 0]} scale={[6, 6, 6]}>
      <mesh ref={ref}>
        <sphereBufferGeometry
          attach="geometry"
          args={[20, 32, 32]}
        />
        <meshToonMaterial
          ref={materialRef}
          fog={false}
          side={THREE.BackSide}
          attach="material"
        />
      </mesh>
    </group>
  );
}

export default Sky