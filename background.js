const defaultPresets = [
    { id: 'p1', title: '👔 Professional', prompt: 'Rewrite this to be professional and clear.' },
    { id: 'p2', title: '✂️ Shorten', prompt: 'Concise and punchy. Remove fluff.' },
    { id: 'p3', title: '🤔 Explain', prompt: 'Explain this concept simply.' }
];

// 1. Setup Menus on Install or Startup
chrome.runtime.onInstalled.addListener(refreshMenus);
chrome.runtime.onStartup.addListener(refreshMenus);

// 2. Listen for changes in Presets
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.customPresets) {
        refreshMenus();
    }
});

function refreshMenus() {
    chrome.contextMenus.removeAll(() => {
        
        // Static Commands
        chrome.contextMenus.create({ id: "continue_text", title: "🚀 Continue writing...", contexts: ["selection"] });
        chrome.contextMenus.create({ id: "sep1", type: "separator", contexts: ["selection"] });

        // Load Presets
        chrome.storage.local.get(['customPresets'], (res) => {
            const presets = res.customPresets || defaultPresets;
            presets.forEach(p => {
                chrome.contextMenus.create({
                    id: p.id,
                    title: p.title,
                    contexts: ["selection"]
                });
            });
        });
    });
}

// 3. Handle Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const text = info.selectionText;
    
    chrome.storage.local.get(['geminiApiKey', 'selectedModel', 'customPresets'], async (res) => {
        if (!res.geminiApiKey) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => alert("⚠️ Please set your API Key in the Gemini Extension Panel first.")
            });
            return;
        }

        // Determine Prompt
        let prompt = "";
        const model = res.selectedModel || "gemini-2.5-flash";
        const presets = res.customPresets || defaultPresets;

        if (info.menuItemId === "continue_text") {
            prompt = `Continue the following text naturally. Return ONLY the new text: "${text}"`;
        } else {
            const preset = presets.find(p => p.id === info.menuItemId);
            if (preset) prompt = `${preset.prompt} Return ONLY the rewritten text: "${text}"`;
        }

        if (!prompt) return;

        try {
            // Visual feedback (change cursor to wait)
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.style.cursor = 'wait'
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${res.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            const newText = data.candidates[0].content.parts[0].text.trim();

            // Inject Result
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: replaceSelectedText,
                args: [newText, info.menuItemId]
            });

        } catch (error) {
            console.error("Gemini Error:", error);
        } finally {
            // Reset cursor
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.style.cursor = 'default'
            });
        }
    });
});

// 4. Injection Logic
function replaceSelectedText(replacementText, mode) {
    const activeElement = document.activeElement;
    
    // Inputs & Textareas
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const originalText = activeElement.value;
        
        let finalText = "";
        if (mode === "continue_text") {
            finalText = originalText.slice(0, end) + " " + replacementText + originalText.slice(end);
        } else {
            finalText = originalText.slice(0, start) + replacementText + originalText.slice(end);
        }

        activeElement.value = finalText;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    } 
    // ContentEditable (Google Docs, specialized editors - harder to support perfectly, but simple ones work)
    else if (activeElement && activeElement.isContentEditable) {
        document.execCommand('insertText', false, replacementText);
    }
    else {
        alert("Gemini Result:\n\n" + replacementText);
    }
}