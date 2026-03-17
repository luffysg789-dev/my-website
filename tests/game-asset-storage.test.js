const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { saveUploadedGameAsset, saveDataUrlGameAsset } = require('../src/game-asset-storage');

test('saveUploadedGameAsset stores audio file and returns public path', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-game-asset-'));
  const publicDir = path.join(tmpRoot, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const result = saveUploadedGameAsset({
    slug: 'muyu',
    field: 'background-music',
    mimeType: 'audio/mpeg',
    originalName: 'bg.mp3',
    buffer: Buffer.from('fake-audio-data'),
    publicRootDir: publicDir
  });

  assert.match(result.publicPath, /^\/uploads\/games\/muyu-background-music-[a-f0-9]{12}\.mp3$/);
  const savedPath = path.join(publicDir, result.publicPath.replace(/^\//, ''));
  assert.equal(fs.existsSync(savedPath), true);
  assert.equal(fs.readFileSync(savedPath, 'utf8'), 'fake-audio-data');
});

test('saveUploadedGameAsset rejects unsupported mime types', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-game-asset-'));
  const publicDir = path.join(tmpRoot, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  assert.throws(
    () =>
      saveUploadedGameAsset({
        slug: 'muyu',
        field: 'background-music',
        mimeType: 'application/octet-stream',
        originalName: 'bg.bin',
        buffer: Buffer.from('x'),
        publicRootDir: publicDir
      }),
    /不支持的文件类型/
  );
});

test('saveDataUrlGameAsset stores image data url as static file and returns public path', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-game-asset-'));
  const publicDir = path.join(tmpRoot, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const dataUrl = 'data:image/png;base64,' + Buffer.from('fake-image-data').toString('base64');
  const result = saveDataUrlGameAsset({
    slug: 'muyu',
    field: 'cover-image',
    dataUrl,
    publicRootDir: publicDir
  });

  assert.match(result.publicPath, /^\/uploads\/games\/muyu-cover-image-[a-f0-9]{12}\.png$/);
  const savedPath = path.join(publicDir, result.publicPath.replace(/^\//, ''));
  assert.equal(fs.existsSync(savedPath), true);
  assert.equal(fs.readFileSync(savedPath, 'utf8'), 'fake-image-data');
});
