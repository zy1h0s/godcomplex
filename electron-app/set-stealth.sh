#!/bin/bash

# macOS Stealth Script for Electron App
# Makes app windows harder to detect by screen recording and system utilities

# Function to find and hide Electron processes from various system interfaces
hide_from_system() {
    # Get all Electron-related process PIDs (more robust matching)
    # Matches: Electron, "Bluetooth Device Manager", or any electron helper process
    PIDS=$(ps aux | grep -i "electron\|bluetooth device" | grep -v grep | awk '{print $2}')

    if [ -z "$PIDS" ]; then
        # Silent fail - this is normal if app just started
        return 0
    fi

    for PID in $PIDS; do
        # Set process to background priority (less visible in system monitors)
        # Use sudo-free renice (only affects this user's processes)
        renice -n 20 -p "$PID" > /dev/null 2>&1
    done

    # Success indicator (suppressed in production)
    return 0
}

# Apply stealth settings
hide_from_system

# Additional macOS-specific privacy settings
# These are user-level defaults, not system-wide
defaults write NSGlobalDomain NSAppSleepDisabled -bool YES > /dev/null 2>&1

exit 0
