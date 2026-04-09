# SBTI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone SBTI quiz game for desktop and mobile, and add it to the games hub.

**Architecture:** Use a static three-screen flow inside a standalone `/sbti/` page. Keep all quiz state, scoring, and result rendering in browser memory with no backend persistence, while wiring catalog metadata through the existing games config, db defaults, and route maps.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, existing public game catalog config, Node test runner.

---

## Chunk 1: Catalog and Page Skeleton

### Task 1: Add failing tests for SBTI entrypoints

**Files:**
- Create: `tests/sbti-page.test.js`
- Modify: `tests/games-page-layout.test.js`

- [ ] Write failing tests for:
  - SBTI files existing
  - SBTI in frontend config
  - SBTI in backend defaults
  - SBTI route in server map
  - SBTI added to games hub
- [ ] Run:
  `node --test tests/sbti-page.test.js tests/games-page-layout.test.js`
- [ ] Confirm failure because files/config do not exist yet

### Task 2: Add catalog wiring

**Files:**
- Modify: `public/games-config.js`
- Modify: `src/db.js`
- Modify: `src/server.js`

- [ ] Add SBTI to `games-config.js`
- [ ] Add SBTI to default games catalog in `src/db.js`
- [ ] Add `/sbti/` route and icon mapping in `src/server.js`
- [ ] Re-run the same tests and confirm partial pass

### Task 3: Add static page skeleton

**Files:**
- Create: `public/sbti/index.html`
- Create: `public/sbti/style.css`
- Create: `public/sbti/script.js`
- Test: `tests/sbti-page.test.js`

- [ ] Add failing structure assertions for three screens and script mounts
- [ ] Run:
  `node --test tests/sbti-page.test.js`
- [ ] Implement minimal HTML/CSS/JS skeleton
- [ ] Re-run and get green

## Chunk 2: Quiz Flow

### Task 4: Add failing tests for quiz state and result engine

**Files:**
- Modify: `tests/sbti-page.test.js`
- Modify: `public/sbti/script.js`

- [ ] Add assertions for:
  - question list rendering hook
  - progress handling
  - submit disabled until complete
  - restart action exists
  - result computation helpers exist
- [ ] Run:
  `node --test tests/sbti-page.test.js`
- [ ] Confirm failure

### Task 5: Implement minimal quiz logic

**Files:**
- Modify: `public/sbti/script.js`

- [ ] Add 31-question dataset
- [ ] Add answer state
- [ ] Add progress calculation
- [ ] Add submit and restart behavior
- [ ] Add result computation and render
- [ ] Re-run:
  `node --test tests/sbti-page.test.js`

## Chunk 3: Polish

### Task 6: Make desktop/mobile layout production-ready

**Files:**
- Modify: `public/sbti/style.css`
- Modify: `tests/sbti-page.test.js`

- [ ] Add responsive layout assertions
- [ ] Run failing test
- [ ] Implement mobile and desktop card layout, button sizing, progress layout, result panels
- [ ] Re-run tests

### Task 7: Final verification

**Files:**
- Modify: as needed

- [ ] Run:
  `node --check public/sbti/script.js`
- [ ] Run:
  `node --test tests/sbti-page.test.js tests/games-page-layout.test.js`
- [ ] Confirm all green
