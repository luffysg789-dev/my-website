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
  const MIN_NOTE_HOLD_SECONDS = 0.48;

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
    let sampleWarmupScheduled = false;
    let lastTouchInteractionAt = 0;

    function ensureAudioContext() {
      if (audioContext || typeof window === 'undefined') return audioContext;
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
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

    function startSamplePlayback(context, note, sampleNote, audioBuffer, options = {}) {
      if (!context || !audioBuffer) return null;

      const sourceNode = context.createBufferSource();
      const gainNode = context.createGain();
      const filterNode = context.createBiquadFilter();
      const targetMidi = noteToMidi(note);
      const sourceMidi = noteToMidi(sampleNote);
      const now = context.currentTime;
      const attackDuration = Number(options.attackDuration ?? 0.004);
      const peakGain = Number(options.peakGain ?? 0.98);
      const releaseDuration = Number(options.releaseDuration ?? Math.min(4.2, audioBuffer.duration + 0.9));

      sourceNode.buffer = audioBuffer;
      sourceNode.playbackRate.value = 2 ** ((targetMidi - sourceMidi) / 12);
      filterNode.type = 'lowpass';
      filterNode.frequency.value = Math.min(4600, noteToFrequency(note) * 9.5);
      filterNode.Q.value = 0.4;

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(peakGain, now + attackDuration);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseDuration);

      sourceNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(context.destination);
      sourceNode.start(now);

      return {
        gainNode,
        sourceNode,
        startedAt: now
      };
    }

    async function playSampleNote(note) {
      const context = await resumeAudioContextIfNeeded();
      if (!context) return false;

      const sampleNote = getNearestSampleNote(note);
      const audioBuffer = await loadSampleBuffer(sampleNote).catch(() => null);
      if (!audioBuffer) return false;

      const sampleLayer = startSamplePlayback(context, note, sampleNote, audioBuffer);
      if (!sampleLayer) return false;

      activeVoices.set(note, {
        kind: 'sample',
        ...sampleLayer
      });

      sampleLayer.sourceNode.addEventListener('ended', () => {
        if (activeVoices.get(note)?.sourceNode === sampleLayer.sourceNode) {
          activeVoices.delete(note);
        }
      }, { once: true });

      return true;
    }

    function markTouchInteraction() {
      lastTouchInteractionAt = Date.now();
    }

    function scheduleSampleWarmup(prioritySampleNote) {
      if (sampleWarmupScheduled || typeof window === 'undefined') return;
      sampleWarmupScheduled = true;

      const warmupTask = () => {
        const idleFor = Date.now() - lastTouchInteractionAt;
        if (idleFor < 260) {
          sampleWarmupScheduled = false;
          window.setTimeout(() => scheduleSampleWarmup(prioritySampleNote), 220);
          return;
        }

        const orderedNotes = [
          prioritySampleNote,
          ...Object.keys(PIANO_SAMPLE_FILES).filter((sampleNote) => sampleNote !== prioritySampleNote)
        ].filter(Boolean);

        let chain = Promise.resolve();
        for (const sampleNote of orderedNotes) {
          chain = chain
            .then(() => loadSampleBuffer(sampleNote).catch(() => null))
            .then(() => new Promise((resolve) => window.setTimeout(resolve, 90)));
        }

        chain.finally(() => {
          sampleWarmupScheduled = false;
        });
      };

      if (typeof window.requestIdleCallback === 'function') {
        window.setTimeout(() => {
          window.requestIdleCallback(warmupTask, { timeout: 1500 });
        }, 420);
      } else {
        window.setTimeout(() => {
          warmupTask();
        }, 420);
      }
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
      masterGain.gain.linearRampToValueAtTime(0.24, now + 0.004);
      masterGain.gain.exponentialRampToValueAtTime(0.14, now + 0.12);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

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

      return {
        oscillators,
        noiseSource,
        masterGain,
        startedAt: now
      };
    }

    function fadeOutSynthLayer(context, synthLayer, duration = 0.18) {
      if (!context || !synthLayer) return;
      const stopAt = context.currentTime + duration;
      synthLayer.masterGain.gain.cancelScheduledValues(context.currentTime);
      synthLayer.masterGain.gain.setValueAtTime(Math.max(synthLayer.masterGain.gain.value, 0.0001), context.currentTime);
      synthLayer.masterGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      for (const oscillator of synthLayer.oscillators) {
        oscillator.stop(stopAt + 0.04);
      }
      if (synthLayer.noiseSource) {
        try {
          synthLayer.noiseSource.stop(stopAt);
        } catch {}
      }
    }

    function getVoiceStopAt(context, voice) {
      const startedAt = Number(voice?.startedAt ?? voice?.sampleLayer?.startedAt ?? voice?.synthLayer?.startedAt ?? context.currentTime);
      const elapsed = Math.max(0, context.currentTime - startedAt);
      const remainingHold = Math.max(0, MIN_NOTE_HOLD_SECONDS - elapsed);
      return context.currentTime + remainingHold + 0.22;
    }

    function playTouchResponsiveNote(context, note, sampleNote, options = {}) {
      const synthLayer = playSynthNote(context, note);
      const cachedSample = options.cachedSample || sampleBufferCache.get(sampleNote) || null;
      const directSampleOptions = {
        attackDuration: 0.0025,
        peakGain: 0.94,
        releaseDuration: 2.8
      };
      const voice = {
        kind: 'hybrid',
        synthLayer,
        sampleLayer: null
      };

      activeVoices.set(note, voice);
      markTouchInteraction();
      scheduleSampleWarmup(sampleNote);

      if (!cachedSample) {
        return;
      }

      const sampleLayer = startSamplePlayback(context, note, sampleNote, cachedSample, directSampleOptions);
      if (!sampleLayer) return;

      voice.sampleLayer = sampleLayer;
      fadeOutSynthLayer(context, synthLayer, 0.08);

      sampleLayer.sourceNode.addEventListener('ended', () => {
        if (activeVoices.get(note) === voice) {
          activeVoices.delete(note);
        }
      }, { once: true });
    }

    async function playNote(note, options = {}) {
      let context = ensureAudioContext();
      if (!context) return;
      if (context.state === 'suspended') {
        context = await resumeAudioContextIfNeeded();
      }
      if (!context || activeVoices.has(note)) return;

      const sampleNote = getNearestSampleNote(note);
      const cachedSample = sampleBufferCache.get(sampleNote);
      const preferImmediateSynth = Boolean(options.preferImmediateSynth);
      const directSampleOptions = {
        attackDuration: 0.0025,
        peakGain: 0.94,
        releaseDuration: 2.8
      };
      const shouldUseCachedSampleDirectly = Boolean(preferImmediateSynth && cachedSample);
      if (shouldUseCachedSampleDirectly) {
        const sampleLayer = startSamplePlayback(context, note, sampleNote, cachedSample, directSampleOptions);
        if (!sampleLayer) return;
        activeVoices.set(note, {
          kind: 'sample',
          ...sampleLayer
        });
        sampleLayer.sourceNode.addEventListener('ended', () => {
          if (activeVoices.get(note)?.sourceNode === sampleLayer.sourceNode) {
            activeVoices.delete(note);
          }
        }, { once: true });
        return;
      }
      if (preferImmediateSynth) {
        playTouchResponsiveNote(context, note, sampleNote, { cachedSample });
        return;
      }
      if (cachedSample) {
        const sampleLayer = startSamplePlayback(context, note, sampleNote, cachedSample);
        if (!sampleLayer) return;
        activeVoices.set(note, {
          kind: 'sample',
          ...sampleLayer
        });
        sampleLayer.sourceNode.addEventListener('ended', () => {
          if (activeVoices.get(note)?.sourceNode === sampleLayer.sourceNode) {
            activeVoices.delete(note);
          }
        }, { once: true });
        return;
      }

      const synthLayer = playSynthNote(context, note);
      activeVoices.set(note, {
        kind: 'synth',
        ...synthLayer
      });
      scheduleSampleWarmup(sampleNote);
    }

    function stopNote(note) {
      const context = audioContext;
      const voice = activeVoices.get(note);
      if (!context || !voice) return;

      const stopAt = getVoiceStopAt(context, voice);
      if (voice.kind === 'sample') {
        voice.gainNode.gain.cancelScheduledValues(context.currentTime);
        voice.gainNode.gain.setValueAtTime(Math.max(voice.gainNode.gain.value, 0.0001), context.currentTime);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
        voice.sourceNode.stop(stopAt + 0.02);
      } else if (voice.kind === 'synth') {
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
      if (voice.kind === 'hybrid') {
        if (voice.sampleLayer) {
          voice.sampleLayer.gainNode.gain.cancelScheduledValues(context.currentTime);
          voice.sampleLayer.gainNode.gain.setValueAtTime(Math.max(voice.sampleLayer.gainNode.gain.value, 0.0001), context.currentTime);
          voice.sampleLayer.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
          voice.sampleLayer.sourceNode.stop(stopAt + 0.03);
        }
        if (voice.synthLayer) {
          fadeOutSynthLayer(context, voice.synthLayer, 0.18);
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
      scheduleSampleWarmup,
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

    const isMobile = isLikelyMobileDevice();
    page.classList.toggle('is-mobile-device', isMobile);
    const shouldLockPortrait = isMobile && (window.innerWidth > window.innerHeight || window.matchMedia('(orientation: landscape)').matches);
    page.classList.toggle('is-rotation-locked', shouldLockPortrait);
  }

  function isLikelyMobileDevice() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  }

  function pressNote(note, source, store, audioEngine) {
    if (!note) return;
    const shouldStartAudio = !store.has(note);
    store.press(note, source);
    setKeyPressedState(note, true);
    if (shouldStartAudio) {
      const preferImmediateSynth = typeof window !== 'undefined'
        && isLikelyMobileDevice()
        && String(source || '').startsWith('pointer:touch:');
      audioEngine.playNote(note, { preferImmediateSynth }).catch(() => {});
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
    const keyboardBounds = ownerDocument?.querySelector?.('#pianoKeys')?.getBoundingClientRect?.();
    if (keyboardBounds?.width) {
      const relativeX = Math.min(Math.max((Number(event?.clientX) - keyboardBounds.left) / keyboardBounds.width, 0), 0.999999);
      const whiteIndex = Math.min(WHITE_NOTES.length - 1, Math.max(0, Math.floor(relativeX * WHITE_NOTES.length)));
      return WHITE_NOTES[whiteIndex];
    }
    return String(event?.currentTarget?.dataset?.note || '').trim();
  }

  function attachPointerHandlers(store, audioEngine) {
    if (typeof document === 'undefined') return;
    const pointerToNote = new Map();
    const keys = document.querySelectorAll('.piano-key');

    for (const key of keys) {
      key.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') return;
        const note = resolvePointerNoteTarget(event);
        if (!note) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const source = `pointer:${event.pointerType || 'unknown'}:${event.pointerId}`;
        pointerToNote.set(event.pointerId, note);
        pressNote(note, source, store, audioEngine);
      });

      key.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || event.buttons === 0) return;
        const note = resolvePointerNoteTarget(event);
        if (!note) return;
        const source = `pointer:${event.pointerType || 'unknown'}:${event.pointerId}`;
        pointerToNote.set(event.pointerId, note);
        pressNote(note, source, store, audioEngine);
      });

      key.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch' || event.pointerType === 'mouse' || (event.buttons === 0 && event.pressure === 0)) return;
        const source = `pointer:${event.pointerType || 'unknown'}:${event.pointerId}`;
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
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        pointerToNote.delete(event.pointerId);
        releaseNote(note, `pointer:${event.pointerType || 'unknown'}:${event.pointerId}`, store, audioEngine);
      });

      key.addEventListener('pointercancel', (event) => {
        const note = pointerToNote.get(event.pointerId) || resolvePointerNoteTarget(event);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        pointerToNote.delete(event.pointerId);
        releaseNote(note, `pointer:${event.pointerType || 'unknown'}:${event.pointerId}`, store, audioEngine);
      });
    }
  }

  function attachTouchHandlers(store, audioEngine) {
    if (typeof document === 'undefined') return;
    const touchToNote = new Map();
    const keys = document.querySelectorAll('.piano-key');

    function resolveTouchTarget(touch, currentTarget) {
      return resolvePointerNoteTarget({
        clientX: touch?.clientX,
        clientY: touch?.clientY,
        currentTarget
      }, document);
    }

    for (const key of keys) {
      key.addEventListener('touchstart', (event) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches || [])) {
          const note = resolveTouchTarget(touch, event.currentTarget);
          if (!note) continue;
          const source = `touch:${touch.identifier}`;
          touchToNote.set(touch.identifier, note);
          pressNote(note, source, store, audioEngine);
        }
      }, { passive: false });

      key.addEventListener('touchmove', (event) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches || [])) {
          const source = `touch:${touch.identifier}`;
          const nextNote = resolveTouchTarget(touch, event.currentTarget);
          const previousNote = touchToNote.get(touch.identifier);
          if (!nextNote || nextNote === previousNote) continue;
          if (previousNote) {
            releaseNote(previousNote, source, store, audioEngine);
          }
          touchToNote.set(touch.identifier, nextNote);
          pressNote(nextNote, source, store, audioEngine);
        }
      }, { passive: false });

      key.addEventListener('touchend', (event) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches || [])) {
          const source = `touch:${touch.identifier}`;
          const note = touchToNote.get(touch.identifier) || resolveTouchTarget(touch, event.currentTarget);
          touchToNote.delete(touch.identifier);
          releaseNote(note, source, store, audioEngine);
        }
      }, { passive: false });

      key.addEventListener('touchcancel', (event) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches || [])) {
          const source = `touch:${touch.identifier}`;
          const note = touchToNote.get(touch.identifier) || resolveTouchTarget(touch, event.currentTarget);
          touchToNote.delete(touch.identifier);
          releaseNote(note, source, store, audioEngine);
        }
      }, { passive: false });
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
    attachTouchHandlers(store, audioEngine);
    attachKeyboardHandlers(store, audioEngine);
    attachInteractionGuards();

    const releaseAll = () => releaseAllNotes(store, audioEngine);
    window.addEventListener('blur', releaseAllNotes);
    window.addEventListener('blur', releaseAll);
    window.addEventListener('resize', syncOrientationState);
    window.addEventListener('orientationchange', syncOrientationState);
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
    attachTouchHandlers,
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
