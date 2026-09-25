// Opening theme for The Red Balloon: a small musette waltz for the
// drifting-balloon opening shot, played on recorded instruments.
//
// The accordion, upright bass and music-box sparkles are real samples from
// the FluidR3 General MIDI SoundFont (see samples/README.md). The pigeon wing
// flaps and Pascal's footsteps are synthesized, as they are sound effects
// rather than instruments.
//
// Usage:
//   await OpeningThemeSampled.load();                  // fetch + decode samples once
//   const theme = OpeningThemeSampled.play();           // 20 s, starts now
//   const theme = OpeningThemeSampled.play({ duration: 24 });
//   theme.stop();
//   OpeningThemeSampled.cueTime("snag", 24);           // seconds into the scene
//
// play() needs load() to have finished; render() loads the samples itself.
//
// The piece is 12 bars of 3/4. At the default 20 s each bar is 5/3 s, lined
// up with the animation's shot plan:
//   0.0 s   drift    balloon drifts in through clouds (bars 1-2)
//   2.8 s   roofs    over roofs and chimneys (bars 2-4)
//   6.7 s   dip      dips past the laundry line (bars 5-6)
//  10.0 s   pigeon   chirps and wing flaps as the pigeon flies off (bar 7)
//  11.7 s   sink     falling line as the balloon sinks (bar 8)
//  13.9 s   snag     a plink as it catches on the lamppost, then bobs (bars 9-10)
//  16.7 s   shoes    four footsteps on the beat, then home to C (bars 11-12)
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

  const FOOTSTEPS = [[11, 0, 0.5], [11, 1, 0.45], [11, 2, 0.55], [12, 0, 0.3]];

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

  // Music-box notes: sparkles, the pigeon's chirps, the snag and the ending.
  const BELLS = [84, 88, 89, 91, 93, 95, 96];

  // Each instrument's samples, by MIDI note. Every note the score plays has
  // its own recording, so nothing is pitch-shifted.
  const INSTRUMENTS = {
    accordion: uniq(MELODY.map((n) => n[3]).concat(
      ...HARMONY.filter((h) => h.chord).map((h) => h.chord.map((m) => m - 12)))),
    acoustic_bass: uniq(HARMONY.filter((h) => h.bass !== null).map((h) => h.bass)),
    marimba: BELLS,
  };

  // How each instrument's recordings are levelled when they load: the
  // sustained accordion by its loudness, the plucked and struck ones by their
  // attack. This puts each note at the same level as its synth counterpart.
  const NORMALIZE = {
    accordion: { rms: 0.22 },
    acoustic_bass: { peak: 0.75 },
    marimba: { peak: 1 },
  };

  // The accordion samples hold steady from about 0.4 s to 3 s, so long notes
  // at slow tempos loop that stretch.
  const LOOP = { start: 0.4, end: 2.9 };

  const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const noteName = (m) => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);

  function uniq(list) {
    return [...new Set(list)].sort((a, b) => a - b);
  }

  // Where the samples live: next to this script, unless load() is told otherwise.
  const scriptSrc = global.document && global.document.currentScript && global.document.currentScript.src;
  const defaultBase = scriptSrc ? new URL("samples/", scriptSrc).href : "samples/";

  const buffers = {}; // "accordion/C4" -> { buffer, offset }
  let loading = null;
  let ready = false;

  function load({ ctx, baseUrl = defaultBase } = {}) {
    if (loading) return loading;
    const Offline = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    const decoder = ctx || new Offline(1, 1, 44100);
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const jobs = [];
    Object.entries(INSTRUMENTS).forEach(([inst, notes]) => {
      notes.forEach((m) => {
        const key = inst + "/" + noteName(m);
        jobs.push(
          fetch(base + key + ".mp3")
            .then((r) => {
              if (!r.ok) throw new Error("Could not load sample " + key + " (" + r.status + ")");
              return r.arrayBuffer();
            })
            .then((data) => decoder.decodeAudioData(data))
            .then((buf) => { buffers[key] = prepare(buf, NORMALIZE[inst]); })
        );
      });
    });
    loading = Promise.all(jobs).then(() => { ready = true; }, (err) => {
      loading = null;
      throw err;
    });
    return loading;
  }

  // Levels a decoded recording in place and finds where its sound starts
  // (MP3s begin with a few milliseconds of silence), so notes land on the beat.
  function prepare(buffer, norm) {
    const first = buffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < first.length; i++) peak = Math.max(peak, Math.abs(first[i]));
    let onset = 0;
    while (onset < first.length && Math.abs(first[onset]) < peak * 0.05) onset++;
    let scale;
    if (norm.rms) {
      const a = onset + Math.floor(buffer.sampleRate * 0.3);
      const b = Math.min(first.length, a + buffer.sampleRate);
      let sum = 0;
      for (let i = a; i < b; i++) sum += first[i] * first[i];
      scale = norm.rms / (Math.sqrt(sum / Math.max(1, b - a)) || 1);
    } else {
      scale = norm.peak / (peak || 1);
    }
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] *= scale;
    }
    return { buffer, offset: onset / buffer.sampleRate };
  }

  // Plays one recorded note, faded in and out so it starts and stops cleanly.
  function sample(ctx, out, inst, midi, t, dur, vol, release) {
    const found = buffers[inst + "/" + noteName(midi)];
    if (!found) throw new Error("No " + inst + " sample for MIDI note " + midi);
    const src = ctx.createBufferSource();
    const buf = found.buffer;
    src.buffer = buf;
    if (inst === "accordion" && dur > LOOP.end - 0.1) {
      src.loop = true;
      src.loopStart = LOOP.start;
      src.loopEnd = Math.min(LOOP.end, buf.duration);
    }
    const amp = ctx.createGain();
    const peak = vol;
    const rel = Math.min(release, dur * 0.5);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + 0.01);
    amp.gain.setValueAtTime(peak, t + dur - rel);
    amp.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(amp).connect(out);
    src.start(t, found.offset);
    src.stop(t + dur + 0.05);
  }

  const accordion = (ctx, out, t, dur, midi, vol) =>
    sample(ctx, out, "accordion", midi, t, dur, vol, Math.min(0.12, dur * 0.4));

  const pluck = (ctx, out, t, midi, vol, decay) =>
    sample(ctx, out, "acoustic_bass", midi, t, decay, vol, Math.min(0.25, decay * 0.5));

  const bell = (ctx, out, t, midi, vol) => sample(ctx, out, "marimba", midi, t, 1.2, vol, 0.3);

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
    wet.gain.value = 0.3;
    reverb.connect(wet).connect(master);
    const bus = ctx.createGain();
    bus.connect(dry);
    bus.connect(reverb);

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

    [[1, 2, 88], [3, 2, 89], [5, 2, 88]].forEach(([bar, b, m]) => bell(ctx, bus, at(bar, b), m, 0.05));

    bell(ctx, bus, at(7, 0), 91, 0.08);
    bell(ctx, bus, at(7, 0) + beat * 0.3, 93, 0.07);
    for (let i = 0; i < 6; i++) flap(ctx, bus, at(7, 1) + i * beat * 0.28, 0.25 * (1 - i / 7));

    bell(ctx, bus, at(9, 1), 96, 0.12);
    bell(ctx, bus, at(9, 1) + beat * 0.5, 95, 0.05);
    bell(ctx, bus, at(9, 2), 96, 0.04);

    FOOTSTEPS.forEach(([bar, b, vol]) => footstep(ctx, bus, at(bar, b), vol));

    bell(ctx, bus, at(12, 1), 84, 0.06);

    return master;
  }

  const OpeningThemeSampled = {
    bars: BARS,
    beatsPerBar: BEATS_PER_BAR,
    defaultDuration: DEFAULT_DURATION,
    cues: Object.keys(CUES),
    instruments: Object.keys(INSTRUMENTS),

    // Fetches and decodes the samples. Safe to call more than once.
    load,
    get loaded() {
      return ready;
    },

    cueTime(name, duration = DEFAULT_DURATION) {
      if (!(name in CUES)) throw new Error("Unknown cue: " + name);
      return (CUES[name] / TOTAL_BEATS) * duration;
    },

    stepTimes(duration = DEFAULT_DURATION) {
      return FOOTSTEPS.map(([bar, b]) => (((bar - 1) * BEATS_PER_BAR + b) / TOTAL_BEATS) * duration);
    },

    // Starts the theme. Pass an existing AudioContext to share one with the
    // animation, `when` (in that context's time) to start later, and
    // `duration` to stretch or squeeze the tempo to fit the scene. Call
    // load() first.
    play({ ctx, when, duration = DEFAULT_DURATION, destination } = {}) {
      if (!ready) throw new Error("OpeningThemeSampled.load() has not finished yet");
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

    // Renders the theme offline and resolves to an AudioBuffer (for export).
    async render(duration = DEFAULT_DURATION, sampleRate = 44100) {
      await load();
      const Offline = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      const ctx = new Offline(2, Math.ceil((duration + 2) * sampleRate), sampleRate);
      schedule(ctx, ctx.destination, 0, duration);
      return ctx.startRendering();
    },
  };

  global.OpeningThemeSampled = OpeningThemeSampled;
})(typeof window !== "undefined" ? window : globalThis);
