import { GAME_STATE } from "../game/Game.js";

const CONGRATS = [
  "remarkable",
  "exceptional",
  "amazing",
  "astonishing",
  "astounding",
  "marvellous",
  "wonderful",
  "sensational",
  "stunning",
  "incredible",
  "unbelievable",
  "miraculous",
  "phenomenal",
  "prodigious",
  "spectacular",
  "striking",
  "outstanding",
  "impressive",
  "memorable",
  "unforgettable",
  "unique",
  "great",
  "fantastic",
  "terrific",
  "tremendous",
  "stupendous",
  "awesome",
  "out of this world",
  "unreal",
];

const $ = (id) => document.getElementById(id);

// DOM overlays (start, pause, game over, win, loading, unsupported).
export class Screens {
  constructor() {
    this.el = {
      loading: $("loading-screen"),
      start: $("start-screen"),
      pause: $("pause-screen"),
      gameover: $("gameover-screen"),
      win: $("win-screen"),
      unsupported: $("unsupported-screen"),
    };
    this.progress = $("progress-bar");
    this.congrats = $("congrats");
    this.muteBadge = $("mute-badge");
    this.congratsIndex = 0;
    this.congratsInterval = null;
  }

  show(name, visible = true) {
    this.el[name].classList.toggle("hidden", !visible);
  }

  setProgress(p) {
    this.progress.style.width = `${Math.round(p * 100)}%`;
  }

  unsupported(reason) {
    if (reason) $("unsupported-reason").textContent = reason;
    Object.keys(this.el).forEach((k) => this.show(k, k === "unsupported"));
  }

  setState(state, paused) {
    this.show("loading", state === GAME_STATE.LOADING);
    this.show("start", state === GAME_STATE.WAIT_PLAYER);
    this.show("gameover", state === GAME_STATE.GAMEOVER);
    this.show("win", state === GAME_STATE.WIN);
    this.show("pause", paused);

    clearInterval(this.congratsInterval);
    if (state === GAME_STATE.WIN) {
      this.congratsInterval = setInterval(() => {
        this.congratsIndex = (this.congratsIndex + 1) % CONGRATS.length;
        this.congrats.textContent = CONGRATS[this.congratsIndex];
        // restart the fade in animation
        this.congrats.style.animation = "none";
        void this.congrats.offsetWidth;
        this.congrats.style.animation = "";
      }, 1500);
    }
  }

  setMuted(muted) {
    if (this.muted === muted) return;
    this.muted = muted;
    this.muteBadge.classList.toggle("hidden", !muted);
  }
}
