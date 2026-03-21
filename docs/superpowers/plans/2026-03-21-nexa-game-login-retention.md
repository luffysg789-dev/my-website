# Nexa Game Login Retention Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Nexa game-page login state available for up to 30 days after a successful login, while still forcing re-login when Nexa explicitly reports the session has expired.

**Architecture:** Update the shared game tip client script so cached Nexa sessions are normalized to a capped 30-day lifetime instead of a short fallback lifetime. Cover the behavior with a focused string-based regression test in the existing game tip test suite.

**Tech Stack:** Node.js, browser JavaScript, node:test

---

### Task 1: Lock the expected retention behavior with a failing test

**Files:**
- Modify: `tests/game-tip-page.test.js`
- Test: `tests/game-tip-page.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that the shared game tip script defines a 30-day retention constant and applies it when reading and saving Nexa sessions.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/game-tip-page.test.js`
Expected: FAIL because the script does not yet define the new 30-day retention logic.

### Task 2: Implement the 30-day capped retention logic

**Files:**
- Modify: `public/game-tip.js`
- Test: `tests/game-tip-page.test.js`

- [ ] **Step 1: Write minimal implementation**

Introduce a 30-day max retention constant and normalize session payloads so cached Nexa sessions persist locally for at most 30 days, preferring the shorter valid third-party expiry when present.

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/game-tip-page.test.js`
Expected: PASS

### Task 3: Run targeted regression verification

**Files:**
- Test: `tests/game-tip-page.test.js`

- [ ] **Step 1: Run targeted tests**

Run: `node --test tests/game-tip-page.test.js tests/nexa-pay.test.js`
Expected: PASS
