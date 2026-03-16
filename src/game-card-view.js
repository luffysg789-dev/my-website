function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getGameCardMediaMarkup(item) {
  const slug = String(item?.slug || '').trim();
  const name = String(item?.name || '').trim();
  const coverImage = String(item?.cover_image || '').trim();
  const icon = String(item?.icon || '🎮').trim();

  if (slug === 'muyu') {
    return `
      <div class="game-card__icon game-card__icon--muyu" aria-hidden="true">
        <span class="game-card__muyu-body"></span>
        <span class="game-card__muyu-groove"></span>
        <span class="game-card__muyu-base"></span>
      </div>
    `.trim();
  }

  if (coverImage) {
    return `<div class="game-card__cover"><img src="${escapeHtml(coverImage)}" alt="${escapeHtml(name)}" /></div>`;
  }

  return `<div class="game-card__icon" aria-hidden="true">${escapeHtml(icon)}</div>`;
}

module.exports = {
  getGameCardMediaMarkup
};
