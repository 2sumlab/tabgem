'use strict';

const state = {
  range: '4h',
  customStart: '',
  customEnd: '',
  searchQuery: '',
  allEntries: [],
  groups: [],
  selectedUrls: new Set(),
  collapsedDomains: new Set(),
  summaryMarkdown: '',
  stashItems: [],
  lastSync: null,
};

const STORAGE_KEY = 'tabGemPreferences';
const STASH_STORAGE_KEY = 'tabGemStashItems';
const BOOKMARK_FOLDER_TITLE = 'TabGem';
const localeCode = detectLocale();
const localeTag = localeCode === 'zh' ? 'zh-CN' : 'en-US';

const MESSAGES = {
  en: {
    pageTitle: 'TabGem',
    eyebrow: 'History, distilled',
    heroSubtitle: 'A warm, structured view of your recent browsing history. Filter it, group it, save it, and turn it into a daily note.',
    selected: 'Selected',
    domains: 'Domains',
    entries: 'Entries',
    timeWindow: 'Time window',
    start: 'Start',
    end: 'End',
    applyRange: 'Apply range',
    selectVisible: 'Select visible',
    unselectVisible: 'Unselect visible',
    refresh: 'Refresh',
    clearSelection: 'Clear selection',
    saveToBookmarks: 'Save to bookmarks',
    addToStash: 'Add to stash',
    openSelected: 'Open selected',
    exportMarkdown: 'Export Markdown',
    generateDailyNote: 'Generate daily note',
    stash: 'Stash',
    savedCount: '{count} saved',
    stashEmpty: 'Nothing in your temporary pool yet. Select a few links and stash them here.',
    clearStash: 'Clear stash',
    remove: 'Remove',
    dailyNoteDraft: 'Daily note draft',
    localSummary: 'Local summary',
    copy: 'Copy',
    downloadNote: 'Download note',
    groupedByDomain: 'Grouped by domain',
    loading: 'Loading...',
    searchPlaceholder: 'Search titles, domains, or URLs...',
    selectedUrls: 'Selected URLs',
    currentWindow: 'Current window',
    waitingForFirstSync: 'Waiting for first sync',
    toggleDomain: 'Toggle domain',
    selectDomain: 'Select domain',
    expand: 'Expand',
    collapse: 'Collapse',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    greeting: '{greeting}, here\'s your TabGem',
    unselectedVisibleToast: 'Unselected all visible URLs',
    selectedVisibleToast: 'Selected all visible URLs',
    selectionCleared: 'Selection cleared',
    selectAtLeastOne: 'Select at least one URL first',
    bookmarksPermissionMissing: 'Bookmarks permission is not active. Reload the extension and try again.',
    savedLinksToBookmarks: 'Saved {count} {linkWord} to {folder}',
    allSelectedAlreadyBookmarked: 'All selected links were already in {folder}',
    noLinksSavedToBookmarks: 'No links were saved to bookmarks',
    bookmarksSaveFailed: 'Could not save bookmarks. Try reloading the extension.',
    addedToStash: 'Added {count} {linkWord} to your stash',
    alreadyInStash: 'Those links are already in your stash',
    stashEmptyToast: 'Your stash is empty',
    savedStashToBookmarks: 'Saved {count} stash {linkWord} to {folder}',
    allStashAlreadyBookmarked: 'All stash links were already in {folder}',
    stashBookmarksSaveFailed: 'Could not save stash to bookmarks',
    stashAlreadyEmpty: 'Your stash is already empty',
    stashCleared: 'Cleared your stash',
    openedSelected: 'Opened {count} selected {urlWord}',
    markdownExportStarted: 'Markdown export started',
    summaryMeta: '{links} links across {domains} domains',
    dailyNoteReady: 'Daily note draft is ready',
    dailyNoteCopied: 'Daily note copied',
    dailyNoteDownloadStarted: 'Daily note download started',
    historyLoadFailed: 'Could not load history',
    noMatchingHistory: 'No matching history',
    noMatchingHistoryHint: 'Try a wider time range or refresh again. Only regular web URLs are shown here.',
    domainVisits: '{count} {visitWord}',
    domainsCount: '{count} {domainWord}',
    lastRefreshed: 'Last refreshed {time} · {date}',
    removedFromStash: 'Removed link from stash',
    markdownTitle: '# Browsing roundup ({date})',
    dailyNoteTitle: '# Daily browsing note · {date}',
    snapshot: '## Snapshot',
    timeWindowLine: '- Time window: {value}',
    selectedLinksLine: '- Selected links: {count}',
    domainsCoveredLine: '- Domains covered: {count}',
    focusDomains: '## Focus domains',
    suggestedWorkLog: '## Suggested work log',
    strongestConcentration: 'Today I reviewed {links} pages across {domains} domains. The strongest concentration was around {focus}.',
    mainThemesTouched: 'The main themes I touched were:',
    linkAppendix: '## Link appendix',
    generatedLocally: 'Generated locally on {date} at {time}.',
    last4Hours: 'the last 4 hours',
    last3Days: 'the last 3 days',
    last7Days: 'the last 7 days',
    customTimeRange: 'your custom time range',
    last24Hours: 'the last 24 hours',
    unknownTime: 'Unknown time',
    justSaved: 'Just saved',
    unknown: 'unknown',
    domainSummary: '{count} unique {pageWord} captured here. Most recent visit was {time}.',
    recentResearch: 'recent research',
    linkWordOne: 'link',
    linkWordOther: 'links',
    pageWordOne: 'page',
    pageWordOther: 'pages',
    visitWordOne: 'visit',
    visitWordOther: 'visits',
    domainWordOne: 'domain',
    domainWordOther: 'domains',
    urlWordOne: 'URL',
    urlWordOther: 'URLs',
  },
  zh: {
    pageTitle: 'TabGem',
    eyebrow: '浏览历史凝结',
    heroSubtitle: '把最近的浏览历史整理成一个更温和、更清晰的视图。你可以筛选、分组、保存，并把它转成一份每日笔记。',
    selected: '已选中',
    domains: '域名数',
    entries: '链接数',
    timeWindow: '时间范围',
    start: '开始时间',
    end: '结束时间',
    applyRange: '应用范围',
    selectVisible: '选中当前可见',
    unselectVisible: '取消当前可见',
    refresh: '刷新',
    clearSelection: '清空选择',
    saveToBookmarks: '保存到书签',
    addToStash: '加入暂存池',
    openSelected: '打开所选',
    exportMarkdown: '导出 Markdown',
    generateDailyNote: '生成日报草稿',
    stash: '暂存池',
    savedCount: '已保存 {count} 条',
    stashEmpty: '暂存池里还没有内容。先选中几条链接，再把它们放进来。',
    clearStash: '清空暂存池',
    remove: '移除',
    dailyNoteDraft: '日报草稿',
    localSummary: '本地生成',
    copy: '复制',
    downloadNote: '下载笔记',
    groupedByDomain: '按域名分组',
    loading: '加载中...',
    searchPlaceholder: '搜索标题、域名或链接...',
    selectedUrls: '已选链接',
    currentWindow: '当前窗口',
    waitingForFirstSync: '等待首次同步',
    toggleDomain: '切换域名展开状态',
    selectDomain: '选中这个域名',
    expand: '展开',
    collapse: '收起',
    goodMorning: '早上好',
    goodAfternoon: '下午好',
    goodEvening: '晚上好',
    greeting: '{greeting}，这是你的 TabGem',
    unselectedVisibleToast: '已取消当前可见链接',
    selectedVisibleToast: '已选中当前可见链接',
    selectionCleared: '已清空选择',
    selectAtLeastOne: '请先至少选中一条链接',
    bookmarksPermissionMissing: '书签权限还没有生效，请重新加载扩展后再试。',
    savedLinksToBookmarks: '已保存 {count} 条链接到 {folder}',
    allSelectedAlreadyBookmarked: '所选链接都已经在 {folder} 里了',
    noLinksSavedToBookmarks: '没有新的链接被保存到书签',
    bookmarksSaveFailed: '保存书签失败，请重新加载扩展后再试。',
    addedToStash: '已加入暂存池 {count} 条链接',
    alreadyInStash: '这些链接已经在暂存池里了',
    stashEmptyToast: '暂存池还是空的',
    savedStashToBookmarks: '已把暂存池中的 {count} 条链接保存到 {folder}',
    allStashAlreadyBookmarked: '暂存池里的链接都已经在 {folder} 里了',
    stashBookmarksSaveFailed: '保存暂存池到书签失败',
    stashAlreadyEmpty: '暂存池已经是空的了',
    stashCleared: '已清空暂存池',
    openedSelected: '已打开 {count} 条所选链接',
    markdownExportStarted: '已开始导出 Markdown',
    summaryMeta: '{domains} 个域名，共 {links} 条链接',
    dailyNoteReady: '日报草稿已经生成',
    dailyNoteCopied: '日报草稿已复制',
    dailyNoteDownloadStarted: '已开始下载日报草稿',
    historyLoadFailed: '历史记录加载失败',
    noMatchingHistory: '没有匹配到历史记录',
    noMatchingHistoryHint: '可以试试放宽时间范围，或者刷新一次。这里默认只展示常规网页链接。',
    domainVisits: '{count} 次访问',
    domainsCount: '{count} 个域名',
    lastRefreshed: '上次刷新于 {date} {time}',
    removedFromStash: '已从暂存池移除这条链接',
    markdownTitle: '# 浏览历史整理 ({date})',
    dailyNoteTitle: '# 每日浏览笔记 · {date}',
    snapshot: '## 概览',
    timeWindowLine: '- 时间范围：{value}',
    selectedLinksLine: '- 已选链接：{count}',
    domainsCoveredLine: '- 涉及域名：{count}',
    focusDomains: '## 重点域名',
    suggestedWorkLog: '## 建议工作记录',
    strongestConcentration: '今天我浏览了 {domains} 个域名下的 {links} 个页面，重点主要集中在 {focus}。',
    mainThemesTouched: '我这次触及的主要主题包括：',
    linkAppendix: '## 链接附录',
    generatedLocally: '本地生成于 {date} {time}。',
    last4Hours: '最近 4 小时',
    last3Days: '最近 3 天',
    last7Days: '最近 7 天',
    customTimeRange: '自定义时间范围',
    last24Hours: '最近 24 小时',
    unknownTime: '未知时间',
    justSaved: '刚刚保存',
    unknown: '未知',
    domainSummary: '这里收录了 {count} 个不同页面，最近一次访问时间是 {time}。',
    recentResearch: '最近浏览的内容',
    linkWordOne: '条链接',
    linkWordOther: '条链接',
    pageWordOne: '个页面',
    pageWordOther: '个页面',
    visitWordOne: '次访问',
    visitWordOther: '次访问',
    domainWordOne: '个域名',
    domainWordOther: '个域名',
    urlWordOne: '条链接',
    urlWordOther: '条链接',
  },
};

const elements = {
  presetGroup: document.getElementById('presetGroup'),
  customRange: document.getElementById('customRange'),
  customStart: document.getElementById('customStart'),
  customEnd: document.getElementById('customEnd'),
  applyCustomRange: document.getElementById('applyCustomRange'),
  selectVisible: document.getElementById('selectVisible'),
  clearSelection: document.getElementById('clearSelection'),
  refreshHistory: document.getElementById('refreshHistory'),
  saveToBookmarks: document.getElementById('saveToBookmarks'),
  addToStash: document.getElementById('addToStash'),
  openSelected: document.getElementById('openSelected'),
  exportMarkdown: document.getElementById('exportMarkdown'),
  generateSummary: document.getElementById('generateSummary'),
  copySummary: document.getElementById('copySummary'),
  downloadSummary: document.getElementById('downloadSummary'),
  selectedCount: document.getElementById('selectedCount'),
  domainCount: document.getElementById('domainCount'),
  entryCount: document.getElementById('entryCount'),
  footerSelected: document.getElementById('footerSelected'),
  footerWindow: document.getElementById('footerWindow'),
  lastRefresh: document.getElementById('lastRefresh'),
  rangeSummary: document.getElementById('rangeSummary'),
  groupMeta: document.getElementById('groupMeta'),
  historySearch: document.getElementById('historySearch'),
  domainGroups: document.getElementById('domainGroups'),
  stashPanel: document.getElementById('stashPanel'),
  stashList: document.getElementById('stashList'),
  stashCount: document.getElementById('stashCount'),
  stashEmpty: document.getElementById('stashEmpty'),
  saveStashToBookmarks: document.getElementById('saveStashToBookmarks'),
  clearStash: document.getElementById('clearStash'),
  summaryPanel: document.getElementById('summaryPanel'),
  summaryOutput: document.getElementById('summaryOutput'),
  summaryMeta: document.getElementById('summaryMeta'),
  toast: document.getElementById('toast'),
  toastText: document.getElementById('toastText'),
  domainCardTemplate: document.getElementById('domainCardTemplate'),
  historyRowTemplate: document.getElementById('historyRowTemplate'),
};

const friendlyDate = new Intl.DateTimeFormat(localeTag, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(localeTag, {
  hour: 'numeric',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat(
  localeTag,
  localeCode === 'zh'
    ? { month: 'numeric', day: 'numeric' }
    : { month: 'short', day: 'numeric' }
);

async function init() {
  applyStaticTranslations();
  await restorePreferences();
  await loadStash();
  applyPreferenceInputs();
  attachEvents();
  updateGreeting();
  renderStash();
  await refreshHistory();
}

function detectLocale() {
  const raw = (chrome.i18n?.getUILanguage?.() || navigator.language || 'en').toLowerCase();
  return raw.startsWith('zh') ? 'zh' : 'en';
}

function t(key, vars = {}) {
  const dict = MESSAGES[localeCode] || MESSAGES.en;
  const template = dict[key] || MESSAGES.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_match, token) => String(vars[token] ?? ''));
}

function pluralKey(base, count) {
  return `${base}${count === 1 ? 'One' : 'Other'}`;
}

function countWord(base, count) {
  return t(pluralKey(base, count));
}

function applyStaticTranslations() {
  document.documentElement.lang = localeCode === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  document.querySelector('.eyebrow').textContent = t('eyebrow');
  document.querySelector('.hero-subtitle').textContent = t('heroSubtitle');

  const heroLabels = document.querySelectorAll('.hero-stat-label');
  if (heroLabels[0]) heroLabels[0].textContent = t('selected');
  if (heroLabels[1]) heroLabels[1].textContent = t('domains');
  if (heroLabels[2]) heroLabels[2].textContent = t('entries');

  const sectionHeaders = document.querySelectorAll('.section-header > h2');
  if (sectionHeaders[0]) sectionHeaders[0].textContent = t('timeWindow');
  if (sectionHeaders[1]) sectionHeaders[1].textContent = t('stash');
  if (sectionHeaders[2]) sectionHeaders[2].textContent = t('dailyNoteDraft');
  if (sectionHeaders[3]) sectionHeaders[3].textContent = t('groupedByDomain');

  const customLabels = elements.customRange.querySelectorAll('label span');
  if (customLabels[0]) customLabels[0].textContent = t('start');
  if (customLabels[1]) customLabels[1].textContent = t('end');

  const presetLabels = {
    '4h': localeCode === 'zh' ? '4 小时' : '4 hours',
    '24h': localeCode === 'zh' ? '24 小时' : '24 hours',
    '3d': localeCode === 'zh' ? '3 天' : '3 days',
    '7d': localeCode === 'zh' ? '7 天' : '7 days',
    custom: localeCode === 'zh' ? '自定义' : 'Custom',
  };
  for (const button of elements.presetGroup.querySelectorAll('[data-range]')) {
    button.textContent = presetLabels[button.dataset.range] || button.textContent;
  }

  elements.applyCustomRange.textContent = t('applyRange');
  elements.clearSelection.textContent = t('clearSelection');
  elements.refreshHistory.textContent = t('refresh');
  elements.saveToBookmarks.textContent = t('saveToBookmarks');
  elements.addToStash.textContent = t('addToStash');
  elements.openSelected.textContent = t('openSelected');
  elements.exportMarkdown.textContent = t('exportMarkdown');
  elements.generateSummary.textContent = t('generateDailyNote');
  elements.saveStashToBookmarks.textContent = t('saveToBookmarks');
  elements.clearStash.textContent = t('clearStash');
  elements.stashEmpty.textContent = t('stashEmpty');
  elements.summaryMeta.textContent = t('localSummary');
  elements.copySummary.textContent = t('copy');
  elements.downloadSummary.textContent = t('downloadNote');
  elements.historySearch.placeholder = t('searchPlaceholder');
  elements.groupMeta.textContent = t('loading');
  elements.lastRefresh.textContent = t('waitingForFirstSync');

  const footerLabels = document.querySelectorAll('.stat-label');
  if (footerLabels[0]) footerLabels[0].textContent = t('selectedUrls');
  if (footerLabels[1]) footerLabels[1].textContent = t('currentWindow');
}

async function restorePreferences() {
  try {
    const { [STORAGE_KEY]: saved } = await chrome.storage.local.get(STORAGE_KEY);
    if (!saved) return;

    state.range = saved.range || state.range;
    state.customStart = saved.customStart || '';
    state.customEnd = saved.customEnd || '';
    state.searchQuery = saved.searchQuery || '';
    state.collapsedDomains = new Set(saved.collapsedDomains || []);
  } catch (error) {
    console.warn('[tab-gem] failed to restore preferences', error);
  }
}

async function loadStash() {
  try {
    const { [STASH_STORAGE_KEY]: saved } = await chrome.storage.local.get(STASH_STORAGE_KEY);
    state.stashItems = Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn('[tab-gem] failed to load stash', error);
    state.stashItems = [];
  }
}

function applyPreferenceInputs() {
  elements.customStart.value = state.customStart;
  elements.customEnd.value = state.customEnd;
  elements.historySearch.value = state.searchQuery;
  syncRangeUI();
}

function attachEvents() {
  elements.presetGroup.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-range]');
    if (!button) return;
    state.range = button.dataset.range;
    syncRangeUI();
    await persistPreferences();
    if (state.range !== 'custom') {
      await refreshHistory();
    }
  });

  elements.applyCustomRange.addEventListener('click', async () => {
    state.customStart = elements.customStart.value;
    state.customEnd = elements.customEnd.value;
    await persistPreferences();
    await refreshHistory();
  });

  elements.historySearch.addEventListener('input', () => {
    state.searchQuery = elements.historySearch.value.trim();
    persistPreferences();
    applyFilters();
  });

  elements.selectVisible.addEventListener('click', () => {
    const visibleItems = state.groups.flatMap((group) => group.items);
    const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => state.selectedUrls.has(item.url));

    if (allVisibleSelected) {
      for (const item of visibleItems) {
        state.selectedUrls.delete(item.url);
      }
      renderGroups();
      updateStats();
      showToast(t('unselectedVisibleToast'));
      return;
    }

    for (const item of visibleItems) {
      state.selectedUrls.add(item.url);
    }

    renderGroups();
    updateStats();
    showToast(t('selectedVisibleToast'));
  });

  elements.clearSelection.addEventListener('click', () => {
    state.selectedUrls.clear();
    renderGroups();
    updateStats();
    showToast(t('selectionCleared'));
  });

  elements.refreshHistory.addEventListener('click', async () => {
    await refreshHistory();
  });

  elements.saveToBookmarks.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast(t('selectAtLeastOne'));
      return;
    }

    if (!chrome.bookmarks?.create) {
      showToast(t('bookmarksPermissionMissing'));
      return;
    }

    try {
      const result = await saveSelectedToBookmarks(items);
      if (result.created > 0) {
        showToast(t('savedLinksToBookmarks', {
          count: result.created,
          linkWord: countWord('linkWord', result.created),
          folder: BOOKMARK_FOLDER_TITLE,
        }));
        await openBookmarkFolder(result.folderId);
        return;
      }

      if (result.skipped > 0) {
        showToast(t('allSelectedAlreadyBookmarked', { folder: BOOKMARK_FOLDER_TITLE }));
        await openBookmarkFolder(result.folderId);
        return;
      }

      showToast(t('noLinksSavedToBookmarks'));
    } catch (error) {
      console.error('[tab-gem] bookmark save failed', error);
      showToast(t('bookmarksSaveFailed'));
    }
  });

  elements.addToStash.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast(t('selectAtLeastOne'));
      return;
    }

    const added = await addItemsToStash(items);
    showToast(added > 0
      ? t('addedToStash', { count: added, linkWord: countWord('linkWord', added) })
      : t('alreadyInStash'));
  });

  elements.saveStashToBookmarks.addEventListener('click', async () => {
    if (state.stashItems.length === 0) {
      showToast(t('stashEmptyToast'));
      return;
    }

    try {
      const result = await saveSelectedToBookmarks(state.stashItems);
      if (result.created > 0) {
        showToast(t('savedStashToBookmarks', {
          count: result.created,
          linkWord: countWord('linkWord', result.created),
          folder: BOOKMARK_FOLDER_TITLE,
        }));
        await openBookmarkFolder(result.folderId);
        return;
      }

      showToast(t('allStashAlreadyBookmarked', { folder: BOOKMARK_FOLDER_TITLE }));
      await openBookmarkFolder(result.folderId);
    } catch (error) {
      console.error('[tab-gem] stash bookmark save failed', error);
      showToast(t('stashBookmarksSaveFailed'));
    }
  });

  elements.clearStash.addEventListener('click', async () => {
    if (state.stashItems.length === 0) {
      showToast(t('stashAlreadyEmpty'));
      return;
    }

    state.stashItems = [];
    await persistStash();
    renderStash();
    showToast(t('stashCleared'));
  });

  elements.openSelected.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast(t('selectAtLeastOne'));
      return;
    }

    await Promise.all(items.map((item) => chrome.tabs.create({ url: item.url, active: false })));
    showToast(t('openedSelected', { count: items.length, urlWord: countWord('urlWord', items.length) }));
  });

  elements.exportMarkdown.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast(t('selectAtLeastOne'));
      return;
    }

    const markdown = generateMarkdown(items);
    await downloadTextFile(markdown, `tab-gem-${fileDateStamp()}.md`);
    showToast(t('markdownExportStarted'));
  });

  elements.generateSummary.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast(t('selectAtLeastOne'));
      return;
    }

    state.summaryMarkdown = generateDailyNote(items);
    elements.summaryOutput.value = state.summaryMarkdown;
    elements.summaryMeta.textContent = t('summaryMeta', {
      links: items.length,
      domains: groupItemsByDomain(items).length,
    });
    elements.summaryPanel.hidden = false;
    showToast(t('dailyNoteReady'));
  });

  elements.copySummary.addEventListener('click', async () => {
    if (!state.summaryMarkdown) return;
    await navigator.clipboard.writeText(state.summaryMarkdown);
    showToast(t('dailyNoteCopied'));
  });

  elements.downloadSummary.addEventListener('click', async () => {
    if (!state.summaryMarkdown) return;
    await downloadTextFile(state.summaryMarkdown, `tab-gem-daily-note-${fileDateStamp()}.md`);
    showToast(t('dailyNoteDownloadStarted'));
  });

  elements.stashList.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('[data-remove-stash-url]');
    if (removeButton) {
      await removeStashItem(removeButton.dataset.removeStashUrl);
    }
  });
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = t('goodEvening');
  if (hour < 12) greeting = t('goodMorning');
  else if (hour < 17) greeting = t('goodAfternoon');
  document.getElementById('greeting').textContent = t('greeting', { greeting });
}

function syncRangeUI() {
  for (const button of elements.presetGroup.querySelectorAll('[data-range]')) {
    button.classList.toggle('active', button.dataset.range === state.range);
  }
  elements.customRange.hidden = state.range !== 'custom';
  elements.footerWindow.textContent = rangeLabel();
  elements.rangeSummary.textContent = rangeLabel(true);
}

async function persistPreferences() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        range: state.range,
        customStart: state.customStart,
        customEnd: state.customEnd,
        searchQuery: state.searchQuery,
        collapsedDomains: Array.from(state.collapsedDomains),
      },
    });
  } catch (error) {
    console.warn('[tab-gem] failed to persist preferences', error);
  }
}

async function persistStash() {
  try {
    await chrome.storage.local.set({
      [STASH_STORAGE_KEY]: state.stashItems,
    });
  } catch (error) {
    console.warn('[tab-gem] failed to persist stash', error);
  }
}

async function refreshHistory() {
  setLoading(true);

  try {
    const { startTime, endTime } = resolveTimeRange();
    const results = await chrome.history.search({
      text: '',
      startTime,
      endTime,
      maxResults: 10000,
    });

    state.allEntries = normalizeHistory(results);
    state.lastSync = new Date();
    applyFilters();
    updateRefreshMeta();
    chrome.runtime.sendMessage({ type: 'tab-gem:refresh-badge' }).catch(() => {});
  } catch (error) {
    console.error('[tab-gem] history load failed', error);
    elements.groupMeta.textContent = t('historyLoadFailed');
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  elements.refreshHistory.disabled = isLoading;
  elements.saveToBookmarks.disabled = isLoading;
  elements.addToStash.disabled = isLoading;
  elements.saveStashToBookmarks.disabled = isLoading;
  elements.openSelected.disabled = isLoading;
  elements.exportMarkdown.disabled = isLoading;
  elements.generateSummary.disabled = isLoading;

  if (isLoading) {
    elements.groupMeta.textContent = t('loading');
  }
}

function applyFilters() {
  const filteredEntries = filterEntries(state.allEntries, state.searchQuery);
  state.groups = buildGroups(filteredEntries);
  pruneSelection();
  renderGroups();
  updateStats();
}

function filterEntries(entries, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.title || '',
      entry.url || '',
      entry.domain || '',
      friendlyDomain(entry.domain || ''),
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function resolveTimeRange() {
  const endTime = Date.now();

  if (state.range === '4h') {
    return { startTime: endTime - (4 * 60 * 60 * 1000), endTime };
  }

  if (state.range === '3d') {
    return { startTime: endTime - (3 * 24 * 60 * 60 * 1000), endTime };
  }

  if (state.range === '7d') {
    return { startTime: endTime - (7 * 24 * 60 * 60 * 1000), endTime };
  }

  if (state.range === 'custom') {
    const startTime = state.customStart ? new Date(state.customStart).getTime() : endTime - (24 * 60 * 60 * 1000);
    const userEnd = state.customEnd ? new Date(state.customEnd).getTime() : endTime;
    return {
      startTime: Number.isFinite(startTime) ? startTime : endTime - (24 * 60 * 60 * 1000),
      endTime: Number.isFinite(userEnd) ? userEnd : endTime,
    };
  }

  return { startTime: endTime - (24 * 60 * 60 * 1000), endTime };
}

function normalizeHistory(entries) {
  const deduped = new Map();

  for (const entry of entries) {
    if (!entry.url || !/^https?:/i.test(entry.url)) continue;

    try {
      const parsed = new URL(entry.url);
      if (shouldHideHistoryUrl(parsed)) continue;

      const key = parsed.toString();
      const existing = deduped.get(key);
      const normalized = {
        title: cleanTitle(entry.title || parsed.hostname, parsed.hostname),
        url: parsed.toString(),
        domain: parsed.hostname.replace(/^www\./, ''),
        lastVisitTime: entry.lastVisitTime || 0,
      };

      if (!existing || normalized.lastVisitTime > existing.lastVisitTime) {
        deduped.set(key, normalized);
      }
    } catch (_error) {
      // ignore malformed history rows
    }
  }

  return Array.from(deduped.values()).sort((a, b) => b.lastVisitTime - a.lastVisitTime);
}

function buildGroups(entries) {
  const groupMap = new Map();

  for (const entry of entries) {
    if (!groupMap.has(entry.domain)) {
      groupMap.set(entry.domain, []);
    }
    groupMap.get(entry.domain).push(entry);
  }

  return Array.from(groupMap.entries())
    .map(([domain, items]) => ({
      domain,
      label: friendlyDomain(domain),
      items: items.sort((a, b) => b.lastVisitTime - a.lastVisitTime),
      latestVisitTime: items[0]?.lastVisitTime || 0,
    }))
    .sort((a, b) => {
      if (b.latestVisitTime !== a.latestVisitTime) {
        return b.latestVisitTime - a.latestVisitTime;
      }

      if (b.items.length !== a.items.length) {
        return b.items.length - a.items.length;
      }

      return a.domain.localeCompare(b.domain);
    });
}

function renderGroups() {
  elements.domainGroups.innerHTML = '';

  if (state.groups.length === 0) {
    elements.domainGroups.innerHTML = `
      <article class="mission-card">
        <div class="mission-content">
          <div class="mission-top">
            <span class="mission-name">${escapeHtml(t('noMatchingHistory'))}</span>
          </div>
          <div class="mission-summary">${escapeHtml(t('noMatchingHistoryHint'))}</div>
        </div>
      </article>
    `;
    elements.groupMeta.textContent = t('domainsCount', { count: 0, domainWord: countWord('domainWord', 0) });
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const group of state.groups) {
    const card = elements.domainCardTemplate.content.firstElementChild.cloneNode(true);
    const selectedCount = group.items.filter((item) => state.selectedUrls.has(item.url)).length;
    const isCollapsed = state.collapsedDomains.has(group.domain);

    card.dataset.domain = group.domain;
    card.classList.toggle('collapsed', isCollapsed);
    card.classList.toggle('has-active-bar', selectedCount > 0);
    card.classList.toggle('has-amber-bar', selectedCount === 0);

    card.querySelector('.mission-name').textContent = group.label;
    card.querySelector('.mission-tag').textContent = group.domain;
    card.querySelector('.domain-visits').textContent = t('domainVisits', {
      count: group.items.length,
      visitWord: countWord('visitWord', group.items.length),
    });
    card.querySelector('.mission-summary').textContent = buildDomainSummary(group);

    const groupCheckbox = card.querySelector('.group-checkbox');
    groupCheckbox.checked = selectedCount === group.items.length && group.items.length > 0;
    groupCheckbox.indeterminate = selectedCount > 0 && selectedCount < group.items.length;
    groupCheckbox.addEventListener('change', async () => {
      for (const item of group.items) {
        if (groupCheckbox.checked) state.selectedUrls.add(item.url);
        else state.selectedUrls.delete(item.url);
      }
      renderGroups();
      updateStats();
    });

    const collapseToggle = card.querySelector('.collapse-toggle');
    const miniAction = card.querySelector('.mini-action');
    const toggleCollapse = async () => {
      if (state.collapsedDomains.has(group.domain)) state.collapsedDomains.delete(group.domain);
      else state.collapsedDomains.add(group.domain);
      await persistPreferences();
      renderGroups();
    };

    collapseToggle.addEventListener('click', toggleCollapse);
    miniAction.addEventListener('click', toggleCollapse);
    collapseToggle.setAttribute('aria-label', t('toggleDomain'));
    card.querySelector('.checkbox-label span').textContent = t('selectDomain');
    miniAction.textContent = isCollapsed ? t('expand') : t('collapse');

    const pages = card.querySelector('.mission-pages');
    for (const item of group.items) {
      const row = elements.historyRowTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.url = item.url;
      const checkbox = row.querySelector('.page-checkbox');
      checkbox.checked = state.selectedUrls.has(item.url);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selectedUrls.add(item.url);
        else state.selectedUrls.delete(item.url);
        updateStats();
        updateGroupSelectionState(card, group);
      });

      row.querySelector('.page-title').textContent = item.title || item.url;
      const compactUrl = formatDisplayUrl(item.url);
      const urlElement = row.querySelector('.page-url');
      urlElement.textContent = compactUrl;
      urlElement.title = item.url;
      row.querySelector('.page-time').textContent = formatVisitTime(item.lastVisitTime);

      const favicon = row.querySelector('.page-favicon');
      favicon.style.backgroundImage = `url("chrome://favicon/size/16@1x/${item.url}")`;
      favicon.style.backgroundSize = 'cover';
      favicon.style.backgroundPosition = 'center';

      pages.appendChild(row);
    }

    fragment.appendChild(card);
  }

  elements.domainGroups.appendChild(fragment);
  elements.groupMeta.textContent = t('domainsCount', {
    count: state.groups.length,
    domainWord: countWord('domainWord', state.groups.length),
  });
}

function updateGroupSelectionState(card, group) {
  const selectedCount = group.items.filter((item) => state.selectedUrls.has(item.url)).length;
  const groupCheckbox = card.querySelector('.group-checkbox');
  groupCheckbox.checked = selectedCount === group.items.length && group.items.length > 0;
  groupCheckbox.indeterminate = selectedCount > 0 && selectedCount < group.items.length;
  card.classList.toggle('has-active-bar', selectedCount > 0);
  card.classList.toggle('has-amber-bar', selectedCount === 0);
  updateStats();
}

function updateStats() {
  elements.selectedCount.textContent = String(state.selectedUrls.size);
  elements.domainCount.textContent = String(state.groups.length);
  elements.entryCount.textContent = String(state.groups.reduce((sum, group) => sum + group.items.length, 0));
  elements.footerSelected.textContent = String(state.selectedUrls.size);

  const visibleItems = state.groups.flatMap((group) => group.items);
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => state.selectedUrls.has(item.url));
  elements.selectVisible.textContent = allVisibleSelected ? t('unselectVisible') : t('selectVisible');
}

function updateRefreshMeta() {
  if (!state.lastSync) return;
  elements.lastRefresh.textContent = t('lastRefreshed', {
    time: timeFormatter.format(state.lastSync),
    date: friendlyDate.format(state.lastSync),
  });
}

function renderStash() {
  elements.stashCount.textContent = t('savedCount', { count: state.stashItems.length });

  if (state.stashItems.length === 0) {
    elements.stashEmpty.style.display = 'block';
    elements.stashList.innerHTML = '';
    return;
  }

  elements.stashEmpty.style.display = 'none';
  elements.stashList.innerHTML = state.stashItems.map((item) => `
    <div class="stash-item">
      <a class="stash-link" href="${item.url}" target="_blank" rel="noopener">
        <span class="stash-title">${escapeHtml(item.title || item.url)}</span>
        <span class="stash-url" title="${escapeHtml(item.url)}">${escapeHtml(formatDisplayUrl(item.url))}</span>
      </a>
      <div class="stash-meta">
        <span>${escapeHtml(item.domain || '')}</span>
        <span>${escapeHtml(formatSavedAt(item.savedAt))}</span>
      </div>
      <button class="stash-remove" type="button" data-remove-stash-url="${escapeHtml(item.url)}">${escapeHtml(t('remove'))}</button>
    </div>
  `).join('');
}

async function addItemsToStash(items) {
  const existing = new Set(state.stashItems.map((item) => item.url));
  let added = 0;

  for (const item of items) {
    if (existing.has(item.url)) continue;
    state.stashItems.unshift({
      title: item.title,
      url: item.url,
      domain: item.domain,
      savedAt: new Date().toISOString(),
    });
    existing.add(item.url);
    added += 1;
  }

  await persistStash();
  renderStash();
  return added;
}

async function removeStashItem(url) {
  const nextItems = state.stashItems.filter((item) => item.url !== url);
  if (nextItems.length === state.stashItems.length) return;
  state.stashItems = nextItems;
  await persistStash();
  renderStash();
  showToast(t('removedFromStash'));
}

async function saveSelectedToBookmarks(items) {
  const folderId = await ensureBookmarkFolder();
  const children = await chrome.bookmarks.getChildren(folderId);
  const existingUrls = new Set(children.filter((child) => child.url).map((child) => child.url));
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    if (existingUrls.has(item.url)) {
      skipped += 1;
      continue;
    }

    await chrome.bookmarks.create({
      parentId: folderId,
      title: item.title || item.url,
      url: item.url,
    });
    existingUrls.add(item.url);
    created += 1;
  }

  return { created, skipped, folderId };
}

async function ensureBookmarkFolder() {
  const parentId = await getBookmarkBarId();
  const directChildren = await chrome.bookmarks.getChildren(parentId);
  const folder = directChildren.find((item) => !item.url && item.title === BOOKMARK_FOLDER_TITLE);
  if (folder) return folder.id;

  const created = await chrome.bookmarks.create({
    parentId,
    title: BOOKMARK_FOLDER_TITLE,
  });
  return created.id;
}

async function getBookmarkBarId() {
  try {
    await chrome.bookmarks.get('1');
    return '1';
  } catch (_error) {
    // Fall through to tree lookup below.
  }

  const [tree] = await chrome.bookmarks.getTree();
  const bookmarkBar = findBookmarkBarNode(tree);
  return bookmarkBar?.id || tree.children?.[0]?.id || tree.id;
}

async function openBookmarkFolder(folderId) {
  try {
    await chrome.tabs.create({
      url: `chrome://bookmarks/?id=${encodeURIComponent(folderId)}`,
      active: true,
    });
  } catch (_error) {
    // Ignore if Chrome blocks opening the manager directly.
  }
}

function findBookmarkBarNode(rootNode) {
  if (!rootNode) return null;

  const queue = [rootNode];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (
      current.id === '1' ||
      current.id === 'toolbar_____' ||
      current.title === 'Bookmarks bar' ||
      current.title === 'Bookmarks Bar' ||
      current.title === '书签栏'
    ) {
      return current;
    }

    if (Array.isArray(current.children)) {
      queue.push(...current.children);
    }
  }

  return null;
}

function pruneSelection() {
  const valid = new Set(state.allEntries.map((item) => item.url));
  for (const url of Array.from(state.selectedUrls)) {
    if (!valid.has(url)) state.selectedUrls.delete(url);
  }
}

function getSelectedItems() {
  return state.allEntries.filter((item) => state.selectedUrls.has(item.url));
}

function groupItemsByDomain(items) {
  return buildGroups(items);
}

function generateMarkdown(items) {
  const groups = groupItemsByDomain(items);
  const date = fileDateStamp();
  const lines = [t('markdownTitle', { date }), ''];

  for (const group of groups) {
    lines.push(`## ${group.domain}`);
    for (const item of group.items) {
      lines.push(`- [${escapeMarkdown(item.title || item.url)}](${item.url})`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

function generateDailyNote(items) {
  const groups = groupItemsByDomain(items);
  const now = new Date();
  const lines = [
    t('dailyNoteTitle', { date: fileDateStamp() }),
    '',
    t('snapshot'),
    t('timeWindowLine', { value: rangeLabel(true) }),
    t('selectedLinksLine', { count: items.length }),
    t('domainsCoveredLine', { count: groups.length }),
    '',
    t('focusDomains'),
  ];

  for (const group of groups.slice(0, 5)) {
    lines.push(`- ${group.label} (${group.items.length}${localeCode === 'zh' ? ' 条链接' : ' links'})`);
  }

  lines.push('');
  lines.push(t('suggestedWorkLog'));
  lines.push(t('strongestConcentration', {
    links: items.length,
    domains: groups.length,
    focus: groups.slice(0, 3).map((group) => group.label).join(localeCode === 'zh' ? '、' : ', ') || t('recentResearch'),
  }));
  lines.push(t('mainThemesTouched'));

  for (const group of groups) {
    const sampleTitles = group.items.slice(0, 3).map((item) => item.title || item.url);
    lines.push(`- ${group.label}: ${sampleTitles.join('; ')}`);
  }

  lines.push('');
  lines.push(t('linkAppendix'));
  lines.push(generateMarkdown(items).trim());
  lines.push('');
  lines.push(t('generatedLocally', {
    date: friendlyDate.format(now),
    time: timeFormatter.format(now),
  }));

  return lines.join('\n');
}

async function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      url,
      filename,
      saveAs: true,
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function rangeLabel(long = false) {
  if (state.range === '4h') return long ? t('last4Hours') : '4h';
  if (state.range === '3d') return long ? t('last3Days') : '3d';
  if (state.range === '7d') return long ? t('last7Days') : '7d';
  if (state.range === 'custom') return long ? t('customTimeRange') : (localeCode === 'zh' ? '自定义' : 'custom');
  return long ? t('last24Hours') : '24h';
}

function buildDomainSummary(group) {
  const firstVisit = group.items[0];
  const latestTime = firstVisit ? formatVisitTime(firstVisit.lastVisitTime) : t('unknown');
  return t('domainSummary', {
    count: group.items.length,
    pageWord: countWord('pageWord', group.items.length),
    time: latestTime,
  });
}

function formatVisitTime(timestamp) {
  if (!timestamp) return t('unknownTime');
  const date = new Date(timestamp);
  if (isSameDay(date, new Date())) {
    return timeFormatter.format(date);
  }

  return `${formatShortDate(date)} · ${timeFormatter.format(date)}`;
}

function shouldHideHistoryUrl(parsedUrl) {
  const path = parsedUrl.pathname.toLowerCase();
  const search = parsedUrl.search.toLowerCase();
  const hash = parsedUrl.hash.toLowerCase();
  const combined = `${path}${search}${hash}`;

  const noisyPatterns = [
    'redirect',
    'callback',
    'login',
    'signin',
    'sign-in',
    'sso',
    'oauth',
    'auth',
    'token=',
    'code=',
    'state=',
    'session',
    'continue=',
    'returnto=',
    'returnurl=',
    'redirect_uri=',
  ];

  return noisyPatterns.some((pattern) => combined.includes(pattern));
}

function formatDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    const compact = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}${parsed.search}`;
    return compact.length > 88 ? `${compact.slice(0, 85)}...` : compact;
  } catch (_error) {
    return url.length > 88 ? `${url.slice(0, 85)}...` : url;
  }
}

function formatSavedAt(savedAt) {
  if (!savedAt) return t('justSaved');
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return t('justSaved');
  if (isSameDay(date, new Date())) {
    return timeFormatter.format(date);
  }

  return `${formatShortDate(date)} · ${timeFormatter.format(date)}`;
}

function formatShortDate(date) {
  return shortDateFormatter.format(date);
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function fileDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeMarkdown(value) {
  return String(value).replace(/[[\]()*_`]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message) {
  elements.toastText.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2200);
}

function friendlyDomain(domain) {
  const known = {
    'github.com': 'GitHub',
    'google.com': 'Google',
    'chatgpt.com': 'ChatGPT',
    'claude.ai': 'Claude',
    'developer.mozilla.org': 'MDN',
    'youtube.com': 'YouTube',
    'arxiv.org': 'arXiv',
  };

  if (known[domain]) return known[domain];

  return domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|ai|dev|app|co)$/, '')
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cleanTitle(title, domain) {
  if (!title) return domain;
  const separators = [' - ', ' | ', ' — ', ' · ', ' – '];
  for (const separator of separators) {
    const parts = title.split(separator);
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1].trim().toLowerCase();
      if (suffix === domain.toLowerCase() || suffix === domain.replace(/^www\./, '').toLowerCase()) {
        return parts.slice(0, -1).join(separator).trim();
      }
    }
  }
  return title.trim();
}

init();
