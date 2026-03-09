const siteListEl = document.getElementById('siteList');
const categoriesEl = document.getElementById('categories');
const submitForm = document.getElementById('submitForm');
const openSubmitFormBtn = document.getElementById('openSubmitFormBtn');
const closeSubmitModalBtn = document.getElementById('closeSubmitModalBtn');
const submitModal = document.getElementById('submitModal');
const submitModalMask = document.getElementById('submitModalMask');
const submitMessage = document.getElementById('submitMessage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const langMenuBtn = document.getElementById('langMenuBtn');
const langMenuPopup = document.getElementById('langMenuPopup');
const categorySelect = document.getElementById('categorySelect');
const navView = document.getElementById('navView');
const heroLogoEl = document.getElementById('heroLogo');
const heroSubtitleEl = document.getElementById('heroSubtitle');
const faviconEl = document.getElementById('siteFavicon');
const footerCopyrightEl = document.getElementById('footerCopyright');
const footerLinksEl = document.getElementById('footerLinks');
const footerContactEl = document.getElementById('footerContact');

const CATEGORY_EN = {
  'AI 与大语言模型': 'AI & Large Language Models',
  '开发与编码': 'Development & Coding',
  'DevOps 与云': 'DevOps & Cloud',
  '浏览器与网页自动化': 'Browser & Web Automation',
  '营销与销售': 'Marketing & Sales',
  '生产力与工作流': 'Productivity & Workflows',
  '搜索与研究': 'Search & Research',
  '通信与社交': 'Communication & Social',
  '媒体与内容': 'Media & Content',
  '金融与加密货币': 'Finance & Crypto',
  '健康与健身': 'Health & Fitness',
  '安全与监控': 'Security & Monitoring',
  '自动化与实用工具': 'Automation & Utilities',
  '业务运营': 'Business Operations',
  '代理协调': 'Agent Orchestration'
};

const DESC_EN = {
  'AI 对话与生成': 'AI chat and content generation',
  'AI 视频生成': 'AI video generation',
  'Google 大模型助手': 'Google large model assistant',
  'AI 代码质量与开发助手': 'AI code quality and development assistant',
  '开发安全与代码扫描': 'Development security and code scanning',
  'AI 编程助手': 'AI coding assistant',
  'Kubernetes 应用交付平台': 'Kubernetes application delivery platform',
  'AWS 智能代码分析': 'AWS intelligent code analysis',
  '云监控与可观测性': 'Cloud monitoring and observability',
  '网页抓取与结构化提取': 'Web crawling and structured extraction',
  '搜索与网页自动化能力': 'Search and web automation capabilities',
  '浏览器任务自动化代理': 'Browser task automation agent',
  '自动化营销与工作流': 'Automated marketing and workflows',
  'SEO 内容优化': 'SEO content optimization',
  '销售触达自动化': 'Sales outreach automation',
  'AI 自动化工作流': 'AI automated workflows',
  '应用连接与自动化': 'App integrations and automation',
  '项目与协作管理': 'Project and collaboration management',
  'Google 搜索相关工具': 'Google search-related tools',
  'AI 搜索与研究助手': 'AI search and research assistant',
  '新型 AI 搜索引擎': 'New AI search engine',
  '社交媒体内容发布': 'Social media content publishing',
  '社媒排期与协作': 'Social media scheduling and collaboration',
  '社媒内容工具': 'Social media content tools',
  'AI 视频内容制作': 'AI video content production',
  'AI 文案与内容生成': 'AI copywriting and content generation',
  '营销内容自动生成': 'Automated marketing content generation',
  '交易平台': 'Trading platform',
  '投资与交易应用': 'Investing and trading app',
  '加密交易机器人': 'Crypto trading bot',
  '饮食与运动记录': 'Diet and exercise tracking',
  '力量训练计划': 'Strength training plans',
  'AI 运动训练助手': 'AI fitness training assistant',
  '开发安全平台': 'Development security platform',
  '安全运营中心服务': 'Security operations center services',
  '网络安全平台': 'Cybersecurity platform',
  'Slack 智能代理能力': 'Slack intelligent agent capabilities',
  '自动化构建工具': 'Automation build tools',
  '自动化集成平台': 'Automation integration platform',
  '开源自动化平台': 'Open-source automation platform',
  '业务流程连接': 'Business process integrations',
  '业务工作流自动化': 'Business workflow automation',
  '多代理协作流程': 'Multi-agent collaboration workflows',
  '企业级对话与代理平台': 'Enterprise conversational and agent platform',
  '任务编排与代理协作': 'Task orchestration and agent collaboration'
};

const texts = {
  zh: {
    htmlLang: 'zh-CN',
    title: 'claw800.com - OpenClaw AI 导航',
    heroSubtitle: 'OpenClaw 生态导航，收录 AI 领域优质网站',
    searchPlaceholder: '搜索网站名称 / URL / 简介',
    searchBtn: '搜索',
    navBtn: '导航',
    tutorialBtn: '教程',
    allCategory: '全部',
    submitTitle: '免费提交网站',
    submitDesc: '提交后进入审核，管理员通过后展示在首页。',
    openSubmit: '免费提交',
    labelName: '网站名称',
    labelUrl: '网站地址',
    labelDesc: '一句话简介',
    labelCategory: '分类',
    labelSubmitter: '提交人',
    labelEmail: '邮箱',
    submitBtn: '提交审核',
    closeSubmit: '关闭',
    cardName: '项目',
    cardUrl: '网址',
    cardDesc: '简介',
    noDesc: '暂无简介',
    noDescEnYet: '暂无英文简介',
    empty: '暂无数据，先提交你的 OpenClaw 站点吧。',
    tutorialEmpty: '暂无教程内容。',
    defaultCategory: '未分类',
    submitSuccess: '提交成功，等待管理员审核',
    submitFailed: '提交失败',
    hotBadge: '热门',
    source: {
      admin: '后台添加',
      user_submit: '用户投稿',
      seed_openclaw: 'OpenClaw 首批',
      admin_import: '后台导入'
    }
  },
  en: {
    htmlLang: 'en',
    title: 'claw800.com - OpenClaw AI Directory',
    heroSubtitle: 'OpenClaw ecosystem directory for AI websites',
    searchPlaceholder: 'Search by name / URL / description',
    searchBtn: 'Search',
    navBtn: 'Directory',
    tutorialBtn: 'Tutorials',
    allCategory: 'All',
    submitTitle: 'Submit a Website',
    submitDesc: 'Submissions are reviewed by admins before they appear on the homepage.',
    openSubmit: 'Submit for Free',
    labelName: 'Website Name',
    labelUrl: 'Website URL',
    labelDesc: 'Short Description',
    labelCategory: 'Category',
    labelSubmitter: 'Submitted By',
    labelEmail: 'Email',
    submitBtn: 'Submit for Review',
    closeSubmit: 'Close',
    cardName: 'Project',
    cardUrl: 'Website',
    cardDesc: 'Description',
    noDesc: 'No description.',
    noDescEnYet: 'No English description yet.',
    empty: 'No websites yet. Submit your OpenClaw site first.',
    tutorialEmpty: 'No tutorials yet.',
    defaultCategory: 'Uncategorized',
    submitSuccess: 'Submitted successfully. Waiting for admin review.',
    submitFailed: 'Submission failed',
    hotBadge: 'HOT',
    source: {
      admin: 'Admin Added',
      user_submit: 'User Submission',
      seed_openclaw: 'OpenClaw Seed',
      admin_import: 'Admin Import'
    }
  }
};

let currentCategory = '';
let currentLang = localStorage.getItem('claw800_lang') === 'en' ? 'en' : 'zh';
let categoriesCache = [];
const translationCache = new Map(); // key: `en|${source}` -> translated
let siteConfig = null; // { title, subtitleZh, subtitleEn }

function isProbablyUrl(text) {
  const s = String(text || '').trim();
  return /^https?:\/\/\S+$/i.test(s);
}

function isProbablyEmail(text) {
  const s = String(text || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function renderFooter() {
  if (!footerCopyrightEl || !footerLinksEl || !footerContactEl) return;
  const cfg = siteConfig || {};

  const copyright =
    currentLang === 'en'
      ? String(cfg.footerCopyrightEn || '').trim() || String(cfg.footerCopyrightZh || '').trim()
      : String(cfg.footerCopyrightZh || '').trim() || String(cfg.footerCopyrightEn || '').trim();
  const contact =
    currentLang === 'en'
      ? String(cfg.footerContactEn || '').trim() || String(cfg.footerContactZh || '').trim()
      : String(cfg.footerContactZh || '').trim() || String(cfg.footerContactEn || '').trim();

  footerCopyrightEl.textContent = '';
  if (copyright) {
    footerCopyrightEl.textContent = copyright;
    footerCopyrightEl.classList.remove('hidden');
  } else {
    footerCopyrightEl.classList.add('hidden');
  }

  const links = Array.isArray(cfg.footerLinks) ? cfg.footerLinks : [];
  footerLinksEl.innerHTML = '';
  if (links.length) {
    const frag = document.createDocumentFragment();
    links.slice(0, 50).forEach((it, idx) => {
      const a = document.createElement('a');
      a.href = String(it.url || '#');
      a.target = '_blank';
      a.rel = 'noopener';
      const label =
        currentLang === 'en'
          ? String(it.nameEn || '').trim() || String(it.nameZh || '').trim() || a.href
          : String(it.nameZh || '').trim() || String(it.nameEn || '').trim() || a.href;
      a.textContent = label;
      frag.appendChild(a);
      if (idx !== links.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'site-footer-sep';
        sep.textContent = ' | ';
        frag.appendChild(sep);
      }
    });
    footerLinksEl.appendChild(frag);
    footerLinksEl.classList.remove('hidden');
  } else {
    footerLinksEl.classList.add('hidden');
  }

  footerContactEl.innerHTML = '';
  if (contact) {
    if (isProbablyUrl(contact)) {
      const a = document.createElement('a');
      a.href = contact;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = contact;
      footerContactEl.appendChild(a);
    } else if (isProbablyEmail(contact)) {
      const a = document.createElement('a');
      a.href = `mailto:${contact}`;
      a.textContent = contact;
      footerContactEl.appendChild(a);
    } else {
      footerContactEl.textContent = contact;
    }
    footerContactEl.classList.remove('hidden');
  } else {
    footerContactEl.classList.add('hidden');
  }
}

function renderFavicon() {
  if (!faviconEl) return;
  const icon = String(siteConfig?.icon || '').trim();
  faviconEl.href = icon || '/favicon.svg';
}

function t(key) {
  return texts[currentLang][key];
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function categoryLabel(category) {
  if (!category) return t('defaultCategory');
  if (currentLang === 'en') return CATEGORY_EN[category] || category;
  return category;
}

function categoryLabelForItem(item) {
  const zh = String(item?.category || '').trim();
  if (!zh) return t('defaultCategory');
  if (currentLang !== 'en') return zh;
  const fromApi = String(item?.category_en || '').trim();
  return fromApi || CATEGORY_EN[zh] || zh;
}

function descriptionLabel(description) {
  const desc = String(description || '').trim();
  if (!desc) return t('noDesc');
  if (currentLang !== 'en') return desc;
  if (DESC_EN[desc]) return DESC_EN[desc];
  // For EN, show original text first and then translate it via /api/translate.
  if (/[\u3400-\u9FBF]/.test(desc)) return desc;
  return desc;
}

function hasCjk(text) {
  return /[\u3400-\u9FBF]/.test(String(text || ''));
}

function getApiCandidates(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const list = [normalized];
  const pathName = window.location.pathname || '/';
  const slash = pathName.lastIndexOf('/');
  const base = slash >= 0 ? pathName.slice(0, slash + 1) : '/';
  if (base && base !== '/') {
    list.push(`${base.replace(/\/+$/, '')}${normalized}`);
  }
  return Array.from(new Set(list));
}

async function requestJson(path, options) {
  const candidates = getApiCandidates(path);
  let lastError = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('request failed');
}

async function translateBatchToEn(texts) {
  const unique = Array.from(new Set(texts.map((t) => String(t || '')).filter(Boolean)));
  const need = unique.filter((t) => hasCjk(t) && !translationCache.has(`en|${t}`));
  if (need.length) {
    try {
      const { res, data } = await requestJson('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'en', texts: need })
      });
      if (res.ok && Array.isArray(data.items)) {
        need.forEach((src, idx) => {
          const translated = String(data.items[idx] ?? '').trim();
          // Only accept real EN translations (not empty, not same as source, not still CJK).
          if (translated && translated !== src.trim() && !hasCjk(translated)) {
            translationCache.set(`en|${src}`, translated);
          }
        });
      }
    } catch {
      // ignore translation failures; keep original text
    }
  }

  const map = new Map();
  for (const src of unique) {
    const cached = translationCache.get(`en|${src}`);
    if (cached) map.set(src, cached);
  }
  return map;
}

async function translateVisibleTextNodes() {
  if (currentLang !== 'en') return;
  const els = Array.from(document.querySelectorAll('[data-src]'));
  const sources = els.map((el) => el.getAttribute('data-src') || '').filter(Boolean);
  const translatedMap = await translateBatchToEn(sources);
  for (const el of els) {
    const src = el.getAttribute('data-src') || '';
    if (!src) continue;
    const translated = translatedMap.get(src);
    if (translated) el.textContent = translated;
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
  return map[message] || message || t('submitFailed');
}

function renderCategoryOptions() {
  categorySelect.innerHTML = categoriesCache
    .map((item) => {
      const zh = String(item.category || '').trim();
      return `<option value="${escapeHtml(zh)}">${escapeHtml(categoryLabelForItem(item))}</option>`;
    })
    .join('');
}

function renderCategories(items) {
  categoriesEl.innerHTML = '';
  const countMap = new Map(items.map((item) => [item.category, item.count]));
  const orderedItems = items.slice();

  const allBtn = document.createElement('button');
  allBtn.textContent = t('allCategory');
  allBtn.className = currentCategory === '' ? 'active' : '';
  allBtn.onclick = () => {
    currentCategory = '';
    renderCategories(items);
    loadSites();
  };
  categoriesEl.appendChild(allBtn);

  for (const item of orderedItems) {
    const category = String(item.category || '').trim();
    const count = countMap.get(category) || 0;
    const btn = document.createElement('button');
    const label = categoryLabelForItem(item);
    // If EN label is still Chinese, mark for on-demand translation.
    if (currentLang === 'en' && label === category && hasCjk(category)) {
      btn.innerHTML = `<span data-src="${escapeHtml(category)}">${escapeHtml(category)}</span> (${escapeHtml(count)})`;
    } else {
      btn.textContent = `${label} (${count})`;
    }
    btn.className = currentCategory === category ? 'active' : '';
    btn.onclick = () => {
      currentCategory = category;
      renderCategories(items);
      loadSites();
    };
    categoriesEl.appendChild(btn);
  }

  // Translate any newly added categories without a predefined EN mapping.
  translateVisibleTextNodes();
}

function applyLanguage() {
  const dict = texts[currentLang];

  document.documentElement.lang = dict.htmlLang;
  const titleFromConfig = String(siteConfig?.title || '').trim();
  const safeTitle = titleFromConfig || 'claw800.com';
  const htmlTitle =
    currentLang === 'en'
      ? String(siteConfig?.htmlTitleEn || '').trim()
      : String(siteConfig?.htmlTitleZh || '').trim();
  const titleSuffix = currentLang === 'en' ? 'OpenClaw AI Directory' : 'OpenClaw AI 导航';
  document.title = htmlTitle || `${safeTitle} - ${titleSuffix}`;

  if (heroLogoEl) heroLogoEl.textContent = safeTitle;

  const subtitle =
    currentLang === 'en'
      ? String(siteConfig?.subtitleEn || '').trim() || dict.heroSubtitle
      : String(siteConfig?.subtitleZh || '').trim() || dict.heroSubtitle;
  if (heroSubtitleEl) heroSubtitleEl.textContent = subtitle;

  searchInput.placeholder = dict.searchPlaceholder;
  searchBtn.textContent = dict.searchBtn;
  document.getElementById('submitTitle').textContent = dict.submitTitle;
  document.getElementById('submitDesc').textContent = dict.submitDesc;
  openSubmitFormBtn.textContent = dict.openSubmit;
  document.getElementById('labelName').childNodes[0].textContent = dict.labelName;
  document.getElementById('labelUrl').childNodes[0].textContent = dict.labelUrl;
  document.getElementById('labelDesc').childNodes[0].textContent = dict.labelDesc;
  document.getElementById('labelCategory').childNodes[0].textContent = dict.labelCategory;
  document.getElementById('labelSubmitter').childNodes[0].textContent = dict.labelSubmitter;
  document.getElementById('labelEmail').childNodes[0].textContent = dict.labelEmail;
  document.getElementById('submitBtn').textContent = dict.submitBtn;
  closeSubmitModalBtn.textContent = dict.closeSubmit;

  renderCategoryOptions();
  renderCategories(categoriesCache);
  renderFooter();
  renderFavicon();
}

async function loadSiteConfig() {
  try {
    const res = await fetch('/api/site-config', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data && data.ok) {
      siteConfig = {
        title: String(data.title || '').trim(),
        subtitleZh: String(data.subtitleZh || '').trim(),
        subtitleEn: String(data.subtitleEn || '').trim(),
        htmlTitleZh: String(data.htmlTitleZh || '').trim(),
        htmlTitleEn: String(data.htmlTitleEn || '').trim(),
        icon: String(data.icon || '').trim(),
        footerCopyrightZh: String(data.footerCopyrightZh || '').trim(),
        footerCopyrightEn: String(data.footerCopyrightEn || '').trim(),
        footerContactZh: String(data.footerContactZh || '').trim(),
        footerContactEn: String(data.footerContactEn || '').trim(),
        footerLinks: Array.isArray(data.footerLinks) ? data.footerLinks : []
      };
    } else {
      siteConfig = null;
    }
  } catch {
    siteConfig = null;
  }
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  const data = await res.json();
  categoriesCache = data.items;
  if (currentCategory && !categoriesCache.some((item) => item.category === currentCategory)) {
    currentCategory = '';
  }
  renderCategories(categoriesCache);
  renderCategoryOptions();
}

async function loadSites() {
  const q = searchInput.value.trim();
  const params = new URLSearchParams();
  if (currentCategory) params.set('category', currentCategory);
  if (q) params.set('q', q);

  const res = await fetch(`/api/sites?${params.toString()}`);
  const data = await res.json();

  if (!data.items.length) {
    siteListEl.innerHTML = `<p class="empty">${escapeHtml(t('empty'))}</p>`;
    return;
  }

  siteListEl.innerHTML = data.items
    .map((site) => {
      const zhName = String(site.name || '').trim();
      const zhDesc = String(site.description || '').trim();
      const enName = String(site.name_en || '').trim();
      const enDesc = String(site.description_en || '').trim();

      const enNameUsable = Boolean(enName) && !hasCjk(enName);
      const enDescUsable = Boolean(enDesc) && !hasCjk(enDesc);

      const displayName = currentLang === 'en' ? (enNameUsable ? enName : zhName) : zhName;
      const displayDescRaw = currentLang === 'en' ? (enDescUsable ? enDesc : zhDesc) : zhDesc;

      const needsNameTranslate = currentLang === 'en' && !enNameUsable && hasCjk(zhName);
      const needsDescTranslate = currentLang === 'en' && !enDescUsable && hasCjk(zhDesc);

      const nameAttr = needsNameTranslate ? ` data-src="${escapeHtml(zhName)}"` : '';
      const descAttr = needsDescTranslate ? ` data-src="${escapeHtml(zhDesc)}"` : '';
      const descDisplay = descriptionLabel(displayDescRaw);
      const isHot = Number(site.is_hot || 0) === 1;
      const hotBadge = isHot ? `<div class="hot-badge">${escapeHtml(t('hotBadge'))}</div>` : '';
      return `
      <a class="site-card-link" href="${escapeHtml(site.url)}" target="_blank" rel="noopener">
        <article class="site-card">
          ${hotBadge}
          <div class="site-row">
            <span class="site-value"${nameAttr}>${escapeHtml(displayName)}</span>
          </div>
          <div class="site-row">
            <span class="site-value site-link">${escapeHtml(site.url)}</span>
          </div>
          <div class="site-row">
            <span class="site-value"${descAttr}>${escapeHtml(descDisplay)}</span>
          </div>
        </article>
      </a>
    `
    })
    .join('');

  translateVisibleTextNodes();
}

// Left-side dock (导航/教程) is disabled on homepage for now.
function syncLeftNavTop() {}

function setLanguage(lang) {
  currentLang = lang === 'en' ? 'en' : 'zh';
  localStorage.setItem('claw800_lang', currentLang);
  applyLanguage();
  loadSites();
}

function openSubmitModal() {
  submitModal.classList.remove('hidden');
}

function closeSubmitModal() {
  submitModal.classList.add('hidden');
}

openSubmitFormBtn.addEventListener('click', openSubmitModal);
closeSubmitModalBtn.addEventListener('click', closeSubmitModal);
submitModalMask.addEventListener('click', closeSubmitModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSubmitModal();
});

submitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitMessage.textContent = '';

  const payload = Object.fromEntries(new FormData(submitForm).entries());
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    submitMessage.textContent = localizeApiError(data.error);
    submitMessage.className = 'message error';
    return;
  }

  submitMessage.textContent = currentLang === 'en' ? t('submitSuccess') : data.message;
  submitMessage.className = 'message success';
  submitForm.reset();
  renderCategoryOptions();
  closeSubmitModal();
});

function openLangMenu() {
  if (!langMenuPopup || !langMenuBtn) return;
  langMenuPopup.classList.remove('hidden');
  langMenuBtn.setAttribute('aria-expanded', 'true');
}

function closeLangMenu() {
  if (!langMenuPopup || !langMenuBtn) return;
  langMenuPopup.classList.add('hidden');
  langMenuBtn.setAttribute('aria-expanded', 'false');
}

function toggleLangMenu() {
  if (!langMenuPopup) return;
  if (langMenuPopup.classList.contains('hidden')) openLangMenu();
  else closeLangMenu();
}

if (langMenuBtn) {
  langMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLangMenu();
  });
}

if (langMenuPopup) {
  langMenuPopup.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('button[data-lang]');
    if (!btn) return;
    const lang = String(btn.getAttribute('data-lang') || '');
    setLanguage(lang);
    closeLangMenu();
  });
}

document.addEventListener('click', (e) => {
  if (!langMenuPopup || !langMenuBtn) return;
  const target = e.target;
  if (target === langMenuBtn || langMenuBtn.contains(target)) return;
  if (langMenuPopup.contains(target)) return;
  closeLangMenu();
});

searchBtn.addEventListener('click', loadSites);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loadSites();
  }
});

(async () => {
  await loadSiteConfig();
  applyLanguage();
  await loadCategories();
  await loadSites();
})();
