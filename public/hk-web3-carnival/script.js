(function () {
  const data = window.__HK_WEB3_CARNIVAL_DATA__;
  const app = document.querySelector('[data-carnival-app]');
  if (!app || !data || !data.summary || !Array.isArray(data.items)) return;

  const hero = document.getElementById('carnivalHero');
  const heroTitle = document.getElementById('carnivalHeroTitle');
  const heroDescription = document.getElementById('carnivalHeroDescription');
  const heroDateRange = document.getElementById('carnivalHeroDateRange');
  const heroTotal = document.getElementById('carnivalHeroTotal');
  const searchInput = document.getElementById('carnivalSearchInput');
  const dateFilter = document.getElementById('carnivalDateFilter');
  const stateFilter = document.getElementById('carnivalStateFilter');
  const typeFilter = document.getElementById('carnivalTypeFilter');
  const eventList = document.getElementById('carnivalEventList');
  const resultCount = document.getElementById('carnivalResultCount');
  const loadMoreButton = document.getElementById('carnivalLoadMore');
  const emptyState = document.getElementById('carnivalEmptyState');
  const contactButton = document.getElementById('carnivalContactButton');
  const shareButton = document.getElementById('carnivalShareButton');
  const qrModal = document.getElementById('carnivalQrModal');
  const qrBackdrop = document.getElementById('carnivalQrBackdrop');
  const shareModal = document.getElementById('carnivalShareModal');
  const shareBackdrop = document.getElementById('carnivalShareBackdrop');

  const PAGE_SIZE = 18;
  let visibleCount = PAGE_SIZE;
  let filteredItems = data.items.slice();

  const statusMap = {
    1: { text: '未开始', className: 'upcoming' },
    2: { text: '进行中', className: 'live' },
    3: { text: '已结束', className: 'ended' }
  };

  const typeMap = {
    0: '其他',
    1: '精选活动',
    2: '酒会社交',
    3: '特定方向'
  };

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDateBadge(dateValue) {
    const date = new Date(dateValue);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }

  function formatDateTime(dateValue) {
    const date = parseEventDateTime(dateValue);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
  }

  function parseEventDateTime(dateValue) {
    const normalized = String(dateValue || '').trim().replace(' ', 'T');
    return new Date(normalized);
  }

  function getComputedEventState(item) {
    const now = new Date();
    const startTime = parseEventDateTime(item.startTime);
    const endTime = parseEventDateTime(item.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return Number(item.state || 1) || 1;
    }
    if (endTime.getTime() < startTime.getTime()) {
      endTime.setDate(endTime.getDate() + 1);
    }
    if (now.getTime() < startTime.getTime()) return 1;
    if (now.getTime() > endTime.getTime()) return 3;
    return 2;
  }

  function buildTimeOptions() {
    const options = ['<option value="">时间</option>'];
    const seen = new Set();
    data.items.forEach((item) => {
      const value = item.startTime.slice(0, 10);
      if (seen.has(value)) return;
      seen.add(value);
      options.push(`<option value="${value}">${value.slice(5).replace('-', '月')}日</option>`);
    });
    dateFilter.innerHTML = options.join('');
  }

  function renderHero() {
    hero.style.backgroundImage = `url(${data.summary.thumb})`;
    if (!heroTitle.textContent.trim()) {
      heroTitle.textContent = data.summary.name;
    }
    heroDescription.textContent = data.summary.description;
    heroDateRange.textContent = `${data.summary.startDate} - ${data.summary.endDate}`;
    heroTotal.textContent = `${data.summary.total} 场活动`;
  }

  function renderEvents() {
    const visibleItems = filteredItems.slice(0, visibleCount);
    resultCount.textContent = `${filteredItems.length} 条结果`;
    emptyState.hidden = filteredItems.length !== 0;
    loadMoreButton.hidden = filteredItems.length <= visibleCount;

    eventList.innerHTML = visibleItems
      .map((item) => {
        const status = statusMap[getComputedEventState(item)] || statusMap[1];
        return `
          <article class="carnival-event-card">
            <div class="carnival-date-badge">
              <span class="carnival-date-badge__text">${escapeHtml(formatDateBadge(item.startTime))}</span>
            </div>
            <a class="carnival-event-card__main" href="${escapeHtml(item.url || '#')}" target="_blank" rel="nofollow noopener">
              <div class="carnival-event-card__image">
                <img src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.name)}" loading="lazy" />
              </div>
              <div class="carnival-event-card__body">
                <div class="carnival-event-card__topline">
                  <span class="carnival-status carnival-status--${escapeHtml(status.className)}">${escapeHtml(status.text)}</span>
                  <span class="carnival-type">${escapeHtml(typeMap[item.type] || '其他')}</span>
                </div>
                <h3 class="carnival-event-card__title">${escapeHtml(item.name)}</h3>
                <div class="carnival-event-card__meta">
                  <div class="carnival-event-card__meta-row">
                    <span class="carnival-event-card__meta-icon">⌖</span>
                    <span>${escapeHtml(item.location || '香港')}</span>
                  </div>
                  <div class="carnival-event-card__meta-row">
                    <span class="carnival-event-card__meta-icon">⏱</span>
                    <span>${escapeHtml(formatDateTime(item.startTime))} - ${escapeHtml(formatDateTime(item.endTime))}</span>
                  </div>
                </div>
              </div>
            </a>
            <div class="carnival-event-card__action">
              <a class="carnival-book-button" href="${escapeHtml(item.url || '#')}" target="_blank" rel="nofollow noopener">BOOK</a>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function applyFilters() {
    const keyword = searchInput.value.trim().toLowerCase();
    const dateValue = dateFilter.value;
    const stateValue = stateFilter.value;
    const typeValue = typeFilter.value;

    filteredItems = data.items.filter((item) => {
      const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword) || (item.location || '').toLowerCase().includes(keyword);
      const matchesDate = !dateValue || item.startTime.startsWith(dateValue);
      const matchesState = !stateValue || String(getComputedEventState(item)) === stateValue;
      const matchesType = !typeValue || String(item.type) === typeValue;
      return matchesKeyword && matchesDate && matchesState && matchesType;
    });

    visibleCount = PAGE_SIZE;
    renderEvents();
  }

  function loadMore() {
    visibleCount += PAGE_SIZE;
    renderEvents();
  }

  function openQrModal() {
    qrModal.hidden = false;
  }

  function closeQrModal() {
    qrModal.hidden = true;
  }

  function openShareModal() {
    shareModal.hidden = false;
  }

  function closeShareModal() {
    shareModal.hidden = true;
  }

  buildTimeOptions();
  renderHero();
  renderEvents();

  searchInput.addEventListener('input', applyFilters);
  dateFilter.addEventListener('change', applyFilters);
  stateFilter.addEventListener('change', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  loadMoreButton.addEventListener('click', loadMore);
  contactButton.addEventListener('click', openQrModal);
  qrBackdrop.addEventListener('click', closeQrModal);
  shareButton.addEventListener('click', openShareModal);
  shareBackdrop.addEventListener('click', closeShareModal);
  globalThis.setInterval(() => {
    applyFilters();
  }, 60 * 60 * 1000);
})();
