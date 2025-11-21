// --- DOM ELEMENTS ---
const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelector = document.getElementById('model-selector');
const presetsList = document.getElementById('presets-list');
const addPresetBtn = document.getElementById('add-preset-btn');

// --- STATE MANAGEMENT ---
const defaultPresets = [
    { id: 'p1', title: '👔 Professional', prompt: 'Rewrite this to be professional and clear.' },
    { id: 'p2', title: '✂️ Shorten', prompt: 'Concise and punchy. Remove fluff.' },
    { id: 'p3', title: '🤔 Explain', prompt: 'Explain this concept simply.' }
];

// Initialize
loadSettings();

// --- EVENT LISTENERS ---

// UI Toggles
settingsBtn.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsOverlay.classList.add('hidden'));

// Save API Key
apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ geminiApiKey: apiKeyInput.value.trim() });
});

// Save Model
modelSelector.addEventListener('change', () => {
    chrome.storage.local.set({ selectedModel: modelSelector.value });
});

// Add Preset
addPresetBtn.addEventListener('click', () => {
    const title = document.getElementById('new-preset-title').value.trim();
    const prompt = document.getElementById('new-preset-prompt').value.trim();
    if(!title || !prompt) return;

    chrome.storage.local.get(['customPresets'], (res) => {
        const current = res.customPresets || defaultPresets;
        const updated = [...current, { id: `p_${Date.now()}`, title, prompt }];
        chrome.storage.local.set({ customPresets: updated }, loadSettings);
        
        // Clear inputs
        document.getElementById('new-preset-title').value = '';
        document.getElementById('new-preset-prompt').value = '';
    });
});

// Chat - Send on Click or Shift+Enter
sendBtn.addEventListener('click', sendMessage);
promptInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// --- LOGIC FUNCTIONS ---

function loadSettings() {
    chrome.storage.local.get(['geminiApiKey', 'selectedModel', 'customPresets'], (res) => {
        if(res.geminiApiKey) apiKeyInput.value = res.geminiApiKey;
        if(res.selectedModel) modelSelector.value = res.selectedModel;
        
        // Render Presets
        const presets = res.customPresets || defaultPresets;
        presetsList.innerHTML = '';
        presets.forEach(p => {
            const div = document.createElement('div');
            div.className = 'preset-item';
            div.innerHTML = `<span>${p.title}</span> <span class="delete-preset" data-id="${p.id}">×</span>`;
            div.querySelector('.delete-preset').addEventListener('click', () => deletePreset(p.id));
            presetsList.appendChild(div);
        });
    });
}

function deletePreset(id) {
    chrome.storage.local.get(['customPresets'], (res) => {
        const current = res.customPresets || defaultPresets;
        const updated = current.filter(p => p.id !== id);
        chrome.storage.local.set({ customPresets: updated }, loadSettings);
    });
}

async function sendMessage() {
    const text = promptInput.value.trim();
    if(!text) return;
    
    addMessage('user', text);
    promptInput.value = '';
    const loadingMsg = addMessage('ai', 'Thinking...');

    chrome.storage.local.get(['geminiApiKey', 'selectedModel'], async (res) => {
        if(!res.geminiApiKey) {
            loadingMsg.innerText = "Error: Please set API Key in settings.";
            return;
        }

        const model = res.selectedModel || 'gemini-2.5-flash';
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${res.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
            });

            const data = await response.json();
            if(data.error) throw new Error(data.error.message);
            
            // Basic Formatting (Bold to HTML)
            let aiText = data.candidates[0].content.parts[0].text;
            aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Bold fix
            aiText = aiText.replace(/\n/g, '<br>'); // Newline fix
            
            loadingMsg.innerHTML = aiText;
        } catch (err) {
            loadingMsg.innerText = "Error: " + err.message;
        }
    });
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = text; // Use innerHTML to allow <br> and <b>
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return div;
}