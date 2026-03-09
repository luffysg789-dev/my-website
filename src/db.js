const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const projectDataDir = path.join(__dirname, '..', 'data');
const projectDbPath = path.join(projectDataDir, 'claw800.db');

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {
    // ignore
  }
}

function pickPersistentDbPath() {
  // Highest priority: explicit path.
  if (process.env.CLAW800_DB_PATH) return String(process.env.CLAW800_DB_PATH);
  if (process.env.CLAW800_DATA_DIR) return path.join(String(process.env.CLAW800_DATA_DIR), 'claw800.db');

  // On Linux servers, prefer an external persistent dir so code updates won't wipe data.
  if (process.platform === 'linux') {
    const candidates = [
      process.env.CLAW800_PERSIST_DIR ? String(process.env.CLAW800_PERSIST_DIR) : '',
      '/www/wwwroot/claw800-data',
      '/var/lib/claw800',
      '/opt/claw800-data'
    ].filter(Boolean);

    for (const dir of candidates) {
      try {
        ensureDir(dir);
        const dbPath = path.join(dir, 'claw800.db');
        // If we already have a db in the project folder, but not in the persistent folder,
        // copy it once so future deployments keep the same data.
        if (fs.existsSync(projectDbPath) && !fs.existsSync(dbPath)) {
          fs.copyFileSync(projectDbPath, dbPath);
        }
        return dbPath;
      } catch {
        // try next dir
      }
    }
  }

  // Default (local dev / macOS): keep DB in project folder.
  return projectDbPath;
}

const dbPath = pickPersistentDbPath();
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
const DEFAULT_CATEGORIES = [
  'AI 与大语言模型',
  '开发与编码',
  'DevOps 与云',
  '浏览器与网页自动化',
  '营销与销售',
  '生产力与工作流',
  '搜索与研究',
  '通信与社交',
  '媒体与内容',
  '金融与加密货币',
  '健康与健身',
  '安全与监控',
  '自动化与实用工具',
  '业务运营',
  '代理协调'
];

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT DEFAULT '',
    url TEXT NOT NULL,
    description TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    category TEXT DEFAULT 'OpenClaw 生态',
    source TEXT DEFAULT 'admin',
    submitter_name TEXT DEFAULT '',
    submitter_email TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_note TEXT DEFAULT '',
    reviewed_by TEXT DEFAULT '',
    reviewed_at TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Non-destructive schema evolution for persisted DBs.
const hasNameEn = db.prepare("SELECT 1 FROM pragma_table_info('sites') WHERE name = 'name_en'").get();
if (!hasNameEn) {
  db.exec("ALTER TABLE sites ADD COLUMN name_en TEXT DEFAULT ''");
}
const hasDescEn = db.prepare("SELECT 1 FROM pragma_table_info('sites') WHERE name = 'description_en'").get();
if (!hasDescEn) {
  db.exec("ALTER TABLE sites ADD COLUMN description_en TEXT DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_en TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const hasCategoryNameEn = db.prepare("SELECT 1 FROM pragma_table_info('categories') WHERE name = 'name_en'").get();
if (!hasCategoryNameEn) {
  db.exec("ALTER TABLE categories ADD COLUMN name_en TEXT DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tutorials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_lang TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(target_lang, source_hash)
  );
`);

const defaultAdminPassword = process.env.ADMIN_PASSWORD || '123456';
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('admin_password', ?, datetime('now'))"
).run(defaultAdminPassword);

// Site meta shown on the homepage header (editable from admin).
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_title', ?, datetime('now'))"
).run('claw800.com');
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_subtitle_zh', ?, datetime('now'))"
).run('OpenClaw 生态导航，收录 AI 领域优质网站');
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_subtitle_en', ?, datetime('now'))"
).run('OpenClaw ecosystem directory for AI websites');
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_html_title_zh', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_html_title_en', '', datetime('now'))"
).run();

// Footer (editable from admin).
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_footer_copyright_zh', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_footer_copyright_en', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_footer_links', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_footer_contact_zh', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_footer_contact_en', '', datetime('now'))"
).run();

// Site icon (favicon). Can be a URL or a data URL.
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_icon', '', datetime('now'))"
).run();

// Auto-crawl settings (admin toggles). Stored as strings in settings.
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('auto_crawl_enabled', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('auto_crawl_last_run', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('auto_crawl_last_run_ai', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('auto_crawl_last_run_openclaw', '', datetime('now'))"
).run();

function migrateUniqueUrlToUrlCategory() {
  const tableSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sites'").get();
  const tableSql = String(tableSqlRow?.sql || '').toLowerCase();
  const usesOldUrlUnique = tableSql.includes('url text not null unique');

  if (!usesOldUrlUnique) {
    return;
  }

  // Run at most once per DB to avoid repeated table rebuilds.
  const flagKey = 'migration:unique_url_to_url_category_v1';
  const already = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(flagKey);
  if (already) return;

  db.exec(`
    BEGIN;
    ALTER TABLE sites RENAME TO sites_old;
    CREATE TABLE sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      url TEXT NOT NULL,
      description TEXT DEFAULT '',
      description_en TEXT DEFAULT '',
      category TEXT DEFAULT 'OpenClaw 生态',
      source TEXT DEFAULT 'admin',
      submitter_name TEXT DEFAULT '',
      submitter_email TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_note TEXT DEFAULT '',
      reviewed_by TEXT DEFAULT '',
      reviewed_at TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO sites (
      id, name, name_en, url, description, description_en, category, source, submitter_name, submitter_email,
      status, reviewer_note, reviewed_by, reviewed_at, created_at
    )
    SELECT
      id, name,
      COALESCE(name_en, ''),
      url,
      COALESCE(description, ''),
      COALESCE(description_en, ''),
      COALESCE(category, 'OpenClaw 生态'),
      COALESCE(source, 'admin'),
      COALESCE(submitter_name, ''),
      COALESCE(submitter_email, ''),
      status, reviewer_note, reviewed_by, reviewed_at, created_at
    FROM sites_old;
    DROP TABLE sites_old;
    INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('migration:unique_url_to_url_category_v1', '1', datetime('now'));
    COMMIT;
  `);
}

migrateUniqueUrlToUrlCategory();

const hasSortOrder = db.prepare("SELECT 1 FROM pragma_table_info('sites') WHERE name = 'sort_order'").get();
if (!hasSortOrder) {
  db.exec('ALTER TABLE sites ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_url_category_unique
  ON sites(url, category);
`);

function runMigrationOnce(key, fn) {
  const flagKey = `migration:${String(key || '').trim()}`;
  if (!flagKey || flagKey === 'migration:') return;
  const exists = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(flagKey);
  if (exists) return;
  const tx = db.transaction(() => {
    fn();
    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
    ).run(flagKey, '1');
  });
  tx();
}

// Category normalization (run once, never on every boot).
runMigrationOnce('normalize_categories_v1', () => {
  db.prepare("UPDATE sites SET category = 'AI 与大语言模型' WHERE category = '大模型'").run();
  db.prepare("UPDATE sites SET category = 'AI 与大语言模型' WHERE category = 'OpenClaw 生态'").run();
});

const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (!categoryCount) {
  const insertCategory = db.prepare('INSERT INTO categories (name, sort_order, is_enabled) VALUES (?, ?, 1)');
  const tx = db.transaction(() => {
    DEFAULT_CATEGORIES.forEach((name, idx) => insertCategory.run(name, idx));
  });
  tx();
}

// Ensure historical site categories are visible in category manager.
const existingCategoryNames = new Set(
  db.prepare('SELECT name FROM categories').all().map((row) => row.name)
);
const siteCategories = db
  .prepare("SELECT DISTINCT category FROM sites WHERE category IS NOT NULL AND TRIM(category) <> ''")
  .all()
  .map((row) => row.category);
const nextSort = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories').get().n;
let sortCursor = nextSort;
const insertMissingCategory = db.prepare('INSERT OR IGNORE INTO categories (name, sort_order, is_enabled) VALUES (?, ?, 1)');
for (const category of siteCategories) {
  if (existingCategoryNames.has(category)) continue;
  insertMissingCategory.run(category, sortCursor++);
  existingCategoryNames.add(category);
}

function seedOpenClawSites() {
  const seedPath = path.join(__dirname, '..', 'seed', 'openclaw-sites.json');
  if (!fs.existsSync(seedPath)) {
    return;
  }

  const rows = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const insert = db.prepare(`
    INSERT OR IGNORE INTO sites (
      name, url, description, category, source, status, reviewed_by, reviewed_at
    ) VALUES (
      @name, @url, @description, @category, 'seed_openclaw', 'approved', 'system', datetime('now')
    )
  `);

  const tx = db.transaction((items) => {
    for (const item of items) {
      insert.run({
        name: item.name,
        url: item.url,
        description: item.description || '',
        category: item.category || 'OpenClaw 生态'
      });
    }
  });

  tx(rows);
}

seedOpenClawSites();

module.exports = db;
