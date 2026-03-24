# 最萌补光灯 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在游戏大全中新增一个可爱的手机补光工具“最萌补光灯”，提供整屏补光、预设色卡、左右滑动切色以及色相/饱和度/亮度调节。

**Architecture:** 新工具作为独立页面 `public/beauty-light/` 接入，保持和现有独立工具页一致的静态页面结构。页面本身用原生 HTML/CSS/JS 实现，状态全部保存在前端，依赖 `public/games-config.js` 提供入口卡，并用现有页面测试模式补静态回归。

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node test runner

---

## 文件结构

### 新增文件

- `public/beauty-light/index.html`
  - 最萌补光灯独立页面结构
- `public/beauty-light/style.css`
  - 页面视觉与移动端适配样式
- `public/beauty-light/script.js`
  - 颜色状态、滑动切色、滑条调节逻辑
- `tests/beauty-light-page.test.js`
  - 页面静态结构与关键文案/控件测试

### 修改文件

- `public/games-config.js`
  - 为游戏大全新增 `最萌补光灯` 工具入口
- `public/games.html`
  - 如有必要，确认新卡片能按现有渲染逻辑展示

---

## Chunk 1: 入口接入与页面骨架

### Task 1: 新增游戏大全入口

**Files:**
- Modify: `public/games-config.js`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写一个失败的测试，要求游戏大全配置里存在 `最萌补光灯`**

```js
test('games config exposes cutie fill light entry', async () => {
  const source = await fs.readFile('public/games-config.js', 'utf8');
  assert.match(source, /最萌补光灯/);
  assert.match(source, /beauty-light/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL，提示缺少 `最萌补光灯` 或 `beauty-light`

- [ ] **Step 3: 在 `public/games-config.js` 增加工具卡配置**

```js
{
  slug: 'beauty-light',
  name: '最萌补光灯',
  path: '/beauty-light/',
  is_enabled: true
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add public/games-config.js tests/beauty-light-page.test.js
git commit -m "feat: add cutie fill light game entry"
```

### Task 2: 创建补光工具页面骨架

**Files:**
- Create: `public/beauty-light/index.html`
- Create: `public/beauty-light/style.css`
- Create: `public/beauty-light/script.js`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写失败测试，断言页面结构存在**

```js
test('beauty light page includes core layout', async () => {
  const html = await fs.readFile('public/beauty-light/index.html', 'utf8');
  assert.match(html, /最萌补光灯/);
  assert.match(html, /左右滑动切换颜色/);
  assert.match(html, /少女粉/);
  assert.match(html, /饱和度/);
  assert.match(html, /屏幕亮度/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL，提示页面文件不存在

- [ ] **Step 3: 写最小页面骨架**

页面至少包括：

- 顶部标题栏
- 大面积补光区
- 底部控制面板
- 8 个预设卡占位
- 色相滑条
- 饱和度和亮度滑条
- “左右滑动切换颜色”提示

- [ ] **Step 4: 再次运行测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add public/beauty-light/index.html public/beauty-light/style.css public/beauty-light/script.js tests/beauty-light-page.test.js
git commit -m "feat: scaffold cutie fill light page"
```

---

## Chunk 2: 可爱视觉与移动端适配

### Task 3: 实现甜妹粉光版视觉

**Files:**
- Modify: `public/beauty-light/style.css`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写失败测试，断言样式中存在关键视觉变量**

```js
test('beauty light stylesheet defines cute visual tokens', async () => {
  const css = await fs.readFile('public/beauty-light/style.css', 'utf8');
  assert.match(css, /--panel-bg/);
  assert.match(css, /--default-light-color/);
  assert.match(css, /env\\(safe-area-inset-top\\)/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL

- [ ] **Step 3: 实现主要视觉**

CSS 要覆盖：

- 柔粉默认背景
- 深色大圆角底部面板
- 大圆角预设卡
- 胶囊装饰按钮
- 半透明小相机装饰按钮
- 柔和阴影和渐变

- [ ] **Step 4: 加入移动端断点**

至少处理：

- `360px` 宽安卓机
- `390px` 左右 iPhone 宽度
- `430px` 左右大屏手机

要求：

- 预设卡始终两行四列
- 面板不遮挡滑条
- 顶部和底部安全区正确

- [ ] **Step 5: 跑测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add public/beauty-light/style.css tests/beauty-light-page.test.js
git commit -m "feat: add cute mobile visual design for beauty light"
```

---

## Chunk 3: 颜色状态与交互

### Task 4: 实现预设颜色与主屏补光切换

**Files:**
- Modify: `public/beauty-light/script.js`
- Modify: `public/beauty-light/index.html`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写失败测试，断言脚本包含预设颜色数据**

```js
test('beauty light script contains preset color definitions', async () => {
  const js = await fs.readFile('public/beauty-light/script.js', 'utf8');
  assert.match(js, /少女粉/);
  assert.match(js, /冷白皮/);
  assert.match(js, /落日灯/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL

- [ ] **Step 3: 实现预设颜色状态**

脚本至少包含：

- 预设数组
- 当前预设索引
- 当前亮度/饱和度状态
- 将当前颜色同步到页面背景的函数
- 卡片选中态更新函数

- [ ] **Step 4: 实现点击色卡切换**

点击任意预设卡时：

- 更新当前预设
- 更新页面补光背景
- 更新色卡高亮

- [ ] **Step 5: 跑测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add public/beauty-light/index.html public/beauty-light/script.js tests/beauty-light-page.test.js
git commit -m "feat: add preset light color switching"
```

### Task 5: 实现左右滑动切色

**Files:**
- Modify: `public/beauty-light/script.js`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写失败测试，断言脚本包含触摸滑动处理**

```js
test('beauty light script supports swipe color switching', async () => {
  const js = await fs.readFile('public/beauty-light/script.js', 'utf8');
  assert.match(js, /touchstart/);
  assert.match(js, /touchmove|touchend/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL

- [ ] **Step 3: 实现左右滑动切换当前预设**

逻辑要求：

- 只在补光主区域响应
- 左滑进入下一个预设
- 右滑进入上一个预设
- 索引支持循环

- [ ] **Step 4: 跑测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add public/beauty-light/script.js tests/beauty-light-page.test.js
git commit -m "feat: add swipe gesture for light color switching"
```

### Task 6: 实现色相、饱和度、亮度调节

**Files:**
- Modify: `public/beauty-light/index.html`
- Modify: `public/beauty-light/script.js`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写失败测试，断言页面和脚本包含三个调节项**

```js
test('beauty light page exposes hue saturation and brightness controls', async () => {
  const html = await fs.readFile('public/beauty-light/index.html', 'utf8');
  const js = await fs.readFile('public/beauty-light/script.js', 'utf8');
  assert.match(html, /色相|hue/);
  assert.match(html, /饱和度/);
  assert.match(html, /屏幕亮度/);
  assert.match(js, /saturation/);
  assert.match(js, /brightness/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL

- [ ] **Step 3: 实现滑条联动**

要求：

- 色相滑条更新当前颜色
- 饱和度滑条改变颜色鲜明度
- 亮度滑条通过页面覆盖层或颜色计算模拟补光强弱
- 百分比显示实时刷新

- [ ] **Step 4: 跑测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add public/beauty-light/index.html public/beauty-light/script.js tests/beauty-light-page.test.js
git commit -m "feat: add hue saturation and brightness controls"
```

---

## Chunk 4: 打磨与验证

### Task 7: 增加空状态提示与可爱文案

**Files:**
- Modify: `public/beauty-light/index.html`
- Modify: `public/beauty-light/style.css`
- Test: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 写失败测试，断言存在提示文案**

```js
test('beauty light page includes swipe helper text', async () => {
  const html = await fs.readFile('public/beauty-light/index.html', 'utf8');
  assert.match(html, /左右滑动切换颜色/);
  assert.match(html, /最萌补光灯/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tests/beauty-light-page.test.js`
Expected: FAIL

- [ ] **Step 3: 完善微文案和提示气泡样式**

包括：

- 页面标题
- 副标题
- 底部提示泡泡
- 选中色卡视觉反馈

- [ ] **Step 4: 跑测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add public/beauty-light/index.html public/beauty-light/style.css tests/beauty-light-page.test.js
git commit -m "feat: polish cutie fill light copy and helper UI"
```

### Task 8: 完整回归验证

**Files:**
- Verify: `public/games-config.js`
- Verify: `public/beauty-light/index.html`
- Verify: `public/beauty-light/style.css`
- Verify: `public/beauty-light/script.js`
- Verify: `tests/beauty-light-page.test.js`

- [ ] **Step 1: 运行页面测试**

Run: `node --test tests/beauty-light-page.test.js`
Expected: PASS

- [ ] **Step 2: 运行脚本语法检查**

Run: `node --check public/beauty-light/script.js`
Expected: 无报错

- [ ] **Step 3: 运行 HTML/CSS 关联回归**

Run: `node --test tests/xiangqi-page.test.js`
Expected: PASS，确认新增工具没有影响现有页面测试模式

- [ ] **Step 4: 检查游戏大全入口配置**

Run: `rg -n "最萌补光灯|beauty-light" public/games-config.js public/beauty-light/index.html`
Expected: 能看到入口配置和页面标题

- [ ] **Step 5: 提交最终实现**

```bash
git add public/games-config.js public/beauty-light/index.html public/beauty-light/style.css public/beauty-light/script.js tests/beauty-light-page.test.js
git commit -m "feat: add cutie fill light tool page"
```
