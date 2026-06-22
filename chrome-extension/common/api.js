async function callAI(messages, settings) {
  const { apiKey, apiProvider, model } = settings;

  if (!apiKey) throw new Error('API key not configured. Set it in extension settings.');

  if (apiProvider === 'openai') {
    return callOpenAI(messages, apiKey, model);
  }
  if (apiProvider === 'anthropic') {
    return callAnthropic(messages, apiKey, model);
  }
  throw new Error(`Unknown provider: ${apiProvider}`);
}

async function callOpenAI(messages, apiKey, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages,
      temperature: 0.2,
      max_tokens: 4000
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(messages, apiKey, model) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-opus-20240229',
      system: systemMsg?.content || '',
      messages: userMsgs,
      max_tokens: 4000,
      temperature: 0.2
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic error: ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}
