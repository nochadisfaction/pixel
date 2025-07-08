#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def main():
    backup_dir = Path("/home/vivi/pixel/memory_backups")
    backup_files = list(backup_dir.glob("combined_memories_*.json"))
    
    if not backup_files:
        print("No backup files found")
        return 1
    
    latest_backup = max(backup_files, key=lambda f: f.stat().st_mtime)
    print(f"Using backup file: {latest_backup}")
    
    with open(latest_backup, 'r') as f:
        memories = json.load(f)
    
    if not memories:
        print("No memories to sync")
        return 1
    
    batches = [memories[i:i + 10] for i in range(0, len(memories), 10)]
    
    with open("/home/vivi/pixel/memory_sync_batch.json", 'w') as f:
        json.dump({
            "total_memories": len(memories),
            "total_batches": len(batches),
            "batches": batches
        }, f, indent=2)
    
    print(f"Created {len(batches)} batches from {len(memories)} memories")
    return 0

if __name__ == "__main__":
    sys.exit(main())
