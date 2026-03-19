const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dbJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'db.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.js'), 'utf8');
const skillsJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'skills.js'), 'utf8');

test('skills catalog schema includes pinned and hot flags', () => {
  assert.match(dbJs, /CREATE TABLE IF NOT EXISTS skills_catalog[\s\S]*is_pinned INTEGER NOT NULL DEFAULT 0/);
  assert.match(dbJs, /CREATE TABLE IF NOT EXISTS skills_catalog[\s\S]*is_hot INTEGER NOT NULL DEFAULT 0/);
  assert.match(dbJs, /ALTER TABLE skills_catalog ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0/);
  assert.match(dbJs, /ALTER TABLE skills_catalog ADD COLUMN is_hot INTEGER NOT NULL DEFAULT 0/);
});

test('skills queries and admin save path include pinned and hot fields', () => {
  assert.match(serverJs, /SELECT id, name, name_en, url, description, description_en, category, category_en, icon, sort_order, is_pinned, is_hot, created_at, updated_at/);
  assert.match(serverJs, /ORDER BY is_pinned DESC, sort_order DESC, updated_at DESC, created_at DESC, id DESC/);
  assert.match(serverJs, /const isPinned = Number\(req\.body\.isPinned \?\? req\.body\.is_pinned\)/);
  assert.match(serverJs, /const isHot = Number\(req\.body\.isHot \?\? req\.body\.is_hot\)/);
  assert.match(serverJs, /SET name = \?, name_en = \?, url = \?, description = \?, description_en = \?, category = \?, category_en = \?, icon = \?, sort_order = \?, is_pinned = \?, is_hot = \?, updated_at = datetime\('now'\)/);
});

test('admin skill editor exposes pinned and hot toggles', () => {
  assert.match(adminJs, /id="skillPinned-\$\{skill\.id\}"/);
  assert.match(adminJs, /id="skillHot-\$\{skill\.id\}"/);
  assert.match(adminJs, /isPinned: Number\(document\.getElementById\(`skillPinned-\$\{id\}`\)\?\.value \|\| 0\) \|\| 0/);
  assert.match(adminJs, /isHot: Number\(document\.getElementById\(`skillHot-\$\{id\}`\)\?\.value \|\| 0\) \|\| 0/);
});

test('skills frontend renders pinned and hot badges', () => {
  assert.match(skillsJs, /pinnedBadge:/);
  assert.match(skillsJs, /hotBadge:/);
  assert.match(skillsJs, /const isPinned = Number\(skill\.is_pinned \|\| 0\) === 1;/);
  assert.match(skillsJs, /const isHot = Number\(skill\.is_hot \|\| 0\) === 1;/);
  assert.match(skillsJs, /site-badge site-badge--pinned/);
  assert.match(skillsJs, /site-badge site-badge--hot/);
});
