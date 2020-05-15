import React, { useEffect, useState } from "react";
import useCoronaAssets from "./utility/useCoronaAssets";
import { useService } from "@xstate/react";

import Corona from "./Corona";
import { serviceApi } from "./store";

function CoronaManager() {
  useCoronaAssets();

  const [coronas, setCoronas] = useState([]);

  const [, , service] = useService(serviceApi.getState().service);

  useEffect(() => {
    const subscription = service.subscribe((state) => {
      if (state.context.coronas.length !== coronas.length) {
        setCoronas(state.context.coronas);
      }
    });

    return subscription.unsubscribe;
  }, [service, setCoronas]);

  return coronas.map(({ id, ref }) => <Corona key={id} interpreter={ref} />);
}

export default CoronaManager;
