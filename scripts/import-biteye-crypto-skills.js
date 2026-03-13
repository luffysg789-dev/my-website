#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const seedPath = path.join(__dirname, '..', 'seed', 'biteye-crypto-skills.json');
const sourceUrl = 'https://x.com/BiteyeCN/status/2032401446906609810';
const categoryZh = '加密交易/预测市场';
const categoryEn = 'Crypto Trading / Prediction Markets';
const mode = process.argv.includes('--staging') ? 'staging' : 'catalog';
const manualMeta = {
  'XClaw': {
    descriptionZh: '面向 OpenClaw 的 X 信息抓取与分析技能，帮助跟踪加密账号、话题和市场动态。',
    descriptionEn: 'An OpenClaw skill for X/Twitter monitoring and analysis, useful for tracking crypto accounts, topics, and market signals.'
  },
  'RootData': {
    descriptionZh: '用于查询加密项目、融资、团队和生态信息的数据技能。',
    descriptionEn: 'A data skill for researching crypto projects, fundraising, teams, and ecosystem information.'
  },
  'CoinMarketCap': {
    descriptionZh: '用于获取币价、市值、涨跌幅和代币市场概览的行情技能。',
    descriptionEn: 'A market data skill for coin prices, market cap, price change, and token overview.'
  },
  'Crypto Price Skill': {
    descriptionZh: '聚合主流交易市场价格，帮助快速查看加密资产实时行情。',
    descriptionEn: 'A price lookup skill that aggregates crypto market prices for quick real-time checks.'
  },
  'Skill Vetter': {
    descriptionZh: '用于安装前审查技能安全性、依赖和潜在风险的检查技能。',
    descriptionEn: 'A safety-review skill for vetting skills before installation, including dependencies and risk checks.'
  },
  'Bankr': {
    descriptionZh: '面向链上资产与钱包交互的技能，可辅助执行和分析链上操作。',
    descriptionEn: 'An onchain wallet and asset interaction skill for analyzing and assisting with blockchain actions.'
  },
  'Uniswap AI Skills': {
    descriptionZh: '围绕 Uniswap 生态的技能集合，可辅助查看流动性、交易和链上数据。',
    descriptionEn: 'A Uniswap-focused skill set for liquidity checks, swaps, and related onchain data.'
  },
  'Minara AI': {
    descriptionZh: '面向链上研究与智能分析的技能，可辅助理解项目与交易机会。',
    descriptionEn: 'An AI-assisted onchain research skill for understanding projects and trading opportunities.'
  },
  'Almanak': {
    descriptionZh: '用于策略分析、市场理解和交易辅助的链上工具型技能。',
    descriptionEn: 'An onchain tooling skill for strategy analysis, market understanding, and trading assistance.'
  },
  'crypto-defi': {
    descriptionZh: '聚焦 DeFi 场景的数据与操作技能，适合查看协议、资产和链上机会。',
    descriptionEn: 'A DeFi-oriented skill for protocol data, asset inspection, and onchain opportunity discovery.'
  },
  '套利扫描工具': {
    descriptionZh: '用于扫描多市场或多池之间价差，帮助发现潜在套利机会。',
    descriptionEn: 'A scanner for spotting price discrepancies across markets or pools to surface arbitrage opportunities.'
  },
  'Hyperliquid': {
    descriptionZh: '面向 Hyperliquid 生态的交易与市场数据技能。',
    descriptionEn: 'A trading and market-data skill focused on the Hyperliquid ecosystem.'
  },
  'Hyperliquid CLI': {
    descriptionZh: '通过命令行方式辅助使用 Hyperliquid 的技能，便于查询与执行操作。',
    descriptionEn: 'A CLI-oriented Hyperliquid skill for querying data and assisting with market operations.'
  },
  'Polymarket Analysis': {
    descriptionZh: '用于分析 Polymarket 市场、事件概率和盘口变化的预测市场技能。',
    descriptionEn: 'A prediction-market skill for analyzing Polymarket events, implied odds, and market changes.'
  },
  'PolyClaw': {
    descriptionZh: '面向 Polymarket 场景的 OpenClaw 技能，帮助查询与分析预测市场信息。',
    descriptionEn: 'An OpenClaw skill for Polymarket workflows, including prediction market lookup and analysis.'
  },
  'Polymarket Agent': {
    descriptionZh: '用于 Polymarket 数据检索、市场分析和辅助决策的代理技能。',
    descriptionEn: 'An agent skill for Polymarket data retrieval, market analysis, and decision support.'
  },
  'Polymarket Odds': {
    descriptionZh: '专注于查看和比较 Polymarket 市场赔率与概率变化的技能。',
    descriptionEn: 'A skill focused on reading and comparing Polymarket odds and probability changes.'
  },
  'Kalshi': {
    descriptionZh: '用于查看和分析 Kalshi 预测市场与相关事件合约的技能。',
    descriptionEn: 'A skill for viewing and analyzing Kalshi prediction markets and event contracts.'
  },
  'Binance Skills Hub': {
    descriptionZh: '围绕 Binance 官方生态的技能集合，可辅助查询与操作相关功能。',
    descriptionEn: 'A Binance-focused official skill set for exchange-related lookup and operational tasks.'
  },
  'OKX OnchainOS': {
    descriptionZh: '面向 OKX OnchainOS 场景的官方技能，可辅助处理链上相关任务。',
    descriptionEn: 'An official OKX OnchainOS skill for assisting with onchain workflows and related tasks.'
  },
  'Bitget': {
    descriptionZh: '用于 Bitget 生态相关查询与交易辅助的官方技能。',
    descriptionEn: 'An official Bitget skill for exchange-related lookup and trading assistance.'
  },
  'GateClawi': {
    descriptionZh: '面向 Gate 生态的官方技能，可辅助查询交易所与链上相关信息。',
    descriptionEn: 'An official Gate ecosystem skill for exchange and onchain-related lookup.'
  },
  '复盘工具': {
    descriptionZh: '用于交易复盘、记录策略执行结果和总结经验的辅助技能。',
    descriptionEn: 'A review skill for trading post-mortems, strategy journaling, and lesson capture.'
  },
  'Proactive Agent': {
    descriptionZh: '主动监控信息、发现变化并提醒用户的智能代理技能。',
    descriptionEn: 'A proactive monitoring agent that watches for changes and alerts the user automatically.'
  }
};

if (!fs.existsSync(seedPath)) {
  console.error(`[biteye-import] seed file missing: ${seedPath}`);
  process.exit(1);
}

const rawItems = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
if (!Array.isArray(rawItems) || !rawItems.length) {
  console.error('[biteye-import] seed list is empty');
  process.exit(1);
}

const selectSkillByNameExactStmt = db.prepare(`
  SELECT url, icon
  FROM skills_catalog
  WHERE LOWER(name) = LOWER(?)
     OR LOWER(name_en) = LOWER(?)
  ORDER BY updated_at DESC, created_at DESC, id DESC
  LIMIT 1
`);

const selectSkillByNameFuzzyStmt = db.prepare(`
  SELECT url, icon
  FROM skills_catalog
  WHERE LOWER(name) LIKE LOWER(?)
     OR LOWER(name_en) LIKE LOWER(?)
  ORDER BY updated_at DESC, created_at DESC, id DESC
  LIMIT 1
`);

const selectStagingByNameExactStmt = db.prepare(`
  SELECT url, icon
  FROM skills_catalog_staging
  WHERE LOWER(name) = LOWER(?)
     OR LOWER(name_en) = LOWER(?)
  ORDER BY updated_at DESC, fetched_at DESC, id DESC
  LIMIT 1
`);

const selectStagingByNameFuzzyStmt = db.prepare(`
  SELECT url, icon
  FROM skills_catalog_staging
  WHERE LOWER(name) LIKE LOWER(?)
     OR LOWER(name_en) LIKE LOWER(?)
  ORDER BY updated_at DESC, fetched_at DESC, id DESC
  LIMIT 1
`);

const upsertCatalogStmt = db.prepare(`
  INSERT INTO skills_catalog (name, name_en, url, description, description_en, category, category_en, icon, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(url) DO UPDATE SET
    name = excluded.name,
    name_en = excluded.name_en,
    description = excluded.description,
    description_en = excluded.description_en,
    category = excluded.category,
    category_en = excluded.category_en,
    icon = CASE WHEN excluded.icon <> '' THEN excluded.icon ELSE skills_catalog.icon END,
    updated_at = datetime('now')
`);

const upsertStagingStmt = db.prepare(`
  INSERT INTO skills_catalog_staging (name, name_en, url, description, description_en, category, category_en, icon, fetched_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(url) DO UPDATE SET
    name = excluded.name,
    name_en = excluded.name_en,
    description = excluded.description,
    description_en = excluded.description_en,
    category = excluded.category,
    category_en = excluded.category_en,
    icon = CASE WHEN excluded.icon <> '' THEN excluded.icon ELSE skills_catalog_staging.icon END,
    fetched_at = datetime('now'),
    updated_at = datetime('now')
`);

function makeFallbackSearchUrl(name) {
  return `https://github.com/search?q=${encodeURIComponent(`repo:openclaw/skills "${name}"`)}&type=code`;
}

function makeDescriptions(item) {
  const groupZh = String(item.groupZh || '').trim();
  const groupEn = String(item.groupEn || '').trim();
  const exactKey = String(item.name || '').trim();
  const manual = manualMeta[exactKey];
  if (manual?.descriptionZh || manual?.descriptionEn) {
    return {
      zh: String(manual.descriptionZh || '').trim(),
      en: String(manual.descriptionEn || '').trim()
    };
  }
  return {
    zh: `来自 Biteye「链上交易/预测市场必备 skills」清单，分组：${groupZh || '未分类'}。来源推文：${sourceUrl}`,
    en: `Curated from Biteye's "must-have skills for crypto trading / prediction markets" list. Group: ${groupEn || 'Uncategorized'}. Source: ${sourceUrl}`
  };
}

function resolveExistingMeta(item) {
  const exact = String(item.name || '').trim();
  const exactEn = String(item.nameEn || '').trim();
  const fuzzy = `%${exact}%`;
  return (
    selectSkillByNameExactStmt.get(exact, exactEn) ||
    selectStagingByNameExactStmt.get(exact, exactEn) ||
    selectSkillByNameFuzzyStmt.get(fuzzy, fuzzy) ||
    selectStagingByNameFuzzyStmt.get(fuzzy, fuzzy) ||
    null
  );
}

const prepared = rawItems.map((item) => {
  const name = String(item.name || '').trim();
  const nameEn = String(item.nameEn || name).trim();
  const existing = resolveExistingMeta(item);
  const descriptions = makeDescriptions(item);
  return {
    name,
    nameEn,
    url: String(existing?.url || '').trim() || makeFallbackSearchUrl(nameEn || name),
    description: descriptions.zh,
    descriptionEn: descriptions.en,
    category: categoryZh,
    categoryEn: categoryEn,
    icon: String(existing?.icon || '').trim()
  };
}).filter((item) => item.name && item.url);

const saveTx = db.transaction((items) => {
  for (const item of items) {
    const stmt = mode === 'staging' ? upsertStagingStmt : upsertCatalogStmt;
    stmt.run(
      item.name,
      item.nameEn,
      item.url,
      item.description,
      item.descriptionEn,
      item.category,
      item.categoryEn,
      item.icon
    );
  }
});

saveTx(prepared);

console.log(
  `[biteye-import] imported ${prepared.length} skills into ${mode === 'staging' ? 'skills_catalog_staging' : 'skills_catalog'}`
);
