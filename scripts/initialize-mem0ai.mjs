#!/usr/bin/env node

/**
 * Mem0AI Test and Migration Tool
 * 
 * This script tests the mem0ai client and can be used as an alternative to OpenMemory
 */

import { spawn } from 'child_process';

async function testMem0AI() {
  console.log('🧪 Testing mem0ai installation and API...');
  
  // Test the mem0ai package
  const testScript = `
import sys
try:
    from mem0 import MemoryClient
    
    api_key = 'm0-HlhSVNycYPl69kgLtgibGpWTwqxdvkecR4TvbiA9'
    client = MemoryClient(api_key=api_key)
    
    print("✅ MemoryClient imported successfully")
    print(f"📦 Client initialized with API key: {api_key[:10]}...")
    
    # Test adding a memory
    try:
        result = client.add("This is a test memory to verify mem0ai is working correctly.", user_id="test_user_001")
        print(f"✅ Memory added successfully: {result}")
    except Exception as e:
        print(f"❌ Error adding memory: {e}")
    
    # Test searching memories
    try:
        results = client.search("test memory", user_id="test_user_001")
        print(f"✅ Memory search completed: Found {len(results)} results")
        for i, result in enumerate(results[:3]):  # Show first 3 results
            print(f"   {i+1}. {result}")
    except Exception as e:
        print(f"❌ Error searching memory: {e}")
    
    # Test getting all memories
    try:
        all_memories = client.get_all(user_id="test_user_001")
        print(f"✅ Retrieved all memories: {len(all_memories)} total")
    except Exception as e:
        print(f"❌ Error getting all memories: {e}")
        
except ImportError as e:
    print(f"❌ Failed to import mem0ai: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
`;

  return new Promise((resolve) => {
    const python = spawn('python', ['-c', testScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      console.log(stdout);
      if (stderr) {
        console.error('🔥 Errors:', stderr);
      }
      console.log(`\n📊 Process exited with code: ${code}`);
      resolve({ code, stdout, stderr });
    });

    python.on('error', (error) => {
      console.error('❌ Failed to run Python test:', error.message);
      resolve({ code: -1, stdout: '', stderr: error.message });
    });
  });
}

async function createMem0MigrationTool() {
  console.log('\n🔧 Creating mem0ai migration tool...');
  
  const migrationScript = `#!/usr/bin/env python3

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
                enhanced_content = f"{content}\\n\\nMetadata: {json.dumps(metadata)}"
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
    print("\\n🔍 Testing connection...")
    test_result = migrator.add_memory("Test memory for connection verification")
    if test_result:
        print("✅ Connection successful!")
    else:
        print("❌ Connection failed!")
        return
    
    # Check for backup file
    backup_file = "backups/byterover-knowledge-backup.json"
    print(f"\\n📂 Looking for backup file: {backup_file}")
    
    try:
        stats = migrator.migrate_from_backup(backup_file)
        print("\\n📊 Migration Results:")
        print(f"   Total memories: {stats['total']}")
        print(f"   Successfully migrated: {stats['successful']}")
        print(f"   Failed: {stats['failed']}")
        print(f"   Success rate: {stats['successful']/stats['total']*100:.1f}%" if stats['total'] > 0 else "   No memories to migrate")
        
        # Verify migration
        print("\\n🔍 Verifying migration...")
        all_memories = migrator.get_all_memories()
        print(f"✅ Found {len(all_memories)} total memories in mem0ai")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    main()
`;

  const scriptPath = 'scripts/migrate-to-mem0ai.py';
  
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(scriptPath, migrationScript);
    console.log(`✅ Created migration script: ${scriptPath}`);
    return scriptPath;
  } catch (error) {
    console.error('❌ Failed to create migration script:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Mem0AI Initialization and Testing');
  console.log('=' * 50);
  
  // Test mem0ai
  const testResult = await testMem0AI();
  
  // Create migration tool
  const scriptPath = await createMem0MigrationTool();
  
  console.log('\\n🎉 Initialization complete!');
  console.log('\\nNext steps:');
  console.log('1. Run the migration script: python scripts/migrate-to-mem0ai.py');
  console.log('2. Test mem0ai as OpenMemory alternative');
  console.log('3. Update your workflows to use mem0ai if needed');
  
  return {
    testSuccess: testResult.code === 0,
    migrationScript: scriptPath
  };
}

// Run the initialization
main().catch(console.error);
