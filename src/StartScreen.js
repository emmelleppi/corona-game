import React from "react";
import styled from "styled-components/macro";

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
          {/* <small css={`margin-left: 1rem;`}>mlperego presents</small> */}
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
          <ActionsWarapper>
            {actions.map(({ id, action, keycaps }) => (
              <Action key={id} keycaps={keycaps} action={action} />
            ))}
          </ActionsWarapper>

          {/* CTA */}
          <BlinkingCta>LEFT CLICK to start the game</BlinkingCta>
        </div>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  width: 100vw;
  height: 100vh;

  z-index: 10;

  font-family: "Bangers", sans-serif;
  color: white;
  letter-spacing: 0.2em;

  pointer-events: none;

  ${(props) => (props.hidden ? "opacity: 0;" : "opacity: 1;")}

  transition: opacity .6s ease;

  h1,
  h2,
  h3 {
    margin: 0;
  }

  display: flex;
  justify-content: center;
  align-items: center;
`;
const BlinkingCta = styled.div`
  margin-top: 4rem;

  animation: blinkingText 1.2s infinite;

  @keyframes blinkingText {
    0% {
      color: white;
    }
    49% {
      color: white;
    }
    60% {
      color: transparent;
    }
    99% {
      color: transparent;
    }
    100% {
      color: white;
    }
  }
`;
const ActionsWarapper = styled.div`
  margin-top: 4rem;

  > * + * {
    margin-top: 0.5rem;
  }
`;

export default StartScreen;
