const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const TUTORIAL_MAX_BYTES = 5000000;
const tutorialUploadDrafts = new Map();

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(cookieParser());

// Allow local cross-origin admin usage (different local ports).
app.use((req, res, next) => {
  const origin = String(req.headers.origin || '');
  const isLocalOrigin =
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === 'http://localhost' ||
    origin === 'http://127.0.0.1';

  if (isLocalOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getAdminPassword() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  const pwd = String(row?.value || '').trim();
  return pwd || DEFAULT_ADMIN_PASSWORD;
}

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(String(key));
  const value = String(row?.value || '').trim();
  return value || String(fallback || '');
}

const upsertSettingStmt = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
`);

function adminTokenForPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

function validateTutorialContentSize(content, res) {
  const bytes = Buffer.byteLength(String(content || ''), 'utf8');
  if (bytes > TUTORIAL_MAX_BYTES) {
    res.status(400).json({ error: `教程内容不能超过 ${TUTORIAL_MAX_BYTES} 字节` });
    return false;
  }
  return true;
}

function upsertTutorialByIdOrCreate({ id, title, content }, res) {
  if (!title || !content) {
    res.status(400).json({ error: 'title 和 content 必填' });
    return false;
  }
  if (!validateTutorialContentSize(content, res)) {
    return false;
  }

  if (id) {
    const result = db
      .prepare(`
        UPDATE tutorials
        SET title = ?, content = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(title, content, id);
    if (!result.changes) {
      res.status(404).json({ error: '记录不存在' });
      return false;
    }
    res.json({ ok: true, id });
    return true;
  }

  const result = db
    .prepare(`
      INSERT INTO tutorials (title, content, status, created_at, updated_at)
      VALUES (?, ?, 'published', datetime('now'), datetime('now'))
    `)
    .run(title, content);
  res.json({ ok: true, id: result.lastInsertRowid });
  return true;
}

function requireAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  const expected = adminTokenForPassword(getAdminPassword());
  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/sites', (req, res) => {
  const { category, q } = req.query;
  let sql = `SELECT id, name, url, description, category, source, sort_order, created_at FROM sites WHERE status = 'approved'`;
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (q) {
    sql += ' AND (name LIKE ? OR description LIKE ? OR url LIKE ?)';
    const kw = `%${q}%`;
    params.push(kw, kw, kw);
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC';
  const rows = db.prepare(sql).all(...params);

  res.json({ items: rows });
});

app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT c.id, c.name as category, c.sort_order, COALESCE(COUNT(s.id), 0) as count
      FROM categories c
      LEFT JOIN sites s ON s.category = c.name AND s.status = 'approved'
      WHERE c.is_enabled = 1
      GROUP BY c.id, c.name, c.sort_order
      ORDER BY c.sort_order ASC, c.id ASC
    `)
    .all();
  res.json({ items: rows });
});

app.get('/api/site-config', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  const title = getSetting('site_title', 'claw800.com');
  const subtitleZh = getSetting('site_subtitle_zh', 'OpenClaw 生态导航，收录 AI 领域优质网站');
  const subtitleEn = getSetting('site_subtitle_en', 'OpenClaw ecosystem directory for AI websites');
  res.json({ ok: true, title, subtitleZh, subtitleEn });
});

app.get('/api/admin/site-config', requireAdmin, (_req, res) => {
  const title = getSetting('site_title', 'claw800.com');
  const subtitleZh = getSetting('site_subtitle_zh', 'OpenClaw 生态导航，收录 AI 领域优质网站');
  const subtitleEn = getSetting('site_subtitle_en', 'OpenClaw ecosystem directory for AI websites');
  res.json({ ok: true, title, subtitleZh, subtitleEn });
});

app.put('/api/admin/site-config', requireAdmin, (req, res) => {
  const title = String(req.body.title || '').trim();
  const subtitleZh = String(req.body.subtitleZh || '').trim();
  const subtitleEn = String(req.body.subtitleEn || '').trim();

  if (!title) return res.status(400).json({ error: '网站名称必填' });
  if (Buffer.byteLength(title, 'utf8') > 200) return res.status(413).json({ error: '网站名称太长' });
  if (Buffer.byteLength(subtitleZh, 'utf8') > 2000) return res.status(413).json({ error: '中文简介太长' });
  if (Buffer.byteLength(subtitleEn, 'utf8') > 2000) return res.status(413).json({ error: '英文简介太长' });

  try {
    upsertSettingStmt.run('site_title', title);
    upsertSettingStmt.run('site_subtitle_zh', subtitleZh);
    upsertSettingStmt.run('site_subtitle_en', subtitleEn);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '保存失败' });
  }
});

app.get('/api/tutorials', (_req, res) => {
  // Tutorials change infrequently; allow short public caching.
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const rows = db
    .prepare(`
      SELECT id, title, created_at
      FROM tutorials
      WHERE status = 'published'
      ORDER BY created_at DESC, id DESC
    `)
    .all();
  res.json({ items: rows });
});

app.get('/api/tutorial', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const rows = db
    .prepare(`
      SELECT id, title, created_at
      FROM tutorials
      WHERE status = 'published'
      ORDER BY created_at DESC, id DESC
    `)
    .all();
  res.json({ items: rows });
});

app.get('/api/tutorials/:id', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'id 无效' });
  }

  const row = db
    .prepare(`
      SELECT id, title, content, created_at, updated_at
      FROM tutorials
      WHERE id = ? AND status = 'published'
    `)
    .get(id);

  if (!row) {
    return res.status(404).json({ error: '教程不存在' });
  }
  res.json({ item: row });
});

app.get('/api/tutorial/:id', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'id 无效' });
  }

  const row = db
    .prepare(`
      SELECT id, title, content, created_at, updated_at
      FROM tutorials
      WHERE id = ? AND status = 'published'
    `)
    .get(id);

  if (!row) {
    return res.status(404).json({ error: '教程不存在' });
  }
  res.json({ item: row });
});

app.post('/api/submit', (req, res) => {
  const { name, url, description = '', category = '未分类', submitterName = '', submitterEmail = '' } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'name 和 url 必填' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'url 格式不正确' });
  }

  const stmt = db.prepare(`
    INSERT INTO sites (name, url, description, category, source, submitter_name, submitter_email, status)
    VALUES (?, ?, ?, ?, 'user_submit', ?, ?, 'pending')
  `);

  try {
    const result = stmt.run(name.trim(), url.trim(), description.trim(), category.trim(), submitterName.trim(), submitterEmail.trim());
    res.json({ ok: true, id: result.lastInsertRowid, message: '提交成功，等待管理员审核' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '这个网站已经存在，可能已收录或正在审核中' });
    }
    res.status(500).json({ error: '提交失败，请稍后再试' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const currentAdminPassword = getAdminPassword();

  if (password !== currentAdminPassword) {
    return res.status(401).json({ error: '密码错误' });
  }

  const token = adminTokenForPassword(currentAdminPassword);

  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ ok: true });
});

app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

function handleChangePassword(req, res) {
  const oldPassword = String(req.body.oldPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  const currentAdminPassword = getAdminPassword();
  if (oldPassword !== currentAdminPassword) {
    return res.status(400).json({ error: '原密码错误' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少 6 位' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: '两次输入的新密码不一致' });
  }

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('admin_password', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(newPassword);
  const token = adminTokenForPassword(newPassword);
  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ ok: true });
}

app.post('/api/admin/change-password', requireAdmin, handleChangePassword);
app.post('/admin/change-password', requireAdmin, handleChangePassword);
app.post('/api/change-password', requireAdmin, handleChangePassword);
app.post('/change-password', requireAdmin, handleChangePassword);
app.post('/api/admin/changePassword', requireAdmin, handleChangePassword);
app.post('/api/admin/change-password/', requireAdmin, handleChangePassword);
app.post('/admin/change-password/', requireAdmin, handleChangePassword);
app.post('/api/change-password/', requireAdmin, handleChangePassword);
app.post('/change-password/', requireAdmin, handleChangePassword);
app.post('/api/admin/changePassword/', requireAdmin, handleChangePassword);

app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT c.id, c.name, c.sort_order, c.is_enabled, COALESCE(COUNT(s.id), 0) AS site_count
      FROM categories c
      LEFT JOIN sites s ON s.category = c.name
      GROUP BY c.id, c.name, c.sort_order, c.is_enabled
      ORDER BY c.sort_order ASC, c.id ASC
    `)
    .all();
  res.json({ items: rows });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const name = String(req.body.name || '').trim();
  const sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;
  const isEnabled = req.body.isEnabled === 0 || req.body.isEnabled === '0' ? 0 : 1;

  if (!name) {
    return res.status(400).json({ error: 'name 必填' });
  }

  try {
    const result = db
      .prepare('INSERT INTO categories (name, sort_order, is_enabled) VALUES (?, ?, ?)')
      .run(name, sortOrder, isEnabled);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '分类已存在' });
    }
    res.status(500).json({ error: '创建失败' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  const sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;
  const isEnabled = req.body.isEnabled === 0 || req.body.isEnabled === '0' ? 0 : 1;

  if (!name) {
    return res.status(400).json({ error: 'name 必填' });
  }

  try {
    const result = db
      .prepare('UPDATE categories SET name = ?, sort_order = ?, is_enabled = ? WHERE id = ?')
      .run(name, sortOrder, isEnabled, id);
    if (!result.changes) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '分类已存在' });
    }
    res.status(500).json({ error: '更新失败' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const category = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
  if (!category) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const siteCount = db.prepare('SELECT COUNT(*) as c FROM sites WHERE category = ?').get(category.name).c;
  if (siteCount > 0) {
    return res.status(409).json({ error: `该分类收录了 ${siteCount} 个网站，不允许删除`, siteCount });
  }

  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json({ ok: true });
});

app.get('/api/admin/sites', requireAdmin, (req, res) => {
  const status = String(req.query.status || 'pending');
  const q = String(req.query.q || '').trim();
  let sql = `
      SELECT id, name, url, description, category, source, submitter_name, submitter_email, status, reviewer_note, reviewed_by, reviewed_at, sort_order, created_at
      FROM sites
      WHERE status = ?
  `;
  const params = [status];

  if (q) {
    sql += ' AND (name LIKE ? OR url LIKE ? OR description LIKE ? OR category LIKE ?)';
    const kw = `%${q}%`;
    params.push(kw, kw, kw, kw);
  }

  sql += status === 'approved' ? ' ORDER BY sort_order ASC, created_at DESC' : ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);

  res.json({ items: rows });
});

function listTutorials(_req, res) {
  const rows = db
    .prepare(`
      SELECT id, title, content, status, created_at, updated_at
      FROM tutorials
      ORDER BY created_at DESC, id DESC
    `)
    .all();
  res.json({ items: rows });
}

function createTutorial(req, res) {
  const title = String(req.body.title || '').trim();
  const content = String(req.body.content || '').trim();
  upsertTutorialByIdOrCreate({ title, content }, res);
}

app.get('/api/admin/tutorials', requireAdmin, listTutorials);
app.get('/api/admin/tutorial', requireAdmin, listTutorials);
app.post('/api/admin/tutorials', requireAdmin, createTutorial);
app.post('/api/admin/tutorial', requireAdmin, createTutorial);
app.post('/api/tutorials', requireAdmin, createTutorial);
app.post('/api/tutorial', requireAdmin, createTutorial);

app.put('/api/admin/tutorials/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const title = String(req.body.title || '').trim();
  const content = String(req.body.content || '').trim();
  upsertTutorialByIdOrCreate({ id, title, content }, res);
});

app.put('/api/admin/tutorial/:id', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorials/${req.params.id}`);
});

app.delete('/api/admin/tutorials/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM tutorials WHERE id = ?').run(id);
  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json({ ok: true });
});

app.delete('/api/admin/tutorial/:id', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorials/${req.params.id}`);
});

app.post('/api/admin/tutorials/:id/delete', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM tutorials WHERE id = ?').run(id);
  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json({ ok: true });
});

app.post('/api/admin/tutorial/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorials/${req.params.id}/delete`);
});

app.post('/admin/tutorials/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorials/${req.params.id}/delete`);
});

app.post('/admin/tutorial/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorial/${req.params.id}/delete`);
});

app.post('/api/tutorials/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorials/${req.params.id}/delete`);
});

app.post('/api/tutorial/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorial/${req.params.id}/delete`);
});

app.post('/tutorials/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorials/${req.params.id}/delete`);
});

app.post('/tutorial/:id/delete', requireAdmin, (req, res) => {
  res.redirect(307, `/api/admin/tutorial/${req.params.id}/delete`);
});

app.post('/api/admin/tutorial-upload/init', requireAdmin, (_req, res) => {
  const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  tutorialUploadDrafts.set(uploadId, { content: '', createdAt: Date.now() });
  res.json({ ok: true, uploadId });
});

app.post('/api/admin/tutorial-upload/append', requireAdmin, (req, res) => {
  const uploadId = String(req.body.uploadId || '');
  const chunk = String(req.body.chunk || '');
  const draft = tutorialUploadDrafts.get(uploadId);
  if (!draft) {
    return res.status(404).json({ error: '上传会话不存在' });
  }
  draft.content += chunk;
  if (Buffer.byteLength(draft.content, 'utf8') > TUTORIAL_MAX_BYTES) {
    tutorialUploadDrafts.delete(uploadId);
    return res.status(400).json({ error: `教程内容不能超过 ${TUTORIAL_MAX_BYTES} 字节` });
  }
  res.json({ ok: true });
});

app.post('/api/admin/tutorial-upload/commit', requireAdmin, (req, res) => {
  const uploadId = String(req.body.uploadId || '');
  const title = String(req.body.title || '').trim();
  const id = req.body.id ? Number(req.body.id) : null;
  const draft = tutorialUploadDrafts.get(uploadId);
  if (!draft) {
    return res.status(404).json({ error: '上传会话不存在' });
  }
  tutorialUploadDrafts.delete(uploadId);
  upsertTutorialByIdOrCreate({ id, title, content: String(draft.content || '') }, res);
});

app.post('/admin/tutorial-upload/init', requireAdmin, (req, res) => res.redirect(307, '/api/admin/tutorial-upload/init'));
app.post('/admin/tutorial-upload/append', requireAdmin, (req, res) => res.redirect(307, '/api/admin/tutorial-upload/append'));
app.post('/admin/tutorial-upload/commit', requireAdmin, (req, res) => res.redirect(307, '/api/admin/tutorial-upload/commit'));
app.get('/admin/tutorials', requireAdmin, listTutorials);
app.get('/admin/tutorial', requireAdmin, listTutorials);
app.post('/admin/tutorials', requireAdmin, createTutorial);
app.post('/admin/tutorial', requireAdmin, createTutorial);
app.get('/tutorials', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT id, title, created_at
      FROM tutorials
      WHERE status = 'published'
      ORDER BY created_at DESC, id DESC
    `)
    .all();
  res.json({ items: rows });
});
app.get('/tutorial/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'id 无效' });
  }
  const row = db
    .prepare(`
      SELECT id, title, content, created_at, updated_at
      FROM tutorials
      WHERE id = ? AND status = 'published'
    `)
    .get(id);
  if (!row) {
    return res.status(404).json({ error: '教程不存在' });
  }
  res.json({ item: row });
});

app.post('/api/admin/sites', requireAdmin, (req, res) => {
  const { name, url, description = '', category = 'OpenClaw 生态', status = 'approved', sortOrder } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'name 和 url 必填' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'url 格式不正确' });
  }

  const parsedSortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;

  try {
    const result = db
      .prepare(`
        INSERT INTO sites (name, url, description, category, source, status, sort_order, reviewed_by, reviewed_at)
        VALUES (?, ?, ?, ?, 'admin', ?, ?, 'admin', datetime('now'))
      `)
      .run(name.trim(), url.trim(), description.trim(), category.trim(), status, parsedSortOrder);

    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '网站已存在' });
    }
    res.status(500).json({ error: '创建失败' });
  }
});

app.post('/api/admin/import', requireAdmin, (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) {
    return res.status(400).json({ error: 'items 必须是非空数组' });
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO sites (name, url, description, category, source, status, reviewed_by, reviewed_at)
    VALUES (?, ?, ?, ?, 'admin_import', 'approved', 'admin', datetime('now'))
  `);

  let imported = 0;
  let skipped = 0;
  for (const item of items) {
    const name = String(item.name || '').trim();
    const url = String(item.url || '').trim();
    const description = String(item.description || '').trim();
    const category = String(item.category || 'OpenClaw 生态').trim();

    if (!name || !url || !isValidUrl(url)) {
      skipped += 1;
      continue;
    }

    const result = insert.run(name, url, description, category);
    if (result.changes) {
      imported += 1;
    } else {
      skipped += 1;
    }
  }

  res.json({ ok: true, imported, skipped });
});

function updateSite(req, res) {
  const id = Number(req.params.id);
  const { name, url, description = '', category = 'OpenClaw 生态', sortOrder } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'name 和 url 必填' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'url 格式不正确' });
  }

  const parsedSortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;

  try {
    const result = db
      .prepare(`
        UPDATE sites
        SET name = ?, url = ?, description = ?, category = ?, sort_order = ?, reviewed_by = 'admin', reviewed_at = datetime('now')
        WHERE id = ?
      `)
      .run(name.trim(), url.trim(), description.trim(), category.trim(), parsedSortOrder, id);

    if (!result.changes) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '网站已存在' });
    }
    res.status(500).json({ error: '更新失败' });
  }
}

app.put('/api/admin/sites/:id', requireAdmin, updateSite);
app.post('/api/admin/sites/:id/update', requireAdmin, updateSite);
app.put('/admin/sites/:id', requireAdmin, (req, res) => res.redirect(307, `/api/admin/sites/${req.params.id}`));
app.post('/admin/sites/:id/update', requireAdmin, (req, res) => res.redirect(307, `/api/admin/sites/${req.params.id}/update`));

app.put('/api/admin/sites/:id/sort', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const sortOrder = Number(req.body.sortOrder);

  if (!Number.isFinite(sortOrder)) {
    return res.status(400).json({ error: 'sortOrder 必须是数字' });
  }

  const result = db
    .prepare(`
      UPDATE sites
      SET sort_order = ?, reviewed_by = 'admin', reviewed_at = datetime('now')
      WHERE id = ?
    `)
    .run(sortOrder, id);

  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }

  res.json({ ok: true });
});

app.post('/api/admin/sites/:id/approve', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const parsedSortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;

  const result = db
    .prepare(`
      UPDATE sites
      SET status = 'approved', sort_order = ?, reviewer_note = '', reviewed_by = 'admin', reviewed_at = datetime('now')
      WHERE id = ?
    `)
    .run(parsedSortOrder, id);

  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }

  res.json({ ok: true });
});

app.post('/api/admin/sites/:id/reject', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const note = String(req.body.note || '').trim();

  const result = db
    .prepare(`
      UPDATE sites
      SET status = 'rejected', reviewer_note = ?, reviewed_by = 'admin', reviewed_at = datetime('now')
      WHERE id = ?
    `)
    .run(note, id);

  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }

  res.json({ ok: true });
});

app.delete('/api/admin/sites/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM sites WHERE id = ?').run(id);
  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json({ ok: true });
});

app.post('/api/admin/sites/:id/delete', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM sites WHERE id = ?').run(id);
  if (!result.changes) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json({ ok: true });
});

app.delete('/admin/sites/:id', requireAdmin, (req, res) => res.redirect(307, `/api/admin/sites/${req.params.id}`));
app.post('/admin/sites/:id/delete', requireAdmin, (req, res) => res.redirect(307, `/api/admin/sites/${req.params.id}/delete`));

const TRANSLATE_PROVIDER = String(process.env.TRANSLATE_PROVIDER || 'libretranslate').toLowerCase();
const TRANSLATE_ENDPOINT = String(process.env.TRANSLATE_ENDPOINT || 'https://libretranslate.com/translate');
const TRANSLATE_API_KEY = String(process.env.TRANSLATE_API_KEY || '');
const TRANSLATE_TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS || 8000);

const getTranslationStmt = db.prepare(
  'SELECT translated_text FROM translations WHERE target_lang = ? AND source_hash = ?'
);
const insertTranslationStmt = db.prepare(
  'INSERT OR IGNORE INTO translations (target_lang, source_hash, source_text, translated_text) VALUES (?, ?, ?, ?)'
);

function hasCjk(text) {
  return /[\u3400-\u9FBF]/.test(String(text || ''));
}

async function translateViaLibreTranslate(text, targetLang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const payload = {
      q: String(text || ''),
      source: 'auto',
      target: String(targetLang || 'en'),
      format: 'text'
    };
    if (TRANSLATE_API_KEY) payload.api_key = TRANSLATE_API_KEY;

    const resp = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!resp.ok) throw new Error(`translate failed: ${resp.status}`);
    const data = await resp.json();
    const translated = String(data.translatedText || '').trim();
    return translated || String(text || '');
  } finally {
    clearTimeout(timer);
  }
}

async function translateTextCached(text, targetLang) {
  const source = String(text || '');
  const to = String(targetLang || 'en').toLowerCase();
  const hash = crypto.createHash('sha256').update(source).digest('hex');

  const cached = getTranslationStmt.get(to, hash);
  if (cached && typeof cached.translated_text === 'string') {
    return cached.translated_text;
  }

  let translated = source;
  if (TRANSLATE_PROVIDER === 'off' || TRANSLATE_PROVIDER === 'none') {
    translated = source;
  } else if (TRANSLATE_PROVIDER === 'libretranslate') {
    translated = await translateViaLibreTranslate(source, to);
  } else {
    // Unknown provider: return original to avoid breaking the page.
    translated = source;
  }

  try {
    insertTranslationStmt.run(to, hash, source, translated);
  } catch {
    // ignore cache write failures
  }

  return translated;
}

app.get('/api/translate', async (req, res) => {
  const to = String(req.query.to || 'en').toLowerCase();
  const text = String(req.query.text || '');
  if (!text) return res.status(400).json({ error: 'text 必填' });
  if (!['en', 'zh'].includes(to)) return res.status(400).json({ error: 'to 只支持 en/zh' });

  try {
    const translated = hasCjk(text) ? await translateTextCached(text, to) : text;
    res.json({ ok: true, to, translated });
  } catch {
    res.status(502).json({ error: '翻译服务不可用' });
  }
});

app.post('/api/translate', async (req, res) => {
  const to = String(req.body.to || 'en').toLowerCase();
  const texts = Array.isArray(req.body.texts) ? req.body.texts : [];

  if (!['en', 'zh'].includes(to)) return res.status(400).json({ error: 'to 只支持 en/zh' });
  if (!texts.length) return res.json({ ok: true, to, items: [] });
  if (texts.length > 200) return res.status(413).json({ error: 'texts 过多，请分批提交' });

  const normalized = texts.map((t) => String(t || ''));
  const totalBytes = Buffer.byteLength(JSON.stringify(normalized), 'utf8');
  if (totalBytes > 200000) return res.status(413).json({ error: '请求体过大（翻译）' });

  try {
    const items = [];
    for (const text of normalized) {
      if (!text) {
        items.push('');
        continue;
      }
      // Only translate when it likely needs translation.
      items.push(hasCjk(text) ? await translateTextCached(text, to) : text);
    }
    res.json({ ok: true, to, items });
  } catch {
    res.status(502).json({ error: '翻译服务不可用' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'claw800' });
});

app.use((err, _req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: '请求体过大（413）。请检查反向代理 body size 和后端是否已重启到最新配置。' });
  }
  return next(err);
});

app.listen(PORT, HOST, () => {
  console.log(`claw800 server running at http://${HOST}:${PORT}`);
});
