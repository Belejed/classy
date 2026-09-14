// Sound Effects Utility using Web Audio API (Synthesized in-browser, 0 external assets, instant 0ms latency)

class SoundFX {
  constructor() {
    this.ctx = null;
  }

  // Lazy-initialize AudioContext on user interaction
  getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Sound effect when joining the voice / stage channel (Discord-style connect chime)
   * Warm ascending double chime: D5 (587Hz) -> A5 (880Hz)
   */
  playJoinCall() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.22, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.26);

      // Note 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.25, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.50);

      // Soft harmonic overtone for extra richness
      const harmonic = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(1174.66, now + 0.12);
      harmGain.gain.setValueAtTime(0, now + 0.12);
      harmGain.gain.linearRampToValueAtTime(0.06, now + 0.14);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      harmonic.connect(harmGain);
      harmGain.connect(ctx.destination);
      harmonic.start(now + 0.12);
      harmonic.stop(now + 0.46);
    } catch (e) {
      console.warn('[SoundFX] playJoinCall error:', e);
    }
  }

  /**
   * Sound effect when leaving the voice room (Discord-style leave chime)
   * Descending tone: A5 (880Hz) -> D5 (587Hz)
   */
  playLeaveCall() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 880 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880.0, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.23);

      // Note 2: 587.33 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, now + 0.1);
      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.42);
    } catch (e) {
      console.warn('[SoundFX] playLeaveCall error:', e);
    }
  }

  /**
   * Sound effect during wheel/picker spin ticks (crisp percussive click)
   * pitchFactor can vary to create rolling acceleration/deceleration illusion
   */
  playPickerTick(pitchFactor = 1.0) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Crisp click oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 520 * pitchFactor;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.035);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn('[SoundFX] playPickerTick error:', e);
    }
  }

  /**
   * Sound effect when a student is selected (Celebratory Fanfare / Ta-da! 🎉)
   * Arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) + final chord sparkle
   */
  playWinnerFanfare() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.12, vol: 0.2 },   // C5
        { freq: 659.25, time: 0.11, dur: 0.12, vol: 0.22 },  // E5
        { freq: 783.99, time: 0.22, dur: 0.14, vol: 0.25 },  // G5
        { freq: 1046.50, time: 0.35, dur: 0.7, vol: 0.32 },  // C6 (Grand finish)
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const startAt = now + time;
        const stopAt = startAt + dur;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);

        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(vol, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, stopAt);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startAt);
        osc.stop(stopAt + 0.02);
      });

      // Harmonized final chord at 0.35s (E5 + G5 with C6 for full celebratory chord)
      const chordNotes = [659.25, 783.99];
      chordNotes.forEach(freq => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = 'triangle';
        chordOsc.frequency.setValueAtTime(freq, now + 0.35);

        chordGain.gain.setValueAtTime(0, now + 0.35);
        chordGain.gain.linearRampToValueAtTime(0.12, now + 0.38);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

        chordOsc.connect(chordGain);
        chordGain.connect(ctx.destination);

        chordOsc.start(now + 0.35);
        chordOsc.stop(now + 1.1);
      });
    } catch (e) {
      console.warn('[SoundFX] playWinnerFanfare error:', e);
    }
  }

  /**
   * Sound effect when raising hand / host receives a hand raise
   * Bell ding (~987.77 Hz - B5)
   */
  playRaiseHand() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch (e) {
      console.warn('[SoundFX] playRaiseHand error:', e);
    }
  }

  /**
   * Sound effect when randomizing groups or topics (Dice roll rattle & pop)
   */
  playDiceRoll() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const clicks = [0, 0.06, 0.12, 0.2];

      clicks.forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freq = 450 + (idx * 90) + (Math.random() * 60);
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + delay + 0.04);

        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.045);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.05);
      });
    } catch (e) {
      console.warn('[SoundFX] playDiceRoll error:', e);
    }
  }
}

export const soundFX = new SoundFX();
export default soundFX;
