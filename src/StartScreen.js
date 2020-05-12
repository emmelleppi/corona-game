import React from "react";
import "styled-components/macro";

function StartScreen({ hidden }) {

  return (
    <div
      css={`
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

        ${hidden ? "opacity: 0;" : "opacity: 1;"}

        transition: opacity .6s ease;

        h1,
        h2,
        h3 {
          margin: 0;
        }

        display: flex;
        justify-content: center;
        align-items: center;
      `}
    >
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
              Kill
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
          <div
            css={`
              margin-top: 4rem;

              > * + * {
                margin-top: 0.5rem;
              }
            `}
          >
            <div>
              MOVE . . . . . . . . . .{" "}
              <span
                css={`
                  font-size: 1.5rem;
                `}
              >
                WASD
              </span>
            </div>
            <div>
              JUMP . . . . . . . . . .{" "}
              <span
                css={`
                  font-size: 1.5rem;
                `}
              >
                SPACEBAR
              </span>
            </div>
            <div>
              ATTACK. . . . . . . . .{" "}
              <span
                css={`
                  font-size: 1.5rem;
                `}
              >
                LEFT CLICK
              </span>
            </div>
            <div>
              BOOST. . . . . . . . . .
              <span
                css={`
                  font-size: 1.5rem;
                `}
              >
                SHIFT
              </span>
            </div>
          </div>

          {/* CTA */}
          <div
            css={`
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
            `}
          >
            LEFT CLICK to start the game
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartScreen;
