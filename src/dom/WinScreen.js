import React, { useState, useEffect } from "react";
import "styled-components/macro";
import { useSpring, animated as a, config } from 'react-spring'

import { Wrapper } from "./styled";
import useInterval from "../utility/useInterval"
import congrats from "./win-congrats"

function WinScreen(props) {
  const { hidden } = props;

  const [index, setIndex] = useState(0)
  
  const [style, animate] = useSpring(() => ({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: config.molasses
  }), [])

  useEffect(() => void animate({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: config.molasses
  }), [index, animate])

  useInterval(() => setIndex(s => (s + 1) % (congrats.length - 1)), 1500)

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
            you win!
          </h1>

          <a.h3
            css={`
              font-size: 46px;
              letter-spacing: 1.73px;
            `}
            style={style}
          >
            {congrats[index]}
          </a.h3>

          {/* CTA */}
          <div
            css={`
              margin-top: 4rem;
              font-size: 40px;
              letter-spacing: 1.73px;
            `}
          >
            left click to restart
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export default WinScreen;
