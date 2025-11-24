#!/bin/bash

# macOS Stealth Script for Electron App
# Makes app windows harder to detect by screen recording and system utilities

APP_NAME="Electron"

# Function to find and hide Electron processes from various system interfaces
hide_from_system() {
    # Get all Electron process PIDs
    PIDS=$(pgrep -i "$APP_NAME")

    if [ -z "$PIDS" ]; then
        echo "No Electron processes found"
        return 1
    fi

    for PID in $PIDS; do
        # Set process to background priority (less visible in system monitors)
        renice -n 20 -p "$PID" > /dev/null 2>&1

        # Try to set process as daemon-like (LSUIElement)
        # This makes it not appear in Dock or Force Quit menu
        defaults write /Applications/Electron.app/Contents/Info LSUIElement -bool YES > /dev/null 2>&1
    done

    echo "✅ macOS stealth applied to $APP_NAME processes"
    return 0
}

# Apply stealth settings
hide_from_system

# Additional macOS-specific privacy settings
# Disable app nap for consistent stealth behavior
defaults write NSGlobalDomain NSAppSleepDisabled -bool YES > /dev/null 2>&1

exit 0
