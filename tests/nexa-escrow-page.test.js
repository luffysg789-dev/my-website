const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');
const htmlPath = path.join(rootDir, 'public', 'nexa-escrow', 'index.html');
const cssPath = path.join(rootDir, 'public', 'nexa-escrow', 'style.css');
const jsPath = path.join(rootDir, 'public', 'nexa-escrow', 'script.js');

test('nexa-escrow game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('nexa-escrow is listed in frontend config and backend defaults as a standalone page hidden from the public hub', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'nexa-escrow'/);
  assert.match(config, /name:\s*'Nexa 担保'/);
  assert.match(config, /showInGamesHub:\s*0/);
  assert.match(config, /route:\s*'\/nexa-escrow\/'/);
  assert.match(db, /slug:\s*'nexa-escrow'/);
  assert.match(server, /'nexa-escrow':\s*'\/nexa-escrow\/'/);
});

test('nexa-escrow html includes create and orders tabs plus escrow actions', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 Nexa 担保<\/title>/);
  assert.match(html, /data-nexa-escrow-app/);
  assert.doesNotMatch(html, /id="nexaEscrowAuthStatus"/);
  assert.match(html, /data-locale-toggle="zh"/);
  assert.match(html, /data-locale-toggle="en"/);
  assert.match(html, /data-tab="create"/);
  assert.match(html, /data-tab="orders"/);
  assert.match(html, /data-tab="account"/);
  assert.match(html, /id="nexaEscrowRoleBuyer"/);
  assert.match(html, /id="nexaEscrowRoleSeller"/);
  assert.match(html, /id="nexaEscrowAmountInput"/);
  assert.match(html, /id="nexaEscrowCounterpartyInput"/);
  assert.match(html, /id="nexaEscrowDescriptionInput"/);
  assert.match(html, /id="nexaEscrowCreateButton"/);
  assert.match(html, /id="nexaEscrowTradeCodeInput"/);
  assert.match(html, /id="nexaEscrowJoinButton"/);
  assert.match(html, /id="nexaEscrowOrdersList"/);
  assert.match(html, /id="nexaEscrowOrderDetail"/);
  assert.match(html, /id="nexaEscrowPrimaryAction"/);
  assert.match(html, /id="nexaEscrowSecondaryAction"/);
  assert.match(html, /id="nexaEscrowAccountCode"/);
  assert.match(html, /id="nexaEscrowCodeModal"/);
  assert.doesNotMatch(html, /nexa-escrow-back/);
  assert.match(html, /\/nexa-escrow\/script\.js/);
});

test('nexa-escrow script includes Nexa auth, escrow bootstrap, order, and payment hooks', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const NEXA_ESCROW_SESSION_STORAGE_KEY = 'claw800:nexa-escrow:nexa-session';/);
  assert.match(js, /const NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY = 'claw800:nexa-escrow:pending-payment';/);
  assert.match(js, /const NEXA_ESCROW_CODE_MODAL_STORAGE_KEY = 'claw800:nexa-escrow:code-modal:'/);
  assert.match(js, /const NEXA_ESCROW_LOCALE_STORAGE_KEY = 'claw800:nexa-escrow:locale';/);
  assert.match(js, /const MAX_NEXA_ESCROW_SESSION_RETENTION_MS = 30 \* 24 \* 60 \* 60 \* 1000;/);
  assert.match(js, /const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth:\/\/oauth\/authorize';/);
  assert.match(js, /const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth:\/\/order';/);
  assert.match(js, /\/api\/nexa-escrow\/session/);
  assert.match(js, /\/api\/nexa-escrow\/bootstrap/);
  assert.match(js, /\/api\/nexa-escrow\/orders/);
  assert.match(js, /\/api\/nexa-escrow\/orders\/join/);
  assert.match(js, /\/api\/nexa-escrow\/payment\/create/);
  assert.match(js, /\/api\/nexa-escrow\/payment\/query/);
  assert.match(js, /\/api\/nexa-escrow\/orders\/action/);
  assert.match(js, /function beginNexaLoginFlow\(/);
  assert.match(js, /function createEscrowOrder\(/);
  assert.match(js, /function joinEscrowOrder\(/);
  assert.match(js, /function beginEscrowPayment\(/);
  assert.match(js, /function settlePendingEscrowPayment\(/);
  assert.match(js, /function submitEscrowAction\(/);
  assert.match(js, /function openEscrowCodeModal\(/);
  assert.match(js, /function applyTranslations\(/);
  assert.match(js, /function toggleLanguage\(/);
  assert.match(js, /localeButtons/);
  assert.doesNotMatch(js, /已登录/);
});
