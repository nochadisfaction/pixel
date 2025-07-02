#!/bin/bash

# Auto-commit script that runs without user interaction
# This preserves work automatically every 5 minutes

set -e

# Get the current timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
COMMIT_MSG="Auto-save: Work in progress - $TIMESTAMP"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Add all changes
git add -A

# Check if there are any changes to commit
if git diff --staged --quiet; then
    echo "No changes to commit at $TIMESTAMP"
    exit 0
fi

# Commit the changes
git commit -m "$COMMIT_MSG"

echo "Auto-committed changes at $TIMESTAMP"

# Optional: Push to remote (uncomment if you want auto-push)
# git push origin HEAD 2>/dev/null || echo "Failed to push (continuing anyway)"
