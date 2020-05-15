import React from "react"
import styled from "styled-components/macro";
import { useSpring, animated as a, config } from 'react-spring'

export const Wrapper = styled.div`
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

export const ActionsWrapper = styled.div`
margin-top: 4rem;

> * + * {
  margin-top: 0.5rem;
}
`;

export function BlinkingCta(props) {
  const [style] = useSpring(() => ({
    from: { opacity: 0 },
    to: { opacity: 1 },
    loop: true,
    config: config.molasses
  }), [])

  return (
    <a.div style={style} >
      {props.children}
    </a.div>
  )
}