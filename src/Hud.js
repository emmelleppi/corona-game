import React from 'react'
import styled from "styled-components/macro"

import { useLife } from "./store";

import speed from './speed.jpg'

function Hud() {

    const { life } = useLife()

    return (
        <div css={`
            z-index: 10;
            position:fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
        `}>

            {/* Health bar */}
            <div
                css={`
                    position: fixed; 
                    border: 8px solid #903D62;
                    background-color: transparent;

                    bottom: 4rem;
                    left: 4rem;

                    width: 320px;
                    height: 32px;
                `}
            >

                <div css={`
                    width: 100%;
                    height: 100%;
                    background-color: #903D62;

                    transform: scaleX(${(life) / 100});
                    transform-origin: right;
                `}></div>

            </div>

        </div>
    )

}

export default Hud