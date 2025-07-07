#!/usr/bin/env python3

"""
Test the migrated knowledge in mem0ai
"""

from mem0 import MemoryClient

def test_migrated_knowledge():
    """Test searching the migrated ByteRover knowledge"""
    client = MemoryClient(api_key="m0-HlhSVNycYPl69kgLtgibGpWTwqxdvkecR4TvbiA9")
    
    # Test searches for key topics from ByteRover
    test_queries = [
        "code analysis",
        "security",
        "architecture",
        "performance",
        "error handling"
    ]
    
    print("🔍 Testing migrated knowledge search...")
    
    for query in test_queries:
        print(f"\n📋 Searching for: '{query}'")
        results = client.search(query, user_id="byterover_migration", limit=3)
        
        if results:
            print(f"✅ Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"  {i}. {result['memory'][:100]}...")
                print(f"     Score: {result.get('score', 'N/A')}")
        else:
            print("❌ No results found")
    
    # Get total count
    all_memories = client.get_all(user_id="byterover_migration")
    print(f"\n📊 Total migrated memories: {len(all_memories)}")

if __name__ == "__main__":
    test_migrated_knowledge()
