document.getElementById('openDevTools').addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'open-devtools' });
  });
});

document.getElementById('openSettings').addEventListener('click', e => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
