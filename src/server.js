const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// Server default:
// - Linux production: listen on 0.0.0.0 so nginx/proxy can reach it.
// - Local dev: bind to loopback by default.
const HOST =
  process.env.HOST ||
  (process.platform === 'linux' ? '0.0.0.0' : '127.0.0.1');
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const TUTORIAL_MAX_BYTES = 5000000;
const tutorialUploadDrafts = new Map();
const ADMIN_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Use COOKIE_SECURE=true in production HTTPS; keep false for localhost HTTP.
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '') === 'true';

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

function setAdminCookie(res, token) {
  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE_MS
  });
}

function clearAdminCookie(res) {
  res.clearCookie('admin_token', {
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/'
  });
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

function hasCjk(text) {
  return /[\u3400-\u9FBF]/.test(String(text || ''));
}

async function autoTranslateToEn(text) {
  const input = String(text || '').trim();
  if (!input) return '';
  if (!hasCjk(input)) return input; // already EN-ish
  try {
    const translated = await translateTextCached(input, 'en');
    const out = String(translated || '').trim();
    // If translation service returns original Chinese (or still contains CJK),
    // treat as "not translated yet" so frontend can fall back to on-demand translation.
    if (!out) return '';
    if (out === input) return '';
    if (hasCjk(out)) return '';
    return out;
  } catch {
    return '';
  }
}

app.get('/api/sites', (req, res) => {
  const { category, q } = req.query;
  let sql = `SELECT id, name, name_en, url, description, description_en, category, source, sort_order, created_at FROM sites WHERE status = 'approved'`;
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (q) {
    sql += ' AND (name LIKE ? OR description LIKE ? OR url LIKE ? OR name_en LIKE ? OR description_en LIKE ?)';
    const kw = `%${q}%`;
    params.push(kw, kw, kw, kw, kw);
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC';
  const rows = db.prepare(sql).all(...params);

  res.json({ items: rows });
});

app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT c.id, c.name as category, c.name_en as category_en, c.sort_order, COALESCE(COUNT(s.id), 0) as count
      FROM categories c
      LEFT JOIN sites s ON s.category = c.name AND s.status = 'approved'
      WHERE c.is_enabled = 1
      GROUP BY c.id, c.name, c.name_en, c.sort_order
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

// Backward/alternate paths (useful when /api proxy rules are different).
app.get('/admin/site-config', requireAdmin, (req, res) => res.redirect(307, '/api/admin/site-config'));
app.put('/admin/site-config', requireAdmin, (req, res) => res.redirect(307, '/api/admin/site-config'));

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

function decodeBasicHtmlEntities(text) {
  return String(text || '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function htmlToPlainText(html) {
  const input = String(html || '');
  const withoutScripts = input.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return decodeBasicHtmlEntities(stripped).replace(/\n{3,}/g, '\n\n').trim();
}

app.get('/api/tutorials/:id/preview', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const id = Number(req.params.id);
  const limit = Math.max(200, Math.min(10000, Number(req.query.limit || 2000)));
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id 无效' });

  const row = db
    .prepare(
      `
      SELECT id, title, substr(content, 1, 40000) as content_part, created_at, updated_at
      FROM tutorials
      WHERE id = ? AND status = 'published'
    `
    )
    .get(id);

  if (!row) return res.status(404).json({ error: '教程不存在' });
  const previewText = htmlToPlainText(row.content_part || '').slice(0, limit);
  res.json({
    ok: true,
    item: { id: row.id, title: row.title, created_at: row.created_at, updated_at: row.updated_at },
    previewText,
    limit
  });
});

app.get('/api/tutorial/:id/preview', (req, res) => res.redirect(307, `/api/tutorials/${req.params.id}/preview?${new URLSearchParams(req.query).toString()}`));

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

app.post('/api/submit', async (req, res) => {
  const { name, url, description = '', category = '未分类', submitterName = '', submitterEmail = '' } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'name 和 url 必填' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'url 格式不正确' });
  }

  const trimmedName = String(name || '').trim();
  const trimmedDesc = String(description || '').trim();
  const nameEn = await autoTranslateToEn(trimmedName);
  const descEn = await autoTranslateToEn(trimmedDesc);

  const stmt = db.prepare(`
    INSERT INTO sites (name, name_en, url, description, description_en, category, source, submitter_name, submitter_email, status)
    VALUES (?, ?, ?, ?, ?, ?, 'user_submit', ?, ?, 'pending')
  `);

  try {
    const result = stmt.run(
      trimmedName,
      nameEn || '',
      url.trim(),
      trimmedDesc,
      descEn || '',
      category.trim(),
      submitterName.trim(),
      submitterEmail.trim()
    );
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
  setAdminCookie(res, token);

  res.json({ ok: true });
});

app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  clearAdminCookie(res);
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
  setAdminCookie(res, token);
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
      SELECT c.id, c.name, c.name_en, c.sort_order, c.is_enabled, COALESCE(COUNT(s.id), 0) AS site_count
      FROM categories c
      LEFT JOIN sites s ON s.category = c.name
      GROUP BY c.id, c.name, c.name_en, c.sort_order, c.is_enabled
      ORDER BY c.sort_order ASC, c.id ASC
    `)
    .all();
  res.json({ items: rows });
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;
  const isEnabled = req.body.isEnabled === 0 || req.body.isEnabled === '0' ? 0 : 1;

  if (!name) {
    return res.status(400).json({ error: 'name 必填' });
  }

  try {
    const nameEn = await autoTranslateToEn(name);
    const result = db
      .prepare('INSERT INTO categories (name, name_en, sort_order, is_enabled) VALUES (?, ?, ?, ?)')
      .run(name, nameEn || '', sortOrder, isEnabled);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '分类已存在' });
    }
    res.status(500).json({ error: '创建失败' });
  }
});

async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  const sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;
  const isEnabled = req.body.isEnabled === 0 || req.body.isEnabled === '0' ? 0 : 1;

  if (!name) {
    return res.status(400).json({ error: 'name 必填' });
  }

  try {
    const existing = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '记录不存在' });
    }

    // Prevent renaming into another existing category name.
    const dup = db.prepare('SELECT id FROM categories WHERE name = ? AND id <> ?').get(name, id);
    if (dup) {
      return res.status(409).json({ error: '分类已存在' });
    }

    const nameEn = await autoTranslateToEn(name);
    const oldName = String(existing.name || '').trim();

    const tx = db.transaction(() => {
      const result = db
        .prepare('UPDATE categories SET name = ?, name_en = ?, sort_order = ?, is_enabled = ? WHERE id = ?')
        .run(name, nameEn || '', sortOrder, isEnabled, id);
      if (!result.changes) {
        throw new Error('not_found');
      }
      // Keep sites in sync when a category is renamed, otherwise the old category
      // would "reappear" on next boot due to historical category backfill.
      if (oldName && oldName !== name) {
        db.prepare('UPDATE sites SET category = ? WHERE category = ?').run(name, oldName);
      }
    });

    try {
      tx();
    } catch (err) {
      if (String(err.message) === 'not_found') {
        return res.status(404).json({ error: '记录不存在' });
      }
      throw err;
    }

    res.json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '分类已存在' });
    }
    res.status(500).json({ error: '更新失败' });
  }
}

app.put('/api/admin/categories/:id', requireAdmin, updateCategory);
// Some environments/proxies may block PUT; provide POST fallbacks to avoid accidental "create new".
app.post('/api/admin/categories/:id', requireAdmin, updateCategory);
app.post('/api/admin/categories/:id/update', requireAdmin, updateCategory);
app.post('/admin/categories/:id/update', requireAdmin, (req, res) => res.redirect(307, `/api/admin/categories/${req.params.id}/update`));

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

app.post('/api/admin/sites', requireAdmin, async (req, res) => {
  const { name, url, description = '', category = 'OpenClaw 生态', status = 'approved', sortOrder } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'name 和 url 必填' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'url 格式不正确' });
  }

  const parsedSortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
  const trimmedName = String(name || '').trim();
  const trimmedDesc = String(description || '').trim();
  const nameEn = await autoTranslateToEn(trimmedName);
  const descEn = await autoTranslateToEn(trimmedDesc);

  try {
    const result = db
      .prepare(`
        INSERT INTO sites (name, name_en, url, description, description_en, category, source, status, sort_order, reviewed_by, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, 'admin', ?, ?, 'admin', datetime('now'))
      `)
      .run(trimmedName, nameEn || '', url.trim(), trimmedDesc, descEn || '', category.trim(), status, parsedSortOrder);

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

async function updateSite(req, res) {
  const id = Number(req.params.id);
  const { name, url, description = '', category = 'OpenClaw 生态', sortOrder } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'name 和 url 必填' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'url 格式不正确' });
  }

  const parsedSortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
  const trimmedName = String(name || '').trim();
  const trimmedDesc = String(description || '').trim();
  const nameEn = await autoTranslateToEn(trimmedName);
  const descEn = await autoTranslateToEn(trimmedDesc);

  try {
    const result = db
      .prepare(`
        UPDATE sites
        SET name = ?, name_en = ?, url = ?, description = ?, description_en = ?, category = ?, sort_order = ?, reviewed_by = 'admin', reviewed_at = datetime('now')
        WHERE id = ?
      `)
      .run(trimmedName, nameEn || '', url.trim(), trimmedDesc, descEn || '', category.trim(), parsedSortOrder, id);

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

app.post('/api/admin/sites/:id/approve', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const parsedSortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;

  const row = db.prepare('SELECT name, description FROM sites WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: '记录不存在' });
  }
  const nameEn = await autoTranslateToEn(String(row.name || ''));
  const descEn = await autoTranslateToEn(String(row.description || ''));

  const result = db
    .prepare(`
      UPDATE sites
      SET status = 'approved', sort_order = ?, reviewer_note = '', name_en = ?, description_en = ?, reviewed_by = 'admin', reviewed_at = datetime('now')
      WHERE id = ?
    `)
    .run(parsedSortOrder, nameEn || '', descEn || '', id);

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

// Default to MyMemory because it tends to be more reachable on many servers without extra setup.
const TRANSLATE_PROVIDER = String(process.env.TRANSLATE_PROVIDER || 'mymemory').toLowerCase();
const TRANSLATE_ENDPOINT = String(process.env.TRANSLATE_ENDPOINT || 'https://libretranslate.com/translate');
const TRANSLATE_API_KEY = String(process.env.TRANSLATE_API_KEY || '');
const TRANSLATE_TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS || 8000);

const getTranslationStmt = db.prepare(
  'SELECT translated_text FROM translations WHERE target_lang = ? AND source_hash = ?'
);
const insertTranslationStmt = db.prepare(
  'INSERT OR IGNORE INTO translations (target_lang, source_hash, source_text, translated_text) VALUES (?, ?, ?, ?)'
);

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

async function translateViaMyMemory(text, targetLang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const q = String(text || '');
    const to = String(targetLang || 'en').toLowerCase();
    // MyMemory expects langpair=from|to. We only route CJK text here, so assume zh-CN source.
    const langpair = `zh-CN|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langpair)}`;
    const resp = await fetch(url, { method: 'GET', signal: controller.signal });
    if (!resp.ok) throw new Error(`mymemory failed: ${resp.status}`);
    const data = await resp.json();
    const translated = String(data?.responseData?.translatedText || '').trim();
    return translated || q;
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
    const cachedText = String(cached.translated_text || '').trim();
    // Guard: if we previously cached a "bad translation" (same as source or still CJK for EN),
    // ignore it so the system can retry later.
    if (to === 'en' && (cachedText === source.trim() || hasCjk(cachedText))) {
      // treat as cache miss
    } else if (cachedText) {
      return cachedText;
    }
  }

  let translated = source;
  if (TRANSLATE_PROVIDER === 'off' || TRANSLATE_PROVIDER === 'none') {
    translated = source;
  } else if (TRANSLATE_PROVIDER === 'libretranslate') {
    try {
      translated = await translateViaLibreTranslate(source, to);
    } catch {
      // Fallback: LibreTranslate can be blocked/unstable on some servers.
      translated = await translateViaMyMemory(source, to);
    }
  } else if (TRANSLATE_PROVIDER === 'mymemory') {
    translated = await translateViaMyMemory(source, to);
  } else {
    // Unknown provider: return original to avoid breaking the page.
    translated = source;
  }

  const translatedTrimmed = String(translated || '').trim();
  const sourceTrimmed = String(source || '').trim();
  const shouldCache =
    translatedTrimmed &&
    (to !== 'en' || (translatedTrimmed !== sourceTrimmed && !hasCjk(translatedTrimmed)));
  if (shouldCache) {
    try {
      insertTranslationStmt.run(to, hash, source, translatedTrimmed);
    } catch {
      // ignore cache write failures
    }
  }

  return translatedTrimmed || source;
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

const AUTO_CRAWL_MAX_PER_RUN_AI = Number(process.env.AUTO_CRAWL_MAX_PER_RUN_AI || 5);
const AUTO_CRAWL_MAX_PER_RUN_OPENCLAW = Number(process.env.AUTO_CRAWL_MAX_PER_RUN_OPENCLAW || 5);
const AUTO_CRAWL_INTERVAL_MS = Number(process.env.AUTO_CRAWL_INTERVAL_MS || 60 * 60 * 1000);
const AUTO_CRAWL_DEFAULT_CATEGORY = String(process.env.AUTO_CRAWL_DEFAULT_CATEGORY || 'AI 与大语言模型');

// Separate feed sets: general AI projects vs OpenClaw/Claw-related projects.
const AUTO_CRAWL_FEEDS_AI = String(
  process.env.AUTO_CRAWL_FEEDS_AI ||
    [
      'https://hnrss.org/newest?q=ai%20tool',
      'https://hnrss.org/newest?q=llm%20tool',
      'https://hnrss.org/newest?q=ai%20agent',
      // Fallback feeds (we filter heavily; might still yield projects via outbound links).
      'https://www.therundown.ai/rss',
      'https://aiweekly.co/rss'
    ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const AUTO_CRAWL_FEEDS_OPENCLAW = String(
  process.env.AUTO_CRAWL_FEEDS_OPENCLAW ||
    [
      'https://hnrss.org/newest?q=openclaw',
      'https://hnrss.org/newest?q=claw%20ai',
      'https://hnrss.org/newest?q=openclaw%20project',
      'https://hnrss.org/newest?q=openclaw%20tool'
    ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let autoCrawlRunning = false;
let autoCrawlLastResult = null; // { at, ai: {added, checked, errors}, openclaw: {added, checked, errors} }

function parseEpochMs(raw) {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  const t = Date.parse(String(raw || ''));
  return Number.isFinite(t) ? t : 0;
}

function normalizeUrlForDedup(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    u.hash = '';
    // Drop common tracking params.
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'].forEach((k) =>
      u.searchParams.delete(k)
    );
    // Normalize trailing slash.
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return String(raw || '').trim();
  }
}

function extractFromHtml(html, fallbackUrl) {
  const text = String(html || '');
  const titleMatch = text.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const ogTitleMatch = text.match(/<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']{1,200})[\"'][^>]*>/i);
  const descMatch = text.match(/<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']{1,500})[\"'][^>]*>/i);
  const ogDescMatch = text.match(/<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"']([^\"']{1,500})[\"'][^>]*>/i);
  const title = String((ogTitleMatch?.[1] || titleMatch?.[1] || '')).replace(/\s+/g, ' ').trim();
  const description = String((ogDescMatch?.[1] || descMatch?.[1] || '')).replace(/\s+/g, ' ').trim();
  const url = normalizeUrlForDedup(fallbackUrl);
  return { title, description, url };
}

function decodeHtmlEntitiesBasic(text) {
  // Only decode a small safe subset for URLs/text extraction.
  return String(text || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
}

function canonicalHomepageUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return '';
  }
}

function extractExternalLinksFromHtml(html, baseUrl) {
  const out = [];
  const text = String(html || '');
  const re = /<a\s+[^>]*href=["']([^"']+)["']/gi;

  let baseHost = '';
  try {
    baseHost = new URL(String(baseUrl || '')).hostname.replace(/^www\./i, '');
  } catch {
    baseHost = '';
  }

  const blockedHosts = new Set([
    'twitter.com',
    'x.com',
    't.co',
    'facebook.com',
    'm.facebook.com',
    'linkedin.com',
    'instagram.com',
    'youtube.com',
    'youtu.be',
    'discord.gg',
    'discord.com',
    't.me',
    'telegram.me',
    'reddit.com'
  ]);

  for (let m = re.exec(text); m; m = re.exec(text)) {
    const rawHref = decodeHtmlEntitiesBasic(String(m[1] || '')).trim();
    if (!rawHref) continue;
    if (rawHref.startsWith('#')) continue;
    if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) continue;
    if (/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|rar)(\?|#|$)/i.test(rawHref)) continue;

    let abs = '';
    try {
      abs = new URL(rawHref, baseUrl).toString();
    } catch {
      continue;
    }
    if (!isValidUrl(abs)) continue;

    let host = '';
    try {
      host = new URL(abs).hostname.replace(/^www\./i, '');
    } catch {
      host = '';
    }
    if (!host) continue;
    if (blockedHosts.has(host)) continue;
    if (baseHost && host === baseHost) continue;

    const home = canonicalHomepageUrl(abs);
    if (!home) continue;
    out.push(home);
  }

  return Array.from(new Set(out));
}

function parseRssItems(xml) {
  const text = String(xml || '');
  const items = text.match(/<item[\s\S]*?<\/item>/gi) || [];
  const out = [];
  for (const item of items) {
    const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const description = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .trim();
    if (!link) continue;
    out.push({ link, title, description });
  }
  return out;
}

function looksLikeNewsOrMediaSite({ url, title, description }) {
  const u = String(url || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();
  const host = (() => {
    try {
      return new URL(u).hostname.replace(/^www\./i, '');
    } catch {
      return '';
    }
  })();

  // Strong signals: matches the "latest news / analysis / events" style sites.
  const strongSignals = [
    'latest news',
    'reports on the latest',
    'analysis & events',
    'analysis and events',
    'from the frontline',
    'breaking news'
  ];
  if (strongSignals.some((s) => t.includes(s) || d.includes(s))) return true;

  // Hostname patterns.
  const hostBad = /(news|weekly|journal|magazine|press|media|blog|newsletter|digest|reports?)\./i;
  if (host && hostBad.test(host)) return true;

  // Platform/blog hosts.
  const platformBad = /(medium\.com|substack\.com|wordpress\.com|blogspot\.com)/i;
  if (platformBad.test(u)) return true;

  // Title-only "Home" is usually not a product page.
  if (t === 'home' && (d.includes('news') || d.includes('reports'))) return true;
  return false;
}

function looksLikeAiProject({ url, title, description }) {
  const u = String(url || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();

  // Strong preference: claw/openclaw.
  if (
    u.includes('openclaw') ||
    u.includes('claw') ||
    t.includes('openclaw') ||
    t.includes('claw') ||
    d.includes('openclaw') ||
    d.includes('claw')
  ) {
    return true;
  }

  const keywords = [
    'ai',
    'artificial intelligence',
    'llm',
    'gpt',
    'agent',
    'copilot',
    'prompt',
    'automation',
    'workflow',
    'vector',
    'embedding',
    'rag',
    'chatbot',
    'model'
  ];
  const hay = `${u} ${t} ${d}`;
  return keywords.some((k) => hay.includes(k));
}

function classifyCategory({ url, title, description }) {
  const u = String(url || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();
  const hay = `${u} ${t} ${d}`;

  const rules = [
    { name: 'DevOps 与云', keywords: ['devops', 'kubernetes', 'k8s', 'docker', 'container', 'ci/cd', 'cicd', 'observability', 'datadog', 'cloud'] },
    { name: '开发与编码', keywords: ['github', 'gitlab', 'sdk', 'api', 'developer', 'devtool', 'cli', 'coding', 'code', 'programming', 'typescript', 'javascript', 'python', 'java', 'golang', 'rust'] },
    { name: '浏览器与网页自动化', keywords: ['browser', 'web automation', 'playwright', 'selenium', 'puppeteer', 'scrape', 'scraping', 'crawler', 'crawl', 'firecrawl', 'skyvern'] },
    { name: '营销与销售', keywords: ['marketing', 'sales', 'seo', 'lead', 'crm', 'outreach', 'campaign', 'ads', 'advertising'] },
    { name: '生产力与工作流', keywords: ['productivity', 'workflow', 'zapier', 'notion', 'tasks', 'project management', 'smartsheet', 'calendar', 'meeting'] },
    { name: '搜索与研究', keywords: ['search', 'research', 'paper', 'arxiv', 'literature', 'knowledge', 'perplexity', 'answer engine'] },
    { name: '通信与社交', keywords: ['chat', 'messaging', 'social', 'community', 'feed', 'buffer', 'timeline'] },
    { name: '媒体与内容', keywords: ['video', 'image', 'audio', 'content', 'writer', 'copywriting', 'subtitle', 'transcribe', 'podcast', 'synthesia', 'jasper'] },
    { name: '金融与加密货币', keywords: ['crypto', 'wallet', 'trading', 'exchange', 'defi', 'blockchain', 'bitcoin', 'ethereum', 'quant'] },
    { name: '健康与健身', keywords: ['health', 'fitness', 'workout', 'nutrition', 'sleep', 'coach', 'training'] },
    { name: '安全与监控', keywords: ['security', 'vulnerability', 'snyk', 'monitoring', 'soc', 'siem', 'zero trust', 'threat'] },
    { name: '自动化与实用工具', keywords: ['automation', 'agent', 'utility', 'tool', 'integration', 'integrations', 'bot'] },
    { name: '业务运营', keywords: ['business', 'operations', 'support', 'customer', 'billing', 'invoice', 'back office', 'backoffice', 'hr'] },
    { name: '代理协调', keywords: ['orchestration', 'multi-agent', 'agent orchestration', 'coordination', 'swarm'] },
    { name: 'AI 与大语言模型', keywords: ['llm', 'gpt', 'chatgpt', 'gemini', 'claude', 'openai', 'model', 'rag', 'embedding', 'prompt', 'token'] }
  ];

  let bestName = 'AI 与大语言模型';
  let bestScore = 0;
  for (const rule of rules) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (hay.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestName = rule.name;
    }
  }
  return bestName;
}

async function fetchText(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = await resp.text();
    return body.slice(0, 300000); // cap
  } finally {
    clearTimeout(timer);
  }
}

function siteExistsByUrl(url) {
  const u = normalizeUrlForDedup(url);
  if (!u) return true;
  const candidates = new Set();
  candidates.add(u);
  candidates.add(u.endsWith('/') ? u.slice(0, -1) : `${u}/`);
  try {
    const parsed = new URL(u);
    const hostname = parsed.hostname || '';
    const toggled = hostname.startsWith('www.') ? hostname.slice(4) : `www.${hostname}`;
    if (toggled && toggled !== hostname) {
      const alt = new URL(u);
      alt.hostname = toggled;
      const altStr = alt.toString();
      candidates.add(altStr);
      candidates.add(altStr.endsWith('/') ? altStr.slice(0, -1) : `${altStr}/`);
    }
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    const row = db.prepare('SELECT 1 FROM sites WHERE url = ? LIMIT 1').get(candidate);
    if (row) return true;
  }
  return false;
}

async function enqueuePendingSite({ name, url, description, category, source = 'auto_crawl' }) {
  const trimmedName = String(name || '').trim();
  const trimmedUrl = normalizeUrlForDedup(url);
  const trimmedDesc = String(description || '').trim();
  const trimmedCategory = String(category || AUTO_CRAWL_DEFAULT_CATEGORY).trim();
  if (!trimmedName || !trimmedUrl || !isValidUrl(trimmedUrl)) return false;
  if (siteExistsByUrl(trimmedUrl)) return false;

  const nameEn = await autoTranslateToEn(trimmedName);
  const descEn = await autoTranslateToEn(trimmedDesc);
  const nameEnFinal = nameEn || (hasCjk(trimmedName) ? '' : trimmedName);
  const descEnFinal = descEn || (hasCjk(trimmedDesc) ? '' : trimmedDesc);

  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO sites (name, name_en, url, description, description_en, category, source, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = stmt.run(trimmedName, nameEnFinal, trimmedUrl, trimmedDesc, descEnFinal, trimmedCategory, source);
    return Boolean(result.changes);
  } catch {
    return false;
  }
}

function looksLikeOpenClawProject({ url, title, description }) {
  const u = String(url || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();
  return u.includes('openclaw') || u.includes('claw') || t.includes('openclaw') || t.includes('claw') || d.includes('openclaw') || d.includes('claw');
}

async function autoCrawlOnce({ feeds, maxToAdd, requireOpenClaw = false, source }) {
  const checked = { feeds: 0, links: 0 };
  let added = 0;
  let errors = 0;

  for (const feedUrl of feeds) {
    if (added >= maxToAdd) break;
    checked.feeds += 1;
    let xml = '';
    try {
      xml = await fetchText(feedUrl, 8000);
    } catch {
      errors += 1;
      continue;
    }
    const items = parseRssItems(xml).slice(0, 40);
    const isHnRss = /:\/\/hnrss\.org\//i.test(feedUrl);
    for (const it of items) {
      if (added >= maxToAdd) break;
      checked.links += 1;
      const link = normalizeUrlForDedup(it.link);
      if (!link || !isValidUrl(link)) continue;

      // HNRSS items are already external links (often products/projects). Treat them as candidates directly.
      if (isHnRss) {
        if (siteExistsByUrl(link)) continue;
        let siteHtml = '';
        try {
          siteHtml = await fetchText(link, 8000);
        } catch {
          errors += 1;
          continue;
        }
        const meta = extractFromHtml(siteHtml, link);
        const candidate = {
          url: meta.url,
          title: meta.title || it.title || '',
          description: meta.description || it.description || ''
        };
        if (looksLikeNewsOrMediaSite(candidate)) continue;
        if (!looksLikeAiProject(candidate)) continue;
        if (requireOpenClaw && !looksLikeOpenClawProject(candidate)) continue;
        const predictedCategory = classifyCategory(candidate);
        const ok = await enqueuePendingSite({
          name: candidate.title || candidate.url,
          url: candidate.url,
          description: candidate.description,
          category: predictedCategory || AUTO_CRAWL_DEFAULT_CATEGORY,
          source
        });
        if (ok) added += 1;
        continue;
      }

      // For normal news-like feeds: use article as seed but only accept links that look like AI projects.
      let html = '';
      try {
        html = await fetchText(link, 8000);
      } catch {
        errors += 1;
        continue;
      }

      const candidates = extractExternalLinksFromHtml(html, link).slice(0, 40);
      for (const candidateUrl of candidates) {
        if (added >= maxToAdd) break;
        if (!candidateUrl || !isValidUrl(candidateUrl)) continue;
        if (siteExistsByUrl(candidateUrl)) continue;

        let siteHtml = '';
        try {
          siteHtml = await fetchText(candidateUrl, 8000);
        } catch {
          errors += 1;
          continue;
        }
        const meta = extractFromHtml(siteHtml, candidateUrl);
        const candidate = { url: meta.url, title: meta.title || '', description: meta.description || '' };
        if (looksLikeNewsOrMediaSite(candidate)) continue;
        if (!looksLikeAiProject(candidate)) continue;
        if (requireOpenClaw && !looksLikeOpenClawProject(candidate)) continue;
        const predictedCategory = classifyCategory(candidate);

        const ok = await enqueuePendingSite({
          name: candidate.title || candidate.url,
          url: candidate.url,
          description: candidate.description,
          category: predictedCategory || AUTO_CRAWL_DEFAULT_CATEGORY,
          source
        });
        if (ok) added += 1;
      }
    }
  }

  return { added, checked, errors };
}

app.get('/api/admin/auto-crawl/status', requireAdmin, (_req, res) => {
  const enabled = getSetting('auto_crawl_enabled', '0') === '1';
  const lastRunMsAi = parseEpochMs(getSetting('auto_crawl_last_run_ai', '0'));
  const lastRunMsOpenclaw = parseEpochMs(getSetting('auto_crawl_last_run_openclaw', '0'));
  res.json({
    ok: true,
    enabled,
    running: autoCrawlRunning,
    lastRunMsAi,
    lastRunMsOpenclaw,
    intervalMs: AUTO_CRAWL_INTERVAL_MS,
    maxPerRunAi: AUTO_CRAWL_MAX_PER_RUN_AI,
    maxPerRunOpenclaw: AUTO_CRAWL_MAX_PER_RUN_OPENCLAW,
    feedsAi: AUTO_CRAWL_FEEDS_AI,
    feedsOpenclaw: AUTO_CRAWL_FEEDS_OPENCLAW,
    lastResult: autoCrawlLastResult
  });
});

app.post('/api/admin/auto-crawl/enable', requireAdmin, (_req, res) => {
  upsertSettingStmt.run('auto_crawl_enabled', '1');
  res.json({ ok: true, enabled: true });
});

app.post('/api/admin/auto-crawl/disable', requireAdmin, (_req, res) => {
  upsertSettingStmt.run('auto_crawl_enabled', '0');
  res.json({ ok: true, enabled: false });
});

app.post('/api/admin/auto-crawl/run-now', requireAdmin, async (_req, res) => {
  if (autoCrawlRunning) return res.status(409).json({ error: '正在抓取中，请稍后再试' });
  autoCrawlRunning = true;
  try {
    const now = Date.now();
    const openclaw = await autoCrawlOnce({
      feeds: AUTO_CRAWL_FEEDS_OPENCLAW,
      maxToAdd: AUTO_CRAWL_MAX_PER_RUN_OPENCLAW,
      requireOpenClaw: true,
      source: 'auto_crawl_openclaw'
    });
    upsertSettingStmt.run('auto_crawl_last_run_openclaw', String(now));

    // If OpenClaw projects are fewer than expected, top up from general AI so total is still 10.
    const openclawAdded = Number(openclaw?.added || 0);
    const aiMax = AUTO_CRAWL_MAX_PER_RUN_AI + Math.max(0, AUTO_CRAWL_MAX_PER_RUN_OPENCLAW - openclawAdded);
    const ai = await autoCrawlOnce({
      feeds: AUTO_CRAWL_FEEDS_AI,
      maxToAdd: aiMax,
      requireOpenClaw: false,
      source: 'auto_crawl_ai'
    });
    upsertSettingStmt.run('auto_crawl_last_run_ai', String(now));

    autoCrawlLastResult = { at: now, ai, openclaw };
    res.json({ ok: true, at: now, ai, openclaw });
  } catch {
    res.status(500).json({ error: '抓取失败' });
  } finally {
    autoCrawlRunning = false;
  }
});

app.post('/api/admin/auto-crawl/clear-pending', requireAdmin, (_req, res) => {
  const result = db
    .prepare(
      `
      UPDATE sites
      SET status = 'rejected',
          reviewer_note = 'auto_crawl cleared',
          reviewed_by = 'admin',
          reviewed_at = datetime('now')
      WHERE status = 'pending' AND source IN ('auto_crawl','auto_crawl_ai','auto_crawl_openclaw')
    `
    )
    .run();
  res.json({ ok: true, cleared: Number(result.changes || 0) });
});

async function autoCrawlTick() {
  if (autoCrawlRunning) return;
  const enabled = getSetting('auto_crawl_enabled', '0') === '1';
  if (!enabled) return;
  const now = Date.now();
  const lastRunMsAi = parseEpochMs(getSetting('auto_crawl_last_run_ai', '0'));
  const lastRunMsOpenclaw = parseEpochMs(getSetting('auto_crawl_last_run_openclaw', '0'));
  const dueAi = !lastRunMsAi || now - lastRunMsAi >= AUTO_CRAWL_INTERVAL_MS;
  const dueOpenclaw = !lastRunMsOpenclaw || now - lastRunMsOpenclaw >= AUTO_CRAWL_INTERVAL_MS;
  if (!dueAi && !dueOpenclaw) return;

  autoCrawlRunning = true;
  try {
    const openclaw = dueOpenclaw
      ? await autoCrawlOnce({
          feeds: AUTO_CRAWL_FEEDS_OPENCLAW,
          maxToAdd: AUTO_CRAWL_MAX_PER_RUN_OPENCLAW,
          requireOpenClaw: true,
          source: 'auto_crawl_openclaw'
        })
      : null;
    if (dueOpenclaw) upsertSettingStmt.run('auto_crawl_last_run_openclaw', String(now));

    const openclawAdded = Number(openclaw?.added || 0);
    const aiMax = AUTO_CRAWL_MAX_PER_RUN_AI + Math.max(0, AUTO_CRAWL_MAX_PER_RUN_OPENCLAW - openclawAdded);
    const ai = dueAi
      ? await autoCrawlOnce({
          feeds: AUTO_CRAWL_FEEDS_AI,
          maxToAdd: aiMax,
          requireOpenClaw: false,
          source: 'auto_crawl_ai'
        })
      : null;
    if (dueAi) upsertSettingStmt.run('auto_crawl_last_run_ai', String(now));

    autoCrawlLastResult = { at: now, ai, openclaw };
  } catch {
    // ignore
  } finally {
    autoCrawlRunning = false;
  }
}

// Poll every minute; run at most once per hour when enabled.
setInterval(() => {
  autoCrawlTick();
}, 60 * 1000).unref?.();

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
