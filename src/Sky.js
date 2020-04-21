import React, { useRef, useState, useEffect } from "react"
import { useFrame, useUpdate } from "react-three-fiber";
import * as THREE from "three";

const TEXT = ["STAY", "THE", "FUCK", "HOME!"];
const WIDTH = Math.pow(2, 10);
const CANVAS_BG_COLOR = "#23213D";

function Sky() {
  const time = useRef(0);
  const ref = useRef();

  const [canvas] = useState(document.createElement("canvas"));
  const [text, setText] = useState(0);

  useEffect(() => {
    canvas.width = WIDTH;
    canvas.height = WIDTH;
  }, [canvas]);

  const materialRef = useUpdate(material => {
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "yellow";

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 10;

    ctx.font = "300px Bangers";

    ctx.fillText(TEXT[text], WIDTH / 2, WIDTH / 2);
    ctx.strokeText(TEXT[text], WIDTH / 2, WIDTH / 2);

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
    <group position={[0, -12, 0]} scale={[6, 6, 6]}>
      <mesh ref={ref}>
        <sphereBufferGeometry
          attach="geometry"
          args={[10, 32, 32, 0, Math.PI * 2, 1, 0.3]}
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