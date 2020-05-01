import React from "react";
import Corona from "./Corona";
import { useCorona, useQuadtree } from "./store";
import useCoronaAssets from "./utility/useCoronaAssets"
import { useFrame } from "react-three-fiber";

function CoronaManager() {
    useCoronaAssets()
    const coronas = useCorona(s => s.coronas)
    const update = useQuadtree(s => s.update)
    
    useFrame(update)

    return coronas.map(({ id, initPosition, store }) => <Corona key={id} id={id} initPosition={initPosition} store={store} />)
}

export default CoronaManager