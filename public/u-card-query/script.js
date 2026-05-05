const platformGrid = document.getElementById('platformGrid');
const platformCount = document.getElementById('platformCount');
const platformSectionTitle = document.getElementById('platformSectionTitle');
const resultTitle = document.getElementById('resultTitle');
const resultCount = document.getElementById('resultCount');
const cardResults = document.getElementById('cardResults');
const langZh = document.getElementById('langZh');
const langEn = document.getElementById('langEn');

let activePlatformId = null;
let currentLang = localStorage.getItem('uCardQueryLang') === 'en' ? 'en' : 'zh';
let platforms = [];
let activePlatform = null;
let activeCards = [];

const I18N = {
  zh: {
    docTitle: 'u卡场景查询',
    selectPlatform: '选择平台',
    platformCount: (count) => `${count} 个平台`,
    resultTitle: '支持的卡',
    supportedCardsTitle: (name) => `支持 ${name} 的卡`,
    choosePlatform: '请选择平台',
    cardCount: (count) => `${count} 张卡`,
    noResult: '暂无结果',
    noCards: (name) => `后台还没有添加支持 ${name || '该平台'} 的卡。`,
    clickPlatformHint: '点击平台后，这里会显示可用于支付的卡。',
    loading: '正在查询...',
    querying: '查询中',
    failed: '查询失败',
    requestFailed: '请求失败',
    loadFailed: '加载失败',
    binPrefix: '卡头',
    issuerRegionLabel: '发行地'
  },
  en: {
    docTitle: 'U Card Scenario Query',
    selectPlatform: 'Select',
    platformCount: (count) => `${count} platforms`,
    resultTitle: 'Supported Cards',
    supportedCardsTitle: (name) => `Cards that support ${name}`,
    choosePlatform: 'Select a platform',
    cardCount: (count) => `${count} card${count === 1 ? '' : 's'}`,
    noResult: 'No results',
    noCards: (name) => `No cards have been added for ${name || 'this platform'} yet.`,
    clickPlatformHint: 'After clicking a platform, cards available for payment will appear here.',
    loading: 'Searching...',
    querying: 'Searching',
    failed: 'Search failed',
    requestFailed: 'Request failed',
    loadFailed: 'Load failed',
    binPrefix: 'BIN',
    issuerRegionLabel: 'Issued in'
  }
};

const EXACT_TRANSLATIONS = new Map([
  ['微信', 'WeChat'],
  ['美国粉卡', 'US Pink Card'],
  ['粉卡', 'Pink Card'],
  ['美国', 'US'],
  ['香港', 'Hong Kong'],
  ['新加坡', 'Singapore'],
  ['虚拟卡', 'Virtual Card'],
  ['实体卡', 'Physical Card']
]);

const translationCache = new Map();

function t(key, ...args) {
  const value = I18N[currentLang][key] || I18N.zh[key];
  return typeof value === 'function' ? value(...args) : value;
}

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ''));
}

function translateNameSync(value) {
  const text = String(value || '');
  if (currentLang !== 'en') return text;
  if (!hasCjk(text)) return text;
  if (EXACT_TRANSLATIONS.has(text)) return EXACT_TRANSLATIONS.get(text);
  return text
    .replaceAll('美国', 'US ')
    .replaceAll('粉卡', 'Pink Card')
    .replaceAll('虚拟卡', 'Virtual Card')
    .replaceAll('实体卡', 'Physical Card')
    .replaceAll('卡', 'Card')
    .replace(/\s+/g, ' ')
    .trim();
}

async function translateNamesAsync(items) {
  if (currentLang !== 'en') return;
  const sources = [...new Set(items.map((item) => String(item || '').trim()).filter((item) => item && hasCjk(item)))];
  const missing = sources.filter((source) => !translationCache.has(`en|${source}`));
  if (!missing.length) return;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'en', texts: missing })
    });
    if (!response.ok) return;
    const data = await response.json();
    const translatedItems = Array.isArray(data.items) ? data.items : [];
    missing.forEach((source, index) => {
      const translated = String(translatedItems[index] || '').trim();
      translationCache.set(`en|${source}`, translated && !hasCjk(translated) ? translated : translateNameSync(source));
    });
  } catch {
    missing.forEach((source) => translationCache.set(`en|${source}`, translateNameSync(source)));
  }
}

function displayName(value) {
  const text = String(value || '');
  if (currentLang !== 'en') return text;
  return translationCache.get(`en|${text}`) || translateNameSync(text);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function fetchJson(path) {
  const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || t('requestFailed'));
  }
  return response.json();
}

function setError(message) {
  cardResults.innerHTML = `<p class="error-state">${escapeHtml(message)}</p>`;
}

function renderPlatforms(items) {
  platformSectionTitle.textContent = t('selectPlatform');
  platformCount.textContent = t('platformCount', items.length);
  platformGrid.innerHTML = items
    .map((platform) => `
      <button
        class="platform-button${Number(platform.id) === Number(activePlatformId) ? ' active' : ''}"
        type="button"
        data-platform-id="${Number(platform.id)}"
        data-platform-name="${escapeHtml(platform.name)}"
      >${escapeHtml(displayName(platform.name))}</button>
    `)
    .join('');
}

function renderCards(platform, items) {
  resultTitle.textContent = platform ? t('supportedCardsTitle', displayName(platform.name)) : t('resultTitle');
  resultCount.textContent = items.length ? t('cardCount', items.length) : t('noResult');
  if (!items.length) {
    cardResults.innerHTML = `<p class="empty-state">${escapeHtml(t('noCards', displayName(platform?.name)))}</p>`;
    return;
  }
  cardResults.innerHTML = items
    .map((card) => `
      <article class="u-card-item">
        <h3>${escapeHtml(displayName(card.name))}</h3>
        <div class="u-card-meta-row">
          <span class="bin">${escapeHtml(t('binPrefix'))} ${escapeHtml(card.bin)}</span>
          ${
            card.issuer_region
              ? `<span class="issuer-region">${escapeHtml(t('issuerRegionLabel'))} ${escapeHtml(displayName(card.issuer_region))}</span>`
              : ''
          }
        </div>
      </article>
    `)
    .join('');
}

async function hydrateTranslations() {
  if (currentLang !== 'en') return;
  await translateNamesAsync([
    ...platforms.map((platform) => platform.name),
    ...activeCards.map((card) => card.name)
  ]);
  renderPlatforms(platforms);
  if (activePlatform) renderCards(activePlatform, activeCards);
}

function renderStaticText() {
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-CN';
  document.title = t('docTitle');
  langZh.classList.toggle('active', currentLang === 'zh');
  langEn.classList.toggle('active', currentLang === 'en');
  platformSectionTitle.textContent = t('selectPlatform');
  platformCount.textContent = t('platformCount', platforms.length);
  if (!activePlatform) {
    resultTitle.textContent = t('resultTitle');
    resultCount.textContent = t('choosePlatform');
    cardResults.innerHTML = `<p class="empty-state">${escapeHtml(t('clickPlatformHint'))}</p>`;
  }
}

function setLanguage(lang) {
  currentLang = lang === 'en' ? 'en' : 'zh';
  localStorage.setItem('uCardQueryLang', currentLang);
  renderStaticText();
  renderPlatforms(platforms);
  if (activePlatform) renderCards(activePlatform, activeCards);
  hydrateTranslations();
}

platformGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('.platform-button');
  if (!button) return;
  const platformId = Number(button.dataset.platformId);
  const platformName = String(button.dataset.platformName || '');
  activePlatformId = platformId;
  activePlatform = { id: platformId, name: platformName };
  activeCards = [];
  platformGrid.querySelectorAll('.platform-button').forEach((item) => {
    item.classList.toggle('active', Number(item.dataset.platformId) === platformId);
  });
  resultTitle.textContent = t('supportedCardsTitle', displayName(platformName));
  resultCount.textContent = t('querying');
  cardResults.innerHTML = `<p class="empty-state">${escapeHtml(t('loading'))}</p>`;
  try {
    const data = await fetchJson(`/api/u-card/platforms/${encodeURIComponent(platformId)}/cards`);
    activePlatform = data.platform || { id: platformId, name: platformName };
    activeCards = Array.isArray(data.items) ? data.items : [];
    renderCards(activePlatform, activeCards);
    hydrateTranslations();
  } catch (error) {
    resultCount.textContent = t('failed');
    setError(error.message || t('failed'));
  }
});

langZh.addEventListener('click', () => setLanguage('zh'));
langEn.addEventListener('click', () => setLanguage('en'));

async function bootstrap() {
  try {
    const data = await fetchJson('/api/u-card/platforms');
    platforms = Array.isArray(data.items) ? data.items : [];
    renderStaticText();
    renderPlatforms(platforms);
    hydrateTranslations();
  } catch (error) {
    platformCount.textContent = t('loadFailed');
    platformGrid.innerHTML = '';
    setError(error.message || t('loadFailed'));
  }
}

bootstrap();
