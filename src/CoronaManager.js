import React, { useEffect, useState } from "react";
import useCoronaAssets from "./utility/useCoronaAssets";
import { useService } from "@xstate/react";

import Corona from "./corona/Corona";
import { serviceApi } from "./store";

const CoronaManager = React.memo(
  function CoronaManager(props) {
    const { coronas } = props
    useCoronaAssets();

    return coronas.map(({ id, ref }) => <Corona key={id} interpreter={ref} />);
  }
)

function CoronaManagerEntryPoint() {
  const [coronas, setCoronas] = useState([]);

  const [,, service] = useService(serviceApi.getState().service);

  useEffect(() => {
    const subscription = service.subscribe(({ context }) => {
      if (context.coronas.length !== coronas.length) {
        setCoronas(context.coronas);
      }
    });
    return subscription.unsubscribe;
  }, [service, setCoronas, coronas]);

  return <CoronaManager coronas={coronas} />
}

export default CoronaManagerEntryPoint;
