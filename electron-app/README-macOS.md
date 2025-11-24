# macOS Setup Guide

This Electron app now supports macOS with full stealth mode functionality!

## Prerequisites

- macOS 10.13 (High Sierra) or later
- Node.js 16+ and npm

## Installation

```bash
cd electron-app
npm install
```

## Running on macOS

```bash
npm start
```

## Building for macOS

Build a distributable macOS app:

```bash
npm run build:mac
```

This will create:
- `.dmg` installer in `dist/` folder
- `.zip` archive for easy distribution

## macOS Stealth Features

All stealth features work on macOS:

### ✅ Screen Recording Protection
- `setContentProtection(true)` prevents screen recording
- App windows are protected from macOS screen capture APIs

### ✅ Dock & Menu Bar Hiding
- App doesn't appear in Dock (LSUIElement)
- Hidden from Force Quit menu
- Taskbar/Dock hiding with `setSkipTaskbar(true)`

### ✅ Aggressive Stealth Mode
- Stealth script runs every 1 second
- Windows stay hidden from system utilities
- Background priority for less visibility

### ✅ All Existing Features
- Click-through mode (Cmd+Shift+T)
- Settings window (Cmd+Shift+S)
- Window minimize/restore
- Dark/Light theme toggles
- Three overlay windows (Text, Code, Image)

## macOS-Specific Shortcuts

- **Cmd+Shift+T** - Toggle click-through mode
- **Cmd+Shift+S** - Open settings window

## Permissions

On first run, macOS may ask for permissions:

1. **Accessibility** - Required for window management
2. **Screen Recording** - Ironically needed to PREVENT recording
3. **Automation** - For stealth mode features

Grant these permissions in:
`System Preferences → Security & Privacy → Privacy`

## Troubleshooting

### App doesn't appear
- Check Console.app for errors
- Ensure permissions are granted
- Try running from terminal to see logs

### Stealth mode not working
- Make sure `set-stealth.sh` is executable:
  ```bash
  chmod +x set-stealth.sh
  ```
- Check macOS privacy settings

### Building fails
- Update Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

## Notes

- Built with Electron 28+
- Supports both Intel and Apple Silicon (M1/M2)
- No code signing required for personal use
- For distribution, consider signing with Apple Developer account

## Security

This app uses stealth features for privacy. It:
- Hides windows from screen recording
- Doesn't appear in Dock or Force Quit
- Runs with minimal system visibility

Perfect for private note-taking, coding, or sensitive work!
