import React, {
  useEffect,
} from "react";
import useSound from "use-sound";

import HitSfx from "../sounds/Player_Hit.wav";
import HitSfx2 from "../sounds/Player_Hit_2.wav";
import alertSfx from "../sounds/Alert.wav";
import { useMute } from "../store";

function CoronaHowler({
  isUnderAttack,
  seekAlert,
}) {
  const mute = useMute(s => s.mute)

  const [playHitSfx] = useSound(HitSfx, { volume: mute ? 0 : 1 });
  const [playHitSfx2] = useSound(HitSfx2, { volume: mute ? 0 : 1 });
  const [playAlertSfx] = useSound(alertSfx, { volume: mute ? 0 : 1 });

  useEffect(() => void (seekAlert && playAlertSfx()), [
    seekAlert,
    playAlertSfx,
  ]);
  useEffect(
    () =>
      void (
        isUnderAttack && (Math.random() > 0.5 ? playHitSfx() : playHitSfx2())
      ),
    [isUnderAttack, playHitSfx, playHitSfx2]
  );

  return null;
}

export default React.memo(CoronaHowler)