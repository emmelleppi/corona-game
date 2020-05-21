import React from "react";
import "styled-components/macro";

import { Wrapper, ActionsWrapper, BlinkingCta } from "./styled";

const actions = [
  {
    id: 0,
    action: "MOVE",
    keycaps: "WASD",
  },
  {
    id: 1,
    action: "JUMP",
    keycaps: "SPACEBAR",
  },
  {
    id: 2,
    action: "ATTACK",
    keycaps: "LEFT CLICK",
  },
  {
    id: 3,
    action: "BOOST",
    keycaps: "SHIFT",
  },
];

function Action(props) {
  const { action, keycaps } = props;
  return (
    <div
      css={`
        width: 30rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      `}
    >
      <span>{action}</span>
      <span
        css={`
          background-image: linear-gradient(
            to right,
            white 33%,
            rgba(255, 255, 255, 0) 0%
          );
          background-position: bottom;
          background-size: 12px 3px;
          background-repeat: repeat-x;
          flex: 1;
          height: 3px;
          margin: 0 1rem 4px;
        `}
      />
      <span
        css={`
          font-size: 1.5rem;
        `}
      >
        {keycaps}
      </span>
    </div>
  );
}

function StartScreen(props) {
  const { hidden } = props;

  return (
    <Wrapper hidden={hidden}>
      <div
        css={`
          width: 80vw;
          max-width: 1280px;
          margin: 0 auto;
        `}
      >
        {/* Title Block */}
        <div>
          <h1
            css={`
              margin-bottom: 2rem;
            `}
          >
            <div
              css={`
                font-size: 140px;
                letter-spacing: 5.25px;
              `}
            >
              Kill da
            </div>
            <div
              css={`
                font-size: 120px;
                margin-bottom: 1rem;
              `}
            >
              Corona
            </div>
          </h1>

          <h3
            css={`
              font-size: 46px;
              letter-spacing: 1.73px;
            `}
          >
            Stay the fuck home
          </h3>

          {/* BTNS */}
          <ActionsWrapper>
            {actions.map(({ id, action, keycaps }) => (
              <Action key={id} keycaps={keycaps} action={action} />
            ))}
          </ActionsWrapper>

          {/* CTA */}
          <div css={`margin-top: 2rem;`} >
            <BlinkingCta>LEFT CLICK to start the game</BlinkingCta>
          </div>
          <div css={`
            margin-top: 2rem;
            text-align: right;
            pointer-events: initial;
            
            > * + * {
              margin: 0 3px;
            }
          `} >
            <span>Made by</span>
            <a css={`font-size: 1.3rem; color: white; text-decoration: none;`} href="https://twitter.com/mlperego" target="_blank" >mlperego</a>
            <span>and</span>
            <a css={`font-size: 1.3rem; color: white; text-decoration: none;`} href="https://twitter.com/ggsimm" target="_blank" >ggsimm</a>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export default StartScreen;
