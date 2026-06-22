function buildPlanPrompt(task, pageStructure) {
  return [
    {
      role: 'system',
      content: `You are a browser automation AI. Given a task and the current page structure, generate a JSON array of actions.

Available actions:
- click(selector) — click element at CSS selector
- type(selector, value) — type text into input
- scroll(selector|px) — scroll to element or by pixels
- read(selector) — get text content of element (use this to extract data)
- modify(selector, property, value) — change attribute/style/innerHTML
- wait(ms) — wait milliseconds
- screenshot() — capture visible page
- getStructure() — re-fetch page structure after navigation
- runJS(code) — execute arbitrary JS
- summarize(context) — after collecting data, call this to generate a text summary

Pagination rules:
- After search results load, look for pagination buttons: "Next", "→", "›", page numbers
- Common selectors: a[aria-label="Next"], a[rel="next"], .pagination a, .next, button:has-text("Next")
- On each page: read() the results, screenshot(), then click the next page button
- Repeat until all requested pages are collected

Final step: After collecting all data from all pages, use summarize() with the collected text to produce a comprehensive summary of findings.

Response format (JSON only, no markdown):
{
  "plan": [
    { "action": "click", "selector": "#search-btn", "description": "Click search button" },
    { "action": "wait", "ms": 2000, "description": "Wait for results" },
    { "action": "read", "selector": ".result", "description": "Read results" }
  ],
  "reasoning": "First click search, then wait for results, then read the content."
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
