#!/bin/bash

# Aggressive auto-commit script that saves work every 60 seconds
# This will ensure NO work is lost

LOG_FILE="/tmp/auto-commit.log"

echo "Starting aggressive auto-commit at $(date)" >> $LOG_FILE

while true; do
    cd /home/vivi/pixelated2
    
    # Add all changes
    git add -A
    
    # Check if there are changes to commit
    if ! git diff --staged --quiet; then
        TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
        git commit -m "Auto-save: Work in progress - $TIMESTAMP"
        echo "Auto-committed at $TIMESTAMP" >> $LOG_FILE
        echo "Auto-committed at $TIMESTAMP"
    else
        echo "No changes at $(date)" >> $LOG_FILE
    fi
    
    # Wait 60 seconds before next check
    sleep 60
done
