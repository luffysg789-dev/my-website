(function createTigangMasterModule(globalScope) {
  const TIGANG_STORAGE_KEY = 'claw800:tigang-master:records';
  const TIGANG_SESSION_STORAGE_KEY = 'claw800:tigang-master:nexa-session';
  const TIGANG_LANGUAGE_STORAGE_KEY = 'claw800:tigang-master:language';
  const TIGANG_SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
  const NEXA_API_KEY = 'NEXA2033522880098676737';
  const DAILY_GOAL_COUNT = 5;
  const FIRST_DAILY_CHEER_TEXT = '哇，你太棒了。坚持哦。';
  const DAILY_GOAL_CHEER_TEXT = '哇，恭喜你又健康了，希望你分享给更多朋友，一起健康。';
  const TRANSLATIONS = {
    zh: {
      pageTitle: '提肛大师',
      subtitle: '开始提肛、松开记录，每天 5 次圆圈变绿。',
      navHome: '提肛',
      navRecords: '记录',
      todayCountLabel: '今日次数',
      goalLabel: '每日目标',
      recentLabel: '最近记录',
      recentFiveTitle: '最近 5 次',
      historyLabel: '最近记录',
      historyTitle: '打卡历史',
      idleStatus: '按住开始',
      pressingStatus: '开始提肛',
      completeStatus: '今日达标',
      progressComplete: '今天已经完成 5 次以上，圆圈已变绿。',
      progressRemaining(count) {
        return `今天还差 ${count} 次达成绿色状态。`;
      },
      noRecent: '还没有最近记录',
      noRecords: '今天还没有记录',
      startHint: '按住红色圆圈开始第一组练习。',
      recordItem(ordinal, seconds) {
        return `第 ${ordinal || 1} 次 · ${seconds}s`;
      },
      firstDailyCheer: FIRST_DAILY_CHEER_TEXT,
      dailyGoalCheer: DAILY_GOAL_CHEER_TEXT
    },
    en: {
      pageTitle: 'Kegel Master',
      subtitle: 'Start squeezing, release to save. Hit 5 times a day to turn the circle green.',
      navHome: 'Squeeze',
      navRecords: 'Records',
      todayCountLabel: 'Today',
      goalLabel: 'Goal',
      recentLabel: 'Recent',
      recentFiveTitle: 'Latest 5',
      historyLabel: 'History',
      historyTitle: 'Check-in History',
      idleStatus: 'Hold to Start',
      pressingStatus: 'Start Squeeze',
      completeStatus: 'Goal Reached',
      progressComplete: 'You have finished 5 or more times today. The circle is green now.',
      progressRemaining(count) {
        return `${count} more times to unlock the green circle today.`;
      },
      noRecent: 'No recent records yet',
      noRecords: 'No records yet today',
      startHint: 'Hold the red circle to begin your first set.',
      recordItem(ordinal, seconds) {
        return `No. ${ordinal || 1} · ${seconds}s`;
      },
      firstDailyCheer: 'Wow, you are amazing. Keep it up.',
      dailyGoalCheer: 'Wow, congratulations on getting healthier again. Hope you share it with more friends and stay healthy together.'
    }
  };

  function getStorage() {
    try {
      return globalScope.localStorage;
    } catch {
      return globalScope.sessionStorage;
    }
  }

  function getTodayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeLanguage(language) {
    return String(language || '').trim().toLowerCase() === 'en' ? 'en' : 'zh';
  }

  function loadLanguage(storage = getStorage()) {
    try {
      return normalizeLanguage(storage?.getItem?.(TIGANG_LANGUAGE_STORAGE_KEY));
    } catch {
      return 'zh';
    }
  }

  function saveLanguage(storage = getStorage(), language) {
    try {
      storage?.setItem?.(TIGANG_LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
    } catch {}
  }

  function loadTigangRecords(storage = getStorage()) {
    try {
      const raw = storage?.getItem?.(TIGANG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return sortRecordsNewestFirst(Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  }

  function saveTigangRecords(storage = getStorage(), records) {
    try {
      storage?.setItem?.(TIGANG_STORAGE_KEY, JSON.stringify(Array.isArray(records) ? records : []));
    } catch {}
  }

  function createTigangEntry(durationMs, now = Date.now()) {
    const safeDurationMs = Math.max(0, Number(durationMs || 0) || 0);
    const durationSeconds = Number((safeDurationMs / 1000).toFixed(1));
    return {
      id: `tigang-${now}`,
      createdAt: now,
      dayKey: getTodayKey(new Date(now)),
      durationSeconds
    };
  }

  function buildTodaySummary(records, dayKey = getTodayKey()) {
    const todayItems = (Array.isArray(records) ? records : []).filter((item) => String(item?.dayKey || '') === dayKey);
    return {
      count: todayItems.length,
      isComplete: todayItems.length >= DAILY_GOAL_COUNT,
      remaining: Math.max(0, DAILY_GOAL_COUNT - todayItems.length),
      items: todayItems
    };
  }

  function sortRecordsNewestFirst(records) {
    return (Array.isArray(records) ? records : [])
      .slice()
      .sort((left, right) => Number(right?.createdAt || 0) - Number(left?.createdAt || 0));
  }

  function buildRecordOrdinalMap(records) {
    const ordinalMap = new Map();
    (Array.isArray(records) ? records : [])
      .slice()
      .sort((left, right) => Number(left?.createdAt || 0) - Number(right?.createdAt || 0))
      .forEach((item, index) => {
        ordinalMap.set(String(item?.id || `${item?.createdAt || index}`), index + 1);
      });
    return ordinalMap;
  }

  function formatRecordDate(dateLike) {
    const date = new Date(Number(dateLike || 0));
    return Number.isNaN(date.getTime()) ? '--' : date.toLocaleDateString('zh-CN');
  }

  function formatRecordTime(dateLike) {
    const date = new Date(Number(dateLike || 0));
    return Number.isNaN(date.getTime()) ? '--' : date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function renderRecordItem(item, ordinalMap, copy) {
    const recordKey = String(item?.id || item?.createdAt || '');
    const ordinal = Number(ordinalMap?.get(recordKey) || 0);
    return `
      <article class="tigang-record-item">
        <p class="tigang-record-item__title">${copy.recordItem(ordinal, String(item.durationSeconds || 0))}</p>
        <p class="tigang-record-item__meta">${formatRecordTime(item.createdAt)}</p>
      </article>
    `;
  }

  function groupRecordsByDay(records) {
    const groups = [];
    const groupedMap = new Map();
    sortRecordsNewestFirst(records).forEach((item) => {
      const dayKey = String(item?.dayKey || getTodayKey(new Date(Number(item?.createdAt || 0))));
      if (!groupedMap.has(dayKey)) {
        const nextGroup = { dayKey, items: [] };
        groupedMap.set(dayKey, nextGroup);
        groups.push(nextGroup);
      }
      groupedMap.get(dayKey).items.push(item);
    });
    return groups;
  }

  function loadCachedSession(storage = getStorage()) {
    try {
      const raw = storage?.getItem?.(TIGANG_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.openId || !parsed?.sessionKey) return null;
      if (Number(parsed.expiresAt || 0) < Date.now()) {
        storage?.removeItem?.(TIGANG_SESSION_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveCachedSession(storage = getStorage(), session) {
    try {
      const normalized = {
        openId: String(session?.openId || '').trim(),
        sessionKey: String(session?.sessionKey || '').trim(),
        nickname: String(session?.nickname || 'Nexa User').trim() || 'Nexa User',
        avatar: String(session?.avatar || '').trim(),
        savedAt: Number(session?.savedAt || 0) || Date.now()
      };
      if (!normalized.openId || !normalized.sessionKey) return;
      normalized.expiresAt = normalized.savedAt + TIGANG_SESSION_COOKIE_MAX_AGE_MS;
      storage?.setItem?.(TIGANG_SESSION_STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  }

  function clearCachedSession(storage = getStorage()) {
    try {
      storage?.removeItem?.(TIGANG_SESSION_STORAGE_KEY);
    } catch {}
  }

  function hasNexaEnvironment() {
    const userAgent = String(globalScope.window?.navigator?.userAgent || '');
    const referrer = String(globalScope.document?.referrer || '');
    return /nexa/i.test(userAgent) || /nexa/i.test(referrer);
  }

  function buildCleanReturnUrl() {
    const url = new URL(globalScope.window.location.href);
    ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  }

  function beginNexaLoginFlow() {
    const redirectUri = buildCleanReturnUrl();
    const targetUrl = `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(NEXA_API_KEY)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    globalScope.window.location.href = targetUrl;
  }

  function extractAuthCodeFromUrl() {
    const params = new URLSearchParams(globalScope.window.location.search);
    return (
      String(params.get('code') || '').trim()
      || String(params.get('authCode') || '').trim()
      || String(params.get('auth_code') || '').trim()
    );
  }

  function clearAuthCodeFromUrl() {
    const url = new URL(globalScope.window.location.href);
    ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
    globalScope.window.history.replaceState({}, globalScope.document.title, url.toString());
  }

  async function postJson(url, body) {
    const response = await globalScope.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
    }
    return json;
  }

  async function getJson(url) {
    const response = await globalScope.fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
    }
    return json;
  }

  async function clearServerSession() {
    try {
      await postJson('/api/tigang-master/session/logout', {});
    } catch {}
  }

  function renderRecentRecords(appState) {
    const copy = TRANSLATIONS[appState.language];
    const list = appState.elements.recentList;
    if (!list) return;
    if (!appState.records.length) {
      list.innerHTML = `<article class="tigang-record-item"><p class="tigang-record-item__title">${copy.noRecent}</p><p class="tigang-record-item__meta">${copy.startHint}</p></article>`;
      return;
    }
    const ordinalMap = buildRecordOrdinalMap(appState.records);
    list.innerHTML = sortRecordsNewestFirst(appState.records)
      .slice(0, 5)
      .map((item) => renderRecordItem(item, ordinalMap, copy))
      .join('');
  }

  function renderRecords(appState) {
    const copy = TRANSLATIONS[appState.language];
    const list = appState.elements.recordList;
    if (!list) return;
    if (!appState.records.length) {
      list.innerHTML = `<article class="tigang-record-item"><p class="tigang-record-item__title">${copy.noRecords}</p><p class="tigang-record-item__meta">${copy.startHint}</p></article>`;
      return;
    }
    const ordinalMap = buildRecordOrdinalMap(appState.records);
    list.innerHTML = groupRecordsByDay(appState.records)
      .map((group) => `
        <section class="tigang-record-day">
          <h3 class="tigang-record-day__title">${formatRecordDate(group.items[0]?.createdAt || group.dayKey)}</h3>
          ${group.items.map((item) => renderRecordItem(item, ordinalMap, copy)).join('')}
        </section>
      `)
      .join('');
  }

  function renderHome(appState) {
    const copy = TRANSLATIONS[appState.language];
    const today = buildTodaySummary(appState.records);
    appState.elements.todayCount.textContent = String(today.count);
    appState.elements.todayGoal.textContent = String(DAILY_GOAL_COUNT);
    appState.elements.actionButton.classList.toggle('is-complete', today.isComplete);
    appState.elements.timerValue.textContent = `${(appState.activeDurationMs / 1000).toFixed(1)}s`;
    appState.elements.statusText.textContent = appState.isPressing ? copy.pressingStatus : (today.isComplete ? copy.completeStatus : copy.idleStatus);
    appState.elements.progressText.textContent = today.isComplete
      ? copy.progressComplete
      : copy.progressRemaining(today.remaining);
  }

  function applyLanguage(appState, nextLanguage) {
    const language = normalizeLanguage(nextLanguage);
    const copy = TRANSLATIONS[language];
    appState.language = language;
    saveLanguage(appState.storage, language);
    if (globalScope.window?.TigangMaster) {
      globalScope.window.TigangMaster.language = language;
    }
    if (globalScope.document?.documentElement) {
      globalScope.document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    }
    globalScope.document.title = language === 'en' ? 'Claw800 Kegel Master' : 'Claw800 提肛大师';
    appState.elements.i18nNodes.forEach((node) => {
      const key = node.dataset.i18n;
      if (key && Object.prototype.hasOwnProperty.call(copy, key)) {
        node.textContent = copy[key];
      }
    });
    appState.elements.languageButtons.forEach((button) => {
      button.classList.toggle('is-active', normalizeLanguage(button.dataset.language) === language);
    });
  }

  function speakText(text) {
    try {
      const synth = globalScope.window?.speechSynthesis;
      const Utterance = globalScope.SpeechSynthesisUtterance;
      if (!synth || typeof Utterance !== 'function' || !String(text || '').trim()) return;
      synth.cancel?.();
      const utterance = new Utterance(String(text).trim());
      utterance.lang = 'zh-CN';
      utterance.rate = 1;
      utterance.pitch = 1;
      synth.speak(utterance);
    } catch {}
  }

  function speakFirstDailyCheer() {
    const language = normalizeLanguage(globalScope.window?.TigangMaster?.language || 'zh');
    speakText(TRANSLATIONS[language].firstDailyCheer);
  }

  function speakDailyGoalCheer() {
    const language = normalizeLanguage(globalScope.window?.TigangMaster?.language || 'zh');
    speakText(TRANSLATIONS[language].dailyGoalCheer);
  }

  function renderSession(appState) {
    if (!appState.elements.sessionChip) return;
    appState.elements.sessionChip.textContent = appState.nexaSession
      ? `Nexa 已登录 · ${String(appState.nexaSession.nickname || 'Nexa User')}`
      : '本地记录';
  }

  function renderAll(appState) {
    renderHome(appState);
    renderRecentRecords(appState);
    renderRecords(appState);
    renderSession(appState);
  }

  function switchTab(appState, tab) {
    appState.activeTab = String(tab || 'home');
    appState.elements.panels.forEach((panel) => {
      const active = panel.dataset.tab === appState.activeTab;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    appState.elements.navButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tabTarget === appState.activeTab);
    });
  }

  function stopTicker(appState) {
    if (!appState.pressTicker) return;
    globalScope.window.clearInterval(appState.pressTicker);
    appState.pressTicker = null;
  }

  function handlePressStart(appState) {
    if (appState.isPressing) return;
    appState.isPressing = true;
    appState.pressStartedAt = Date.now();
    appState.activeDurationMs = 0;
    appState.elements.actionButton.classList.add('is-active');
    stopTicker(appState);
    appState.pressTicker = globalScope.window.setInterval(() => {
      appState.activeDurationMs = Date.now() - appState.pressStartedAt;
      renderHome(appState);
    }, 100);
    renderHome(appState);
  }

  function handlePressEnd(appState) {
    if (!appState.isPressing) return;
    const now = Date.now();
    const previousTodaySummary = buildTodaySummary(appState.records);
    appState.isPressing = false;
    appState.activeDurationMs = Math.max(0, now - appState.pressStartedAt);
    appState.elements.actionButton.classList.remove('is-active');
    stopTicker(appState);
    appState.records = sortRecordsNewestFirst([createTigangEntry(appState.activeDurationMs, now), ...appState.records]);
    saveTigangRecords(appState.storage, appState.records);
    appState.activeDurationMs = 0;
    renderAll(appState);
    if (previousTodaySummary.count === 0) {
      speakFirstDailyCheer();
      return;
    }
    if (previousTodaySummary.count === DAILY_GOAL_COUNT - 1) {
      speakDailyGoalCheer();
    }
  }

  async function syncSessionFromAuthCode(appState) {
    const authCode = extractAuthCodeFromUrl();
    if (!authCode) return false;
    const response = await postJson('/api/nexa/tip/session', {
      authCode,
      gameSlug: 'tigang-master'
    });
    const serverResponse = await postJson('/api/tigang-master/session', {
      openId: String(response.session?.openId || '').trim(),
      sessionKey: String(response.session?.sessionKey || '').trim(),
      nickname: 'Nexa User',
      avatar: ''
    });
    appState.nexaSession = serverResponse.session || null;
    if (appState.nexaSession) {
      saveCachedSession(appState.storage, appState.nexaSession);
    }
    clearAuthCodeFromUrl();
    return true;
  }

  async function ensureNexaSession(appState) {
    const cached = loadCachedSession(appState.storage);
    if (cached) {
      appState.nexaSession = cached;
      return;
    }
    try {
      const response = await getJson('/api/tigang-master/session');
      appState.nexaSession = response.session || null;
      if (appState.nexaSession) {
        saveCachedSession(appState.storage, appState.nexaSession);
      }
      return;
    } catch {
      await clearServerSession();
      clearCachedSession(appState.storage);
    }
    if (hasNexaEnvironment()) {
      beginNexaLoginFlow();
    }
  }

  function createApp(root) {
    const storage = getStorage();
    const appState = {
      storage,
      records: loadTigangRecords(storage),
      language: loadLanguage(storage),
      nexaSession: loadCachedSession(storage),
      activeTab: 'home',
      isPressing: false,
      pressStartedAt: 0,
      activeDurationMs: 0,
      pressTicker: null,
      elements: {
        navButtons: Array.from(root.querySelectorAll('[data-tab-target]')),
        languageButtons: Array.from(root.querySelectorAll('[data-language]')),
        i18nNodes: Array.from(root.querySelectorAll('[data-i18n]')),
        panels: Array.from(root.querySelectorAll('[data-tab]')),
        sessionChip: root.querySelector('#tigangSessionChip'),
        actionButton: root.querySelector('#tigangActionButton'),
        statusText: root.querySelector('#tigangStatusText'),
        timerValue: root.querySelector('#tigangTimerValue'),
        todayCount: root.querySelector('#tigangTodayCount'),
        todayGoal: root.querySelector('#tigangTodayGoal'),
        progressText: root.querySelector('#tigangProgressText'),
        recentList: root.querySelector('#tigangRecentList'),
        recordList: root.querySelector('#tigangRecordList')
      }
    };

    appState.elements.navButtons.forEach((button) => {
      button.addEventListener('click', () => switchTab(appState, button.dataset.tabTarget));
    });

    appState.elements.languageButtons.forEach((button) => {
      button.addEventListener('click', () => {
        applyLanguage(appState, button.dataset.language);
        renderAll(appState);
      });
    });

        appState.elements.actionButton?.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          handlePressStart(appState);
        });
        appState.elements.actionButton?.addEventListener('contextmenu', (event) => {
          event.preventDefault();
        });
        appState.elements.actionButton?.addEventListener('selectstart', (event) => {
          event.preventDefault();
        });
        appState.elements.actionButton?.addEventListener('dragstart', (event) => {
          event.preventDefault();
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
          appState.elements.actionButton?.addEventListener(eventName, () => handlePressEnd(appState));
        });

    applyLanguage(appState, appState.language);
    renderAll(appState);
    switchTab(appState, 'home');
    return appState;
  }

  async function bootBrowser() {
    if (!globalScope.document) return;
    const root = globalScope.document.querySelector('[data-tigang-app]');
    if (!root) return;
    const appState = createApp(root);
    const synced = await syncSessionFromAuthCode(appState).catch(() => false);
    if (!synced) {
      await ensureNexaSession(appState).catch(() => {});
    }
    renderAll(appState);
  }

  const exported = {
    TIGANG_STORAGE_KEY,
    TIGANG_SESSION_STORAGE_KEY,
    TIGANG_LANGUAGE_STORAGE_KEY,
    TIGANG_SESSION_COOKIE_MAX_AGE_MS,
    DAILY_GOAL_COUNT,
    TRANSLATIONS,
    loadTigangRecords,
    saveTigangRecords,
    loadLanguage,
    saveLanguage,
    createTigangEntry,
    buildTodaySummary,
    groupRecordsByDay,
    applyLanguage,
    speakText,
    speakFirstDailyCheer,
    speakDailyGoalCheer,
    beginNexaLoginFlow,
    handlePressStart,
    handlePressEnd
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }

  if (globalScope.window) {
    globalScope.window.TigangMaster = exported;
    globalScope.window.TigangMaster.language = loadLanguage();
    bootBrowser().catch(() => {});
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
