const drawBtn = document.getElementById('fortuneDrawBtn');
const retryBtn = document.getElementById('fortuneRetryBtn');
const hintEl = document.getElementById('fortuneHint');
const resultEl = document.getElementById('fortuneResult');
const gradeEl = document.getElementById('fortuneGrade');
const wealthEl = document.getElementById('fortuneWealth');
const titleEl = document.getElementById('fortuneTitle');
const summaryEl = document.getElementById('fortuneSummary');
const doEl = document.getElementById('fortuneDo');
const avoidEl = document.getElementById('fortuneAvoid');
const adviceEl = document.getElementById('fortuneAdvice');
let audioContext = null;
let noiseBuffer = null;
let customSoundSrc = '';
let customSoundAvailable = false;

const FORTUNES = [
  {
    grade: '上上签',
    wealth: 98,
    title: '财星高照，进账有喜',
    summary: '今天的财运相当顺，正财稳定，偏财也有意外惊喜，适合把握靠谱机会。',
    good: '推进收款、谈预算、做长期投资判断',
    avoid: '冲动梭哈、临时起意的大额消费',
    advice: '今天适合主动争取回报，越是提前准备的事，越容易转成真实进账。'
  },
  {
    grade: '上签',
    wealth: 82,
    title: '稳中有升，小财可聚',
    summary: '今天财运偏稳，适合积少成多。小机会不少，但更适合稳稳拿住。',
    good: '整理账目、跟进合作、做收益复盘',
    avoid: '跟风下注、被情绪带着消费',
    advice: '把今天当成收口日，该追的款、该谈的条件，往前推一步会有回应。'
  },
  {
    grade: '中签',
    wealth: 60,
    title: '守正为上，宜稳不宜冒',
    summary: '今天财运平平，没有明显破财，但也不适合冲动出手，稳住节奏最重要。',
    good: '保守理财、清理无效支出、延后高风险决定',
    avoid: '借钱给人、临时换赛道、赌运气',
    advice: '今天最值钱的是耐心，少做一件冲动决定，比多追一个机会更划算。'
  },
  {
    grade: '下签',
    wealth: 36,
    title: '财路有阻，谨防失手',
    summary: '今天财运偏弱，容易高估收益、低估风险。尤其要警惕情绪化消费和轻信消息。',
    good: '暂停冒险、核对合同、把现金流看紧',
    avoid: '高杠杆、陌生推荐、报复性购物',
    advice: '今天最好的财运策略是少动，稳住本金、守住边界，就是赢。'
  }
];

let isDrawing = false;

function syncGameConfig() {
  const config = window.ClawGamesConfig?.getCurrentGameConfig?.() || window.__GAME_CONFIG__ || null;
  const src = String(config?.sound_file || '').trim();
  customSoundSrc = src;
  customSoundAvailable = Boolean(src);
}

function playCustomSound() {
  if (!customSoundAvailable || !customSoundSrc || typeof Audio === 'undefined') return false;
  try {
    const sound = new Audio(customSoundSrc);
    sound.currentTime = 0;
    sound.play().catch(() => {
      customSoundAvailable = false;
    });
    return true;
  } catch {
    customSoundAvailable = false;
    return false;
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function getNoiseBuffer(context) {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const length = Math.floor(context.sampleRate * 0.18);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

function playShakeSound(pulses = 5, spacing = 0.09) {
  if (playCustomSound()) return;
  const context = getAudioContext();
  if (!context) return;

  const startAt = context.currentTime + 0.01;
  const buffer = getNoiseBuffer(context);

  for (let index = 0; index < pulses; index += 1) {
    const noiseSource = context.createBufferSource();
    const noiseGain = context.createGain();
    const highpassFilter = context.createBiquadFilter();
    const bandpassFilter = context.createBiquadFilter();
    const clickOscillator = context.createOscillator();
    const clickGain = context.createGain();
    const time = startAt + index * spacing;

    noiseSource.buffer = buffer;
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.setValueAtTime(950, time);
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.setValueAtTime(2150 - index * 45, time);
    bandpassFilter.Q.setValueAtTime(1.35, time);

    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.07, time + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.038);

    clickOscillator.type = 'square';
    clickOscillator.frequency.setValueAtTime(1820 - index * 35, time);
    clickOscillator.frequency.exponentialRampToValueAtTime(1180, time + 0.03);
    clickGain.gain.setValueAtTime(0.0001, time);
    clickGain.gain.exponentialRampToValueAtTime(0.014, time + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);

    noiseSource.connect(highpassFilter);
    highpassFilter.connect(bandpassFilter);
    bandpassFilter.connect(noiseGain);
    noiseGain.connect(context.destination);

    clickOscillator.connect(clickGain);
    clickGain.connect(context.destination);

    noiseSource.start(time);
    noiseSource.stop(time + 0.045);
    clickOscillator.start(time);
    clickOscillator.stop(time + 0.03);
  }
}

function playRevealSound() {
  if (playCustomSound()) return;
  playShakeSound(3, 0.06);
}

function pickFortune() {
  const weights = [20, 30, 32, 18];
  const total = weights.reduce((sum, item) => sum + item, 0);
  let cursor = Math.random() * total;
  for (let index = 0; index < FORTUNES.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return FORTUNES[index];
  }
  return FORTUNES[2];
}

function renderFortune(item) {
  gradeEl.textContent = item.grade;
  wealthEl.textContent = `财运指数 ${item.wealth}`;
  titleEl.textContent = item.title;
  summaryEl.textContent = item.summary;
  doEl.textContent = item.good;
  avoidEl.textContent = item.avoid;
  adviceEl.textContent = item.advice;
  resultEl.classList.remove('hidden');
}

function startDraw() {
  if (isDrawing) return;
  isDrawing = true;
  playShakeSound();
  resultEl.classList.add('hidden');
  drawBtn.classList.add('is-shaking');
  hintEl.textContent = '摇签中... 今日财运正在显现';
  window.setTimeout(() => {
    drawBtn.classList.remove('is-shaking');
    renderFortune(pickFortune());
    playRevealSound();
    hintEl.textContent = '今日财运已揭晓';
    isDrawing = false;
  }, 1100);
}

drawBtn?.addEventListener('click', startDraw);
retryBtn?.addEventListener('click', startDraw);
syncGameConfig();
window.addEventListener('game-config-ready', syncGameConfig);
window.addEventListener('claw800:tip-success', (event) => {
  if (String(event.detail?.gameSlug || '').trim() !== 'fortune') return;
  window.alert('谢谢打赏，您今天一定行大运发大财!');
});
