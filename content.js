// content.js
// Responsible for: DOM interactions, selection manipulation, alerts, cursor changes.
// Must be injected into all frames (manifest: all_frames: true)

function insertTextAtCursor(text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  // If range is inside a non-editable element, try to find an editable ancestor
  // but for now we proceed with the selection's range.
  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // Move cursor after inserted text
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}

function replaceSelectedText(replacementText, mode) {
  try {
    const activeElement = document.activeElement;

    // Inputs & textareas
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      const start = activeElement.selectionStart ?? 0;
      const end = activeElement.selectionEnd ?? start;
      const originalText = activeElement.value || '';

      const finalText =
        mode === 'continue_text'
          ? originalText.slice(0, end) + ' ' + replacementText + originalText.slice(end)
          : originalText.slice(0, start) + replacementText + originalText.slice(end);

      activeElement.value = finalText;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      // place caret after inserted text
      const pos = (mode === 'continue_text') ? end + 1 + replacementText.length : start + replacementText.length;
      try { activeElement.setSelectionRange(pos, pos); } catch (e) {}
      return true;
    }

    // If selection exists in a contentEditable or rich editor, use range insertion
    if (insertTextAtCursor(replacementText)) {
      return true;
    }

    // As a last resort, try to find an editable element under focus
    const editable = document.querySelector('[contenteditable="true"], [data-cke-editable], .editor, .ql-editor');
    if (editable) {
      // Try inserting as text at end
      editable.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.collapse(false);
        range.insertNode(document.createTextNode(replacementText));
        return true;
      } else {
        editable.textContent += replacementText;
        return true;
      }
    }

    // Fallback: show the result to the user
    alert('Gemini Result:\n\n' + replacementText);
    return false;
  } catch (err) {
    console.error('replaceSelectedText error:', err);
    alert('Injection error: ' + err.message);
    return false;
  }
}

// Message listener from the background/service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) {
    sendResponse({ success: false, error: 'invalid message' });
    return;
  }

  try {
    if (msg.action === 'inject') {
      const ok = replaceSelectedText(msg.text, msg.mode);
      sendResponse({ success: ok });
      return; // synchronous response
    }

    if (msg.action === 'alert') {
      window.alert(msg.message);
      sendResponse({ success: true });
      return;
    }

    if (msg.action === 'setCursor') {
      try {
        document.body.style.cursor = msg.cursor || 'default';
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      return;
    }

    sendResponse({ success: false, error: 'unknown action' });
  } catch (e) {
    console.error('content script handler error', e);
    sendResponse({ success: false, error: e.message });
  }

  // Keep in mind this listener is synchronous in this file; if you wanted to call sendResponse asynchronously,
  // return true to indicate you will call sendResponse later.
});
