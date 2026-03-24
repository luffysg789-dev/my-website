const PRESET_LIGHTS = [
  { name: '少女粉', hue: 340, saturation: 88, brightness: 100 },
  { name: '冷白皮', hue: 191, saturation: 56, brightness: 100 },
  { name: '奶油光', hue: 38, saturation: 64, brightness: 100 },
  { name: '百搭光', hue: 0, saturation: 2, brightness: 100 },
  { name: '蜜桃灯', hue: 16, saturation: 86, brightness: 100 },
  { name: '清新光', hue: 220, saturation: 72, brightness: 98 },
  { name: '网感紫', hue: 271, saturation: 94, brightness: 96 },
  { name: '落日灯', hue: 21, saturation: 93, brightness: 100 }
];

const state = {
  presetIndex: 0,
  hue: PRESET_LIGHTS[0].hue,
  saturation: PRESET_LIGHTS[0].saturation,
  brightness: PRESET_LIGHTS[0].brightness,
  panelCollapsed: false,
  panelTouchStartY: null,
  hintDismissed: false,
  lastStageStepAt: 0
};

const ui = {
  shell: document.getElementById('beautyLightShell'),
  stage: document.getElementById('beautyLightStage'),
  panel: document.getElementById('beautyLightPanel'),
  panelCloseBtn: document.getElementById('beautyLightPanelCloseBtn'),
  panelHandle: document.getElementById('beautyLightPanelHandle'),
  panelToggleBtn: document.getElementById('beautyLightPanelToggleBtn'),
  hintBubble: document.querySelector('.beauty-light-hint-bubble'),
  presets: Array.from(document.querySelectorAll('.beauty-light-preset')),
  hue: document.getElementById('beautyLightHue'),
  saturation: document.getElementById('beautyLightSaturation'),
  brightness: document.getElementById('beautyLightBrightness'),
  hueValue: document.getElementById('beautyLightHueValue'),
  saturationValue: document.getElementById('beautyLightSaturationValue'),
  brightnessValue: document.getElementById('beautyLightBrightnessValue')
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatBrightness(value) {
  return `${Math.round(value)}%`;
}

function applyColor() {
  const hue = clamp(Number(state.hue) || 0, 0, 360);
  const saturation = clamp(Number(state.saturation) || 0, 0, 100);
  const brightness = clamp(Number(state.brightness) || 35, 35, 100);
  const main = `hsl(${hue} ${saturation}% ${brightness * 0.78}%)`;
  const glow = `radial-gradient(circle at 20% 18%, hsla(${hue} ${Math.min(saturation + 8, 100)}% 98% / 0.24), transparent 28%)`;
  const glowAlt = `radial-gradient(circle at 82% 14%, hsla(${(hue + 18) % 360} ${Math.min(saturation + 4, 100)}% 98% / 0.18), transparent 22%)`;
  ui.shell.style.background = `${glow}, ${glowAlt}, linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)), ${main}`;
  ui.hueValue.textContent = `${Math.round(hue)}°`;
  ui.saturationValue.textContent = `${Math.round(saturation)}%`;
  ui.brightnessValue.textContent = formatBrightness(brightness);
}

function syncPresetSelection() {
  ui.presets.forEach((button, index) => {
    button.classList.toggle('is-active', index === state.presetIndex);
  });
}

function syncPanelState() {
  ui.shell.classList.toggle('is-panel-hidden', state.panelCollapsed);
}

function syncHintState() {
  ui.shell.classList.toggle('is-hint-dismissed', state.hintDismissed);
}

function closePanel() {
  state.panelCollapsed = true;
  syncPanelState();
}

function openPanel() {
  state.panelCollapsed = false;
  syncPanelState();
}

function setPreset(index) {
  const preset = PRESET_LIGHTS[index];
  if (!preset) return;
  state.presetIndex = index;
  state.hue = preset.hue;
  state.saturation = preset.saturation;
  state.brightness = preset.brightness;
  ui.hue.value = String(preset.hue);
  ui.saturation.value = String(preset.saturation);
  ui.brightness.value = String(preset.brightness);
  syncPresetSelection();
  applyColor();
}

function stepPreset(delta) {
  const total = PRESET_LIGHTS.length;
  const nextIndex = (state.presetIndex + delta + total) % total;
  setPreset(nextIndex);
}

function onStageInteract(event) {
  if (event.target.closest('.beauty-light-topbar')) {
    return;
  }
  const now = Date.now();
  if (now - state.lastStageStepAt < 220) {
    return;
  }
  state.lastStageStepAt = now;
  if (!state.hintDismissed) {
    state.hintDismissed = true;
    syncHintState();
  }
  stepPreset(1);
}

function onPanelTouchStart(event) {
  state.panelTouchStartY = event.changedTouches?.[0]?.clientY ?? null;
}

function onPanelTouchEnd(event) {
  if (state.panelTouchStartY == null) return;
  const endY = event.changedTouches?.[0]?.clientY ?? state.panelTouchStartY;
  const deltaY = endY - state.panelTouchStartY;
  state.panelTouchStartY = null;
  if (deltaY > 42) {
    closePanel();
  }
}

function bindEvents() {
  ui.presets.forEach((button, index) => {
    button.addEventListener('click', () => setPreset(index));
  });

  ui.hue.addEventListener('input', () => {
    state.hue = Number(ui.hue.value);
    applyColor();
  });

  ui.saturation.addEventListener('input', () => {
    state.saturation = Number(ui.saturation.value);
    applyColor();
  });

  ui.brightness.addEventListener('input', () => {
    state.brightness = Number(ui.brightness.value);
    applyColor();
  });

  ui.stage.addEventListener('pointerdown', onStageInteract);
  ui.stage.addEventListener('click', onStageInteract);
  ui.panelCloseBtn.addEventListener('click', closePanel);
  ui.panelToggleBtn.addEventListener('click', () => {
    if (state.panelCollapsed) {
      openPanel();
      return;
    }
    closePanel();
  });
  ui.panelHandle.addEventListener('click', () => {
    if (state.panelCollapsed) {
      openPanel();
      return;
    }
    closePanel();
  });
  ui.panel.addEventListener('touchstart', onPanelTouchStart, { passive: true });
  ui.panel.addEventListener('touchend', onPanelTouchEnd, { passive: true });
}

function init() {
  bindEvents();
  setPreset(0);
  syncPanelState();
  syncHintState();
}

init();
