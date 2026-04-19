# TabGem

TabGem is a Chrome Extension that turns browsing history into a structured workspace.

## Features

- Browse recent history with preset and custom date ranges
- Group links by domain and sort groups by latest visit
- Search by title, URL, or domain
- Select links in bulk
- Open selected links in new tabs
- Export selected links to Markdown
- Save selected links to a `TabGem` bookmark folder
- Keep a lightweight local stash for links you want to revisit later
- Generate a daily-note style summary from selected links

## Project Structure

```text
.
├── app.js
├── background.js
├── icons/
├── index.html
├── manifest.json
└── style.css
```

## Local Development

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select this folder

After making changes, click `Reload` on the extension card.

## Permissions

TabGem uses:

- `history` to read browser history
- `downloads` to export Markdown files
- `tabs` to open selected links and navigate to bookmark management
- `storage` to persist preferences and stash items
- `bookmarks` to save links into the `TabGem` bookmark folder

## Privacy

This project stores temporary preferences and stash data locally in `chrome.storage.local`. It does not include any personal local paths or user-specific secrets in the repository.
