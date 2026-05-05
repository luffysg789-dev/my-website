const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-sites-bulk-review-'));
  const previousDbPath = process.env.CLAW800_DB_PATH;
  process.env.CLAW800_DB_PATH = path.join(tmpDir, 'claw800.db');
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
        for (const [key, value] of new URLSearchParams(queryString).entries()) {
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
  const [pair] = response.headers['set-cookie'][0].split(';');
  const [name, value] = pair.split('=');
  return { [name]: value };
}

function insertPendingSite(db, name, sortOrder = 0) {
  return db
    .prepare(`
      INSERT INTO sites (name, url, description, category, source, status, sort_order)
      VALUES (?, ?, ?, '开发与编码', 'test', 'pending', ?)
    `)
    .run(name, `https://example.com/${encodeURIComponent(name)}`, `${name} description`, sortOrder).lastInsertRowid;
}

test('admin can bulk approve all pending sites', async () => {
  const harness = createHarness();
  try {
    const cookies = await loginAdmin(harness);
    const firstId = insertPendingSite(harness.db, 'Bulk Approve One', 5);
    const secondId = insertPendingSite(harness.db, 'Bulk Approve Two', 9);

    const response = await harness.request('POST', '/api/admin/sites/bulk-approve', {}, cookies);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.updated, 2);

    const rows = harness.db
      .prepare('SELECT id, status, sort_order, reviewed_by FROM sites WHERE id IN (?, ?) ORDER BY id ASC')
      .all(firstId, secondId);
    assert.deepEqual(rows, [
      { id: firstId, status: 'approved', sort_order: 5, reviewed_by: 'admin' },
      { id: secondId, status: 'approved', sort_order: 9, reviewed_by: 'admin' }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('admin can bulk reject all pending sites', async () => {
  const harness = createHarness();
  try {
    const cookies = await loginAdmin(harness);
    const firstId = insertPendingSite(harness.db, 'Bulk Reject One');
    const secondId = insertPendingSite(harness.db, 'Bulk Reject Two');

    const response = await harness.request(
      'POST',
      '/api/admin/sites/bulk-reject',
      { note: 'bulk rejected' },
      cookies
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.updated, 2);

    const rows = harness.db
      .prepare('SELECT id, status, reviewer_note FROM sites WHERE id IN (?, ?) ORDER BY id ASC')
      .all(firstId, secondId);
    assert.deepEqual(rows, [
      { id: firstId, status: 'rejected', reviewer_note: 'bulk rejected' },
      { id: secondId, status: 'rejected', reviewer_note: 'bulk rejected' }
    ]);
  } finally {
    harness.cleanup();
  }
});
