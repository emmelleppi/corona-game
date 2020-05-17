import React, { useState, useEffect } from "react";
import { Vector3 } from "three";

import Sprite from "../utility/Sprite";
import { useService } from "@xstate/react";
import { serviceApi } from "../store";

function SpeedLines() {
  const scale = [window.innerWidth, window.innerHeight, 1];
  const TH = 14;

  const [visible, setVisible] = useState(false);

  const [{ context }] = useService(serviceApi.getState().service);
  const { playerApi } = context

  const handleV = React.useCallback(
    (varr) => {
      const v = new Vector3(...varr).length();

      if (v > TH) {
        setVisible((v - TH) / TH);
      } else {
        setVisible(false);
      }
    },
    [setVisible]
  );

  useEffect(() => playerApi?.velocity?.subscribe(handleV), [handleV, playerApi]);

  return (
    <>
      <Sprite
        visible={visible}
        opacity={visible}
        IconPosition={[0, 0, 0]}
        IconSize={scale}
        textureSrc="/speed-spritesheet.png"
        plainAnimatorArgs={[1, 28, 28, 24]}
      />
    </>
  );
}

export default SpeedLines;
