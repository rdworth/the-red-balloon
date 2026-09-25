// Opening theme for The Red Balloon: a small musette waltz for the
// drifting-balloon opening shot. Everything is synthesized with Web Audio,
// so there are no audio files.
//
// Usage:
//   const theme = OpeningTheme.play();              // 20 s, starts now
//   const theme = OpeningTheme.play({ duration: 24 }); // stretched to fit 24 s
//   theme.stop();
//   OpeningTheme.cueTime("snag", 24);               // seconds into the scene
//
// The piece is 12 bars of 3/4. At the default 20 s each bar is 5/3 s, lined
// up with the animation's shot plan:
//   0.0 s   drift    balloon drifts in through clouds (bars 1-2)
//   2.8 s   roofs    over roofs and chimneys (bars 2-4)
//   6.7 s   dip      dips past the laundry line (bars 5-6)
//  10.0 s   pigeon   chirps and wing flaps as the pigeon flies off (bar 7)
//  11.7 s   sink     falling line as the balloon sinks (bar 8)
//  13.9 s   snag     a plink as it catches on the lamppost, then bobs (bars 9-10)
//  16.7 s   shoes    two soft footsteps, then home to C (bars 11-12)
(function (global) {
  "use strict";

  const BARS = 12;
  const BEATS_PER_BAR = 3;
  const DEFAULT_DURATION = 20;
  const TOTAL_BEATS = BARS * BEATS_PER_BAR;

  // Named moments the animation can sync to, in beats from the start.
  const CUES = {
    drift: 0,
    roofs: 1 * 3 + 2,
    dip: 4 * 3,
    pigeon: 6 * 3,
    sink: 7 * 3,
    snag: 8 * 3 + 1,
    shoes: 10 * 3,
    end: TOTAL_BEATS,
  };

  // Melody as [bar (1-based), beat (0-based), length in beats, MIDI note].
  const MELODY = [
    [1, 0, 1, 67], [1, 1, 1, 72], [1, 2, 1, 76],
    [2, 0, 2, 79], [2, 2, 1, 76],
    [3, 0, 1, 77], [3, 1, 1, 81], [3, 2, 1, 77],
    [4, 0, 3, 74],
    [5, 0, 1, 67], [5, 1, 1, 72], [5, 2, 1, 76],
    [6, 0, 2, 81], [6, 2, 1, 79],
    [7, 0, 1, 77], [7, 1, 1, 76], [7, 2, 1, 74],
    [8, 0, 2, 71], [8, 2, 1, 74],
    [9, 0, 1, 72],
    [10, 0, 3, 68],
    [12, 0, 1, 76], [12, 1, 2, 72],
  ];

  // Bass root and the "pah pah" chord for each bar.
  const HARMONY = [
    { bass: 48, chord: [64, 67, 72] }, // C
    { bass: 48, chord: [64, 67, 72] }, // C
    { bass: 41, chord: [65, 69, 72] }, // F
    { bass: 43, chord: [62, 67, 71] }, // G
    { bass: 48, chord: [64, 67, 72] }, // C
    { bass: 45, chord: [64, 69, 72] }, // Am
    { bass: 41, chord: [65, 69, 72] }, // F
    { bass: 43, chord: [62, 65, 71] }, // G7
    { bass: 48, chord: [64, 67, 72], stopAfterDownbeat: true }, // C, then the snag
    { bass: 41, chord: [65, 68, 72], held: true }, // Fm, held and wistful
    { bass: null, chord: null }, // footsteps only
    { bass: 36, chord: [64, 67, 72], held: true }, // C, home
  ];

  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function makeReverb(ctx) {
    const len = Math.floor(ctx.sampleRate * 2.2);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function envelope(param, t, peak, attack, dur, release) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setValueAtTime(peak, t + Math.max(attack, dur - release));
    param.linearRampToValueAtTime(0, t + dur);
  }

  // Musette accordion: two slightly detuned reeds with a wobble, softened.
  function accordion(ctx, out, t, dur, midi, vol) {
    const hz = midiToHz(midi);
    const amp = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    lp.Q.value = 0.7;
    envelope(amp.gain, t, vol, 0.04, dur, Math.min(0.12, dur * 0.4));
    lp.connect(amp).connect(out);

    const lfo = ctx.createOscillator();
    const lfoAmt = ctx.createGain();
    lfo.frequency.value = 5.2;
    lfoAmt.gain.value = 4;
    lfo.connect(lfoAmt);

    [-7, 7].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = hz;
      osc.detune.value = cents;
      lfoAmt.connect(osc.detune);
      const g = ctx.createGain();
      g.gain.value = 0.5;
      osc.connect(g).connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  // Plucked double bass: a triangle with a quick decay.
  function pluck(ctx, out, t, midi, vol, decay) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiToHz(midi);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vol, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(amp).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }

  // Glockenspiel / music box: inharmonic sine partials with a bell decay.
  function bell(ctx, out, t, midi, vol) {
    const hz = midiToHz(midi);
    [[1, 1, 1.4], [2.76, 0.35, 0.6], [5.4, 0.15, 0.3]].forEach(([ratio, level, decay]) => {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = hz * ratio;
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(vol * level, t + 0.004);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(amp).connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    });
  }

  // A soft footstep on cobbles: a low thump under a short burst of noise.
  function footstep(ctx, out, t, vol) {
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = vol * 0.6;
    noise.connect(bp).connect(ng).connect(out);
    noise.start(t);

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    amp.gain.setValueAtTime(vol, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(amp).connect(out);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // One pigeon wing flap: a short, airy puff of noise.
  function flap(ctx, out, t, vol) {
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = vol;
    noise.connect(bp).connect(g).connect(out);
    noise.start(t);
  }

  // Schedules the whole piece on `ctx`, routed into `destination`.
  function schedule(ctx, destination, start, duration) {
    const beat = duration / TOTAL_BEATS;
    const at = (bar, b) => start + ((bar - 1) * BEATS_PER_BAR + b) * beat;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(destination);
    const dry = ctx.createGain();
    dry.gain.value = 0.8;
    dry.connect(master);
    const reverb = makeReverb(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet).connect(master);
    const bus = ctx.createGain();
    bus.connect(dry);
    bus.connect(reverb);

    // Fade in over the first beat, fade out over the last bar.
    master.gain.setValueAtTime(0, start);
    master.gain.linearRampToValueAtTime(0.9, start + beat);
    master.gain.setValueAtTime(0.9, at(12, 1));
    master.gain.linearRampToValueAtTime(0, start + duration + 1.5);

    MELODY.forEach(([bar, b, len, midi]) => {
      accordion(ctx, bus, at(bar, b), len * beat * 0.95, midi, 0.16);
    });

    HARMONY.forEach((h, i) => {
      const bar = i + 1;
      if (h.bass !== null) pluck(ctx, bus, at(bar, 0), h.bass, 0.5, h.held ? beat * 3 : beat * 0.9);
      if (!h.chord) return;
      if (h.held) {
        h.chord.forEach((m) => accordion(ctx, bus, at(bar, 0), beat * 3.2, m - 12, 0.05));
      } else if (!h.stopAfterDownbeat) {
        [1, 2].forEach((b) => h.chord.forEach((m) => accordion(ctx, bus, at(bar, b), beat * 0.45, m - 12, 0.045)));
      }
    });

    // Music-box sparkle while the balloon floats free.
    [[1, 2, 88], [3, 2, 89], [5, 2, 88]].forEach(([bar, b, m]) => bell(ctx, bus, at(bar, b), m, 0.05));

    // The pigeon: two quick chirps and a flurry of wing flaps.
    bell(ctx, bus, at(7, 0), 91, 0.08);
    bell(ctx, bus, at(7, 0) + beat * 0.3, 93, 0.07);
    for (let i = 0; i < 6; i++) flap(ctx, bus, at(7, 1) + i * beat * 0.28, 0.25 * (1 - i / 7));

    // The snag on the lamppost: a bright plink, then a small wobble.
    bell(ctx, bus, at(9, 1), 96, 0.12);
    bell(ctx, bus, at(9, 1) + beat * 0.5, 95, 0.05);
    bell(ctx, bus, at(9, 2), 96, 0.04);

    // Pascal's shoes step into frame.
    footstep(ctx, bus, at(11, 0), 0.5);
    footstep(ctx, bus, at(11, 2), 0.55);

    // A last music-box note over the home chord.
    bell(ctx, bus, at(12, 1), 84, 0.06);

    return master;
  }

  const OpeningTheme = {
    bars: BARS,
    beatsPerBar: BEATS_PER_BAR,
    defaultDuration: DEFAULT_DURATION,
    cues: Object.keys(CUES),

    // Seconds from the start of the scene at which a named cue lands.
    cueTime(name, duration = DEFAULT_DURATION) {
      if (!(name in CUES)) throw new Error("Unknown cue: " + name);
      return (CUES[name] / TOTAL_BEATS) * duration;
    },

    // Starts the theme. Pass an existing AudioContext to share one with the
    // animation, `when` (in that context's time) to start later, and
    // `duration` to stretch or squeeze the tempo to fit the scene.
    play({ ctx, when, duration = DEFAULT_DURATION, destination } = {}) {
      const audio = ctx || new (global.AudioContext || global.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const start = when ?? audio.currentTime + 0.05;
      const master = schedule(audio, destination || audio.destination, start, duration);
      return {
        ctx: audio,
        startTime: start,
        duration,
        stop() {
          const now = audio.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(master.gain.value, now);
          master.gain.linearRampToValueAtTime(0, now + 0.3);
          setTimeout(() => master.disconnect(), 400);
        },
      };
    },

    // Renders the theme offline and returns an AudioBuffer (for export).
    render(duration = DEFAULT_DURATION, sampleRate = 44100) {
      const Offline = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      const ctx = new Offline(2, Math.ceil((duration + 2) * sampleRate), sampleRate);
      schedule(ctx, ctx.destination, 0, duration);
      return ctx.startRendering();
    },
  };

  global.OpeningTheme = OpeningTheme;
})(typeof window !== "undefined" ? window : globalThis);
