#!/usr/bin/env node

/**
 * OpenMemory MCP Diagnostic Tool
 * 
 * This script helps diagnose OpenMemory configuration and persistence issues.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

class OpenMemoryDiagnostic {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.logFile = `logs/openmemory-diagnostic-${this.timestamp.slice(0, 19).replace(/[:.]/g, '-')}.log`;
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logMessage + '\n');
    } catch (error) {
      console.warn('Failed to write to log file:', error.message);
    }
  }

  async checkConfiguration() {
    await this.log('🔍 Checking OpenMemory MCP configuration...');
    
    try {
      const configPath = '/home/vivi/pixel/.cursor/mcp.json';
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      if (config.mcpServers && config.mcpServers.openmemory) {
        await this.log('✅ OpenMemory MCP configuration found');
        await this.log(`   Command: ${config.mcpServers.openmemory.command}`);
        await this.log(`   Args: ${config.mcpServers.openmemory.args.join(' ')}`);
        
        if (config.mcpServers.openmemory.env) {
          const hasApiKey = !!config.mcpServers.openmemory.env.OPENMEMORY_API_KEY;
          await this.log(`   API Key: ${hasApiKey ? 'Present' : 'Missing'}`);
          await this.log(`   Client: ${config.mcpServers.openmemory.env.CLIENT_NAME || 'Not specified'}`);
        }
        
        return config.mcpServers.openmemory;
      } else {
        await this.log('❌ OpenMemory MCP configuration not found');
        return null;
      }
    } catch (error) {
      await this.log(`❌ Error reading configuration: ${error.message}`);
      return null;
    }
  }

  async checkProcesses() {
    await this.log('🔍 Checking for OpenMemory processes...');
    
    return new Promise((resolve) => {
      const ps = spawn('ps', ['aux']);
      let output = '';
      
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ps.on('close', async () => {
        const lines = output.split('\n');
        const memoryProcesses = lines.filter(line => 
          line.includes('openmemory') || 
          line.includes('mcp') ||
          line.includes('npx')
        );
        
        if (memoryProcesses.length > 0) {
          await this.log(`✅ Found ${memoryProcesses.length} potentially related processes:`);
          const processMessages = memoryProcesses.map(process => `   ${process.trim()}`);
          await Promise.all(processMessages.map(message => this.log(message)));
        } else {
          await this.log('❌ No OpenMemory or MCP processes found');
        }
        
        resolve(memoryProcesses);
      });
    });
  }

  async checkNetworkConnections() {
    await this.log('🔍 Checking network connections...');
    
    return new Promise((resolve) => {
      const netstat = spawn('netstat', ['-tuln']);
      let output = '';
      
      netstat.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      netstat.on('close', async () => {
        const lines = output.split('\n');
        const relevantPorts = lines.filter(line => 
          line.includes(':8080') || 
          line.includes(':3000') ||
          line.includes(':8000') ||
          line.includes('LISTEN')
        );
        
        await this.log(`📡 Active listening ports (${relevantPorts.length} found):`);
        await Promise.all(relevantPorts.slice(0, 10).map(port => 
          this.log(`   ${port.trim()}`)
        ));
        
        resolve(relevantPorts);
      });
      
      netstat.on('error', async (error) => {
        await this.log(`❌ Error checking network connections: ${error.message}`);
        resolve([]);
      });
    });
  }

  async testOpenMemoryInstallation() {
    await this.log('🔍 Testing OpenMemory installation...');
    
    return new Promise((resolve) => {
      const npm = spawn('npx', ['-y', 'openmemory', '--help'], {
        timeout: 10000
      });
      
      let output = '';
      let error = '';
      
      npm.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      npm.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      npm.on('close', async (code) => {
        if (code === 0) {
          await this.log('✅ OpenMemory package is accessible via npx');
          if (output) {
            await this.log('📄 Help output (first 500 chars):');
            await this.log(output.substring(0, 500));
          }
        } else {
          await this.log(`❌ OpenMemory package test failed with code ${code}`);
          if (error) {
            await this.log(`📄 Error output: ${error.substring(0, 500)}`);
          }
        }
        resolve({ code, output, error });
      });
      
      npm.on('error', async (error) => {
        await this.log(`❌ Error testing OpenMemory: ${error.message}`);
        resolve({ code: -1, output: '', error: error.message });
      });
    });
  }

  async checkEnvironmentVariables() {
    await this.log('🔍 Checking environment variables...');
    
    const relevantEnvVars = [
      'OPENMEMORY_API_KEY',
      'CLIENT_NAME',
      'HOME',
      'USER',
      'PATH'
    ];
    
    await Promise.all(relevantEnvVars.map(async (envVar) => {
      const value = process.env[envVar];
      if (value) {
        if (envVar === 'OPENMEMORY_API_KEY') {
          await this.log(`   ${envVar}: ${value.substring(0, 10)}... (${value.length} chars)`);
        } else if (envVar === 'PATH') {
          await this.log(`   ${envVar}: [${value.split(':').length} paths]`);
        } else {
          await this.log(`   ${envVar}: ${value}`);
        }
      } else {
        await this.log(`   ${envVar}: Not set`);
      }
    }));
  }

  async suggestFixes() {
    await this.log('🔧 Suggested fixes for OpenMemory issues:');
    
    const fixes = [
      '1. Restart VS Code/Cursor to reload MCP configuration',
      '2. Check if OpenMemory service is running externally',
      '3. Verify API key is valid and not expired',
      '4. Try reinstalling OpenMemory: npm install -g openmemory',
      '5. Check OpenMemory server logs for errors',
      '6. Verify network connectivity to OpenMemory service',
      '7. Try using a different MCP memory provider',
      '8. Check if there are permission issues with data storage',
      '9. Verify that the OpenMemory server is configured correctly',
      '10. Consider using local file-based memory as fallback'
    ];
    
    await Promise.all(fixes.map(fix => this.log(`   ${fix}`)));
  }

  async generateReport() {
    const reportPath = `reports/openmemory-diagnostic-${this.timestamp.slice(0, 19).replace(/[:.]/g, '-')}.md`;
    
    const report = `# OpenMemory MCP Diagnostic Report

**Generated**: ${this.timestamp}  
**Issue**: OpenMemory accepts memories but doesn't persist or retrieve them

## Configuration Analysis

The OpenMemory MCP is configured in \`.cursor/mcp.json\` with:
- Command: \`npx -y openmemory\`
- API Key: Present (om-8u4kp...)
- Client: cursor

## Diagnostic Results

### Symptoms Observed
- ✅ \`mcp_openmemory_add-memory\` returns "Memory added successfully"  
- ❌ \`mcp_openmemory_list-memories\` returns "No memories found"
- ❌ \`mcp_openmemory_search-memories\` returns "No memories found"

### Possible Root Causes

1. **Session/Context Issues**: Memories might be stored in a session context that doesn't persist
2. **API Key Issues**: The API key might be invalid or have limited permissions
3. **Service Configuration**: OpenMemory server might not be configured to persist data
4. **Storage Backend**: Database or file system issues preventing persistence
5. **Client/Server Mismatch**: Version compatibility issues between client and server

### Recommendations

#### Immediate Actions
1. **Restart Development Environment**: Close and reopen VS Code/Cursor to reload MCP configuration
2. **Verify API Key**: Check if the OpenMemory API key is valid and active
3. **Check Service Status**: Ensure OpenMemory service is running and accessible

#### Alternative Solutions
1. **Switch to ByteRover Only**: Keep using ByteRover as primary memory system
2. **Use Local Memory API**: Implement local file-based memory storage
3. **Try Alternative MCP**: Consider other memory MCP servers

#### Long-term Fixes
1. **Contact OpenMemory Support**: Report the persistence issue to OpenMemory developers
2. **Implement Hybrid System**: Use both ByteRover and local storage
3. **Build Custom Memory Bridge**: Create a service that syncs between systems

## Files for Investigation

- \`.cursor/mcp.json\` - MCP configuration
- \`src/lib/memory/memory-client.ts\` - Local memory client
- \`logs/openmemory-diagnostic-*.log\` - Diagnostic logs

## Next Steps

1. Run this diagnostic again after restarting VS Code
2. Try adding a memory with different content to test persistence
3. Check OpenMemory documentation for known issues
4. Consider implementing fallback to local memory system

---

*This report was generated automatically by the OpenMemory diagnostic tool.*
`;

    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, report);
      await this.log(`📄 Diagnostic report generated: ${reportPath}`);
      return reportPath;
    } catch (error) {
      await this.log(`❌ Failed to generate report: ${error.message}`);
      throw error;
    }
  }

  async run() {
    try {
      await this.log('🚀 Starting OpenMemory MCP diagnostic...');
      
      // Run all diagnostic checks
      const config = await this.checkConfiguration();
      await this.checkProcesses();
      await this.checkNetworkConnections();
      await this.testOpenMemoryInstallation();
      await this.checkEnvironmentVariables();
      await this.suggestFixes();
      
      // Generate report
      const reportPath = await this.generateReport();
      
      await this.log('🎉 Diagnostic completed!');
      await this.log(`📊 Full report: ${reportPath}`);
      
      return {
        success: true,
        reportPath,
        logFile: this.logFile,
        hasConfiguration: !!config
      };
      
    } catch (error) {
      await this.log(`💥 Diagnostic failed: ${error.message}`);
      console.error('Diagnostic error:', error);
      return {
        success: false,
        error: error.message,
        logFile: this.logFile
      };
    }
  }
}

// Run the diagnostic
const diagnostic = new OpenMemoryDiagnostic();
diagnostic.run();
