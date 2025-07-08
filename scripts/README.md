# 🔄 Advanced Memory Synchronization Tool

A powerful Python tool for synchronizing memories between **Mem0** and **OpenMemory** services with advanced features like smart differential sync, backup/restore, and comprehensive search capabilities.

## ✨ Features

- **🔄 Bidirectional Sync**: Full synchronization between Mem0 and OpenMemory
- **🧠 Smart Sync**: Differential sync that only transfers missing memories
- **💾 Backup & Restore**: Export/import memories with JSON backups
- **🔍 Search**: Query memories across both services
- **📊 Discovery**: Analyze memory statistics and content
- **⚡ Async Performance**: Concurrent operations with rate limiting
- **🛡️ Error Handling**: Robust retry logic and graceful error recovery
- **📝 Rich Logging**: Detailed progress tracking with emojis

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Mem0 API key
- OpenMemory instance (optional)

### Setup

1. **Set environment variables:**
```bash
export MEM0_API_KEY="your-mem0-api-key"
export OPENMEMORY_API_KEY="your-openmemory-key"  # Optional
export OPENMEMORY_BASE_URL="http://localhost:8000"  # Optional
```

2. **Run the tool:**
```bash
# Using the wrapper script (recommended)
./scripts/run-memory-sync.sh --help

# Or directly with Python
python3 scripts/memory-sync.py --help
```

## 📖 Usage Examples

### Discovery & Statistics
```bash
# Show memory statistics across services
./scripts/run-memory-sync.sh --discover

# Verbose output with debug info
./scripts/run-memory-sync.sh --discover --verbose
```

### Synchronization

```bash
# Smart differential sync (recommended)
./scripts/run-memory-sync.sh --sync-smart

# Full bidirectional sync (destructive - clears existing data)
./scripts/run-memory-sync.sh --sync-full

# Sync for specific user
./scripts/run-memory-sync.sh --sync-smart --user-id "user123"
```

### Backup & Restore

```bash
# Export all memories to backup
./scripts/run-memory-sync.sh --export

# Import from backup to both services
./scripts/run-memory-sync.sh --import backup_20240115_143022.json

# Import to specific service
./scripts/run-memory-sync.sh --import backup.json --service mem0
```

### Search

```bash
# Search across both services
./scripts/run-memory-sync.sh --search "python programming"

# Search in specific service
./scripts/run-memory-sync.sh --search "machine learning" --service mem0
```

## 🏗️ Architecture

### Core Components

- **`BaseMemoryService`**: Abstract base class for memory services
- **`Mem0Service`**: Mem0 API client with v2 endpoint support
- **`OpenMemoryService`**: OpenMemory MCP client
- **`MemoryRecord`**: Unified memory data structure
- **`MemorySyncManager`**: Orchestrates synchronization operations
- **`MemorySyncCLI`**: Command-line interface

### Key Features

#### Smart Deduplication
```python
# Memories are deduplicated using content hashes
content_hash = sha256(content + metadata).hexdigest()[:16]
```

#### Rate Limiting
- Configurable batch sizes (default: 10 memories per batch)
- Automatic delays between batches (default: 0.5s)
- Exponential backoff for failed requests

#### Error Recovery
- Automatic retries with exponential backoff
- Graceful handling of partial failures
- Detailed error logging and reporting

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEM0_API_KEY` | Mem0 API key (required) | - |
| `OPENMEMORY_API_KEY` | OpenMemory API key | - |
| `OPENMEMORY_BASE_URL` | OpenMemory server URL | `http://localhost:8000` |

### Advanced Configuration

Edit the script constants for fine-tuning:

```python
# Rate limiting
RATE_LIMIT_BATCH_SIZE = 10  # Memories per batch
RATE_LIMIT_DELAY = 0.5      # Seconds between batches
MAX_RETRIES = 3             # Retry attempts
TIMEOUT = 30                # Request timeout
```

## 📊 API Compatibility

### Mem0 API Support
- ✅ v2 Memory APIs (recommended)
- ✅ v1 Memory APIs (fallback)
- ✅ Search with filters
- ✅ User-scoped operations
- ✅ Batch operations

### OpenMemory MCP Support
- ✅ Standard MCP memory operations
- ✅ `add_memories`, `search_memory`
- ✅ `list_memories`, `delete_all_memories`
- ✅ Local and hosted instances

## 🛠️ Development

### Project Structure
```
scripts/
├── memory-sync.py          # Main synchronization tool
├── run-memory-sync.sh      # Shell wrapper script
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

### Running Tests
```bash
# Install development dependencies
pip install pytest pytest-asyncio

# Run tests (when available)
pytest scripts/tests/
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔍 Troubleshooting

### Common Issues

**"MEM0_API_KEY environment variable required"**
- Set your Mem0 API key: `export MEM0_API_KEY="your-key"`

**"Connection refused" for OpenMemory**
- Ensure OpenMemory server is running
- Check the `OPENMEMORY_BASE_URL` setting

**"Rate limit exceeded"**
- Increase `RATE_LIMIT_DELAY` in the script
- Reduce `RATE_LIMIT_BATCH_SIZE`

**Memory sync incomplete**
- Check network connectivity
- Review error logs with `--verbose` flag
- Try smart sync instead of full sync

### Debug Mode

Enable verbose logging for detailed troubleshooting:
```bash
./scripts/run-memory-sync.sh --discover --verbose
```

## 📈 Performance Tips

1. **Use Smart Sync**: More efficient than full sync for regular updates
2. **Batch Size**: Adjust based on your API rate limits
3. **Concurrent Operations**: The tool uses async operations for better performance
4. **Backup Regularly**: Export memories before major sync operations

## 🔐 Security Considerations

- API keys are loaded from environment variables (never hardcoded)
- All HTTP requests use proper authentication headers
- Backup files contain sensitive data - store securely
- Consider using encrypted storage for backup files

## 📝 Changelog

### v2.0.0 (Latest)
- ✨ Complete rewrite with modern async architecture
- 🧠 Added smart differential sync
- 🔍 Enhanced search capabilities
- 📊 Improved discovery and statistics
- 🛡️ Better error handling and retry logic
- 📝 Rich logging with progress indicators
- 🔧 Configurable rate limiting

### v1.0.0
- Basic bidirectional synchronization
- Simple backup/restore functionality

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the logs with `--verbose` flag
3. Open an issue in the project repository
4. Contact the development team

---

**Happy syncing! 🚀**