const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function loadDbAtTempPath() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-room-schema-'));
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

function getIndexes(db, tableName) {
  return db
    .prepare(`PRAGMA index_list('${tableName}')`)
    .all()
    .map((row) => row.name);
}

function sortForeignKeys(keys) {
  return [...keys].sort((a, b) => a.from.localeCompare(b.from) || a.table.localeCompare(b.table) || a.to.localeCompare(b.to));
}

test('xiangqi room schema is created with the expected tables, columns, and foreign keys', () => {
  const { db, cleanup } = loadDbAtTempPath();

  try {
    const expectedTables = ['xiangqi_rooms', 'xiangqi_matches', 'xiangqi_moves'];

    for (const tableName of expectedTables) {
      const tableSql = getTableSql(db, tableName) || '';
      assert.ok(tableSql.startsWith(`CREATE TABLE ${tableName} (`), `${tableName} table is missing from sqlite_master`);
    }

    assert.deepEqual(
      getColumns(db, 'xiangqi_rooms'),
      [
        'id',
        'room_code',
        'creator_user_id',
        'joiner_user_id',
        'stake_amount',
        'time_control_minutes',
        'status',
        'created_at',
        'started_at',
        'finished_at'
      ]
    );

    assert.deepEqual(
      getColumns(db, 'xiangqi_matches'),
      [
        'id',
        'room_id',
        'red_user_id',
        'black_user_id',
        'current_fen',
        'turn_side',
        'red_time_left_ms',
        'black_time_left_ms',
        'status',
        'result',
        'winner_user_id',
        'last_move_at',
        'created_at',
        'finished_at'
      ]
    );

    assert.deepEqual(
      getColumns(db, 'xiangqi_moves'),
      ['id', 'match_id', 'move_no', 'side', 'from_pos', 'to_pos', 'fen_after', 'created_at']
    );

    assert.deepEqual(sortForeignKeys(getForeignKeys(db, 'xiangqi_rooms')), sortForeignKeys([
      { from: 'creator_user_id', table: 'game_users', to: 'id' },
      { from: 'joiner_user_id', table: 'game_users', to: 'id' }
    ]));
    assert.deepEqual(sortForeignKeys(getForeignKeys(db, 'xiangqi_matches')), sortForeignKeys([
      { from: 'room_id', table: 'xiangqi_rooms', to: 'id' },
      { from: 'red_user_id', table: 'game_users', to: 'id' },
      { from: 'black_user_id', table: 'game_users', to: 'id' },
      { from: 'winner_user_id', table: 'game_users', to: 'id' }
    ]));
    assert.deepEqual(sortForeignKeys(getForeignKeys(db, 'xiangqi_moves')), sortForeignKeys([
      { from: 'match_id', table: 'xiangqi_matches', to: 'id' }
    ]));

    assert.ok(
      getIndexes(db, 'xiangqi_matches').includes('idx_xiangqi_matches_room_unique'),
      'xiangqi_matches should enforce one match per room'
    );
    assert.ok(
      getIndexes(db, 'xiangqi_moves').includes('idx_xiangqi_moves_match_move_no_unique'),
      'xiangqi_moves should enforce unique move numbers per match'
    );
  } finally {
    cleanup();
  }
});
