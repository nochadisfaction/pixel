#!/usr/bin/env python3

"""
ByteRover to Mem0AI Migration Tool

This script migrates all knowledge from ByteRover to Mem0AI as a fallback
when OpenMemory MCP is not working properly.
"""

import json
import sys
from typing import List, Dict, Any

try:
    from mem0 import MemoryClient
except ImportError:
    print("❌ mem0ai not installed. Run: uv pip install mem0ai")
    sys.exit(1)

class Mem0MigrationTool:
    def __init__(self, api_key: str):
        self.client = MemoryClient(api_key=api_key)
        self.user_id = "pixel_workspace_user"
        
    def add_memory(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Add a memory to mem0ai"""
        try:
            # Mem0 doesn't support metadata directly, so we'll embed it in content
            if metadata:
                enhanced_content = f"{content}\n\nMetadata: {json.dumps(metadata)}"
            else:
                enhanced_content = content
                
            result = self.client.add(enhanced_content, user_id=self.user_id)
            return result.get('id', 'unknown')
        except Exception as e:
            print(f"❌ Error adding memory: {e}")
            return None
    
    def search_memories(self, query: str, limit: int = 10) -> List[Dict]:
        """Search memories in mem0ai"""
        try:
            results = self.client.search(query, user_id=self.user_id, limit=limit)
            return results
        except Exception as e:
            print(f"❌ Error searching memories: {e}")
            return []
    
    def get_all_memories(self) -> List[Dict]:
        """Get all memories from mem0ai"""
        try:
            memories = self.client.get_all(user_id=self.user_id)
            return memories
        except Exception as e:
            print(f"❌ Error getting all memories: {e}")
            return []
    
    def migrate_from_backup(self, backup_file: str) -> Dict[str, int]:
        """Migrate memories from ByteRover backup JSON"""
        stats = {"successful": 0, "failed": 0, "total": 0}
        
        try:
            with open(backup_file, 'r') as f:
                backup_data = json.load(f)
            
            memories = backup_data.get('memories', [])
            stats['total'] = len(memories)
            
            print(f"📦 Found {stats['total']} memories in backup")
            
            for i, memory in enumerate(memories, 1):
                content = memory.get('content', '')
                if not content:
                    print(f"⚠️  Skipping memory {i}: No content")
                    stats['failed'] += 1
                    continue
                
                # Prepare metadata
                metadata = {
                    'source': 'ByteRover',
                    'category': memory.get('category', 'unknown'),
                    'tags': memory.get('tags', []),
                    'score': memory.get('score', 0),
                    'migration_date': '2025-01-07'
                }
                
                memory_id = self.add_memory(content, metadata)
                
                if memory_id:
                    print(f"✅ Migrated memory {i}/{stats['total']}: {content[:50]}...")
                    stats['successful'] += 1
                else:
                    print(f"❌ Failed to migrate memory {i}/{stats['total']}")
                    stats['failed'] += 1
            
            return stats
            
        except FileNotFoundError:
            print(f"❌ Backup file not found: {backup_file}")
            return stats
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            return stats

def main():
    api_key = 'm0-HlhSVNycYPl69kgLtgibGpWTwqxdvkecR4TvbiA9'
    migrator = Mem0MigrationTool(api_key)
    
    print("🚀 Mem0AI Migration Tool")
    print("=" * 50)
    
    # Test connection
    print("\n🔍 Testing connection...")
    test_result = migrator.add_memory("Test memory for connection verification")
    if test_result:
        print("✅ Connection successful!")
    else:
        print("❌ Connection failed!")
        return
    
    # Check for backup file
    backup_file = "backups/byterover-knowledge-backup.json"
    print(f"\n📂 Looking for backup file: {backup_file}")
    
    try:
        stats = migrator.migrate_from_backup(backup_file)
        print("\n📊 Migration Results:")
        print(f"   Total memories: {stats['total']}")
        print(f"   Successfully migrated: {stats['successful']}")
        print(f"   Failed: {stats['failed']}")
        print(f"   Success rate: {stats['successful']/stats['total']*100:.1f}%" if stats['total'] > 0 else "   No memories to migrate")
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        all_memories = migrator.get_all_memories()
        print(f"✅ Found {len(all_memories)} total memories in mem0ai")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    main()
