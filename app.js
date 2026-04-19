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

const friendlyDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

async function init() {
  await restorePreferences();
  await loadStash();
  applyPreferenceInputs();
  attachEvents();
  updateGreeting();
  renderStash();
  await refreshHistory();
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
      showToast('Unselected all visible URLs');
      return;
    }

    for (const item of visibleItems) {
      state.selectedUrls.add(item.url);
    }

    renderGroups();
    updateStats();
    showToast('Selected all visible URLs');
  });

  elements.clearSelection.addEventListener('click', () => {
    state.selectedUrls.clear();
    renderGroups();
    updateStats();
    showToast('Selection cleared');
  });

  elements.refreshHistory.addEventListener('click', async () => {
    await refreshHistory();
  });

  elements.saveToBookmarks.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast('Select at least one URL first');
      return;
    }

    if (!chrome.bookmarks?.create) {
      showToast('Bookmarks permission is not active. Reload the extension and try again.');
      return;
    }

    try {
      const result = await saveSelectedToBookmarks(items);
      if (result.created > 0) {
        showToast(`Saved ${result.created} link${result.created === 1 ? '' : 's'} to ${BOOKMARK_FOLDER_TITLE}`);
        await openBookmarkFolder(result.folderId);
        return;
      }

      if (result.skipped > 0) {
        showToast(`All selected links were already in ${BOOKMARK_FOLDER_TITLE}`);
        await openBookmarkFolder(result.folderId);
        return;
      }

      showToast('No links were saved to bookmarks');
    } catch (error) {
      console.error('[tab-gem] bookmark save failed', error);
      showToast('Could not save bookmarks. Try reloading the extension.');
    }
  });

  elements.addToStash.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast('Select at least one URL first');
      return;
    }

    const added = await addItemsToStash(items);
    showToast(added > 0 ? `Added ${added} link${added === 1 ? '' : 's'} to your stash` : 'Those links are already in your stash');
  });

  elements.saveStashToBookmarks.addEventListener('click', async () => {
    if (state.stashItems.length === 0) {
      showToast('Your stash is empty');
      return;
    }

    try {
      const result = await saveSelectedToBookmarks(state.stashItems);
      if (result.created > 0) {
        showToast(`Saved ${result.created} stash link${result.created === 1 ? '' : 's'} to ${BOOKMARK_FOLDER_TITLE}`);
        await openBookmarkFolder(result.folderId);
        return;
      }

      showToast(`All stash links were already in ${BOOKMARK_FOLDER_TITLE}`);
      await openBookmarkFolder(result.folderId);
    } catch (error) {
      console.error('[tab-gem] stash bookmark save failed', error);
      showToast('Could not save stash to bookmarks');
    }
  });

  elements.clearStash.addEventListener('click', async () => {
    if (state.stashItems.length === 0) {
      showToast('Your stash is already empty');
      return;
    }

    state.stashItems = [];
    await persistStash();
    renderStash();
    showToast('Cleared your stash');
  });

  elements.openSelected.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast('Select at least one URL first');
      return;
    }

    await Promise.all(items.map((item) => chrome.tabs.create({ url: item.url, active: false })));
    showToast(`Opened ${items.length} selected URL${items.length === 1 ? '' : 's'}`);
  });

  elements.exportMarkdown.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast('Select at least one URL first');
      return;
    }

    const markdown = generateMarkdown(items);
    await downloadTextFile(markdown, `tab-gem-${fileDateStamp()}.md`);
    showToast('Markdown export started');
  });

  elements.generateSummary.addEventListener('click', async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      showToast('Select at least one URL first');
      return;
    }

    state.summaryMarkdown = generateDailyNote(items);
    elements.summaryOutput.value = state.summaryMarkdown;
    elements.summaryMeta.textContent = `${items.length} links across ${groupItemsByDomain(items).length} domains`;
    elements.summaryPanel.hidden = false;
    showToast('Daily note draft is ready');
  });

  elements.copySummary.addEventListener('click', async () => {
    if (!state.summaryMarkdown) return;
    await navigator.clipboard.writeText(state.summaryMarkdown);
    showToast('Daily note copied');
  });

  elements.downloadSummary.addEventListener('click', async () => {
    if (!state.summaryMarkdown) return;
    await downloadTextFile(state.summaryMarkdown, `tab-gem-daily-note-${fileDateStamp()}.md`);
    showToast('Daily note download started');
  });

  elements.stashList.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('[data-remove-stash-url]');
    if (removeButton) {
      await removeStashItem(removeButton.dataset.removeStashUrl);
      return;
    }
  });
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  document.getElementById('greeting').textContent = `${greeting}, here's your TabGem`;
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
    elements.groupMeta.textContent = 'Could not load history';
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
    elements.groupMeta.textContent = 'Loading...';
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
            <span class="mission-name">No matching history</span>
          </div>
          <div class="mission-summary">Try a wider time range or refresh again. Only regular web URLs are shown here.</div>
        </div>
      </article>
    `;
    elements.groupMeta.textContent = '0 domains';
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
    card.querySelector('.domain-visits').textContent = `${group.items.length} visit${group.items.length === 1 ? '' : 's'}`;
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
    miniAction.textContent = isCollapsed ? 'Expand' : 'Collapse';

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
  elements.groupMeta.textContent = `${state.groups.length} domain${state.groups.length === 1 ? '' : 's'}`;
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
  elements.selectVisible.textContent = allVisibleSelected ? 'Unselect visible' : 'Select visible';
}

function updateRefreshMeta() {
  if (!state.lastSync) return;
  elements.lastRefresh.textContent = `Last refreshed ${timeFormatter.format(state.lastSync)} · ${friendlyDate.format(state.lastSync)}`;
}

function renderStash() {
  elements.stashCount.textContent = `${state.stashItems.length} saved`;

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
      <button class="stash-remove" type="button" data-remove-stash-url="${escapeHtml(item.url)}">Remove</button>
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
  showToast('Removed link from stash');
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
  const lines = [`# Browsing roundup (${date})`, ''];

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
    `# Daily browsing note · ${fileDateStamp()}`,
    '',
    '## Snapshot',
    `- Time window: ${rangeLabel(true)}`,
    `- Selected links: ${items.length}`,
    `- Domains covered: ${groups.length}`,
    '',
    '## Focus domains',
  ];

  for (const group of groups.slice(0, 5)) {
    lines.push(`- ${group.label} (${group.items.length} links)`);
  }

  lines.push('');
  lines.push('## Suggested work log');
  lines.push(`Today I reviewed ${items.length} pages across ${groups.length} domains. The strongest concentration was around ${groups.slice(0, 3).map((group) => group.label).join(', ') || 'recent research'}.`);
  lines.push('The main themes I touched were:');

  for (const group of groups) {
    const sampleTitles = group.items.slice(0, 3).map((item) => item.title || item.url);
    lines.push(`- ${group.label}: ${sampleTitles.join('; ')}`);
  }

  lines.push('');
  lines.push('## Link appendix');
  lines.push(generateMarkdown(items).trim());
  lines.push('');
  lines.push(`Generated locally on ${friendlyDate.format(now)} at ${timeFormatter.format(now)}.`);

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
  if (state.range === '4h') return long ? 'the last 4 hours' : '4h';
  if (state.range === '3d') return long ? 'the last 3 days' : '3d';
  if (state.range === '7d') return long ? 'the last 7 days' : '7d';
  if (state.range === 'custom') return long ? 'your custom time range' : 'custom';
  return long ? 'the last 24 hours' : '24h';
}

function buildDomainSummary(group) {
  const firstVisit = group.items[0];
  const latestTime = firstVisit ? formatVisitTime(firstVisit.lastVisitTime) : 'unknown';
  return `${group.items.length} unique page${group.items.length === 1 ? '' : 's'} captured here. Most recent visit was ${latestTime}.`;
}

function formatVisitTime(timestamp) {
  if (!timestamp) return 'Unknown time';
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
  if (!savedAt) return 'Just saved';
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return 'Just saved';
  if (isSameDay(date, new Date())) {
    return timeFormatter.format(date);
  }

  return `${formatShortDate(date)} · ${timeFormatter.format(date)}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
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
