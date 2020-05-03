import React from "react";
import Corona from "./Corona";
import { useCorona } from "./store";
import useCoronaAssets from "./utility/useCoronaAssets"

function CoronaManager() {
    useCoronaAssets()
    const coronas = useCorona(s => s.coronas)
    return coronas.map(({ id, initPosition, store }) => <Corona key={id} id={id} initPosition={initPosition} store={store} />)
}

export default CoronaManager