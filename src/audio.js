export class Audio {
  constructor() {
    this.muted = false;
    this.step = 0;
    this.elapsed = 0;
  }
  unlock() {
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume();
  }
  tone(freq, duration = 0.1, type = "square", volume = 0.035) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + duration);
  }
  play(name) {
    const notes = {
      appear: [220, 294, 370, 440],
      power: [392, 523, 659, 784],
      jump: [330, 660],
      coin: [880, 1320],
      block: [170, 120],
      stomp: [220, 110],
      hurt: [180, 90, 55],
      clear: [523, 659, 784, 1046],
    };
    (notes[name] || []).forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.12), i * 65),
    );
  }
  update(dt) {
    this.elapsed += dt;
    if (this.elapsed > 180) {
      this.elapsed = 0;
      const melody = [
        64, 0, 67, 71, 69, 67, 64, 62, 60, 0, 64, 67, 62, 64, 59, 62, 64, 67,
        72, 71, 69, 67, 62, 0, 60, 64, 67, 69, 67, 64, 62, 0,
      ];
      const n = melody[this.step % melody.length];
      if (n) this.tone(440 * 2 ** ((n - 69) / 12), 0.14, "triangle", 0.045);
      if (this.step % 4 === 0)
        this.tone(
          110 * 2 ** ([0, 0, 5, 7][Math.floor(this.step / 8) % 4] / 12),
          0.22,
          "triangle",
          0.035,
        );
      this.step++;
    }
  }
}
