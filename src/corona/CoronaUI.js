import React, {
  Suspense,
} from "react";

import Exclamation from "../Exclamation";
import Pow from "../Pow";

function CoronaUI({ seekAlert, isUnderAttack }) {
  return (
    <Suspense fallback={null}>
      <Exclamation
        position={[0, 2.5, 0]}
        scale={[2, 2, 1]}
        visible={seekAlert}
      />
      <Pow position={[0, 1.5, 0]} scale={[2, 2, 1]} visible={isUnderAttack} />
    </Suspense>
  );
}

export default React.memo(CoronaUI)