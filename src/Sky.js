import React, { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { useFrame, useUpdate } from "react-three-fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./utility/shaders";

const TEXT = ["KILL", "THE", "CORONA", "STAY", "THE", "FUCK", "HOME!"];
const WIDTH = Math.pow(2, 10);
const HEIGHT = WIDTH * 2;

function ShaderSphere(props) {
  const ref = useRef();
  const matRef = useRef();
  const args = useMemo(() => {
    const color = new THREE.Color(0xa30a3f);
    const { r, g, b } = color;
    return {
      uniforms: {
        u_time: { type: "f", value: 0 },
        my_r: { type: "f", value: r },
        my_g: { type: "f", value: g },
        my_b: { type: "f", value: b }
      },
      vertexShader,
      fragmentShader
    };
  }, []);
    
  useFrame(() => {
    ref.current.rotation.x += 0.001;
    ref.current.rotation.y += 0.001;
    ref.current.rotation.z += 0.001;
    matRef.current.uniforms.u_time.value += 0.0001;
      
  });

  return (
    <mesh ref={ref} {...props}>
      <sphereBufferGeometry attach="geometry" args={[21, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        attach="material"
        args={[args]}
        transparent
        side={THREE.BackSide}
      />
    </mesh>
  );
}

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
    canvasTexture.repeat.set(-4, 1);
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
          transparent
          alphaTest={0.5}
        />
      </mesh>
      <ShaderSphere />
    </group>
  );
}

export default Sky