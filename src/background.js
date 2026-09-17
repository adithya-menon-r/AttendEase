const ATTENDANCE_URL = 'https://students.amrita.edu/client/class-attendance';

const isAttendancePage = (url) => typeof url === 'string' && url.startsWith(ATTENDANCE_URL);

async function openAttendancePage() {
  const [existing] = await chrome.tabs.query({ url: `${ATTENDANCE_URL}*` });

  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
    return;
  }

  await chrome.tabs.create({ url: ATTENDANCE_URL });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (isAttendancePage(tab?.url)) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'attendease:toggle' });
      return;
    } catch {
      // content script not yet loaded
      await chrome.tabs.reload(tab.id);
      return;
    }
  }

  await openAttendancePage();
});
