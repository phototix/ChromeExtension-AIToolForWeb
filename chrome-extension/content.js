chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'get-structure':
      sendResponse({ structure: getPageStructure() });
      break;
    case 'find-element':
      sendResponse({ element: findElement(msg.selector) });
      break;
    case 'click':
      sendResponse(doClick(msg.selector));
      break;
    case 'type':
      sendResponse(doType(msg.selector, msg.value));
      break;
    case 'scroll':
      sendResponse(doScroll(msg.selector, msg.px));
      break;
    case 'read':
      sendResponse(doRead(msg.selector));
      break;
    case 'modify':
      sendResponse(doModify(msg.selector, msg.property, msg.value));
      break;
    case 'highlight':
      sendResponse(doHighlight(msg.selector));
      break;
    case 'run-js':
      sendResponse(doRunJS(msg.code));
      break;
    case 'wait':
      break;
  }
  return true;
});

function getPageStructure() {
  const excludeTags = new Set(['script', 'style', 'link', 'meta', 'noscript']);
  const maxNodes = 200;
  let count = 0;

  function walk(node, depth = 0) {
    if (count >= maxNodes) return '';
    if (node.nodeType === 3) return '';
    if (excludeTags.has(node.tagName?.toLowerCase())) return '';

    count++;
    const tag = node.tagName?.toLowerCase() || '?';
    const id = node.id ? `#${node.id}` : '';
    const cls = node.className && typeof node.className === 'string'
      ? `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const text = node.innerText?.trim().slice(0, 60) || '';
    const attrs = ['role', 'aria-label', 'data-testid', 'placeholder', 'name', 'type', 'href']
      .map(a => node.getAttribute(a) ? `[${a}="${node.getAttribute(a)}"]` : '')
      .join('');

    let result = `${'  '.repeat(depth)}<${tag}${id}${cls}${attrs}>`;
    if (text && node.children.length === 0) result += ` "${text}"`;
    result += '\n';

    for (const child of node.children) {
      result += walk(child, depth + 1);
    }
    return result;
  }
  return `<!DOCTYPE html>\n${walk(document.body || document.documentElement)}`;
}

function findElement(selector) {
  try {
    const el = document.querySelector(selector);
    if (!el) {
      const byText = Array.from(document.querySelectorAll('a, button, span, div, input, label'))
        .find(e => e.textContent.trim().toLowerCase().includes(selector.toLowerCase()));
      if (byText) return tagWithPath(byText);
      return null;
    }
    return tagWithPath(el);
  } catch { return null; }
}

function tagWithPath(el) {
  if (!el) return null;
  return {
    tag: el.tagName?.toLowerCase(),
    id: el.id,
    classes: Array.from(el.classList).slice(0, 5),
    text: (el.innerText || '').trim().slice(0, 100),
    rect: el.getBoundingClientRect(),
    attrs: { href: el.getAttribute('href'), src: el.getAttribute('src'), 'aria-label': el.getAttribute('aria-label'), placeholder: el.getAttribute('placeholder'), name: el.getAttribute('name') }
  };
}

function doClick(selector) {
  try {
    const el = findElement(selector) || document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found' };
    el.click();
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function doType(selector, value) {
  try {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found' };
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function doScroll(selector, px) {
  try {
    if (selector) {
      const el = document.querySelector(selector);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return { success: true }; }
    }
    if (px !== undefined) {
      window.scrollBy(0, px);
      return { success: true };
    }
    return { success: false, error: 'No target' };
  } catch (e) { return { success: false, error: e.message }; }
}

function doRead(selector) {
  try {
    if (!selector) {
      const text = document.body.innerText.trim().slice(0, 10000);
      return { success: true, data: text };
    }
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found' };
    return { success: true, data: el.innerText || el.textContent || el.value || '' };
  } catch (e) { return { success: false, error: e.message }; }
}

function doModify(selector, property, value) {
  try {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found' };
    if (property === 'innerHTML') { el.innerHTML = value; return { success: true }; }
    if (property === 'style') { el.style.cssText = value; return { success: true }; }
    if (property === 'attr') {
      const [k, v] = value.split('=');
      el.setAttribute(k, v || '');
      return { success: true };
    }
    el[property] = value;
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function doHighlight(selector) {
  try {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found' };
    el.style.outline = '3px solid #ff5722';
    el.style.outlineOffset = '2px';
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2000);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function doRunJS(code) {
  try {
    const result = eval(code);
    return { success: true, data: String(result) };
  } catch (e) { return { success: false, error: e.message }; }
}
