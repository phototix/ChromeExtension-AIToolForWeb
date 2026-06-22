const tabId = chrome.devtools.inspectedWindow.tabId;
const port = chrome.runtime.connect({ name: `panel-${tabId}` });
let currentTaskId = null;

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

document.getElementById('btnAddTask').addEventListener('click', () => {
  const input = document.getElementById('taskInput');
  const task = input.value.trim();
  if (!task) return;
  port.postMessage({ type: 'execute-task', task });
  input.value = '';
});

document.getElementById('btnExecute').addEventListener('click', () => {
  port.postMessage({ type: 'resume-task' });
});

document.getElementById('btnPause').addEventListener('click', () => {
  port.postMessage({ type: 'pause-task' });
});

document.getElementById('btnCancel').addEventListener('click', () => {
  port.postMessage({ type: 'cancel-task' });
  document.getElementById('actionLog').innerHTML = '';
  document.getElementById('planView').innerHTML = '<p class="hint">Cancelled.</p>';
});

function addLogEntry(msg) {
  const log = document.getElementById('actionLog');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  if (msg.action) {
    entry.classList.add('running');
    entry.innerHTML = `<span class="action">${msg.action.action}</span>
      <span class="desc">${msg.action.description || msg.action.selector || ''}</span>
      <div class="result">Step ${msg.step}/${msg.total}</div>`;
  } else if (msg.result) {
    entry.classList.add(msg.result.success !== false ? 'success' : 'failed');
    entry.innerHTML = `<span class="action">${msg.message}</span>
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

function renderPlan(plan, reasoning) {
  const view = document.getElementById('planView');
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
  document.getElementById('btnExecute').disabled = executing;
  document.getElementById('btnPause').disabled = !executing;
  document.getElementById('btnCancel').disabled = !executing && !taskId;
}
