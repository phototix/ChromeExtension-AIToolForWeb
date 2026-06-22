let tabId, port, currentTaskId = null;

function connect() {
  tabId = chrome.devtools.inspectedWindow.tabId;
  try {
    port = chrome.runtime.connect({ name: `panel-${tabId}` });
    port.onMessage.addListener(msg => {
      switch (msg.type) {
        case 'task-progress':
          addLogEntry(msg);
          break;
        case 'task-complete':
          addLogEntry({ message: '✅ Task complete', result: { steps: msg.steps } });
          currentTaskId = null;
          break;
        case 'task-error':
          addLogEntry({ message: `❌ Error: ${msg.error}`, error: true });
          currentTaskId = null;
          break;
        case 'plan-ready':
          renderPlan(msg.plan, msg.reasoning);
          break;
        case 'queue-update':
          renderQueue(msg.queue);
          break;
        case 'status-update':
          updateControls(msg.executing, msg.currentTaskId);
          break;
      }
    });
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) { /* ignore */ }
      port = null;
      setTimeout(connect, 1000);
    });
  } catch (e) {
    port = null;
    setTimeout(connect, 1000);
  }
}

function post(msg) {
  if (!port) { addLogEntry({ message: '⚠ Disconnected. Reconnecting...' }); return; }
  try { port.postMessage(msg); } catch (e) { port = null; setTimeout(connect, 1000); }
}

function init() {
  connect();
  const $ = id => document.getElementById(id);
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

  on('btnAddTask', 'click', () => {
    const input = $('taskInput');
    if (!input) return;
    const task = input.value.trim();
    if (!task) return;
    post({ type: 'execute-task', task });
    input.value = '';
  });

  on('btnExecute', 'click', () => { post({ type: 'resume-task' }); post({ type: 'approve-step' }); });
  on('btnPause', 'click', () => post({ type: 'pause-task' }));

  on('btnCancel', 'click', () => {
    post({ type: 'cancel-task' });
    const log = $('actionLog'); if (log) log.innerHTML = '';
    const plan = $('planView'); if (plan) plan.innerHTML = '<p class="hint">Cancelled.</p>';
  });
}

function addLogEntry(msg) {
  const log = document.getElementById('actionLog');
  if (!log) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  if (msg.action) {
    entry.classList.add('running');
    entry.innerHTML = `<span class="action">${msg.action.action}</span>
      <span class="desc">${msg.action.description || msg.action.selector || ''}</span>
      <div class="result">Step ${msg.step}/${msg.total}</div>`;
  } else if (msg.result && msg.result.screenshotUrl) {
    entry.classList.add('success');
    entry.innerHTML = `<span class="action">📷 Screenshot captured</span>
      <img class="screenshot-thumb" src="${msg.result.screenshotUrl}" onclick="showScreenshot(this.src)">`;
  } else if (msg.result) {
    entry.classList.add(msg.result.success !== false ? 'success' : 'failed');
    entry.innerHTML = `<span class="action">${msg.message || (typeof msg.result.data === 'object' ? JSON.stringify(msg.result.data) : msg.result.data) || (msg.result.success ? 'done' : 'failed')}</span>
      <div class="result">${msg.result.error ? 'Error: ' + msg.result.error : ''}</div>`;
  } else if (msg.error) {
    entry.classList.add('failed');
    entry.innerHTML = `<span class="action">${msg.message}</span>`;
  } else {
    entry.innerHTML = `<span class="action">${msg.message}</span>`;
  }

  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function showScreenshot(src) {
  const overlay = document.getElementById('screenshotOverlay');
  const img = document.getElementById('screenshotFull');
  img.src = src;
  overlay.style.display = 'flex';
}

document.addEventListener('click', e => {
  const overlay = document.getElementById('screenshotOverlay');
  if (e.target === overlay) overlay.style.display = 'none';
});

function renderPlan(plan, reasoning) {
  const view = document.getElementById('planView');
  if (!view) return;
  view.innerHTML = '';
  if (reasoning) {
    const r = document.createElement('p');
    r.style.cssText = 'font-size: 11px; color: #a6adc8; margin-bottom: 8px; font-style: italic;';
    r.textContent = reasoning;
    view.appendChild(r);
  }
  plan.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'step';
    div.innerHTML = `<span class="action">${i + 1}. ${step.action}</span>
      <span class="desc">${step.selector || ''} ${step.value ? '="' + step.value + '"' : ''}</span>`;
    view.appendChild(div);
  });
}

function renderQueue(queue) {
  const list = document.getElementById('taskList');
  if (!list) return;
  list.innerHTML = '';
  queue.forEach(task => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = `status ${task.status}`;
    span.textContent = task.status;
    li.textContent = task.text.slice(0, 60);
    li.appendChild(span);
    list.appendChild(li);
  });
}

function updateControls(executing, taskId) {
  currentTaskId = taskId;
  const $ = id => document.getElementById(id);
  const btnExec = $('btnExecute');
  const btnPause = $('btnPause');
  const btnCancel = $('btnCancel');
  if (btnExec) btnExec.disabled = executing;
  if (btnPause) btnPause.disabled = !executing;
  if (btnCancel) btnCancel.disabled = !executing && !taskId;
}

document.addEventListener('DOMContentLoaded', init);
