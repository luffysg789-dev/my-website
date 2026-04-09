(function bootstrapSbti() {
  if (typeof window !== 'undefined' && window.ClawGamesConfig && typeof window.ClawGamesConfig.bootstrapGamePage === 'function') {
    window.ClawGamesConfig.bootstrapGamePage('sbti');
  }

  const SBTI_QUESTIONS = [
    { id: 'q01', dim: 'S', reverse: false, text: '刚进一个新群聊时，你通常会先观察一下氛围，再决定怎么发言。' },
    { id: 'q02', dim: 'C', reverse: false, text: '面对很热闹的活动，你更容易被现场情绪带着走。' },
    { id: 'q03', dim: 'B', reverse: false, text: '做决定时，你常常先看整体机会，再处理细节。' },
    { id: 'q04', dim: 'A', reverse: false, text: '你更喜欢按规则和清单把事情一项项落实。' },
    { id: 'q05', dim: 'T', reverse: false, text: '别人来找你商量问题时，你会优先分析最有效的做法。' },
    { id: 'q06', dim: 'F', reverse: false, text: '你很在意自己的表达会不会让别人不舒服。' },
    { id: 'q07', dim: 'I', reverse: false, text: '有好点子时，你通常会马上动手试一版。' },
    { id: 'q08', dim: 'O', reverse: false, text: '你习惯先多看几种可能，再决定要不要开始。' },
    { id: 'q09', dim: 'S', reverse: false, text: '在陌生环境里，你更容易先保留一点距离感。' },
    { id: 'q10', dim: 'C', reverse: false, text: '聚会里如果气氛冷掉了，你愿意主动把场子暖起来。' },
    { id: 'q11', dim: 'B', reverse: false, text: '你对未来的方向感，往往比对眼前琐事更敏锐。' },
    { id: 'q12', dim: 'A', reverse: false, text: '你会反复核对重要步骤，避免小失误拖后腿。' },
    { id: 'q13', dim: 'T', reverse: false, text: '你能在压力下快速切掉无关情绪，只看结果。' },
    { id: 'q14', dim: 'F', reverse: false, text: '如果关系会因此受影响，你宁愿慢一点也不想太强硬。' },
    { id: 'q15', dim: 'I', reverse: false, text: '你喜欢边走边修正，而不是把所有计划都想完再开始。' },
    { id: 'q16', dim: 'O', reverse: false, text: '你觉得“再等等看”常常比马上行动更稳妥。' },
    { id: 'q17', dim: 'S', reverse: false, text: '你恢复能量最有效的方法，是先一个人安静一下。' },
    { id: 'q18', dim: 'C', reverse: false, text: '你在集体里通常是那个容易被大家注意到的人。' },
    { id: 'q19', dim: 'B', reverse: false, text: '你常从一句话、一件事里联想到更大的趋势。' },
    { id: 'q20', dim: 'A', reverse: false, text: '你会把复杂问题拆成很具体的小任务去做。' },
    { id: 'q21', dim: 'T', reverse: false, text: '你更相信清晰标准，而不是“差不多就行”的感觉。' },
    { id: 'q22', dim: 'F', reverse: false, text: '你会记得别人随口提过的小情绪和小偏好。' },
    { id: 'q23', dim: 'I', reverse: false, text: '你对新项目最有劲的时候，就是刚开始那几步。' },
    { id: 'q24', dim: 'O', reverse: false, text: '在没摸清信息前，你不喜欢太早表态。' },
    { id: 'q25', dim: 'S', reverse: false, text: '你宁愿深聊几个信得过的人，也不想广泛社交。' },
    { id: 'q26', dim: 'C', reverse: false, text: '你很享受在多人场景里表达、连接和带节奏。' },
    { id: 'q27', dim: 'B', reverse: false, text: '你容易被“这个东西以后会变成什么”吸引。' },
    { id: 'q28', dim: 'A', reverse: false, text: '你更相信当下的数据、流程和证据。' },
    { id: 'q29', dim: 'T', reverse: false, text: '你做决定时，通常先问“这样做值不值得”。' },
    { id: 'q30', dim: 'F', reverse: false, text: '你做决定时，也会认真考虑“别人会怎么感受”。' },
    { id: 'q31', dim: 'I', reverse: false, text: '你觉得“先开始再优化”通常比“再准备一下”更有效。' }
  ];

  const SBTI_TYPES = {
    SBTI: {
      name: '稳进策士',
      summary: '你偏向先观察、再判断，做事克制而稳。适合需要节奏控制和耐心判断的场景。',
      aura: '别人会觉得你看起来不喧哗，但做事靠谱，有自己的标准，关键时刻不会乱。',
      tips: ['先把高质量判断保留下来，再刻意多一点输出。', '当你确认方向正确时，别让犹豫拖慢行动。']
    },
    SBTO: {
      name: '稳感观察者',
      summary: '你保留、细腻，也愿意给自己留出更多余量。适合处理复杂关系与模糊局面。',
      aura: '你会给人一种安静、细致、很会看场面的感觉，容易被当成稳妥的人。',
      tips: ['重要机会来时，适当缩短观察期。', '把你的判断更明确地说出来，会减少被低估的可能。']
    },
    SBFI: {
      name: '温柔执行者',
      summary: '你既顾及感受，也不缺行动力，适合在关系和效率之间找平衡。',
      aura: '别人通常会感觉你既不冷，也不乱，推进事情时让人比较安心。',
      tips: ['注意别替所有人都承担情绪。', '当目标明确时，允许自己更果断一点。']
    },
    SBFO: {
      name: '细腻守望者',
      summary: '你对关系和氛围特别敏感，适合需要耐心、照顾和观察的合作场景。',
      aura: '你让人感觉温和、懂分寸、不轻易越界，是很难得的关系型选手。',
      tips: ['学会把自己的需要说得更直接。', '在关键节点建立明确边界，会更省力。']
    },
    SATI: {
      name: '冷静掌控者',
      summary: '你做事讲结构、讲效率，也具备快速推进的能力，是天然的推进手。',
      aura: '别人会觉得你脑子清、反应快、能把复杂局面快速收束。',
      tips: ['推进很强时，也别忽略团队情绪。', '重大决策前留一点时间复盘，会更稳。']
    },
    SATO: {
      name: '理性布局者',
      summary: '你擅长判断、观察和布局，适合做长线规划与风险控制。',
      aura: '你给人的感觉偏冷静克制，但很值得托付重要判断。',
      tips: ['别让完备主义压住起步速度。', '在关键表达上再主动一点，影响力会更大。']
    },
    SAFI: {
      name: '温和推动者',
      summary: '你能兼顾规则、关系和执行，是团队里很有实操感的协作者。',
      aura: '别人会觉得你懂流程，也懂人，做事不飘，合作体验很顺。',
      tips: ['把能量优先留给真正重要的人和事。', '不要因为想照顾所有人而拖慢决定。']
    },
    SAFO: {
      name: '秩序疗愈者',
      summary: '你喜欢把局面整理清楚，也愿意给关系留余地，是细水长流型选手。',
      aura: '你让人感觉温和、耐心、很会兜底，适合稳定长期合作。',
      tips: ['适时表达立场，不必总是让自己退后。', '别把所有责任都悄悄揽到自己身上。']
    },
    CBTI: {
      name: '社交策动者',
      summary: '你会表达、能判断、也敢落地，适合高节奏和多人协作的场景。',
      aura: '你自带推进感和存在感，别人容易把你视为带头的人。',
      tips: ['在高能量输出时，也记得给他人一点缓冲空间。', '让节奏和复盘并行，爆发力会更持久。']
    },
    CBTO: {
      name: '全局操盘手',
      summary: '你既擅长感知现场，也能抽离看盘面，是擅长把握时机的人。',
      aura: '你会给人一种有想法、有场域感、又不轻易失控的强势印象。',
      tips: ['别因为看得太多而推迟关键动作。', '有些重要关系，需要你更柔和地表达标准。']
    },
    CBFI: {
      name: '热场连接者',
      summary: '你既会照顾情绪，也有实际行动，是典型的人群链接型人格。',
      aura: '别人通常觉得你很会带氛围，且不会只是嘴上热闹。',
      tips: ['把情绪感染力和优先级管理配套起来。', '学会让一部分事“不由你来扛”。']
    },
    CBFO: {
      name: '氛围观察家',
      summary: '你对群体氛围和个体情绪都很敏感，适合做桥梁型角色。',
      aura: '你给人亲切、会感受人、很懂场面进退的印象。',
      tips: ['需要决定时，别把所有变量都等明白。', '当你有判断时，要练习更坚定地说出来。']
    },
    CATI: {
      name: '高效开拓者',
      summary: '你善表达、守结构、行动快，天然适合打头阵和搭框架。',
      aura: '别人会觉得你有组织力、有气场，而且不拖泥带水。',
      tips: ['速度很快时，记得预留一点对齐时间。', '把标准说清楚，能减少很多摩擦。']
    },
    CATO: {
      name: '策略前锋',
      summary: '你在社交场里也能保持判断，非常适合做前排沟通与整体布局。',
      aura: '你给人感觉能说能控场，同时脑子里一直在盘整体。',
      tips: ['重要节点上别只顾看局，也要及时落子。', '让他人看到你的方法论，会更容易赢得信任。']
    },
    CAFI: {
      name: '活力协作者',
      summary: '你善于推进，也很会照顾现场，是团队里典型的连接与执行双强。',
      aura: '别人会感觉你热情、靠谱、会照顾人，还能把事往前推。',
      tips: ['注意把自己的精力留给高优先级关系。', '别因为太会配合而压住自己的主张。']
    },
    CAFO: {
      name: '温暖组织者',
      summary: '你擅长把场子和关系慢慢理顺，是很有稳定价值的连接型人物。',
      aura: '你给人感觉舒服、耐心、很会处理复杂关系，适合慢慢赢。',
      tips: ['在需要冲刺时，允许自己先行动再补齐。', '当你累了，也需要明确地说“不”。']
    }
  };

  const answerValues = [
    { value: 1, code: 'A', label: '确实' },
    { value: 3, code: 'B', label: '有时' },
    { value: 5, code: 'C', label: '不是' }
  ];

  const state = {
    answers: {},
    currentScreen: 'intro',
    currentResult: null
  };

  const introScreen = document.getElementById('sbtiIntroScreen');
  const testScreen = document.getElementById('sbtiTestScreen');
  const resultScreen = document.getElementById('sbtiResultScreen');
  const questionList = document.getElementById('sbtiQuestionList');
  const progressBar = document.getElementById('sbtiProgressBar');
  const progressText = document.getElementById('sbtiProgressText');
  const submitButton = document.getElementById('sbtiSubmitButton');
  const backButton = document.getElementById('sbtiBackButton');
  const resultCode = document.getElementById('sbtiResultCode');
  const resultName = document.getElementById('sbtiResultName');
  const resultSummary = document.getElementById('sbtiResultSummary');
  const resultAura = document.getElementById('sbtiResultAura');
  const resultGrid = document.getElementById('sbtiResultGrid');
  const resultTips = document.getElementById('sbtiResultTips');

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showScreen(screen) {
    state.currentScreen = screen;
    introScreen.hidden = screen !== 'intro';
    testScreen.hidden = screen !== 'test';
    resultScreen.hidden = screen !== 'result';
  }

  function renderSbtiQuestions() {
    questionList.innerHTML = SBTI_QUESTIONS.map((question, index) => {
      const options = answerValues.map((item) => {
        const checked = state.answers[question.id] === item.value;
        return `
          <label class="sbti-option${checked ? ' is-selected' : ''}" data-question-option data-question-id="${question.id}" data-value="${item.value}">
            <input type="radio" name="${question.id}" value="${item.value}" ${checked ? 'checked' : ''} />
            <span class="sbti-option__radio" aria-hidden="true"></span>
            <span class="sbti-option__value">${item.code}</span>
            <span class="sbti-option__label">${item.label}</span>
          </label>
        `;
      }).join('');
      return `
        <article class="sbti-question-card">
          <div class="sbti-question-card__meta">
            <div class="sbti-question-card__index">第 ${index + 1} 题</div>
            <div class="sbti-question-card__hint">维度已隐藏</div>
          </div>
          <h3 class="sbti-question-card__title">${escapeHtml(question.text)}</h3>
          <div class="sbti-option-row">${options}</div>
        </article>
      `;
    }).join('');
  }

  function updateSbtiProgress() {
    const answeredCount = Object.keys(state.answers).length;
    const percent = (answeredCount / SBTI_QUESTIONS.length) * 100;
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${answeredCount} / ${SBTI_QUESTIONS.length}`;
    submitButton.disabled = answeredCount !== SBTI_QUESTIONS.length;
  }

  function computeSbtiResult() {
    const dims = {
      S: 0,
      C: 0,
      B: 0,
      A: 0,
      T: 0,
      F: 0,
      I: 0,
      O: 0
    };

    SBTI_QUESTIONS.forEach((question) => {
      const answer = Number(state.answers[question.id] || 3);
      const weight = question.reverse ? 6 - answer : answer;
      dims[question.dim] += weight;
    });

    const code = [
      dims.S >= dims.C ? 'S' : 'C',
      dims.B >= dims.A ? 'B' : 'A',
      dims.T >= dims.F ? 'T' : 'F',
      dims.I >= dims.O ? 'I' : 'O'
    ].join('');

    return {
      code,
      dims,
      profile: SBTI_TYPES[code] || SBTI_TYPES.SBTI
    };
  }

  function formatAxisResult(leftKey, rightKey, leftLabel, rightLabel, dims) {
    const leftValue = dims[leftKey];
    const rightValue = dims[rightKey];
    const total = Math.max(leftValue + rightValue, 1);
    const winnerValue = Math.max(leftValue, rightValue);
    const winnerRatio = Math.round((winnerValue / total) * 100);
    const winnerLabel = leftValue >= rightValue ? leftLabel : rightLabel;
    return `${winnerLabel} ${winnerRatio}%`;
  }

  function renderSbtiResult() {
    const result = computeSbtiResult();
    state.currentResult = result;
    resultCode.textContent = result.code;
    resultName.textContent = result.profile.name;
    resultSummary.textContent = result.profile.summary;
    resultAura.textContent = result.profile.aura;
    resultGrid.innerHTML = [
      ['S', 'C', '保留', '外放'],
      ['B', 'A', '脑洞', '秩序'],
      ['T', 'F', '判断', '感受'],
      ['I', 'O', '行动', '观察']
    ].map(([left, right, leftLabel, rightLabel]) => `
      <div class="sbti-result-metric">
        <span class="sbti-result-metric__axis">${leftLabel} / ${rightLabel}</span>
        <strong class="sbti-result-metric__score">${formatAxisResult(left, right, leftLabel, rightLabel, result.dims)}</strong>
      </div>
    `).join('');
    resultTips.innerHTML = result.profile.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
    showScreen('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restartSbtiQuiz() {
    state.answers = {};
    state.currentResult = null;
    renderSbtiQuestions();
    updateSbtiProgress();
    showScreen('intro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('sbtiStartButton').addEventListener('click', () => {
    showScreen('test');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  questionList.addEventListener('click', (event) => {
    const option = event.target.closest('[data-question-option]');
    if (!option) return;
    const questionId = option.getAttribute('data-question-id');
    const value = Number(option.getAttribute('data-value'));
    state.answers[questionId] = value;
    renderSbtiQuestions();
    updateSbtiProgress();
  });

  submitButton.addEventListener('click', () => {
    if (submitButton.disabled) return;
    renderSbtiResult();
  });

  backButton.addEventListener('click', () => {
    showScreen('intro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('sbtiRestartButton').addEventListener('click', restartSbtiQuiz);

  renderSbtiQuestions();
  updateSbtiProgress();
  showScreen('intro');
})();
