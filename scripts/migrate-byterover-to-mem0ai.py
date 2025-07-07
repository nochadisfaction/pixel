#!/usr/bin/env python3

"""
Migrate all ByteRover MCP knowledge to mem0ai
This script extracts all memories from ByteRover and transfers them to mem0ai
"""

import json
import sys
from pathlib import Path

try:
    from mem0 import MemoryClient
except ImportError:
    print("❌ mem0ai not found. Please install with: uv add mem0ai")
    sys.exit(1)

def load_byterover_backup():
    """Load the ByteRover backup data"""
    backup_file = Path(__file__).parent.parent / "backups" / "byterover-knowledge-backup.json"
    
    if not backup_file.exists():
        print(f"❌ Backup file not found: {backup_file}")
        print("Please run the ByteRover extraction first")
        return None
    
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading backup file: {e}")
        return None

def initialize_mem0ai_client():
    """Initialize the mem0ai client with proper output format"""
    api_key = "m0-HlhSVNycYPl69kgLtgibGpWTwqxdvkecR4TvbiA9"
    
    try:
        client = MemoryClient(api_key=api_key)
        print("✅ mem0ai client initialized successfully")
        return client
    except Exception as e:
        print(f"❌ Failed to initialize mem0ai client: {e}")
        return None

def migrate_memory_to_mem0ai(client, memory_data):
    """Migrate a single memory to mem0ai"""
    try:
        # Extract content from the memory
        content = memory_data.get('content', '')
        if not content:
            print(f"⚠️ Skipping empty memory: {memory_data.get('id', 'unknown')}")
            return False
        
        # Create user ID for migration - handle both string and int IDs
        memory_id = str(memory_data.get('id', 'unknown'))
        user_id = "byterover_migration"
        
        # Prepare the memory data for mem0ai with proper format
        memory_messages = [{"role": "user", "content": content}]
        
        # Add metadata if available
        metadata = {
            "original_id": memory_id,
            "migrated_from": "byterover",
            "original_tags": memory_data.get('tags', []),
            "original_category": memory_data.get('category', ''),
            "original_score": memory_data.get('score', 0)
        }
        
        # Add the memory to mem0ai with v1.1 output format
        print(f"  Adding memory ID {memory_id} with content length: {len(content)}")
        result = client.add(
            memory_messages, 
            user_id=user_id,
            metadata=metadata,
            output_format="v1.1"
        )
        
        if result and 'results' in result:
            print(f"✅ Migrated memory: {memory_id[:50]}...")
            return True
        else:
            print(f"⚠️ Unexpected result for memory {memory_id}: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Error migrating memory {memory_data.get('id', 'unknown')}: {e}")
        return False

def main():
    """Main migration function"""
    print("🚀 Starting ByteRover to mem0ai migration...")
    
    # Load backup data
    backup_data = load_byterover_backup()
    if not backup_data:
        return False
    
    memories = backup_data.get('memories', [])
    total_memories = len(memories)
    print(f"📊 Found {total_memories} memories to migrate")
    
    if total_memories == 0:
        print("⚠️ No memories found in backup")
        return False
    
    # Initialize mem0ai client
    client = initialize_mem0ai_client()
    if not client:
        return False
    
    # Migrate each memory
    successful_migrations = 0
    failed_migrations = 0
    
    for i, memory in enumerate(memories, 1):
        print(f"\n📤 Migrating memory {i}/{total_memories}")
        
        if migrate_memory_to_mem0ai(client, memory):
            successful_migrations += 1
        else:
            failed_migrations += 1
    
    # Summary
    print(f"\n📈 Migration Summary:")
    print(f"✅ Successfully migrated: {successful_migrations}")
    print(f"❌ Failed migrations: {failed_migrations}")
    print(f"📊 Total processed: {total_memories}")
    
    if successful_migrations > 0:
        print(f"\n🔍 Verifying migration...")
        try:
            # Get all memories for the user
            all_memories = client.get_all(user_id="byterover_migration")
            print(f"✅ Verification: {len(all_memories)} memories found in mem0ai")
            
            # Show a sample
            if all_memories:
                print(f"\n📄 Sample migrated memory:")
                sample = all_memories[0]
                print(f"ID: {sample.get('id')}")
                print(f"Content: {sample.get('memory', '')[:100]}...")
                print(f"Created: {sample.get('created_at')}")
        except Exception as e:
            print(f"⚠️ Verification failed: {e}")
    
    return successful_migrations == total_memories

if __name__ == "__main__":
    if success := main():
        print("\n🎉 Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Migration completed with errors")
        sys.exit(1)