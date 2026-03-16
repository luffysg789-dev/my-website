const boardEl = document.getElementById('minesweeperBoard');
const mineCountEl = document.getElementById('mineCount');
const timerCountEl = document.getElementById('timerCount');
const gameStatusEl = document.getElementById('gameStatus');
const resetGameBtn = document.getElementById('resetGameBtn');
const flagModeBtn = document.getElementById('flagModeBtn');
const difficultyButtons = document.getElementById('difficultyButtons');

const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 14, cols: 14, mines: 28 },
  expert: { rows: 18, cols: 18, mines: 50 }
};

let currentLevel = 'beginner';
let cells = [];
let firstMove = true;
let gameOver = false;
let revealedCount = 0;
let flagMode = false;
let timer = 0;
let timerHandle = null;
let audioCtx = null;

function getAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', gainValue = 0.03) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const startAt = ctx.currentTime;
  const endAt = startAt + duration;
  gain.gain.setValueAtTime(gainValue, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
  oscillator.start(startAt);
  oscillator.stop(endAt);
}

function playRevealSound() {
  playTone(540, 0.08, 'triangle', 0.025);
}

function playFlagSound() {
  playTone(720, 0.06, 'square', 0.02);
}

function playLoseSound() {
  playTone(180, 0.18, 'sawtooth', 0.05);
  window.setTimeout(() => playTone(120, 0.25, 'sawtooth', 0.045), 80);
}

function playWinSound() {
  playTone(660, 0.08, 'triangle', 0.03);
  window.setTimeout(() => playTone(860, 0.1, 'triangle', 0.03), 90);
  window.setTimeout(() => playTone(1120, 0.14, 'triangle', 0.03), 200);
}

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0
    }))
  );
}

function getLevel() {
  return LEVELS[currentLevel];
}

function neighbors(row, col) {
  const around = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (!rowOffset && !colOffset) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (cells[nextRow]?.[nextCol]) around.push(cells[nextRow][nextCol]);
    }
  }
  return around;
}

function placeMines(safeRow, safeCol) {
  const { rows, cols, mines } = getLevel();
  const blocked = new Set(
    [cells[safeRow][safeCol], ...neighbors(safeRow, safeCol)].map((cell) => `${cell.row}:${cell.col}`)
  );
  const positions = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!blocked.has(`${row}:${col}`)) positions.push(cells[row][col]);
    }
  }
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
  }
  positions.slice(0, mines).forEach((cell) => {
    cell.mine = true;
  });
  cells.flat().forEach((cell) => {
    cell.adjacent = neighbors(cell.row, cell.col).filter((item) => item.mine).length;
  });
}

function startTimer() {
  if (timerHandle) return;
  timerHandle = window.setInterval(() => {
    timer += 1;
    timerCountEl.textContent = `${timer}s`;
  }, 1000);
}

function stopTimer() {
  if (!timerHandle) return;
  window.clearInterval(timerHandle);
  timerHandle = null;
}

function remainingMines() {
  return getLevel().mines - cells.flat().filter((cell) => cell.flagged).length;
}

function updateStats() {
  mineCountEl.textContent = String(remainingMines());
  timerCountEl.textContent = `${timer}s`;
}

function setStatus(text) {
  gameStatusEl.textContent = text;
}

function toggleFlagMode() {
  flagMode = !flagMode;
  flagModeBtn.textContent = `插旗模式：${flagMode ? '开' : '关'}`;
  flagModeBtn.classList.toggle('active', flagMode);
}

function revealCell(cell) {
  if (cell.revealed || cell.flagged || gameOver) return;
  cell.revealed = true;
  revealedCount += 1;
  if (cell.mine) {
    gameOver = true;
    stopTimer();
    setStatus('踩雷了');
    playLoseSound();
    cells.flat().forEach((item) => {
      if (item.mine) item.revealed = true;
    });
    return;
  }
  playRevealSound();
  if (cell.adjacent === 0) {
    neighbors(cell.row, cell.col).forEach((item) => {
      if (!item.revealed) revealCell(item);
    });
  }
  const safeCells = getLevel().rows * getLevel().cols - getLevel().mines;
  if (revealedCount >= safeCells) {
    gameOver = true;
    stopTimer();
    setStatus('你赢了');
    playWinSound();
    cells.flat().forEach((item) => {
      if (item.mine) item.flagged = true;
    });
  }
}

function toggleFlag(cell) {
  if (cell.revealed || gameOver) return;
  cell.flagged = !cell.flagged;
  playFlagSound();
}

function handleCellAction(cell, useFlagMode = flagMode) {
  if (gameOver) return;
  if (firstMove) {
    placeMines(cell.row, cell.col);
    firstMove = false;
    startTimer();
    setStatus('进行中');
  }
  if (useFlagMode) toggleFlag(cell);
  else revealCell(cell);
  updateStats();
  renderBoard();
}

function getCellSize() {
  const { cols } = getLevel();
  const wrapWidth = boardEl?.parentElement?.clientWidth || 0;
  const viewportWidth = window.innerWidth || 390;
  const availableWidth = Math.max(wrapWidth || viewportWidth - 32, viewportWidth - 32);
  const gapTotal = (cols - 1) * 4;
  const innerWidth = Math.max(availableWidth - gapTotal, 180);
  const maxSize = viewportWidth <= 480 ? 44 : 40;
  return Math.max(20, Math.min(maxSize, Math.floor(innerWidth / cols)));
}

function renderBoard() {
  const { cols } = getLevel();
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--cell-size', `${getCellSize()}px`);
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
  const fragment = document.createDocumentFragment();
  cells.flat().forEach((cell) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mine-cell';
    if (cell.revealed) button.classList.add('is-revealed');
    if (cell.flagged) button.classList.add('is-flagged');
    if (cell.mine && cell.revealed) button.classList.add('is-mine');
    if (cell.revealed) {
      if (cell.mine) button.textContent = '💣';
      else if (cell.adjacent > 0) button.textContent = String(cell.adjacent);
    } else if (cell.flagged) {
      button.textContent = '❤';
    }
    button.addEventListener('click', () => handleCellAction(cell));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      handleCellAction(cell, true);
    });
    fragment.appendChild(button);
  });
  boardEl.appendChild(fragment);
}

function resetGame(nextLevel = currentLevel) {
  currentLevel = nextLevel;
  const level = getLevel();
  cells = createEmptyBoard(level.rows, level.cols);
  firstMove = true;
  gameOver = false;
  revealedCount = 0;
  timer = 0;
  stopTimer();
  difficultyButtons.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.level === currentLevel);
  });
  updateStats();
  setStatus('准备开始');
  renderBoard();
}

resetGame();

resetGameBtn?.addEventListener('click', () => resetGame());
flagModeBtn?.addEventListener('click', toggleFlagMode);
difficultyButtons?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-level]');
  if (!button) return;
  resetGame(button.dataset.level);
});
window.addEventListener('resize', renderBoard);
