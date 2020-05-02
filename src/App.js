import React from "react";

import StartScreen from './StartScreen'
import Game from './Game'

import "./styles.css";
import { useGame } from "./store";

function App() {

  const isStartAnimation = useGame(s => s.isStartAnimation)

  return (
    <>
      <Game />
      <StartScreen hidden={isStartAnimation} />
    </>
  );

}

export default App;
