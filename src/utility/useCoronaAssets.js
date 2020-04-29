import { useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "react-three-fiber";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { draco } from 'drei'

import { useAssets } from "../store";

function useCoronaAssets() {
    // NODES
    const setCoronaNodes = useAssets(s => s.setCoronaNodes)
    const { nodes } = useLoader(GLTFLoader, '/corona.glb', draco())
    useEffect(() => void setCoronaNodes(nodes), [nodes, setCoronaNodes])

    // POW TEXTURE
    const setPowTexture = useAssets(s => s.setPowTexture)
    const powTexture = useLoader(THREE.TextureLoader, "/pow.png")
    useEffect(() => void setPowTexture(powTexture), [setPowTexture, powTexture])
    
    // EXCLAMATION CANVAS TEXTURE
    const setExclamationTexture = useAssets(s => s.setExclamationTexture)
    useEffect(() => {
        const WIDTH = 200
        const HEIGHT = 200
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
    
        setExclamationTexture(new THREE.CanvasTexture(canvas))
      }, [setExclamationTexture])
}

export default useCoronaAssets