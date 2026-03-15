let currentLang = 'zh';
let activeCategory = 'all';
let favoriteOnly = false;
let allSkills = [];
let zhSkills = null;
let zhLoaded = false;
let lastSyncText = '';
let pageConfig = null;
let currentPage = 1;
const PAGE_SIZE = 30;
const INITIAL_SKILLS_LIMIT = 30;
const faviconEl = document.getElementById('siteFavicon') || document.querySelector('link[rel~="icon"]');
const langMenuBtn = document.getElementById('langMenuBtn');
const langMenuPopup = document.getElementById('langMenuPopup');
const heroLogoEl = document.getElementById('heroLogo');
const heroLogoImageEl = document.getElementById('heroLogoImage');
const heroLogoTextEl = document.getElementById('heroLogoText');
const heroSubtitleEl = document.getElementById('heroSubtitle');
const homeNavBtn = document.getElementById('homeNavBtn');
const skillsNavBtn = document.getElementById('skillsNavBtn');
const githubStarBtn = document.getElementById('githubStarBtn');
const openSubmitFormBtn = document.getElementById('openSubmitFormBtn');
const submitForm = document.getElementById('submitForm');
const closeSubmitModalBtn = document.getElementById('closeSubmitModalBtn');
const submitModal = document.getElementById('submitModal');
const submitModalMask = document.getElementById('submitModalMask');
const submitMessage = document.getElementById('submitMessage');
const categorySelect = document.getElementById('categorySelect');
const BOOT_CACHE = window.__CLAW800_BOOT__ || {};
const langState = {
  zh: { categories: {}, categoryZhMap: {}, lastSyncMs: 0, fullLoaded: false, fullPromise: null },
  en: { categories: {}, categoryZhMap: {}, lastSyncMs: 0, fullLoaded: false, fullPromise: null }
};
let summaryLoaded = false;
let skillRenderTaskId = 0;
let skillsCategoryRenderTaskId = 0;
let summaryTotalCount = 0;
let submitCategoriesCache = [];
let submitModalController = null;
const FAVORITES_KEY = 'claw800_skill_favorites_v1';
let favoriteSkillUrls = loadFavoriteSkillUrls();

function markPageReady() {
  document.documentElement.dataset.i18nReady = '1';
}

if (BOOT_CACHE.siteConfig && typeof BOOT_CACHE.siteConfig === 'object') {
  pageConfig = BOOT_CACHE.siteConfig;
}

const i18n = {
  zh: {
    pageTitle: 'Claw800 龙虾技能大全 — OpenClaw 精选技能导航',
    headerTitle: 'claw800.com',
    heroSubtitle: 'OpenClaw 生态导航，收录 AI 领域优质网站',
    homeBtn: '首页',
    skillsBtn: '技能大全',
    githubStarBtn: 'GitHub 加星',
    openSubmit: '免费提交',
    submitTitle: '免费提交网站',
    submitDesc: '提交后进入审核，管理员通过后展示在首页。',
    labelName: '网站名称',
    labelUrl: '网站地址',
    labelDesc: '一句话简介',
    labelCategory: '分类',
    labelSubmitter: '提交人',
    labelEmail: '邮箱',
    submitBtn: '提交审核',
    closeSubmit: '关闭',
    submitSuccess: '提交成功，等待管理员审核',
    submitFailed: '提交失败',
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
    footerNote: '技能最终数据来源于 ClawHub',
    favoritesOnly: '我的收藏',
    favoritesEmpty: '还没有收藏技能，点卡片右上角桃心先收藏几个吧。',
    favoriteAdded: (name) => `已收藏「${name}」`,
    favoriteRemoved: (name) => `已取消收藏「${name}」`,
    favoriteToastSub: '收藏会保存在当前浏览器里。'
  },
  en: {
    pageTitle: 'Claw800 Skills Directory — OpenClaw Curated Skills',
    headerTitle: 'claw800.com',
    heroSubtitle: 'OpenClaw ecosystem directory for AI websites',
    homeBtn: 'Home',
    skillsBtn: 'Skills',
    githubStarBtn: 'Star on GitHub',
    openSubmit: 'Submit for Free',
    submitTitle: 'Submit a Website',
    submitDesc: 'Submissions are reviewed by admins before they appear on the homepage.',
    labelName: 'Website Name',
    labelUrl: 'Website URL',
    labelDesc: 'Short Description',
    labelCategory: 'Category',
    labelSubmitter: 'Submitted By',
    labelEmail: 'Email',
    submitBtn: 'Submit for Review',
    closeSubmit: 'Close',
    submitSuccess: 'Submitted successfully. Waiting for admin review.',
    submitFailed: 'Submission failed',
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
    footerNote: 'Final skill data source: ClawHub',
    favoritesOnly: 'My Favorites',
    favoritesEmpty: 'No favorites yet. Tap the heart on a skill card to save it.',
    favoriteAdded: (name) => `Added "${name}" to favorites`,
    favoriteRemoved: (name) => `Removed "${name}" from favorites`,
    favoriteToastSub: 'Favorites are stored in this browser.'
  }
};

function loadFavoriteSkillUrls() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map((item) => String(item || '').trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function persistFavoriteSkillUrls() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favoriteSkillUrls)));
  } catch {
    // ignore
  }
}

function localizeApiError(message) {
  if (currentLang !== 'en') return message;
  const map = {
    'name 和 url 必填': 'Name and URL are required.',
    'url 格式不正确': 'Invalid URL format.',
    '这个网站已经存在，可能已收录或正在审核中': 'This website already exists or is pending review.',
    '提交失败，请稍后再试': 'Submission failed, please try again later.'
  };
  return map[message] || message || i18n[currentLang].submitFailed;
}

function renderSubmitCategoryOptions() {
  if (!categorySelect) return;
  if (!submitCategoriesCache.length) return;
  categorySelect.innerHTML = submitCategoriesCache
    .map((item) => {
      const category = String(item.category || '').trim();
      return `<option value="${escHtml(category)}">${escHtml(category)}</option>`;
    })
    .join('');
}

function hydrateSubmitCategoriesFromSkills() {
  const seen = new Set();
  const fallback = [];

  const pushCategory = (value) => {
    const category = String(value || '').trim();
    if (!category || seen.has(category)) return;
    seen.add(category);
    fallback.push({ category });
  };

  Object.keys(langState.zh.categoryZhMap || {}).forEach((key) => {
    pushCategory(langState.zh.categoryZhMap[key] || key);
  });
  Object.keys(langState.en.categoryZhMap || {}).forEach((key) => {
    pushCategory(langState.en.categoryZhMap[key] || key);
  });
  getSkills().forEach((skill) => {
    pushCategory(skill.category_zh || skill.category);
  });

  if (fallback.length) {
    submitCategoriesCache = fallback;
    renderSubmitCategoryOptions();
  }
}

async function loadSubmitCategories() {
  try {
    const res = await fetch(`/api/categories?_=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.items) && data.items.length) {
      submitCategoriesCache = data.items;
      renderSubmitCategoryOptions();
    }
  } catch {
    // ignore
  }
  if (!submitCategoriesCache.length) {
    hydrateSubmitCategoriesFromSkills();
  }
}

async function openSubmitModal() {
  if (!submitCategoriesCache.length) {
    await loadSubmitCategories();
  }
  if (!submitCategoriesCache.length) {
    hydrateSubmitCategoriesFromSkills();
  }
  renderSubmitCategoryOptions();
  if (!submitModal) return;
  submitModal.classList.remove('hidden');
}

function closeSubmitModal() {
  if (!submitModal) return;
  submitModal.classList.add('hidden');
}

function getSubmitTexts() {
  const dict = i18n[currentLang];
  return {
    submitTitle: dict.submitTitle,
    submitDesc: dict.submitDesc,
    labelName: dict.labelName,
    labelUrl: dict.labelUrl,
    labelDesc: dict.labelDesc,
    labelCategory: dict.labelCategory,
    labelSubmitter: dict.labelSubmitter,
    labelEmail: dict.labelEmail,
    submitBtn: dict.submitBtn,
    closeSubmit: dict.closeSubmit,
    submitSuccess: currentLang === 'en' ? dict.submitSuccess : ''
  };
}
function isFavoriteSkill(skill) {
  return Boolean(skill && favoriteSkillUrls.has(String(skill.url || '').trim()));
}

function getFavoriteCount() {
  return favoriteSkillUrls.size;
}

function updateFavoriteStat() {
  const countEl = document.getElementById('favorite-count');
  const allBtnEl = document.getElementById('all-skills-stat-btn');
  if (countEl) countEl.textContent = String(getFavoriteCount());
  if (allBtnEl) allBtnEl.classList.toggle('active', !favoriteOnly);
}

function renderHeroLogo() {
  const title = String(pageConfig?.title || '').trim() || 'claw800.com';
  if (heroLogoTextEl) heroLogoTextEl.textContent = title;
  if (!heroLogoImageEl) return;
  const logo = String(pageConfig?.logo || '').trim();
  if (logo) {
    heroLogoImageEl.src = logo;
    heroLogoImageEl.classList.remove('hidden');
    if (heroLogoEl) heroLogoEl.classList.add('has-logo');
  } else {
    heroLogoImageEl.removeAttribute('src');
    heroLogoImageEl.classList.add('hidden');
    if (heroLogoEl) heroLogoEl.classList.remove('has-logo');
  }
}

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
  updateFavoriteStat();
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
  document.getElementById('all-skills-stat-btn').addEventListener('click', showAllSkillsFromStat);
  submitModalController = window.initSubmitModal?.({
    getTexts: getSubmitTexts,
    getCategories: async () => {
      if (!submitCategoriesCache.length) {
        await loadSubmitCategories();
      }
      if (!submitCategoriesCache.length) {
        hydrateSubmitCategoriesFromSkills();
      }
      return submitCategoriesCache;
    },
    categoryLabel: (item) => String(item?.category || '').trim(),
    localizeApiError
  }) || null;
  if (langMenuBtn) {
    langMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!langMenuPopup) return;
      const hidden = langMenuPopup.classList.toggle('hidden');
      langMenuBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    });
  }
  if (langMenuPopup) {
    langMenuPopup.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('button[data-lang], button.lang-option');
      if (!btn) return;
      langMenuPopup.classList.add('hidden');
      if (langMenuBtn) langMenuBtn.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', (e) => {
    if (!langMenuPopup || !langMenuBtn) return;
    const target = e.target;
    if (langMenuBtn.contains(target) || langMenuPopup.contains(target)) return;
    langMenuPopup.classList.add('hidden');
    langMenuBtn.setAttribute('aria-expanded', 'false');
  });
  document.getElementById('search').addEventListener('input', filterSkills);
  document.getElementById('bot-prompt').addEventListener('click', copyBotPrompt);
  document.getElementById('bot-copy-btn').addEventListener('click', copyBotPrompt);
  if (BOOT_CACHE.skillsSummary) hydrateSummaryCache(BOOT_CACHE.skillsSummary);
  if (currentLang === 'zh' && BOOT_CACHE.skillsInitialZh) hydrateInitialSkillsCache('zh', BOOT_CACHE.skillsInitialZh);
  if (currentLang === 'en' && BOOT_CACHE.skillsInitialEn) hydrateInitialSkillsCache('en', BOOT_CACHE.skillsInitialEn);
  applyLanguage(false);
  submitModalController?.refreshCategories();
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
  document.title = t.pageTitle;
  renderHeroLogo();
  const headerSub =
    currentLang === 'zh'
      ? String(pageConfig?.subtitleZh || '').trim() || t.heroSubtitle
      : String(pageConfig?.subtitleEn || '').trim() || t.heroSubtitle;
  const botPrompt =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageBotPromptZh || '').trim() || t.botPrompt
      : String(pageConfig?.skillsPageBotPromptEn || '').trim() || t.botPrompt;
  const botLabel =
    currentLang === 'zh'
      ? String(pageConfig?.skillsPageBotLabelZh || '').trim() || t.botLabel
      : String(pageConfig?.skillsPageBotLabelEn || '').trim() || t.botLabel;
  if (heroSubtitleEl) heroSubtitleEl.textContent = headerSub;
  if (homeNavBtn) homeNavBtn.textContent = t.homeBtn;
  if (skillsNavBtn) skillsNavBtn.textContent = t.skillsBtn;
  if (githubStarBtn) {
    githubStarBtn.setAttribute('aria-label', t.githubStarBtn);
    githubStarBtn.setAttribute('title', t.githubStarBtn);
  }
  if (openSubmitFormBtn) openSubmitFormBtn.textContent = t.openSubmit;
  submitModalController?.setTexts();
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
  updateFavoriteStat();
  submitModalController?.refreshCategories();
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
  if (langMenuPopup) langMenuPopup.classList.add('hidden');
  if (langMenuBtn) langMenuBtn.setAttribute('aria-expanded', 'false');
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

function getVisibleSkillsBase() {
  let skills = getSkills();
  if (favoriteOnly) {
    skills = skills.filter((skill) => isFavoriteSkill(skill));
  }
  return skills;
}

function toggleFavoriteFilter() {
  favoriteOnly = !favoriteOnly;
  activeCategory = 'all';
  currentPage = 1;
  updateFavoriteStat();
  renderCategories();
  filterSkills();
}

function showAllSkillsFromStat() {
  favoriteOnly = false;
  activeCategory = 'all';
  currentPage = 1;
  updateFavoriteStat();
  renderCategories();
  filterSkills();
}

function toggleFavoriteSkill(url, btn) {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) return;
  const skill = getSkills().find((item) => String(item.url || '').trim() === normalizedUrl);
  const name = String(skill?.name || '').trim() || normalizedUrl;
  const exists = favoriteSkillUrls.has(normalizedUrl);
  if (exists) {
    favoriteSkillUrls.delete(normalizedUrl);
  } else {
    favoriteSkillUrls.add(normalizedUrl);
  }
  persistFavoriteSkillUrls();
  updateFavoriteStat();
  if (btn) btn.classList.toggle('active', !exists);
  showToast(
    exists ? i18n[currentLang].favoriteRemoved(name) : i18n[currentLang].favoriteAdded(name),
    i18n[currentLang].favoriteToastSub
  );
  renderCategories();
  filterSkillsKeepPage();
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
  wrap.innerHTML = `
    <button class="cat-btn ${activeCategory === 'all' && !favoriteOnly ? 'active' : ''}" onclick="setCategory('all', this)">${t.allCat} <span class="count">${allCount}</span></button>
    <button class="cat-btn ${favoriteOnly ? 'active' : ''}" onclick="toggleFavoriteFilter()">${t.favoritesOnly} <span class="count">${getFavoriteCount()}</span></button>
  `;
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
  favoriteOnly = false;
  activeCategory = cat;
  currentPage = 1;
  document.querySelectorAll('.cat-btn').forEach((button) => button.classList.remove('active'));
  el.classList.add('active');
  updateFavoriteStat();
  filterSkills();
}

function filterSkills() {
  const t = i18n[currentLang];
  const q = document.getElementById('search').value.toLowerCase().trim();
  let skills = getVisibleSkillsBase();
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
  noResults.textContent = favoriteOnly ? t.favoritesEmpty : t.noResults;
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

    return `<div class="skill-card">
      <button class="skill-favorite-btn ${isFavoriteSkill(skill) ? 'active' : ''}" type="button" onclick="toggleFavoriteSkill('${escAttr(skill.url)}', this)" aria-label="${escHtml(t.labelFavorites)}">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </button>
      <div class="skill-name"><span>${escHtml(skill.name)}</span></div>
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
  const useSummaryPagination = !favoriteOnly && !state.fullLoaded && !q && activeCategory === 'all' && summaryTotalCount > skills.length;
  noResults.textContent = favoriteOnly ? t.favoritesEmpty : t.noResults;
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

      return `<div class="skill-card">
        <button class="skill-favorite-btn ${isFavoriteSkill(skill) ? 'active' : ''}" type="button" onclick="toggleFavoriteSkill('${escAttr(skill.url)}', this)" aria-label="${escHtml(t.labelFavorites)}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
        <div class="skill-name"><span>${escHtml(skill.name)}</span></div>
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
  let skills = getVisibleSkillsBase();
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
