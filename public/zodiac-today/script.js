const formEl = document.getElementById('zodiacForm');
const nameInputEl = document.getElementById('zodiacNameInput');
const birthdayInputEl = document.getElementById('zodiacBirthdayInput');
const hintEl = document.getElementById('zodiacHint');
const resultEl = document.getElementById('zodiacResult');
const signNameEl = document.getElementById('zodiacSignName');
const dateLabelEl = document.getElementById('zodiacDateLabel');
const scoreEl = document.getElementById('zodiacScore');
const summaryTitleEl = document.getElementById('zodiacSummaryTitle');
const summaryEl = document.getElementById('zodiacSummary');
const loveEl = document.getElementById('zodiacLove');
const careerEl = document.getElementById('zodiacCareer');
const wealthEl = document.getElementById('zodiacWealth');
const healthEl = document.getElementById('zodiacHealth');
const socialEl = document.getElementById('zodiacSocial');
const luckyColorEl = document.getElementById('zodiacLuckyColor');
const luckyNumberEl = document.getElementById('zodiacLuckyNumber');
const adviceEl = document.getElementById('zodiacAdvice');

const STORAGE_KEY = 'claw800_zodiac_today_state_v1';
const ZODIAC_SIGNS = [
  { name: '摩羯座', start: [1, 1], end: [1, 19] },
  { name: '水瓶座', start: [1, 20], end: [2, 18] },
  { name: '双鱼座', start: [2, 19], end: [3, 20] },
  { name: '白羊座', start: [3, 21], end: [4, 19] },
  { name: '金牛座', start: [4, 20], end: [5, 20] },
  { name: '双子座', start: [5, 21], end: [6, 21] },
  { name: '巨蟹座', start: [6, 22], end: [7, 22] },
  { name: '狮子座', start: [7, 23], end: [8, 22] },
  { name: '处女座', start: [8, 23], end: [9, 22] },
  { name: '天秤座', start: [9, 23], end: [10, 23] },
  { name: '天蝎座', start: [10, 24], end: [11, 22] },
  { name: '射手座', start: [11, 23], end: [12, 21] },
  { name: '摩羯座', start: [12, 22], end: [12, 31] }
];

const ANALYSIS_DIMENSIONS = [
  {
    key: 'love',
    leads: ['感情氛围更看重真诚表达，', '爱情运势偏向慢热推进，', '今天在关系里更适合柔软沟通，'],
    endings: ['主动一点会更容易收获回应。', '别急着定论，耐心会换来更稳的靠近。', '把情绪说清楚，比猜来猜去更有用。']
  },
  {
    key: 'career',
    leads: ['工作节奏适合先排优先级，', '事业线今天更吃准备度，', '今天在任务推进上贵在稳住节奏，'],
    endings: ['先把最关键的一步做实，后面会顺很多。', '别被临时消息打乱主线。', '越是提前整理，越容易得到认可。']
  },
  {
    key: 'wealth',
    leads: ['财运更偏向细水长流，', '今天的金钱运势重在判断力，', '资金相关的事适合先看风险再看收益，'],
    endings: ['守住预算比追求刺激更划算。', '小机会不少，但不必贪快。', '先管住冲动消费，财气会更稳。']
  },
  {
    key: 'health',
    leads: ['身体状态提醒你别透支，', '健康维度更适合回到规律，', '今天的能量管理是关键，'],
    endings: ['早点休息会直接拉高明天状态。', '饮食和作息一稳，整个人都会轻很多。', '别把小疲劳拖成大消耗。']
  },
  {
    key: 'social',
    leads: ['人际场域里你更容易被注意到，', '今天的社交运更适合轻松表达，', '与人互动时氛围偏向温和，'],
    endings: ['先给别人留空间，关系会更舒服。', '一句主动问候，往往比你想的更有效。', '少一点防备，会换来更多合作感。']
  }
];

const SIGN_SUMMARIES = {
  '白羊座': ['行动欲高，很适合先做再修正。', '今天的气场更偏主动，别把好状态浪费在犹豫里。'],
  '金牛座': ['稳定感是你的优势，慢一步反而更容易赢。', '今天适合把节奏拉稳，别被外界催着跑。'],
  '双子座': ['信息和灵感都不少，关键是别分心。', '今天的好运来自快速理解和轻巧表达。'],
  '巨蟹座': ['感受力很强，照顾好自己就能照顾好全局。', '今天更适合柔软推进，不必硬碰硬。'],
  '狮子座': ['舞台感在线，适合主动争取关注。', '今天你的一点自信，会带来成倍的推进力。'],
  '处女座': ['细节判断很准，今天适合把混乱理顺。', '你越认真整理，运势越容易往上走。'],
  '天秤座': ['平衡感是你的王牌，适合做协调与选择。', '今天最有价值的是温和但明确的表达。'],
  '天蝎座': ['直觉偏强，适合做深度判断。', '今天你更适合先看透，再出手。'],
  '射手座': ['想法活跃，行动力也在抬头。', '今天适合把热情放进具体行动里。'],
  '摩羯座': ['稳扎稳打会带来最实在的回报。', '今天的关键是别急，越稳越容易赢。'],
  '水瓶座': ['创意与观察力都在线，适合跳出旧框架。', '今天的新鲜想法，可能就是突破口。'],
  '双鱼座': ['感受细腻，适合用柔和方式达成目标。', '今天越懂得顺势，越能看到好结果。']
};

const TITLE_PATTERNS = [
  '今天气场明亮，适合主动行动',
  '节奏顺起来后，整天都会更稳',
  '越懂得取舍，今天越容易走顺',
  '今天适合把好运落到具体事情上'
];

const LUCKY_COLORS = ['琥珀橙', '海盐蓝', '月光白', '松石绿', '烟紫色', '暖杏色', '雾灰蓝', '珊瑚粉'];

function loadStoredProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

function getMonthDayParts(dateString) {
  const [year, month, day] = String(dateString || '').split('-').map((item) => Number(item) || 0);
  return { year, month, day };
}

function normalizeBirthdayInput(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return [year, month, day].filter(Boolean).join('-');
}

function isValidBirthday(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const { year, month, day } = getMonthDayParts(dateString);
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getZodiacSign(dateString) {
  const { month, day } = getMonthDayParts(dateString);
  return ZODIAC_SIGNS.find((sign) => {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;
    const afterStart = month > startMonth || (month === startMonth && day >= startDay);
    const beforeEnd = month < endMonth || (month === endMonth && day <= endDay);
    return afterStart && beforeEnd;
  }) || ZODIAC_SIGNS[0];
}

function createSeedFromProfile(name, birthday, todayKey) {
  const base = `${String(name || '').trim()}|${String(birthday || '').trim()}|${String(todayKey || '').trim()}`;
  let hash = 2166136261;
  for (const char of base) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function createSeededRandom(seed) {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pickOne(random, list) {
  return list[Math.floor(random() * list.length)] || list[0];
}

function buildDimensionText(random, dimension) {
  return `${pickOne(random, dimension.leads)}${pickOne(random, dimension.endings)}`;
}

function buildDailyReading(name, birthday) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const sign = getZodiacSign(birthday);
  const random = createSeededRandom(createSeedFromProfile(name, birthday, `${todayKey}-${Date.now()}`));
  const score = 68 + Math.floor(random() * 31);

  return {
    signName: sign.name,
    todayLabel: `${today.getMonth() + 1}月${today.getDate()}日`,
    score,
    title: pickOne(random, TITLE_PATTERNS),
    summary: `${pickOne(random, SIGN_SUMMARIES[sign.name] || SIGN_SUMMARIES['白羊座'])} ${String(name || '你').trim()}今天更适合先抓住最有把握的方向，再让好运慢慢放大。`,
    love: buildDimensionText(random, ANALYSIS_DIMENSIONS[0]),
    career: buildDimensionText(random, ANALYSIS_DIMENSIONS[1]),
    wealth: buildDimensionText(random, ANALYSIS_DIMENSIONS[2]),
    health: buildDimensionText(random, ANALYSIS_DIMENSIONS[3]),
    social: buildDimensionText(random, ANALYSIS_DIMENSIONS[4]),
    luckyColor: pickOne(random, LUCKY_COLORS),
    luckyNumber: `${1 + Math.floor(random() * 9)}`,
    advice: `${String(name || '你').trim()}今天最旺的方式，是先把最重要的一件事做完，再去接其他变化。`
  };
}

function renderReading(reading) {
  signNameEl.textContent = reading.signName;
  dateLabelEl.textContent = reading.todayLabel;
  scoreEl.textContent = `${reading.score}`;
  summaryTitleEl.textContent = reading.title;
  summaryEl.textContent = reading.summary;
  loveEl.textContent = reading.love;
  careerEl.textContent = reading.career;
  wealthEl.textContent = reading.wealth;
  healthEl.textContent = reading.health;
  socialEl.textContent = reading.social;
  luckyColorEl.textContent = reading.luckyColor;
  luckyNumberEl.textContent = `幸运数字 ${reading.luckyNumber}`;
  adviceEl.textContent = reading.advice;
  resultEl.classList.remove('hidden');
}

function handleSubmit(event) {
  event.preventDefault();
  const name = String(nameInputEl.value || '').trim();
  const birthday = normalizeBirthdayInput(birthdayInputEl.value);
  birthdayInputEl.value = birthday;
  if (!name || !birthday) {
    hintEl.textContent = '请先输入名字和完整阳历生日。';
    return;
  }
  if (!isValidBirthday(birthday)) {
    hintEl.textContent = '请输入正确生日，年份必须是四位，例如 1998-08-16。';
    return;
  }
  const reading = buildDailyReading(name, birthday);
  renderReading(reading);
  saveStoredProfile({ name, birthday });
  hintEl.textContent = `${name}，今天属于你的星座分析已经生成。`;
}

function restoreProfile() {
  const profile = loadStoredProfile();
  if (!profile) return;
  nameInputEl.value = String(profile.name || '').trim();
  birthdayInputEl.value = normalizeBirthdayInput(profile.birthday);
}

birthdayInputEl?.addEventListener('input', () => {
  birthdayInputEl.value = normalizeBirthdayInput(birthdayInputEl.value);
});

formEl?.addEventListener('submit', handleSubmit);
restoreProfile();
window.ClawGamesConfig?.bootstrapGamePage?.('zodiac-today');
