importScripts('common/storage.js', 'common/messages.js', 'common/api.js', 'common/prompts.js');

let panelPorts = {};
let taskQueue = [];
let isExecuting = false;
let currentTaskId = null;
let abortController = null;

loadTaskQueue().then(q => { taskQueue = q; });

chrome.runtime.onConnect.addListener(port => {
  if (port.name.startsWith('panel-')) {
    const tabId = port.name.replace('panel-', '');
    panelPorts[tabId] = port;
    port.onMessage.addListener(msg => handlePanelMessage(msg, tabId, port));
    port.onDisconnect.addListener(() => { delete panelPorts[tabId]; });
  }
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
      port.postMessage({ type: MSG.STATUS_UPDATE, executing: isExecuting, currentTaskId });
      break;
    case MSG.GET_TASK_QUEUE:
      port.postMessage({ type: MSG.QUEUE_UPDATE, queue: taskQueue });
      break;
    case MSG.APPROVE_STEP:
      if (pendingStepResolve) { pendingStepResolve(true); pendingStepResolve = null; }
      break;
    case MSG.REJECT_STEP:
      if (pendingStepResolve) { pendingStepResolve(false); pendingStepResolve = null; }
      break;
  }
}

let pendingStepResolve = null;

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
  port.postMessage({ type: MSG.TASK_PROGRESS, taskId: task.id, step: 'planning', message: 'Generating action plan...' });

  try {
    const settings = await getDefaults();
    const structure = await getPageStructure(tabId);
    const prompt = buildPlanPrompt(task.text, structure);
    const planText = await callAI(prompt, settings);
    const parsed = JSON.parse(planText);

    if (!parsed.plan || parsed.plan.length === 0) throw new Error('AI returned empty plan');

    task.plan = parsed.plan;
    task.reasoning = parsed.reasoning;
    port.postMessage({ type: MSG.PLAN_READY, taskId: task.id, plan: parsed.plan, reasoning: parsed.reasoning });

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
      port.postMessage({ type: MSG.TASK_PROGRESS, taskId: task.id, step: i + 1, total: parsed.plan.length, action: step, message: step.description });

      const result = await executeAction(tabId, step);
      task.steps.push({ ...step, result, status: result.success ? 'done' : 'failed' });
      port.postMessage({ type: MSG.TASK_PROGRESS, taskId: task.id, step: i + 1, total: parsed.plan.length, result });

      if (!result.success) {
        if (i < parsed.plan.length - 1) {
          const refinePrompt = buildRefinePrompt(task.text, JSON.stringify(result), parsed.plan.slice(i));
          const refinedText = await callAI(refinePrompt, settings);
          const refined = JSON.parse(refinedText);
          if (refined.plan && refined.plan.length > 0) {
            parsed.plan = [...parsed.plan.slice(0, i + 1), ...refined.plan];
            port.postMessage({ type: MSG.PLAN_READY, taskId: task.id, plan: parsed.plan });
          }
        }
      }

      if (settings.actionDelay > 0) await new Promise(r => setTimeout(r, settings.actionDelay));
    }

    task.status = 'done';
    port.postMessage({ type: MSG.TASK_COMPLETE, taskId: task.id, steps: task.steps });
  } catch (err) {
    task.status = err.message === 'Cancelled' ? 'cancelled' : 'failed';
    port.postMessage({ type: MSG.TASK_ERROR, taskId: task.id, error: err.message });
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
  try {
    const result = await chrome.tabs.sendMessage(tabId, { action: step.action, ...step });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function broadcastQueue() {
  Object.values(panelPorts).forEach(port => {
    port.postMessage({ type: MSG.QUEUE_UPDATE, queue: taskQueue });
  });
}
