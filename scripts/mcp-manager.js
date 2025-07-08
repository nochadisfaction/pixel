#!/usr/bin/env node

import { spawn } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const mcpConfig = JSON.parse(
  readFileSync(join(process.cwd(), 'mcp-servers.json'), 'utf8'),
)

const servers = Object.keys(mcpConfig.mcpServers)

function runServer(serverName) {
  const server = mcpConfig.mcpServers[serverName]

  if (!server) {
    console.error(`Server "${serverName}" not found`)
    process.exit(1)
  }

  if (server.disabled) {
    console.error(`Server "${serverName}" is disabled. Enable it in mcp-servers.json to run.`)
    process.exit(1)
  }

  console.log(`Starting MCP server: ${serverName}`)

  const child = spawn(server.command, server.args, {
    cwd: server.cwd || process.cwd(),
    env: { ...process.env, ...server.env },
    stdio: 'inherit',
  })

  child.on('error', (err) => {
    console.error(`Error starting ${serverName}:`, err)
  })

  child.on('close', (code) => {
    console.log(`${serverName} exited with code ${code}`)
  })

  return child
}

function enableServer(serverName) {
  const server = mcpConfig.mcpServers[serverName]
  
  if (!server) {
    console.error(`Server "${serverName}" not found`)
    process.exit(1)
  }
  
  if (!server.disabled) {
    console.log(`Server "${serverName}" is already enabled`)
    return
  }
  
  delete server.disabled
  writeFileSync(
    join(process.cwd(), 'mcp-servers.json'),
    JSON.stringify(mcpConfig, null, 2)
  )
  console.log(`Server "${serverName}" enabled`)
}

function disableServer(serverName) {
  const server = mcpConfig.mcpServers[serverName]
  
  if (!server) {
    console.error(`Server "${serverName}" not found`)
    process.exit(1)
  }
  
  if (server.disabled) {
    console.log(`Server "${serverName}" is already disabled`)
    return
  }
  
  server.disabled = true
  writeFileSync(
    join(process.cwd(), 'mcp-servers.json'),
    JSON.stringify(mcpConfig, null, 2)
  )
  console.log(`Server "${serverName}" disabled`)
}

function listServers() {
  console.log('Available MCP servers:')
  servers.forEach((serverName) => {
    const server = mcpConfig.mcpServers[serverName]
    const status = server.disabled ? '(disabled)' : '(enabled)'
    console.log(`  - ${serverName} ${status}`)
  })
}

const command = process.argv[2]
const serverName = process.argv[3]

switch (command) {
  case 'list':
    listServers()
    break
  case 'run':
    if (!serverName) {
      console.error('Please specify a server name')
      listServers()
      process.exit(1)
    }
    runServer(serverName)
    break
  case 'enable':
    if (!serverName) {
      console.error('Please specify a server name to enable')
      listServers()
      process.exit(1)
    }
    enableServer(serverName)
    break
  case 'disable':
    if (!serverName) {
      console.error('Please specify a server name to disable')
      listServers()
      process.exit(1)
    }
    disableServer(serverName)
    break
  case 'install':
    console.log('Installing MCP dependencies...')
    spawn(
      'pnpm',
      [
        'add',
        '-D',
        '@smithery/cli',
        '@21st-dev/magic',
        'cursor-mcp-installer-free',
      ],
      {
        stdio: 'inherit',
      },
    )
    break
  default:
    console.log('Usage:')
    console.log(
      '  node mcp-manager.js list                 - List available servers',
    )
    console.log(
      '  node mcp-manager.js run <server-name>    - Run a specific server',
    )
    console.log(
      '  node mcp-manager.js enable <server-name> - Enable a disabled server',
    )
    console.log(
      '  node mcp-manager.js disable <server-name>- Disable a server',
    )
    console.log(
      '  node mcp-manager.js install              - Install MCP dependencies',
    )
    break
}
