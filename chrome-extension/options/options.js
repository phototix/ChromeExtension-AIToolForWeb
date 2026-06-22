const fields = ['apiKey', 'apiProvider', 'model', 'systemPrompt', 'maxSteps', 'actionDelay', 'retryCount', 'confirmRequired', 'theme'];

document.addEventListener('DOMContentLoaded', async () => {
  const data = await getAll(fields);
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = data[f] ?? defaults[f];
    else el.value = data[f] ?? defaults[f] ?? '';
  });
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const obj = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    if (el.type === 'checkbox') obj[f] = el.checked;
    else if (el.type === 'number') obj[f] = parseInt(el.value) || 0;
    else obj[f] = el.value;
  });
  await setAll(obj);
  document.getElementById('saveStatus').textContent = '✓ Saved';
  setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 2000);
});

document.getElementById('btnTestKey').addEventListener('click', async () => {
  const key = document.getElementById('apiKey').value;
  const provider = document.getElementById('apiProvider').value;
  if (!key) { document.getElementById('saveStatus').textContent = 'Enter an API key first'; return; }
  document.getElementById('saveStatus').textContent = 'Testing...';
  try {
    await callAI([{ role: 'user', content: 'Say hello' }], { apiKey: key, apiProvider: provider, model: 'gpt-4o' });
    document.getElementById('saveStatus').textContent = '✓ API key works';
  } catch (e) {
    document.getElementById('saveStatus').textContent = `✗ ${e.message}`;
  }
  setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 3000);
});
