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
db.pragma('foreign_keys = ON');
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
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_hot INTEGER NOT NULL DEFAULT 0,
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
const hasIsHot = db.prepare("SELECT 1 FROM pragma_table_info('sites') WHERE name = 'is_hot'").get();
if (!hasIsHot) {
  db.exec('ALTER TABLE sites ADD COLUMN is_hot INTEGER NOT NULL DEFAULT 0');
}
const hasIsPinned = db.prepare("SELECT 1 FROM pragma_table_info('sites') WHERE name = 'is_pinned'").get();
if (!hasIsPinned) {
  db.exec('ALTER TABLE sites ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
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
  CREATE TABLE IF NOT EXISTS skills_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT DEFAULT '',
    url TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    category TEXT DEFAULT '',
    category_en TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_hot INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS skills_catalog_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT DEFAULT '',
    url TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    category TEXT DEFAULT '',
    category_en TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS games_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    secondary_image TEXT DEFAULT '',
    sound_file TEXT DEFAULT '',
    background_music_file TEXT DEFAULT '',
    is_enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS game_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS game_wallets (
    user_id INTEGER PRIMARY KEY,
    currency TEXT NOT NULL DEFAULT 'USDT',
    available_balance TEXT NOT NULL DEFAULT '0',
    frozen_balance TEXT NOT NULL DEFAULT '0',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS game_wallet_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount TEXT NOT NULL,
    balance_after TEXT NOT NULL,
    related_type TEXT NOT NULL DEFAULT '',
    related_id TEXT NOT NULL DEFAULT '',
    remark TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS p_mining_users (
    user_id INTEGER PRIMARY KEY,
    invite_code TEXT NOT NULL UNIQUE,
    bound_invite_code TEXT NOT NULL DEFAULT '',
    balance_p REAL NOT NULL DEFAULT 0,
    power INTEGER NOT NULL DEFAULT 10,
    invite_count INTEGER NOT NULL DEFAULT 0,
    invite_power_bonus INTEGER NOT NULL DEFAULT 0,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_reason TEXT NOT NULL DEFAULT '',
    last_risk_at INTEGER NOT NULL DEFAULT 0,
    mining_ban_until INTEGER NOT NULL DEFAULT 0,
    claim_streak_count INTEGER NOT NULL DEFAULT 0,
    last_claim_success_at INTEGER NOT NULL DEFAULT 0,
    human_check_required INTEGER NOT NULL DEFAULT 0,
    last_claim_at INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

const hasPMiningRiskScore = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'risk_score'").get();
if (!hasPMiningRiskScore) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN risk_score INTEGER NOT NULL DEFAULT 0");
}
const hasPMiningRiskReason = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'risk_reason'").get();
if (!hasPMiningRiskReason) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN risk_reason TEXT NOT NULL DEFAULT ''");
}
const hasPMiningLastRiskAt = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'last_risk_at'").get();
if (!hasPMiningLastRiskAt) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN last_risk_at INTEGER NOT NULL DEFAULT 0");
}
const hasPMiningMiningBanUntil = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'mining_ban_until'").get();
if (!hasPMiningMiningBanUntil) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN mining_ban_until INTEGER NOT NULL DEFAULT 0");
}
const hasPMiningClaimStreakCount = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'claim_streak_count'").get();
if (!hasPMiningClaimStreakCount) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN claim_streak_count INTEGER NOT NULL DEFAULT 0");
}
const hasPMiningLastClaimSuccessAt = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'last_claim_success_at'").get();
if (!hasPMiningLastClaimSuccessAt) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN last_claim_success_at INTEGER NOT NULL DEFAULT 0");
}
const hasPMiningHumanCheckRequired = db.prepare("SELECT 1 FROM pragma_table_info('p_mining_users') WHERE name = 'human_check_required'").get();
if (!hasPMiningHumanCheckRequired) {
  db.exec("ALTER TABLE p_mining_users ADD COLUMN human_check_required INTEGER NOT NULL DEFAULT 0");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS p_mining_claim_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reward_p REAL NOT NULL,
    power_snapshot INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS p_mining_invite_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    invite_code TEXT NOT NULL DEFAULT '',
    reward_power INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS p_mining_power_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    delta_power INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    related_type TEXT NOT NULL DEFAULT '',
    related_id TEXT NOT NULL DEFAULT '',
    usdt_amount REAL NOT NULL DEFAULT 0,
    purchased_power INTEGER NOT NULL DEFAULT 0,
    source_open_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS p_mining_payment_orders (
    order_no TEXT PRIMARY KEY,
    partner_order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    tier TEXT NOT NULL,
    power_amount INTEGER NOT NULL DEFAULT 0,
    usdt_amount TEXT NOT NULL DEFAULT '0.00',
    status TEXT NOT NULL DEFAULT 'PENDING',
    nexa_order_no TEXT NOT NULL DEFAULT '',
    notify_payload TEXT NOT NULL DEFAULT '',
    paid_at TEXT NOT NULL DEFAULT '',
    settled_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS nexa_game_deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    status TEXT NOT NULL DEFAULT 'pending',
    nexa_order_no TEXT NOT NULL DEFAULT '',
    notify_payload TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS nexa_game_withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    status TEXT NOT NULL DEFAULT 'review_pending',
    nexa_order_no TEXT NOT NULL DEFAULT '',
    notify_payload TEXT NOT NULL DEFAULT '',
    review_note TEXT NOT NULL DEFAULT '',
    reviewed_by TEXT NOT NULL DEFAULT '',
    reviewed_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(user_id) REFERENCES game_users(id)
  );
`);
const hasWithdrawalNexaOrderNo = db.prepare("SELECT 1 FROM pragma_table_info('nexa_game_withdrawals') WHERE name = 'nexa_order_no'").get();
if (!hasWithdrawalNexaOrderNo) {
  db.exec("ALTER TABLE nexa_game_withdrawals ADD COLUMN nexa_order_no TEXT NOT NULL DEFAULT ''");
}
const hasWithdrawalReviewNote = db.prepare("SELECT 1 FROM pragma_table_info('nexa_game_withdrawals') WHERE name = 'review_note'").get();
if (!hasWithdrawalReviewNote) {
  db.exec("ALTER TABLE nexa_game_withdrawals ADD COLUMN review_note TEXT NOT NULL DEFAULT ''");
}
const hasWithdrawalReviewedBy = db.prepare("SELECT 1 FROM pragma_table_info('nexa_game_withdrawals') WHERE name = 'reviewed_by'").get();
if (!hasWithdrawalReviewedBy) {
  db.exec("ALTER TABLE nexa_game_withdrawals ADD COLUMN reviewed_by TEXT NOT NULL DEFAULT ''");
}
const hasWithdrawalReviewedAt = db.prepare("SELECT 1 FROM pragma_table_info('nexa_game_withdrawals') WHERE name = 'reviewed_at'").get();
if (!hasWithdrawalReviewedAt) {
  db.exec("ALTER TABLE nexa_game_withdrawals ADD COLUMN reviewed_at TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS xiangqi_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL UNIQUE,
    creator_user_id INTEGER NOT NULL,
    joiner_user_id INTEGER DEFAULT NULL,
    stake_amount TEXT NOT NULL,
    time_control_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING',
    rematch_requested_by INTEGER DEFAULT NULL,
    rematch_requested_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT NOT NULL DEFAULT '',
    finished_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(creator_user_id) REFERENCES game_users(id),
    FOREIGN KEY(joiner_user_id) REFERENCES game_users(id)
  );
`);
const hasXiangqiRoomRematchRequestedBy = db.prepare("SELECT 1 FROM pragma_table_info('xiangqi_rooms') WHERE name = 'rematch_requested_by'").get();
if (!hasXiangqiRoomRematchRequestedBy) {
  db.exec("ALTER TABLE xiangqi_rooms ADD COLUMN rematch_requested_by INTEGER DEFAULT NULL");
}
const hasXiangqiRoomRematchRequestedAt = db.prepare("SELECT 1 FROM pragma_table_info('xiangqi_rooms') WHERE name = 'rematch_requested_at'").get();
if (!hasXiangqiRoomRematchRequestedAt) {
  db.exec("ALTER TABLE xiangqi_rooms ADD COLUMN rematch_requested_at TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS xiangqi_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    red_user_id INTEGER NOT NULL,
    black_user_id INTEGER NOT NULL,
    current_fen TEXT NOT NULL DEFAULT '',
    turn_side TEXT NOT NULL DEFAULT 'RED',
    red_time_left_ms INTEGER NOT NULL DEFAULT 0,
    black_time_left_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PLAYING',
    result TEXT NOT NULL DEFAULT '',
    winner_user_id INTEGER DEFAULT NULL,
    last_move_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(room_id) REFERENCES xiangqi_rooms(id),
    FOREIGN KEY(red_user_id) REFERENCES game_users(id),
    FOREIGN KEY(black_user_id) REFERENCES game_users(id),
    FOREIGN KEY(winner_user_id) REFERENCES game_users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS xiangqi_moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    move_no INTEGER NOT NULL,
    side TEXT NOT NULL,
    from_pos TEXT NOT NULL,
    to_pos TEXT NOT NULL,
    fen_after TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(match_id) REFERENCES xiangqi_matches(id)
  );
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_xiangqi_matches_room_unique
  ON xiangqi_matches(room_id);
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_xiangqi_moves_match_move_no_unique
  ON xiangqi_moves(match_id, move_no);
`);

const DEFAULT_GAMES_CATALOG = [
  {
    slug: 'p-mining',
    name: 'P-Mining',
    description: '移动端优先的云挖矿原型，突出透明产出、邀请加成与实时网络数据。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 54
  },
  {
    slug: 'piano',
    name: '钢琴',
    description: '手机横屏优先的双八度网页钢琴，轻触即响，支持多键同时演奏。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 52
  },
  {
    slug: 'zodiac-today',
    name: '今日星座运势',
    description: '输入名字和阳历生日，生成你今天的专属星座分析。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 35
  },
  {
    slug: 'blast-balloons',
    name: '气球爆炸',
    description: '50个气球里藏着炸弹，多点触控连点找出全部炸弹。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 50
  },
  {
    slug: 'xiangqi',
    name: '中国象棋在线',
    description: '真钱房间中国象棋，支持充值、提现、开房下注与在线对战。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 45
  },
  {
    slug: 'gomoku',
    name: '五子棋',
    description: '15x15 棋盘，支持真人对战与人机对战。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 40
  },
  {
    slug: 'minesweeper',
    name: '扫雷',
    description: '经典扫雷网页小游戏，支持手机版触控、插旗模式、难度切换和重新开始。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 30
  },
  {
    slug: 'fortune',
    name: '今日运势',
    description: '结合东方抽签氛围的轻量小游戏，点击签筒摇一摇，抽出你今天的财运签。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 20
  },
  {
    slug: 'muyu',
    name: '敲木鱼',
    description: '轻点木鱼一下，功德 +1。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 10
  }
];

const hasGamesSecondaryImage = db.prepare("SELECT 1 FROM pragma_table_info('games_catalog') WHERE name = 'secondary_image'").get();
if (!hasGamesSecondaryImage) {
  db.exec("ALTER TABLE games_catalog ADD COLUMN secondary_image TEXT DEFAULT ''");
}
const hasGamesBackgroundMusic = db.prepare("SELECT 1 FROM pragma_table_info('games_catalog') WHERE name = 'background_music_file'").get();
if (!hasGamesBackgroundMusic) {
  db.exec("ALTER TABLE games_catalog ADD COLUMN background_music_file TEXT DEFAULT ''");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_games_catalog_enabled_sort
  ON games_catalog(is_enabled DESC, sort_order DESC, updated_at DESC);
`);

function ensureDefaultGamesCatalog() {
  const insertGame = db.prepare(`
    INSERT OR IGNORE INTO games_catalog
    (slug, name, description, cover_image, secondary_image, sound_file, background_music_file, is_enabled, sort_order, updated_at)
    VALUES
    (@slug, @name, @description, @cover_image, @secondary_image, @sound_file, @background_music_file, @is_enabled, @sort_order, datetime('now'))
  `);
  const tx = db.transaction((items) => {
    for (const item of items) insertGame.run(item);
  });
  tx(DEFAULT_GAMES_CATALOG);
}

ensureDefaultGamesCatalog();

db.prepare(`
  UPDATE games_catalog
  SET description = '轻点木鱼一下，功德 +1。', updated_at = datetime('now')
  WHERE slug = 'muyu'
    AND description = '轻点木鱼一下，功德 +1。保留简洁仪式感，支持手机触控、音效和自动保存。'
`).run();

const hasSkillsCatalogSortOrder = db.prepare("SELECT 1 FROM pragma_table_info('skills_catalog') WHERE name = 'sort_order'").get();
if (!hasSkillsCatalogSortOrder) {
  db.exec('ALTER TABLE skills_catalog ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
}
const hasSkillsCatalogPinned = db.prepare("SELECT 1 FROM pragma_table_info('skills_catalog') WHERE name = 'is_pinned'").get();
if (!hasSkillsCatalogPinned) {
  db.exec('ALTER TABLE skills_catalog ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
}
const hasSkillsCatalogHot = db.prepare("SELECT 1 FROM pragma_table_info('skills_catalog') WHERE name = 'is_hot'").get();
if (!hasSkillsCatalogHot) {
  db.exec('ALTER TABLE skills_catalog ADD COLUMN is_hot INTEGER NOT NULL DEFAULT 0');
}

const hasSkillsCatalogStagingSortOrder = db.prepare("SELECT 1 FROM pragma_table_info('skills_catalog_staging') WHERE name = 'sort_order'").get();
if (!hasSkillsCatalogStagingSortOrder) {
  db.exec('ALTER TABLE skills_catalog_staging ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_skills_catalog_category
  ON skills_catalog(category);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_skills_catalog_updated
  ON skills_catalog(updated_at DESC);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_skills_catalog_staging_updated
  ON skills_catalog_staging(updated_at DESC);
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

db.exec(`
  CREATE TABLE IF NOT EXISTS visit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    request_path TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    visit_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_visit_logs_date_path
  ON visit_logs(visit_date, request_path);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_visit_logs_date_ip
  ON visit_logs(visit_date, ip_address);
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
).run('龙虾学习导航网，为你的龙虾赋能。');
db.prepare(
  "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'site_subtitle_zh' AND trim(value) = ?"
).run('龙虾学习导航网，为你的龙虾赋能。', 'OpenClaw 生态导航，收录 AI 领域优质网站');
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
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('site_logo', '', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_title_zh', 'Claw123 龙虾技能大全', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_title_en', 'Claw123 Skills Directory', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_subtitle_zh', '同步 claw123.ai 的 OpenClaw 精选技能目录，分类浏览，一键查看和复制安装提示词。', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_subtitle_en', 'Synced from claw123.ai. Browse curated OpenClaw skills by category and copy install prompts in one click.', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_bot_label_zh', 'Bot 安装提示词 — 复制给你的 Bot，它就学会了：', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_bot_label_en', 'Bot Install Prompt — copy this to your Bot and it will learn it:', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_bot_prompt_zh', 'claw123.ai 是 OpenClaw 精选技能导航站，收录 5000+ 可信技能。请学会搜索方法，当主人需要某个技能时优先来这里查找。搜索：fetch https://claw123.ai/api/skills.zh.json 获取完整技能列表，字段包括 name（技能名）、description_zh（中文描述）、category_zh（分类）、url（源地址）。当主人需要某个功能时，先搜索推荐给主人，经主人确认后再安装。不要一次性安装所有技能，按需查找、按需安装。', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_bot_prompt_en', 'claw123.ai is a curated OpenClaw skills directory with 5000+ trusted skills. Learn to search this directory so you can find the right skill when your user needs one. Fetch https://claw123.ai/api/skills.json to get the full list with fields: name, description, category, url. When your user needs a skill, search the list, recommend matching options, and only install after confirmation. Do NOT install all at once — search on demand, install on demand.', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_install_prompt_zh', '你是 OpenClaw 用户的技能安装助手。现在请帮我安装技能「{{name}}」。\\n技能简介：{{description}}\\n技能分类：{{category}}\\n详情链接：{{url}}\\n请按这个流程执行：\\n1. 先打开详情链接，阅读 README、SKILL.md 或安装说明。\\n2. 用中文告诉我这个技能做什么、是否安全、安装后会影响什么。\\n3. 如果需要环境变量、依赖或权限，先明确列出来，再征求我确认。\\n4. 只有在我确认后，才开始安装。\\n5. 安装完成后，告诉我验证方法、使用方法，以及如何卸载或回滚。\\n不要跳过确认步骤，也不要一次性安装无关技能。', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_page_install_prompt_en', 'You are an OpenClaw skill installation assistant. Help me install the skill \"{{name}}\".\\nSkill summary: {{description}}\\nSkill category: {{category}}\\nDetail URL: {{url}}\\nFollow this process:\\n1. Open the detail page and read the README, SKILL.md, or install docs.\\n2. Explain what the skill does, whether it looks safe, and what it may change.\\n3. List any dependencies, env vars, permissions, or prerequisites before installing.\\n4. Wait for my confirmation before you run or install anything.\\n5. After installation, tell me how to verify it, use it, and uninstall or roll it back.\\nDo not skip confirmation and do not install unrelated skills.', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_last_sync_ms', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_last_sync_count', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_last_sync_new_count', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_last_fetch_ms', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_last_fetch_count', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_last_fetch_new_count', '0', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_sync_enabled', '1', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_sync_hour', '10', datetime('now'))"
).run();
db.prepare(
  "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('skills_catalog_sync_minute', '0', datetime('now'))"
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

db.ensureDefaultGamesCatalog = ensureDefaultGamesCatalog;
module.exports = db;
