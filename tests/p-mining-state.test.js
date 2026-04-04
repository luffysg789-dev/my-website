const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const miningModule = require(path.join(__dirname, '..', 'public', 'p-mining', 'script.js'));

const {
  DAILY_CAP,
  TOTAL_SUPPLY,
  CLAIM_COOLDOWN_MS,
  getMockNexaUser,
  normalizeHostUser,
  createInviteCode,
  normalizeInviteCode,
  createDefaultMiningState,
  createDefaultNetworkStats,
  formatMiningNumber,
  calculateClaimReward,
  advanceNetworkStats,
  applyAutomaticNetworkGrowth,
  calculateRunningDays,
  canClaim,
  getClaimCooldownRemainingSeconds,
  applyClaimResult,
  bindInviteCode,
  loadMiningState,
  getClaimUiState,
  loadNetworkStats,
  saveNetworkStats,
  formatWholeNumber,
  formatPowerValue,
  getStoredLocale,
  getPMiningSessionExpiryTimestamp,
  loadCachedPMiningSession,
  shouldForceFreshNexaAuthorization,
  getInvitePromptDisplayDateKey,
  shouldShowInvitePrompt,
  purchasePowerPackage,
  applyPendingInvitePurchaseBonuses,
  POWER_PURCHASE_OPTIONS,
  calculateEstimatedTodayOutput,
  buildNexaPaymentUrl,
  loadPendingPaymentOrder,
  savePendingPaymentOrder,
  clearPendingPaymentOrder,
  saveSettledPaymentReceipt,
  hasSettledPaymentOrder
} = miningModule;

test('getMockNexaUser returns guest placeholder data before Nexa authorization', () => {
  const user = getMockNexaUser();

  assert.equal(typeof user.uid, 'string');
  assert.equal(typeof user.email, 'string');
  assert.equal(user.email, 'guest@nexa.app');
  assert.equal(user.networkConnected, false);
});

test('normalizeHostUser falls back to safe values when host payload is partial', () => {
  const user = normalizeHostUser({});

  assert.equal(typeof user.uid, 'string');
  assert.equal(typeof user.email, 'string');
  assert.equal(user.networkConnected, false);
});

test('createDefaultMiningState seeds balance, power, and invite code', () => {
  const state = createDefaultMiningState({ uid: 'user_1' });

  assert.equal(state.balance, 0);
  assert.equal(state.power, 10);
  assert.equal(typeof state.inviteCode, 'string');
  assert.equal(state.inviteCode.length, 6);
  assert.match(state.inviteCode, /^\d{6}$/);
});

test('normalizeInviteCode accepts 6 or more numeric digits for longer invite code overflow cases', () => {
  assert.equal(normalizeInviteCode('246810'), '246810');
  assert.equal(normalizeInviteCode('2468107'), '2468107');
  assert.equal(normalizeInviteCode(' 24-68107 '), '2468107');
  assert.equal(normalizeInviteCode('abc12'), '');
});

test('createInviteCode still defaults to a 6-digit numeric code for normal users', () => {
  assert.equal(createInviteCode('user_123456'), '123456');
  assert.match(createInviteCode('guest'), /^\d{6}$/);
});

test('formatMiningNumber rounds mining displays down to integers without decimals', () => {
  assert.equal(formatMiningNumber(12), '12');
  assert.equal(formatMiningNumber(12.34), '12');
});

test('formatWholeNumber rounds user counts to integers without decimals', () => {
  assert.equal(formatWholeNumber(1), '1');
  assert.equal(formatWholeNumber(29810.4), '29810');
});

test('formatPowerValue rounds power displays to integers without decimals', () => {
  assert.equal(formatPowerValue(10), '10');
  assert.equal(formatPowerValue(10.9), '10');
});

test('calculateClaimReward uses the specified mining formula', () => {
  const reward = calculateClaimReward({
    userPower: 1,
    networkPower: 1,
    dailyCap: DAILY_CAP
  });

  assert.equal(reward, 49942.9);
});

test('calculateEstimatedTodayOutput derives personal daily total from mining formula', () => {
  const estimated = calculateEstimatedTodayOutput({
    userPower: 10,
    networkPower: 10,
    dailyCap: DAILY_CAP
  });

  assert.equal(estimated, 71917808.0);
});

test('createDefaultNetworkStats uses supply and daily cap defaults', () => {
  const stats = createDefaultNetworkStats();

  assert.equal(stats.remainingSupply, TOTAL_SUPPLY);
  assert.equal(stats.dailyCap, DAILY_CAP);
  assert.equal(stats.todayPower, 10);
});

test('calculateRunningDays counts from the fixed 2026-03-29 launch date and increases by day', () => {
  const launchDayMorning = new Date(2026, 2, 29, 9, 0, 0).getTime();
  const aprilFourthMorning = new Date(2026, 3, 4, 9, 0, 0).getTime();
  const dayBeforeLaunch = new Date(2026, 2, 28, 9, 0, 0).getTime();

  assert.equal(calculateRunningDays(0, launchDayMorning), 1);
  assert.equal(calculateRunningDays(0, aprilFourthMorning), 7);
  assert.equal(calculateRunningDays(0, dayBeforeLaunch), 0);
});

test('advanceNetworkStats updates mined totals and remaining supply', () => {
  const next = advanceNetworkStats(createDefaultNetworkStats(), 60_000);

  assert.ok(next.totalMined > 0);
  assert.ok(next.todayMined > 0);
  assert.ok(next.remainingSupply < TOTAL_SUPPLY);
  assert.equal(next.totalUsers, 1);
  assert.equal(next.todayPower, 10);
});

test('applyAutomaticNetworkGrowth adds 1-3 users on random 3-10 minute intervals and increases total power accordingly', () => {
  const initial = {
    ...createDefaultNetworkStats(),
    lastAutoGrowthMinute: 100
  };

  const next = applyAutomaticNetworkGrowth(initial, (140 * 60_000) + 1234);
  const grownUsers = next.totalUsers - initial.totalUsers;

  assert.ok(grownUsers >= 4);
  assert.ok(grownUsers <= 30);
  assert.equal(next.todayPower, initial.todayPower + (grownUsers * 10));
  assert.ok(next.lastAutoGrowthMinute > 100);
  assert.ok(next.lastAutoGrowthMinute <= 140);
});

test('canClaim returns false during the 60-second cooldown', () => {
  const now = Date.now();

  assert.equal(canClaim({ lastClaimAt: now - 20_000, now }), false);
  assert.equal(canClaim({ lastClaimAt: now - CLAIM_COOLDOWN_MS - 1000, now }), true);
});

test('getClaimCooldownRemainingSeconds rounds up remaining time', () => {
  const now = Date.now();
  const remaining = getClaimCooldownRemainingSeconds({
    lastClaimAt: now - 25_000,
    now
  });

  assert.equal(remaining, 35);
});

test('getClaimUiState shows a full 60-second cooldown immediately after claim', () => {
  const claimedAt = 1710000000000;
  const ui = getClaimUiState({
    lastClaimAt: claimedAt,
    now: claimedAt
  });

  assert.equal(ui.remainingSeconds, 60);
  assert.equal(ui.countdownLabel, '60');
  assert.equal(ui.hintLabel, '冷却中');
  assert.equal(ui.isClaimable, false);
});

test('getClaimUiState uses plain second labels instead of hh:mm:ss', () => {
  const ready = getClaimUiState({
    lastClaimAt: 0,
    now: 1710000000000
  });
  const cooling = getClaimUiState({
    lastClaimAt: 1710000000000,
    now: 1710000005000
  });

  assert.equal(ready.countdownLabel, '60');
  assert.equal(cooling.countdownLabel, '55');
});

test('applyClaimResult updates balance, lastClaimAt, and claim records', () => {
  const baseState = createDefaultMiningState({ uid: 'user_1' });
  const next = applyClaimResult(baseState, {
    reward: 49942.9,
    claimedAt: 1710000000000
  });

  assert.equal(next.balance, 49942.9);
  assert.equal(next.lastClaimAt, 1710000000000);
  assert.equal(next.claimRecords[0].reward, 49942.9);
  assert.equal(next.claimRecords[0].power, 10);
});

test('bindInviteCode rejects self-binding and duplicate binding', () => {
  const baseState = createDefaultMiningState({ uid: 'user_1' });

  assert.throws(() => bindInviteCode(baseState, baseState.inviteCode), /self/i);

  const bound = bindInviteCode(baseState, '246810');
  assert.throws(() => bindInviteCode(bound, '135790'), /already bound/i);
});

test('bindInviteCode adds +10 power and records invite activity', () => {
  const baseState = createDefaultMiningState({ uid: 'user_1' });
  const next = bindInviteCode(baseState, '246810');

  assert.equal(next.power, 20);
  assert.equal(next.invitePowerBonus, 10);
  assert.equal(next.inviteCount, 1);
  assert.equal(next.inviteRecords.length, 1);
  assert.equal(next.powerChanges[0].delta, 10);
});

test('purchasePowerPackage adds purchased power and records the purchase reason', () => {
  const baseState = createDefaultMiningState({ uid: 'buyer_1' });
  const next = purchasePowerPackage(baseState, {
    tier: 'starter',
    purchasedAt: 1710000000000
  });

  assert.equal(POWER_PURCHASE_OPTIONS.starter.power, 100);
  assert.equal(next.power, 110);
  assert.equal(next.powerChanges[0].delta, 100);
  assert.equal(next.powerChanges[0].reason, '购买算力');
  assert.equal(next.powerChanges[0].usdtAmount, 10);
});

test('applyPendingInvitePurchaseBonuses credits 10 percent referral power and logs it', () => {
  const baseState = createDefaultMiningState({ uid: 'inviter_1' });
  const next = applyPendingInvitePurchaseBonuses(baseState, [
    {
      sourceUid: 'invitee_1',
      purchasedPower: 1000,
      bonusPower: 100,
      createdAt: 1710000000000
    }
  ]);

  assert.equal(next.power, 110);
  assert.equal(next.invitePowerBonus, 100);
  assert.equal(next.powerChanges[0].delta, 100);
  assert.equal(next.powerChanges[0].reason, '邀请分成');
});

test('loadMiningState falls back safely when storage is corrupt', () => {
  const storage = {
    getItem() {
      return '{bad-json';
    }
  };

  const state = loadMiningState(storage, getMockNexaUser());
  assert.equal(state.balance, 0);
  assert.equal(state.power, 10);
});

test('network stats persist through storage and survive reloads', () => {
  const memory = new Map();
  const storage = {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    }
  };

  const initial = createDefaultNetworkStats();
  const next = {
    ...initial,
    totalMined: 88888.8,
    todayMined: 1234.5,
    remainingSupply: TOTAL_SUPPLY - 88888.8
  };

  saveNetworkStats(storage, next);
  const restored = loadNetworkStats(storage);

  assert.equal(restored.totalMined, 88888.8);
  assert.equal(restored.todayMined, 1234.5);
  assert.equal(restored.remainingSupply, TOTAL_SUPPLY - 88888.8);
});

test('getStoredLocale falls back to english and accepts zh toggle', () => {
  const storage = {
    getItem() {
      return 'zh';
    }
  };

  assert.equal(getStoredLocale(storage), 'zh');
  assert.equal(getStoredLocale({ getItem() { return 'fr'; } }), 'en');
});

test('p-mining nexa session expiry stays valid for 30 days from savedAt', () => {
  const savedAt = 1710000000000;
  assert.equal(
    getPMiningSessionExpiryTimestamp({ savedAt }),
    savedAt + 30 * 24 * 60 * 60 * 1000
  );
});

test('loadCachedPMiningSession returns null when the saved nexa session is expired', () => {
  const expired = {
    openId: 'nexa-open-id-1',
    sessionKey: 'session-key-1',
    savedAt: Date.now() - (31 * 24 * 60 * 60 * 1000)
  };

  const storage = {
    getItem() {
      return JSON.stringify(expired);
    },
    removeItem() {}
  };

  assert.equal(loadCachedPMiningSession(storage), null);
});

test('shouldForceFreshNexaAuthorization forces a fresh Nexa check before reusing a cached in-app session', () => {
  assert.equal(
    shouldForceFreshNexaAuthorization({
      isNexaEnvironment: true,
      hasAuthCode: false,
      cachedSession: {
        openId: 'open-id-1',
        sessionKey: 'session-key-1'
      }
    }),
    true
  );

  assert.equal(
    shouldForceFreshNexaAuthorization({
      isNexaEnvironment: true,
      hasAuthCode: true,
      cachedSession: {
        openId: 'open-id-1',
        sessionKey: 'session-key-1'
      }
    }),
    false
  );

  assert.equal(
    shouldForceFreshNexaAuthorization({
      isNexaEnvironment: false,
      hasAuthCode: false,
      cachedSession: {
        openId: 'open-id-1',
        sessionKey: 'session-key-1'
      }
    }),
    false
  );
});

test('getInvitePromptDisplayDateKey normalizes the local date used for daily invite prompts', () => {
  assert.equal(getInvitePromptDisplayDateKey(new Date('2026-04-01T08:30:00Z')), '2026-04-01');
});

test('shouldShowInvitePrompt only opens once per day for unbound logged-in users', () => {
  assert.equal(
    shouldShowInvitePrompt({
      nexaSession: { openId: 'open-id-1', sessionKey: 'session-key-1' },
      state: { boundInviteCode: '' },
      lastInvitePromptDate: '',
      todayInvitePromptDate: '2026-04-01'
    }),
    true
  );

  assert.equal(
    shouldShowInvitePrompt({
      nexaSession: { openId: 'open-id-1', sessionKey: 'session-key-1' },
      state: { boundInviteCode: '' },
      lastInvitePromptDate: '2026-04-01',
      todayInvitePromptDate: '2026-04-01'
    }),
    false
  );

  assert.equal(
    shouldShowInvitePrompt({
      nexaSession: { openId: 'open-id-1', sessionKey: 'session-key-1' },
      state: { boundInviteCode: '246810' },
      lastInvitePromptDate: '',
      todayInvitePromptDate: '2026-04-01'
    }),
    false
  );
});

test('buildNexaPaymentUrl serializes Nexa order payload for payment deep link', () => {
  const url = buildNexaPaymentUrl({
    orderNo: 'nexa-order-1',
    paySign: 'pay-sign-1',
    signType: 'MD5',
    apiKey: 'api-key-1',
    nonce: 'nonce-1',
    timestamp: '1710000000'
  }, 'https://example.com/p-mining/');

  assert.match(url, /^nexaauth:\/\/order\?/);
  assert.match(url, /orderNo=nexa-order-1/);
  assert.match(url, /paySign=pay-sign-1/);
  assert.match(url, /redirectUrl=https%3A%2F%2Fexample\.com%2Fp-mining%2F/);
});

test('pending payment order persists through storage and can be cleared', () => {
  const memory = new Map();
  const storage = {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    },
    removeItem(key) {
      memory.delete(key);
    }
  };

  savePendingPaymentOrder(storage, {
    orderNo: 'pmining-order-1',
    tier: 'starter',
    power: 10,
    createdAt: 1710000000000
  });

  assert.equal(loadPendingPaymentOrder(storage).orderNo, 'pmining-order-1');
  clearPendingPaymentOrder(storage);
  assert.equal(loadPendingPaymentOrder(storage), null);
});

test('settled payment receipts prevent duplicate local power settlement', () => {
  const memory = new Map();
  const storage = {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    }
  };

  assert.equal(hasSettledPaymentOrder(storage, 'paid-order-1'), false);
  saveSettledPaymentReceipt(storage, {
    orderNo: 'paid-order-1',
    tier: 'boost',
    settledAt: 1710000000000
  });
  assert.equal(hasSettledPaymentOrder(storage, 'paid-order-1'), true);
});
