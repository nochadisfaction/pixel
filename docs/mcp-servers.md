# MCP Servers Configuration

This directory contains the configuration for Model Context Protocol (MCP) servers used in the Pixel project.

## Configuration File

- `mcp-servers.json` - Contains the configuration for all MCP servers

## Management Script

- `scripts/mcp-manager.js` - Script to manage MCP servers

## Available Commands

### List all available servers
```bash
node scripts/mcp-manager.js list
```

### Run a specific server
```bash
node scripts/mcp-manager.js run <server-name>
```

### Install MCP dependencies
```bash
node scripts/mcp-manager.js install
```

## Available Servers

1. **mem0-memory-mcp** - Memory management server with key and profile authentication
2. **openmemory** - OpenMemory server with API key authentication  
3. **sentry** - Sentry integration server
4. **context7** - Context7 server
5. **microsoft-docs** - Microsoft documentation server
6. **huggingface** - HuggingFace integration server
7. **imagesorcery** - Image processing server
8. **azure** - Azure integration server

## Environment Variables

- `OPENMEMORY_API_KEY` - API key for OpenMemory server (set in configuration)

## Examples

```bash
# Start the memory server
node scripts/mcp-manager.js run mem0-memory-mcp

# Start the OpenMemory server
node scripts/mcp-manager.js run openmemory

# Start the Sentry server
node scripts/mcp-manager.js run sentry
```

## Server Configuration Format

Each server in `mcp-servers.json` follows this format:

```json
{
  "server-name": {
    "command": "npx",
    "args": ["-y", "@smithery/cli@latest", "run", "@package/name"],
    "env": {
      "ENV_VAR": "value"
    },
    "cwd": "/optional/working/directory"
  }
}
```
