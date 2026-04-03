(function () {
  const BOARD_SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];

  const AI_LEVELS = {
    low: 'low',
    medium: 'medium',
    high: 'high'
  };

  const PATTERN_GROUPS = {
    five: ['11111'],
    openFour: ['011110'],
    closedFour: ['211110', '011112', '11110', '01111', '10111', '11011', '11101'],
    openThree: ['01110', '010110', '011010'],
    brokenThree: ['001110', '011100', '010101', '0100110', '0110010'],
    openTwo: ['00110', '01100', '01010', '010010']
  };

  const AI_PROFILES = {
    low: {
      attack: { five: 1000000, openFour: 80000, closedFour: 18000, openThree: 3200, brokenThree: 1200, openTwo: 260 },
      defense: 0.9,
      center: 14,
      nearby: 10
    },
    medium: {
      attack: { five: 1200000, openFour: 160000, closedFour: 42000, openThree: 12000, brokenThree: 4300, openTwo: 520 },
      defense: 1.25,
      center: 18,
      nearby: 14
    },
    high: {
      attack: { five: 1800000, openFour: 280000, closedFour: 96000, openThree: 26000, brokenThree: 9000, openTwo: 900 },
      defense: 1.7,
      center: 22,
      nearby: 16
    }
  };

  const ui = {
    board: document.getElementById('gomokuBoard'),
    startBtn: document.getElementById('gomokuBoardStartBtn'),
    restartBtn: document.getElementById('gomokuRestartBtn'),
    undoBtn: document.getElementById('gomokuUndoBtn'),
    setupBtn: document.getElementById('gomokuSetupBtn'),
    hint: document.getElementById('gomokuHint'),
    statusTitle: document.getElementById('gomokuStatusTitle'),
    modeBadge: document.getElementById('gomokuModeBadge'),
    difficultyBadge: document.getElementById('gomokuDifficultyBadge'),
    turnBadge: document.getElementById('gomokuTurnBadge'),
    boardOverlay: document.getElementById('gomokuBoardOverlay'),
    boardOverlayTitle: document.getElementById('gomokuBoardOverlayTitle'),
    boardOverlayText: document.getElementById('gomokuBoardOverlayText'),
    overlaySettings: document.getElementById('gomokuOverlaySettings'),
    overlayModeHuman: document.getElementById('gomokuOverlayModeHuman'),
    overlayModeAi: document.getElementById('gomokuOverlayModeAi'),
    modal: document.getElementById('gomokuModal'),
    modalTitle: document.getElementById('gomokuModalTitle'),
    modalMessage: document.getElementById('gomokuModalMessage'),
    modalRestartBtn: document.getElementById('gomokuModalRestartBtn'),
    modalCloseBtn: document.getElementById('gomokuModalCloseBtn')
  };

  if (!ui.board) {
    return;
  }

  const ctx = ui.board.getContext('2d');
  let canvasMetrics = null;
  let audioContext = null;

  const selections = {
    mode: 'ai',
    difficulty: 'medium',
    order: 'first'
  };

  const state = createState();

  function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function createState() {
    return {
      board: createEmptyBoard(),
      currentPlayer: BLACK,
      moveHistory: [],
      lastMove: null,
      winner: EMPTY,
      winningLine: [],
      isDraw: false,
      phase: 'idle',
      mode: 'ai',
      difficulty: 'medium',
      humanColor: BLACK,
      aiColor: WHITE,
      isAiThinking: false,
      aiTimer: null
    };
  }

  function otherPlayer(player) {
    return player === BLACK ? WHITE : BLACK;
  }

  function playerLabel(player) {
    return player === BLACK ? '黑棋' : '白棋';
  }

  function modeLabel(mode) {
    return mode === 'ai' ? '人机' : '真人';
  }

  function difficultyLabel(level) {
    return { low: '低级 AI', medium: '中级 AI', high: '高级 AI' }[level] || '中级 AI';
  }

  function updateChoiceButtons(group, value) {
    document.querySelectorAll(`[data-group="${group}"]`).forEach((button) => {
      const isActive = button.dataset.value === value;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function refreshSetupSummary() {
    updateChoiceButtons('mode', selections.mode);
    updateChoiceButtons('difficulty', selections.difficulty);
    updateChoiceButtons('order', selections.order);
    refreshBoardOverlay();
  }

  function refreshBoardOverlay() {
    if (state.phase === 'idle') {
      ui.boardOverlay.classList.remove('is-hidden');
      ui.boardOverlayTitle.textContent = '选择模式';
      ui.overlaySettings.classList.toggle('is-hidden', selections.mode !== 'ai');
      ui.boardOverlayText.textContent = selections.mode === 'ai'
        ? `当前默认人机对战，${difficultyLabel(selections.difficulty)}，${selections.order === 'first' ? '你执黑先手。' : '你执白后手。'}`
        : '当前默认真人对战，同屏轮流执黑白，点击开始后从黑棋先行。';
      return;
    }

    ui.boardOverlay.classList.add('is-hidden');
  }

  function resetRoundState() {
    state.board = createEmptyBoard();
    state.currentPlayer = BLACK;
    state.moveHistory = [];
    state.lastMove = null;
    state.winner = EMPTY;
    state.winningLine = [];
    state.isDraw = false;
    state.isAiThinking = false;
    clearAiTimer();
  }

  function clearAiTimer() {
    if (state.aiTimer) {
      window.clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }
  }

  function startGame() {
    resetRoundState();
    state.mode = selections.mode;
    state.difficulty = selections.difficulty;
    state.humanColor = selections.order === 'first' ? BLACK : WHITE;
    state.aiColor = otherPlayer(state.humanColor);
    state.phase = 'playing';
    hideModal();
    render();
    if (state.mode === 'ai' && state.currentPlayer === state.aiColor) {
      scheduleAiMove();
    }
  }

  // 悔棋时按“当前这局”的配置重建棋盘，避免误用尚未开局的新设置。
  function rebuildFromHistory(history) {
    const mode = state.mode;
    const difficulty = state.difficulty;
    const humanColor = state.humanColor;
    const aiColor = state.aiColor;

    resetRoundState();
    state.mode = mode;
    state.difficulty = difficulty;
    state.humanColor = humanColor;
    state.aiColor = aiColor;
    state.phase = 'playing';

    history.forEach((move) => {
      state.board[move.row][move.col] = move.player;
      state.moveHistory.push({ ...move });
      state.lastMove = { ...move };
      const winningLine = checkWinner(state.board, move.row, move.col, move.player);
      if (winningLine.length >= 5) {
        state.winner = move.player;
        state.winningLine = winningLine;
        state.phase = 'finished';
      }
    });

    if (state.phase !== 'finished' && state.moveHistory.length === BOARD_SIZE * BOARD_SIZE) {
      state.isDraw = true;
      state.phase = 'finished';
    }

    state.currentPlayer = state.moveHistory.length % 2 === 0 ? BLACK : WHITE;
  }

  function undoMove() {
    if (!state.moveHistory.length) return;

    const nextHistory = state.moveHistory.slice(
      0,
      state.mode === 'ai' ? Math.max(0, state.moveHistory.length - Math.min(2, state.moveHistory.length)) : state.moveHistory.length - 1
    );

    rebuildFromHistory(nextHistory);
    hideModal();
    render();

    if (state.mode === 'ai' && state.phase === 'playing' && state.currentPlayer === state.aiColor) {
      scheduleAiMove();
    }
  }

  function restartGame() {
    startGame();
  }

  function showResultModal(title, message) {
    ui.modalTitle.textContent = title;
    ui.modalMessage.textContent = message;
    ui.modal.classList.remove('is-hidden');
  }

  function hideModal() {
    ui.modal.classList.add('is-hidden');
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

  function playStoneSound(player) {
    const context = getAudioContext();
    if (!context) return;

    const startAt = context.currentTime + 0.01;
    const bodyOsc = context.createOscillator();
    const bodyGain = context.createGain();
    const clickOsc = context.createOscillator();
    const clickGain = context.createGain();
    const filter = context.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(player === BLACK ? 1080 : 1360, startAt);

    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(player === BLACK ? 460 : 580, startAt);
    bodyOsc.frequency.exponentialRampToValueAtTime(player === BLACK ? 220 : 290, startAt + 0.12);

    bodyGain.gain.setValueAtTime(0.0001, startAt);
    bodyGain.gain.exponentialRampToValueAtTime(0.085, startAt + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(player === BLACK ? 1380 : 1520, startAt);
    clickOsc.frequency.exponentialRampToValueAtTime(720, startAt + 0.03);

    clickGain.gain.setValueAtTime(0.0001, startAt);
    clickGain.gain.exponentialRampToValueAtTime(0.03, startAt + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.045);

    bodyOsc.connect(filter);
    filter.connect(bodyGain);
    bodyGain.connect(context.destination);
    clickOsc.connect(clickGain);
    clickGain.connect(context.destination);

    bodyOsc.start(startAt);
    bodyOsc.stop(startAt + 0.18);
    clickOsc.start(startAt);
    clickOsc.stop(startAt + 0.05);
  }

  function updateStatusText() {
    if (ui.modeBadge) {
      ui.modeBadge.textContent = modeLabel(state.mode);
    }
    ui.difficultyBadge.textContent = difficultyLabel(state.difficulty);
    ui.difficultyBadge.classList.toggle('is-hidden', state.mode !== 'ai');

    if (state.phase === 'idle') {
      ui.statusTitle.textContent = '等待';
      ui.turnBadge.textContent = '黑棋先行';
      ui.hint.textContent = '点击“开始游戏”后即可落子，形成五连即可获胜。';
      return;
    }

    if (state.phase === 'finished') {
      if (state.isDraw) {
        ui.statusTitle.textContent = '平局';
        ui.turnBadge.textContent = '平局';
        ui.hint.textContent = '本局已结束，点击“重开”可重新开始。';
      } else {
        ui.statusTitle.textContent = `${playerLabel(state.winner)}获胜`;
        ui.turnBadge.textContent = `${playerLabel(state.winner)}胜`;
        ui.hint.textContent = '本局已结束，棋盘已锁定。可重开或悔棋。';
      }
      return;
    }

    const turnText = playerLabel(state.currentPlayer);
    const aiTurn = state.mode === 'ai' && state.currentPlayer === state.aiColor;

    ui.statusTitle.textContent = aiTurn ? '电脑正在思考' : `${turnText}回合`;
    ui.turnBadge.textContent = aiTurn ? 'AI 思考中' : `${turnText}落子`;
    ui.hint.textContent = state.mode === 'ai'
      ? '人机模式下，悔棋会同时撤回你和电脑最近一步。'
      : '真人模式下可轮流点击棋盘，最近一步会以红圈标出。';
  }

  function resizeBoard() {
    const availableWidth = Math.min(ui.board.parentElement.clientWidth, 720);
    const displayWidth = Math.max(220, Math.floor(availableWidth));
    const pixelRatio = window.devicePixelRatio || 1;
    ui.board.width = Math.round(displayWidth * pixelRatio);
    ui.board.height = Math.round(displayWidth * pixelRatio);
    ui.board.style.height = `${displayWidth}px`;
    ui.board.style.width = `${displayWidth}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const size = displayWidth;
    const padding = Math.round(size * 0.085);
    const cellSize = (size - padding * 2) / (BOARD_SIZE - 1);

    canvasMetrics = {
      size,
      padding,
      cellSize
    };

    drawBoard();
  }

  function getPointPosition(row, col) {
    return {
      x: canvasMetrics.padding + col * canvasMetrics.cellSize,
      y: canvasMetrics.padding + row * canvasMetrics.cellSize
    };
  }

  function drawBoard() {
    if (!canvasMetrics) return;

    const { size, padding, cellSize } = canvasMetrics;
    ctx.clearRect(0, 0, size, size);

    const boardGradient = ctx.createLinearGradient(0, 0, 0, size);
    boardGradient.addColorStop(0, '#e0b06a');
    boardGradient.addColorStop(1, '#be8648');
    ctx.fillStyle = boardGradient;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(86, 53, 19, 0.64)';
    ctx.lineWidth = 1;
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const offset = padding + index * cellSize;
      ctx.beginPath();
      ctx.moveTo(padding, offset);
      ctx.lineTo(size - padding, offset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offset, padding);
      ctx.lineTo(offset, size - padding);
      ctx.stroke();
    }

    [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([row, col]) => {
      const point = getPointPosition(row, col);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(74, 45, 17, 0.76)';
      ctx.arc(point.x, point.y, Math.max(3.2, cellSize * 0.09), 0, Math.PI * 2);
      ctx.fill();
    });

    drawWinningLine();
    drawStones();
  }

  function drawWinningLine() {
    if (state.winningLine.length < 5) return;

    const start = getPointPosition(state.winningLine[0].row, state.winningLine[0].col);
    const end = getPointPosition(
      state.winningLine[state.winningLine.length - 1].row,
      state.winningLine[state.winningLine.length - 1].col
    );

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(204, 44, 44, 0.88)';
    ctx.lineWidth = Math.max(4, canvasMetrics.cellSize * 0.14);
    ctx.lineCap = 'round';
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  function drawStones() {
    const radius = canvasMetrics.cellSize * 0.42;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = state.board[row][col];
        if (!cell) continue;

        const point = getPointPosition(row, col);
        const gradient = ctx.createRadialGradient(
          point.x - radius * 0.34,
          point.y - radius * 0.34,
          radius * 0.15,
          point.x,
          point.y,
          radius
        );

        if (cell === BLACK) {
          gradient.addColorStop(0, '#6e655d');
          gradient.addColorStop(1, '#171412');
        } else {
          gradient.addColorStop(0, '#fffdf8');
          gradient.addColorStop(1, '#d9d2ca');
        }

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(40, 24, 8, 0.25)';
        ctx.shadowBlur = 8;
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (state.lastMove && state.lastMove.row === row && state.lastMove.col === col) {
          ctx.beginPath();
          ctx.strokeStyle = cell === BLACK ? '#ffd45d' : '#d0462c';
          ctx.lineWidth = Math.max(2, canvasMetrics.cellSize * 0.08);
          ctx.arc(point.x, point.y, radius * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  function getCellFromPointer(event) {
    if (!canvasMetrics) return null;
    const rect = ui.board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.round((x - canvasMetrics.padding) / canvasMetrics.cellSize);
    const row = Math.round((y - canvasMetrics.padding) / canvasMetrics.cellSize);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null;
    }

    const point = getPointPosition(row, col);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance > canvasMetrics.cellSize * 0.48) {
      return null;
    }

    return { row, col };
  }

  function handleBoardPointer(event) {
    if (state.phase !== 'playing') return;
    if (state.isAiThinking) return;
    if (state.mode === 'ai' && state.currentPlayer === state.aiColor) return;

    const cell = getCellFromPointer(event);
    if (!cell) return;

    placeMove(cell.row, cell.col, state.currentPlayer);
  }

  function placeMove(row, col, player) {
    if (state.phase !== 'playing') return false;
    if (state.board[row][col] !== EMPTY) return false;

    state.board[row][col] = player;
    const move = { row, col, player };
    state.moveHistory.push(move);
    state.lastMove = move;
    playStoneSound(player);

    const winningLine = checkWinner(state.board, row, col, player);
    if (winningLine.length >= 5) {
      state.winner = player;
      state.winningLine = winningLine;
      state.phase = 'finished';
      render();
      showResultModal(`${playerLabel(player)}获胜`, `${playerLabel(player)}已经连成五子，本局结束。`);
      return true;
    }

    if (state.moveHistory.length === BOARD_SIZE * BOARD_SIZE) {
      state.isDraw = true;
      state.phase = 'finished';
      render();
      showResultModal('本局平局', '棋盘已满，双方都没有形成五连。');
      return true;
    }

    state.currentPlayer = otherPlayer(player);
    render();

    if (state.mode === 'ai' && state.currentPlayer === state.aiColor) {
      scheduleAiMove();
    }

    return true;
  }

  // 仅从最后一步向四个方向扩展，快速判断是否已经形成五连。
  function checkWinner(board, row, col, player) {
    for (const [dx, dy] of DIRECTIONS) {
      const line = [{ row, col }];
      line.push(...collectDirection(board, row, col, player, dx, dy));
      line.unshift(...collectDirection(board, row, col, player, -dx, -dy).reverse());
      if (line.length >= 5) {
        return line;
      }
    }
    return [];
  }

  function collectDirection(board, row, col, player, dx, dy) {
    const cells = [];
    let nextRow = row + dx;
    let nextCol = col + dy;

    while (isInside(nextRow, nextCol) && board[nextRow][nextCol] === player) {
      cells.push({ row: nextRow, col: nextCol });
      nextRow += dx;
      nextCol += dy;
    }

    return cells;
  }

  function isInside(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function scheduleAiMove() {
    state.isAiThinking = true;
    render();
    clearAiTimer();

    state.aiTimer = window.setTimeout(() => {
      state.isAiThinking = false;
      const move = chooseAiMove(state.board, state.aiColor, state.difficulty);
      if (move) {
        placeMove(move.row, move.col, state.aiColor);
      } else {
        render();
      }
    }, 320);
  }

  // AI 入口：低级偏随机，中级偏规则，高级使用综合评分。
  function chooseAiMove(board, aiColor, level) {
    const candidates = getCandidateMoves(board);
    const opponent = otherPlayer(aiColor);

    if (!candidates.length) {
      return { row: 7, col: 7 };
    }

    const winNow = findImmediateWinningMove(board, candidates, aiColor);
    if (winNow) return winNow;

    const mustBlock = findImmediateWinningMove(board, candidates, opponent);
    if (mustBlock) return mustBlock;

    if (level === AI_LEVELS.low) {
      return chooseLowMove(board, candidates, aiColor, opponent);
    }

    if (level === AI_LEVELS.medium) {
      const criticalAttack = findFeatureMove(board, candidates, aiColor, (counts) => counts.openFour || counts.closedFour);
      if (criticalAttack) return criticalAttack;

      const criticalDefense = findFeatureMove(
        board,
        candidates,
        opponent,
        (counts) => counts.openFour || counts.closedFour || counts.openThree
      );
      if (criticalDefense) return criticalDefense;
    }

    return chooseScoredMove(board, candidates, aiColor, level);
  }

  function chooseLowMove(board, candidates, aiColor, opponent) {
    const weighted = candidates.map((move) => ({
      ...move,
      attack: evaluateMove(board, move.row, move.col, aiColor, AI_PROFILES.low).score,
      defense: evaluateMove(board, move.row, move.col, opponent, AI_PROFILES.low).score
    }));

    weighted.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));

    if (weighted[0] && weighted[0].defense > 3000 && Math.random() < 0.45) {
      return weighted[0];
    }

    const pool = weighted.slice(0, Math.min(8, weighted.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function chooseScoredMove(board, candidates, aiColor, level) {
    const profile = AI_PROFILES[level] || AI_PROFILES.medium;
    const opponent = otherPlayer(aiColor);
    const center = (BOARD_SIZE - 1) / 2;

    const ranked = candidates.map((move) => {
      const attack = evaluateMove(board, move.row, move.col, aiColor, profile);
      const defense = evaluateMove(board, move.row, move.col, opponent, profile);
      const centerBias = (BOARD_SIZE - (Math.abs(move.row - center) + Math.abs(move.col - center))) * profile.center;
      const nearby = countNearbyStones(board, move.row, move.col) * profile.nearby;
      const total = attack.score + defense.score * profile.defense + centerBias + nearby;

      return {
        ...move,
        total,
        attackScore: attack.score,
        defenseScore: defense.score
      };
    });

    ranked.sort((a, b) => b.total - a.total || b.defenseScore - a.defenseScore || b.attackScore - a.attackScore);
    const topScore = ranked[0]?.total ?? 0;
    const finalists = ranked.filter((move) => topScore - move.total < 180);
    return finalists[Math.floor(Math.random() * finalists.length)] || ranked[0];
  }

  function countNearbyStones(board, row, col) {
    let total = 0;
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        if (!dr && !dc) continue;
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (isInside(nextRow, nextCol) && board[nextRow][nextCol] !== EMPTY) {
          total += 1;
        }
      }
    }
    return total;
  }

  function findImmediateWinningMove(board, candidates, player) {
    return candidates.find((move) => wouldWin(board, move.row, move.col, player)) || null;
  }

  function wouldWin(board, row, col, player) {
    if (board[row][col] !== EMPTY) return false;
    board[row][col] = player;
    const winning = checkWinner(board, row, col, player).length >= 5;
    board[row][col] = EMPTY;
    return winning;
  }

  function findFeatureMove(board, candidates, player, matcher) {
    let bestMove = null;
    let bestScore = -1;

    candidates.forEach((move) => {
      const evaluation = evaluateMove(board, move.row, move.col, player, AI_PROFILES.medium);
      if (!matcher(evaluation.counts)) return;
      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        bestMove = move;
      }
    });

    return bestMove;
  }

  function getCandidateMoves(board) {
    const moves = [];
    const seen = new Set();

    if (!state.moveHistory.length) {
      return [{ row: 7, col: 7 }];
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] === EMPTY) continue;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const nextRow = row + dr;
            const nextCol = col + dc;
            if (!isInside(nextRow, nextCol) || board[nextRow][nextCol] !== EMPTY) continue;
            const key = `${nextRow}:${nextCol}`;
            if (seen.has(key)) continue;
            seen.add(key);
            moves.push({ row: nextRow, col: nextCol });
          }
        }
      }
    }

    return moves;
  }

  // 将落点映射为可升级的模式分数，便于后续继续强化 AI。
  function evaluateMove(board, row, col, player, profile) {
    if (board[row][col] !== EMPTY) {
      return { score: -Infinity, counts: emptyPatternCounts() };
    }

    const counts = emptyPatternCounts();

    DIRECTIONS.forEach(([dx, dy]) => {
      const line = buildLineString(board, row, col, dx, dy, player);
      for (const [name, patterns] of Object.entries(PATTERN_GROUPS)) {
        counts[name] += patterns.reduce((sum, pattern) => sum + countPattern(line, pattern), 0);
      }
    });

    const score = Object.entries(profile.attack).reduce((sum, [name, weight]) => sum + counts[name] * weight, 0);
    return { score, counts };
  }

  function emptyPatternCounts() {
    return {
      five: 0,
      openFour: 0,
      closedFour: 0,
      openThree: 0,
      brokenThree: 0,
      openTwo: 0
    };
  }

  function buildLineString(board, row, col, dx, dy, player) {
    const chars = [];

    for (let step = -5; step <= 5; step += 1) {
      const nextRow = row + dx * step;
      const nextCol = col + dy * step;

      if (step === 0) {
        chars.push('1');
      } else if (!isInside(nextRow, nextCol)) {
        chars.push('2');
      } else if (board[nextRow][nextCol] === EMPTY) {
        chars.push('0');
      } else if (board[nextRow][nextCol] === player) {
        chars.push('1');
      } else {
        chars.push('2');
      }
    }

    return chars.join('');
  }

  function countPattern(line, pattern) {
    const regex = new RegExp(`(?=${pattern})`, 'g');
    return [...line.matchAll(regex)].length;
  }

  function render() {
    updateStatusText();
    refreshBoardOverlay();
    drawBoard();
    ui.undoBtn.disabled = !state.moveHistory.length || state.isAiThinking;
    ui.restartBtn.disabled = state.phase === 'idle';
  }

  function bindEvents() {
        document.querySelectorAll('.gomoku-choice').forEach((button) => {
          button.addEventListener('click', () => {
            const group = button.dataset.group;
            const value = button.dataset.value;
            if (!group || !value) return;
            selections[group] = value;
            refreshSetupSummary();
          });
        });

        ui.startBtn.addEventListener('click', startGame);
        ui.restartBtn.addEventListener('click', restartGame);
    ui.undoBtn.addEventListener('click', undoMove);
    ui.setupBtn.addEventListener('click', () => {
      resetRoundState();
      state.phase = 'idle';
      hideModal();
      render();
    });
    ui.modalRestartBtn.addEventListener('click', () => {
      hideModal();
      startGame();
    });
    ui.modalCloseBtn.addEventListener('click', hideModal);
    ui.modal.addEventListener('click', (event) => {
      if (event.target === ui.modal) {
        hideModal();
      }
    });

    ui.board.addEventListener('pointerdown', handleBoardPointer);
    window.addEventListener('resize', resizeBoard);
  }

  refreshSetupSummary();
  bindEvents();
  resizeBoard();
  render();
})();
