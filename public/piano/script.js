(function attachPianoModule(globalScope) {
  const WHITE_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];
  const BLACK_NOTES = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'];
  const DESKTOP_WHITE_SHORTCUTS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'BracketLeft', 'BracketRight'];
  const DESKTOP_BLACK_SHORTCUTS = ['KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyO', 'KeyP', 'Minus', 'Equal', 'Backspace'];
  const PIANO_SAMPLE_FILES = {
    C4: '/audio/piano-samples/C4v4.mp3',
    'D#4': '/audio/piano-samples/D%234v4.mp3',
    'F#4': '/audio/piano-samples/F%234v4.mp3',
    A4: '/audio/piano-samples/A4v4.mp3',
    C5: '/audio/piano-samples/C5v4.mp3',
    'D#5': '/audio/piano-samples/D%235v4.mp3',
    'F#5': '/audio/piano-samples/F%235v4.mp3',
    A5: '/audio/piano-samples/A5v4.mp3'
  };
  const NOTE_INDEX = {
    C: 0,
    'C#': 1,
    D: 2,
    'D#': 3,
    E: 4,
    F: 5,
    'F#': 6,
    G: 7,
    'G#': 8,
    A: 9,
    'A#': 10,
    B: 11
  };

  function buildKeyboardModel() {
    return {
      whiteKeys: WHITE_NOTES.map((note) => ({ note, type: 'white' })),
      blackKeys: BLACK_NOTES.map((note) => ({ note, type: 'black' }))
    };
  }

  function buildKeyboardShortcuts() {
    const whiteMap = DESKTOP_WHITE_SHORTCUTS.reduce((accumulator, code, index) => {
      accumulator[code] = WHITE_NOTES[index];
      return accumulator;
    }, {});

    return DESKTOP_BLACK_SHORTCUTS.reduce((accumulator, code, index) => {
      accumulator[code] = BLACK_NOTES[index];
      return accumulator;
    }, whiteMap);
  }

  function createPressedNotesStore() {
    const active = new Map();

    return {
      press(note, source) {
        const normalizedNote = String(note || '').trim();
        if (!normalizedNote) return;
        const normalizedSource = String(source || '').trim() || 'unknown';
        const sources = active.get(normalizedNote) || new Set();
        sources.add(normalizedSource);
        active.set(normalizedNote, sources);
      },
      release(note, source) {
        const normalizedNote = String(note || '').trim();
        if (!normalizedNote || !active.has(normalizedNote)) return;

        if (source === undefined) {
          active.delete(normalizedNote);
          return;
        }

        const normalizedSource = String(source || '').trim() || 'unknown';
        const sources = active.get(normalizedNote);
        sources.delete(normalizedSource);
        if (!sources.size) {
          active.delete(normalizedNote);
        }
      },
      has(note) {
        return active.has(String(note || '').trim());
      },
      notes() {
        return Array.from(active.keys());
      },
      clear() {
        active.clear();
      }
    };
  }

  function noteToFrequency(note) {
    const normalized = String(note || '').trim();
    const match = normalized.match(/^([A-G]#?)(\d)$/);
    if (!match) return 440;

    const noteName = match[1];
    const octave = Number(match[2]);
    const midi = (octave + 1) * 12 + NOTE_INDEX[noteName];
    return 440 * (2 ** ((midi - 69) / 12));
  }

  function noteToMidi(note) {
    const normalized = String(note || '').trim();
    const match = normalized.match(/^([A-G]#?)(\d)$/);
    if (!match) return 69;
    return (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]];
  }

  function getNearestSampleNote(note) {
    const targetMidi = noteToMidi(note);
    return Object.keys(PIANO_SAMPLE_FILES).sort((left, right) => {
      return Math.abs(noteToMidi(left) - targetMidi) - Math.abs(noteToMidi(right) - targetMidi);
    })[0];
  }

  function createPianoPeriodicWave(context) {
    const real = new Float32Array([0, 0.92, 0.38, 0.2, 0.12, 0.08, 0.05, 0.03]);
    const imag = new Float32Array(real.length);
    return context.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  function createHammerNoiseBuffer(context) {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * 0.03));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      const decay = 1 - index / frameCount;
      channel[index] = (Math.random() * 2 - 1) * decay;
    }

    return buffer;
  }

  function createAudioEngine() {
    let audioContext = null;
    const activeVoices = new Map();
    const sampleBufferCache = new Map();
    const sampleBufferLoading = new Map();
    let periodicWave = null;
    let hammerNoiseBuffer = null;
    let samplePreloadStarted = false;

    function ensureAudioContext() {
      if (audioContext || typeof window === 'undefined') return audioContext;
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioContext = new AudioContextCtor();
      periodicWave = createPianoPeriodicWave(audioContext);
      hammerNoiseBuffer = createHammerNoiseBuffer(audioContext);
      return audioContext;
    }

    async function resumeAudioContextIfNeeded() {
      const context = ensureAudioContext();
      if (!context) return null;
      if (context.state === 'suspended') {
        await context.resume();
      }
      return context;
    }

    async function loadSampleBuffer(sampleNote) {
      const sampleUrl = PIANO_SAMPLE_FILES[sampleNote];
      if (!sampleUrl) return null;
      if (sampleBufferCache.has(sampleNote)) return sampleBufferCache.get(sampleNote);
      if (sampleBufferLoading.has(sampleNote)) return sampleBufferLoading.get(sampleNote);

      const context = await resumeAudioContextIfNeeded();
      if (!context) return null;

      const pending = fetch(sampleUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`sample fetch failed: ${sampleNote}`);
          }
          return response.arrayBuffer();
        })
        .then((arrayBuffer) => context.decodeAudioData(arrayBuffer.slice(0)))
        .then((audioBuffer) => {
          sampleBufferCache.set(sampleNote, audioBuffer);
          sampleBufferLoading.delete(sampleNote);
          return audioBuffer;
        })
        .catch((error) => {
          sampleBufferLoading.delete(sampleNote);
          throw error;
        });

      sampleBufferLoading.set(sampleNote, pending);
      return pending;
    }

    function startSamplePlayback(context, note, sampleNote, audioBuffer) {
      if (!context || !audioBuffer) return false;

      const sourceNode = context.createBufferSource();
      const gainNode = context.createGain();
      const filterNode = context.createBiquadFilter();
      const targetMidi = noteToMidi(note);
      const sourceMidi = noteToMidi(sampleNote);
      const now = context.currentTime;

      sourceNode.buffer = audioBuffer;
      sourceNode.playbackRate.value = 2 ** ((targetMidi - sourceMidi) / 12);
      filterNode.type = 'lowpass';
      filterNode.frequency.value = Math.min(4600, noteToFrequency(note) * 9.5);
      filterNode.Q.value = 0.4;

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.95, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(3.6, audioBuffer.duration + 0.2));

      sourceNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(context.destination);
      sourceNode.start(now);

      activeVoices.set(note, {
        kind: 'sample',
        gainNode,
        sourceNode
      });

      sourceNode.addEventListener('ended', () => {
        if (activeVoices.get(note)?.sourceNode === sourceNode) {
          activeVoices.delete(note);
        }
      }, { once: true });

      return true;
    }

    async function playSampleNote(note) {
      const context = await resumeAudioContextIfNeeded();
      if (!context) return false;

      const sampleNote = getNearestSampleNote(note);
      const audioBuffer = await loadSampleBuffer(sampleNote).catch(() => null);
      if (!audioBuffer) return false;

      return startSamplePlayback(context, note, sampleNote, audioBuffer);
    }

    async function preloadAllSampleBuffers() {
      if (samplePreloadStarted) return;
      samplePreloadStarted = true;
      await Promise.allSettled(Object.keys(PIANO_SAMPLE_FILES).map((sampleNote) => loadSampleBuffer(sampleNote)));
    }

    function playSynthNote(context, note) {
      const frequency = noteToFrequency(note);
      const now = context.currentTime;
      const masterGain = context.createGain();
      const toneFilter = context.createBiquadFilter();
      const detuneOffsets = [-7, 0, 7];
      const oscillators = [];
      let noiseSource = null;

      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(Math.min(4200, frequency * 9), now);
      toneFilter.Q.value = 1.15;

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
      masterGain.gain.exponentialRampToValueAtTime(0.12, now + 0.09);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      for (const detune of detuneOffsets) {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();

        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune;
        oscillator.setPeriodicWave(periodicWave);

        voiceGain.gain.setValueAtTime(detune === 0 ? 0.16 : 0.06, now);

        oscillator.connect(voiceGain);
        voiceGain.connect(toneFilter);
        oscillator.start(now);
        oscillators.push(oscillator);
      }

      if (hammerNoiseBuffer) {
        const noiseFilter = context.createBiquadFilter();
        const noiseGain = context.createGain();

        noiseSource = context.createBufferSource();
        noiseSource.buffer = hammerNoiseBuffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = Math.min(5400, frequency * 11);
        noiseFilter.Q.value = 0.85;

        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.linearRampToValueAtTime(0.055, now + 0.002);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(toneFilter);
        noiseSource.start(now);
        noiseSource.stop(now + 0.05);
      }

      toneFilter.connect(masterGain);
      masterGain.connect(context.destination);

      activeVoices.set(note, {
        kind: 'synth',
        oscillators,
        noiseSource,
        masterGain
      });
    }

    async function playNote(note) {
      const context = await resumeAudioContextIfNeeded();
      if (!context || activeVoices.has(note)) return;

      preloadAllSampleBuffers().catch(() => {});
      const sampleNote = getNearestSampleNote(note);
      const cachedSample = sampleBufferCache.get(sampleNote);
      if (cachedSample) {
        startSamplePlayback(context, note, sampleNote, cachedSample);
        return;
      }

      playSynthNote(context, note);
      loadSampleBuffer(sampleNote).catch(() => null);
    }

    function stopNote(note) {
      const context = audioContext;
      const voice = activeVoices.get(note);
      if (!context || !voice) return;

      const stopAt = context.currentTime + 0.12;
      if (voice.kind === 'sample') {
        voice.gainNode.gain.cancelScheduledValues(context.currentTime);
        voice.gainNode.gain.setValueAtTime(Math.max(voice.gainNode.gain.value, 0.0001), context.currentTime);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
        voice.sourceNode.stop(stopAt + 0.02);
      } else {
        voice.masterGain.gain.cancelScheduledValues(context.currentTime);
        voice.masterGain.gain.setValueAtTime(Math.max(voice.masterGain.gain.value, 0.0001), context.currentTime);
        voice.masterGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
        for (const oscillator of voice.oscillators) {
          oscillator.stop(stopAt + 0.03);
        }
        if (voice.noiseSource) {
          try {
            voice.noiseSource.stop(stopAt);
          } catch {}
        }
      }
      activeVoices.delete(note);
    }

    function stopAll() {
      for (const note of Array.from(activeVoices.keys())) {
        stopNote(note);
      }
    }

    return {
      get audioContext() {
        return audioContext;
      },
      resumeAudioContextIfNeeded,
      preloadAllSampleBuffers,
      playNote,
      stopNote,
      stopAll
    };
  }

  function setKeyPressedState(note, pressed) {
    if (typeof document === 'undefined') return;
    const key = document.querySelector(`[data-note="${note}"]`);
    if (!key) return;
    key.classList.toggle('is-active', Boolean(pressed));
    key.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  function releaseAllNotes(store, audioEngine) {
    for (const note of store.notes()) {
      setKeyPressedState(note, false);
      audioEngine.stopNote(note);
    }
    store.clear();
  }

  function syncOrientationState() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const page = document.querySelector('.piano-page');
    if (!page) return;

    const isPortrait = window.matchMedia('(orientation: portrait)').matches && window.innerWidth < 900;
    page.classList.toggle('is-portrait', isPortrait);
  }

  function pressNote(note, source, store, audioEngine) {
    if (!note) return;
    const shouldStartAudio = !store.has(note);
    store.press(note, source);
    setKeyPressedState(note, true);
    if (shouldStartAudio) {
      audioEngine.playNote(note).catch(() => {});
    }
  }

  function releaseNote(note, source, store, audioEngine) {
    if (!note) return;
    store.release(note, source);
    if (store.has(note)) return;
    setKeyPressedState(note, false);
    audioEngine.stopNote(note);
  }

  function resolvePointerNoteTarget(event, ownerDocument = document) {
    const activeElement = ownerDocument?.elementFromPoint?.(event?.clientX, event?.clientY);
    const activeKey = activeElement?.closest?.('.piano-key');
    if (activeKey?.dataset?.note) {
      return String(activeKey.dataset.note).trim();
    }
    return String(event?.currentTarget?.dataset?.note || '').trim();
  }

  function attachPointerHandlers(store, audioEngine) {
    if (typeof document === 'undefined') return;
    const pointerToNote = new Map();
    const keys = document.querySelectorAll('.piano-key');

    for (const key of keys) {
      key.addEventListener('pointerdown', (event) => {
        const note = resolvePointerNoteTarget(event);
        if (!note) return;
        event.preventDefault();
        const source = `pointer:${event.pointerId}`;
        pointerToNote.set(event.pointerId, note);
        pressNote(note, source, store, audioEngine);
      });

      key.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || event.buttons === 0) return;
        const note = resolvePointerNoteTarget(event);
        if (!note) return;
        const source = `pointer:${event.pointerId}`;
        pointerToNote.set(event.pointerId, note);
        pressNote(note, source, store, audioEngine);
      });

      key.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'mouse' || (event.buttons === 0 && event.pressure === 0)) return;
        const source = `pointer:${event.pointerId}`;
        const nextNote = resolvePointerNoteTarget(event);
        const previousNote = pointerToNote.get(event.pointerId);
        if (!nextNote || nextNote === previousNote) return;
        if (previousNote) {
          releaseNote(previousNote, source, store, audioEngine);
        }
        pointerToNote.set(event.pointerId, nextNote);
        pressNote(nextNote, source, store, audioEngine);
      });

      key.addEventListener('pointerup', (event) => {
        const note = pointerToNote.get(event.pointerId) || resolvePointerNoteTarget(event);
        pointerToNote.delete(event.pointerId);
        releaseNote(note, `pointer:${event.pointerId}`, store, audioEngine);
      });

      key.addEventListener('pointercancel', (event) => {
        const note = pointerToNote.get(event.pointerId) || resolvePointerNoteTarget(event);
        pointerToNote.delete(event.pointerId);
        releaseNote(note, `pointer:${event.pointerId}`, store, audioEngine);
      });
    }
  }

  function attachKeyboardHandlers(store, audioEngine) {
    if (typeof window === 'undefined') return;
    const shortcuts = buildKeyboardShortcuts();

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const note = shortcuts[event.code];
      if (!note) return;
      event.preventDefault();
      pressNote(note, `keyboard:${event.code}`, store, audioEngine);
    });

    window.addEventListener('keyup', (event) => {
      const note = shortcuts[event.code];
      if (!note) return;
      event.preventDefault();
      releaseNote(note, `keyboard:${event.code}`, store, audioEngine);
    });
  }

  function attachInteractionGuards() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const keyboard = document.getElementById('pianoKeyboard');
    if (!keyboard) return;

    keyboard.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    document.addEventListener('selectstart', (event) => {
      if (!keyboard.contains(event.target)) return;
      event.preventDefault();
    });

    document.addEventListener('selectionchange', () => {
      if (!keyboard.contains(document.activeElement) && !document.querySelector('.piano-key.is-active')) return;
      window.getSelection()?.removeAllRanges();
    });
  }

  function primeKeyAccessibility() {
    if (typeof document === 'undefined') return;
    for (const key of document.querySelectorAll('.piano-key')) {
      key.setAttribute('aria-pressed', 'false');
      key.setAttribute('aria-label', String(key.dataset.note || '琴键'));
    }
  }

  function initPiano() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (!document.getElementById('pianoKeyboard')) return;

    const store = createPressedNotesStore();
    const audioEngine = createAudioEngine();
    primeKeyAccessibility();
    syncOrientationState();
    attachPointerHandlers(store, audioEngine);
    attachKeyboardHandlers(store, audioEngine);
    attachInteractionGuards();

    const releaseAll = () => releaseAllNotes(store, audioEngine);
    window.addEventListener('blur', releaseAllNotes);
    window.addEventListener('blur', releaseAll);
    window.addEventListener('resize', syncOrientationState);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        releaseAll();
      }
      syncOrientationState();
    });
  }

  const pianoApi = {
    buildKeyboardModel,
    buildKeyboardShortcuts,
    createPressedNotesStore,
    resolvePointerNoteTarget,
    createAudioEngine,
    attachPointerHandlers,
    attachKeyboardHandlers,
    releaseAllNotes,
    syncOrientationState,
    initPiano
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pianoApi;
  }

  if (globalScope && typeof globalScope === 'object') {
    globalScope.ClawPiano = pianoApi;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPiano, { once: true });
    } else {
      initPiano();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
