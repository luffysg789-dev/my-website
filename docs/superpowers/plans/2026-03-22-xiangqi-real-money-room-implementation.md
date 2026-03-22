# Xiangqi Real Money Room Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Chinese chess room system with Nexa-powered deposit/withdraw, internal wallet ledger, stake-based room creation/join, real-time play, and automatic settlement.

**Architecture:** Extend the existing Express + SQLite app with a focused Xiangqi subsystem: wallet tables and ledger-backed settlement on the server, Nexa payment/withdraw orchestration reusing existing signing helpers, and a new `public/xiangqi/` frontend that consumes JSON APIs plus SSE room events. Keep move validation and settlement authoritative on the server; keep the client responsible only for input, rendering, and status updates.

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), browser JavaScript, SSE, `node:test`

---

## Chunk 1: Wallet and Nexa Money Flows

### Task 1: Add wallet and order schema coverage tests

**Files:**
- Modify: `tests/game-tip-page.test.js`
- Create: `tests/xiangqi-wallet.test.js`
- Modify: `src/db.js`
- Test: `tests/xiangqi-wallet.test.js`

- [ ] **Step 1: Write the failing test**

Add a new test file that asserts `src/db.js` creates the Xiangqi wallet, ledger, deposit, and withdrawal tables with the expected key columns.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-wallet.test.js`
Expected: FAIL because the schema does not yet define the Xiangqi wallet tables.

- [ ] **Step 3: Write minimal implementation**

Update `src/db.js` to create:
- `game_users`
- `game_wallets`
- `game_wallet_ledger`
- `nexa_game_deposits`
- `nexa_game_withdrawals`

Keep the table creation idempotent and aligned with the existing migration style in the file.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-wallet.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db.js tests/xiangqi-wallet.test.js
git commit -m "feat: add xiangqi wallet schema"
```

### Task 2: Add Nexa wallet API surface tests

**Files:**
- Modify: `tests/nexa-pay.test.js`
- Create: `tests/xiangqi-wallet-api.test.js`
- Modify: `src/nexa-pay.js`
- Modify: `src/server.js`
- Test: `tests/xiangqi-wallet-api.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `src/nexa-pay.js` exposes helpers for Nexa withdrawal payloads
- `src/server.js` exposes Xiangqi wallet endpoints:
  - `GET /api/xiangqi/wallet`
  - `GET /api/xiangqi/wallet/ledger`
  - `POST /api/xiangqi/deposit/create`
  - `POST /api/xiangqi/deposit/query`
  - `POST /api/xiangqi/deposit/notify`
  - `POST /api/xiangqi/withdraw/create`
  - `POST /api/xiangqi/withdraw/query`
  - `POST /api/xiangqi/withdraw/notify`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-wallet-api.test.js tests/nexa-pay.test.js`
Expected: FAIL because the new helpers and endpoints do not yet exist.

- [ ] **Step 3: Write minimal implementation**

In `src/nexa-pay.js`, add focused helpers for:
- withdrawal payload construction
- withdrawal query payload construction

In `src/server.js`, add placeholder Xiangqi wallet routes that:
- authenticate the Nexa-backed Xiangqi session
- read wallet summary and recent ledger rows
- create/query deposit orders
- create/query withdrawals
- accept notify callbacks

Use small helper functions instead of adding all logic inline to the large server file.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-wallet-api.test.js tests/nexa-pay.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/nexa-pay.js src/server.js tests/xiangqi-wallet-api.test.js tests/nexa-pay.test.js
git commit -m "feat: add xiangqi wallet api skeleton"
```

### Task 3: Implement deposit and withdraw ledger behavior

**Files:**
- Create: `tests/xiangqi-money-flow.test.js`
- Modify: `src/server.js`
- Modify: `src/db.js`
- Test: `tests/xiangqi-money-flow.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that cover the intended money behavior:
- successful deposit notify credits `available_balance`
- duplicate deposit notify is idempotent
- withdraw create rejects when `available_balance` is insufficient
- withdraw create records a pending withdrawal and deducts from `available_balance`
- failed withdrawal notify refunds the deducted amount

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-money-flow.test.js`
Expected: FAIL because the handlers do not yet perform wallet ledger mutations.

- [ ] **Step 3: Write minimal implementation**

Implement transactional wallet helpers in `src/server.js` (or extracted local helpers inside the same file) for:
- wallet creation-on-demand
- balance credit/debit
- frozen balance adjustment
- ledger row creation
- idempotent deposit/withdraw state transitions

Ensure the notify handlers verify signatures before mutating data.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-money-flow.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/db.js tests/xiangqi-money-flow.test.js
git commit -m "feat: implement xiangqi deposit and withdraw flows"
```

## Chunk 2: Rooms, Stake Freezing, and Settlement

### Task 4: Add room schema and endpoint tests

**Files:**
- Create: `tests/xiangqi-room-schema.test.js`
- Create: `tests/xiangqi-room-api.test.js`
- Modify: `src/db.js`
- Modify: `src/server.js`
- Test: `tests/xiangqi-room-schema.test.js`
- Test: `tests/xiangqi-room-api.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `src/db.js` creates `xiangqi_rooms`, `xiangqi_matches`, and `xiangqi_moves`
- `src/server.js` exposes:
  - `POST /api/xiangqi/rooms/create`
  - `POST /api/xiangqi/rooms/join`
  - `POST /api/xiangqi/rooms/cancel`
  - `GET /api/xiangqi/rooms/:roomCode`
  - `GET /api/xiangqi/rooms/:roomCode/events`
  - `GET /api/xiangqi/matches/:id`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-room-schema.test.js tests/xiangqi-room-api.test.js`
Expected: FAIL because the Xiangqi room tables and routes do not yet exist.

- [ ] **Step 3: Write minimal implementation**

Add the Xiangqi room, match, and move tables to `src/db.js`, then add the matching route shells to `src/server.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-room-schema.test.js tests/xiangqi-room-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db.js src/server.js tests/xiangqi-room-schema.test.js tests/xiangqi-room-api.test.js
git commit -m "feat: add xiangqi room schema and routes"
```

### Task 5: Implement room creation, join, cancel, and stake freezing

**Files:**
- Create: `tests/xiangqi-room-lifecycle.test.js`
- Modify: `src/server.js`
- Test: `tests/xiangqi-room-lifecycle.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that cover:
- create room rejects when balance is insufficient
- create room freezes stake and stores room details
- join room rejects when balance is insufficient
- join room freezes stake and marks room ready
- cancel room before start unfreezes all frozen stake
- a user cannot create/join a second active room

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-room-lifecycle.test.js`
Expected: FAIL because the room routes do not yet update wallet and room state.

- [ ] **Step 3: Write minimal implementation**

Implement transactional room lifecycle helpers:
- validate stake limits
- ensure one active room/match per user
- freeze/unfreeze wallet balances
- generate unique room codes
- create a match when the joiner arrives

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-room-lifecycle.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js tests/xiangqi-room-lifecycle.test.js
git commit -m "feat: implement xiangqi room lifecycle"
```

### Task 6: Implement settlement behavior

**Files:**
- Create: `tests/xiangqi-settlement.test.js`
- Modify: `src/server.js`
- Test: `tests/xiangqi-settlement.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that cover:
- winner receives opponent stake and own stake is released
- loser loses only their frozen stake
- draw returns both frozen stakes
- timeout result returns both frozen stakes
- settlement is idempotent if the same match result is processed twice

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-settlement.test.js`
Expected: FAIL because match settlement does not yet mutate wallet balances.

- [ ] **Step 3: Write minimal implementation**

Implement a single authoritative settlement helper that:
- checks the room/match state
- applies the correct wallet ledger mutations in a transaction
- marks room and match finished
- refuses duplicate settlement

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-settlement.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js tests/xiangqi-settlement.test.js
git commit -m "feat: add xiangqi settlement logic"
```

## Chunk 3: Real-Time Match Logic

### Task 7: Add frontend asset presence and route coverage tests

**Files:**
- Create: `tests/xiangqi-page.test.js`
- Modify: `public/games-config.js`
- Modify: `src/db.js`
- Modify: `src/server.js`
- Create: `public/xiangqi/index.html`
- Create: `public/xiangqi/style.css`
- Create: `public/xiangqi/script.js`
- Test: `tests/xiangqi-page.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `public/xiangqi/index.html`, `style.css`, and `script.js` exist
- the game catalog includes `xiangqi`
- `/api/games` can serve the new game through existing config paths
- the page includes the shared Nexa login and Xiangqi assets needed for mobile

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-page.test.js`
Expected: FAIL because the Xiangqi page assets and catalog entry do not yet exist.

- [ ] **Step 3: Write minimal implementation**

Create the Xiangqi page assets with basic sections:
- hero
- wallet card
- room card
- board area
- action bar

Add the Xiangqi game entry to both `src/db.js` default catalog data and `public/games-config.js` defaults.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-page.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/xiangqi/index.html public/xiangqi/style.css public/xiangqi/script.js public/games-config.js src/db.js tests/xiangqi-page.test.js
git commit -m "feat: add xiangqi page shell"
```

### Task 8: Implement Xiangqi move validation and match commands

**Files:**
- Create: `tests/xiangqi-match-rules.test.js`
- Modify: `src/server.js`
- Test: `tests/xiangqi-match-rules.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that cover:
- only the current side can move
- illegal moves are rejected
- legal moves update stored state
- resign marks the correct winner
- draw offer and acceptance mark the match as draw

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-match-rules.test.js`
Expected: FAIL because the move and command routes do not yet enforce Xiangqi match rules.

- [ ] **Step 3: Write minimal implementation**

Implement a focused Xiangqi rules module inside `src/server.js` or extract a local helper file if the logic grows too large. The implementation must:
- build the initial board state
- validate movement by piece type
- alternate turns
- persist move history
- trigger settlement through the shared settlement helper for resign/draw

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-match-rules.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js tests/xiangqi-match-rules.test.js
git commit -m "feat: implement xiangqi match rules"
```

### Task 9: Implement SSE room events and timeout-as-draw behavior

**Files:**
- Create: `tests/xiangqi-events.test.js`
- Modify: `src/server.js`
- Modify: `public/xiangqi/script.js`
- Test: `tests/xiangqi-events.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- the SSE endpoint emits room/match updates
- move actions bump a room version/event payload
- timeout handling resolves to draw and returns both stakes

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-events.test.js`
Expected: FAIL because the event stream and timeout logic are not yet implemented.

- [ ] **Step 3: Write minimal implementation**

Implement:
- SSE subscription registry per room
- event fan-out on room join, move, resign, draw, and settlement
- timeout tick handling that converts expired games into draw settlement
- minimal client-side event consumption in `public/xiangqi/script.js`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-events.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js public/xiangqi/script.js tests/xiangqi-events.test.js
git commit -m "feat: add xiangqi realtime events"
```

## Chunk 4: UI Polish, Integration, and Regression

### Task 10: Implement the full mobile-first Xiangqi interface

**Files:**
- Modify: `public/xiangqi/index.html`
- Modify: `public/xiangqi/style.css`
- Modify: `public/xiangqi/script.js`
- Test: `tests/xiangqi-page.test.js`

- [ ] **Step 1: Write the failing test**

Extend `tests/xiangqi-page.test.js` to assert the final page includes:
- wallet summary fields
- deposit and withdraw buttons
- create/join room forms
- time control choices for 10/15/30 minutes
- board container
- match action bar
- settlement dialog placeholders

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xiangqi-page.test.js`
Expected: FAIL because the Xiangqi page shell is still minimal.

- [ ] **Step 3: Write minimal implementation**

Build the polished mobile interface using the approved “national competitive” visual direction:
- textured background
- wallet ledger card styling
- strong room controls
- large touch-friendly board
- clear money/status feedback

Keep the layout accessible and avoid introducing generic dashboard visuals.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xiangqi-page.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/xiangqi/index.html public/xiangqi/style.css public/xiangqi/script.js tests/xiangqi-page.test.js
git commit -m "feat: polish xiangqi mobile ui"
```

### Task 11: Run integrated regression checks

**Files:**
- Test: `tests/xiangqi-wallet.test.js`
- Test: `tests/xiangqi-wallet-api.test.js`
- Test: `tests/xiangqi-money-flow.test.js`
- Test: `tests/xiangqi-room-schema.test.js`
- Test: `tests/xiangqi-room-api.test.js`
- Test: `tests/xiangqi-room-lifecycle.test.js`
- Test: `tests/xiangqi-settlement.test.js`
- Test: `tests/xiangqi-page.test.js`
- Test: `tests/xiangqi-match-rules.test.js`
- Test: `tests/xiangqi-events.test.js`
- Test: `tests/nexa-pay.test.js`

- [ ] **Step 1: Run Xiangqi test suite**

Run: `node --test tests/xiangqi-wallet.test.js tests/xiangqi-wallet-api.test.js tests/xiangqi-money-flow.test.js tests/xiangqi-room-schema.test.js tests/xiangqi-room-api.test.js tests/xiangqi-room-lifecycle.test.js tests/xiangqi-settlement.test.js tests/xiangqi-page.test.js tests/xiangqi-match-rules.test.js tests/xiangqi-events.test.js tests/nexa-pay.test.js`
Expected: PASS

- [ ] **Step 2: Run existing tip/payment regressions**

Run: `node --test tests/game-tip-page.test.js tests/nexa-pay.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "test: verify xiangqi room integration"
```
