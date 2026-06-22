function buildPlanPrompt(task, pageStructure) {
  return [
    {
      role: 'system',
      content: `You are a browser automation AI. Given a task and the current page structure, generate a JSON array of actions.

Available actions:
- click(selector) — click element at CSS selector
- type(selector, value) — type text into input
- scroll(selector|px) — scroll to element or by pixels
- read(selector) — get text content of element
- modify(selector, property, value) — change attribute/style/innerHTML
- wait(ms) — wait milliseconds
- screenshot() — capture visible page
- getStructure() — re-fetch page structure
- runJS(code) — execute arbitrary JS

Response format (JSON only):
{
  "plan": [
    { "action": "click", "selector": "#search-btn", "description": "Click search button" },
    { "action": "wait", "ms": 2000, "description": "Wait for results" }
  ],
  "reasoning": "First click search, then wait for results to load."
}`
    },
    {
      role: 'user',
      content: `Task: ${task}\n\nCurrent page structure:\n${pageStructure}`
    }
  ];
}

function buildRefinePrompt(task, previousResult, remainingPlan) {
  return [
    {
      role: 'system',
      content: 'You are a browser automation AI. Given the previous action result and remaining plan, adjust the next steps if needed. Respond with updated JSON plan or empty array if on track.'
    },
    {
      role: 'user',
      content: `Task: ${task}\n\nPrevious result: ${previousResult}\n\nRemaining plan: ${JSON.stringify(remainingPlan)}\n\nRespond with updated plan JSON or [] to continue.`
    }
  ];
}
