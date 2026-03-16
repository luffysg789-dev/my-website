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
  resultEl.classList.add('hidden');
  drawBtn.classList.add('is-shaking');
  hintEl.textContent = '摇签中... 今日财运正在显现';
  window.setTimeout(() => {
    drawBtn.classList.remove('is-shaking');
    renderFortune(pickFortune());
    hintEl.textContent = '今日财运已揭晓';
    isDrawing = false;
  }, 1100);
}

drawBtn?.addEventListener('click', startDraw);
retryBtn?.addEventListener('click', startDraw);
