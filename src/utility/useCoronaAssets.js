import { useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "react-three-fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { draco } from "drei";

import { useAssets } from "../store";

function useCoronaAssets() {
  // NODES
  const setCoronaNodes = useAssets((s) => s.setCoronaNodes);
  const { nodes } = useLoader(GLTFLoader, "/corona.glb", draco());
  useEffect(() => void setCoronaNodes(nodes), [nodes, setCoronaNodes]);

  const [powTexture, shadow, fiveTone] = useLoader(THREE.TextureLoader, [
    "/pow.png",
    "/shadow.png",
    "/fiveTone.jpg",
  ]);

  // SHADOW
  const setCoronaShadow = useAssets((s) => s.setCoronaShadow);
  useEffect(() => void setCoronaShadow(shadow), [shadow, setCoronaShadow]);

  // POW TEXTURE
  const setPowTexture = useAssets((s) => s.setPowTexture);
  useEffect(() => void setPowTexture(powTexture), [setPowTexture, powTexture]);

  // FIVETONE TEXTURE
  const setFiveTone = useAssets((s) => s.setFiveTone);
  useEffect(() => void setFiveTone(fiveTone), [setFiveTone, fiveTone]);

  // EXCLAMATION CANVAS TEXTURE
  const setExclamationTexture = useAssets((s) => s.setExclamationTexture);
  useEffect(() => {
    const WIDTH = 128;
    const HEIGHT = 128;
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "red";

    ctx.strokeStyle = "black";
    ctx.lineWidth = 10;

    ctx.font = "150px Bangers";
    ctx.fillText("!", WIDTH / 2, HEIGHT / 2);
    ctx.strokeText("!", WIDTH / 2, WIDTH / 2);

    setExclamationTexture(new THREE.CanvasTexture(canvas));
  }, [setExclamationTexture]);
}

export default useCoronaAssets;
