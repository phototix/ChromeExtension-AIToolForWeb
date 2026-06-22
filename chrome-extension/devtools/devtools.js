chrome.devtools.panels.create(
  'AI Workspace',
  '',
  'devtools/panel.html',
  panel => {
    panel.onShown.addListener(win => {
      if (win.__loaded) return;
      win.__loaded = true;
    });
  }
);
