const platformGrid = document.getElementById('platformGrid');
const platformCount = document.getElementById('platformCount');
const resultTitle = document.getElementById('resultTitle');
const resultCount = document.getElementById('resultCount');
const cardResults = document.getElementById('cardResults');

let activePlatformId = null;

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
    throw new Error(data.error || '请求失败');
  }
  return response.json();
}

function setError(message) {
  cardResults.innerHTML = `<p class="error-state">${escapeHtml(message)}</p>`;
}

function renderPlatforms(items) {
  platformCount.textContent = `${items.length} 个平台`;
  platformGrid.innerHTML = items
    .map((platform) => `
      <button
        class="platform-button${Number(platform.id) === Number(activePlatformId) ? ' active' : ''}"
        type="button"
        data-platform-id="${Number(platform.id)}"
        data-platform-name="${escapeHtml(platform.name)}"
      >${escapeHtml(platform.name)}</button>
    `)
    .join('');
}

function renderCards(platform, items) {
  resultTitle.textContent = platform ? `${platform.name} 支持的卡` : '支持的卡';
  resultCount.textContent = items.length ? `${items.length} 张卡` : '暂无结果';
  if (!items.length) {
    cardResults.innerHTML = `<p class="empty-state">后台还没有添加支持 ${escapeHtml(platform?.name || '该平台')} 的卡。</p>`;
    return;
  }
  cardResults.innerHTML = items
    .map((card) => `
      <article class="u-card-item">
        <h3>${escapeHtml(card.name)}</h3>
        <span class="bin">卡头 ${escapeHtml(card.bin)}</span>
      </article>
    `)
    .join('');
}

platformGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('.platform-button');
  if (!button) return;
  const platformId = Number(button.dataset.platformId);
  const platformName = String(button.dataset.platformName || '');
  activePlatformId = platformId;
  platformGrid.querySelectorAll('.platform-button').forEach((item) => {
    item.classList.toggle('active', Number(item.dataset.platformId) === platformId);
  });
  resultTitle.textContent = `${platformName} 支持的卡`;
  resultCount.textContent = '查询中';
  cardResults.innerHTML = `<p class="empty-state">正在查询...</p>`;
  try {
    const data = await fetchJson(`/api/u-card/platforms/${encodeURIComponent(platformId)}/cards`);
    renderCards(data.platform || { id: platformId, name: platformName }, Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    resultCount.textContent = '查询失败';
    setError(error.message || '查询失败');
  }
});

async function bootstrap() {
  try {
    const data = await fetchJson('/api/u-card/platforms');
    renderPlatforms(Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    platformCount.textContent = '加载失败';
    platformGrid.innerHTML = '';
    setError(error.message || '加载失败');
  }
}

bootstrap();
