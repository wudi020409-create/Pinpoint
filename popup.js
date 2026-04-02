// popup.js — Pinpoint v4.1
document.getElementById('launchBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle', state: true });
    window.close();
    return;
  } catch (e) {}

  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    setTimeout(async () => {
      try { await chrome.tabs.sendMessage(tab.id, { action: 'toggle', state: true }); } catch (e2) {}
    }, 150);
  } catch (err) { console.error('注入失败:', err); }

  window.close();
});
