import React, { useEffect, useState } from "react"
import "styled-components/macro"

import { Wrapper } from "./styled"

function UnsupportedBrowser(props) {
  const [isSafari, setIsSafari] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const agent = navigator.userAgent.toLowerCase()
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    if (agent.indexOf('safari') !== -1 && agent.indexOf('chrome') === -1) { 
      setIsSafari(true)
    }
  }, [setIsMobile, setIsSafari])
  return (isSafari || isMobile) ? (
    <Wrapper>
      <div css={`
        margin: 1rem;
        text-align: center;
        font-size: 2rem;

        > * + * {
          margin-top: 1rem;
        }
      `}>
        <div css={`font-size: 3rem;`}>Kill da corona!</div>
        <div>Sorry!</div>
        <div>This site is not supported on mobile and safari browser</div>
        <div>☹️</div>
      </div>
    </Wrapper>
  ) : props.children
}

export default UnsupportedBrowser