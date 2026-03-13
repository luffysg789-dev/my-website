let currentLang = 'zh';
let activeCategory = 'all';
let allSkills = [];
let zhSkills = null;
let zhLoaded = false;
let lastSyncText = '';
let pageConfig = null;
let currentPage = 1;
const PAGE_SIZE = 30;
const INITIAL_SKILLS_LIMIT = 30;
const faviconEl = document.getElementById('siteFavicon') || document.querySelector('link[rel~="icon"]');
const BOOT_CACHE = window.__CLAW800_BOOT__ || {};
const langState = {
  zh: { categories: {}, categoryZhMap: {}, lastSyncMs: 0, fullLoaded: false, fullPromise: null },
  en: { categories: {}, categoryZhMap: {}, lastSyncMs: 0, fullLoaded: false, fullPromise: null }
};
let summaryLoaded = false;
let skillRenderTaskId = 0;
let skillsCategoryRenderTaskId = 0;
let summaryTotalCount = 0;

function markPageReady() {
  document.documentElement.dataset.i18nReady = '1';
}

if (BOOT_CACHE.siteConfig && typeof BOOT_CACHE.siteConfig === 'object') {
  pageConfig = BOOT_CACHE.siteConfig;
}

const i18n = {
  zh: {
    pageTitle: 'Claw800 龙虾技能大全 — OpenClaw 精选技能导航',
    homeLink: '← 返回首页',
    headerTitle: 'Claw800 龙虾技能大全',
    headerSub: '同步 claw800.com 的 OpenClaw 精选技能目录，分类浏览，一键查看和复制安装提示词。',
    labelSkills: '技能总数',
    labelCats: '分类数',
    searchPlaceholder: '🔍 搜索技能名称 / 简介 / 分类...',
    botLabel: 'Bot 安装提示词 — 复制给你的 Bot，它就学会了：',
    botPrompt: 'claw800.com 是 OpenClaw 精选技能导航站，收录 5000+ 可信技能。请学会搜索这个网站里的技能目录，当主人需要某个技能时，优先先来这里查找。搜索：fetch https://claw800.com/api/skills.zh.json 获取完整技能列表，字段包括 name（技能名）、description_zh（中文描述）、category_zh（分类）、url（源地址）。当主人需要某个功能时，先搜索并筛选合适技能推荐给主人，经主人确认后再安装。不要一次性安装所有技能，按需查找、按需安装。',
    installPrompt: '你是 OpenClaw 用户的技能安装助手。现在请帮我安装技能「{{name}}」。\n技能简介：{{description}}\n详情链接：{{url}}\n请按这个流程执行：\n1. 先打开详情链接，阅读 README、SKILL.md 或安装说明。\n2. 用中文告诉我这个技能做什么、是否安全、安装后会影响什么。\n3. 如果需要环境变量、依赖或权限，先明确列出来，再征求我确认。\n4. 只有在我确认后，才开始安装。\n5. 安装完成后，告诉我验证方法、使用方法，以及如何卸载或回滚。\n不要跳过确认步骤，也不要一次性安装无关技能。',
    copied: '已复制',
    noResults: '🔍 没有找到相关技能，试试别的关键词？',
    foundCount: (n) => `找到 ${n} 个技能`,
    showingLimit: (n, total) => `当前展示 ${n} / ${total} 个，请继续搜索或筛选分类。`,
    detailBtn: '详情',
    copyBtn: '复制',
    copyToast: (name) => `已复制「${name}」安装提示`,
    copyToastSub: '把这段提示词发给你的 Bot，它会按说明继续安装。',
    syncNote: (text) => `最近同步：${text} / 每天早上 10:00 自动同步`,
    loadingZh: '⏳ 正在加载中文数据...',
    allCat: '全部',
    footerNote: '技能最终数据来源于 ClawHub'
  },
  en: {
    pageTitle: 'Claw800 Skills Directory — OpenClaw Curated Skills',
    homeLink: '← Back to Home',
    headerTitle: 'Claw800 Skills Directory',
    headerSub: 'Synced from claw800.com. Browse curated OpenClaw skills by category and copy install prompts in one click.',
    labelSkills: 'Skills',
    labelCats: 'Categories',
    searchPlaceholder: '🔍 Search skills by name / description / category...',
    botLabel: 'Bot Install Prompt — copy this to your Bot and it will learn it:',
    botPrompt: 'claw800.com is a curated OpenClaw skills directory with 5000+ trusted skills. Learn how to search this site’s skill catalog so that when your user needs a skill, you check here first. Search by fetching https://claw800.com/api/skills.json to get the full skills list. The fields include name (skill name), description (English description), category (category), and url (source link). When your user needs a capability, first search and filter suitable skills, recommend the best options to the user, and install only after the user confirms. Do not install all skills at once — search on demand and install on demand.',
    installPrompt: 'You are an OpenClaw skill installation assistant. Help me install the skill "{{name}}".\nSkill summary: {{description}}\nDetail URL: {{url}}\nFollow this process:\n1. Open the detail page and read the README, SKILL.md, or install docs.\n2. Explain what the skill does, whether it looks safe, and what it may change.\n3. List any dependencies, env vars, permissions, or prerequisites before installing.\n4. Wait for my confirmation before you run or install anything.\n5. After installation, tell me how to verify it, use it, and uninstall or roll it back.\nDo not skip confirmation and do not install unrelated skills.',
    copied: 'Copied',
    noResults: '🔍 No skills found. Try a different keyword?',
    foundCount: (n) => `${n} skills found`,
    showingLimit: (n, total) => `Showing ${n} of ${total}. Use search or category filter.`,
    detailBtn: 'Details',
    copyBtn: 'Copy',
    copyToast: (name) => `Copied install prompt for "${name}"`,
    copyToastSub: 'Paste it to your Bot and continue the install flow there.',
    syncNote: (text) => `Last sync: ${text} / Auto-sync daily at 10:00`,
    loadingZh: '⏳ Loading Chinese data...',
    allCat: 'All',
    footerNote: 'Final skill data source: ClawHub'
  }
};

function escHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escAttr(s) {
  return String(s || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function formatDateTime(ms) {
  const num = Number(ms || 0);
  if (!num) return currentLang === 'zh' ? '尚未同步' : 'Not synced yet';
  const date = new Date(num);
  if (Number.isNaN(date.getTime())) return currentLang === 'zh' ? '未知' : 'Unknown';
  return new Intl.DateTimeFormat(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function normalizeSkillsPayload(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const skills = Array.isArray(payload.skills) ? payload.skills : [];
  const categories = payload.categories && typeof payload.categories === 'object' ? payload.categories : {};
  const lastSyncMs = Number(payload.lastSyncMs || 0) || 0;
  return { skills, categories, lastSyncMs };
}

function buildSkillsPayloadFromCatalog(data, lang = 'en') {
  const payload = data && typeof data === 'object' ? data : {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const categories = {};
  const lastSyncMs = Number(payload.lastSyncMs || 0) || 0;
  const skills = items.map((item) => {
    const category = String(item.category_en || item.category || 'Other').trim() || 'Other';
    const categoryZh = String(item.category || item.category_en || '').trim() || category;
    categories[category] = (categories[category] || 0) + 1;
    return {
      name: String(item.name_en || item.name || '').trim(),
      description: String(item.description_en || item.description || '').trim(),
      description_zh: String(item.description || item.description_en || '').trim(),
      category,
      category_zh: categoryZh,
      url: String(item.url || '').trim()
    };
  });
  return { skills, categories, lang, lastSyncMs };
}

function writeLocalCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function hydrateSummaryCache(summary) {
  if (!summary || typeof summary !== 'object') return;
  summaryTotalCount = Number(summary.total || 0) || 0;
  langState.zh.categories = {};
  langState.en.categories = {};
  langState.zh.categoryZhMap = {};
  langState.en.categoryZhMap = {};
  langState.zh.lastSyncMs = Number(summary.lastSyncMs || 0) || 0;
  langState.en.lastSyncMs = Number(summary.lastSyncMs || 0) || 0;

  const rows = Array.isArray(summary.categories) ? summary.categories : [];
  rows.forEach((row) => {
    const categoryEn = String(row.category_en || row.category || '').trim() || 'Other';
    const categoryZh = String(row.category || row.category_en || '').trim() || categoryEn;
    const count = Number(row.count || 0) || 0;
    langState.zh.categories[categoryEn] = count;
    langState.en.categories[categoryEn] = count;
    langState.zh.categoryZhMap[categoryEn] = categoryZh;
    langState.en.categoryZhMap[categoryEn] = categoryZh;
  });
  summaryLoaded = true;
  document.getElementById('total-count').textContent = String(Number(summary.total || 0) || 0);
  document.getElementById('cat-count').textContent = String(Number(summary.categoryCount || 0) || 0);
  lastSyncText = formatDateTime(summary.lastSyncMs || 0);
  document.getElementById('sync-note').textContent = i18n[currentLang].syncNote(lastSyncText);
}

function hydrateInitialSkillsCache(lang, payload) {
  if (!payload || typeof payload !== 'object') return;
  setLangPayload(lang, payload, { fullLoaded: false });
}

async function fetchSkillsPayload(lang = 'en') {
  const suffix = lang === 'zh' ? 'skills.zh.json' : 'skills.json';
  const primaryRes = await fetch(`/api/${suffix}?_=${Date.now()}`, { cache: 'no-store' });
  const primaryData = await primaryRes.json().catch(() => ({}));
  const normalized = normalizeSkillsPayload(primaryData);
  if (primaryRes.ok && normalized.skills.length) {
    return normalized;
  }

  const fallbackRes = await fetch(`/api/skills-catalog?limit=10000&_=${Date.now()}`, { cache: 'no-store' });
  const fallbackData = await fallbackRes.json().catch(() => ({}));
  if (!fallbackRes.ok) {
    throw new Error(`skills catalog http ${fallbackRes.status}`);
  }
  return buildSkillsPayloadFromCatalog(fallbackData, lang);
}

async function fetchInitialSkillsPayload(lang = 'en') {
  const res = await fetch(`/api/skills-catalog?limit=${INITIAL_SKILLS_LIMIT}&_=${Date.now()}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`skills catalog http ${res.status}`);
  }
  return buildSkillsPayloadFromCatalog(data, lang);
}

async function fetchSkillsSummary() {
  const res = await fetch(`/api/skills-summary?_=${Date.now()}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`skills summary http ${res.status}`);
  }
  return {
    total: Number(data.total || 0) || 0,
    categoryCount: Number(data.categoryCount || 0) || 0,
    categories: Array.isArray(data.categories) ? data.categories : [],
    lastSyncMs: Number(data.lastSyncMs || 0) || 0
  };
}

function getLangState(lang = currentLang) {
  return lang === 'zh' ? langState.zh : langState.en;
}

function setLangPayload(lang, data, { fullLoaded = false } = {}) {
  const state = getLangState(lang);
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const nextCategories = data.categories && typeof data.categories === 'object' ? data.categories : {};
  state.lastSyncMs = Number(data.lastSyncMs || 0) || 0;
  state.fullLoaded = fullLoaded;
  if (fullLoaded || !summaryLoaded || !Object.keys(state.categories || {}).length) {
    state.categories = nextCategories;
  }

  const nextZhMap = {};
  skills.forEach((skill) => {
    const key = String(skill.category || '').trim() || 'Other';
    const labelZh = String(skill.category_zh || '').trim();
    if (labelZh) nextZhMap[key] = labelZh;
  });
  state.categoryZhMap = { ...(state.categoryZhMap || {}), ...nextZhMap };

  if (lang === 'zh') {
    zhSkills = skills;
    zhLoaded = skills.length > 0;
  } else {
    allSkills = skills;
  }
}

function refreshCurrentLanguageView() {
  const state = getLangState(currentLang);
  const visibleSkills = getSkills();
  if (!summaryLoaded || state.fullLoaded) {
    document.getElementById('total-count').textContent = String(Array.isArray(visibleSkills) ? visibleSkills.length : 0);
    document.getElementById('cat-count').textContent = String(Object.keys(state.categories || {}).length);
  }
  lastSyncText = formatDateTime(state.lastSyncMs || 0);
  document.getElementById('sync-note').textContent = i18n[currentLang].syncNote(lastSyncText);
  renderCategories();
  filterSkills();
}

async function loadSummaryFast() {
  try {
    const summary = await fetchSkillsSummary();
    hydrateSummaryCache(summary);
    writeLocalCache('claw800_skills_summary_cache', summary);
    renderCategories();
  } catch {
    // ignore
  }
}

function ensureFullPayload(lang = currentLang, { silent = true } = {}) {
  const state = getLangState(lang);
  if (state.fullLoaded) return Promise.resolve();
  if (state.fullPromise) return state.fullPromise;

  if (!silent) document.getElementById('lang-loading').style.display = 'block';
  state.fullPromise = fetchSkillsPayload(lang)
    .then((data) => {
      setLangPayload(lang, data, { fullLoaded: true });
      if (lang === currentLang) {
        refreshCurrentLanguageView();
      }
    })
    .catch(() => {
      // ignore
    })
    .finally(() => {
      state.fullPromise = null;
      if (!silent && lang === currentLang) {
        document.getElementById('lang-loading').style.display = 'none';
      }
    });
  return state.fullPromise;
}

async function init() {
  currentLang = String(localStorage.getItem('claw800_lang') || '').trim() === 'en' ? 'en' : 'zh';
  document.getElementById('btn-zh').addEventListener('click', () => setLang('zh'));
  document.getElementById('btn-en').addEventListener('click', () => setLang('en'));
  document.getElementById('search').addEventListener('input', filterSkills);
  document.getElementById('bot-prompt').addEventListener('click', copyBotPrompt);
  document.getElementById('bot-copy-btn').addEventListener('click', copyBotPrompt);
  if (BOOT_CACHE.skillsSummary) hydrateSummaryCache(BOOT_CACHE.skillsSummary);
  if (currentLang === 'zh' && BOOT_CACHE.skillsInitialZh) hydrateInitialSkillsCache('zh', BOOT_CACHE.skillsInitialZh);
  if (currentLang === 'en' && BOOT_CACHE.skillsInitialEn) hydrateInitialSkillsCache('en', BOOT_CACHE.skillsInitialEn);
  applyLanguage(false);
  if (summaryLoaded || getSkills().length) {
    renderCategories();
    renderSkillsChunked(getSkills().slice(0, PAGE_SIZE));
    markPageReady();
  } else {
    renderSkillSkeletons();
    markPageReady();
  }
  await Promise.all([loadSummaryFast(), loadPageConfig()]);
  applyLanguage();
  await loadData();
}

async function loadPageConfig() {
  try {
    const res = await fetch(`/api/site-config?_=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const payload = data && typeof data === 'object' ? (data.data && typeof data.data === 'object' ? data.data : data) : null;
    if (res.ok && payload) {
      pageConfig = payload;
      writeLocalCache('claw800_site_config_cache', pageConfig);
      return;
    }
  } catch {
    // keep boot cache
  }
}

function applyLanguage(markReady = true) {
  const t = i18n[currentLang];
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  const headerTitle =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageTitleZh || '').trim() || t.headerTitle
      : String(pageConfig?.skillsPageTitleEn || '').trim() || t.headerTitle;
  document.title = headerTitle ? `${headerTitle} - claw800.com` : t.pageTitle;
  document.getElementById('btn-zh').classList.toggle('active', currentLang === 'zh');
  document.getElementById('btn-en').classList.toggle('active', currentLang === 'en');
  const backHomeLink = document.getElementById('backHomeLink');
  if (backHomeLink) backHomeLink.textContent = t.homeLink;
  const headerSub =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageSubtitleZh || '').trim() || t.headerSub
      : String(pageConfig?.skillsPageSubtitleEn || '').trim() || t.headerSub;
  const botPrompt =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageBotPromptZh || '').trim() || t.botPrompt
      : String(pageConfig?.skillsPageBotPromptEn || '').trim() || t.botPrompt;
  const botLabel =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageBotLabelZh || '').trim() || t.botLabel
      : String(pageConfig?.skillsPageBotLabelEn || '').trim() || t.botLabel;
  document.getElementById('header-title').textContent = headerTitle;
  document.getElementById('header-sub').textContent = headerSub;
  document.getElementById('label-skills').textContent = t.labelSkills;
  document.getElementById('label-cats').textContent = t.labelCats;
  document.getElementById('search').placeholder = t.searchPlaceholder;
  document.getElementById('bot-label').textContent = botLabel;
  document.getElementById('bot-prompt').textContent = botPrompt;
  document.getElementById('prompt-copied').textContent = t.copied;
  document.getElementById('lang-loading').textContent = t.loadingZh;
  document.getElementById('sync-note').textContent = t.syncNote(lastSyncText);
  document.getElementById('no-results').textContent = t.noResults;
  document.getElementById('footer-note').textContent = t.footerNote;
  if (faviconEl) {
    const icon = String(pageConfig?.icon || '').trim();
    faviconEl.href = icon || '/favicon.ico';
  }
  if (markReady) markPageReady();
  renderCategories();
  filterSkills();
}

async function loadData() {
  const lang = currentLang === 'zh' ? 'zh' : 'en';
  try {
    const initialData = await fetchInitialSkillsPayload(lang);
    setLangPayload(lang, initialData, { fullLoaded: false });
    writeLocalCache(`claw800_skills_initial_${lang}_cache`, initialData);
    refreshCurrentLanguageView();
    ensureFullPayload(lang);
    return;
  } catch {
    // ignore
  }

  const fullData = await fetchSkillsPayload(lang);
  setLangPayload(lang, fullData, { fullLoaded: true });
  writeLocalCache(`claw800_skills_initial_${lang}_cache`, {
    skills: Array.isArray(fullData.skills) ? fullData.skills.slice(0, INITIAL_SKILLS_LIMIT) : [],
    categories: fullData.categories || {},
    lastSyncMs: fullData.lastSyncMs || 0
  });
  refreshCurrentLanguageView();
}

async function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'zh';
  localStorage.setItem('claw800_lang', currentLang);
  document.getElementById('btn-zh').classList.toggle('active', currentLang === 'zh');
  document.getElementById('btn-en').classList.toggle('active', currentLang === 'en');
  applyLanguage();
  const state = getLangState(currentLang);
  const hasAnySkills = currentLang === 'zh' ? Array.isArray(zhSkills) && zhSkills.length : Array.isArray(allSkills) && allSkills.length;
  if (!hasAnySkills) {
    document.getElementById('lang-loading').style.display = 'block';
    try {
      const initialData = await fetchInitialSkillsPayload(currentLang);
      setLangPayload(currentLang, initialData, { fullLoaded: false });
      writeLocalCache(`claw800_skills_initial_${currentLang}_cache`, initialData);
    } catch {
      try {
        const fullData = await fetchSkillsPayload(currentLang);
        setLangPayload(currentLang, fullData, { fullLoaded: true });
        writeLocalCache(`claw800_skills_initial_${currentLang}_cache`, {
          skills: Array.isArray(fullData.skills) ? fullData.skills.slice(0, INITIAL_SKILLS_LIMIT) : [],
          categories: fullData.categories || {},
          lastSyncMs: fullData.lastSyncMs || 0
        });
      } catch {
        // ignore
      }
    }
    document.getElementById('lang-loading').style.display = 'none';
  }
  refreshCurrentLanguageView();
  if (!state.fullLoaded) ensureFullPayload(currentLang);
}

function getSkills() {
  return currentLang === 'zh' && zhLoaded && Array.isArray(zhSkills) ? zhSkills : allSkills;
}

function buildCategoryMaps() {
  const state = getLangState(currentLang);
  const skills = getSkills();
  const counts = state.fullLoaded ? {} : { ...(state.categories || {}) };
  const zhMap = { ...(state.categoryZhMap || {}) };
  skills.forEach((skill) => {
    const key = String(skill.category || '').trim() || 'Other';
    if (state.fullLoaded) {
      counts[key] = (counts[key] || 0) + 1;
    }
    if (skill.category_zh) zhMap[key] = String(skill.category_zh || '').trim();
  });
  return { counts, zhMap };
}

function renderCategories() {
  const { counts, zhMap } = buildCategoryMaps();
  const t = i18n[currentLang];
  const state = getLangState(currentLang);
  const wrap = document.getElementById('categories');
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const allCount = summaryLoaded && !state.fullLoaded
    ? Object.values(state.categories || {}).reduce((sum, count) => sum + (Number(count) || 0), 0)
    : getSkills().length;
  skillsCategoryRenderTaskId += 1;
  const taskId = skillsCategoryRenderTaskId;
  wrap.innerHTML = `<button class="cat-btn ${activeCategory === 'all' ? 'active' : ''}" onclick="setCategory('all', this)">${t.allCat} <span class="count">${allCount}</span></button>`;
  const chunkSize = 10;
  let index = 0;
  const appendChunk = () => {
    if (taskId !== skillsCategoryRenderTaskId) return;
    const html = sorted.slice(index, index + chunkSize).map(([cat, count]) => {
      const label = currentLang === 'zh' ? (zhMap[cat] || cat) : cat;
      return `<button class="cat-btn ${activeCategory === cat ? 'active' : ''}" onclick="setCategory('${escAttr(cat)}', this)">${escHtml(label)} <span class="count">${count}</span></button>`;
    }).join('');
    wrap.insertAdjacentHTML('beforeend', html);
    index += chunkSize;
    if (index < sorted.length) requestAnimationFrame(appendChunk);
  };
  requestAnimationFrame(appendChunk);
  document.getElementById('cat-count').textContent = String(sorted.length);
}

function setCategory(cat, el) {
  activeCategory = cat;
  currentPage = 1;
  document.querySelectorAll('.cat-btn').forEach((button) => button.classList.remove('active'));
  el.classList.add('active');
  filterSkills();
}

function filterSkills() {
  const t = i18n[currentLang];
  const q = document.getElementById('search').value.toLowerCase().trim();
  let skills = getSkills();
  if (activeCategory !== 'all') {
    skills = skills.filter((skill) => skill.category === activeCategory || skill.category_zh === activeCategory);
  }
  if (q) {
    skills = skills.filter((skill) =>
      String(skill.name || '').toLowerCase().includes(q) ||
      String(skill.description || '').toLowerCase().includes(q) ||
      String(skill.description_zh || '').includes(q) ||
      String(skill.category || '').toLowerCase().includes(q) ||
      String(skill.category_zh || '').includes(q)
    );
  }

  currentPage = 1;
  document.getElementById('search-count').textContent = (q || activeCategory !== 'all') ? t.foundCount(skills.length) : '';
  renderSkillsChunked(skills);
  if ((q || activeCategory !== 'all') && !getLangState(currentLang).fullLoaded) {
    ensureFullPayload(currentLang, { silent: false });
  }
}

function renderSkills(skills) {
  const t = i18n[currentLang];
  const grid = document.getElementById('skills-grid');
  const noResults = document.getElementById('no-results');
  noResults.textContent = t.noResults;
  if (!skills.length) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    renderPagination(0);
    return;
  }

  noResults.style.display = 'none';
  const totalPages = Math.max(1, Math.ceil(skills.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const display = skills.slice(start, end);
  grid.innerHTML = display.map((skill) => {
    const desc = currentLang === 'zh' && skill.description_zh ? skill.description_zh : skill.description;
    const cat = currentLang === 'zh' && skill.category_zh ? skill.category_zh : skill.category;
    const srcBadge = String(skill.url || '').includes('github.com')
      ? `<span style="font-size:0.68rem;color:#9CA3AF;font-weight:400">GitHub</span>`
      : `<span style="font-size:0.68rem;color:var(--accent);font-weight:400">ClawHub</span>`;

    return `<div class="skill-card">
      <div class="skill-name"><span>${escHtml(skill.name)}</span>${srcBadge}</div>
      <div class="skill-desc" title="${escHtml(desc)}">${escHtml(desc)}</div>
      <div class="skill-footer">
        <span class="skill-cat" title="${escHtml(cat)}">${escHtml(cat)}</span>
        <div class="skill-btns">
          <a class="btn-detail" href="${escHtml(skill.url)}" target="_blank" rel="noopener">${t.detailBtn}</a>
          <button class="btn-copy" onclick="copyInstall('${escAttr(skill.name)}', '${escAttr(desc)}', '${escAttr(skill.url)}', this)">${t.copyBtn}</button>
        </div>
      </div>
    </div>`;
  }).join('');
  renderPagination(totalPages);
}

function renderSkillSkeletons(count = PAGE_SIZE) {
  const safeCount = Math.max(1, count);
  const grid = document.getElementById('skills-grid');
  const noResults = document.getElementById('no-results');
  noResults.style.display = 'none';
  grid.innerHTML = Array.from({ length: safeCount }, () => `
    <div class="skill-card skill-card--skeleton" aria-hidden="true">
      <span class="skill-skeleton-line title"></span>
      <span class="skill-skeleton-line desc"></span>
      <span class="skill-skeleton-line desc"></span>
      <span class="skill-skeleton-line desc short"></span>
      <div class="skill-skeleton-footer">
        <span class="skill-skeleton-chip"></span>
        <div style="display:flex;gap:10px;">
          <span class="skill-skeleton-btn"></span>
          <span class="skill-skeleton-btn"></span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderSkillsChunked(skills) {
  const t = i18n[currentLang];
  const grid = document.getElementById('skills-grid');
  const noResults = document.getElementById('no-results');
  const state = getLangState(currentLang);
  const q = document.getElementById('search').value.toLowerCase().trim();
  const useSummaryPagination = !state.fullLoaded && !q && activeCategory === 'all' && summaryTotalCount > skills.length;
  noResults.textContent = t.noResults;
  skillRenderTaskId += 1;
  const taskId = skillRenderTaskId;

  if (!skills.length) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    renderPagination(0);
    return;
  }

  noResults.style.display = 'none';
  const totalItems = useSummaryPagination ? summaryTotalCount : skills.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const display = useSummaryPagination && currentPage === 1 ? skills.slice(0, PAGE_SIZE) : skills.slice(start, end);
  renderPagination(totalPages);
  grid.innerHTML = '';

  const chunkSize = 8;
  let index = 0;
  const appendChunk = () => {
    if (taskId !== skillRenderTaskId) return;
    const html = display.slice(index, index + chunkSize).map((skill) => {
      const desc = currentLang === 'zh' && skill.description_zh ? skill.description_zh : skill.description;
      const cat = currentLang === 'zh' && skill.category_zh ? skill.category_zh : skill.category;
      const srcBadge = String(skill.url || '').includes('github.com')
        ? `<span style="font-size:0.68rem;color:#9CA3AF;font-weight:400">GitHub</span>`
        : `<span style="font-size:0.68rem;color:var(--accent);font-weight:400">ClawHub</span>`;

      return `<div class="skill-card">
        <div class="skill-name"><span>${escHtml(skill.name)}</span>${srcBadge}</div>
        <div class="skill-desc" title="${escHtml(desc)}">${escHtml(desc)}</div>
        <div class="skill-footer">
          <span class="skill-cat" title="${escHtml(cat)}">${escHtml(cat)}</span>
          <div class="skill-btns">
            <a class="btn-detail" href="${escHtml(skill.url)}" target="_blank" rel="noopener">${t.detailBtn}</a>
            <button class="btn-copy" onclick="copyInstall('${escAttr(skill.name)}', '${escAttr(desc)}', '${escAttr(skill.url)}', this)">${t.copyBtn}</button>
          </div>
        </div>
      </div>`;
    }).join('');
    grid.insertAdjacentHTML('beforeend', html);
    index += chunkSize;
    if (index < display.length) requestAnimationFrame(appendChunk);
  };
  requestAnimationFrame(appendChunk);
}

function buildPageItems(totalPages, page) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const prev = sorted[index - 1];
    if (index > 0 && current - prev > 1) items.push('ellipsis');
    items.push(current);
  }
  return items;
}

function renderPagination(totalPages) {
  const paginationEl = document.getElementById('pagination');
  if (!paginationEl) return;
  if (!totalPages || totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const items = buildPageItems(totalPages, currentPage);
  paginationEl.innerHTML = items
    .map((item) => {
      if (item === 'ellipsis') return '<span class="page-ellipsis">…</span>';
      return `<button type="button" class="page-btn ${item === currentPage ? 'active' : ''}" onclick="goToPage(${item})">${item}</button>`;
    })
    .join('');
}

async function goToPage(page) {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const state = getLangState(currentLang);
  if (!state.fullLoaded && page > 1 && !q && activeCategory === 'all') {
    renderSkillSkeletons();
    await ensureFullPayload(currentLang, { silent: false });
  }
  currentPage = page;
  filterSkillsKeepPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterSkillsKeepPage() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  let skills = getSkills();
  if (activeCategory !== 'all') {
    skills = skills.filter((skill) => skill.category === activeCategory || skill.category_zh === activeCategory);
  }
  if (q) {
    skills = skills.filter((skill) =>
      String(skill.name || '').toLowerCase().includes(q) ||
      String(skill.description || '').toLowerCase().includes(q) ||
      String(skill.description_zh || '').includes(q) ||
      String(skill.category || '').toLowerCase().includes(q) ||
      String(skill.category_zh || '').includes(q)
    );
  }
  document.getElementById('search-count').textContent = (q || activeCategory !== 'all') ? i18n[currentLang].foundCount(skills.length) : '';
  renderSkillsChunked(skills);
}

let toastTimer = null;
function showToast(msg, sub) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-sub').textContent = sub || '';
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function copyInstall(name, desc, url, btn) {
  const template =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageInstallPromptZh || '').trim() || i18n[currentLang].installPrompt
      : String(pageConfig?.skillsPageInstallPromptEn || '').trim() || i18n[currentLang].installPrompt;
  const prompt = template
    .replaceAll('{{name}}', String(name || '').trim())
    .replaceAll('{{description}}', String(desc || '').trim())
    .replaceAll('{{url}}', String(url || '').trim());

  navigator.clipboard.writeText(prompt).then(() => {
    const original = btn.textContent;
    btn.textContent = '✅';
    setTimeout(() => {
      btn.textContent = original;
    }, 1500);
    showToast(i18n[currentLang].copyToast(name), i18n[currentLang].copyToastSub);
  });
}

function copyBotPrompt() {
  const prompt =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageBotPromptZh || '').trim() || i18n[currentLang].botPrompt
      : String(pageConfig?.skillsPageBotPromptEn || '').trim() || i18n[currentLang].botPrompt;
  navigator.clipboard.writeText(prompt).then(() => {
    const el = document.getElementById('prompt-copied');
    el.style.display = 'inline';
    setTimeout(() => {
      el.style.display = 'none';
    }, 2000);
  });
}

window.setCategory = setCategory;
window.copyInstall = copyInstall;
window.goToPage = goToPage;

init();
