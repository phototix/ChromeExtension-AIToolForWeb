importScripts('common/storage.js', 'common/messages.js', 'common/api.js', 'common/prompts.js');

self.onerror = msg => console.error('SW error:', msg);
self.addEventListener('unhandledrejection', e => { console.error('SW unhandled:', e.reason); e.preventDefault(); });

let panelPorts = {};
let taskQueue = [];
let isExecuting = false;
let currentTaskId = null;
let abortController = null;
let pendingStepResolve = null;

setInterval(() => {
  if (taskQueue.length > 0 || isExecuting) chrome.storage.local.get('keepalive', () => {});
}, 20000);

loadTaskQueue().then(q => { taskQueue = q; });

chrome.runtime.onConnect.addListener(port => {
  if (!port.name.startsWith('panel-')) return;
  const tabId = parseInt(port.name.replace('panel-', ''), 10);
  panelPorts[tabId] = port;
  port.onMessage.addListener(msg => handlePanelMessage(msg, tabId, port));
  port.onDisconnect.addListener(() => { delete panelPorts[tabId]; });
});

async function handlePanelMessage(msg, tabId, port) {
  switch (msg.type) {
    case MSG.EXECUTE_TASK:
      await addTask({ id: Date.now().toString(), text: msg.task, status: 'pending', steps: [], createdAt: Date.now() });
      if (!isExecuting) executeNextTask(tabId, port);
      break;
    case MSG.CANCEL_TASK:
      if (abortController) abortController.abort();
      isExecuting = false;
      currentTaskId = null;
      break;
    case MSG.PAUSE_TASK:
      isExecuting = false;
      break;
    case MSG.RESUME_TASK:
      if (taskQueue.length > 0 && !isExecuting) executeNextTask(tabId, port);
      break;
    case MSG.GET_STATUS:
      safePost(port, { type: MSG.STATUS_UPDATE, executing: isExecuting, currentTaskId });
      break;
    case MSG.GET_TASK_QUEUE:
      safePost(port, { type: MSG.QUEUE_UPDATE, queue: taskQueue });
      break;
    case MSG.APPROVE_STEP:
      if (pendingStepResolve) { pendingStepResolve(true); pendingStepResolve = null; }
      break;
    case MSG.REJECT_STEP:
      if (pendingStepResolve) { pendingStepResolve(false); pendingStepResolve = null; }
      break;
  }
}

async function addTask(task) {
  taskQueue.push(task);
  await saveTaskQueue(taskQueue);
  broadcastQueue();
}

async function executeNextTask(tabId, port) {
  if (taskQueue.length === 0) return;
  isExecuting = true;
  currentTaskId = taskQueue[0].id;
  abortController = new AbortController();

  const task = taskQueue[0];
  task.status = 'in-progress';
  broadcastQueue();
  safePost(port, { type: MSG.TASK_PROGRESS, taskId: task.id, step: 'planning', message: 'Generating action plan...' });

  try {
    const settings = await getDefaults();
    const structure = await getPageStructure(tabId);
    const planText = await callAI(buildPlanPrompt(task.text, structure), settings);
    const parsed = JSON.parse(planText.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '').trim());

    if (!parsed.plan || parsed.plan.length === 0) throw new Error('AI returned empty plan');

    task.plan = parsed.plan;
    task.reasoning = parsed.reasoning;
    safePost(port, { type: MSG.PLAN_READY, taskId: task.id, plan: parsed.plan, reasoning: parsed.reasoning });

    if (settings.confirmRequired) {
      await new Promise(resolve => { pendingStepResolve = resolve; });
    }

    for (let i = 0; i < parsed.plan.length; i++) {
      if (abortController.signal.aborted) throw new Error('Cancelled');
      if (!isExecuting) {
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (isExecuting || abortController.signal.aborted) { clearInterval(check); resolve(); }
          }, 200);
        });
        if (abortController.signal.aborted) throw new Error('Cancelled');
      }

      const step = parsed.plan[i];
      safePost(port, { type: MSG.TASK_PROGRESS, taskId: task.id, step: i + 1, total: parsed.plan.length, action: step, message: step.description });
      const result = await executeAction(tabId, step);
      task.steps.push({ ...step, result, status: result.success ? 'done' : 'failed' });
      safePost(port, { type: MSG.TASK_PROGRESS, taskId: task.id, step: i + 1, total: parsed.plan.length, result });

      if (!result.success && i < parsed.plan.length - 1) {
        try {
          const refinedText = await callAI(buildRefinePrompt(task.text, JSON.stringify(result), parsed.plan.slice(i)), settings);
          const refined = JSON.parse(refinedText.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '').trim());
          if (refined.plan && refined.plan.length > 0) {
            parsed.plan = [...parsed.plan.slice(0, i + 1), ...refined.plan];
            safePost(port, { type: MSG.PLAN_READY, taskId: task.id, plan: parsed.plan });
          }
        } catch (_) { /* refinement failed, continue with remaining plan */ }
      }

      if (settings.actionDelay > 0) await new Promise(r => setTimeout(r, settings.actionDelay));
    }

    task.status = 'done';
    safePost(port, { type: MSG.TASK_COMPLETE, taskId: task.id, steps: task.steps });
  } catch (err) {
    task.status = err.message === 'Cancelled' ? 'cancelled' : 'failed';
    safePost(port, { type: MSG.TASK_ERROR, taskId: task.id, error: err.message });
  }

  taskQueue.shift();
  await saveTaskQueue(taskQueue);
  broadcastQueue();
  currentTaskId = null;
  isExecuting = false;

  if (taskQueue.length > 0) executeNextTask(tabId, port);
}

async function getPageStructure(tabId) {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { action: MSG.GET_STRUCTURE });
    return result?.structure || '(unable to read page structure)';
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await new Promise(r => setTimeout(r, 300));
    const result = await chrome.tabs.sendMessage(tabId, { action: MSG.GET_STRUCTURE });
    return result?.structure || '(unable to read page structure)';
  }
}

async function executeAction(tabId, step) {
  if (step.action === 'wait') {
    const ms = step.ms || (step.value ? parseInt(step.value) : 2000);
    await new Promise(r => setTimeout(r, ms));
    return { success: true, data: `waited ${ms}ms` };
  }
  if (step.action === 'screenshot') {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      return { success: true, data: 'screenshot captured', screenshotUrl: dataUrl };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  try {
    const result = await chrome.tabs.sendMessage(tabId, { action: step.action, ...step });
    return { success: true, data: result };
  } catch (err) {
    if (err.message.includes('Receiving end does not exist')) {
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
        await new Promise(r => setTimeout(r, 300));
        const result = await chrome.tabs.sendMessage(tabId, { action: step.action, ...step });
        return { success: true, data: result };
      } catch (e2) {
        return { success: false, error: e2.message };
      }
    }
    return { success: false, error: err.message };
  }
}

function safePost(port, msg) {
  try { port.postMessage(msg); } catch (_) { /* port disconnected */ }
}

function broadcastQueue() {
  Object.values(panelPorts).forEach(p => safePost(p, { type: MSG.QUEUE_UPDATE, queue: taskQueue }));
}
