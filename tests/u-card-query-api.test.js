const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-u-card-query-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;

  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];

  const db = require(dbModulePath);
  const app = require(serverModulePath);

  return {
    db,
    async request(method, routePath, body, cookies = {}) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = {};
        req.connection = {};
        req.socket = {};
        req.body = body;
        req.cookies = { ...cookies };
        req.query = {};

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
        res.cookie = function cookie(name, value) {
          this.headers['set-cookie'] = [`${name}=${value}`];
          return this;
        };
        res.clearCookie = function clearCookie(name) {
          this.headers['set-cookie'] = [`${name}=; Max-Age=0`];
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
        res.end = function end(chunk) {
          resolve({ statusCode: this.statusCode, body: chunk || null, headers: this.headers });
          return this;
        };

        app.handle(req, res, reject);
        req.emit('end');
      });
    },
    cleanup() {
      db.close();
      delete require.cache[require.resolve(serverModulePath)];
      delete require.cache[require.resolve(dbModulePath)];
      if (previousDbPath === undefined) {
        delete process.env.CLAW800_DB_PATH;
      } else {
        process.env.CLAW800_DB_PATH = previousDbPath;
      }
    }
  };
}

async function loginAdmin(harness) {
  const response = await harness.request('POST', '/api/admin/login', { password: '123456' });
  assert.equal(response.statusCode, 200);
  const serialized = response.headers['set-cookie'][0];
  const [pair] = serialized.split(';');
  const [name, value] = pair.split('=');
  return { [name]: value };
}

test('U card query seeds default platforms and returns cards for a selected platform without login', async () => {
  const harness = createHarness();
  try {
    const publicPlatforms = await harness.request('GET', '/api/u-card/platforms');
    assert.equal(publicPlatforms.statusCode, 200);
    assert.deepEqual(
      publicPlatforms.body.items.map((item) => item.name),
      [
        'ChatGPT',
        'Anthropic',
        'Grok',
        'Gemini',
        'Codex',
        'Google',
        'Amazon',
        'Telegram',
        'PlayStation',
        'Midjourney',
        'eBay',
        'Notion',
        'Tiktok',
        'X',
        'SUNO',
        'Sora'
      ]
    );

    const cookies = await loginAdmin(harness);
    const chatgpt = publicPlatforms.body.items.find((item) => item.name === 'ChatGPT');
    const sora = publicPlatforms.body.items.find((item) => item.name === 'Sora');
    const created = await harness.request(
      'POST',
      '/api/admin/u-card/cards',
      { name: 'Wild AI Card', bin: '438888', issuerRegion: '美国', platformIds: [chatgpt.id, sora.id] },
      cookies
    );
    assert.equal(created.statusCode, 200);
    assert.equal(created.body.ok, true);

    const lookup = await harness.request('GET', `/api/u-card/platforms/${chatgpt.id}/cards`);
    assert.equal(lookup.statusCode, 200);
    assert.deepEqual(lookup.body.items, [
      {
        id: created.body.item.id,
        name: 'Wild AI Card',
        bin: '438888',
        issuer_region: '美国'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('admin can edit U card platforms and cards', async () => {
  const harness = createHarness();
  try {
    const cookies = await loginAdmin(harness);
    const platforms = await harness.request('GET', '/api/admin/u-card/platforms', null, cookies);
    assert.equal(platforms.statusCode, 200);
    const chatgpt = platforms.body.items.find((item) => item.name === 'ChatGPT');
    const sora = platforms.body.items.find((item) => item.name === 'Sora');
    const telegram = platforms.body.items.find((item) => item.name === 'Telegram');

    const platformUpdate = await harness.request(
      'PUT',
      `/api/admin/u-card/platforms/${chatgpt.id}`,
      { name: 'ChatGPT Plus', sortOrder: 99, isEnabled: 1 },
      cookies
    );
    assert.equal(platformUpdate.statusCode, 200);
    assert.equal(platformUpdate.body.item.name, 'ChatGPT Plus');
    assert.equal(platformUpdate.body.item.sort_order, 99);

    const created = await harness.request(
      'POST',
      '/api/admin/u-card/cards',
      { name: 'Starter Card', bin: '411111', issuerRegion: '香港', platformIds: [sora.id] },
      cookies
    );
    assert.equal(created.statusCode, 200);

    const cardUpdate = await harness.request(
      'PUT',
      `/api/admin/u-card/cards/${created.body.item.id}`,
      { name: 'Pro Card', bin: '522222', issuerRegion: '新加坡', platformIds: [telegram.id], sortOrder: 12, isEnabled: 1 },
      cookies
    );
    assert.equal(cardUpdate.statusCode, 200);
    assert.equal(cardUpdate.body.item.name, 'Pro Card');
    assert.equal(cardUpdate.body.item.bin, '522222');
    assert.equal(cardUpdate.body.item.issuer_region, '新加坡');
    assert.deepEqual(cardUpdate.body.item.platforms.map((item) => item.name), ['Telegram']);

    const oldLookup = await harness.request('GET', `/api/u-card/platforms/${sora.id}/cards`);
    assert.equal(oldLookup.statusCode, 200);
    assert.deepEqual(oldLookup.body.items, []);

    const newLookup = await harness.request('GET', `/api/u-card/platforms/${telegram.id}/cards`);
    assert.equal(newLookup.statusCode, 200);
    assert.deepEqual(newLookup.body.items, [{ id: created.body.item.id, name: 'Pro Card', bin: '522222', issuer_region: '新加坡' }]);
  } finally {
    harness.cleanup();
  }
});

test('admin can delete U card platforms and cards', async () => {
  const harness = createHarness();
  try {
    const cookies = await loginAdmin(harness);
    const platforms = await harness.request('GET', '/api/admin/u-card/platforms', null, cookies);
    assert.equal(platforms.statusCode, 200);
    const chatgpt = platforms.body.items.find((item) => item.name === 'ChatGPT');
    const sora = platforms.body.items.find((item) => item.name === 'Sora');

    const created = await harness.request(
      'POST',
      '/api/admin/u-card/cards',
      { name: 'Delete Me Card', bin: '433333', platformIds: [chatgpt.id, sora.id] },
      cookies
    );
    assert.equal(created.statusCode, 200);

    const deleteCard = await harness.request('DELETE', `/api/admin/u-card/cards/${created.body.item.id}`, null, cookies);
    assert.equal(deleteCard.statusCode, 200);
    assert.equal(deleteCard.body.ok, true);

    const cardLookup = await harness.request('GET', `/api/u-card/platforms/${chatgpt.id}/cards`);
    assert.equal(cardLookup.statusCode, 200);
    assert.deepEqual(cardLookup.body.items, []);

    const tempPlatform = await harness.request(
      'POST',
      '/api/admin/u-card/platforms',
      { name: 'Temporary Platform', sortOrder: 200 },
      cookies
    );
    assert.equal(tempPlatform.statusCode, 200);

    const deletePlatform = await harness.request(
      'DELETE',
      `/api/admin/u-card/platforms/${tempPlatform.body.item.id}`,
      null,
      cookies
    );
    assert.equal(deletePlatform.statusCode, 200);
    assert.equal(deletePlatform.body.ok, true);

    const deletedLookup = await harness.request('GET', `/api/u-card/platforms/${tempPlatform.body.item.id}/cards`);
    assert.equal(deletedLookup.statusCode, 404);
  } finally {
    harness.cleanup();
  }
});
