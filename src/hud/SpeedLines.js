import React, { useState, useEffect } from "react";
import { Vector3 } from "three";
import { useService } from "@xstate/react";

import Sprite from "../utility/Sprite";
import { serviceApi } from "../store";

const SpeedLines = React.memo(
  function SpeedLines(props) {
    const { playerApi } = props
  
    const [visible, setVisible] = useState(false);
  
    const scale = [window.innerWidth, window.innerHeight, 1];
    const TH = 14;
  
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
)

function SpeedLinesEntryPoint() {
  const [{ context }] = useService(serviceApi.getState().service);
  const { playerApi } = context

  return <SpeedLines playerApi={playerApi} />
}

export default SpeedLinesEntryPoint;
