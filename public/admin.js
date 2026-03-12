const loginCard = document.getElementById('loginCard');
const panelCard = document.getElementById('panelCard');
const loginForm = document.getElementById('loginForm');
const loginPasswordInput = document.getElementById('loginPasswordInput');
const loginMessage = document.getElementById('loginMessage');
const adminList = document.getElementById('adminList');
const listTitle = document.getElementById('listTitle');
const adminAddForm = document.getElementById('adminAddForm');
const adminMessage = document.getElementById('adminMessage');
const adminImportForm = document.getElementById('adminImportForm');
const importMessage = document.getElementById('importMessage');
const adminCategorySelect = document.getElementById('adminCategorySelect');
const adminLangZhBtn = document.getElementById('adminLangZhBtn');
const navSiteConfig = document.getElementById('navSiteConfig');
const navAutoCrawl = document.getElementById('navAutoCrawl');
const adminSearchInput = document.getElementById('adminSearchInput');
const adminSearchToolbar = document.getElementById('adminSearchToolbar');
const adminAddSection = document.getElementById('adminAddSection');
const adminVisitStatsSection = document.getElementById('adminVisitStatsSection');
const visitStatsMessage = document.getElementById('visitStatsMessage');
const visitStatsCards = document.getElementById('visitStatsCards');
const visitStatsPathList = document.getElementById('visitStatsPathList');
const visitStatsRecentList = document.getElementById('visitStatsRecentList');
const visitStatsRefreshBtn = document.getElementById('visitStatsRefreshBtn');
const adminSiteConfigSection = document.getElementById('adminSiteConfigSection');
const siteConfigForm = document.getElementById('siteConfigForm');
const siteConfigMessage = document.getElementById('siteConfigMessage');
const siteIconInput = document.getElementById('siteIconInput');
const siteIconFile = document.getElementById('siteIconFile');
const siteIconClearBtn = document.getElementById('siteIconClearBtn');
const siteIconPreview = document.getElementById('siteIconPreview');
const adminAutoCrawlSection = document.getElementById('adminAutoCrawlSection');
const autoCrawlStatus = document.getElementById('autoCrawlStatus');
const autoCrawlMessage = document.getElementById('autoCrawlMessage');
const autoCrawlEnableBtn = document.getElementById('autoCrawlEnableBtn');
const autoCrawlDisableBtn = document.getElementById('autoCrawlDisableBtn');
const autoCrawlRunBtn = document.getElementById('autoCrawlRunBtn');
const autoCrawlClearBtn = document.getElementById('autoCrawlClearBtn');
const adminImportSection = document.getElementById('adminImportSection');
const adminCategoryAddSection = document.getElementById('adminCategoryAddSection');
const adminCategoryListSection = document.getElementById('adminCategoryListSection');
const adminListSection = document.getElementById('adminListSection');
const categoryAddForm = document.getElementById('categoryAddForm');
const categoryMessage = document.getElementById('categoryMessage');
const categoryList = document.getElementById('categoryList');
const adminTutorialAddSection = document.getElementById('adminTutorialAddSection');
const adminTutorialListSection = document.getElementById('adminTutorialListSection');
const tutorialAddForm = document.getElementById('tutorialAddForm');
const tutorialMessage = document.getElementById('tutorialMessage');
const tutorialList = document.getElementById('tutorialList');
const tutorialContentInput = document.getElementById('tutorialContentInput');
const tutorialEditor = document.getElementById('tutorialEditor');
const tutorialByteCounter = document.getElementById('tutorialByteCounter');
const tutorialImageInput = document.getElementById('tutorialImageInput');
const insertTutorialImageBtn = document.getElementById('insertTutorialImageBtn');
const editorBoldBtn = document.getElementById('editorBoldBtn');
const editorH2Btn = document.getElementById('editorH2Btn');
const editorLinkBtn = document.getElementById('editorLinkBtn');
const editorToTopBtn = document.getElementById('editorToTopBtn');
const editorToBottomBtn = document.getElementById('editorToBottomBtn');
const adminPasswordSection = document.getElementById('adminPasswordSection');
const adminPasswordForm = document.getElementById('adminPasswordForm');
const passwordMessage = document.getElementById('passwordMessage');

const FIXED_CATEGORIES = [
  'AI 与大语言模型',
  '开发与编码',
  'DevOps 与云',
  '浏览器与网页自动化',
  '营销与销售',
  '生产力与工作流',
  '搜索与研究',
  '通信与社交',
  '媒体与内容',
  '金融与加密货币',
  '健康与健身',
  '安全与监控',
  '自动化与实用工具',
  '业务运营',
  '代理协调'
];

const CATEGORY_EN = {
  'AI 与大语言模型': 'AI & Large Language Models',
  '开发与编码': 'Development & Coding',
  'DevOps 与云': 'DevOps & Cloud',
  '浏览器与网页自动化': 'Browser & Web Automation',
  '营销与销售': 'Marketing & Sales',
  '生产力与工作流': 'Productivity & Workflows',
  '搜索与研究': 'Search & Research',
  '通信与社交': 'Communication & Social',
  '媒体与内容': 'Media & Content',
  '金融与加密货币': 'Finance & Crypto',
  '健康与健身': 'Health & Fitness',
  '安全与监控': 'Security & Monitoring',
  '自动化与实用工具': 'Automation & Utilities',
  '业务运营': 'Business Operations',
  '代理协调': 'Agent Orchestration'
};
const TUTORIAL_MAX_BYTES = 5000000;
const TUTORIAL_UPLOAD_CHUNK_SIZE = 100000;

const texts = {
  zh: {
    htmlLang: 'zh-CN',
    title: 'claw800 后台',
    loginTitle: '管理员登录',
    loginPasswordLabel: '密码',
    loginBtn: '登录',
    panelTitle: '审核后台',
    navHome: '前端首页',
    navVisitStats: '访问统计',
    navSiteConfig: '站点设置',
    navAutoCrawl: '自动抓取',
    navAdd: '手动新增',
    navImport: '批量导入',
    navCategoryList: '分类列表',
    navCategoryAdd: '新增分类',
    navTutorialList: '教程列表',
    navTutorialAdd: '新增教程',
    navPassword: '修改密码',
    navPending: '等待审核',
    navApproved: '已上线',
    logoutBtn: '退出',
    siteConfigTitle: '站点设置',
    siteTitleLabel: '网站名称',
    siteSubtitleZhLabel: '中文简介',
    siteSubtitleEnLabel: '英文简介',
    siteHtmlTitleZhLabel: '网站 title（中文）',
    siteHtmlTitleEnLabel: '网站 title（英文）',
    siteIconLabel: '网站 Icon（favicon）',
    siteFooterCopyrightZhLabel: '版权说明（中文）',
    siteFooterCopyrightEnLabel: '版权说明（英文）',
    siteFooterLinksLabel: '友情链接',
    siteFooterContactZhLabel: '联系客服（中文）',
    siteFooterContactEnLabel: '联系客服（英文）',
    siteConfigSaveBtn: '保存',
    siteConfigSaved: '已保存',
    siteConfigLoadFailed: '加载失败',
    siteConfigRouteMissing: '站点设置接口不存在（404）。请重启后端后再试。',
    autoCrawlTitle: '自动抓取',
    autoCrawlEnable: '开启',
    autoCrawlDisable: '关闭',
    autoCrawlRunNow: '立即抓取一次',
    autoCrawlClearPending: '清空自动抓取待审核',
    autoCrawlClearConfirm: '确定清空“自动抓取”来源的待审核列表吗？（会全部驳回）',
    autoCrawlCleared: (n) => `已清空自动抓取待审核：${n} 条`,
    autoCrawlEnabled: '已开启',
    autoCrawlDisabled: '已关闭',
    autoCrawlRunning: '抓取中...',
    autoCrawlLastRun: (t) => `上次抓取：${t}`,
    autoCrawlNever: '从未抓取',
    autoCrawlSaved: '设置已更新',
    autoCrawlRunDone: (ai, openclaw) => `本次新增待审核：AI 项目 ${ai} 条 + OpenClaw 项目 ${openclaw} 条`,
    autoCrawlRouteMissing: '自动抓取接口不存在（404）。请重启后端后再试。',
    searchPlaceholder: '搜索已上线网站（名称/网址/简介/分类）',
    searchBtn: '搜索',
    clearSearchBtn: '清空',
    adminAddTitle: '手动新增站点',
    adminLabelName: '网站名称',
    adminLabelUrl: '网站地址',
    adminLabelDesc: '简介',
    adminLabelCategory: '分类',
    adminLabelSort: '排序',
    adminLabelPinned: '置顶',
    adminLabelHot: '热门',
    adminAddBtn: '直接上线',
    importTitle: '批量导入（JSON）',
    importLabel: '粘贴 JSON 数组',
    importBtn: '批量导入并上线',
    categoriesAddTitle: '新增分类',
    categoriesListTitle: '分类列表',
    tutorialAddTitle: '新增教程',
    tutorialEditTitle: '编辑教程',
    tutorialListTitle: '教程列表',
    tutorialTitleLabel: '标题',
    tutorialContentLabel: '图文内容',
    tutorialByteCounter: (used) => `已用 ${used} / ${TUTORIAL_MAX_BYTES} 字节`,
    tutorialEditorPlaceholder: '可直接粘贴网页图文内容（支持图片）',
    editorBoldBtn: '加粗',
    editorH2Btn: '标题',
    editorLinkBtn: '链接',
    editorLinkPrompt: '请输入链接地址（https://）',
    tutorialInsertImageBtn: '上传图片并插入内容',
    tutorialImageNoFile: '请先选择一张图片',
    tutorialImageInserted: '图片已插入内容',
    tutorialImageTooLarge: '图片过大，请压缩后再上传（建议不超过 2MB）',
    tutorialNetworkError: '网络异常，请稍后重试',
    tutorialSubmitting: '发布中...',
    tutorialRouteMissing: '教程接口不存在（404）。请重启后端后再试。',
    tutorialAddBtn: '发布教程',
    tutorialUpdateBtn: '保存修改',
    tutorialCreated: '教程已发布',
    tutorialUpdated: '教程已更新',
    tutorialDeleted: '教程已删除',
    tutorialDeleteConfirm: '确定删除这个教程吗？',
    tutorialEditBtn: '编辑',
    tutorialDeleteBtn: '删除',
    tutorialTitleOnly: '标题',
    tutorialView: '查看',
    tutorialNoData: '暂无教程',
    passwordTitle: '修改后台密码',
    oldPasswordLabel: '当前密码',
    newPasswordLabel: '新密码',
    confirmPasswordLabel: '确认新密码',
    passwordSaveBtn: '保存新密码',
    passwordChanged: '密码已更新',
    passwordRouteMissing: '密码接口不存在（404）。请重启后端后再试。',
    visitStatsTitle: '访问统计',
    visitStatsRefreshBtn: '刷新',
    visitStatsLoading: '加载中...',
    visitStatsLoadFailed: '访问统计加载失败',
    visitStatsTodayBreakdownTitle: '今日页面访问',
    visitStatsRecentTitle: '最近 7 天',
    visitStatsAutoRefresh: '每 30 秒自动刷新一次',
    visitStatsTotalPv: '累计访问量',
    visitStatsTotalUv: '累计独立 IP',
    visitStatsTodayPv: '今日访问量',
    visitStatsTodayUv: '今日独立 IP',
    visitStatsPathPv: '访问量',
    visitStatsPathUv: '独立 IP',
    visitStatsNoData: '暂无访问数据',
    visitStatsPathHome: '首页',
    visitStatsPathTutorial: '教程页',
    categoryNameLabel: '分类名称',
    categorySortLabel: '排序',
    categoryEnabledLabel: '启用',
    categoryAddBtn: '新增分类',
    categorySaveBtn: '保存分类',
    categoryDeleteBtn: '删除分类',
    categoryDeleteConfirm: '确定删除这个分类吗？',
    categoryDeleted: '分类已删除',
    categorySiteCount: '收录网站数',
    enabledYes: '是',
    enabledNo: '否',
    pendingTitle: '待审核列表',
    approvedTitle: '已上线列表',
    empty: '暂无记录',
    category: '分类',
    source: '来源',
    submitter: '投稿人',
    unknown: '未分类',
    approve: '通过',
    reject: '驳回',
    edit: '编辑',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    sort: '排序',
    saveSort: '保存排序',
    rejectPrompt: '请输入驳回原因（可留空）',
    editNamePrompt: '编辑网站名称',
    editUrlPrompt: '编辑网站地址',
    editDescPrompt: '编辑简介',
    editCategoryPrompt: '编辑分类（可填写以下任一分类）',
    editSaved: '保存成功',
    siteDeleteConfirm: '确定删除这个网站收录吗？',
    siteDeleted: '已删除',
    sortSaved: '排序已更新',
    operationFailed: '操作失败',
    loginFailed: '登录失败',
    createFailed: '创建失败',
    createSuccess: '已新增并上线',
    importFailed: '导入失败',
    tutorialCreateFailed: '创建教程失败',
    passwordChangeFailed: '修改密码失败',
    importJsonError: 'JSON 格式错误，需要数组格式',
    importSuccess: (i, s) => `导入完成：新增 ${i} 条，跳过 ${s} 条`,
    sourceMap: {
      admin: '后台添加',
      user_submit: '用户投稿',
      seed_openclaw: 'OpenClaw 首批',
      admin_import: '后台导入',
      auto_crawl: '自动抓取',
      auto_crawl_ai: '自动抓取(AI项目)',
      auto_crawl_openclaw: '自动抓取(OpenClaw)'
    }
  },
  en: {
    htmlLang: 'en',
    title: 'claw800 Admin',
    loginTitle: 'Admin Login',
    loginPasswordLabel: 'Password',
    loginBtn: 'Login',
    panelTitle: 'Review Console',
    navHome: 'Frontend Home',
    navVisitStats: 'Visit Stats',
    navSiteConfig: 'Site Settings',
    navAutoCrawl: 'Auto Crawl',
    navAdd: 'Add Website',
    navImport: 'Bulk Import',
    navCategoryList: 'Category List',
    navCategoryAdd: 'Add Category',
    navTutorialList: 'Tutorials',
    navTutorialAdd: 'New Tutorial',
    navPassword: 'Change Password',
    navPending: 'Pending',
    navApproved: 'Approved',
    logoutBtn: 'Logout',
    siteConfigTitle: 'Site Settings',
    siteTitleLabel: 'Site Name',
    siteSubtitleZhLabel: 'Subtitle (ZH)',
    siteSubtitleEnLabel: 'Subtitle (EN)',
    siteHtmlTitleZhLabel: 'HTML Title (ZH)',
    siteHtmlTitleEnLabel: 'HTML Title (EN)',
    siteIconLabel: 'Site Icon (favicon)',
    siteFooterCopyrightZhLabel: 'Copyright (ZH)',
    siteFooterCopyrightEnLabel: 'Copyright (EN)',
    siteFooterLinksLabel: 'Links',
    siteFooterContactZhLabel: 'Contact (ZH)',
    siteFooterContactEnLabel: 'Contact (EN)',
    siteConfigSaveBtn: 'Save',
    siteConfigSaved: 'Saved.',
    siteConfigLoadFailed: 'Load failed.',
    siteConfigRouteMissing: 'Site settings API not found (404). Please restart backend and retry.',
    autoCrawlTitle: 'Auto Crawl',
    autoCrawlEnable: 'Enable',
    autoCrawlDisable: 'Disable',
    autoCrawlRunNow: 'Run Now',
    autoCrawlClearPending: 'Clear Auto Pending',
    autoCrawlClearConfirm: 'Clear all pending items from Auto Crawl? (They will be rejected)',
    autoCrawlCleared: (n) => `Cleared auto-crawl pending: ${n}`,
    autoCrawlEnabled: 'Enabled',
    autoCrawlDisabled: 'Disabled',
    autoCrawlRunning: 'Running...',
    autoCrawlLastRun: (t) => `Last run: ${t}`,
    autoCrawlNever: 'Never',
    autoCrawlSaved: 'Saved.',
    autoCrawlRunDone: (ai, openclaw) => `Added to pending: AI ${ai} + OpenClaw ${openclaw}`,
    autoCrawlRouteMissing: 'Auto crawl API not found (404). Please restart backend and retry.',
    searchPlaceholder: 'Search approved websites (name/URL/description/category)',
    searchBtn: 'Search',
    clearSearchBtn: 'Clear',
    adminAddTitle: 'Add Website Manually',
    adminLabelName: 'Website Name',
    adminLabelUrl: 'Website URL',
    adminLabelDesc: 'Description',
    adminLabelCategory: 'Category',
    adminLabelSort: 'Sort',
    adminLabelPinned: 'Pinned',
    adminLabelHot: 'Hot',
    adminAddBtn: 'Publish Now',
    importTitle: 'Bulk Import (JSON)',
    importLabel: 'Paste JSON Array',
    importBtn: 'Import and Publish',
    categoriesAddTitle: 'Add Category',
    categoriesListTitle: 'Category List',
    tutorialAddTitle: 'New Tutorial',
    tutorialEditTitle: 'Edit Tutorial',
    tutorialListTitle: 'Tutorial List',
    tutorialTitleLabel: 'Title',
    tutorialContentLabel: 'Content',
    tutorialByteCounter: (used) => `Bytes ${used} / ${TUTORIAL_MAX_BYTES}`,
    tutorialEditorPlaceholder: 'Paste rich web content here (images supported)',
    editorBoldBtn: 'Bold',
    editorH2Btn: 'Heading',
    editorLinkBtn: 'Link',
    editorLinkPrompt: 'Enter link URL (https://)',
    tutorialInsertImageBtn: 'Upload Image and Insert',
    tutorialImageNoFile: 'Please choose an image first.',
    tutorialImageInserted: 'Image inserted.',
    tutorialImageTooLarge: 'Image is too large. Please compress it first (recommended <= 2MB).',
    tutorialNetworkError: 'Network error. Please try again.',
    tutorialSubmitting: 'Publishing...',
    tutorialRouteMissing: 'Tutorial API not found (404). Please restart backend and retry.',
    tutorialAddBtn: 'Publish Tutorial',
    tutorialUpdateBtn: 'Save Changes',
    tutorialCreated: 'Tutorial published.',
    tutorialUpdated: 'Tutorial updated.',
    tutorialDeleted: 'Tutorial deleted.',
    tutorialDeleteConfirm: 'Delete this tutorial?',
    tutorialEditBtn: 'Edit',
    tutorialDeleteBtn: 'Delete',
    tutorialTitleOnly: 'Title',
    tutorialView: 'Open',
    tutorialNoData: 'No tutorials.',
    passwordTitle: 'Change Admin Password',
    oldPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm Password',
    passwordSaveBtn: 'Save Password',
    passwordChanged: 'Password updated.',
    passwordRouteMissing: 'Password API not found (404). Please restart backend and retry.',
    visitStatsTitle: 'Visit Stats',
    visitStatsRefreshBtn: 'Refresh',
    visitStatsLoading: 'Loading...',
    visitStatsLoadFailed: 'Failed to load visit stats.',
    visitStatsTodayBreakdownTitle: 'Today by Page',
    visitStatsRecentTitle: 'Last 7 Days',
    visitStatsAutoRefresh: 'Auto-refreshes every 30 seconds',
    visitStatsTotalPv: 'Total PV',
    visitStatsTotalUv: 'Total Unique IPs',
    visitStatsTodayPv: 'Today PV',
    visitStatsTodayUv: 'Today Unique IPs',
    visitStatsPathPv: 'PV',
    visitStatsPathUv: 'Unique IPs',
    visitStatsNoData: 'No visit data yet.',
    visitStatsPathHome: 'Homepage',
    visitStatsPathTutorial: 'Tutorial Page',
    categoryNameLabel: 'Category Name',
    categorySortLabel: 'Sort',
    categoryEnabledLabel: 'Enabled',
    categoryAddBtn: 'Add Category',
    categorySaveBtn: 'Save Category',
    categoryDeleteBtn: 'Delete',
    categoryDeleteConfirm: 'Delete this category?',
    categoryDeleted: 'Category deleted.',
    categorySiteCount: 'Website Count',
    enabledYes: 'Yes',
    enabledNo: 'No',
    pendingTitle: 'Pending Review',
    approvedTitle: 'Approved Websites',
    empty: 'No records.',
    category: 'Category',
    source: 'Source',
    submitter: 'Submitter',
    unknown: 'Uncategorized',
    approve: 'Approve',
    reject: 'Reject',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    sort: 'Sort',
    saveSort: 'Save Sort',
    rejectPrompt: 'Enter rejection reason (optional)',
    editNamePrompt: 'Edit website name',
    editUrlPrompt: 'Edit website URL',
    editDescPrompt: 'Edit description',
    editCategoryPrompt: 'Edit category (use one of the listed tags)',
    editSaved: 'Saved successfully.',
    siteDeleteConfirm: 'Delete this website entry?',
    siteDeleted: 'Deleted.',
    sortSaved: 'Sort updated.',
    operationFailed: 'Operation failed',
    loginFailed: 'Login failed',
    createFailed: 'Create failed',
    createSuccess: 'Website added and published.',
    importFailed: 'Import failed',
    tutorialCreateFailed: 'Failed to create tutorial.',
    passwordChangeFailed: 'Failed to change password.',
    importJsonError: 'Invalid JSON format. Expected an array.',
    importSuccess: (i, s) => `Import done: added ${i}, skipped ${s}`,
    sourceMap: {
      admin: 'Admin Added',
      user_submit: 'User Submission',
      seed_openclaw: 'OpenClaw Seed',
      admin_import: 'Admin Import',
      auto_crawl: 'Auto Crawl',
      auto_crawl_ai: 'Auto Crawl (AI)',
      auto_crawl_openclaw: 'Auto Crawl (OpenClaw)'
    }
  }
};

let currentStatus = 'pending';
let currentLang = 'zh';
let currentItems = [];
let currentQuery = '';
let currentView = 'pending';
let managedCategories = [];
let tutorialItems = [];
let editingTutorialId = null;
let editingSiteId = null;
let siteConfigCache = null;
let visitStatsCache = null;
let visitStatsTimer = null;

function t(key) {
  return texts[currentLang][key];
}

function showPanel() {
  loginCard.classList.add('hidden');
  panelCard.classList.remove('hidden');
  syncVisitStatsTimer();
}

function showLogin() {
  loginCard.classList.remove('hidden');
  panelCard.classList.add('hidden');
  syncVisitStatsTimer();
  focusLoginPassword();
}

function focusLoginPassword() {
  setTimeout(() => {
    loginPasswordInput?.focus();
    loginPasswordInput?.select();
  }, 0);
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ensureEditorFocus() {
  tutorialEditor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount > 0) return;
  const range = document.createRange();
  range.selectNodeContents(tutorialEditor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertHtmlAtCursor(html) {
  ensureEditorFocus();
  document.execCommand('insertHTML', false, html);
}

function syncTutorialContentInput() {
  tutorialContentInput.value = String(tutorialEditor.innerHTML || '').trim();
}

function getUtf8ByteLength(text) {
  return new TextEncoder().encode(String(text || '')).length;
}

function updateTutorialByteCounter() {
  const used = getUtf8ByteLength(tutorialContentInput.value || tutorialEditor.innerHTML || '');
  tutorialByteCounter.textContent = texts[currentLang].tutorialByteCounter(used);
  tutorialByteCounter.style.color = used > TUTORIAL_MAX_BYTES ? 'var(--danger)' : '';
}

function hasTutorialContent() {
  const text = String(tutorialEditor.textContent || '').trim();
  const hasImage = tutorialEditor.querySelector('img');
  return Boolean(text || hasImage);
}

function plainTextToHtml(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replaceAll('\n', '<br>')}</p>`)
    .join('');
}

function refreshTutorialEditorTitleAndButton() {
  const dict = texts[currentLang];
  document.getElementById('tutorialAddTitle').textContent = editingTutorialId ? dict.tutorialEditTitle : dict.tutorialAddTitle;
  document.getElementById('tutorialAddBtn').textContent = editingTutorialId ? dict.tutorialUpdateBtn : dict.tutorialAddBtn;
}

function getApiCandidates(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const list = [normalized];
  const pathName = window.location.pathname || '/';
  const slash = pathName.lastIndexOf('/');
  const base = slash >= 0 ? pathName.slice(0, slash + 1) : '/';
  if (base && base !== '/') {
    list.push(`${base.replace(/\/+$/, '')}${normalized}`);
  }
  if (normalized.startsWith('/api/')) {
    const noApi = normalized.replace(/^\/api/, '');
    list.push(noApi);
    if (base && base !== '/') {
      list.push(`${base.replace(/\/+$/, '')}${noApi}`);
    }
  }
  // Local fallback: when frontend is served by another local port/path,
  // retry direct Node backend endpoints on 3000.
  const isLocalHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '';
  if (isLocalHost) {
    list.push(`http://localhost:3000${normalized}`);
    list.push(`http://127.0.0.1:3000${normalized}`);
    if (normalized.startsWith('/api/')) {
      const noApi = normalized.replace(/^\/api/, '');
      list.push(`http://localhost:3000${noApi}`);
      list.push(`http://127.0.0.1:3000${noApi}`);
    }
  }
  return Array.from(new Set(list));
}

function categoryLabel(category) {
  if (!category) return t('unknown');
  return category;
}

function sourceLabel(source) {
  return texts[currentLang].sourceMap[source] || source;
}

function normalizeCategoryInput(raw) {
  const val = String(raw || '').trim();
  const enabled = managedCategories.filter((item) => item.is_enabled).map((item) => item.name);
  if (!val) return enabled[0] || 'AI 与大语言模型';
  if (enabled.includes(val)) return val;
  const found = Object.entries(CATEGORY_EN).find(([, en]) => en.toLowerCase() === val.toLowerCase());
  return found ? found[0] : val;
}

function localizeApiError(message) {
  if (currentLang !== 'en') return message;
  if (typeof message === 'string' && message.startsWith('该分类收录了')) {
    const m = message.match(/(\d+)/);
    const n = m ? m[1] : '';
    return `This category has ${n} website records and cannot be deleted.`;
  }
  const map = {
    Unauthorized: 'Unauthorized.',
    '密码错误': 'Incorrect password.',
    'name 和 url 必填': 'Name and URL are required.',
    'url 格式不正确': 'Invalid URL format.',
    'name 必填': 'Name is required.',
    'title 和 content 必填': 'Title and content are required.',
    '教程内容不能超过 5000000 字节': 'Tutorial content must not exceed 5000000 bytes.',
    上传会话不存在: 'Upload session not found.',
    '原密码错误': 'Current password is incorrect.',
    '新密码至少 6 位': 'New password must be at least 6 characters.',
    '两次输入的新密码不一致': 'New password and confirmation do not match.',
    '标签已存在': 'Category already exists.',
    '分类已存在': 'Category already exists.',
    '网站已存在': 'Website already exists.',
    '创建失败': 'Create failed.',
    '更新失败': 'Update failed.',
    'sortOrder 必须是数字': 'sortOrder must be a number.',
    '记录不存在': 'Record not found.',
    'JSON 格式错误，需要数组格式': 'Invalid JSON format. Expected an array.',
    '导入失败': 'Import failed.'
  };
  return map[message] || message;
}

function renderAdminCategoryOptions() {
  const enabled = managedCategories.filter((item) => item.is_enabled).map((item) => item.name);
  const categories = enabled.length ? enabled : FIXED_CATEGORIES;
  adminCategorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(categoryLabel(category))}</option>`)
    .join('');
}

function renderCategoryList() {
  if (!managedCategories.length) {
    categoryList.innerHTML = `<p class="empty">${escapeHtml(t('empty'))}</p>`;
    return;
  }

  categoryList.innerHTML = managedCategories
    .map(
      (item) => `
      <article class="review-card">
        <p class="small">${escapeHtml(t('categorySiteCount'))}：${Number(item.site_count || 0)}</p>
        <div class="toolbar sort-row">
          <label class="small">${escapeHtml(t('categoryNameLabel'))}
            <input id="catName-${item.id}" value="${escapeHtml(item.name)}" ${item.id < 0 ? 'disabled' : ''} />
          </label>
          <label class="small">${escapeHtml(t('categorySortLabel'))}
            <input id="catSort-${item.id}" type="number" value="${Number(item.sort_order || 0)}" ${item.id < 0 ? 'disabled' : ''} />
          </label>
          <label class="small">${escapeHtml(t('categoryEnabledLabel'))}
            <select id="catEnabled-${item.id}" ${item.id < 0 ? 'disabled' : ''}>
              <option value="1" ${item.is_enabled ? 'selected' : ''}>${escapeHtml(t('enabledYes'))}</option>
              <option value="0" ${item.is_enabled ? '' : 'selected'}>${escapeHtml(t('enabledNo'))}</option>
            </select>
          </label>
          ${
            item.id < 0
              ? `<span class="small">${escapeHtml('只读（重启后端后可编辑）')}</span>`
              : `<button type="button" onclick="saveCategoryConfig(${item.id})">${escapeHtml(t('categorySaveBtn'))}</button>
                 <button type="button" class="danger" onclick="deleteCategoryConfig(${item.id})">${escapeHtml(
                   t('categoryDeleteBtn')
                 )}</button>`
          }
        </div>
      </article>
    `
    )
    .join('');
}

function getEnabledCategoryNames() {
  if (managedCategories.length) {
    return managedCategories
      .filter((item) => item.is_enabled)
      .slice()
      .sort((a, b) => Number(b.sort_order || 0) - Number(a.sort_order || 0))
      .map((item) => item.name);
  }
  return FIXED_CATEGORIES.slice();
}

function renderCategoryOptions(selectedCategory) {
  let names = getEnabledCategoryNames();
  const selected = String(selectedCategory || '').trim();
  if (selected && !names.includes(selected)) names = [selected, ...names];
  return names
    .map((name) => {
      const selectedAttr = name === selected ? ' selected' : '';
      return `<option value="${escapeHtml(name)}"${selectedAttr}>${escapeHtml(categoryLabel(name))}</option>`;
    })
    .join('');
}

async function loadAdminCategories() {
  try {
    const res = await fetch('/api/admin/categories', { credentials: 'include' });
    if (res.status === 401) return;
    if (!res.ok) throw new Error('admin categories unavailable');
    const data = await res.json();
    managedCategories = data.items || [];
  } catch {
    // Fallback: if admin categories API is unavailable, still show current frontend categories.
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const data = await res.json();
    managedCategories = (data.items || []).map((item, idx) => ({
      id: -(idx + 1),
      name: item.category,
      sort_order: idx,
      is_enabled: 1,
      site_count: Number(item.count || 0)
    }));
  }

  renderAdminCategoryOptions();
  renderCategoryList();
}

function applyLanguage() {
  const dict = texts[currentLang];
  document.documentElement.lang = dict.htmlLang;
  document.title = dict.title;

  document.getElementById('loginTitle').textContent = dict.loginTitle;
  document.getElementById('loginPasswordLabel').childNodes[0].textContent = dict.loginPasswordLabel;
  document.getElementById('loginBtn').textContent = dict.loginBtn;
  document.getElementById('panelTitle').textContent = dict.panelTitle;
  document.getElementById('navHome').textContent = dict.navHome;
  document.getElementById('navVisitStats').textContent = dict.navVisitStats;
  document.getElementById('navSiteConfig').textContent = dict.navSiteConfig;
  document.getElementById('navAutoCrawl').textContent = dict.navAutoCrawl;
  document.getElementById('navAdd').textContent = dict.navAdd;
  document.getElementById('navImport').textContent = dict.navImport;
  document.getElementById('navCategoryList').textContent = dict.navCategoryList;
  document.getElementById('navCategoryAdd').textContent = dict.navCategoryAdd;
  document.getElementById('navTutorialList').textContent = dict.navTutorialList;
  document.getElementById('navTutorialAdd').textContent = dict.navTutorialAdd;
  document.getElementById('navPassword').textContent = dict.navPassword;
  document.getElementById('navPending').textContent = dict.navPending;
  document.getElementById('navApproved').textContent = dict.navApproved;
  document.getElementById('logoutBtn').textContent = dict.logoutBtn;
  adminSearchInput.placeholder = dict.searchPlaceholder;
  document.getElementById('adminSearchBtn').textContent = dict.searchBtn;
  document.getElementById('adminClearSearchBtn').textContent = dict.clearSearchBtn;
  document.getElementById('adminAddTitle').textContent = dict.adminAddTitle;
  document.getElementById('adminLabelName').childNodes[0].textContent = dict.adminLabelName;
  document.getElementById('adminLabelUrl').childNodes[0].textContent = dict.adminLabelUrl;
  document.getElementById('adminLabelDesc').childNodes[0].textContent = dict.adminLabelDesc;
  document.getElementById('adminLabelCategory').childNodes[0].textContent = dict.adminLabelCategory;
  document.getElementById('adminLabelSort').childNodes[0].textContent = dict.adminLabelSort;
  if (document.getElementById('adminLabelPinned')) {
    document.getElementById('adminLabelPinned').childNodes[0].textContent = dict.adminLabelPinned;
  }
  document.getElementById('adminLabelHot').childNodes[0].textContent = dict.adminLabelHot;
  document.getElementById('adminAddBtn').textContent = dict.adminAddBtn;
  document.getElementById('importTitle').textContent = dict.importTitle;
  document.getElementById('importLabel').childNodes[0].textContent = dict.importLabel;
  document.getElementById('importBtn').textContent = dict.importBtn;
  document.getElementById('siteConfigTitle').textContent = dict.siteConfigTitle;
  document.getElementById('siteTitleLabel').childNodes[0].textContent = dict.siteTitleLabel;
  document.getElementById('siteSubtitleZhLabel').childNodes[0].textContent = dict.siteSubtitleZhLabel;
  document.getElementById('siteSubtitleEnLabel').childNodes[0].textContent = dict.siteSubtitleEnLabel;
  document.getElementById('siteHtmlTitleZhLabel').childNodes[0].textContent = dict.siteHtmlTitleZhLabel;
  document.getElementById('siteHtmlTitleEnLabel').childNodes[0].textContent = dict.siteHtmlTitleEnLabel;
  document.getElementById('siteIconLabel').childNodes[0].textContent = dict.siteIconLabel;
  document.getElementById('siteFooterCopyrightZhLabel').childNodes[0].textContent = dict.siteFooterCopyrightZhLabel;
  document.getElementById('siteFooterCopyrightEnLabel').childNodes[0].textContent = dict.siteFooterCopyrightEnLabel;
  document.getElementById('siteFooterLinksLabel').childNodes[0].textContent = dict.siteFooterLinksLabel;
  document.getElementById('siteFooterContactZhLabel').childNodes[0].textContent = dict.siteFooterContactZhLabel;
  document.getElementById('siteFooterContactEnLabel').childNodes[0].textContent = dict.siteFooterContactEnLabel;
  document.getElementById('siteConfigSaveBtn').textContent = dict.siteConfigSaveBtn;
  document.getElementById('autoCrawlTitle').textContent = dict.autoCrawlTitle;
  autoCrawlEnableBtn.textContent = dict.autoCrawlEnable;
  autoCrawlDisableBtn.textContent = dict.autoCrawlDisable;
  autoCrawlRunBtn.textContent = dict.autoCrawlRunNow;
  autoCrawlClearBtn.textContent = dict.autoCrawlClearPending;
  document.getElementById('categoriesAddTitle').textContent = dict.categoriesAddTitle;
  document.getElementById('categoriesListTitle').textContent = dict.categoriesListTitle;
  refreshTutorialEditorTitleAndButton();
  document.getElementById('tutorialListTitle').textContent = dict.tutorialListTitle;
  document.getElementById('passwordTitle').textContent = dict.passwordTitle;
  document.getElementById('visitStatsTitle').textContent = dict.visitStatsTitle;
  document.getElementById('visitStatsRefreshBtn').textContent = dict.visitStatsRefreshBtn;
  document.getElementById('visitStatsTodayBreakdownTitle').textContent = dict.visitStatsTodayBreakdownTitle;
  document.getElementById('visitStatsRecentTitle').textContent = dict.visitStatsRecentTitle;
  document.getElementById('categoryNameLabel').childNodes[0].textContent = dict.categoryNameLabel;
  document.getElementById('categorySortLabel').childNodes[0].textContent = dict.categorySortLabel;
  document.getElementById('categoryEnabledLabel').childNodes[0].textContent = dict.categoryEnabledLabel;
  document.getElementById('categoryAddBtn').textContent = dict.categoryAddBtn;
  document.getElementById('tutorialTitleLabel').childNodes[0].textContent = dict.tutorialTitleLabel;
  document.getElementById('tutorialContentLabel').childNodes[0].textContent = dict.tutorialContentLabel;
  tutorialEditor.setAttribute('data-placeholder', dict.tutorialEditorPlaceholder);
  editorBoldBtn.textContent = dict.editorBoldBtn;
  editorH2Btn.textContent = dict.editorH2Btn;
  editorLinkBtn.textContent = dict.editorLinkBtn;
  document.getElementById('insertTutorialImageBtn').textContent = dict.tutorialInsertImageBtn;
  refreshTutorialEditorTitleAndButton();
  document.getElementById('oldPasswordLabel').childNodes[0].textContent = dict.oldPasswordLabel;
  document.getElementById('newPasswordLabel').childNodes[0].textContent = dict.newPasswordLabel;
  document.getElementById('confirmPasswordLabel').childNodes[0].textContent = dict.confirmPasswordLabel;
  document.getElementById('passwordSaveBtn').textContent = dict.passwordSaveBtn;
  updateTutorialByteCounter();
  const enabledSelect = document.querySelector('#categoryEnabledLabel select');
  if (enabledSelect) {
    enabledSelect.options[0].textContent = dict.enabledYes;
    enabledSelect.options[1].textContent = dict.enabledNo;
  }

  adminLangZhBtn.classList.add('active');

  renderAdminCategoryOptions();
  renderCategoryList();
  renderTutorialList([]);
  if (visitStatsCache) renderVisitStats(visitStatsCache);
  setView(currentView);
}

function setView(view) {
  currentView = view;
  adminAddSection.classList.toggle('hidden', view !== 'add');
  adminVisitStatsSection.classList.toggle('hidden', view !== 'visit-stats');
  adminSiteConfigSection.classList.toggle('hidden', view !== 'site-config');
  adminAutoCrawlSection.classList.toggle('hidden', view !== 'auto-crawl');
  adminImportSection.classList.toggle('hidden', view !== 'import');
  adminCategoryAddSection.classList.toggle('hidden', view !== 'category-add');
  adminCategoryListSection.classList.toggle('hidden', view !== 'category-list');
  adminTutorialAddSection.classList.toggle('hidden', view !== 'tutorial-add');
  adminTutorialListSection.classList.toggle('hidden', view !== 'tutorial-list');
  adminPasswordSection.classList.toggle('hidden', view !== 'password');
  adminListSection.classList.toggle('hidden', view !== 'pending' && view !== 'approved');
  adminSearchToolbar.classList.toggle('hidden', view !== 'approved');

  if (view === 'add' || view === 'category-add' || view === 'category-list') {
    loadAdminCategories();
  }
  if (view === 'site-config') {
    loadSiteConfig();
  }
  if (view === 'visit-stats') {
    loadVisitStats();
  }
  if (view === 'auto-crawl') {
    loadAutoCrawlStatus();
  }
  if (view === 'tutorial-list') {
    loadTutorialList();
  }

  if (view === 'pending') {
    currentQuery = '';
    adminSearchInput.value = '';
    loadList('pending');
  } else if (view === 'approved') {
    loadList('approved');
  }

  syncVisitStatsTimer();
}

function formatTime(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '';
  try {
    return new Date(n).toLocaleString();
  } catch {
    return String(n);
  }
}

function renderAutoCrawlStatusLine(data) {
  const parts = [];
  if (data.enabled) parts.push(t('autoCrawlEnabled'));
  else parts.push(t('autoCrawlDisabled'));
  if (data.running) parts.push(t('autoCrawlRunning'));

  const lastAi = data.lastRunMsAi ? formatTime(data.lastRunMsAi) : '';
  const lastOpenclaw = data.lastRunMsOpenclaw ? formatTime(data.lastRunMsOpenclaw) : '';
  parts.push(lastAi ? `AI: ${t('autoCrawlLastRun')(lastAi)}` : `AI: ${t('autoCrawlNever')}`);
  parts.push(lastOpenclaw ? `OpenClaw: ${t('autoCrawlLastRun')(lastOpenclaw)}` : `OpenClaw: ${t('autoCrawlNever')}`);

  const maxAi = Number.isFinite(Number(data.maxPerRunAi)) ? Number(data.maxPerRunAi) : 5;
  const maxOpenclaw = Number.isFinite(Number(data.maxPerRunOpenclaw)) ? Number(data.maxPerRunOpenclaw) : 5;
  parts.push(`max/run: AI ${maxAi} + OpenClaw ${maxOpenclaw}`);

  if (data.lastResult && typeof data.lastResult === 'object') {
    const aiAdded = Number(data.lastResult.ai?.added || 0);
    const aiErrors = Number(data.lastResult.ai?.errors || 0);
    const ocAdded = Number(data.lastResult.openclaw?.added || 0);
    const ocErrors = Number(data.lastResult.openclaw?.errors || 0);
    parts.push(`last added: AI ${aiAdded} / OpenClaw ${ocAdded}`);
    parts.push(`errors: AI ${aiErrors} / OpenClaw ${ocErrors}`);
  }

  autoCrawlStatus.textContent = parts.join(' | ');
}

function visitPathLabel(pathName) {
  if (pathName === '/' || pathName === '/index.html') return t('visitStatsPathHome');
  if (pathName === '/tutorial.html') return t('visitStatsPathTutorial');
  return String(pathName || '/');
}

function renderVisitStats(data) {
  visitStatsCache = data || null;
  if (!visitStatsCards || !visitStatsPathList || !visitStatsRecentList) return;

  const totals = data?.totals || {};
  const cards = [
    { label: t('visitStatsTotalPv'), value: Number(totals.totalPv || 0) },
    { label: t('visitStatsTotalUv'), value: Number(totals.totalUv || 0) },
    { label: t('visitStatsTodayPv'), value: Number(totals.todayPv || 0) },
    { label: t('visitStatsTodayUv'), value: Number(totals.todayUv || 0) }
  ];

  visitStatsCards.innerHTML = cards
    .map(
      (item) => `
        <article class="visit-stat-card">
          <div class="small">${escapeHtml(item.label)}</div>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join('');

  const todayByPath = Array.isArray(data?.todayByPath) ? data.todayByPath : [];
  if (!todayByPath.length) {
    visitStatsPathList.innerHTML = `<p class="empty">${escapeHtml(t('visitStatsNoData'))}</p>`;
  } else {
    visitStatsPathList.innerHTML = todayByPath
      .map(
        (item) => `
          <article class="review-card">
            <h3>${escapeHtml(visitPathLabel(item.path))}</h3>
            <p class="small">${escapeHtml(t('visitStatsPathPv'))}: ${escapeHtml(Number(item.pv || 0))}</p>
            <p class="small">${escapeHtml(t('visitStatsPathUv'))}: ${escapeHtml(Number(item.uv || 0))}</p>
          </article>
        `
      )
      .join('');
  }

  const recentDays = Array.isArray(data?.recentDays) ? data.recentDays : [];
  if (!recentDays.length) {
    visitStatsRecentList.innerHTML = `<p class="empty">${escapeHtml(t('visitStatsNoData'))}</p>`;
  } else {
    visitStatsRecentList.innerHTML = recentDays
      .map(
        (item) => `
          <article class="review-card">
            <h3>${escapeHtml(item.date || '')}</h3>
            <p class="small">${escapeHtml(t('visitStatsPathPv'))}: ${escapeHtml(Number(item.pv || 0))}</p>
            <p class="small">${escapeHtml(t('visitStatsPathUv'))}: ${escapeHtml(Number(item.uv || 0))}</p>
          </article>
        `
      )
      .join('');
  }
}

async function loadVisitStats() {
  if (!visitStatsMessage) return;
  visitStatsMessage.textContent = t('visitStatsLoading');
  visitStatsMessage.className = 'message';
  const result = await requestTutorialJson(['/api/admin/visit-stats']);
  if (!result.res) {
    visitStatsMessage.textContent = t('visitStatsLoadFailed');
    visitStatsMessage.className = 'message error';
    return;
  }
  if (result.res.status === 401) {
    showLogin();
    return;
  }
  if (!result.res.ok) {
    visitStatsMessage.textContent = localizeApiError(result.data?.error || t('visitStatsLoadFailed'));
    visitStatsMessage.className = 'message error';
    return;
  }
  renderVisitStats(result.data || {});
  visitStatsMessage.textContent = t('visitStatsAutoRefresh');
  visitStatsMessage.className = 'message success';
}

function syncVisitStatsTimer() {
  if (visitStatsTimer) {
    clearInterval(visitStatsTimer);
    visitStatsTimer = null;
  }
  if (currentView !== 'visit-stats') return;
  visitStatsTimer = setInterval(() => {
    if (currentView === 'visit-stats') loadVisitStats();
  }, 30000);
}

async function loadAutoCrawlStatus() {
  autoCrawlMessage.textContent = '';
  autoCrawlMessage.className = 'message';
  const result = await requestTutorialJson(['/api/admin/auto-crawl/status']);
  if (!result.res) {
    autoCrawlMessage.textContent = t('autoCrawlRouteMissing');
    autoCrawlMessage.className = 'message error';
    return;
  }
  if (result.res.status === 401) {
    showLogin();
    return;
  }
  if (!result.res.ok) {
    autoCrawlMessage.textContent = localizeApiError(result.data?.error || t('operationFailed'));
    autoCrawlMessage.className = 'message error';
    return;
  }
  renderAutoCrawlStatusLine(result.data || {});
}

function renderTutorialList(items) {
  tutorialItems = items;
  if (!items.length) {
    tutorialList.innerHTML = `<p class="empty">${escapeHtml(t('tutorialNoData'))}</p>`;
    return;
  }

  tutorialList.innerHTML = items
    .map((item) => {
      const createdAt = escapeHtml(String(item.created_at || '').replace('T', ' ').slice(0, 16));
      return `
        <article class="review-card">
          <h3>${escapeHtml(item.title || '')}</h3>
          <p class="small">${createdAt}</p>
          <div class="review-actions">
            <button type="button" onclick="editTutorial(${item.id})">${escapeHtml(t('tutorialEditBtn'))}</button>
            <button type="button" class="danger" onclick="deleteTutorial(${item.id})">${escapeHtml(
              t('tutorialDeleteBtn')
            )}</button>
            <a href="/tutorial.html?id=${encodeURIComponent(item.id)}" target="_blank" rel="noopener">${escapeHtml(
              t('tutorialView')
            )}</a>
          </div>
        </article>
      `;
    })
    .join('');
}

async function loadTutorialList() {
  const candidateUrls = [...getApiCandidates('/api/admin/tutorials'), ...getApiCandidates('/api/admin/tutorial')];
  let res = null;
  for (const url of candidateUrls) {
    let attempt;
    try {
      attempt = await fetch(url, { credentials: 'include' });
    } catch {
      continue;
    }
    if (attempt.status === 404) continue;
    res = attempt;
    break;
  }
  if (!res) {
    tutorialList.innerHTML = `<p class="empty">${escapeHtml(t('tutorialNoData'))}</p>`;
    return;
  }
  if (res.status === 401) {
    loginCard.classList.remove('hidden');
    panelCard.classList.add('hidden');
    focusLoginPassword();
    return;
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  renderTutorialList(items);
}

async function requestTutorialApi(pathCandidates, options = {}) {
  let lastRes = null;
  for (const path of pathCandidates) {
    const endpoints = getApiCandidates(path);
    for (const endpoint of endpoints) {
      let res;
      try {
        res = await fetch(endpoint, { credentials: 'include', ...options });
      } catch {
        continue;
      }
      if (res.status === 404) continue;
      lastRes = res;
      return res;
    }
  }
  return lastRes;
}

async function requestTutorialJson(pathCandidates, options = {}) {
  const res = await requestTutorialApi(pathCandidates, options);
  if (!res) return { res: null, data: null };
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { res, data };
}

function getSiteConfigControl(name) {
  if (!siteConfigForm || !siteConfigForm.elements) return null;
  return siteConfigForm.elements.namedItem(name);
}

function refreshSiteIconPreview() {
  if (!siteIconPreview || !siteIconInput) return;
  const icon = String(siteIconInput.value || '').trim();
  if (!icon) {
    siteIconPreview.classList.add('hidden');
    siteIconPreview.removeAttribute('src');
    return;
  }
  siteIconPreview.src = icon;
  siteIconPreview.classList.remove('hidden');
}

async function loadSiteConfig() {
  siteConfigMessage.textContent = '';
  siteConfigMessage.className = 'message';
  try {
    const result = await requestTutorialJson(['/api/admin/site-config', '/admin/site-config']);
    if (!result.res) {
      siteConfigMessage.textContent = t('siteConfigRouteMissing');
      siteConfigMessage.className = 'message error';
      return;
    }
    if (result.res.status === 401) {
      loginCard.classList.remove('hidden');
      panelCard.classList.add('hidden');
      focusLoginPassword();
      return;
    }
    if (!result.res.ok) {
      siteConfigMessage.textContent = localizeApiError(result.data?.error || t('siteConfigLoadFailed'));
      siteConfigMessage.className = 'message error';
      return;
    }
    siteConfigCache = result.data || {};
    if (siteConfigForm) {
      const titleEl = getSiteConfigControl('title');
      const zhEl = getSiteConfigControl('subtitleZh');
      const enEl = getSiteConfigControl('subtitleEn');
      const htmlTitleZhEl = getSiteConfigControl('htmlTitleZh');
      const htmlTitleEnEl = getSiteConfigControl('htmlTitleEn');
      const crZhEl = getSiteConfigControl('footerCopyrightZh');
      const crEnEl = getSiteConfigControl('footerCopyrightEn');
      const linksEl = getSiteConfigControl('footerLinksRaw');
      const contactZhEl = getSiteConfigControl('footerContactZh');
      const contactEnEl = getSiteConfigControl('footerContactEn');
      const iconEl = getSiteConfigControl('icon');
      if (titleEl) titleEl.value = String(siteConfigCache.title || '');
      if (zhEl) zhEl.value = String(siteConfigCache.subtitleZh || '');
      if (enEl) enEl.value = String(siteConfigCache.subtitleEn || '');
      if (htmlTitleZhEl) htmlTitleZhEl.value = String(siteConfigCache.htmlTitleZh || '');
      if (htmlTitleEnEl) htmlTitleEnEl.value = String(siteConfigCache.htmlTitleEn || '');
      if (iconEl) iconEl.value = String(siteConfigCache.icon || '');
      if (crZhEl) crZhEl.value = String(siteConfigCache.footerCopyrightZh || '');
      if (crEnEl) crEnEl.value = String(siteConfigCache.footerCopyrightEn || '');
      if (linksEl) linksEl.value = String(siteConfigCache.footerLinksRaw || '');
      if (contactZhEl) contactZhEl.value = String(siteConfigCache.footerContactZh || '');
      if (contactEnEl) contactEnEl.value = String(siteConfigCache.footerContactEn || '');
      refreshSiteIconPreview();
      setTimeout(() => titleEl?.focus?.(), 0);
    }
  } catch {
    siteConfigMessage.textContent = t('siteConfigLoadFailed');
    siteConfigMessage.className = 'message error';
  }
}

async function submitTutorialByChunks({ title, content, id }) {
  const init = await requestTutorialJson(['/api/admin/tutorial-upload/init', '/admin/tutorial-upload/init'], {
    method: 'POST'
  });
  if (!init.res) return { ok: false, error: t('tutorialRouteMissing') };
  if (!init.res.ok) return { ok: false, error: localizeApiError(init.data?.error || `HTTP ${init.res.status}`) };

  const uploadId = String(init.data?.uploadId || '');
  if (!uploadId) return { ok: false, error: t('operationFailed') };

  for (let i = 0; i < content.length; i += TUTORIAL_UPLOAD_CHUNK_SIZE) {
    const chunk = content.slice(i, i + TUTORIAL_UPLOAD_CHUNK_SIZE);
    const append = await requestTutorialJson(['/api/admin/tutorial-upload/append', '/admin/tutorial-upload/append'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, chunk })
    });
    if (!append.res) return { ok: false, error: t('tutorialRouteMissing') };
    if (!append.res.ok) return { ok: false, error: localizeApiError(append.data?.error || `HTTP ${append.res.status}`) };
  }

  const commit = await requestTutorialJson(['/api/admin/tutorial-upload/commit', '/admin/tutorial-upload/commit'], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId, title, id })
  });
  if (!commit.res) return { ok: false, error: t('tutorialRouteMissing') };
  if (!commit.res.ok) return { ok: false, error: localizeApiError(commit.data?.error || `HTTP ${commit.res.status}`) };
  return { ok: true, data: commit.data };
}

window.editTutorial = async function editTutorial(id) {
  const item = tutorialItems.find((x) => x.id === id);
  if (!item) {
    alert(t('operationFailed'));
    return;
  }
  editingTutorialId = id;
  tutorialAddForm.querySelector('input[name="title"]').value = item.title || '';
  tutorialEditor.innerHTML = item.content || '';
  syncTutorialContentInput();
  updateTutorialByteCounter();
  refreshTutorialEditorTitleAndButton();
  setView('tutorial-add');
};

window.deleteTutorial = async function deleteTutorial(id) {
  if (!confirm(t('tutorialDeleteConfirm'))) return;
  let res = await requestTutorialApi(
    [`/api/admin/tutorials/${id}`, `/api/admin/tutorial/${id}`, `/api/tutorials/${id}`, `/api/tutorial/${id}`],
    { method: 'DELETE' }
  );
  if (!res) {
    res = await requestTutorialApi(
      [
        `/api/admin/tutorials/${id}/delete`,
        `/api/admin/tutorial/${id}/delete`,
        `/admin/tutorials/${id}/delete`,
        `/admin/tutorial/${id}/delete`,
        `/api/tutorials/${id}/delete`,
        `/api/tutorial/${id}/delete`,
        `/tutorials/${id}/delete`,
        `/tutorial/${id}/delete`
      ],
      { method: 'POST' }
    );
  }
  if (!res) {
    alert(t('tutorialRouteMissing'));
    return;
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    alert(localizeApiError(data.error || t('operationFailed')));
    return;
  }
  alert(t('tutorialDeleted'));
  await loadTutorialList();
};

async function login(password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(localizeApiError(data.error || t('loginFailed')));
}

async function loadList(status = 'pending') {
  currentStatus = status;
  listTitle.textContent = status === 'pending' ? t('pendingTitle') : t('approvedTitle');

  const params = new URLSearchParams({ status });
  if (currentQuery) params.set('q', currentQuery);

  const res = await fetch(`/api/admin/sites?${params.toString()}`, { credentials: 'include' });
  if (res.status === 401) {
    showLogin();
    return;
  }
  // Auto-enter admin panel when cookie is already valid (e.g. after refresh).
  showPanel();

  const data = await res.json();
  let items = data.items;

  if (currentQuery) {
    const kw = currentQuery.toLowerCase();
    items = items.filter((site) => {
      const haystack = `${site.name} ${site.url} ${site.description || ''} ${site.category || ''}`.toLowerCase();
      return haystack.includes(kw);
    });
  }

  currentItems = items;

  if (!items.length) {
    adminList.innerHTML = `<p class="empty">${escapeHtml(t('empty'))}</p>`;
    return;
  }

  adminList.innerHTML = items
    .map(
      (site) => {
        const isEditing = status !== 'pending' && editingSiteId === site.id;
        return `
      <article class="review-card">
        ${
          isEditing
            ? `<h3>${escapeHtml(t('edit'))}</h3>`
            : `<h3>${escapeHtml(site.name)}</h3>`
        }
        ${
          isEditing
            ? `<div class="inline-edit-grid">
                <label class="small">${escapeHtml(texts[currentLang].adminLabelName)}
                  <input id="editName-${site.id}" type="text" value="${escapeHtml(site.name)}" />
                </label>
                <label class="small">${escapeHtml(texts[currentLang].adminLabelUrl)}
                  <input id="editUrl-${site.id}" type="text" value="${escapeHtml(site.url)}" />
                </label>
                <label class="small">${escapeHtml(texts[currentLang].adminLabelCategory)}
                  <select id="editCategory-${site.id}">
                    ${renderCategoryOptions(site.category)}
                  </select>
                </label>
                <label class="small">${escapeHtml(texts[currentLang].adminLabelPinned)}
                  <select id="editPinned-${site.id}">
                    <option value="0" ${site.is_pinned ? '' : 'selected'}>${escapeHtml(t('enabledNo'))}</option>
                    <option value="1" ${site.is_pinned ? 'selected' : ''}>${escapeHtml(t('enabledYes'))}</option>
                  </select>
                </label>
                <label class="small">${escapeHtml(texts[currentLang].adminLabelHot)}
                  <select id="editHot-${site.id}">
                    <option value="0" ${site.is_hot ? '' : 'selected'}>${escapeHtml(t('enabledNo'))}</option>
                    <option value="1" ${site.is_hot ? 'selected' : ''}>${escapeHtml(t('enabledYes'))}</option>
                  </select>
                </label>
                <label class="small">${escapeHtml(texts[currentLang].adminLabelDesc)}
                  <textarea id="editDesc-${site.id}" rows="3">${escapeHtml(site.description || '')}</textarea>
                </label>
              </div>`
            : `<p><a href="${escapeHtml(site.url)}" target="_blank" rel="noopener">${escapeHtml(site.url)}</a></p>
               <p>${escapeHtml(site.description || '')}</p>`
        }
        <p class="small">${escapeHtml(t('category'))}：${escapeHtml(categoryLabel(site.category))} | ${escapeHtml(
          t('source')
        )}：${escapeHtml(sourceLabel(site.source))}</p>
        ${
          status === 'pending'
            ? `<p class="small">${escapeHtml(t('submitter'))}：${escapeHtml(site.submitter_name || '-')} / ${escapeHtml(
                site.submitter_email || '-'
              )}</p>
               <div class="toolbar sort-row">
                <label class="small">${escapeHtml(t('sort'))}
                  <input id="pendingSortInput-${site.id}" type="number" value="${Number(site.sort_order || 0)}" />
                </label>
               </div>`
            : `<div class="toolbar sort-row">
                <label class="small">${escapeHtml(t('sort'))}
                  <input id="sortInput-${site.id}" type="number" value="${Number(site.sort_order || 0)}" />
                </label>
                <button type="button" onclick="saveSort(${site.id})">${escapeHtml(t('saveSort'))}</button>
              </div>`
        }
        ${
          status === 'pending'
            ? `<div class="review-actions">
                <button onclick="approveSite(${site.id})">${escapeHtml(t('approve'))}</button>
                <button class="danger" onclick="rejectSite(${site.id})">${escapeHtml(t('reject'))}</button>
              </div>`
            : isEditing
              ? `<div class="inline-edit-actions">
                  <button type="button" onclick="saveSiteEdit(${site.id})">${escapeHtml(t('save'))}</button>
                  <button type="button" onclick="cancelSiteEdit()">${escapeHtml(t('cancel'))}</button>
                  <button type="button" class="danger" onclick="deleteSite(${site.id})">${escapeHtml(t('delete'))}</button>
                </div>`
              : `<div class="review-actions">
                  <button type="button" onclick="editSite(${site.id})">${escapeHtml(t('edit'))}</button>
                </div>`
        }
      </article>
    `
      }
    )
    .join('');

  if (status !== 'pending' && editingSiteId) {
    setTimeout(() => {
      const el = document.getElementById(`editName-${editingSiteId}`);
      el?.focus();
      el?.select?.();
    }, 0);
  }
}

window.approveSite = async function approveSite(id) {
  const pendingSortInput = document.getElementById(`pendingSortInput-${id}`);
  const sortOrder = Number(pendingSortInput?.value);
  const payload = { sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 };
  const res = await fetch(`/api/admin/sites/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  if (!res.ok) {
    alert(t('operationFailed'));
    return;
  }
  loadList(currentStatus);
};

window.rejectSite = async function rejectSite(id) {
  const note = prompt(t('rejectPrompt')) || '';
  const res = await fetch(`/api/admin/sites/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
    credentials: 'include'
  });
  if (!res.ok) {
    alert(t('operationFailed'));
    return;
  }
  loadList(currentStatus);
};

window.editSite = async function editSite(id) {
  // Keep old onclick hook, but switch to inline edit mode (no prompt popup).
  try {
    if (!managedCategories.length) await loadAdminCategories();
  } catch {
    // ignore
  }
  editingSiteId = id;
  loadList(currentStatus);
};

window.cancelSiteEdit = function cancelSiteEdit() {
  editingSiteId = null;
  loadList(currentStatus);
};

window.saveSiteEdit = async function saveSiteEdit(id) {
  const site = currentItems.find((item) => item.id === id);
  if (!site) {
    alert(t('operationFailed'));
    return;
  }

  const name = String(document.getElementById(`editName-${id}`)?.value || '').trim();
  const url = String(document.getElementById(`editUrl-${id}`)?.value || '').trim();
  const category = String(document.getElementById(`editCategory-${id}`)?.value || '').trim();
  const description = String(document.getElementById(`editDesc-${id}`)?.value || '').trim();
  const isPinned = String(document.getElementById(`editPinned-${id}`)?.value || '0').trim();
  const isHot = String(document.getElementById(`editHot-${id}`)?.value || '0').trim();

  const sortInput = document.getElementById(`sortInput-${id}`);
  const sortOrder = Number.isFinite(Number(sortInput?.value))
    ? Number(sortInput.value)
    : Number.isFinite(Number(site.sort_order))
      ? Number(site.sort_order)
      : 0;

  if (!name || !url) {
    alert(localizeApiError('name 和 url 必填'));
    return;
  }

  const payload = {
    name,
    url,
    description,
    category: normalizeCategoryInput(category),
    sortOrder,
    isPinned,
    isHot
  };

  const putResult = await requestTutorialJson([`/api/admin/sites/${id}`, `/admin/sites/${id}`], {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const res = putResult.res;
  const data = putResult.data || {};

  if (!res || res.status === 404 || res.status === 405) {
    const postResult = await requestTutorialJson([`/api/admin/sites/${id}/update`, `/admin/sites/${id}/update`], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!postResult.res) {
      alert(t('operationFailed'));
      return;
    }
    if (!postResult.res.ok) {
      alert(localizeApiError(postResult.data?.error || t('operationFailed')));
      return;
    }
  } else if (!res.ok) {
    alert(localizeApiError(data.error || t('operationFailed')));
    return;
  }

  editingSiteId = null;
  loadList(currentStatus);
};

window.deleteSite = async function deleteSite(id) {
  if (!confirm(t('siteDeleteConfirm'))) return;

  let res = await requestTutorialApi([`/api/admin/sites/${id}`, `/admin/sites/${id}`], { method: 'DELETE' });
  if (!res) {
    res = await requestTutorialApi([`/api/admin/sites/${id}/delete`, `/admin/sites/${id}/delete`], { method: 'POST' });
  }
  if (!res) {
    alert(t('operationFailed'));
    return;
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    alert(localizeApiError(data.error || t('operationFailed')));
    return;
  }

  editingSiteId = null;
  alert(t('siteDeleted'));
  loadList(currentStatus);
};

window.saveSort = async function saveSort(id) {
  const input = document.getElementById(`sortInput-${id}`);
  const sortOrder = Number(input?.value);

  if (!Number.isFinite(sortOrder)) {
    alert(localizeApiError('sortOrder 必须是数字'));
    return;
  }

  const res = await fetch(`/api/admin/sites/${id}/sort`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sortOrder }),
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    alert(localizeApiError(data.error || t('operationFailed')));
    return;
  }

  loadList(currentStatus);
};

window.saveCategoryConfig = async function saveCategoryConfig(id) {
  const name = String(document.getElementById(`catName-${id}`)?.value || '').trim();
  const sortOrder = Number(document.getElementById(`catSort-${id}`)?.value || 0);
  const isEnabled = Number(document.getElementById(`catEnabled-${id}`)?.value || 0);

  const payload = { name, sortOrder, isEnabled };
  const put = await requestTutorialJson([`/api/admin/categories/${id}`], {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let res = put.res;
  let data = put.data || {};

  // Some servers/WAFs block PUT; retry with POST update endpoints to avoid accidental "create new".
  if (!res || res.status === 404 || res.status === 405) {
    const post = await requestTutorialJson([`/api/admin/categories/${id}/update`, `/api/admin/categories/${id}`], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    res = post.res;
    data = post.data || {};
  }

  if (!res) {
    alert(t('operationFailed'));
    return;
  }
  if (!res.ok) {
    alert(localizeApiError(data.error || t('operationFailed')));
    return;
  }

  await loadAdminCategories();
};

window.deleteCategoryConfig = async function deleteCategoryConfig(id) {
  const item = managedCategories.find((x) => x.id === id);
  const siteCount = Number(item?.site_count || 0);
  if (siteCount > 0) {
    alert(`该分类收录了 ${siteCount} 个网站，不允许删除`);
    return;
  }

  if (!confirm(t('categoryDeleteConfirm'))) return;

  const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', credentials: 'include' });
  const data = await res.json();
  if (!res.ok) {
    alert(localizeApiError(data.error || t('operationFailed')));
    return;
  }

  await loadAdminCategories();
  alert(t('categoryDeleted'));
};

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';
  const password = new FormData(loginForm).get('password');

  try {
    await login(password);
    showPanel();
    setView('pending');
  } catch (err) {
    loginMessage.textContent = err.message || t('loginFailed');
    loginMessage.className = 'message error';
  }
});

adminAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminMessage.textContent = '';

  const payload = Object.fromEntries(new FormData(adminAddForm).entries());
  const res = await fetch('/api/admin/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });

  const data = await res.json();

  if (!res.ok) {
    adminMessage.textContent = localizeApiError(data.error || t('createFailed'));
    adminMessage.className = 'message error';
    return;
  }

  adminMessage.textContent = t('createSuccess');
  adminMessage.className = 'message success';
  adminAddForm.reset();
  renderAdminCategoryOptions();
  loadList(currentStatus);
  // Default: not hot
  const hotEl = adminAddForm.querySelector('select[name="isHot"]');
  if (hotEl) hotEl.value = '0';
});

adminImportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  importMessage.textContent = '';

  const raw = new FormData(adminImportForm).get('json');
  let items;
  try {
    items = JSON.parse(String(raw || '[]'));
    if (!Array.isArray(items)) throw new Error();
  } catch {
    importMessage.textContent = t('importJsonError');
    importMessage.className = 'message error';
    return;
  }

  const res = await fetch('/api/admin/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    importMessage.textContent = localizeApiError(data.error || t('importFailed'));
    importMessage.className = 'message error';
    return;
  }

  importMessage.textContent = t('importSuccess')(data.imported, data.skipped);
  importMessage.className = 'message success';
  loadList(currentStatus);
});

categoryAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  categoryMessage.textContent = '';
  const payload = Object.fromEntries(new FormData(categoryAddForm).entries());

  const res = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) {
    categoryMessage.textContent = localizeApiError(data.error || t('createFailed'));
    categoryMessage.className = 'message error';
    return;
  }

  categoryMessage.textContent = t('createSuccess');
  categoryMessage.className = 'message success';
  categoryAddForm.reset();
  categoryAddForm.querySelector('input[name="sortOrder"]').value = '0';
  categoryAddForm.querySelector('select[name="isEnabled"]').value = '1';
  await loadAdminCategories();
});

editorBoldBtn.addEventListener('click', () => {
  ensureEditorFocus();
  document.execCommand('bold');
});

editorH2Btn.addEventListener('click', () => {
  ensureEditorFocus();
  document.execCommand('formatBlock', false, 'h2');
});

editorLinkBtn.addEventListener('click', () => {
  const url = prompt(t('editorLinkPrompt'), 'https://');
  if (!url) return;
  ensureEditorFocus();
  document.execCommand('createLink', false, url.trim());
});

editorToTopBtn.addEventListener('click', () => {
  tutorialEditor.scrollTo({ top: 0, behavior: 'smooth' });
});

editorToBottomBtn.addEventListener('click', () => {
  tutorialEditor.scrollTo({ top: tutorialEditor.scrollHeight, behavior: 'smooth' });
});

tutorialEditor.addEventListener('paste', async (e) => {
  const clipboard = e.clipboardData;
  if (!clipboard) return;

  const imageItems = Array.from(clipboard.items || []).filter(
    (item) => item.kind === 'file' && item.type.startsWith('image/')
  );
  if (imageItems.length) {
    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      if (file.size > 2 * 1024 * 1024) {
        tutorialMessage.textContent = t('tutorialImageTooLarge');
        tutorialMessage.className = 'message error';
        continue;
      }
      const src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }).catch(() => '');
      if (!src) continue;
      insertHtmlAtCursor(`<p><img src="${src}" alt="${escapeHtml(file.name || 'image')}" /></p>`);
    }
    syncTutorialContentInput();
    updateTutorialByteCounter();
    return;
  }

  const html = clipboard.getData('text/html');
  if (html) {
    e.preventDefault();
    insertHtmlAtCursor(html);
    syncTutorialContentInput();
    updateTutorialByteCounter();
    return;
  }

  const text = clipboard.getData('text/plain');
  if (text) {
    e.preventDefault();
    insertHtmlAtCursor(plainTextToHtml(text));
    syncTutorialContentInput();
    updateTutorialByteCounter();
  }
});

tutorialEditor.addEventListener('input', () => {
  syncTutorialContentInput();
  updateTutorialByteCounter();
});

insertTutorialImageBtn.addEventListener('click', () => {
  tutorialMessage.textContent = '';
  const file = tutorialImageInput.files?.[0];
  if (!file) {
    tutorialMessage.textContent = t('tutorialImageNoFile');
    tutorialMessage.className = 'message error';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    tutorialMessage.textContent = t('tutorialImageTooLarge');
    tutorialMessage.className = 'message error';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result || '');
    const snippet = `\n<p><img src="${src}" alt="${escapeHtml(file.name)}" /></p>\n`;
    insertHtmlAtCursor(snippet);
    syncTutorialContentInput();
    updateTutorialByteCounter();
    tutorialMessage.textContent = t('tutorialImageInserted');
    tutorialMessage.className = 'message success';
    tutorialImageInput.value = '';
  };
  reader.onerror = () => {
    tutorialMessage.textContent = t('tutorialNetworkError');
    tutorialMessage.className = 'message error';
  };
  reader.readAsDataURL(file);
});

tutorialAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  tutorialMessage.textContent = t('tutorialSubmitting');
  tutorialMessage.className = 'message';
  syncTutorialContentInput();
  updateTutorialByteCounter();
  if (!hasTutorialContent()) {
    tutorialMessage.textContent = localizeApiError('title 和 content 必填');
    tutorialMessage.className = 'message error';
    return;
  }
  const usedBytes = getUtf8ByteLength(tutorialContentInput.value || '');
  if (usedBytes > TUTORIAL_MAX_BYTES) {
    tutorialMessage.textContent = localizeApiError(`教程内容不能超过 ${TUTORIAL_MAX_BYTES} 字节`);
    tutorialMessage.className = 'message error';
    return;
  }
  const payload = Object.fromEntries(new FormData(tutorialAddForm).entries());
  const submitBtn = document.getElementById('tutorialAddBtn');

  try {
    submitBtn.disabled = true;
    const submitResult = await submitTutorialByChunks({
      title: String(payload.title || ''),
      content: String(payload.content || ''),
      id: editingTutorialId || null
    });
    if (!submitResult.ok) {
      tutorialMessage.textContent = submitResult.error || t('operationFailed');
      tutorialMessage.className = 'message error';
      return;
    }

    tutorialMessage.textContent = editingTutorialId ? t('tutorialUpdated') : t('tutorialCreated');
    tutorialMessage.className = 'message success';
    tutorialAddForm.reset();
    tutorialEditor.innerHTML = '';
    editingTutorialId = null;
    refreshTutorialEditorTitleAndButton();
    syncTutorialContentInput();
    updateTutorialByteCounter();
    loadTutorialList();
  } catch {
    tutorialMessage.textContent = t('tutorialNetworkError');
    tutorialMessage.className = 'message error';
  } finally {
    submitBtn.disabled = false;
  }
});

adminPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passwordMessage.textContent = '';
  const payload = Object.fromEntries(new FormData(adminPasswordForm).entries());
  try {
    const res = await requestTutorialApi(
      [
        '/api/admin/change-password',
        '/admin/change-password',
        '/api/change-password',
        '/change-password',
        '/api/admin/changePassword',
        '/api/admin/change-password/',
        '/admin/change-password/',
        '/api/change-password/',
        '/change-password/',
        '/api/admin/changePassword/'
      ],
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
      }
    );
    if (!res) {
      passwordMessage.textContent = t('passwordRouteMissing');
      passwordMessage.className = 'message error';
      return;
    }
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      passwordMessage.textContent = localizeApiError(data.error || t('passwordChangeFailed'));
      passwordMessage.className = 'message error';
      return;
    }

    passwordMessage.textContent = t('passwordChanged');
    passwordMessage.className = 'message success';
    adminPasswordForm.reset();
  } catch {
    passwordMessage.textContent = t('tutorialNetworkError');
    passwordMessage.className = 'message error';
  }
});

document.getElementById('adminSearchBtn').addEventListener('click', () => {
  currentQuery = adminSearchInput.value.trim();
  loadList('approved');
});

document.getElementById('adminClearSearchBtn').addEventListener('click', () => {
  adminSearchInput.value = '';
  currentQuery = '';
  loadList('approved');
});

adminSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    currentQuery = adminSearchInput.value.trim();
    loadList('approved');
  }
});

if (siteConfigForm) {
  siteConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    siteConfigMessage.textContent = '';
    siteConfigMessage.className = 'message';
    const payload = Object.fromEntries(new FormData(siteConfigForm).entries());
    const body = {
      title: String(payload.title || '').trim(),
      subtitleZh: String(payload.subtitleZh || '').trim(),
      subtitleEn: String(payload.subtitleEn || '').trim(),
      htmlTitleZh: String(payload.htmlTitleZh || '').trim(),
      htmlTitleEn: String(payload.htmlTitleEn || '').trim(),
      icon: String(payload.icon || '').trim(),
      footerCopyrightZh: String(payload.footerCopyrightZh || '').trim(),
      footerCopyrightEn: String(payload.footerCopyrightEn || '').trim(),
      footerLinksRaw: String(payload.footerLinksRaw || '').trim(),
      footerContactZh: String(payload.footerContactZh || '').trim(),
      footerContactEn: String(payload.footerContactEn || '').trim()
    };
    try {
      const result = await requestTutorialJson(['/api/admin/site-config', '/admin/site-config'], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!result.res) {
        siteConfigMessage.textContent = t('siteConfigRouteMissing');
        siteConfigMessage.className = 'message error';
        return;
      }
      if (!result.res.ok) {
        siteConfigMessage.textContent = localizeApiError(result.data?.error || t('operationFailed'));
        siteConfigMessage.className = 'message error';
        return;
      }
      siteConfigCache = body;
      siteConfigMessage.textContent = t('siteConfigSaved');
      siteConfigMessage.className = 'message success';
    } catch {
      siteConfigMessage.textContent = t('tutorialNetworkError');
      siteConfigMessage.className = 'message error';
    }
  });
}

document.getElementById('navAdd').addEventListener('click', () => setView('add'));
document.getElementById('navVisitStats').addEventListener('click', () => setView('visit-stats'));
document.getElementById('navSiteConfig').addEventListener('click', () => setView('site-config'));
document.getElementById('navAutoCrawl').addEventListener('click', () => setView('auto-crawl'));
document.getElementById('navImport').addEventListener('click', () => setView('import'));
document.getElementById('navCategoryList').addEventListener('click', () => setView('category-list'));
document.getElementById('navCategoryAdd').addEventListener('click', () => setView('category-add'));
document.getElementById('navTutorialList').addEventListener('click', () => setView('tutorial-list'));
document.getElementById('navTutorialAdd').addEventListener('click', () => {
  editingTutorialId = null;
  tutorialAddForm.reset();
  tutorialEditor.innerHTML = '';
  syncTutorialContentInput();
  updateTutorialByteCounter();
  refreshTutorialEditorTitleAndButton();
  setView('tutorial-add');
});
document.getElementById('navPassword').addEventListener('click', () => setView('password'));
document.getElementById('navPending').addEventListener('click', () => setView('pending'));
document.getElementById('navApproved').addEventListener('click', () => setView('approved'));
if (visitStatsRefreshBtn) {
  visitStatsRefreshBtn.addEventListener('click', () => loadVisitStats());
}
document.getElementById('navHome').addEventListener('click', () => {
  window.open('/', '_blank', 'noopener');
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
  showLogin();
});

if (siteIconInput) {
  siteIconInput.addEventListener('input', () => refreshSiteIconPreview());
}

if (siteIconClearBtn && siteIconInput && siteIconFile) {
  siteIconClearBtn.addEventListener('click', () => {
    siteIconInput.value = '';
    siteIconFile.value = '';
    refreshSiteIconPreview();
  });
}

if (siteIconFile && siteIconInput) {
  siteIconFile.addEventListener('change', () => {
    const file = siteIconFile.files?.[0];
    if (!file) return;
    // Keep icon small: favicon shouldn't be huge.
    if (file.size > 200 * 1024) {
      alert('icon 太大（最大 200KB）');
      siteIconFile.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '').trim();
      siteIconInput.value = src;
      refreshSiteIconPreview();
    };
    reader.onerror = () => {
      alert(t('tutorialNetworkError'));
    };
    reader.readAsDataURL(file);
  });
}

autoCrawlEnableBtn.addEventListener('click', async () => {
  autoCrawlMessage.textContent = '';
  autoCrawlMessage.className = 'message';
  const result = await requestTutorialJson(['/api/admin/auto-crawl/enable'], { method: 'POST' });
  if (!result.res) {
    autoCrawlMessage.textContent = t('autoCrawlRouteMissing');
    autoCrawlMessage.className = 'message error';
    return;
  }
  if (result.res.status === 401) {
    showLogin();
    return;
  }
  if (!result.res.ok) {
    autoCrawlMessage.textContent = localizeApiError(result.data?.error || t('operationFailed'));
    autoCrawlMessage.className = 'message error';
    return;
  }
  autoCrawlMessage.textContent = t('autoCrawlSaved');
  autoCrawlMessage.className = 'message success';
  loadAutoCrawlStatus();
});

autoCrawlDisableBtn.addEventListener('click', async () => {
  autoCrawlMessage.textContent = '';
  autoCrawlMessage.className = 'message';
  const result = await requestTutorialJson(['/api/admin/auto-crawl/disable'], { method: 'POST' });
  if (!result.res) {
    autoCrawlMessage.textContent = t('autoCrawlRouteMissing');
    autoCrawlMessage.className = 'message error';
    return;
  }
  if (result.res.status === 401) {
    showLogin();
    return;
  }
  if (!result.res.ok) {
    autoCrawlMessage.textContent = localizeApiError(result.data?.error || t('operationFailed'));
    autoCrawlMessage.className = 'message error';
    return;
  }
  autoCrawlMessage.textContent = t('autoCrawlSaved');
  autoCrawlMessage.className = 'message success';
  loadAutoCrawlStatus();
});

autoCrawlRunBtn.addEventListener('click', async () => {
  autoCrawlMessage.textContent = t('autoCrawlRunning');
  autoCrawlMessage.className = 'message';
  const result = await requestTutorialJson(['/api/admin/auto-crawl/run-now'], { method: 'POST' });
  if (!result.res) {
    autoCrawlMessage.textContent = t('autoCrawlRouteMissing');
    autoCrawlMessage.className = 'message error';
    return;
  }
  if (result.res.status === 401) {
    showLogin();
    return;
  }
  if (!result.res.ok) {
    autoCrawlMessage.textContent = localizeApiError(result.data?.error || t('operationFailed'));
    autoCrawlMessage.className = 'message error';
    return;
  }
  const ai = Number(result.data?.ai?.added || 0);
  const openclaw = Number(result.data?.openclaw?.added || 0);
  autoCrawlMessage.textContent = t('autoCrawlRunDone')(ai, openclaw);
  autoCrawlMessage.className = 'message success';
  loadAutoCrawlStatus();
});

autoCrawlClearBtn.addEventListener('click', async () => {
  if (!confirm(t('autoCrawlClearConfirm'))) return;
  autoCrawlMessage.textContent = '';
  autoCrawlMessage.className = 'message';
  const result = await requestTutorialJson(['/api/admin/auto-crawl/clear-pending'], { method: 'POST' });
  if (!result.res) {
    autoCrawlMessage.textContent = t('autoCrawlRouteMissing');
    autoCrawlMessage.className = 'message error';
    return;
  }
  if (result.res.status === 401) {
    showLogin();
    return;
  }
  if (!result.res.ok) {
    autoCrawlMessage.textContent = localizeApiError(result.data?.error || t('operationFailed'));
    autoCrawlMessage.className = 'message error';
    return;
  }
  const n = Number(result.data?.cleared || 0);
  autoCrawlMessage.textContent = t('autoCrawlCleared')(n);
  autoCrawlMessage.className = 'message success';
  loadAutoCrawlStatus();
  // If admin is currently on pending list, refresh it.
  if (currentView === 'pending') loadList('pending');
});

adminLangZhBtn.addEventListener('click', () => {
  currentLang = 'zh';
  applyLanguage();
});

applyLanguage();
syncTutorialContentInput();
updateTutorialByteCounter();
focusLoginPassword();
