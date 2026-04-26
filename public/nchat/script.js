(function createNchatModule(globalScope) {
  const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
  const NCHAT_SESSION_STORAGE_KEY = 'claw800:nchat:nexa-session';
  const NCHAT_LOCAL_PROFILE_ID_STORAGE_KEY = 'claw800:nchat:local-profile-id';
  const NCHAT_LOCAL_PROFILE_STORAGE_KEY = 'claw800:nchat:local-profile';
  const NCHAT_LOCAL_DEMO_MESSAGES_STORAGE_KEY = 'claw800:nchat:local-demo-messages';
  const NEXA_PUBLIC_CONFIG_ENDPOINT = '/api/nexa/public-config';
  const NCHAT_GUARD_TEXT = '请在 Nexa App 内打开 Nchat';
  const NCHAT_DEMO_CONVERSATION_ID = 'demo-support';
  let cachedPublicConfig = null;

  function createDemoSupportConversation() {
    return {
      id: NCHAT_DEMO_CONVERSATION_ID,
      chatId: '80000001',
      nickname: '我的客服',
      avatarUrl:
        'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22112%22 height=%22112%22 viewBox=%220 0 112 112%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 stop-color=%22%235f87ff%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%232b3eff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22112%22 height=%22112%22 rx=%2256%22 fill=%22url(%23g)%22/%3E%3Ccircle cx=%2256%22 cy=%2241%22 r=%2219%22 fill=%22white%22 fill-opacity=%220.95%22/%3E%3Cpath d=%22M29 87c4-15 17-24 27-24s23 9 27 24%22 fill=%22white%22 fill-opacity=%220.95%22/%3E%3C/svg%3E',
      lastMessagePreview: '您好，这里是我的客服，有问题随时留言。',
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: 1
    };
  }

  function createDemoSupportMessages() {
    const localMessages = loadLocalDemoMessages();
    if (localMessages?.length) return localMessages;
    return [
      {
        id: 'demo-support-1',
        conversationId: NCHAT_DEMO_CONVERSATION_ID,
        content: '您好，这里是我的客服，有问题随时留言。',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isSelf: false
      },
      {
        id: 'demo-support-2',
        conversationId: NCHAT_DEMO_CONVERSATION_ID,
        content: '这条是演示消息，后面接入真实好友后会自动替换。',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        isSelf: false
      }
    ];
  }

  function shouldShowDemoSupport(state) {
    return isLocalPreview() && Array.isArray(state.conversations) && state.conversations.length === 0;
  }

  function getDisplayConversations(state) {
    if (!shouldShowDemoSupport(state)) {
      return Array.isArray(state.conversations) ? state.conversations : [];
    }
    return [createDemoSupportConversation()];
  }

  function getStorage() {
    try {
      return globalScope.localStorage || globalScope.sessionStorage || null;
    } catch {
      return null;
    }
  }

  function isLocalPreview() {
    const host = String(globalScope.location?.hostname || '').toLowerCase();
    return host === '127.0.0.1' || host === 'localhost';
  }

  function isNexaAppEnvironment() {
    if (isLocalPreview()) return true;
    return true;
  }

  function loadCachedSession(storage = getStorage()) {
    try {
      const raw = storage?.getItem?.(NCHAT_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.openId || !parsed?.sessionKey) return null;
      return {
        openId: String(parsed.openId || '').trim(),
        sessionKey: String(parsed.sessionKey || '').trim(),
        nickname: String(parsed.nickname || '').trim(),
        avatar: String(parsed.avatar || '').trim(),
        savedAt: Number(parsed.savedAt || 0) || Date.now()
      };
    } catch {
      return null;
    }
  }

  function saveCachedSession(storage = getStorage(), session = {}) {
    const normalized = {
      openId: String(session.openId || '').trim(),
      sessionKey: String(session.sessionKey || '').trim(),
      nickname: String(session.nickname || '').trim(),
      avatar: String(session.avatar || '').trim(),
      savedAt: Number(session.savedAt || 0) || Date.now()
    };
    if (!normalized.openId || !normalized.sessionKey) return;
    try {
      storage?.setItem?.(NCHAT_SESSION_STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  }

  function clearCachedSession(storage = getStorage()) {
    try {
      storage?.removeItem?.(NCHAT_SESSION_STORAGE_KEY);
    } catch {}
  }

  async function clearServerSession() {
    try {
      await requestJson('/api/nchat/session/logout', {
        method: 'POST'
      });
    } catch {}
  }

  function getDefaultAvatarDataUrl() {
    return 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22 viewBox=%220 0 72 72%22%3E%3Crect width=%2272%22 height=%2272%22 rx=%2236%22 fill=%22%235f87ff%22/%3E%3Ctext x=%2236%22 y=%2243%22 text-anchor=%22middle%22 font-size=%2232%22 fill=%22white%22 font-family=%22Arial%22%3EN%3C/text%3E%3C/svg%3E';
  }

  function loadLocalPreviewProfile(storage = getStorage()) {
    try {
      const raw = String(storage?.getItem?.(NCHAT_LOCAL_PROFILE_STORAGE_KEY) || '').trim();
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        nickname: String(parsed.nickname || '').trim(),
        avatarUrl: String(parsed.avatarUrl || '').trim()
      };
    } catch {
      return null;
    }
  }

  function saveLocalPreviewProfile(storage = getStorage(), profile = {}) {
    try {
      storage?.setItem?.(
        NCHAT_LOCAL_PROFILE_STORAGE_KEY,
        JSON.stringify({
          nickname: String(profile.nickname || '').trim(),
          avatarUrl: String(profile.avatarUrl || '').trim()
        })
      );
    } catch {}
  }

  function loadLocalDemoMessages(storage = getStorage()) {
    try {
      const raw = String(storage?.getItem?.(NCHAT_LOCAL_DEMO_MESSAGES_STORAGE_KEY) || '').trim();
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return null;
      return parsed.map((item, index) => ({
        id: String(item?.id || `demo-local-${index + 1}`),
        conversationId: NCHAT_DEMO_CONVERSATION_ID,
        content: String(item?.content || '').trim(),
        createdAt: String(item?.createdAt || '').trim() || new Date().toISOString(),
        isSelf: Boolean(item?.isSelf)
      })).filter((item) => item.content);
    } catch {
      return null;
    }
  }

  function saveLocalDemoMessages(storage = getStorage(), messages = []) {
    try {
      storage?.setItem?.(NCHAT_LOCAL_DEMO_MESSAGES_STORAGE_KEY, JSON.stringify(messages || []));
    } catch {}
  }

  function getOrCreateLocalPreviewId(storage = getStorage()) {
    try {
      const existing = String(storage?.getItem?.(NCHAT_LOCAL_PROFILE_ID_STORAGE_KEY) || '').trim();
      if (existing) return existing;
      const created = String(Date.now()).slice(-8);
      storage?.setItem?.(NCHAT_LOCAL_PROFILE_ID_STORAGE_KEY, created);
      return created;
    } catch {
      return String(Date.now()).slice(-8);
    }
  }

  async function ensureLocalPreviewSession(state) {
    const localId = getOrCreateLocalPreviewId(state.storage);
    const localSession = {
      openId: `nchat-browser-local-${localId}`,
      sessionKey: `nchat-browser-session-${localId}`,
      nickname: '',
      avatar: ''
    };
    const response = await syncSession(localSession);
    state.session = response.session || localSession;
    if (state.session) saveCachedSession(state.storage, state.session);
    return state.session;
  }

  async function getNexaPublicConfig() {
    if (cachedPublicConfig?.apiKey) return cachedPublicConfig;
    const response = await requestJson(NEXA_PUBLIC_CONFIG_ENDPOINT, { method: 'GET' });
    cachedPublicConfig = response;
    return response;
  }

  function buildRedirectUri() {
    return globalScope.location?.href?.split('#')[0] || '';
  }

  function extractAuthCodeFromUrl() {
    try {
      const params = new URL(globalScope.location.href).searchParams;
      return String(params.get('code') || params.get('authCode') || params.get('auth_code') || '').trim();
    } catch {
      return '';
    }
  }

  function clearAuthCodeFromUrl() {
    try {
      const url = new URL(globalScope.location.href);
      ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
      globalScope.history?.replaceState?.({}, '', url.toString());
    } catch {}
  }

  async function beginNexaLoginFlow() {
    const config = await getNexaPublicConfig();
    const redirectUri = buildRedirectUri();
    globalScope.location.href = `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(config.apiKey)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async function requestJson(url, options = {}) {
    const response = await globalScope.fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false) {
      const error = new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
      error.statusCode = Number(response.status || 0) || 0;
      throw error;
    }
    return json;
  }

  async function syncSessionFromAuthCode(state) {
    const authCode = extractAuthCodeFromUrl();
    if (!authCode) return false;
    const authResponse = await requestJson('/api/nexa/tip/session', {
      method: 'POST',
      body: JSON.stringify({ authCode, gameSlug: 'nchat' })
    });
    const serverResponse = await requestJson('/api/nchat/session', {
      method: 'POST',
      body: JSON.stringify({
        openId: String(authResponse.session?.openId || '').trim(),
        sessionKey: String(authResponse.session?.sessionKey || '').trim(),
        nickname: '',
        avatar: ''
      })
    });
    state.session = serverResponse.session || null;
    if (state.session) saveCachedSession(state.storage, state.session);
    state.pendingBootstrap = extractBootstrapFromResponse(serverResponse);
    clearAuthCodeFromUrl();
    return true;
  }

  function extractBootstrapFromResponse(response = {}) {
    if (!response?.user || !Array.isArray(response.conversations)) return null;
    return {
      ok: true,
      user: response.user,
      conversations: response.conversations,
      profileSetupRequired: Boolean(response.profileSetupRequired)
    };
  }

  function consumePendingBootstrap(state) {
    const bootstrap = state.pendingBootstrap || null;
    state.pendingBootstrap = null;
    return bootstrap;
  }

  async function readServerSession() {
    try {
      const response = await requestJson('/api/nchat/session', { method: 'GET' });
      return response.session || null;
    } catch {
      return null;
    }
  }

  async function syncSession(session) {
    return requestJson('/api/nchat/session', {
      method: 'POST',
      body: JSON.stringify(session || {})
    });
  }

  async function loadBootstrap() {
    return requestJson('/api/nchat/bootstrap', { method: 'GET' });
  }

  async function saveProfile(profile) {
    return requestJson('/api/nchat/profile', {
      method: 'POST',
      body: JSON.stringify(profile || {})
    });
  }

  async function searchUsers(q) {
    return requestJson(`/api/nchat/search?q=${encodeURIComponent(String(q || '').trim())}`, { method: 'GET' });
  }

  async function addFriend(targetChatId) {
    return requestJson('/api/nchat/friends', {
      method: 'POST',
      body: JSON.stringify({ targetChatId })
    });
  }

  async function loadMessages(conversationId) {
    return requestJson(`/api/nchat/conversations/${encodeURIComponent(String(conversationId || '').trim())}/messages`, {
      method: 'GET'
    });
  }

  async function sendMessage(conversationId, content) {
    return requestJson(`/api/nchat/conversations/${encodeURIComponent(String(conversationId || '').trim())}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async function markConversationRead(conversationId) {
    return requestJson(`/api/nchat/conversations/${encodeURIComponent(String(conversationId || '').trim())}/read`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTimeLabel(input) {
    if (!input) return '';
    const date = new Date(String(input).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '';
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
  }

  function buildAvatarMarkup(url, fallbackText) {
    const src = String(url || '').trim();
    if (src) {
      return `<img class="nchat-avatar" src="${escapeHtml(src)}" alt="${escapeHtml(fallbackText || 'avatar')}" />`;
    }
    return `<div class="nchat-avatar" aria-hidden="true"></div>`;
  }

  function applyUnreadBadge(count) {
    const normalized = Number(count || 0) || 0;
    if (normalized <= 0) return '';
    return `<span class="nchat-unread-badge">${normalized > 99 ? '99+' : normalized}</span>`;
  }

  function renderConversationList(state) {
    const list = state.elements.conversationList;
    const rows = getDisplayConversations(state);
    if (!rows.length) {
      list.innerHTML = '<div class="nchat-empty">还没有聊天对象，先搜索一个昵称或聊天号开始。</div>';
    } else {
      list.innerHTML = rows.map((item) => `
        <button class="nchat-conversation-row ${Number(item.unreadCount || 0) > 0 ? 'is-unread' : ''}" type="button" data-conversation-id="${escapeHtml(item.id)}">
          ${buildAvatarMarkup(item.avatarUrl, item.nickname || 'Nchat 用户')}
          <div class="nchat-conversation-row__main">
            <div class="nchat-conversation-row__top">
              <div class="nchat-conversation-row__name">${escapeHtml(item.nickname || 'Nchat 用户')}</div>
            </div>
            <div class="nchat-conversation-row__preview">${escapeHtml(item.lastMessagePreview || '开始聊天吧')}</div>
          </div>
          <div class="nchat-conversation-row__side">
            <div class="nchat-conversation-row__time">${escapeHtml(formatTimeLabel(item.lastMessageAt || item.updatedAt || ''))}</div>
            ${applyUnreadBadge(item.unreadCount)}
          </div>
        </button>
      `).join('');
    }
    updateNavUnreadState(state);
  }

  function renderMessages(state) {
    const rows = Array.isArray(state.messages) ? state.messages : [];
    if (!rows.length) {
      state.elements.messageList.innerHTML = '<div class="nchat-empty">打个招呼，开始这段聊天。</div>';
      return;
    }
    state.elements.messageList.innerHTML = rows.map((item) => `
      <div class="nchat-message-block">
        <div class="nchat-message-block__time">${escapeHtml(formatTimeLabel(item.createdAt || ''))}</div>
        <article class="nchat-message ${item.isSelf ? 'nchat-message--sent' : 'nchat-message--received'} ${item.isPending ? 'is-pending' : ''}">
          <div>${escapeHtml(item.content || '')}</div>
        </article>
      </div>
    `).join('');
    state.elements.messageList.scrollTop = state.elements.messageList.scrollHeight;
  }

  function renderSearchResults(state, items) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      state.elements.searchResults.hidden = false;
      state.elements.searchResults.innerHTML = '<div class="nchat-search-empty">没有找到匹配用户。</div>';
      return;
    }
    state.elements.searchResults.hidden = false;
    state.elements.searchResults.innerHTML = rows.map((item) => `
      <article class="nchat-search-result">
        ${buildAvatarMarkup(item.avatarUrl, item.nickname || 'Nchat 用户')}
        <div class="nchat-search-result__info">
          <div class="nchat-search-result__name">${escapeHtml(item.nickname || 'Nchat 用户')}</div>
          <div class="nchat-search-result__id">${escapeHtml(item.chatId || '')}</div>
        </div>
        <button class="nchat-search-result__action" type="button" data-add-chat-id="${escapeHtml(item.chatId || '')}">
          ${item.isFriend ? '打开聊天' : '添加并聊天'}
        </button>
      </article>
    `).join('');
  }

  function upsertConversation(state, conversation) {
    const normalizedId = String(conversation?.id || '').trim();
    if (!normalizedId) return;
    const nextConversation = {
      id: normalizedId,
      chatId: String(conversation?.chatId || '').trim(),
      nickname: String(conversation?.nickname || '').trim() || 'Nchat 用户',
      avatarUrl: String(conversation?.avatarUrl || '').trim(),
      unreadCount: Number(conversation?.unreadCount || 0) || 0,
      lastMessagePreview: String(conversation?.lastMessagePreview || '').trim(),
      lastMessageAt: String(conversation?.lastMessageAt || '').trim(),
      updatedAt: String(conversation?.updatedAt || '').trim()
    };
    const current = Array.isArray(state.conversations) ? state.conversations : [];
    const index = current.findIndex((item) => String(item?.id || '') === normalizedId);
    if (index === -1) {
      state.conversations = [nextConversation, ...current];
      return;
    }
    state.conversations = current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...nextConversation } : item));
  }

  function updateConversationPreview(state, conversationId, patch = {}) {
    const normalizedId = String(conversationId || '').trim();
    if (!normalizedId) return;
    const current = Array.isArray(state.conversations) ? state.conversations : [];
    state.conversations = current.map((item) => {
      if (String(item?.id || '') !== normalizedId) return item;
      return {
        ...item,
        ...patch
      };
    });
  }

  function createOptimisticMessage(content) {
    return {
      id: `pending-${Date.now()}`,
      content: String(content || ''),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      isSelf: true,
      isPending: true
    };
  }

  function updateMyProfile(state) {
    const avatarUrl = String(state.user?.avatarUrl || '').trim() || getDefaultAvatarDataUrl();
    state.elements.myAvatar.src = avatarUrl;
    state.elements.myNickname.textContent = state.user?.nickname || 'Nchat 用户';
    state.elements.myChatId.textContent = state.user?.chatId || '00000000';
    if (state.elements.profileAvatarPreview) {
      state.elements.profileAvatarPreview.src = avatarUrl;
    }
  }

  function setProfileFeedback(state, message = '') {
    if (!state.elements.profileFeedback) return;
    const text = String(message || '').trim();
    state.elements.profileFeedback.textContent = text;
    state.elements.profileFeedback.hidden = !text;
  }

  function updateStatus(state, text) {
    if (state.elements.status) {
      state.elements.status.textContent = String(text || '').trim() || '已连接';
    }
  }

  function buildLocalPreviewUser(state) {
    const localProfile = loadLocalPreviewProfile(state.storage);
    return {
      id: 0,
      openId: String(state.session?.openId || 'nchat-browser-local').trim(),
      chatId: '00000000',
      nickname: String(localProfile?.nickname || '').trim() || 'Nchat 用户',
      avatarUrl: String(localProfile?.avatarUrl || '').trim() || '',
      createdAt: '',
      updatedAt: ''
    };
  }

  function applyLocalPreviewBootstrap(state) {
    state.user = buildLocalPreviewUser(state);
    state.conversations = [];
    state.profileSetupRequired = !String(state.user.nickname || '').trim() || !String(state.user.avatarUrl || '').trim();
    updateMyProfile(state);
    renderConversationList(state);
    state.elements.profileModal.hidden = !state.profileSetupRequired;
    updateStatus(state, '本地测试');
  }

  function appendLocalDemoMessage(state, content) {
    const nextMessages = [
      ...createDemoSupportMessages(),
      {
        id: `demo-self-${Date.now()}`,
        conversationId: NCHAT_DEMO_CONVERSATION_ID,
        content: String(content || '').trim(),
        createdAt: new Date().toISOString(),
        isSelf: true
      }
    ];
    saveLocalDemoMessages(state.storage, nextMessages);
    state.messages = nextMessages;
    renderMessages(state);
  }

  function updateNavUnreadState(state) {
    const totalUnread = getDisplayConversations(state).reduce((sum, item) => sum + (Number(item.unreadCount || 0) || 0), 0);
    state.elements.navItems.forEach((button) => {
      if (button.dataset.tabTarget === 'chat') {
        if (totalUnread > 0) {
          button.dataset.hasUnread = '1';
        } else {
          button.removeAttribute('data-has-unread');
        }
      }
    });
  }

  function switchTab(state, tab) {
    state.activeTab = tab;
    state.elements.chatPanel.hidden = tab !== 'chat';
    state.elements.mePanel.hidden = tab !== 'me';
    state.elements.navItems.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tabTarget === tab);
    });
  }

  function openProfileModal(state) {
    state.elements.profileNicknameInput.value = String(state.user?.nickname || '').trim();
    state.elements.profileAvatarInput.value = '';
    setProfileFeedback(state, '');
    if (state.elements.profileAvatarPreview) {
      state.elements.profileAvatarPreview.src = String(state.user?.avatarUrl || '').trim() || getDefaultAvatarDataUrl();
    }
    state.elements.profileModal.hidden = false;
  }

  async function refreshBootstrap(state) {
    const bootstrap = await loadBootstrap().catch((error) => {
      if (isLocalPreview()) {
        applyLocalPreviewBootstrap(state);
        return null;
      }
      throw error;
    });
    if (!bootstrap) {
      return {
        ok: true,
        user: state.user,
        conversations: state.conversations,
        profileSetupRequired: state.profileSetupRequired
      };
    }
    applyBootstrapPayload(state, bootstrap);
    return bootstrap;
  }

  function applyBootstrapPayload(state, bootstrap) {
    state.user = bootstrap.user || null;
    if (isLocalPreview()) {
      const localProfile = loadLocalPreviewProfile(state.storage);
      if (localProfile?.nickname) state.user.nickname = localProfile.nickname;
      if (localProfile?.avatarUrl) state.user.avatarUrl = localProfile.avatarUrl;
    }
    state.conversations = bootstrap.conversations || [];
    state.profileSetupRequired = Boolean(bootstrap.profileSetupRequired);
    if (isLocalPreview()) {
      const localProfile = loadLocalPreviewProfile(state.storage);
      if (localProfile?.nickname && localProfile?.avatarUrl) {
        state.profileSetupRequired = false;
      }
    }
    updateMyProfile(state);
    renderConversationList(state);
    state.elements.profileModal.hidden = !state.profileSetupRequired;
    updateStatus(state, '已连接');
  }

  async function openConversation(state, conversationId) {
    const normalizedId = String(conversationId || '').trim();
    if (!normalizedId) return;
    state.activeConversationId = normalizedId;
    const row = getDisplayConversations(state).find((item) => String(item.id) === normalizedId);
    state.elements.conversationTitle.textContent = row?.nickname || '聊天';
    state.elements.conversationSubtitle.textContent = row?.chatId || '';
    state.elements.conversationView.hidden = false;
    if (normalizedId === NCHAT_DEMO_CONVERSATION_ID) {
      state.elements.composerInput.value = '';
      state.elements.composerInput.disabled = false;
      state.elements.composerInput.placeholder = '输入消息';
      state.elements.composerSend.disabled = false;
      state.messages = createDemoSupportMessages();
      renderMessages(state);
      return;
    }
    state.elements.composerInput.disabled = false;
    state.elements.composerInput.placeholder = '输入消息';
    state.elements.composerSend.disabled = false;
    const history = await loadMessages(normalizedId);
    state.messages = history.items || [];
    renderMessages(state);
    await markConversationRead(normalizedId).catch(() => null);
    const bootstrap = await loadBootstrap().catch(() => null);
    if (bootstrap?.ok) {
      state.conversations = bootstrap.conversations || [];
      renderConversationList(state);
    }
  }

  function closeConversation(state) {
    state.activeConversationId = '';
    state.messages = [];
    state.elements.composerInput.disabled = false;
    state.elements.composerInput.placeholder = '输入消息';
    state.elements.composerSend.disabled = false;
    state.elements.conversationView.hidden = true;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
      reader.readAsDataURL(file);
    });
  }

  async function submitProfile(state) {
    const nickname = String(state.elements.profileNicknameInput.value || '').trim();
    const avatarFile = state.elements.profileAvatarInput.files?.[0] || null;
    const fallbackAvatar = String(state.user?.avatarUrl || '').trim();
    const avatarUrl = avatarFile ? await fileToDataUrl(avatarFile) : fallbackAvatar;
    if (!nickname) {
      setProfileFeedback(state, '请填写昵称');
      return;
    }
    if (!avatarUrl) {
      setProfileFeedback(state, '请选择头像后再保存');
      return;
    }
    setProfileFeedback(state, '');
    state.elements.profileSave.disabled = true;
    if (isLocalPreview()) {
      saveLocalPreviewProfile(state.storage, { nickname, avatarUrl });
      state.user = {
        ...(state.user || {}),
        nickname,
        avatarUrl
      };
      if (state.session) {
        state.session.nickname = nickname;
        state.session.avatar = avatarUrl;
        saveCachedSession(state.storage, state.session);
      }
      updateMyProfile(state);
      state.profileSetupRequired = false;
      state.elements.profileModal.hidden = true;
      state.elements.profileSave.disabled = false;
      return;
    }
    const response = await saveProfile({ nickname, avatarUrl });
    state.user = response.user || null;
    if (state.session) {
      state.session.nickname = nickname;
      state.session.avatar = avatarUrl;
      saveCachedSession(state.storage, state.session);
    }
    await refreshBootstrap(state);
    updateMyProfile(state);
    state.profileSetupRequired = Boolean(response.profileSetupRequired);
    state.elements.profileModal.hidden = false;
    if (!state.profileSetupRequired) state.elements.profileModal.hidden = true;
    state.elements.profileSave.disabled = false;
  }

  function bindEvents(state) {
    state.elements.navItems.forEach((button) => {
      button.addEventListener('click', () => switchTab(state, button.dataset.tabTarget));
    });

    state.elements.profileSave.addEventListener('click', async () => {
      try {
        await submitProfile(state);
      } catch (error) {
        setProfileFeedback(state, String(error?.message || '保存失败，请重试'));
        state.elements.profileSave.disabled = false;
      }
    });

    state.elements.profileAvatarInput.addEventListener('change', async () => {
      const avatarFile = state.elements.profileAvatarInput.files?.[0] || null;
      if (!avatarFile || !state.elements.profileAvatarPreview) return;
      const avatarUrl = await fileToDataUrl(avatarFile).catch(() => '');
      if (avatarUrl) {
        state.elements.profileAvatarPreview.src = avatarUrl;
      }
    });

    state.elements.profileEditButton.addEventListener('click', () => {
      openProfileModal(state);
    });

    state.elements.searchInput.addEventListener('input', async () => {
      const query = String(state.elements.searchInput.value || '').trim();
      if (!query) {
        state.elements.searchResults.hidden = true;
        state.elements.searchResults.innerHTML = '';
        return;
      }
      const response = await searchUsers(query).catch(() => null);
      if (!response?.ok) return;
      renderSearchResults(state, response.items || []);
    });

    state.elements.searchResults.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-add-chat-id]');
      if (!button) return;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = '连接中...';
      const response = await addFriend(button.dataset.addChatId).catch(() => null);
      if (!response?.ok) {
        button.disabled = false;
        button.textContent = originalText;
        return;
      }
      upsertConversation(state, response.conversation || {});
      renderConversationList(state);
      state.elements.searchInput.value = '';
      state.elements.searchResults.hidden = true;
      state.elements.searchResults.innerHTML = '';
      await openConversation(state, response.conversation?.id).catch(() => null);
      refreshBootstrap(state).catch(() => null);
    });

    state.elements.conversationList.addEventListener('click', (event) => {
      const row = event.target.closest('[data-conversation-id]');
      if (!row) return;
      openConversation(state, row.dataset.conversationId).catch(() => {});
    });

    state.elements.composerSend.addEventListener('click', async () => {
      const content = String(state.elements.composerInput.value || '').trim();
      if (!content || !state.activeConversationId) return;
      if (state.activeConversationId === NCHAT_DEMO_CONVERSATION_ID) {
        state.elements.composerInput.value = '';
        appendLocalDemoMessage(state, content);
        return;
      }
      state.elements.composerInput.value = '';
      const pendingMessage = createOptimisticMessage(content);
      state.messages = [...(state.messages || []), pendingMessage];
      updateConversationPreview(state, state.activeConversationId, {
        lastMessagePreview: content,
        lastMessageAt: pendingMessage.createdAt,
        updatedAt: pendingMessage.createdAt
      });
      renderConversationList(state);
      renderMessages(state);
      state.elements.composerSend.disabled = true;
      const response = await sendMessage(state.activeConversationId, content).catch(() => null);
      state.elements.composerSend.disabled = false;
      if (!response?.ok) {
        state.messages = (state.messages || []).filter((item) => item.id !== pendingMessage.id);
        state.elements.composerInput.value = content;
        renderMessages(state);
        return;
      }
      state.messages = (state.messages || []).map((item) => (item.id === pendingMessage.id ? response.message : item));
      updateConversationPreview(state, state.activeConversationId, {
        lastMessagePreview: response.message?.content || content,
        lastMessageAt: response.message?.createdAt || pendingMessage.createdAt,
        updatedAt: response.message?.createdAt || pendingMessage.createdAt
      });
      renderConversationList(state);
      renderMessages(state);
      refreshBootstrap(state).catch(() => null);
    });

    state.elements.composerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        state.elements.composerSend.click();
      }
    });

    state.elements.conversationBack.addEventListener('click', () => {
      closeConversation(state);
    });
  }

  function connectRealtime(state) {
    if (!globalScope.EventSource || !state.session?.openId) return;
    if (state.eventSource) {
      try {
        state.eventSource.close();
      } catch {}
    }

    const source = new EventSource('/api/nchat/events', { withCredentials: true });
    source.addEventListener('nchat.message', async (event) => {
      const payload = JSON.parse(String(event.data || '{}'));
      await refreshBootstrap(state).catch(() => null);
      if (String(payload.conversationId || '') === String(state.activeConversationId || '')) {
        const history = await loadMessages(state.activeConversationId).catch(() => null);
        if (history?.ok) {
          state.messages = history.items || [];
          renderMessages(state);
          await markConversationRead(state.activeConversationId).catch(() => null);
          await refreshBootstrap(state).catch(() => null);
        }
      }
    });
    source.addEventListener('nchat.conversation-updated', async () => {
      await refreshBootstrap(state).catch(() => null);
    });
    source.onerror = () => {
      updateStatus(state, '连接中断，正在重连');
    };
    source.onopen = () => {
      updateStatus(state, '已连接');
    };
    state.eventSource = source;
  }

  async function bootstrapApp(state) {
    if (!isNexaAppEnvironment()) {
      state.elements.guard.hidden = false;
      return;
    }

    state.elements.guard.hidden = true;
    const localPreview = isLocalPreview();
    const authCode = extractAuthCodeFromUrl();

    if (!localPreview && !authCode) {
      clearCachedSession(state.storage);
      await clearServerSession();
      await beginNexaLoginFlow().catch(() => {});
      return;
    }

    const syncedByAuthCode = await syncSessionFromAuthCode(state).catch(() => false);
    if (!syncedByAuthCode) {
      const serverSession = await readServerSession();
      if (serverSession?.openId && serverSession?.sessionKey) {
        state.session = serverSession;
        saveCachedSession(state.storage, serverSession);
      } else if (localPreview) {
        const cachedSession = loadCachedSession(state.storage);
        if (cachedSession?.openId && cachedSession?.sessionKey) {
          const response = await syncSession(cachedSession).catch(() => null);
          if (response?.session) {
            state.session = response.session;
            saveCachedSession(state.storage, response.session);
          }
        }
      }
    }

    if (!state.session?.openId || !state.session?.sessionKey) {
      clearCachedSession(state.storage);
      if (localPreview) {
        await ensureLocalPreviewSession(state).catch(() => null);
      } else {
        await beginNexaLoginFlow().catch(() => {});
        return;
      }
    }

    if (!state.session?.openId || !state.session?.sessionKey) {
      return;
    }

    try {
      const immediateBootstrap = consumePendingBootstrap(state);
      if (immediateBootstrap) {
        applyBootstrapPayload(state, immediateBootstrap);
      } else {
        await refreshBootstrap(state);
      }
      connectRealtime(state);
      refreshBootstrap(state).catch(() => null);
    } catch (error) {
      if (localPreview) {
        applyLocalPreviewBootstrap(state);
        return;
      }
      throw error;
    }
  }

  function init() {
    const root = globalScope.document?.querySelector?.('[data-nchat-app]');
    if (!root) return;
    const state = {
      storage: getStorage(),
      session: null,
      user: null,
      conversations: [],
      messages: [],
      profileSetupRequired: false,
      pendingBootstrap: null,
      activeConversationId: '',
      activeTab: 'chat',
      eventSource: null,
      elements: {
        guard: root.querySelector('#nchatGuard'),
        status: root.querySelector('#nchatStatus'),
        chatPanel: root.querySelector('#nchatChatPanel'),
        mePanel: root.querySelector('#nchatMePanel'),
        searchInput: root.querySelector('#nchatSearchInput'),
        searchResults: root.querySelector('#nchatSearchResults'),
        conversationList: root.querySelector('#nchatConversationList'),
        conversationView: root.querySelector('#nchatConversationView'),
        conversationTitle: root.querySelector('#nchatConversationTitle'),
        conversationSubtitle: root.querySelector('#nchatConversationSubtitle'),
        conversationBack: root.querySelector('#nchatConversationBack'),
        messageList: root.querySelector('#nchatMessageList'),
        composerInput: root.querySelector('#nchatComposerInput'),
        composerSend: root.querySelector('#nchatComposerSend'),
        profileModal: root.querySelector('#nchatProfileSetupModal'),
        profileAvatarInput: root.querySelector('#nchatProfileAvatarInput'),
        profileAvatarPreview: root.querySelector('#nchatProfileAvatarPreview'),
        profileNicknameInput: root.querySelector('#nchatProfileNicknameInput'),
        profileFeedback: root.querySelector('#nchatProfileFeedback'),
        profileSave: root.querySelector('#nchatProfileSave'),
        profileEditButton: root.querySelector('#nchatProfileEditButton'),
        myAvatar: root.querySelector('#nchatMyAvatar'),
        myNickname: root.querySelector('#nchatMyNickname'),
        myChatId: root.querySelector('#nchatMyChatId'),
        navItems: Array.from(root.querySelectorAll('.nchat-nav__item'))
      }
    };
    bindEvents(state);
    if (isLocalPreview()) {
      applyLocalPreviewBootstrap(state);
    }
    bootstrapApp(state).catch(() => {
      if (isLocalPreview()) {
        applyLocalPreviewBootstrap(state);
        return;
      }
      updateStatus(state, '连接失败');
    });
  }

  globalScope.document?.addEventListener('DOMContentLoaded', init);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      NEXA_PROTOCOL_AUTH_BASE,
      NCHAT_SESSION_STORAGE_KEY,
      beginNexaLoginFlow,
      renderConversationList,
      applyUnreadBadge
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
