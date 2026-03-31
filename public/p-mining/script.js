(function createPMiningModule(globalScope) {
  const TOTAL_SUPPLY = 210000000000;
  const DAILY_CAP = 71917808;
  const CLAIM_COOLDOWN_MS = 60 * 1000;
  const DEMO_INVITE_CODES = ['246810', '135790', '888888'];
  const STORAGE_KEY_PREFIX = 'claw800:p-mining:state:';
  const NETWORK_STORAGE_KEY = 'claw800:p-mining:network-stats';
  const LOCALE_STORAGE_KEY = 'claw800:p-mining:locale';
  const INVITE_PROMPT_DATE_STORAGE_KEY = 'claw800:p-mining:invite-prompt-date';
  const INVITE_GRAPH_STORAGE_KEY = 'claw800:p-mining:invite-graph';
  const PENDING_INVITE_BONUS_STORAGE_KEY = 'claw800:p-mining:pending-invite-bonus';
  const PMINING_SESSION_STORAGE_KEY = 'claw800:p-mining:nexa-session';
  const PMINING_AUTH_TARGET_KEY = 'claw800:p-mining:auth-target';
  const PMINING_PENDING_PAYMENT_STORAGE_KEY = 'claw800:p-mining:pending-payment';
  const PMINING_SETTLED_PAYMENT_STORAGE_KEY = 'claw800:p-mining:settled-payment';
  const MAX_NEXA_SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const NEXA_API_KEY = 'NEXA2033522880098676737';
  const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
  const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth://order';
  const MAX_RECORDS = 20;
  const PAYMENT_QUERY_INTERVAL_MS = 2000;
  const PAYMENT_QUERY_TIMEOUT_MS = 45000;
  const CLAIM_SOUND_DURATION_SECONDS = 0.18;
  const CLAIM_SOUND_FREQUENCY_HZ = 880;
  const AudioContextCtor = globalScope.window?.AudioContext || globalScope.window?.webkitAudioContext;
  const POWER_PURCHASE_OPTIONS = {
    starter: {
      id: 'starter',
      power: 100,
      usdtAmount: 10,
      amount: '10.00'
    },
    boost: {
      id: 'boost',
      power: 1000,
      usdtAmount: 80,
      amount: '80.00'
    }
  };
  const TRANSLATIONS = {
    en: {
      networkOnline: 'Online',
      currentHoldings: 'Current P',
      currentPower: 'Your Power',
      estimatedPerMinute: 'Est. P / Min',
      networkUsers: 'Users',
      totalMined: 'Total Mined',
      todayOutput: 'Today Output',
      todayPower: 'Today Power',
      estimatedTodayOutput: 'Est. Today',
      remainingSupply: 'Remaining',
      halvingCycle: 'Halving Cycle',
      nextHalving: 'Every 4 Years (Next)',
      totalSupply: 'Supply',
      estimatedFinish: 'Est. Finish',
      manifesto: 'P is Pay, P is People. P may have no utility, but it stands as our witness. If participation surpasses 10 million people, it might become a great victory.',
      inviteFriends: 'Invite Friends',
      myInviteCode: 'My Code',
      copyButton: 'Copy',
      inviteHint: 'Both sides get +10 power.',
      buyPower: 'Buy',
      tabPurchase: 'Buy',
      powerStore: 'Power Store',
      purchaseCreateFailed: 'Unable to create the payment order right now.',
      purchaseOpening: 'Opening Nexa Pay...',
      powerPackageStarter: '+100 Power / 10 USDT',
      powerPackageBoost: '+1000 Power / 80 USDT',
      powerPurchaseAction: 'Buy Now',
      enterInviteCode: 'Enter Invite Code',
      invitePlaceholder: "Enter a friend's code",
      invitePromptTitle: 'Enter Invite Code',
      invitePromptCopy: "Bind a friend's code to unlock +10 power.",
      invitePromptAction: 'Bind',
      invitePromptSuccessTitle: 'Power Boosted',
      invitePromptSuccessCopy: 'Invite linked successfully. Power +10.',
      invitePromptSuccessAction: 'OK',
      invitedUsers: 'Invites',
      invitePowerBonus: 'Power Bonus',
      claimRecords: 'Claims',
      inviteRecords: 'Invites',
      powerChanges: 'Power',
      currentTotalPoints: 'Current P',
      logoutButton: 'Log Out',
      tabMining: 'Mining',
      tabInvite: 'Invite',
      tabRecords: 'Records',
      tabProfile: 'Profile',
      claimReady: 'Claim',
      cooldown: 'Cooling',
      noRecords: 'No records yet',
      noRecordMeta: 'Nothing to show in this category.',
      claimTitle: 'Claim Reward',
      inviteTitle: 'Invite Linked',
      powerTitle: 'Power Update',
      reasonInitialPower: 'Starting Power',
      reasonInviteReward: 'Invite Bonus',
      reasonPurchasePower: 'Power Purchase',
      reasonInviteShare: 'Invite Share',
      errorSelfInvite: 'You cannot bind your own invite code.',
      errorAlreadyBound: 'This account can only bind once.',
      errorInvalidInvite: 'Invite code is invalid.',
      errorEmptyInvite: 'Please enter an invite code.'
    },
    zh: {
      networkOnline: '在线',
      currentHoldings: '我的持有 P',
      currentPower: '我的算力',
      estimatedPerMinute: '预计收益/分钟',
      networkUsers: '全网用户',
      totalMined: '已挖出总量',
      todayOutput: '今日全网产出',
      todayPower: '全网今日算力',
      estimatedTodayOutput: '今日预挖总数',
      remainingSupply: '剩余总量',
      halvingCycle: '当前减半周期',
      nextHalving: '每四年减半（下次）',
      totalSupply: '总发行量',
      estimatedFinish: '预计挖完时间',
      manifesto: 'P is Pay，P is People，P没有用，是我们的见证，当参与的人数超过 1000 万人时，说不定是一场伟大的胜利。',
      inviteFriends: '邀请好友',
      myInviteCode: '我的邀请码',
      copyButton: '复制',
      inviteHint: '邀请好友双方各增加 10 算力。',
      buyPower: '购买',
      tabPurchase: '购买',
      powerStore: '购买算力',
      purchaseCreateFailed: '当前无法创建支付订单，请稍后重试。',
      purchaseOpening: '正在打开 Nexa Pay...',
      powerPackageStarter: '+100 算力 / 10 USDT',
      powerPackageBoost: '+1000 算力 / 80 USDT',
      powerPurchaseAction: '立即购买',
      enterInviteCode: '填写邀请码',
      invitePlaceholder: '输入好友邀请码',
      invitePromptTitle: '填写邀请码',
      invitePromptCopy: '绑定好友邀请码后，立即获得 +10 算力。',
      invitePromptAction: '立即绑定',
      invitePromptSuccessTitle: '算力加成成功',
      invitePromptSuccessCopy: '邀请码绑定成功，算力 +10。',
      invitePromptSuccessAction: '我知道了',
      invitedUsers: '已邀请人数',
      invitePowerBonus: '邀请算力加成',
      claimRecords: '领取记录',
      inviteRecords: '邀请记录',
      powerChanges: '算力变动',
      currentTotalPoints: '当前总积分',
      logoutButton: '退出登录',
      tabMining: '挖矿',
      tabInvite: '邀请',
      tabRecords: '记录',
      tabProfile: '我的',
      claimReady: '点击领取',
      cooldown: '冷却中',
      noRecords: '暂无记录',
      noRecordMeta: '当前分类还没有可展示的数据',
      claimTitle: '挖矿领取',
      inviteTitle: '邀请绑定',
      powerTitle: '算力变动',
      reasonInitialPower: '初始算力',
      reasonInviteReward: '邀请奖励',
      reasonPurchasePower: '购买算力',
      reasonInviteShare: '邀请分成',
      errorSelfInvite: '不能绑定自己的邀请码',
      errorAlreadyBound: '每个账号只能绑定一次邀请码',
      errorInvalidInvite: '邀请码无效',
      errorEmptyInvite: '请输入邀请码'
    }
  };

  function roundToSingle(value) {
    return Number(Number(value || 0).toFixed(1));
  }

  function formatMiningNumber(value) {
    return formatWholeNumber(value);
  }

  function formatWholeNumber(value) {
    return String(Math.max(0, Math.floor(Number(value || 0))));
  }

  function formatPowerValue(value) {
    return formatWholeNumber(value);
  }

  function getPersistentStorage() {
    try {
      return globalScope.localStorage;
    } catch {
      return globalScope.sessionStorage;
    }
  }

  function getPMiningSessionExpiryTimestamp(session) {
    const savedAt = Number(session?.savedAt || 0) || Date.now();
    return savedAt + MAX_NEXA_SESSION_RETENTION_MS;
  }

  function loadCachedPMiningSession(storage = getPersistentStorage()) {
    try {
      const raw = storage?.getItem?.(PMINING_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.openId || !parsed.sessionKey) return null;
      parsed.savedAt = Number(parsed.savedAt || 0) || Date.now();
      parsed.expiresAt = getPMiningSessionExpiryTimestamp(parsed);
      if (parsed.expiresAt < Date.now()) {
        storage?.removeItem?.(PMINING_SESSION_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveCachedPMiningSession(storage = getPersistentStorage(), session) {
    if (!storage?.setItem) return;
    try {
      const normalizedSession = {
        openId: String(session?.openId || '').trim(),
        sessionKey: String(session?.sessionKey || '').trim(),
        nickname: String(session?.nickname || 'Nexa User').trim(),
        avatar: String(session?.avatar || '').trim(),
        savedAt: Number(session?.savedAt || 0) || Date.now()
      };
      if (!normalizedSession.openId || !normalizedSession.sessionKey) return;
      normalizedSession.expiresAt = getPMiningSessionExpiryTimestamp(normalizedSession);
      storage.setItem(PMINING_SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
    } catch {}
  }

  function clearCachedPMiningSession(storage = getPersistentStorage()) {
    try {
      storage?.removeItem?.(PMINING_SESSION_STORAGE_KEY);
    } catch {}
  }

  function setPendingAuthTarget(storage = getPersistentStorage(), tab) {
    try {
      storage?.setItem?.(PMINING_AUTH_TARGET_KEY, String(tab || 'profile').trim() || 'profile');
    } catch {}
  }

  function readPendingAuthTarget(storage = getPersistentStorage()) {
    try {
      return String(storage?.getItem?.(PMINING_AUTH_TARGET_KEY) || '').trim() || '';
    } catch {
      return '';
    }
  }

  function clearPendingAuthTarget(storage = getPersistentStorage()) {
    try {
      storage?.removeItem?.(PMINING_AUTH_TARGET_KEY);
    } catch {}
  }

  function loadInviteGraph(storage = getPersistentStorage()) {
    try {
      const raw = storage?.getItem?.(INVITE_GRAPH_STORAGE_KEY);
      if (!raw) {
        return { byUid: {}, byCode: {} };
      }
      const parsed = JSON.parse(raw);
      return {
        byUid: parsed?.byUid && typeof parsed.byUid === 'object' ? parsed.byUid : {},
        byCode: parsed?.byCode && typeof parsed.byCode === 'object' ? parsed.byCode : {}
      };
    } catch {
      return { byUid: {}, byCode: {} };
    }
  }

  function saveInviteGraph(storage = getPersistentStorage(), graph) {
    try {
      storage?.setItem?.(INVITE_GRAPH_STORAGE_KEY, JSON.stringify({
        byUid: graph?.byUid || {},
        byCode: graph?.byCode || {}
      }));
    } catch {}
  }

  function registerInviteProfile(storage = getPersistentStorage(), state) {
    const current = state || {};
    const uid = String(current.uid || '').trim();
    const inviteCode = normalizeInviteCode(current.inviteCode);
    if (!uid || !inviteCode) return;
    const graph = loadInviteGraph(storage);
    graph.byUid[uid] = {
      uid,
      inviteCode,
      boundInviteCode: normalizeInviteCode(current.boundInviteCode)
    };
    graph.byCode[inviteCode] = uid;
    saveInviteGraph(storage, graph);
  }

  function loadPendingInviteBonusMap(storage = getPersistentStorage()) {
    try {
      const raw = storage?.getItem?.(PENDING_INVITE_BONUS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function savePendingInviteBonusMap(storage = getPersistentStorage(), bonusMap) {
    try {
      storage?.setItem?.(PENDING_INVITE_BONUS_STORAGE_KEY, JSON.stringify(bonusMap || {}));
    } catch {}
  }

  function queueInvitePurchaseBonus(storage = getPersistentStorage(), payload) {
    const inviteCode = normalizeInviteCode(payload?.inviteCode);
    const sourceUid = String(payload?.sourceUid || '').trim();
    if (!inviteCode || !sourceUid) return null;
    const graph = loadInviteGraph(storage);
    const targetUid = String(graph.byCode?.[inviteCode] || '').trim();
    if (!targetUid || targetUid === sourceUid) return null;
    const purchasedPower = Math.max(0, Number(payload?.purchasedPower || 0));
    const bonusPower = Math.max(1, Math.floor(purchasedPower * 0.1));
    const createdAt = Number(payload?.createdAt || Date.now());
    const bonusMap = loadPendingInviteBonusMap(storage);
    const currentItems = Array.isArray(bonusMap[targetUid]) ? bonusMap[targetUid] : [];
    bonusMap[targetUid] = [
      {
        sourceUid,
        purchasedPower,
        bonusPower,
        createdAt
      },
      ...currentItems
    ].slice(0, MAX_RECORDS);
    savePendingInviteBonusMap(storage, bonusMap);
    return { targetUid, bonusPower };
  }

  function consumePendingInvitePurchaseBonuses(storage = getPersistentStorage(), uid) {
    const normalizedUid = String(uid || '').trim();
    if (!normalizedUid) return [];
    const bonusMap = loadPendingInviteBonusMap(storage);
    const items = Array.isArray(bonusMap[normalizedUid]) ? bonusMap[normalizedUid] : [];
    if (items.length) {
      delete bonusMap[normalizedUid];
      savePendingInviteBonusMap(storage, bonusMap);
    }
    return items;
  }

  function getStoredLocale(storage) {
    const raw = String(storage?.getItem?.(LOCALE_STORAGE_KEY) || '').trim().toLowerCase();
    return raw === 'zh' ? 'zh' : 'en';
  }

  function setStoredLocale(storage, locale) {
    if (!storage?.setItem) return;
    try {
      storage.setItem(LOCALE_STORAGE_KEY, locale === 'zh' ? 'zh' : 'en');
    } catch {}
  }

  function getInvitePromptDisplayDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getLastInvitePromptDate(storage = getPersistentStorage()) {
    try {
      return String(storage?.getItem?.(INVITE_PROMPT_DATE_STORAGE_KEY) || '').trim();
    } catch {
      return '';
    }
  }

  function setLastInvitePromptDate(storage = getPersistentStorage(), value) {
    try {
      storage?.setItem?.(INVITE_PROMPT_DATE_STORAGE_KEY, String(value || '').trim());
    } catch {}
  }

  function t(locale, key) {
    const table = TRANSLATIONS[locale] || TRANSLATIONS.en;
    return table[key] || TRANSLATIONS.en[key] || key;
  }

  function normalizeHostUser(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const uid = String(source.uid || `nexa_${Date.now().toString(36)}`).trim();
    const email = String(source.email || source.nickname || `${uid}@nexa.local`).trim();
    return {
      uid,
      email,
      nickname: String(source.nickname || '').trim(),
      networkConnected: Boolean(source.networkConnected)
    };
  }

  function getMockNexaUser() {
    return normalizeHostUser({
      uid: 'nexa_guest',
      email: 'guest@nexa.app',
      nickname: 'Guest',
      networkConnected: false
    });
  }

  function createHostUserFromSession(session) {
    const openId = String(session?.openId || '').trim();
    const nickname = String(session?.nickname || 'Nexa User').trim();
    return normalizeHostUser({
      uid: openId || 'nexa_guest',
      email: nickname || `${openId}@nexa.local`,
      nickname,
      networkConnected: true
    });
  }

  function createInviteCode(uid) {
    const seed = String(uid || '100000').replace(/\D/g, '') || '100000';
    const digits = seed.padEnd(6, '0').slice(-6);
    return digits;
  }

  function normalizeInviteCode(value) {
    const raw = String(value || '').trim();
    if (/^\d{6}$/.test(raw)) return raw;
    const digitsOnly = raw.replace(/\D/g, '');
    return /^\d{6}$/.test(digitsOnly) ? digitsOnly : '';
  }

  function createDefaultMiningState(hostUser) {
    const user = normalizeHostUser(hostUser);
    return {
      uid: user.uid,
      balance: 0,
      power: 10,
      inviteCode: createInviteCode(user.uid),
      boundInviteCode: '',
      inviteCount: 0,
      invitePowerBonus: 0,
      claimRecords: [],
      inviteRecords: [],
      powerChanges: [
        {
          id: `power-${Date.now()}`,
          delta: 10,
          reason: '初始算力',
          createdAt: Date.now()
        }
      ],
      lastClaimAt: 0,
      createdAt: Date.now()
    };
  }

  function createDefaultNetworkStats() {
    return {
      totalUsers: 1,
      totalMined: 0,
      todayMined: 0,
      todayPower: 10,
      remainingSupply: TOTAL_SUPPLY,
      currentHalvingCycle: 1,
      nextHalvingDate: '2030/03/28',
      estimatedFinishYears: 100,
      dailyCap: DAILY_CAP
    };
  }

  function calculateClaimReward({ userPower, networkPower, dailyCap }) {
    const safeUserPower = Math.max(0, Number(userPower || 0));
    const safeNetworkPower = Math.max(1, Number(networkPower || 1));
    const safeDailyCap = Math.max(0, Number(dailyCap || DAILY_CAP));
    return roundToSingle((safeUserPower / safeNetworkPower) * (safeDailyCap / 1440));
  }

  function calculateEstimatedTodayOutput({ userPower, networkPower, dailyCap }) {
    const safeUserPower = Math.max(0, Number(userPower || 0));
    const safeNetworkPower = Math.max(1, Number(networkPower || 1));
    const safeDailyCap = Math.max(0, Number(dailyCap || DAILY_CAP));
    return roundToSingle((safeUserPower / safeNetworkPower) * safeDailyCap);
  }

  function advanceNetworkStats(stats, elapsedMs) {
    const current = { ...createDefaultNetworkStats(), ...(stats || {}) };
    const minutes = Math.max(0, Number(elapsedMs || 0) / 60000);
    const increment = roundToSingle((current.dailyCap / 1440) * minutes);
    const nextTodayMined = roundToSingle(current.todayMined + increment);
    const nextTotalMined = roundToSingle(current.totalMined + increment);
    return {
      ...current,
      totalMined: nextTotalMined,
      todayMined: nextTodayMined,
      remainingSupply: roundToSingle(Math.max(0, TOTAL_SUPPLY - nextTotalMined)),
      estimatedFinishYears: roundToSingle(Math.max(0, 100 - nextTotalMined / (DAILY_CAP * 365))),
      totalUsers: roundToSingle(current.totalUsers + minutes * 0.02),
      todayPower: roundToSingle(Math.max(1, current.todayPower + minutes * 0.015))
    };
  }

  function canClaim({ lastClaimAt, now }) {
    const last = Number(lastClaimAt || 0);
    const current = Number(now || Date.now());
    return current - last >= CLAIM_COOLDOWN_MS;
  }

  function getClaimCooldownRemainingSeconds({ lastClaimAt, now }) {
    const last = Number(lastClaimAt || 0);
    const current = Number(now || Date.now());
    const remainingMs = Math.max(0, CLAIM_COOLDOWN_MS - (current - last));
    return Math.ceil(remainingMs / 1000);
  }

  function prependRecord(records, item) {
    return [item, ...(Array.isArray(records) ? records : [])].slice(0, MAX_RECORDS);
  }

  function applyClaimResult(state, { reward, claimedAt }) {
    const current = state || createDefaultMiningState(getMockNexaUser());
    const when = Number(claimedAt || Date.now());
    const safeReward = roundToSingle(reward);
    return {
      ...current,
      balance: roundToSingle(current.balance + safeReward),
      lastClaimAt: when,
      claimRecords: prependRecord(current.claimRecords, {
        id: `claim-${when}`,
        reward: safeReward,
        power: roundToSingle(current.power),
        createdAt: when
      })
    };
  }

  function purchasePowerPackage(state, { tier, purchasedAt }) {
    const current = state || createDefaultMiningState(getMockNexaUser());
    const option = POWER_PURCHASE_OPTIONS[String(tier || '').trim()] || null;
    if (!option) {
      throw new Error('purchase tier invalid');
    }
    const when = Number(purchasedAt || Date.now());
    return {
      ...current,
      power: roundToSingle(current.power + option.power),
      powerChanges: prependRecord(current.powerChanges, {
        id: `power-purchase-${when}`,
        delta: option.power,
        reason: '购买算力',
        usdtAmount: option.usdtAmount,
        createdAt: when
      })
    };
  }

  function bindInviteCode(state, inviteCode) {
    const current = state || createDefaultMiningState(getMockNexaUser());
    const normalizedCode = normalizeInviteCode(inviteCode);
    if (!normalizedCode) {
      throw new Error('invite required');
    }
    if (normalizedCode === current.inviteCode) {
      throw new Error('self bind is not allowed');
    }
    if (current.boundInviteCode) {
      throw new Error('already bound');
    }
    if (!DEMO_INVITE_CODES.includes(normalizedCode)) {
      throw new Error('invite invalid');
    }
    const timestamp = Date.now();
    return {
      ...current,
      power: roundToSingle(current.power + 10),
      boundInviteCode: normalizedCode,
      inviteCount: roundToSingle(current.inviteCount + 1),
      invitePowerBonus: roundToSingle(current.invitePowerBonus + 10),
      inviteRecords: prependRecord(current.inviteRecords, {
        id: `invite-${timestamp}`,
        code: normalizedCode,
        reward: 10,
        createdAt: timestamp
      }),
      powerChanges: prependRecord(current.powerChanges, {
        id: `power-${timestamp}`,
        delta: 10,
        reason: '邀请奖励',
        createdAt: timestamp
      })
    };
  }

  function applyPendingInvitePurchaseBonuses(state, bonusEvents) {
    const current = state || createDefaultMiningState(getMockNexaUser());
    const events = Array.isArray(bonusEvents) ? bonusEvents.filter(Boolean) : [];
    if (!events.length) return current;
    let nextState = { ...current };
    events
      .slice()
      .sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0))
      .forEach((item) => {
        const bonusPower = Math.max(0, Number(item?.bonusPower || 0));
        const createdAt = Number(item?.createdAt || Date.now());
        nextState = {
          ...nextState,
          power: roundToSingle(nextState.power + bonusPower),
          invitePowerBonus: roundToSingle(nextState.invitePowerBonus + bonusPower),
          powerChanges: prependRecord(nextState.powerChanges, {
            id: `power-share-${createdAt}-${String(item?.sourceUid || 'invitee').trim() || 'invitee'}`,
            delta: bonusPower,
            reason: '邀请分成',
            purchasedPower: Math.max(0, Number(item?.purchasedPower || 0)),
            sourceUid: String(item?.sourceUid || '').trim(),
            createdAt
          })
        };
      });
    return nextState;
  }

  function getStorageKey(uid) {
    return `${STORAGE_KEY_PREFIX}${String(uid || '').trim()}`;
  }

  function loadMiningState(storage, hostUser) {
    const user = normalizeHostUser(hostUser);
    const fallback = createDefaultMiningState(user);
    try {
      const raw = storage?.getItem?.(getStorageKey(user.uid));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return fallback;
      return {
        ...fallback,
        ...parsed,
        uid: fallback.uid,
        inviteCode: normalizeInviteCode(parsed.inviteCode) || fallback.inviteCode,
        boundInviteCode: normalizeInviteCode(parsed.boundInviteCode)
      };
    } catch {
      return fallback;
    }
  }

  function saveMiningState(storage, state) {
    if (!storage?.setItem) return;
    try {
      storage.setItem(getStorageKey(state.uid), JSON.stringify(state));
    } catch {}
  }

  function loadNetworkStats(storage) {
    const fallback = createDefaultNetworkStats();
    try {
      const raw = storage?.getItem?.(NETWORK_STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return fallback;
      return {
        ...fallback,
        ...parsed
      };
    } catch {
      return fallback;
    }
  }

  function saveNetworkStats(storage, stats) {
    if (!storage?.setItem) return;
    try {
      storage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(stats));
    } catch {}
  }

  function loadPendingPaymentOrder(storage = getPersistentStorage()) {
    try {
      const raw = storage?.getItem?.(PMINING_PENDING_PAYMENT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.orderNo || !parsed.tier) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function savePendingPaymentOrder(storage = getPersistentStorage(), order) {
    try {
      storage?.setItem?.(PMINING_PENDING_PAYMENT_STORAGE_KEY, JSON.stringify({
        orderNo: String(order?.orderNo || '').trim(),
        tier: String(order?.tier || '').trim(),
        power: Math.max(0, Number(order?.power || 0)),
        usdtAmount: Math.max(0, Number(order?.usdtAmount || 0)),
        createdAt: Number(order?.createdAt || Date.now())
      }));
    } catch {}
  }

  function clearPendingPaymentOrder(storage = getPersistentStorage()) {
    try {
      storage?.removeItem?.(PMINING_PENDING_PAYMENT_STORAGE_KEY);
    } catch {}
  }

  function loadSettledPaymentReceipts(storage = getPersistentStorage()) {
    try {
      const raw = storage?.getItem?.(PMINING_SETTLED_PAYMENT_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveSettledPaymentReceipt(storage = getPersistentStorage(), receipt) {
    const orderNo = String(receipt?.orderNo || '').trim();
    if (!orderNo) return;
    const receipts = loadSettledPaymentReceipts(storage);
    receipts[orderNo] = {
      orderNo,
      tier: String(receipt?.tier || '').trim(),
      settledAt: Number(receipt?.settledAt || Date.now())
    };
    try {
      storage?.setItem?.(PMINING_SETTLED_PAYMENT_STORAGE_KEY, JSON.stringify(receipts));
    } catch {}
  }

  function hasSettledPaymentOrder(storage = getPersistentStorage(), orderNo) {
    const normalizedOrderNo = String(orderNo || '').trim();
    if (!normalizedOrderNo) return false;
    const receipts = loadSettledPaymentReceipts(storage);
    return Boolean(receipts[normalizedOrderNo]);
  }

  function buildCleanReturnUrl() {
    const url = new URL(globalScope.window.location.href);
    ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  }

  function buildNexaAuthorizeUrl() {
    const redirectUri = buildCleanReturnUrl();
    return `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(NEXA_API_KEY)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  function buildNexaPaymentUrl(payment, redirectUrl = buildCleanReturnUrl()) {
    const params = new URLSearchParams({
      orderNo: String(payment?.orderNo || '').trim(),
      paySign: String(payment?.paySign || '').trim(),
      signType: String(payment?.signType || 'MD5').trim(),
      apiKey: String(payment?.apiKey || NEXA_API_KEY).trim(),
      nonce: String(payment?.nonce || '').trim(),
      timestamp: String(payment?.timestamp || '').trim(),
      redirectUrl: String(redirectUrl || '').trim()
    });
    return `${NEXA_PROTOCOL_ORDER_BASE}?${params.toString()}`;
  }

  function launchNexaUrl(url) {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) return;
    globalScope.window.location.href = targetUrl;
  }

  function showPurchaseStatus(appState, message, { isError = false } = {}) {
    const node = appState.elements.purchaseStatus;
    if (!node) return;
    const text = String(message || '').trim();
    node.hidden = !text;
    node.textContent = text;
    node.classList.toggle('is-error', Boolean(text && isError));
  }

  function openNexaPaymentUrl(appState, url) {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) return false;

    const anchor = globalScope.document.createElement('a');
    anchor.href = targetUrl;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    globalScope.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    globalScope.window.setTimeout(() => {
      launchNexaUrl(targetUrl);
    }, 160);
    return true;
  }

  function setPurchaseButtonsBusy(appState, isBusy, activeTier = '') {
    const busy = Boolean(isBusy);
    const currentTier = String(activeTier || '').trim();
    appState.isPurchaseBusy = busy;
    appState.activePurchaseTier = currentTier;
    appState.elements.purchaseButtons.forEach((button) => {
      const isActiveButton = currentTier && button.dataset.purchaseTier === currentTier;
      button.disabled = Boolean(isBusy);
      button.classList.toggle('is-busy', busy && isActiveButton);
      button.textContent = busy && isActiveButton
        ? t(appState.locale, 'purchaseOpening')
        : t(appState.locale, 'powerPurchaseAction');
    });
  }

  function extractAuthCodeFromUrl() {
    const params = new URLSearchParams(globalScope.window.location.search);
    return (
      String(params.get('code') || '').trim() ||
      String(params.get('authCode') || '').trim() ||
      String(params.get('auth_code') || '').trim()
    );
  }

  function clearAuthCodeFromUrl() {
    const url = new URL(globalScope.window.location.href);
    ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
    globalScope.window.history.replaceState({}, globalScope.document.title, url.toString());
  }

  function hasNexaEnvironmentMarker() {
    const userAgent = String(globalScope.window.navigator?.userAgent || '').trim();
    const referrer = String(globalScope.document?.referrer || '').trim();
    return /nexa/i.test(userAgent) || /nexa/i.test(referrer);
  }

  async function postJson(url, body) {
    const response = await globalScope.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(String(json?.error || json?.message || '请求失败'));
      error.statusCode = Number(response.status || 0) || 0;
      throw error;
    }
    return json;
  }

  async function getJson(url) {
    const response = await globalScope.fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(String(json?.error || json?.message || '请求失败'));
      error.statusCode = Number(response.status || 0) || 0;
      throw error;
    }
    return json;
  }

  function isNexaAppEnvironment() {
    const hasNexaMarker = hasNexaEnvironmentMarker();
    return Boolean(hasNexaMarker || loadCachedPMiningSession());
  }

  function shouldForceFreshNexaAuthorization({ isNexaEnvironment, hasAuthCode, cachedSession }) {
    return false;
  }

  function getClaimUiState({ lastClaimAt, now, isProcessing }) {
    const current = Number(now || Date.now());
    const claimable = canClaim({ lastClaimAt, now: current });
    const remainingSeconds = claimable
      ? 0
      : getClaimCooldownRemainingSeconds({ lastClaimAt, now: current });
    const progress = claimable
      ? 100
      : Math.min(100, Math.max(0, ((CLAIM_COOLDOWN_MS - remainingSeconds * 1000) / CLAIM_COOLDOWN_MS) * 100));

    return {
      remainingSeconds,
      progress,
      isClaimable: claimable && !isProcessing,
      countdownLabel: claimable ? '60' : String(remainingSeconds),
      hintLabel: claimable ? '点击领取' : '冷却中'
    };
  }

  function applyTranslations(appState) {
    appState.elements.translatableNodes.forEach((node) => {
      node.textContent = t(appState.locale, node.dataset.i18n);
    });
    appState.elements.placeholderNodes.forEach((node) => {
      node.setAttribute('placeholder', t(appState.locale, node.dataset.i18nPlaceholder));
    });
    appState.elements.localeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.localeToggle === appState.locale);
    });
  }

  function toggleLanguage(appState, locale) {
    appState.locale = locale === 'zh' ? 'zh' : 'en';
    setStoredLocale(appState.storage, appState.locale);
    applyTranslations(appState);
    renderAll(appState);
  }

  function switchTab(appState, tab) {
    const nextTab = String(tab || 'mining').trim() || 'mining';
    appState.activeTab = nextTab;
    appState.elements.panels.forEach((panel) => {
      const isActive = panel.dataset.tab === nextTab;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });
    appState.elements.navButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tabTarget === nextTab);
    });
  }

  function applyAuthorizedSession(appState, session) {
    const normalizedSession = {
      openId: String(session?.openId || '').trim(),
      sessionKey: String(session?.sessionKey || '').trim(),
      nickname: String(session?.nickname || 'Nexa User').trim(),
      avatar: String(session?.avatar || '').trim(),
      savedAt: Number(session?.savedAt || 0) || Date.now()
    };
    if (!normalizedSession.openId || !normalizedSession.sessionKey) return;
    saveCachedPMiningSession(appState.storage, normalizedSession);
    appState.nexaSession = loadCachedPMiningSession(appState.storage);
    appState.hostUser = createHostUserFromSession(appState.nexaSession);
    appState.state = loadMiningState(appState.storage, appState.hostUser);
    registerInviteProfile(appState.storage, appState.state);
    const pendingInviteBonuses = consumePendingInvitePurchaseBonuses(appState.storage, appState.state.uid);
    if (pendingInviteBonuses.length) {
      appState.state = applyPendingInvitePurchaseBonuses(appState.state, pendingInviteBonuses);
      saveMiningState(appState.storage, appState.state);
      registerInviteProfile(appState.storage, appState.state);
    }
  }

  function renderClaimState(appState) {
    const ui = getClaimUiState({
      lastClaimAt: appState.state.lastClaimAt,
      now: Date.now(),
      isProcessing: appState.isProcessing
    });
    appState.elements.claimCountdown.textContent = ui.countdownLabel;
    appState.elements.claimHint.textContent = ui.isClaimable ? t(appState.locale, 'claimReady') : t(appState.locale, 'cooldown');
    appState.elements.claimButton.disabled = !ui.isClaimable;
    appState.elements.claimButton.style.setProperty('--progress', `${ui.progress}%`);
  }

  function animateBalanceValue(appState, nextBalance, { immediate = false } = {}) {
    const node = appState.elements.balanceValue;
    if (!node) return;
    const targetBalance = Number(nextBalance || 0) || 0;
    const raf = globalScope.window?.requestAnimationFrame?.bind(globalScope.window);
    const caf = globalScope.window?.cancelAnimationFrame?.bind(globalScope.window);

    if (appState.balanceAnimationFrame && caf) {
      caf(appState.balanceAnimationFrame);
      appState.balanceAnimationFrame = null;
    }

    if (immediate || !raf || !appState.hasAnimatedBalance) {
      appState.animatedBalanceValue = targetBalance;
      appState.hasAnimatedBalance = true;
      node.textContent = formatMiningNumber(targetBalance);
      node.style.transform = 'translateX(0)';
      return;
    }

    const startBalance = Number(appState.animatedBalanceValue ?? targetBalance) || 0;
    if (Math.abs(targetBalance - startBalance) < 0.05) {
      appState.animatedBalanceValue = targetBalance;
      node.textContent = formatMiningNumber(targetBalance);
      node.style.transform = 'translateX(0)';
      return;
    }

    const durationMs = 560;
    let startTime = 0;

    const step = (timestamp) => {
      if (!startTime) startTime = Number(timestamp || Date.now());
      const elapsed = Math.max(0, Number(timestamp || Date.now()) - startTime);
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentBalance = startBalance + ((targetBalance - startBalance) * eased);
      const shift = (1 - eased) * 16;

      appState.animatedBalanceValue = currentBalance;
      node.textContent = formatMiningNumber(currentBalance);
      node.style.transform = `translateX(${-shift}px)`;

      if (progress < 1) {
        appState.balanceAnimationFrame = raf(step);
        return;
      }

      appState.animatedBalanceValue = targetBalance;
      appState.balanceAnimationFrame = null;
      node.textContent = formatMiningNumber(targetBalance);
      node.style.transform = 'translateX(0)';
    };

    appState.balanceAnimationFrame = raf(step);
  }

  function renderMiningPanel(appState) {
    appState.network.todayPower = Math.max(Number(appState.network.todayPower || 0), Number(appState.state.power || 0), 10);
    const reward = calculateClaimReward({
      userPower: appState.state.power,
      networkPower: appState.network.todayPower,
      dailyCap: appState.network.dailyCap
    });
    const estimatedTodayOutput = calculateEstimatedTodayOutput({
      userPower: appState.state.power,
      networkPower: appState.network.todayPower,
      dailyCap: appState.network.dailyCap
    });
    animateBalanceValue(appState, appState.state.balance);
    appState.elements.powerValue.textContent = formatPowerValue(appState.state.power);
    appState.elements.rewardPerMinute.textContent = formatMiningNumber(reward);
    appState.elements.totalUsers.textContent = formatWholeNumber(appState.network.totalUsers);
    appState.elements.totalMined.textContent = formatMiningNumber(appState.network.totalMined);
    appState.elements.todayMined.textContent = formatMiningNumber(appState.network.todayMined);
    appState.elements.todayPower.textContent = formatPowerValue(appState.network.todayPower);
    appState.elements.estimatedTodayOutput.textContent = formatMiningNumber(estimatedTodayOutput);
    appState.elements.remainingSupply.textContent = formatMiningNumber(appState.network.remainingSupply);
    appState.elements.halvingCycle.textContent = `${appState.network.currentHalvingCycle} / 25`;
    appState.elements.nextHalvingDate.textContent = appState.network.nextHalvingDate;
    appState.elements.estimatedFinish.textContent = appState.locale === 'zh'
      ? `${formatMiningNumber(appState.network.estimatedFinishYears)} 年`
      : `${formatMiningNumber(appState.network.estimatedFinishYears)} Y`;
    renderClaimState(appState);
  }

  function renderInvitePanel(appState) {
    appState.elements.inviteCodeValue.textContent = appState.state.inviteCode;
    appState.elements.inviteCount.textContent = formatWholeNumber(appState.state.inviteCount);
    appState.elements.inviteBonus.textContent = formatPowerValue(appState.state.invitePowerBonus);
    appState.elements.inviteInput.disabled = Boolean(appState.state.boundInviteCode);
    appState.elements.inviteSubmitButton.disabled = Boolean(appState.state.boundInviteCode);
    appState.elements.inviteInput.value = appState.state.boundInviteCode || appState.elements.inviteInput.value;
  }

  function renderPurchasePanel(appState) {
    setPurchaseButtonsBusy(appState, appState.isPurchaseBusy, appState.activePurchaseTier);
    if (!appState.isPurchaseBusy) {
      showPurchaseStatus(appState, '');
    }
  }

  function createRecordCardHtml(title, meta, value) {
    return `
      <article class="p-mining-card p-mining-record-card">
        <h3 class="p-mining-record-card__title">${title}</h3>
        <div class="p-mining-record-card__meta">${meta}</div>
        <div class="p-mining-record-card__value">${value}</div>
      </article>
    `;
  }

  function renderRecordsPanel(appState) {
    let records = appState.state.claimRecords;
    if (appState.activeRecordFilter === 'invites') {
      records = appState.state.inviteRecords;
    } else if (appState.activeRecordFilter === 'power') {
      records = appState.state.powerChanges;
    }

    if (!records.length) {
      appState.elements.recordsList.innerHTML = createRecordCardHtml(t(appState.locale, 'noRecords'), t(appState.locale, 'noRecordMeta'), '0.0');
      return;
    }

    appState.elements.recordsList.innerHTML = records.map((item) => {
      if (appState.activeRecordFilter === 'invites') {
        return createRecordCardHtml(t(appState.locale, 'inviteTitle'), new Date(item.createdAt).toLocaleString('zh-CN'), `+${formatPowerValue(item.reward)}`);
      }
      if (appState.activeRecordFilter === 'power') {
        let title = t(appState.locale, 'reasonInitialPower');
        if (item.reason === '邀请奖励') {
          title = t(appState.locale, 'reasonInviteReward');
        } else if (item.reason === '购买算力') {
          title = t(appState.locale, 'reasonPurchasePower');
        } else if (item.reason === '邀请分成') {
          title = t(appState.locale, 'reasonInviteShare');
        }
        return createRecordCardHtml(title, new Date(item.createdAt).toLocaleString('zh-CN'), `+${formatPowerValue(item.delta)}`);
      }
      return createRecordCardHtml(t(appState.locale, 'claimTitle'), new Date(item.createdAt).toLocaleString('zh-CN'), `+${formatMiningNumber(item.reward)} P`);
    }).join('');
  }

  function renderProfilePanel(appState) {
    appState.elements.profileEmail.textContent = appState.hostUser.email;
    appState.elements.profileUid.textContent = `UID: ${appState.hostUser.uid}`;
    appState.elements.profileBalance.textContent = `${formatMiningNumber(appState.state.balance)} P`;
    appState.elements.profilePower.textContent = formatPowerValue(appState.state.power);
  }

  function renderAll(appState) {
    applyTranslations(appState);
    renderMiningPanel(appState);
    renderInvitePanel(appState);
    renderPurchasePanel(appState);
    renderRecordsPanel(appState);
    renderProfilePanel(appState);
  }

  function showInviteError(appState, message) {
    if (!message) {
      appState.elements.inviteError.hidden = true;
      appState.elements.inviteError.textContent = '';
      if (appState.elements.invitePromptError) {
        appState.elements.invitePromptError.hidden = true;
        appState.elements.invitePromptError.textContent = '';
      }
      return;
    }
    appState.elements.inviteError.hidden = false;
    appState.elements.inviteError.textContent = message;
    if (appState.elements.invitePromptError) {
      appState.elements.invitePromptError.hidden = false;
      appState.elements.invitePromptError.textContent = message;
    }
  }

  function shouldShowInvitePrompt(appState) {
    const todayInvitePromptDate = String(appState.todayInvitePromptDate || getInvitePromptDisplayDateKey()).trim();
    const lastInvitePromptDate = String(appState.lastInvitePromptDate || '').trim();
    return Boolean(
      appState.nexaSession
      && !appState.state.boundInviteCode
      && !appState.isInvitePromptDismissed
      && lastInvitePromptDate !== todayInvitePromptDate
    );
  }

  function openInvitePrompt(appState) {
    if (!appState.elements.invitePromptModal) return;
    appState.elements.invitePromptInput.value = appState.state.boundInviteCode || appState.elements.inviteInput.value || '';
    appState.elements.invitePromptModal.hidden = false;
    appState.lastInvitePromptDate = appState.todayInvitePromptDate || getInvitePromptDisplayDateKey();
    setLastInvitePromptDate(appState.storage, appState.lastInvitePromptDate);
    showInviteError(appState, '');
  }

  function closeInvitePrompt(appState) {
    if (!appState.elements.invitePromptModal) return;
    appState.isInvitePromptDismissed = true;
    appState.elements.invitePromptModal.hidden = true;
    showInviteError(appState, '');
  }

  function openInviteSuccessPrompt(appState) {
    if (!appState.elements.invitePromptSuccessModal) return;
    appState.elements.invitePromptSuccessModal.hidden = false;
  }

  function closeInviteSuccessPrompt(appState) {
    if (!appState.elements.invitePromptSuccessModal) return;
    appState.elements.invitePromptSuccessModal.hidden = true;
  }

  function ensureInviteInputVisible(appState, input) {
    const targetInput = input || null;
    if (!targetInput?.scrollIntoView) return;
    const targetContainer = appState.elements.invitePromptModal?.hidden === false
      ? targetInput.closest('.p-mining-modal__dialog')
      : targetInput.closest('.p-mining-card');
    const scrollTarget = targetContainer || targetInput;
    globalScope.window?.requestAnimationFrame?.(() => {
      globalScope.window.setTimeout(() => {
        scrollTarget.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 80);
    });
  }

  function attachInviteInputVisibilityHandlers(appState) {
    const inviteInputs = [
      appState.elements.inviteInput,
      appState.elements.invitePromptInput
    ].filter(Boolean);
    if (!inviteInputs.length) return;

    inviteInputs.forEach((input) => {
      input.addEventListener('focus', () => ensureInviteInputVisible(appState, input));
    });

    globalScope.window.visualViewport?.addEventListener('resize', () => {
      const activeInput = inviteInputs.find((input) => input === globalScope.document.activeElement);
      if (activeInput) {
        ensureInviteInputVisible(appState, activeInput);
      }
    });
  }

  async function ensureClaimAudioContext(appState) {
    if (!AudioContextCtor) return null;
    if (!appState.claimAudioContext) {
      try {
        appState.claimAudioContext = new AudioContextCtor({ latencyHint: 'interactive' });
      } catch {
        return null;
      }
    }
    if (appState.claimAudioContext.state === 'suspended') {
      try {
        await appState.claimAudioContext.resume();
      } catch {
        return null;
      }
    }
    return appState.claimAudioContext;
  }

  function warmClaimAudio(appState) {
    if (appState.claimAudioWarmPromise) return;
    appState.claimAudioWarmPromise = ensureClaimAudioContext(appState).finally(() => {
      appState.claimAudioWarmPromise = null;
    });
  }

  function playClaimSuccessSound(appState) {
    void ensureClaimAudioContext(appState).then((audioContext) => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(CLAIM_SOUND_FREQUENCY_HZ, now);
      oscillator.frequency.exponentialRampToValueAtTime(CLAIM_SOUND_FREQUENCY_HZ * 1.18, now + CLAIM_SOUND_DURATION_SECONDS);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + CLAIM_SOUND_DURATION_SECONDS);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + CLAIM_SOUND_DURATION_SECONDS);
    }).catch(() => {});
  }

  async function handleClaimButtonClick(appState) {
    if (appState.isProcessing) {
      renderClaimState(appState);
      return;
    }
    if (!appState.nexaSession) {
      await beginNexaLoginFlow(appState, 'mining');
      return;
    }
    if (!canClaim({ lastClaimAt: appState.state.lastClaimAt, now: Date.now() })) {
      renderClaimState(appState);
      return;
    }

    appState.isProcessing = true;
    try {
      const response = await postJson('/api/p-mining/claim', {});
      if (response?.ok) {
        syncAppStateFromServer(appState, response);
        playClaimSuccessSound(appState);
        renderAll(appState);
      }
    } catch {
      renderClaimState(appState);
    } finally {
      appState.isProcessing = false;
    }
  }

  async function handleInviteSubmit(appState) {
    if (!appState.nexaSession) {
      await beginNexaLoginFlow(appState, 'invite');
      return;
    }
    try {
      const inviteCode = String(appState.elements.invitePromptModal?.hidden === false
        ? appState.elements.invitePromptInput.value
        : appState.elements.inviteInput.value);
      const response = await postJson('/api/p-mining/invite/bind', {
        inviteCode
      });
      if (response?.ok) {
        syncAppStateFromServer(appState, response);
        appState.isInvitePromptDismissed = false;
        appState.elements.inviteInput.value = appState.state.boundInviteCode || '';
        if (appState.elements.invitePromptInput) {
          appState.elements.invitePromptInput.value = appState.state.boundInviteCode || '';
        }
        if (appState.elements.invitePromptModal?.hidden === false) {
          appState.elements.invitePromptModal.hidden = true;
          openInviteSuccessPrompt(appState);
        }
      }
      showInviteError(appState, '');
      renderAll(appState);
    } catch (error) {
      const message = String(error?.message || '').toUpperCase();
      if (message.includes('SELF_INVITE')) {
        showInviteError(appState, t(appState.locale, 'errorSelfInvite'));
      } else if (message.includes('ALREADY_BOUND')) {
        showInviteError(appState, t(appState.locale, 'errorAlreadyBound'));
      } else if (message.includes('INVALID_INVITE')) {
        showInviteError(appState, t(appState.locale, 'errorInvalidInvite'));
      } else {
        showInviteError(appState, t(appState.locale, 'errorEmptyInvite'));
      }
    }
  }

  function handleCopyInviteCode(appState) {
    const text = appState.state.inviteCode;
    if (globalScope.navigator?.clipboard?.writeText) {
      globalScope.navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  async function queryPMiningPaymentOrder(orderNo) {
    return postJson('/api/p-mining/payment/query', {
      orderNo: String(orderNo || '').trim()
    });
  }

  async function pollPMiningPaymentOrder(orderNo) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < PAYMENT_QUERY_TIMEOUT_MS) {
      const response = await queryPMiningPaymentOrder(orderNo);
      const status = String(response?.status || '').trim().toUpperCase();
      if (status === 'SUCCESS') return response;
      if (status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED') return response;
      await new Promise((resolve) => globalScope.window.setTimeout(resolve, PAYMENT_QUERY_INTERVAL_MS));
    }
    return {
      ok: true,
      orderNo: String(orderNo || '').trim(),
      status: 'PENDING'
    };
  }

  async function settlePendingPaymentOrder(appState) {
    const pendingOrder = loadPendingPaymentOrder(appState.storage);
    if (!pendingOrder?.orderNo || !pendingOrder?.tier) return false;
    if (hasSettledPaymentOrder(appState.storage, pendingOrder.orderNo)) {
      clearPendingPaymentOrder(appState.storage);
      return false;
    }

    const response = await pollPMiningPaymentOrder(pendingOrder.orderNo);
    const status = String(response?.status || '').trim().toUpperCase();
    if (status !== 'SUCCESS') {
      if (status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED') {
        clearPendingPaymentOrder(appState.storage);
      }
      return false;
    }

    const bootstrap = await loadPMiningBootstrap().catch(() => null);
    if (bootstrap?.ok) {
      syncAppStateFromServer(appState, bootstrap);
    }
    saveSettledPaymentReceipt(appState.storage, {
      orderNo: pendingOrder.orderNo,
      tier: pendingOrder.tier,
      settledAt: Date.now()
    });
    clearPendingPaymentOrder(appState.storage);
    renderAll(appState);
    return true;
  }

  async function handlePurchasePower(appState, tier) {
    if (appState.isPurchaseBusy) return;
    if (!appState.nexaSession) {
      beginNexaLoginFlow(appState, 'purchase').catch(() => {});
      return;
    }
    const option = POWER_PURCHASE_OPTIONS[String(tier || '').trim()] || null;
    if (!option) return;
    setPurchaseButtonsBusy(appState, true, option.id);
    showPurchaseStatus(appState, t(appState.locale, 'purchaseOpening'));
    try {
      const orderResponse = await postJson('/api/p-mining/payment/create', {
        openId: appState.nexaSession.openId,
        sessionKey: appState.nexaSession.sessionKey,
        tier: option.id
      });
      savePendingPaymentOrder(appState.storage, {
        orderNo: orderResponse.orderNo,
        tier: option.id,
        power: option.power,
        usdtAmount: option.usdtAmount,
        createdAt: Date.now()
      });
      setPurchaseButtonsBusy(appState, false);
      showPurchaseStatus(appState, '');
      openNexaPaymentUrl(appState, buildNexaPaymentUrl(orderResponse.payment));
    } catch (error) {
      setPurchaseButtonsBusy(appState, false);
      showPurchaseStatus(appState, String(error?.message || t(appState.locale, 'purchaseCreateFailed')), { isError: true });
    }
  }

  function attachRecordFilters(appState) {
    appState.elements.recordFilterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.activeRecordFilter = button.dataset.recordFilter;
        appState.elements.recordFilterButtons.forEach((item) => {
          item.classList.toggle('is-active', item === button);
        });
        renderRecordsPanel(appState);
      });
    });
  }

  async function syncPMiningServerSession(session) {
    const response = await postJson('/api/p-mining/session', {
      openId: String(session?.openId || '').trim(),
      sessionKey: String(session?.sessionKey || '').trim(),
      nickname: String(session?.nickname || 'Nexa User').trim(),
      avatar: String(session?.avatar || '').trim()
    });
    return response.session || null;
  }

  async function loadServerPMiningSession() {
    try {
      const response = await getJson('/api/p-mining/session');
      return response.session || null;
    } catch (error) {
      if (Number(error?.statusCode || 0) === 401) return null;
      return null;
    }
  }

  function syncAppStateFromServer(appState, payload) {
    const profile = payload?.profile || {};
    const account = payload?.account || {};
    const records = payload?.records || {};
    const network = payload?.network || {};
    if (profile.openId) {
      appState.hostUser = createHostUserFromSession({
        openId: String(profile.openId || '').trim(),
        nickname: String(profile.nickname || 'Nexa User').trim(),
        avatar: String(profile.avatar || '').trim()
      });
    }
    appState.state = {
      ...appState.state,
      uid: appState.hostUser.uid,
      balance: Number(account.balance || 0) || 0,
      power: Number(account.power || 0) || 0,
      inviteCode: String(account.inviteCode || '').trim(),
      boundInviteCode: String(account.boundInviteCode || '').trim(),
      inviteCount: Number(account.inviteCount || 0) || 0,
      invitePowerBonus: Number(account.invitePowerBonus || 0) || 0,
      claimRecords: Array.isArray(records.claims) ? records.claims : [],
      inviteRecords: Array.isArray(records.invites) ? records.invites : [],
      powerChanges: Array.isArray(records.power) ? records.power : [],
      lastClaimAt: Number(account.lastClaimAt || 0) || 0
    };
    appState.network = {
      ...appState.network,
      totalUsers: Number(network.totalUsers || 0) || 0,
      totalMined: Number(network.totalMined || 0) || 0,
      todayMined: Number(network.todayMined || 0) || 0,
      todayPower: Number(network.todayPower || 0) || 0,
      remainingSupply: Number(network.remainingSupply || 0) || 0,
      currentHalvingCycle: Number(network.currentHalvingCycle || 1) || 1,
      nextHalvingDate: String(network.nextHalvingDate || appState.network.nextHalvingDate || '').trim(),
      estimatedFinishYears: Number(network.estimatedFinishYears || 0) || 0,
      dailyCap: Number(network.dailyCap || appState.network.dailyCap || DAILY_CAP) || DAILY_CAP
    };
  }

  async function loadPMiningBootstrap() {
    return getJson('/api/p-mining/bootstrap');
  }

  async function beginNexaLoginFlow(appState, targetTab = 'profile') {
    if (!isNexaAppEnvironment()) {
      globalScope.window.alert('请在 Nexa Pay 中授权登录。');
      return false;
    }
    setPendingAuthTarget(appState.storage, targetTab);
    launchNexaUrl(buildNexaAuthorizeUrl());
    return true;
  }

  async function exchangePMiningSessionFromUrlCode(appState) {
    const authCode = extractAuthCodeFromUrl();
    if (!authCode) return false;
    appState.isAuthorizing = true;
    try {
      const response = await postJson('/api/nexa/tip/session', {
        authCode,
        gameSlug: 'p-mining'
      });
      const session = {
        openId: String(response.session?.openId || '').trim(),
        sessionKey: String(response.session?.sessionKey || '').trim(),
        nickname: 'Nexa User',
        avatar: '',
        savedAt: Date.now()
      };
      const serverSession = await syncPMiningServerSession(session);
      applyAuthorizedSession(appState, serverSession || session);
      const bootstrap = await loadPMiningBootstrap().catch(() => null);
      if (bootstrap?.ok) {
        syncAppStateFromServer(appState, bootstrap);
      }
      clearAuthCodeFromUrl();
      const targetTab = readPendingAuthTarget(appState.storage) || 'profile';
      clearPendingAuthTarget(appState.storage);
      renderAll(appState);
      switchTab(appState, targetTab);
      return true;
    } catch {
      clearAuthCodeFromUrl();
      clearPendingAuthTarget(appState.storage);
      clearCachedPMiningSession(appState.storage);
      return false;
    } finally {
      appState.isAuthorizing = false;
    }
  }

  async function handleProtectedTabNavigation(appState, nextTab) {
    if (nextTab !== 'profile' && nextTab !== 'purchase') {
      switchTab(appState, nextTab);
      return;
    }
    const cachedSession = appState.nexaSession || loadCachedPMiningSession(appState.storage);
    if (cachedSession) {
      appState.nexaSession = cachedSession;
      switchTab(appState, nextTab);
      if (appState.nexaSession) {
        void loadPMiningBootstrap()
          .then((bootstrap) => {
            if (!bootstrap?.ok) return;
            syncAppStateFromServer(appState, bootstrap);
            renderAll(appState);
          })
          .catch(() => {});
      }
      return;
    }
    await beginNexaLoginFlow(appState, nextTab);
  }

  function createBrowserApp(root) {
    const storage = getPersistentStorage();
    const cachedSession = loadCachedPMiningSession(storage);
    const requiresFreshNexaAuthorization = shouldForceFreshNexaAuthorization({
      isNexaEnvironment: hasNexaEnvironmentMarker(),
      hasAuthCode: Boolean(extractAuthCodeFromUrl()),
      cachedSession
    });
    const activeSession = cachedSession;
    const hostUser = activeSession ? createHostUserFromSession(activeSession) : getMockNexaUser();
    const appState = {
      hostUser,
      storage,
      nexaSession: activeSession,
      requiresFreshNexaAuthorization,
      locale: getStoredLocale(storage),
      todayInvitePromptDate: getInvitePromptDisplayDateKey(),
      lastInvitePromptDate: getLastInvitePromptDate(storage),
      state: loadMiningState(storage, hostUser),
      network: loadNetworkStats(storage),
      activeTab: 'mining',
      activeRecordFilter: 'claims',
      animatedBalanceValue: Number(hostUser?.balance || 0) || 0,
      balanceAnimationFrame: null,
      hasAnimatedBalance: false,
      isProcessing: false,
      isInvitePromptDismissed: false,
      isPurchaseBusy: false,
      activePurchaseTier: '',
      claimAudioContext: null,
      claimAudioWarmPromise: null,
      isAuthorizing: false,
      elements: {
        panels: Array.from(root.querySelectorAll('[data-tab]')),
        navButtons: Array.from(root.querySelectorAll('[data-tab-target]')),
        recordFilterButtons: Array.from(root.querySelectorAll('[data-record-filter]')),
        localeButtons: Array.from(root.querySelectorAll('[data-locale-toggle]')),
        translatableNodes: Array.from(root.querySelectorAll('[data-i18n]')),
        placeholderNodes: Array.from(root.querySelectorAll('[data-i18n-placeholder]')),
        balanceValue: root.querySelector('#pMiningBalanceValue'),
        powerValue: root.querySelector('#pMiningPowerValue'),
        rewardPerMinute: root.querySelector('#pMiningRewardPerMinute'),
        claimButton: root.querySelector('#pMiningClaimButton'),
        claimCountdown: root.querySelector('#pMiningClaimCountdown'),
        claimHint: root.querySelector('#pMiningClaimHint'),
        totalUsers: root.querySelector('#pMiningTotalUsers'),
        totalMined: root.querySelector('#pMiningTotalMined'),
        todayMined: root.querySelector('#pMiningTodayMined'),
        todayPower: root.querySelector('#pMiningTodayPower'),
        estimatedTodayOutput: root.querySelector('#pMiningEstimatedTodayOutput'),
        remainingSupply: root.querySelector('#pMiningRemainingSupply'),
        halvingCycle: root.querySelector('#pMiningHalvingCycle'),
        nextHalvingDate: root.querySelector('#pMiningNextHalvingDate'),
        estimatedFinish: root.querySelector('#pMiningEstimatedFinish'),
        inviteCodeValue: root.querySelector('#pMiningInviteCodeValue'),
            inviteCount: root.querySelector('#pMiningInviteCount'),
            inviteBonus: root.querySelector('#pMiningInviteBonus'),
            purchasePanel: root.querySelector('#pMiningPurchasePanel'),
            purchaseStatus: root.querySelector('#pMiningPurchaseStatus'),
            purchaseButtons: Array.from(root.querySelectorAll('[data-purchase-tier]')),
        inviteInput: root.querySelector('#pMiningInviteInput'),
        inviteSubmitButton: root.querySelector('#pMiningInviteSubmitButton'),
        inviteError: root.querySelector('#pMiningInviteError'),
        invitePromptModal: root.querySelector('#pMiningInvitePromptModal'),
        invitePromptClose: root.querySelector('#pMiningInvitePromptClose'),
        invitePromptInput: root.querySelector('#pMiningInvitePromptInput'),
        invitePromptSubmit: root.querySelector('#pMiningInvitePromptSubmit'),
        invitePromptError: root.querySelector('#pMiningInvitePromptError'),
        invitePromptSuccessModal: root.querySelector('#pMiningInvitePromptSuccessModal'),
        invitePromptSuccessClose: root.querySelector('#pMiningInvitePromptSuccessClose'),
        recordsList: root.querySelector('#pMiningRecordsList'),
        profileEmail: root.querySelector('#pMiningProfileEmail'),
        profileUid: root.querySelector('#pMiningProfileUid'),
        profileBalance: root.querySelector('#pMiningProfileBalance'),
        profilePower: root.querySelector('#pMiningProfilePower'),
        copyInviteButton: root.querySelector('#pMiningCopyInviteButton'),
        logoutButton: root.querySelector('#pMiningLogoutButton')
      }
    };

    appState.elements.navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        handleProtectedTabNavigation(appState, button.dataset.tabTarget).catch(() => {});
      });
    });
    appState.elements.localeButtons.forEach((button) => {
      button.addEventListener('click', () => toggleLanguage(appState, button.dataset.localeToggle));
    });
    appState.elements.claimButton?.addEventListener('pointerdown', () => warmClaimAudio(appState), { passive: true });
    appState.elements.claimButton?.addEventListener('touchstart', () => warmClaimAudio(appState), { passive: true });
    appState.elements.claimButton?.addEventListener('click', () => handleClaimButtonClick(appState).catch(() => {}));
    appState.elements.inviteSubmitButton?.addEventListener('click', () => handleInviteSubmit(appState).catch(() => {}));
    appState.elements.invitePromptSubmit?.addEventListener('click', () => handleInviteSubmit(appState).catch(() => {}));
    appState.elements.invitePromptClose?.addEventListener('click', () => closeInvitePrompt(appState));
    root.querySelectorAll('[data-modal-close="invite-prompt"]').forEach((node) => {
      node.addEventListener('click', () => closeInvitePrompt(appState));
    });
    appState.elements.invitePromptSuccessClose?.addEventListener('click', () => closeInviteSuccessPrompt(appState));
    root.querySelectorAll('[data-modal-close="invite-success"]').forEach((node) => {
      node.addEventListener('click', () => closeInviteSuccessPrompt(appState));
    });
    appState.elements.copyInviteButton?.addEventListener('click', () => handleCopyInviteCode(appState));
    appState.elements.purchaseButtons.forEach((button) => {
      button.addEventListener('click', () => {
        handlePurchasePower(appState, button.dataset.purchaseTier).catch(() => {});
      });
    });
    appState.elements.logoutButton?.addEventListener('click', () => {
      clearCachedPMiningSession(appState.storage);
      clearPendingAuthTarget(appState.storage);
      postJson('/api/p-mining/session/logout', {}).catch(() => {});
      appState.nexaSession = null;
      appState.hostUser = getMockNexaUser();
      appState.state = createDefaultMiningState(appState.hostUser);
      saveMiningState(appState.storage, appState.state);
      saveNetworkStats(appState.storage, appState.network);
      showInviteError(appState, '');
      renderAll(appState);
      switchTab(appState, 'mining');
    });
    attachInviteInputVisibilityHandlers(appState);
    attachRecordFilters(appState);
    renderAll(appState);
    switchTab(appState, 'mining');
    if (shouldShowInvitePrompt(appState)) {
      openInvitePrompt(appState);
    }
    root.classList.add('is-ready');

    globalScope.window.setInterval(() => {
      renderClaimState(appState);
    }, 1000);

    return appState;
  }

  async function bootBrowser() {
    if (!globalScope.document) return;
    const root = globalScope.document.querySelector('[data-p-mining-app]');
    if (!root) return;
    const appState = createBrowserApp(root);
    const exchanged = await exchangePMiningSessionFromUrlCode(appState);
    if (!exchanged && appState.nexaSession) {
      const bootstrap = await loadPMiningBootstrap().catch(() => null);
      if (bootstrap?.ok) {
        syncAppStateFromServer(appState, bootstrap);
        renderAll(appState);
        if (shouldShowInvitePrompt(appState)) {
          openInvitePrompt(appState);
        }
      }
    }
    if (!exchanged && !appState.nexaSession) {
      const serverSession = await loadServerPMiningSession();
      if (serverSession) {
        applyAuthorizedSession(appState, serverSession);
        const bootstrap = await loadPMiningBootstrap().catch(() => null);
        if (bootstrap?.ok) {
          syncAppStateFromServer(appState, bootstrap);
          renderAll(appState);
          if (shouldShowInvitePrompt(appState)) {
            openInvitePrompt(appState);
          }
        }
      } else if (isNexaAppEnvironment()) {
        await beginNexaLoginFlow(appState, 'mining').catch(() => false);
      }
    }
    await settlePendingPaymentOrder(appState).catch(() => false);
  }

  const exported = {
    TOTAL_SUPPLY,
    DAILY_CAP,
    CLAIM_COOLDOWN_MS,
    getMockNexaUser,
    normalizeHostUser,
    createDefaultMiningState,
    createDefaultNetworkStats,
    formatMiningNumber,
    formatWholeNumber,
    formatPowerValue,
    getStoredLocale,
    getInvitePromptDisplayDateKey,
    getPMiningSessionExpiryTimestamp,
    loadCachedPMiningSession,
    shouldForceFreshNexaAuthorization,
    POWER_PURCHASE_OPTIONS,
    calculateClaimReward,
    calculateEstimatedTodayOutput,
    buildNexaPaymentUrl,
    advanceNetworkStats,
    canClaim,
    getClaimCooldownRemainingSeconds,
    applyClaimResult,
    purchasePowerPackage,
    bindInviteCode,
    applyPendingInvitePurchaseBonuses,
    loadPendingPaymentOrder,
    savePendingPaymentOrder,
    clearPendingPaymentOrder,
    saveSettledPaymentReceipt,
    hasSettledPaymentOrder,
    loadMiningState,
    loadNetworkStats,
    saveNetworkStats,
    getClaimUiState,
        applyTranslations,
        toggleLanguage,
        switchTab,
        shouldShowInvitePrompt,
        openInvitePrompt,
        closeInvitePrompt,
        openInviteSuccessPrompt,
        ensureInviteInputVisible,
        attachInviteInputVisibilityHandlers,
        syncAppStateFromServer,
    loadPMiningBootstrap,
    renderClaimState,
    handleClaimButtonClick,
        handleInviteSubmit,
        handleCopyInviteCode,
        renderRecordsPanel,
        renderProfilePanel,
    beginNexaLoginFlow,
    settlePendingPaymentOrder
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }

  if (globalScope.window) {
    globalScope.window.PMiningPrototype = exported;
    bootBrowser().catch(() => {});
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
