const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  API_PROVIDER: 'apiProvider',
  MODEL: 'model',
  SYSTEM_PROMPT: 'systemPrompt',
  MAX_STEPS: 'maxSteps',
  ACTION_DELAY: 'actionDelay',
  RETRY_COUNT: 'retryCount',
  CONFIRM_REQUIRED: 'confirmRequired',
  THEME: 'theme',
  TASK_QUEUE: 'taskQueue'
};

const DEFAULTS = {
  API_PROVIDER: 'openai',
  MODEL: 'gpt-4o',
  SYSTEM_PROMPT: `You are a browser automation AI. Given a task and current page structure, generate a JSON array of actions.
Available actions: click, type, scroll, read, modify, wait, screenshot, getStructure, runJS.
Respond only with valid JSON: { "plan": [...], "reasoning": "..." }`,
  MAX_STEPS: 20,
  ACTION_DELAY: 500,
  RETRY_COUNT: 2,
  CONFIRM_REQUIRED: true,
  THEME: 'dark'
};

async function get(key) {
  const data = await chrome.storage.sync.get(key);
  return data[key];
}

async function set(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

async function getAll(keys) {
  return chrome.storage.sync.get(keys);
}

async function setAll(obj) {
  return chrome.storage.sync.set(obj);
}

async function getDefaults() {
  const data = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...data };
}

async function saveTaskQueue(queue) {
  await chrome.storage.local.set({ [STORAGE_KEYS.TASK_QUEUE]: queue });
}

async function loadTaskQueue() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.TASK_QUEUE);
  return data[STORAGE_KEYS.TASK_QUEUE] || [];
}
