const crypto = require('node:crypto');

const DEFAULT_NEXA_API_BASE_URL = String(process.env.NEXA_API_BASE_URL || 'https://merchantapi.nexaexworth.com').trim();
const DEFAULT_NEXA_API_KEY = String(process.env.NEXA_API_KEY || 'NEXA2033522880098676737').trim();
const DEFAULT_NEXA_APP_SECRET = String(process.env.NEXA_APP_SECRET || '0eebb98fa14d403d8567f0bf5bb5dd80TOSPAMDN').trim();
const DEFAULT_NEXA_CURRENCY = 'USDT';

function normalizeNexaBaseUrl(value = DEFAULT_NEXA_API_BASE_URL) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function createNonce(size = 16) {
  return crypto.randomBytes(Math.max(8, Math.ceil(size / 2))).toString('hex').slice(0, size);
}

function normalizeSignatureValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function buildNexaSignature(input, appSecret = DEFAULT_NEXA_APP_SECRET) {
  const secret = String(appSecret || '').trim();
  if (!secret) {
    throw new Error('Nexa app secret 未配置');
  }

  const pairs = Object.entries(input || {})
    .map(([key, value]) => [String(key || '').trim(), normalizeSignatureValue(value)])
    .filter(([key, value]) => key && value !== '' && key !== 'signature')
    .sort(([left], [right]) => left.localeCompare(right, 'en'));

  const source = `${pairs.map(([key, value]) => `${key}=${value}`).join('&')}&key=${secret}`;
  return crypto.createHash('sha256').update(source).digest('hex').toUpperCase();
}

function withSignature(payload, appSecret) {
  return {
    ...payload,
    signature: buildNexaSignature(payload, appSecret)
  };
}

function buildNexaAccessTokenPayload({ apiKey = DEFAULT_NEXA_API_KEY, appSecret = DEFAULT_NEXA_APP_SECRET, code, nonce, timestamp }) {
  return withSignature(
    {
      apiKey: String(apiKey || '').trim(),
      code: String(code || '').trim(),
      nonce: String(nonce || createNonce()).trim(),
      timestamp: String(timestamp || Date.now()).trim()
    },
    appSecret
  );
}

function buildNexaUserInfoPayload({ apiKey = DEFAULT_NEXA_API_KEY, appSecret = DEFAULT_NEXA_APP_SECRET, sessionKey, nonce, timestamp }) {
  return withSignature(
    {
      apiKey: String(apiKey || '').trim(),
      sessionKey: String(sessionKey || '').trim(),
      nonce: String(nonce || createNonce()).trim(),
      timestamp: String(timestamp || Date.now()).trim()
    },
    appSecret
  );
}

function buildNexaPaymentCreatePayload({
  apiKey = DEFAULT_NEXA_API_KEY,
  appSecret = DEFAULT_NEXA_APP_SECRET,
  orderNo,
  amount,
  currency = DEFAULT_NEXA_CURRENCY,
  callbackUrl,
  subject,
  body,
  notifyUrl,
  returnUrl,
  openId,
  sessionKey,
  nonce,
  timestamp
}) {
  const payload = withSignature(
    {
      apiKey: String(apiKey || '').trim(),
      amount: String(amount || '').trim(),
      sessionKey: String(sessionKey || '').trim(),
      currency: String(currency || DEFAULT_NEXA_CURRENCY).trim(),
      callbackUrl: String(callbackUrl || '').trim(),
      notifyUrl: String(notifyUrl || '').trim(),
      returnUrl: String(returnUrl || '').trim(),
      subject: String(subject || '').trim(),
      body: String(body || '').trim(),
      openid: String(openId || '').trim(),
      timestamp: String(timestamp || Date.now()).trim(),
      nonce: String(nonce || createNonce()).trim()
    },
    appSecret
  );
  if (orderNo) {
    payload.orderNo = String(orderNo).trim();
  }
  return payload;
}

function buildNexaPaymentCreatePayloadVariants(options = {}) {
  const common = {
    apiKey: String(options.apiKey || DEFAULT_NEXA_API_KEY).trim(),
    amount: String(options.amount || '').trim(),
    sessionKey: String(options.sessionKey || '').trim(),
    currency: String(options.currency || DEFAULT_NEXA_CURRENCY).trim(),
    callbackUrl: String(options.callbackUrl || '').trim(),
    notifyUrl: String(options.notifyUrl || '').trim(),
    returnUrl: String(options.returnUrl || '').trim(),
    subject: String(options.subject || '').trim(),
    body: String(options.body || '').trim(),
    timestamp: String(options.timestamp || Date.now()).trim(),
    nonce: String(options.nonce || createNonce()).trim()
  };
  const appSecret = String(options.appSecret || DEFAULT_NEXA_APP_SECRET).trim();
  const orderNo = String(options.orderNo || '').trim();
  const openId = String(options.openId || '').trim();

  const strictGithubPayload = withSignature(
    {
      ...common,
      openid: openId
    },
    appSecret
  );
  if (orderNo) {
    strictGithubPayload.orderNo = orderNo;
  }

  const phpSamplePayload = withSignature(
    {
      ...common,
      orderNo,
      openid: openId
    },
    appSecret
  );
  if (orderNo) {
    phpSamplePayload.orderNo = orderNo;
  }

  return [strictGithubPayload, phpSamplePayload];
}

function isNexaSignatureError(response = {}) {
  const code = String(response?.code ?? '').trim();
  const message = String(response?.message || response?.error || '').trim();
  return code === '10000002' || code === '1002' || /签名/.test(message);
}

function buildNexaPaymentQueryPayload({ apiKey = DEFAULT_NEXA_API_KEY, appSecret = DEFAULT_NEXA_APP_SECRET, orderNo, nonce, timestamp }) {
  return withSignature(
    {
      apiKey: String(apiKey || '').trim(),
      orderNo: String(orderNo || '').trim(),
      timestamp: String(timestamp || Date.now()).trim(),
      nonce: String(nonce || createNonce()).trim()
    },
    appSecret
  );
}

async function postNexaJson(endpointPath, payload, options = {}) {
  const baseUrl = normalizeNexaBaseUrl(options.baseUrl || DEFAULT_NEXA_API_BASE_URL);
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || 15000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const rawText = await response.text();
    let json = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const message = String(json?.message || json?.error || rawText || `HTTP ${response.status}`).trim();
      throw new Error(`Nexa 请求失败：${message}`);
    }

    if (!json || typeof json !== 'object') {
      throw new Error('Nexa 返回了无效响应');
    }

    return json;
  } finally {
    clearTimeout(timer);
  }
}

function unwrapNexaResult(response, fallbackMessage = 'Nexa 接口返回失败') {
  const code = String(response?.code ?? '');
  if (code === '0') {
    return response?.data ?? {};
  }
  const message = String(response?.message || fallbackMessage).trim();
  const error = new Error(message || fallbackMessage);
  error.code = code;
  error.details = response;
  throw error;
}

function extractSessionKey(payload = {}) {
  return String(payload.sessionKey || payload.session_key || payload.session || '').trim();
}

function extractOpenId(payload = {}) {
  return String(payload.openId || payload.open_id || payload.openid || '').trim();
}

module.exports = {
  DEFAULT_NEXA_API_BASE_URL,
  DEFAULT_NEXA_API_KEY,
  DEFAULT_NEXA_APP_SECRET,
  DEFAULT_NEXA_CURRENCY,
  normalizeNexaBaseUrl,
  createNonce,
  buildNexaSignature,
  buildNexaAccessTokenPayload,
  buildNexaUserInfoPayload,
  buildNexaPaymentCreatePayload,
  buildNexaPaymentCreatePayloadVariants,
  buildNexaPaymentQueryPayload,
  postNexaJson,
  unwrapNexaResult,
  isNexaSignatureError,
  extractSessionKey,
  extractOpenId
};
