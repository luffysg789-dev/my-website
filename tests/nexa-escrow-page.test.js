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
const adminHtmlPath = path.join(rootDir, 'public', 'admin.html');
const adminJsPath = path.join(rootDir, 'public', 'admin.js');

test('nexa-escrow game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('nexa-escrow shell keeps header fixed while panels scroll within remaining height', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /\.nexa-escrow-shell\s*\{[\s\S]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);
  assert.match(css, /\.nexa-escrow-shell\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.nexa-escrow-panel\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.nexa-escrow-panel--scrollable\s*\{[\s\S]*overflow-y:\s*auto/);
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
  assert.doesNotMatch(html, /data-locale-toggle=/);
  assert.doesNotMatch(html, /data-i18n="eyebrow"/);
  assert.doesNotMatch(html, /data-i18n="createHeadline"/);
  assert.match(html, /data-tab="create"/);
  assert.match(html, /data-tab="orders"/);
  assert.match(html, /data-tab="account"/);
  assert.match(html, /id="nexaEscrowRoleBuyer"/);
  assert.match(html, /id="nexaEscrowRoleSeller"/);
  assert.match(html, /id="nexaEscrowAmountInput"/);
  assert.match(html, /id="nexaEscrowCounterpartyInput"/);
  assert.match(html, /id="nexaEscrowDescriptionInput"/);
  assert.match(html, /id="nexaEscrowCreateButton"/);
  assert.match(html, /data-order-filter="all"/);
  assert.match(html, /data-order-filter="active"/);
  assert.match(html, /data-order-filter="disputed"/);
  assert.match(html, /data-order-filter="cancelled"/);
  assert.match(html, /data-order-filter="completed"/);
  assert.match(html, /id="nexaEscrowOrdersList"/);
  assert.match(html, /id="nexaEscrowOrdersPullToRefresh"/);
  assert.match(html, /id="nexaEscrowOrdersPullSpinner"/);
  assert.match(html, /id="nexaEscrowAccountPullToRefresh"/);
  assert.match(html, /id="nexaEscrowAccountPullSpinner"/);
  assert.match(html, /id="nexaEscrowOrderDetail"/);
  assert.match(html, /id="nexaEscrowOrderDetailClose"/);
  assert.match(html, /id="nexaEscrowPrimaryAction"/);
  assert.match(html, /id="nexaEscrowSecondaryAction"/);
  assert.match(html, /id="nexaEscrowHeaderCode"/);
  assert.match(html, /id="nexaEscrowHeaderCopy"/);
  assert.match(html, /id="nexaEscrowWithdrawBtn"/);
  assert.match(html, /id="nexaEscrowWithdrawModal"/);
  assert.match(html, /id="nexaEscrowWithdrawAmountInput"/);
  assert.match(html, /id="nexaEscrowAccountStatus"/);
  assert.match(html, /id="nexaEscrowCodeModal"/);
  assert.doesNotMatch(html, /nexa-escrow-back/);
  assert.match(html, /\/nexa-escrow\/script\.js/);
});

test('nexa-escrow script includes Nexa auth, escrow bootstrap, order, and payment hooks', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const NEXA_ESCROW_SESSION_STORAGE_KEY = 'claw800:nexa-escrow:nexa-session';/);
  assert.match(js, /const NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY = 'claw800:nexa-escrow:pending-payment';/);
  assert.match(js, /const NEXA_ESCROW_CODE_MODAL_STORAGE_KEY = 'claw800:nexa-escrow:code-modal:'/);
  assert.match(js, /const MAX_NEXA_ESCROW_SESSION_RETENTION_MS = 30 \* 24 \* 60 \* 60 \* 1000;/);
  assert.match(js, /const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth:\/\/oauth\/authorize';/);
  assert.match(js, /const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth:\/\/order';/);
  assert.match(js, /\/api\/nexa-escrow\/session/);
  assert.match(js, /\/api\/nexa-escrow\/bootstrap/);
  assert.match(js, /\/api\/nexa-escrow\/orders/);
  assert.match(js, /\/api\/nexa-escrow\/payment\/create/);
  assert.match(js, /\/api\/nexa-escrow\/payment\/query/);
  assert.match(js, /\/api\/nexa-escrow\/orders\/action/);
  assert.match(js, /function beginNexaLoginFlow\(/);
  assert.match(js, /function createEscrowOrder\(/);
  assert.match(js, /function beginEscrowPayment\(/);
  assert.match(js, /function settlePendingEscrowPayment\(/);
  assert.match(js, /function submitEscrowAction\(/);
  assert.match(js, /function filterOrders\(/);
  assert.match(js, /function refreshEscrowOrders\(/);
  assert.match(js, /function refreshEscrowAccount\(/);
  assert.match(js, /function refreshCurrentEscrowTab\(/);
  assert.match(js, /NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX/);
  assert.match(js, /function openEscrowCodeModal\(/);
  assert.match(js, /function closeOrderDetail\(/);
  assert.match(js, /function openEscrowOrderFromList\(/);
  assert.match(js, /function applyTranslations\(/);
  assert.match(js, /function copyEscrowCode\(/);
  assert.match(js, /function beginEscrowWithdrawFlow\(/);
  assert.match(js, /\/api\/nexa-escrow\/withdraw\/create/);
  assert.match(js, /\/api\/nexa-escrow\/withdraw\/query/);
  assert.match(js, /orderFilterButtons/);
  assert.match(js, /orderDetailClose/);
  assert.match(js, /AWAITING_PAYMENT', 'PAYMENT_PENDING', 'FUNDED', 'DELIVERED'/);
  assert.match(js, /actionDispute/);
  assert.match(js, /actionConfirmReceipt/);
  assert.doesNotMatch(js, /已登录/);
});

test('admin panel includes nexa escrow orders, users, and withdrawal review entry points', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  const js = fs.readFileSync(adminJsPath, 'utf8');

  assert.match(html, /id="navNexaEscrowOrders"/);
  assert.match(html, /id="navNexaEscrowUsers"/);
  assert.match(html, /id="navNexaEscrowWithdrawals"/);
  assert.match(html, /id="adminNexaEscrowSection"/);
  assert.match(html, /id="adminNexaEscrowUsersSection"/);
  assert.match(html, /id="adminNexaEscrowWithdrawalsSection"/);
  assert.match(html, /id="nexaEscrowOrdersList"/);
  assert.match(html, /id="nexaEscrowUsersList"/);
  assert.match(html, /id="nexaEscrowWithdrawalsList"/);
  assert.match(js, /const adminNexaEscrowUsersSection = document\.getElementById\('adminNexaEscrowUsersSection'\);/);
  assert.match(js, /const adminNexaEscrowWithdrawalsSection = document\.getElementById\('adminNexaEscrowWithdrawalsSection'\);/);
  assert.match(js, /const nexaEscrowUsersList = document\.getElementById\('nexaEscrowUsersList'\);/);
  assert.match(js, /const nexaEscrowWithdrawalsList = document\.getElementById\('nexaEscrowWithdrawalsList'\);/);
  assert.match(js, /requestTutorialJson\(\['\/api\/admin\/nexa-escrow-orders'\]/);
  assert.match(js, /requestTutorialJson\(\['\/api\/admin\/nexa-escrow-users'\]/);
  assert.match(js, /requestTutorialJson\(\['\/api\/admin\/nexa-escrow-withdrawals\?status=review_pending'/);
  assert.match(js, /requestTutorialJson\(\[`\/api\/admin\/nexa-escrow-users\/\$\{encodeURIComponent\(String\(userId\)\)\}\/code`\]/);
  assert.match(js, /requestTutorialJson\(\[`\/api\/admin\/nexa-escrow-withdrawals\/\$\{encodeURIComponent\(partnerOrderNo\)\}\/approve`\]/);
  assert.match(js, /requestTutorialJson\(\[`\/api\/admin\/nexa-escrow-withdrawals\/\$\{encodeURIComponent\(partnerOrderNo\)\}\/reject`\]/);
});
