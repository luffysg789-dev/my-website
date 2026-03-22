const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function loadDbAtTempPath() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-wallet-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
  const previousDbPath = process.env.CLAW800_DB_PATH;

  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];

  const db = require(dbModulePath);

  return {
    db,
    cleanup() {
      db.close();
      delete require.cache[require.resolve(dbModulePath)];
      if (previousDbPath === undefined) {
        delete process.env.CLAW800_DB_PATH;
      } else {
        process.env.CLAW800_DB_PATH = previousDbPath;
      }
    }
  };
}

function getTableSql(db, tableName) {
  return db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName)?.sql;
}

function getColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info('${tableName}')`).all().map((row) => row.name);
}

function getForeignKeys(db, tableName) {
  return db
    .prepare(`PRAGMA foreign_key_list('${tableName}')`)
    .all()
    .map((row) => ({ from: row.from, table: row.table, to: row.to }));
}

test('xiangqi wallet schema is created with the expected tables, columns, and foreign keys', () => {
  const { db, cleanup } = loadDbAtTempPath();

  try {
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);

    const expectedTables = [
      'game_users',
      'game_wallets',
      'game_wallet_ledger',
      'nexa_game_deposits',
      'nexa_game_withdrawals'
    ];

    for (const tableName of expectedTables) {
      const tableSql = getTableSql(db, tableName) || '';
      assert.ok(tableSql.startsWith(`CREATE TABLE ${tableName} (`), `${tableName} table is missing from sqlite_master`);
    }

    assert.deepEqual(
      getColumns(db, 'game_users'),
      ['id', 'openid', 'nickname', 'avatar', 'created_at', 'updated_at']
    );

    assert.deepEqual(
      getColumns(db, 'game_wallets'),
      ['user_id', 'currency', 'available_balance', 'frozen_balance', 'updated_at']
    );

    assert.deepEqual(
      getColumns(db, 'game_wallet_ledger'),
      [
        'id',
        'user_id',
        'type',
        'amount',
        'balance_after',
        'related_type',
        'related_id',
        'remark',
        'created_at'
      ]
    );

    assert.deepEqual(
      getColumns(db, 'nexa_game_deposits'),
      [
        'id',
        'partner_order_no',
        'user_id',
        'amount',
        'currency',
        'status',
        'nexa_order_no',
        'notify_payload',
        'created_at',
        'paid_at'
      ]
    );

    assert.deepEqual(
      getColumns(db, 'nexa_game_withdrawals'),
      [
        'id',
        'partner_order_no',
        'user_id',
        'amount',
        'currency',
        'status',
        'notify_payload',
        'created_at',
        'finished_at'
      ]
    );

    assert.deepEqual(getForeignKeys(db, 'game_wallets'), [
      { from: 'user_id', table: 'game_users', to: 'id' }
    ]);
    assert.deepEqual(getForeignKeys(db, 'game_wallet_ledger'), [
      { from: 'user_id', table: 'game_users', to: 'id' }
    ]);
    assert.deepEqual(getForeignKeys(db, 'nexa_game_deposits'), [
      { from: 'user_id', table: 'game_users', to: 'id' }
    ]);
    assert.deepEqual(getForeignKeys(db, 'nexa_game_withdrawals'), [
      { from: 'user_id', table: 'game_users', to: 'id' }
    ]);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO game_wallets (user_id, currency, available_balance, frozen_balance)
        VALUES (999999, 'USDT', '0', '0')
      `).run();
    }, /FOREIGN KEY constraint failed/);
  } finally {
    cleanup();
  }
});
