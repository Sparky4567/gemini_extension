// background.js (MV3 service worker)
// Responsible for: context menu lifecycle, calls to Gemini API, sending messages to content scripts.

const defaultPresets = [
  { id: 'p1', title: '👔 Professional', prompt: 'Rewrite this to be professional and clear.' },
  { id: 'p2', title: '✂️ Shorten', prompt: 'Concise and punchy. Remove fluff.' },
  { id: 'p3', title: '🤔 Explain', prompt: 'Explain this concept simply.' }
];

chrome.runtime.onInstalled.addListener(refreshMenus);
chrome.runtime.onStartup.addListener(refreshMenus);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.customPresets) {
    refreshMenus();
  }
});

function refreshMenus() {
  chrome.contextMenus.removeAll(() => {
    // static items
    chrome.contextMenus.create({
      id: "continue_text",
      title: "🚀 Continue writing...",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "sep1",
      type: "separator",
      contexts: ["selection"]
    });

    // dynamic presets (load from storage)
    chrome.storage.local.get(['customPresets'], (res) => {
      const presets = res.customPresets || defaultPresets;
      for (const p of presets) {
        chrome.contextMenus.create({
          id: p.id,
          title: p.title,
          contexts: ["selection"]
        });
      }
    });
  });
}

// Helper: promisified storage get
function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (res) => resolve(res || {}));
  });
}

// Helper: call Gemini API
async function callGemini(model, apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini API error: ${resp.status} ${txt}`);
  }

  return resp.json();
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // If no tab (e.g., clicked from a non-tab context) bail
  if (!tab || !tab.id) return;

  const selectionText = info.selectionText || '';
  if (!selectionText.trim()) return;

  const { geminiApiKey, selectedModel, customPresets } = await getStorage(['geminiApiKey', 'selectedModel', 'customPresets']);

  if (!geminiApiKey) {
    // Ask the content script to show an alert in the page frame where the menu was used
    const frameId = (typeof info.frameId !== 'undefined') ? info.frameId : 0;
    chrome.tabs.sendMessage(tab.id, { action: 'alert', message: '⚠️ Please set your API Key in the Gemini Extension Panel first.' }, { frameId }, () => {});
    return;
  }

  // Determine prompt
  const model = selectedModel || 'gemini-2.5-flash';
  const presets = customPresets || defaultPresets;

  let prompt = '';
  if (info.menuItemId === 'continue_text') {
    prompt = `Continue the following text naturally. Return ONLY the new text: "${selectionText}"`;
  } else {
    const preset = presets.find(p => p.id === info.menuItemId);
    if (preset) {
      prompt = `${preset.prompt} Return ONLY the rewritten text: "${selectionText}"`;
    }
  }

  if (!prompt) return;

  // Optional: tell the page to show a busy cursor
  const frameId = (typeof info.frameId !== 'undefined') ? info.frameId : 0;
  chrome.tabs.sendMessage(tab.id, { action: 'setCursor', cursor: 'wait' }, { frameId }, () => {});

  try {
    const data = await callGemini(model, geminiApiKey, prompt);
    // safe path to the text (guarding against unexpected response shape)
    const newText = (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.response?.output ?? // other possible shapes
      ''
    ).toString().trim();

    if (!newText) {
      throw new Error('Empty response from Gemini API');
    }

    // Send the injection request to the correct frame (if available)
    chrome.tabs.sendMessage(tab.id, {
      action: 'inject',
      text: newText,
      mode: info.menuItemId
    }, { frameId }, (resp) => {
      if (chrome.runtime.lastError) {
        // This can occur if no content script is present in that frame or messaging fails
        console.warn('Failed to send message to content script:', chrome.runtime.lastError.message);
        // As a fallback, try to send to top frame
        chrome.tabs.sendMessage(tab.id, { action: 'inject', text: newText, mode: info.menuItemId }, (resp2) => {
          if (chrome.runtime.lastError) console.error('Fallback messaging failed:', chrome.runtime.lastError.message);
        });
      }
    });
  } catch (err) {
    console.error('Gemini error:', err);
    // Inform user on the page
    chrome.tabs.sendMessage(tab.id, { action: 'alert', message: `Gemini Error: ${err.message}` }, { frameId }, () => {});
  } finally {
    // Reset cursor
    chrome.tabs.sendMessage(tab.id, { action: 'setCursor', cursor: 'default' }, { frameId }, () => {});
  }
});
