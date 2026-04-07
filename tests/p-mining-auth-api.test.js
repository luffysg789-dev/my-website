const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');
const nexaPayModulePath = path.join(__dirname, '..', 'src', 'nexa-pay.js');

function createHarness({ mockPaymentResponse, mockQueryResponse, seedNexaEnv = true } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-p-mining-auth-api-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;
  const previousNexaApiKey = process.env.NEXA_API_KEY;
  const previousNexaAppSecret = process.env.NEXA_APP_SECRET;

  process.env.CLAW800_DB_PATH = dbPath;
  if (seedNexaEnv) {
    process.env.NEXA_API_KEY = process.env.NEXA_API_KEY || 'test-nexa-api-key';
    process.env.NEXA_APP_SECRET = process.env.NEXA_APP_SECRET || 'test-nexa-app-secret';
  }
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];
  delete require.cache[require.resolve(nexaPayModulePath)];

  const nexaPay = require(nexaPayModulePath);
  if (mockPaymentResponse || mockQueryResponse) {
    nexaPay.postNexaJson = async (endpointPath, payload) => {
      if (endpointPath === '/partner/api/openapi/payment/create' && mockPaymentResponse) {
        return mockPaymentResponse(payload);
      }
      if (endpointPath === '/partner/api/openapi/payment/query' && mockQueryResponse) {
        return mockQueryResponse(payload);
      }
      throw new Error(`Unexpected Nexa endpoint: ${endpointPath}`);
    };
    nexaPay.unwrapNexaResult = (response, fallbackMessage = 'Nexa failed') => {
      if (String(response?.code ?? '') === '0') {
        return response.data || {};
      }
      throw new Error(String(response?.message || fallbackMessage));
    };
  }

  const db = require(dbModulePath);
  const app = require(serverModulePath);

  return {
    db,
    async request(method, routePath, body, options = {}) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = { ...(options.headers || {}) };
        req.connection = {};
        req.socket = {};
        req.body = body;
        req.query = {};
        req.cookies = { ...(options.cookies || {}) };

        const [pathname, queryString = ''] = routePath.split('?');
        req.path = pathname;
        const params = new URLSearchParams(queryString);
        for (const [key, value] of params.entries()) {
          req.query[key] = value;
        }

        const res = new EventEmitter();
        res.statusCode = 200;
        res.headers = {};
        res.locals = {};
        res.setHeader = function setHeader(name, value) {
          this.headers[String(name).toLowerCase()] = value;
        };
        res.getHeader = function getHeader(name) {
          return this.headers[String(name).toLowerCase()];
        };
        res.removeHeader = function removeHeader(name) {
          delete this.headers[String(name).toLowerCase()];
        };
        res.status = function status(code) {
          this.statusCode = code;
          return this;
        };
        res.cookie = function cookie(name, value, opts = {}) {
          const serialized = JSON.stringify({ name, value, opts });
          const current = this.headers['set-cookie'];
          if (!current) {
            this.headers['set-cookie'] = [serialized];
          } else {
            current.push(serialized);
          }
          return this;
        };
        res.clearCookie = function clearCookie(name, opts = {}) {
          return this.cookie(name, '', { ...opts, expires: new Date(0), maxAge: 0 });
        };
        res.json = function json(payload) {
          resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
          return this;
        };
        res.end = function end(chunk) {
          let payload = chunk;
          if (Buffer.isBuffer(payload)) payload = payload.toString('utf8');
          if (payload === undefined || payload === null || payload === '') {
            resolve({ statusCode: this.statusCode, body: null, headers: this.headers });
            return;
          }
          resolve({ statusCode: this.statusCode, body: String(payload), headers: this.headers });
        };

        app.handle(req, res, reject);
        req.emit('end');
      });
    },
    cleanup() {
      db.close();
      delete require.cache[require.resolve(serverModulePath)];
      delete require.cache[require.resolve(dbModulePath)];
      delete require.cache[require.resolve(nexaPayModulePath)];
      if (previousDbPath === undefined) {
        delete process.env.CLAW800_DB_PATH;
      } else {
        process.env.CLAW800_DB_PATH = previousDbPath;
      }
      if (previousNexaApiKey === undefined) {
        delete process.env.NEXA_API_KEY;
      } else {
        process.env.NEXA_API_KEY = previousNexaApiKey;
      }
      if (previousNexaAppSecret === undefined) {
        delete process.env.NEXA_APP_SECRET;
      } else {
        process.env.NEXA_APP_SECRET = previousNexaAppSecret;
      }
    }
  };
}

test('p-mining session sync sets a 30-day cookie and returns the session payload', async () => {
  const harness = createHarness();

  try {
    const response = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-1',
      sessionKey: 'p-mining-session-key-1',
      nickname: 'Nexa Miner'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.session.openId, 'p-mining-open-id-1');
    assert.equal(response.body.session.nickname, 'Nexa Miner');
    assert.equal(Array.isArray(response.headers['set-cookie']), true);
    assert.match(response.headers['set-cookie'][0], /"maxAge":2592000000/);
  } finally {
    harness.cleanup();
  }
});

test('p-mining current session reads from the auth cookie', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-2',
      sessionKey: 'p-mining-session-key-2',
      nickname: 'Cookie Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    const response = await harness.request('GET', '/api/p-mining/session', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.session.openId, 'p-mining-open-id-2');
  } finally {
    harness.cleanup();
  }
});

test('p-mining bootstrap creates a backend account and returns synced account state', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-bootstrap',
      sessionKey: 'p-mining-session-key-bootstrap',
      nickname: 'Bootstrap Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    const response = await harness.request('GET', '/api/p-mining/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.account.power, 10);
    assert.equal(response.body.account.balance, 0);
    assert.equal(response.body.account.inviteCount, 0);
    assert.equal(typeof response.body.account.inviteCode, 'string');
    assert.match(response.body.account.inviteCode, /^\d{6}$/);
    assert.equal(response.body.records.power.length >= 1, true);
    assert.equal(response.body.network.totalUsers, 1);
  } finally {
    harness.cleanup();
  }
});

test('admin site config can store Nexa credentials and public config only returns the apiKey when env vars are absent', async () => {
  const previousNexaApiKey = process.env.NEXA_API_KEY;
  const previousNexaAppSecret = process.env.NEXA_APP_SECRET;
  delete process.env.NEXA_API_KEY;
  delete process.env.NEXA_APP_SECRET;
  const harness = createHarness({ seedNexaEnv: false });

  try {
    const login = await harness.request('POST', '/api/admin/login', { password: '123456' });
    assert.equal(login.statusCode, 200);
    const serialized = JSON.parse(login.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    const save = await harness.request(
      'PUT',
      '/api/admin/site-config',
      {
        title: 'claw800.com',
        subtitleZh: '',
        subtitleEn: '',
        htmlTitleZh: '',
        htmlTitleEn: '',
        icon: '',
        logo: '',
        skillsPageTitleZh: '',
        skillsPageTitleEn: '',
        skillsPageSubtitleZh: '',
        skillsPageSubtitleEn: '',
        skillsPageBotLabelZh: '',
        skillsPageBotLabelEn: '',
        skillsPageBotPromptZh: '',
        skillsPageBotPromptEn: '',
        skillsPageInstallPromptZh: '',
        skillsPageInstallPromptEn: '',
        footerCopyrightZh: '',
        footerCopyrightEn: '',
        footerLinksRaw: '',
        footerContactZh: '',
        footerContactEn: '',
        nexaApiKey: 'admin-runtime-api-key',
        nexaAppSecret: 'admin-runtime-app-secret'
      },
      { cookies }
    );
    assert.equal(save.statusCode, 200);

    const config = await harness.request('GET', '/api/nexa/public-config');
    assert.equal(config.statusCode, 200);
    assert.equal(config.body.ok, true);
    assert.equal(config.body.apiKey, 'admin-runtime-api-key');
    assert.equal('appSecret' in config.body, false);

    const adminConfig = await harness.request('GET', '/api/admin/site-config', null, { cookies });
    assert.equal(adminConfig.statusCode, 200);
    assert.equal(adminConfig.body.nexaApiKey, 'admin-runtime-api-key');
    assert.equal(adminConfig.body.hasNexaAppSecret, true);
    assert.equal(adminConfig.body.nexaAppSecret, '');

    const keepSave = await harness.request(
      'PUT',
      '/api/admin/site-config',
      {
        ...adminConfig.body,
        title: 'claw800.com',
        keepNexaAppSecret: true,
        nexaAppSecret: ''
      },
      { cookies }
    );
    assert.equal(keepSave.statusCode, 200);

    const storedSecret = harness.db.prepare(`SELECT value FROM settings WHERE key = 'nexa_app_secret'`).get();
    assert.equal(storedSecret.value, 'admin-runtime-app-secret');
  } finally {
    harness.cleanup();
    if (previousNexaApiKey === undefined) {
      delete process.env.NEXA_API_KEY;
    } else {
      process.env.NEXA_API_KEY = previousNexaApiKey;
    }
    if (previousNexaAppSecret === undefined) {
      delete process.env.NEXA_APP_SECRET;
    } else {
      process.env.NEXA_APP_SECRET = previousNexaAppSecret;
    }
  }
});

test('p-mining bootstrap network stats add 1-3 synthetic users on random 3-10 minute intervals and advance mined totals too', async () => {
  const baseNow = 1_710_000_000_000;
  const originalNow = Date.now;
  Date.now = () => baseNow;
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-network-growth',
      sessionKey: 'p-mining-session-key-network-growth',
      nickname: 'Growth Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    const initial = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
    Date.now = () => baseNow + (30 * 60_000);
    const next = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
    const grownUsers = next.body.network.totalUsers - initial.body.network.totalUsers;

    assert.ok(grownUsers >= 1);
    assert.ok(grownUsers <= 30);
    assert.equal(
      next.body.network.todayPower - initial.body.network.todayPower,
      grownUsers * 10
    );
    assert.ok(Number(next.body.network.todayMined || 0) > Number(initial.body.network.todayMined || 0));
    assert.ok(Number(next.body.network.totalMined || 0) > Number(initial.body.network.totalMined || 0));
  } finally {
    Date.now = originalNow;
    harness.cleanup();
  }
});

test('p-mining bootstrap persists the highest synthetic mined floor across server restarts on the same database', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-p-mining-mined-floor-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const originalNow = Date.now;
  const previousDbPath = process.env.CLAW800_DB_PATH;
  const baseNow = 1_710_000_000_000;

  Date.now = () => baseNow;
  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];
  delete require.cache[require.resolve(nexaPayModulePath)];

  let db = require(dbModulePath);
  let app = require(serverModulePath);

  async function request(appInstance, method, routePath, body, options = {}) {
    return new Promise((resolve, reject) => {
      const req = new EventEmitter();
      req.method = method;
      req.url = routePath;
      req.originalUrl = routePath;
      req.headers = { ...(options.headers || {}) };
      req.connection = {};
      req.socket = {};
      req.body = body;
      req.query = {};
      req.cookies = { ...(options.cookies || {}) };

      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.locals = {};
      res.setHeader = function setHeader(name, value) {
        this.headers[String(name).toLowerCase()] = value;
      };
      res.cookie = function cookie(name, value, opts = {}) {
        const serialized = JSON.stringify({ name, value, opts });
        const current = this.headers['set-cookie'];
        if (!current) {
          this.headers['set-cookie'] = [serialized];
        } else {
          current.push(serialized);
        }
        return this;
      };
      res.status = function status(code) {
        this.statusCode = code;
        return this;
      };
      res.json = function json(payload) {
        resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
        return this;
      };
      res.end = function end(payload) {
        resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
      };

      appInstance.handle(req, res, reject);
      req.emit('end');
    });
  }

  try {
    const syncResponse = await request(app, 'POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-mined-floor',
      sessionKey: 'p-mining-session-key-mined-floor',
      nickname: 'Mined Floor Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    Date.now = () => baseNow + (40 * 60_000);
    const firstBootstrap = await request(app, 'GET', '/api/p-mining/bootstrap', null, { cookies });
    const firstTodayMined = Number(firstBootstrap.body.network.todayMined || 0);
    const storedFloor = db.prepare("SELECT value FROM settings WHERE key = 'p_mining_today_mined_floor'").get();
    assert.ok(firstTodayMined > 0);
    assert.equal(Number(storedFloor?.value || 0), firstTodayMined);

    db.close();
    delete require.cache[require.resolve(serverModulePath)];
    delete require.cache[require.resolve(dbModulePath)];
    delete require.cache[require.resolve(nexaPayModulePath)];

    Date.now = () => baseNow + (5 * 60_000);
    db = require(dbModulePath);
    app = require(serverModulePath);

    const secondBootstrap = await request(app, 'GET', '/api/p-mining/bootstrap', null, { cookies });
    assert.ok(Number(secondBootstrap.body.network.todayMined || 0) >= firstTodayMined);
  } finally {
    Date.now = originalNow;
    db.close();
    delete require.cache[require.resolve(serverModulePath)];
    delete require.cache[require.resolve(dbModulePath)];
    delete require.cache[require.resolve(nexaPayModulePath)];
    if (previousDbPath === undefined) {
      delete process.env.CLAW800_DB_PATH;
    } else {
      process.env.CLAW800_DB_PATH = previousDbPath;
    }
  }
});

test('p-mining bootstrap persists the highest synthetic user floor across server restarts on the same database', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-p-mining-floor-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;
  const originalNow = Date.now;

  try {
    process.env.CLAW800_DB_PATH = dbPath;
    Date.now = () => new Date('2026-03-29T01:00:00+07:00').getTime();

    delete require.cache[require.resolve(dbModulePath)];
    delete require.cache[require.resolve(serverModulePath)];
    delete require.cache[require.resolve(nexaPayModulePath)];

    let db = require(dbModulePath);
    let app = require(serverModulePath);

    const request = (method, routePath, body, options = {}) => new Promise((resolve, reject) => {
      const req = new EventEmitter();
      req.method = method;
      req.url = routePath;
      req.originalUrl = routePath;
      req.headers = { ...(options.headers || {}) };
      req.connection = {};
      req.socket = {};
      req.body = body;
      req.query = {};
      req.cookies = { ...(options.cookies || {}) };

      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.locals = {};
      res.setHeader = function setHeader(name, value) {
        this.headers[String(name).toLowerCase()] = value;
      };
      res.getHeader = function getHeader(name) {
        return this.headers[String(name).toLowerCase()];
      };
      res.removeHeader = function removeHeader(name) {
        delete this.headers[String(name).toLowerCase()];
      };
      res.status = function status(code) {
        this.statusCode = code;
        return this;
      };
      res.cookie = function cookie(name, value, opts = {}) {
        const serialized = JSON.stringify({ name, value, opts });
        const current = this.headers['set-cookie'];
        if (!current) {
          this.headers['set-cookie'] = [serialized];
        } else {
          current.push(serialized);
        }
        return this;
      };
      res.clearCookie = function clearCookie(name, opts = {}) {
        return this.cookie(name, '', { ...opts, expires: new Date(0), maxAge: 0 });
      };
      res.json = function json(payload) {
        resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
        return this;
      };
      res.end = function end(chunk) {
        let payload = chunk;
        if (Buffer.isBuffer(payload)) payload = payload.toString('utf8');
        if (payload === undefined || payload === null || payload === '') {
          resolve({ statusCode: this.statusCode, body: null, headers: this.headers });
          return;
        }
        resolve({ statusCode: this.statusCode, body: String(payload), headers: this.headers });
      };

      app.handle(req, res, reject);
      req.emit('end');
    });

    const syncResponse = await request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-floor-persist',
      sessionKey: 'p-mining-session-key-floor-persist',
      nickname: 'Floor Persist Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    const firstBootstrap = await request('GET', '/api/p-mining/bootstrap', null, { cookies });
    const storedFloor = db.prepare("SELECT value FROM settings WHERE key = 'p_mining_total_users_floor'").get();
    assert.ok(Number(firstBootstrap.body.network.totalUsers || 0) >= 1);
    assert.equal(Number(storedFloor?.value || 0), Number(firstBootstrap.body.network.totalUsers || 0));

    Date.now = () => new Date('2026-03-29T00:10:00+07:00').getTime();
    db.close();
    delete require.cache[require.resolve(serverModulePath)];
    delete require.cache[require.resolve(dbModulePath)];
    delete require.cache[require.resolve(nexaPayModulePath)];
    db = require(dbModulePath);
    app = require(serverModulePath);

    const secondBootstrap = await request('GET', '/api/p-mining/bootstrap', null, { cookies });
    assert.ok(Number(secondBootstrap.body.network.totalUsers || 0) >= Number(firstBootstrap.body.network.totalUsers || 0));
  } finally {
    Date.now = originalNow;
    delete require.cache[require.resolve(serverModulePath)];
    delete require.cache[require.resolve(dbModulePath)];
    delete require.cache[require.resolve(nexaPayModulePath)];
    if (previousDbPath === undefined) {
      delete process.env.CLAW800_DB_PATH;
    } else {
      process.env.CLAW800_DB_PATH = previousDbPath;
    }
  }
});

test('p-mining bootstrap migrates legacy alphanumeric invite codes to 6-digit numeric codes', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-legacy-invite',
      sessionKey: 'p-mining-session-key-legacy-invite',
      nickname: 'Legacy Invite Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
    const userRow = harness.db.prepare("SELECT id FROM game_users WHERE openid = ?").get('p-mining-open-id-legacy-invite');
    harness.db.prepare("UPDATE p_mining_users SET invite_code = ? WHERE user_id = ?").run('AB12CD', userRow.id);

    const response = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.match(response.body.account.inviteCode, /^\d{6}$/);
    assert.doesNotMatch(response.body.account.inviteCode, /[A-Za-z]/);
  } finally {
    harness.cleanup();
  }
});

test('p-mining bootstrap expands invite code length when the local 6-digit sequence is exhausted', async () => {
  const harness = createHarness();

  try {
    for (let offset = 0; offset <= 20; offset += 1) {
      const syncResponse = await harness.request('POST', '/api/p-mining/session', {
        openId: `p-mining-open-id-seq-${offset}`,
        sessionKey: `p-mining-session-key-seq-${offset}`,
        nickname: `Sequence Miner ${offset}`
      });
      const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
      const cookies = {
        [serialized.name]: serialized.value
      };
      const bootstrapResponse = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
      const inviteCode = String(123456 + offset).padStart(6, '0');
      const userRow = harness.db.prepare("SELECT id FROM game_users WHERE openid = ?").get(`p-mining-open-id-seq-${offset}`);
      harness.db.prepare("UPDATE p_mining_users SET invite_code = ? WHERE user_id = ?").run(inviteCode, userRow.id);
      assert.equal(bootstrapResponse.statusCode, 200);
    }

    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-overflow-123456',
      sessionKey: 'p-mining-session-key-overflow-123456',
      nickname: 'Overflow Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    const response = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.match(response.body.account.inviteCode, /^\d{7,}$/);
  } finally {
    harness.cleanup();
  }
});

test('p-mining claim writes balance and claim records on the backend', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-claim',
      sessionKey: 'p-mining-session-key-claim',
      nickname: 'Claim Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    const claimResponse = await harness.request('POST', '/api/p-mining/claim', {}, { cookies });
    assert.equal(claimResponse.statusCode, 200);
    assert.equal(claimResponse.body.ok, true);
    assert.equal(claimResponse.body.account.balance > 0, true);
    assert.equal(claimResponse.body.records.claims.length, 1);

    const bootstrapResponse = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
    assert.equal(bootstrapResponse.body.account.balance, claimResponse.body.account.balance);
    assert.equal(bootstrapResponse.body.records.claims.length, 1);
    assert.equal(bootstrapResponse.body.account.firstClaimAt > 0, true);
    assert.equal(bootstrapResponse.body.network.firstMiningAt, bootstrapResponse.body.account.firstClaimAt);
  } finally {
    harness.cleanup();
  }
});

test('p-mining abnormal repeated claim attempts trigger a 7-day mining ban', async () => {
  const harness = createHarness();
  const realNow = Date.now;

  try {
    let now = 1710000000000;
    Date.now = () => now;

    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-risk-ban',
      sessionKey: 'p-mining-session-key-risk-ban',
      nickname: 'Risk Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    const claimResponse = await harness.request('POST', '/api/p-mining/claim', {}, { cookies });
    assert.equal(claimResponse.statusCode, 200);

    now += 500;
    assert.equal((await harness.request('POST', '/api/p-mining/claim', {}, { cookies })).statusCode, 409);
    now += 500;
    assert.equal((await harness.request('POST', '/api/p-mining/claim', {}, { cookies })).statusCode, 409);
    now += 500;
    const bannedResponse = await harness.request('POST', '/api/p-mining/claim', {}, { cookies });

    assert.equal(bannedResponse.statusCode, 423);
    assert.equal(bannedResponse.body.ok, false);
    assert.equal(bannedResponse.body.error, 'MINING_BANNED');
    assert.equal(typeof bannedResponse.body.banUntil, 'number');
    assert.match(String(bannedResponse.body.message || ''), /7 天|7 days/i);

    const bootstrapResponse = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
    assert.equal(bootstrapResponse.body.account.miningBanUntil, bannedResponse.body.banUntil);
    assert.equal(bootstrapResponse.body.account.riskScore >= 120, true);
  } finally {
    Date.now = realNow;
    harness.cleanup();
  }
});

test('p-mining requires a human confirmation after 10 hour-paced successful claims', async () => {
  const harness = createHarness();
  const realNow = Date.now;

  try {
    let now = 1720000000000;
    Date.now = () => now;

    const syncResponse = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-human-check',
      sessionKey: 'p-mining-session-key-human-check',
      nickname: 'Human Check Miner'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    const cookies = {
      [serialized.name]: serialized.value
    };

    for (let claimIndex = 0; claimIndex < 10; claimIndex += 1) {
      const claimResponse = await harness.request('POST', '/api/p-mining/claim', {}, { cookies });
      assert.equal(claimResponse.statusCode, 200);
      now += 60 * 60 * 1000;
    }

    const bootstrapResponse = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies });
    assert.equal(bootstrapResponse.statusCode, 200);
    assert.equal(bootstrapResponse.body.account.needHumanCheck, true);
    assert.equal(bootstrapResponse.body.account.claimStreakCount, 10);

    const blockedClaimResponse = await harness.request('POST', '/api/p-mining/claim', {}, { cookies });
    assert.equal(blockedClaimResponse.statusCode, 428);
    assert.equal(blockedClaimResponse.body.ok, false);
    assert.equal(blockedClaimResponse.body.error, 'HUMAN_CHECK_REQUIRED');

    const confirmResponse = await harness.request('POST', '/api/p-mining/human-check/confirm', {}, { cookies });
    assert.equal(confirmResponse.statusCode, 200);
    assert.equal(confirmResponse.body.ok, true);
    assert.equal(confirmResponse.body.account.needHumanCheck, false);
    assert.equal(confirmResponse.body.account.claimStreakCount, 0);
  } finally {
    Date.now = realNow;
    harness.cleanup();
  }
});

test('p-mining invite bind updates inviter and invitee accounts on the backend', async () => {
  const harness = createHarness();

  try {
    const inviterSession = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-inviter',
      sessionKey: 'p-mining-session-key-inviter',
      nickname: 'Inviter'
    });
    const inviterCookie = JSON.parse(inviterSession.headers['set-cookie'][0]);
    const inviterCookies = {
      [inviterCookie.name]: inviterCookie.value
    };
    const inviterBootstrap = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: inviterCookies });
    const inviteCode = inviterBootstrap.body.account.inviteCode;

    const inviteeSession = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-invitee',
      sessionKey: 'p-mining-session-key-invitee',
      nickname: 'Invitee'
    });
    const inviteeCookie = JSON.parse(inviteeSession.headers['set-cookie'][0]);
    const inviteeCookies = {
      [inviteeCookie.name]: inviteeCookie.value
    };
    await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: inviteeCookies });

    const bindResponse = await harness.request('POST', '/api/p-mining/invite/bind', {
      inviteCode
    }, { cookies: inviteeCookies });

    assert.equal(bindResponse.statusCode, 200);
    assert.equal(bindResponse.body.ok, true);
    assert.equal(bindResponse.body.account.power, 20);
    assert.equal(bindResponse.body.account.boundInviteCode, inviteCode);

    const inviterAfter = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: inviterCookies });
    assert.equal(inviterAfter.body.account.power, 20);
    assert.equal(inviterAfter.body.account.inviteCount, 1);
    assert.equal(inviterAfter.body.account.invitePowerBonus, 10);
  } finally {
    harness.cleanup();
  }
});

test('p-mining payment create returns a Nexa order payload for supported power tiers', async () => {
  const harness = createHarness({
    mockPaymentResponse(payload) {
      return {
        code: '0',
        data: {
          orderNo: 'nexa-paid-order-1',
          apiKey: String(payload.apiKey || ''),
          timestamp: '1710000000',
          nonce: 'nonce-create-1',
          signType: 'MD5',
          paySign: 'pay-sign-create-1'
        }
      };
    }
  });

  try {
    const response = await harness.request('POST', '/api/p-mining/payment/create', {
      openId: 'p-mining-open-id-3',
      sessionKey: 'p-mining-session-key-3',
      tier: 'starter'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.tier, 'starter');
    assert.equal(response.body.power, 100);
    assert.equal(response.body.amount, '10.00');
    assert.equal(response.body.currency, 'USDT');
    assert.equal(response.body.orderNo, 'nexa-paid-order-1');
    assert.equal(response.body.payment.orderNo, 'nexa-paid-order-1');
  } finally {
    harness.cleanup();
  }
});

test('p-mining payment create falls back to github variants after a legacy signature error', async () => {
  const seenPayloads = [];
  const harness = createHarness({
    mockPaymentResponse(payload) {
      seenPayloads.push(payload);
      if (seenPayloads.length === 1) {
        return {
          code: '10000002',
          message: '签名参数错误'
        };
      }
      return {
        code: '0',
        data: {
          orderNo: 'nexa-paid-order-fallback-1',
          apiKey: String(payload.apiKey || ''),
          timestamp: '1710000000',
          nonce: 'nonce-create-fallback-1',
          signType: 'MD5',
          paySign: 'pay-sign-fallback-1'
        }
      };
    }
  });

  try {
    const response = await harness.request('POST', '/api/p-mining/payment/create', {
      openId: 'p-mining-open-id-fallback',
      sessionKey: 'p-mining-session-key-fallback',
      tier: 'starter'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.orderNo, 'nexa-paid-order-fallback-1');
    assert.equal(seenPayloads.length, 2);
    assert.equal(Object.hasOwn(seenPayloads[0], 'callbackUrl'), false);
    assert.equal(Object.hasOwn(seenPayloads[1], 'callbackUrl'), true);
    assert.equal(String(seenPayloads[1].orderNo || '').startsWith('claw800_p_mining_starter_'), true);
  } finally {
    harness.cleanup();
  }
});

test('p-mining payment query returns normalized payment status', async () => {
  const harness = createHarness({
    mockQueryResponse(payload) {
      return {
        code: '0',
        data: {
          orderNo: String(payload.orderNo || ''),
          status: 'SUCCESS',
          amount: '80.00',
          currency: 'USDT',
          paidTime: '2026-03-29 10:00:00'
        }
      };
    }
  });

  try {
    const response = await harness.request('POST', '/api/p-mining/payment/query', {
      orderNo: 'nexa-paid-order-2'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.orderNo, 'nexa-paid-order-2');
    assert.equal(response.body.status, 'SUCCESS');
    assert.equal(response.body.amount, '80.00');
  } finally {
    harness.cleanup();
  }
});

test('p-mining successful payment query settles purchased power and inviter share on the backend', async () => {
  const harness = createHarness({
    mockPaymentResponse(payload) {
      return {
        code: '0',
        data: {
          orderNo: 'nexa-paid-order-settle-1',
          apiKey: String(payload.apiKey || ''),
          timestamp: '1710000000',
          nonce: 'nonce-create-settle-1',
          signType: 'MD5',
          paySign: 'pay-sign-settle-1'
        }
      };
    },
    mockQueryResponse(payload) {
      return {
        code: '0',
        data: {
          orderNo: String(payload.orderNo || ''),
          status: 'SUCCESS',
          amount: '80.00',
          currency: 'USDT',
          paidTime: '2026-03-29 10:00:00'
        }
      };
    }
  });

  try {
    const inviterSession = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-share-inviter',
      sessionKey: 'p-mining-session-key-share-inviter',
      nickname: 'Share Inviter'
    });
    const inviterCookie = JSON.parse(inviterSession.headers['set-cookie'][0]);
    const inviterCookies = {
      [inviterCookie.name]: inviterCookie.value
    };
    const inviterBootstrap = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: inviterCookies });
    const inviteCode = inviterBootstrap.body.account.inviteCode;

    const buyerSession = await harness.request('POST', '/api/p-mining/session', {
      openId: 'p-mining-open-id-share-buyer',
      sessionKey: 'p-mining-session-key-share-buyer',
      nickname: 'Share Buyer'
    });
    const buyerCookie = JSON.parse(buyerSession.headers['set-cookie'][0]);
    const buyerCookies = {
      [buyerCookie.name]: buyerCookie.value
    };
    await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: buyerCookies });
    await harness.request('POST', '/api/p-mining/invite/bind', { inviteCode }, { cookies: buyerCookies });

    const createOrder = await harness.request('POST', '/api/p-mining/payment/create', {
      openId: 'p-mining-open-id-share-buyer',
      sessionKey: 'p-mining-session-key-share-buyer',
      tier: 'boost'
    });
    assert.equal(createOrder.statusCode, 200);

    const settleOrder = await harness.request('POST', '/api/p-mining/payment/query', {
      orderNo: createOrder.body.orderNo
    });
    assert.equal(settleOrder.statusCode, 200);
    assert.equal(settleOrder.body.status, 'SUCCESS');

    const buyerAfter = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: buyerCookies });
    assert.equal(buyerAfter.body.account.power, 1020);
    assert.equal(buyerAfter.body.records.power[0].reason, '购买算力');

    const inviterAfter = await harness.request('GET', '/api/p-mining/bootstrap', null, { cookies: inviterCookies });
    assert.equal(inviterAfter.body.account.power, 120);
    assert.equal(inviterAfter.body.account.invitePowerBonus, 110);
    assert.equal(inviterAfter.body.records.power[0].reason, '邀请分成');
  } finally {
    harness.cleanup();
  }
});
