import React from "react";
import "styled-components/macro";

import { Wrapper, BlinkingCta } from "./styled";

function GameOverScreen(props) {
  const { hidden } = props;

  return (
    <Wrapper hidden={hidden}>
      <div
        css={`
          text-align: center;
          width: 80vw;
          max-width: 1280px;
          margin: 0 auto;
        `}
      >
        {/* Title Block */}
        <div>
          <h1
            css={`
              font-size: 140px;
              letter-spacing: 5.25px;
            `}
          >
            game over
          </h1>

          {/* CTA */}
          <BlinkingCta>
            <h3
              css={`
                font-size: 46px;
                letter-spacing: 1.73px;
              `}
            >
              left click to restart
            </h3>
          </BlinkingCta>
        </div>
      </div>
    </Wrapper>
  );
}

export default GameOverScreen;
