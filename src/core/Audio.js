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
    this.sfxVolume = 1;
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
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, t, 0.02);
  }

  // Keeps the mixer in sync with the settings (cheap: only acts on change).
  sync({ volume, musicVolume, sfxVolume, muted }) {
    if (
      volume === this.volume &&
      musicVolume === this.musicVolume &&
      sfxVolume === this.sfxVolume &&
      muted === this.muted
    )
      return;
    Object.assign(this, { volume, musicVolume, sfxVolume, muted });
    this.applyVolumes();
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

  // Procedural "whoosh" (band-passed noise sweep) for the bat swing.
  playWhoosh({ volume = 1, duration = 0.18 } = {}) {
    if (this.ctx.state !== "running" || !(volume > 0)) return;
    const ctx = this.ctx;
    if (!this.noise) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(2600, t + duration * 0.6);
    filter.frequency.exponentialRampToValueAtTime(900, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(gain).connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration + 0.02);
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
