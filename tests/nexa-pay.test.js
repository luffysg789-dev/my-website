const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNexaSignature,
  buildNexaPaymentCreatePayload,
  buildNexaPaymentCreatePayloadVariants,
  prioritizeNexaPaymentCreateVariants,
  isNexaSignatureError,
  isNexaRateLimitError,
  buildNexaAccessTokenPayload,
  buildNexaUserInfoPayload,
  buildNexaWithdrawalCreatePayload,
  buildNexaWithdrawalQueryPayload
} = require('../src/nexa-pay');

test('buildNexaSignature sorts params and appends secret before sha256 hashing', () => {
  const signature = buildNexaSignature(
    {
      timestamp: '1615887873123',
      nonce: 'abc123',
      apiKey: 'testAppKey'
    },
    'testAppSecret'
  );

  assert.equal(signature, '2C01DE8F1EAE280380157845D7DC3730F303D310698CF131C163E1F9D6EF5DE3');
});

test('buildNexaAccessTokenPayload signs the auth code request fields', () => {
  const payload = buildNexaAccessTokenPayload({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    code: 'auth-code-123',
    nonce: 'nonce-1',
    timestamp: '1615887873123'
  });

  assert.deepEqual(payload, {
    apiKey: 'testAppKey',
    code: 'auth-code-123',
    nonce: 'nonce-1',
    timestamp: '1615887873123',
    signature: buildNexaSignature(
      {
        apiKey: 'testAppKey',
        code: 'auth-code-123',
        nonce: 'nonce-1',
        timestamp: '1615887873123'
      },
      'testAppSecret'
    )
  });
});

test('buildNexaUserInfoPayload signs apiKey sessionKey nonce and timestamp', () => {
  const payload = buildNexaUserInfoPayload({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    sessionKey: 'session-123',
    nonce: 'nonce-2',
    timestamp: '1615887873123'
  });

  assert.equal(payload.apiKey, 'testAppKey');
  assert.equal(payload.sessionKey, 'session-123');
  assert.equal(
    payload.signature,
    buildNexaSignature(
      {
        apiKey: 'testAppKey',
        sessionKey: 'session-123',
        nonce: 'nonce-2',
        timestamp: '1615887873123'
      },
      'testAppSecret'
    )
  );
});

test('buildNexaWithdrawalCreatePayload exposes the Nexa withdrawal create payload shape', () => {
  const payload = buildNexaWithdrawalCreatePayload({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    orderNo: 'withdraw-001',
    amount: '12.34',
    currency: 'USDT',
    openId: 'open-id-123',
    notifyUrl: 'https://claw800.com/api/xiangqi/withdraw/notify',
    remark: 'withdraw test',
    nonce: 'nonce-4',
    timestamp: '1615887873123'
  });

  assert.deepEqual(payload, {
    apiKey: 'testAppKey',
    orderNo: 'withdraw-001',
    amount: '12.34',
    currency: 'USDT',
    openid: 'open-id-123',
    notifyUrl: 'https://claw800.com/api/xiangqi/withdraw/notify',
    remark: 'withdraw test',
    nonce: 'nonce-4',
    timestamp: '1615887873123',
    signature: buildNexaSignature(
      {
        orderNo: 'withdraw-001',
        apiKey: 'testAppKey',
        amount: '12.34',
        currency: 'USDT',
        openid: 'open-id-123',
        notifyUrl: 'https://claw800.com/api/xiangqi/withdraw/notify',
        remark: 'withdraw test',
        nonce: 'nonce-4',
        timestamp: '1615887873123'
      },
      'testAppSecret'
    )
  });
});

test('buildNexaWithdrawalQueryPayload exposes the Nexa withdrawal query payload shape', () => {
  const payload = buildNexaWithdrawalQueryPayload({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    orderNo: 'withdraw-001',
    nonce: 'nonce-5',
    timestamp: '1615887873123'
  });

  assert.deepEqual(payload, {
    apiKey: 'testAppKey',
    orderNo: 'withdraw-001',
    nonce: 'nonce-5',
    timestamp: '1615887873123',
    signature: buildNexaSignature(
      {
        apiKey: 'testAppKey',
        orderNo: 'withdraw-001',
        nonce: 'nonce-5',
        timestamp: '1615887873123'
      },
      'testAppSecret'
    )
  });
});

test('buildNexaPaymentCreatePayload uses official payment fields for a 0.10 USDT tip order', () => {
  const payload = buildNexaPaymentCreatePayload({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    orderNo: 'partner-order-001',
    amount: '0.10',
    currency: 'USDT',
    subject: 'Claw800 打赏',
    body: '打赏 五子棋',
    callbackUrl: 'https://claw800.com/gomoku/',
    notifyUrl: 'https://claw800.com/api/nexa/tip/notify',
    returnUrl: 'https://claw800.com/gomoku/',
    openId: 'open-id-123',
    sessionKey: 'session-123',
    nonce: 'nonce-3',
    timestamp: '1615887873123'
  });

  assert.deepEqual(payload, {
    apiKey: 'testAppKey',
    orderNo: 'partner-order-001',
    openid: 'open-id-123',
    amount: '0.10',
    sessionKey: 'session-123',
    currency: 'USDT',
    callbackUrl: 'https://claw800.com/gomoku/',
    notifyUrl: 'https://claw800.com/api/nexa/tip/notify',
    returnUrl: 'https://claw800.com/gomoku/',
    subject: 'Claw800 打赏',
    body: '打赏 五子棋',
    timestamp: '1615887873123',
    nonce: 'nonce-3',
    signature: buildNexaSignature(
      {
        apiKey: 'testAppKey',
        orderNo: 'partner-order-001',
        amount: '0.10',
        sessionKey: 'session-123',
        currency: 'USDT',
        callbackUrl: 'https://claw800.com/gomoku/',
        notifyUrl: 'https://claw800.com/api/nexa/tip/notify',
        returnUrl: 'https://claw800.com/gomoku/',
        subject: 'Claw800 打赏',
        body: '打赏 五子棋',
        openid: 'open-id-123',
        timestamp: '1615887873123',
        nonce: 'nonce-3'
      },
      'testAppSecret'
    )
  });
});

test('buildNexaPaymentCreatePayloadVariants covers both documented payment payload styles', () => {
  const variants = buildNexaPaymentCreatePayloadVariants({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    orderNo: 'partner-order-001',
    amount: '0.10',
    currency: 'USDT',
    subject: 'Claw800 打赏',
    body: '打赏 五子棋',
    callbackUrl: 'https://claw800.com/gomoku/',
    notifyUrl: 'https://claw800.com/api/nexa/tip/notify',
    returnUrl: 'https://claw800.com/gomoku/',
    openId: 'open-id-123',
    sessionKey: 'session-123',
    nonce: 'nonce-3',
    timestamp: '1615887873123'
  });

  assert.equal(variants.length, 4);
  assert.equal(variants[0].name, 'github-doc-strict');
  assert.equal(variants[0].payload.openid, 'open-id-123');
  assert.equal(variants[0].payload.callbackUrl, 'https://claw800.com/gomoku/');
  assert.equal(variants[0].payload.orderNo, 'partner-order-001');

  assert.equal(variants[1].name, 'github-doc-order-signed');
  assert.equal(variants[1].payload.openid, 'open-id-123');
  assert.equal(variants[1].payload.callbackUrl, 'https://claw800.com/gomoku/');
  assert.equal(variants[1].payload.orderNo, 'partner-order-001');

  assert.equal(variants[2].name, 'github-java-sample');
  assert.equal(variants[2].payload.openid, 'open-id-123');
  assert.equal(variants[2].payload.callbackUrl, undefined);
  assert.equal(variants[2].payload.orderNo, 'partner-order-001');

  assert.equal(variants[3].name, 'github-php-sample');
  assert.equal(variants[3].payload.openid, undefined);
  assert.equal(variants[3].payload.sessionKey, undefined);
  assert.equal(variants[3].payload.orderNo, 'partner-order-001');

  assert.notEqual(variants[1].payload.signature, variants[2].payload.signature);
});

test('prioritizeNexaPaymentCreateVariants tries the preferred variant first and limits fallback attempts', () => {
  const variants = buildNexaPaymentCreatePayloadVariants({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    orderNo: 'partner-order-001',
    amount: '0.10',
    currency: 'USDT',
    subject: 'Claw800 打赏',
    body: '打赏 五子棋',
    callbackUrl: 'https://claw800.com/gomoku/',
    notifyUrl: 'https://claw800.com/api/nexa/tip/notify',
    returnUrl: 'https://claw800.com/gomoku/',
    openId: 'open-id-123',
    sessionKey: 'session-123',
    nonce: 'nonce-3',
    timestamp: '1615887873123'
  });

  const ordered = prioritizeNexaPaymentCreateVariants(variants, 'github-java-sample');

  assert.deepEqual(
    ordered.map((item) => item.name),
    ['github-java-sample', 'github-doc-strict', 'github-doc-order-signed']
  );
});

test('prioritizeNexaPaymentCreateVariants prefers github-doc-strict by default', () => {
  const variants = buildNexaPaymentCreatePayloadVariants({
    apiKey: 'testAppKey',
    appSecret: 'testAppSecret',
    orderNo: 'partner-order-001',
    amount: '0.10',
    currency: 'USDT',
    subject: 'Claw800 打赏',
    body: '打赏 五子棋',
    callbackUrl: 'https://claw800.com/gomoku/',
    notifyUrl: 'https://claw800.com/api/nexa/tip/notify',
    returnUrl: 'https://claw800.com/gomoku/',
    openId: 'open-id-123',
    sessionKey: 'session-123',
    nonce: 'nonce-3',
    timestamp: '1615887873123'
  });

  const prioritized = prioritizeNexaPaymentCreateVariants(variants);
  assert.equal(prioritized[0].name, 'github-doc-strict');
  assert.equal(prioritized[1].name, 'github-doc-order-signed');
});

test('isNexaSignatureError detects common signature error responses', () => {
  assert.equal(isNexaSignatureError({ code: '10000002', message: '签名错误' }), true);
  assert.equal(isNexaSignatureError({ code: '1002', message: '签名验证失败' }), true);
  assert.equal(isNexaSignatureError({ code: '0', message: 'success' }), false);
});

test('isNexaRateLimitError detects http 429 errors without treating signature failures as rate limits', () => {
  const err = new Error('Nexa 请求失败：HTTP 429');
  err.statusCode = 429;

  assert.equal(isNexaRateLimitError(err), true);
  assert.equal(isNexaRateLimitError({ statusCode: 429 }), true);
  assert.equal(isNexaRateLimitError({ code: '10000002', message: '签名错误' }), false);
});
