'use strict';

async function updateBadge() {
  try {
    const now = Date.now();
    const dayStart = now - (24 * 60 * 60 * 1000);
    const items = await chrome.history.search({
      text: '',
      startTime: dayStart,
      endTime: now,
      maxResults: 10000,
    });

    const count = items.filter((item) => item.url && /^https?:/i.test(item.url)).length;

    await chrome.action.setBadgeText({
      text: count > 0 ? String(Math.min(count, 999)) : '',
    });

    let color = '#5a7a62';
    if (count > 80) color = '#b35a5a';
    else if (count > 30) color = '#c8713a';

    await chrome.action.setBadgeBackgroundColor({ color });
  } catch (error) {
    console.warn('[tab-gem] badge update failed', error);
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.history.onVisited.addListener(updateBadge);
chrome.history.onVisitRemoved.addListener(updateBadge);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'tab-gem:refresh-badge') {
    updateBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

updateBadge();
