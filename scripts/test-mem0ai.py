#!/usr/bin/env python3

"""
Test script for mem0ai Python client
"""

try:
    from mem0 import MemoryClient
    
    # Initialize the client with your API key
    client = MemoryClient(api_key="m0-HlhSVNycYPl69kgLtgibGpWTwqxdvkecR4TvbiA9")
    
    print("✅ mem0ai client initialized successfully!")
    print(f"Client type: {type(client)}")
    
    # Test basic functionality
    try:
        # Add a test memory - using v1.1 output format to avoid deprecation warning
        test_memory = [{"role": "user", "content": "This is a test memory to verify mem0ai is working correctly."}]
        result = client.add(test_memory, user_id="test_user", output_format="v1.1")
        print(f"✅ Memory added successfully: {result}")
        
        # Search for the memory - using v1.1 output format to avoid deprecation warning
        search_results = client.search("test memory", user_id="test_user", output_format="v1.1")
        print(f"✅ Search results: {search_results}")
        
        # List all memories for the user - using v1.1 output format
        all_memories = client.get_all(user_id="test_user", output_format="v1.1")
        print(f"✅ All memories: {all_memories}")
        
    except Exception as e:
        print(f"❌ Error testing mem0ai functionality: {e}")
        print("This might be due to API limits or configuration issues")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure mem0ai is properly installed: uv pip install mem0ai")
    
except Exception as e:
    print(f"❌ Unexpected error: {e}")
