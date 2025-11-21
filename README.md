# Gemini Writing Engine (Chrome Extension)

**Version:** 2.0  
**Engine:** Google Gemini 1.5 (Flash & Pro)  
**Architecture:** Manifest V3 (Side Panel + Context Menus)

## 🚀 Overview
This extension integrates Google's Gemini LLM directly into the Chrome browser. It serves two distinct purposes:
1.  **The Side Panel:** A persistent chat interface for brainstorming, drafting, and "talking" to the AI without switching tabs.
2.  **The "Ghost" Writer (Context Menu):** A right-click tool that rewrites, fixes, or continues text inside *any* text box on the web (Email, Twitter, Reddit, CMS) without opening the interface.

## 🛠️ Installation

Since this is a custom "Developer Mode" extension, it is not installed from the Chrome Web Store.

1.  **Download/Save:** Ensure all 5 source files (`manifest.json`, `sidepanel.html`, `sidepanel.js`, `styles.css`, `background.js`) are in a single folder named `Gemini_Writing_Engine`.
2.  **Open Chrome Extensions:** Go to `chrome://extensions/` in your browser.
3.  **Enable Developer Mode:** Toggle the switch in the top-right corner.
4.  **Load:** Click the **Load unpacked** button (top-left).
5.  **Select:** Choose the `Gemini_Writing_Engine` folder.
6.  **Pin It:** Click the "Puzzle Piece" icon in your Chrome toolbar and pin the extension for easy access.

## ⚙️ Configuration (First Run)

The extension will not work until you provide a valid API Key.

1.  **Get a Key:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free API Key.
2.  **Open Settings:** Click the extension icon to open the Side Panel. Click the **⚙️ (Settings)** button in the top header.
3.  **Paste Key:** Enter your key in the "API Key" field. It saves automatically when you click away or close settings.

## 🧠 Usage Guide

### 1. The Side Panel (Chat)
* **Open:** Click the extension icon.
* **Chat:** Type normally. Use **Shift+Enter** to send.
* **Model Switching:** In Settings, you can toggle between:
    * **Flash:** Fast, lightweight, good for quick rewrites.
    * **Pro:** High intelligence, better for complex reasoning or creative nuance.

### 2. The Context Menu (Right-Click)
This is the "Writing Engine" feature. It works on inputs, textareas, and some content-editable fields.

1.  **Highlight Text:** Select the text you wrote.
2.  **Right-Click:** Hover over the extension name.
3.  **Select a Preset:** (e.g., "👔 Professional").
4.  **Wait:** The cursor will turn to a "wait" icon. The text will be rewritten **in-place**.

### 3. Custom Presets
You can define your own writing styles.

1.  Open **Settings**.
2.  Under "Add Preset":
    * **Name:** What appears in the right-click menu (e.g., "Roast Me").
    * **Prompt:** The instruction sent to Gemini (e.g., "Rewrite this text to be aggressively sarcastic and mean").
3.  Click **(+)**.
4.  **Important:** You usually need to reload the extension (click the circular arrow in `chrome://extensions`) for new context menu items to appear immediately.

## 📂 Project Structure

* `manifest.json`: The configuration file. Defines permissions (Storage, Scripting, SidePanel).
* `background.js`: Handles the "Right-Click" logic. It constructs the menu items based on your saved presets and handles the background API calls.
* `sidepanel.html/js`: The UI logic. Handles saving the API key to `chrome.storage` and the chat interface.
* `styles.css`: Dark mode styling.

## ⚠️ Troubleshooting

* **"Error: Please set API Key":** You didn't paste the key in the settings panel.
* **Menu doesn't appear:** If you just added a preset, reload the extension in `chrome://extensions`.
* **Text doesn't change:** Some complex websites (like Google Docs or heavy React apps) block external script injection. In these cases, the extension will pop up an `Alert` box with the result so you can copy-paste it manually.