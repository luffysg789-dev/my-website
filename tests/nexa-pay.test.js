const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNexaSignature,
  buildNexaPaymentCreatePayload,
  buildNexaPaymentCreatePayloadVariants,
  isNexaSignatureError,
  buildNexaAccessTokenPayload,
  buildNexaUserInfoPayload
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

  assert.equal(variants.length, 2);
  assert.equal(variants[0].openid, 'open-id-123');
  assert.equal(variants[0].callbackUrl, 'https://claw800.com/gomoku/');
  assert.equal(variants[0].orderNo, 'partner-order-001');
  assert.equal(variants[1].openid, 'open-id-123');
  assert.equal(variants[1].callbackUrl, 'https://claw800.com/gomoku/');
  assert.equal(variants[1].orderNo, 'partner-order-001');
  assert.notEqual(variants[0].signature, variants[1].signature);
});

test('isNexaSignatureError detects common signature error responses', () => {
  assert.equal(isNexaSignatureError({ code: '10000002', message: '签名错误' }), true);
  assert.equal(isNexaSignatureError({ code: '1002', message: '签名验证失败' }), true);
  assert.equal(isNexaSignatureError({ code: '0', message: 'success' }), false);
});
