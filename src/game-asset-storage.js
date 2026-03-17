const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const IMAGE_EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg'
};

const AUDIO_EXT_BY_MIME = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac'
};

function sanitizeSegment(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

function getExtension({ mimeType, originalName = '' }) {
  const normalizedMime = String(mimeType || '').trim().toLowerCase();
  if (IMAGE_EXT_BY_MIME[normalizedMime]) return IMAGE_EXT_BY_MIME[normalizedMime];
  if (AUDIO_EXT_BY_MIME[normalizedMime]) return AUDIO_EXT_BY_MIME[normalizedMime];

  const originalExt = path.extname(String(originalName || '')).toLowerCase();
  if (/^\.(png|jpg|jpeg|webp|gif|svg|mp3|wav|ogg|webm|m4a|aac)$/.test(originalExt)) {
    return originalExt === '.jpeg' ? '.jpg' : originalExt;
  }
  throw new Error('不支持的文件类型');
}

function saveUploadedGameAsset({
  slug,
  field,
  mimeType,
  originalName,
  buffer,
  publicRootDir
}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('上传文件为空');
  }

  const safeSlug = sanitizeSegment(slug, 'game');
  const safeField = sanitizeSegment(field, 'asset');
  const ext = getExtension({ mimeType, originalName });
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const fileName = `${safeSlug}-${safeField}-${hash}${ext}`;
  const uploadsDir = path.join(publicRootDir, 'uploads', 'games');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
  return {
    publicPath: `/uploads/games/${fileName}`
  };
}

function saveDataUrlGameAsset({
  slug,
  field,
  dataUrl,
  publicRootDir
}) {
  const normalized = String(dataUrl || '').trim();
  const match = normalized.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('无效的 data URL');
  }
  const mimeType = String(match[1] || '').trim().toLowerCase();
  const buffer = Buffer.from(String(match[2] || ''), 'base64');
  return saveUploadedGameAsset({
    slug,
    field,
    mimeType,
    originalName: `asset${getExtension({ mimeType, originalName: '' })}`,
    buffer,
    publicRootDir
  });
}

module.exports = {
  saveUploadedGameAsset,
  saveDataUrlGameAsset
};
