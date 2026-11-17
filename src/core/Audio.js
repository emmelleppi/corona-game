// Tiny Web Audio sound manager (replaces howler / use-sound).
export class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.buffers = new Map();
    this.music = null;
    this.muted = false;
    this.volume = 1;
    this.musicVolume = 0.2;
    this.applyVolumes();

    const unlock = () => {
      if (this.ctx.state !== "running") this.ctx.resume();
    };
    ["pointerdown", "keydown", "touchstart"].forEach((e) =>
      window.addEventListener(e, unlock, { capture: true })
    );
  }

  async load(name, url) {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(data);
    this.buffers.set(name, buffer);
    return buffer;
  }

  applyVolumes() {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVolume, t, 0.02);
  }

  setVolume(v) {
    this.volume = v;
    this.applyVolumes();
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    this.applyVolumes();
  }

  setMuted(m) {
    this.muted = m;
    this.applyVolumes();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name, { volume = 1, rate = 1 } = {}) {
    const buffer = this.buffers.get(name);
    if (!buffer || this.ctx.state !== "running") return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.sfxGain);
    src.start();
  }

  playMusic(name) {
    if (this.music) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.musicGain);
    src.start();
    this.music = src;
  }
}
