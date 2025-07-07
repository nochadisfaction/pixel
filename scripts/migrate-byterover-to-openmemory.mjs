#!/usr/bin/env node

/**
 * Migration Script: ByteRover to OpenMemory
 * 
 * This script migrates all knowledge data from ByteRover MCP to OpenMemory MCP.
 * 
 * Usage:
 *   node scripts/migrate-byterover-to-openmemory.mjs [--dry-run] [--target=openmemory|openmemory2]
 * 
 * Options:
 *   --dry-run    Show what would be migrated without actually doing it
 *   --target     Specify which OpenMemory instance to use (default: openmemory)
 *   --help       Show this help message
 */

import fs from 'fs/promises';
import path from 'path';

class MCPMigrationTool {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.targetMemory = this.getTargetMemory();
    this.logFile = `logs/migration-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.log`;
    
    if (process.argv.includes('--help')) {
      this.showHelp();
      process.exit(0);
    }
  }

  getTargetMemory() {
    const targetArg = process.argv.find(arg => arg.startsWith('--target='));
    if (targetArg) {
      const target = targetArg.split('=')[1];
      if (['openmemory', 'openmemory2'].includes(target)) {
        return target;
      }
      console.error(`Invalid target: ${target}. Must be 'openmemory' or 'openmemory2'`);
      process.exit(1);
    }
    return 'openmemory';
  }

  showHelp() {
    console.log(`
Migration Script: ByteRover to OpenMemory

This script migrates all knowledge data from ByteRover MCP to OpenMemory MCP.

Usage:
  node scripts/migrate-byterover-to-openmemory.mjs [options]

Options:
  --dry-run        Show what would be migrated without actually doing it
  --target=name    Specify which OpenMemory instance to use (openmemory|openmemory2)
  --help          Show this help message

Examples:
  # Dry run migration to see what would happen
  node scripts/migrate-byterover-to-openmemory.mjs --dry-run

  # Actual migration to openmemory
  node scripts/migrate-byterover-to-openmemory.mjs

  # Migration to openmemory2 instance
  node scripts/migrate-byterover-to-openmemory.mjs --target=openmemory2
`);
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

  async callMCPTool(toolName, parameters = {}) {
    return new Promise((resolve) => {
      // This would need to be adapted based on how MCP tools are actually called
      // For now, this is a placeholder that represents the structure
      const result = {
        toolName,
        parameters,
        timestamp: new Date().toISOString(),
        success: true,
        data: null
      };
      
      // Simulate async operation
      setTimeout(() => {
        resolve(result);
      }, 100);
    });
  }

  async retrieveByteRoverKnowledge() {
    await this.log('Retrieving knowledge from ByteRover MCP...');
    
    try {
      // Retrieve all knowledge with a high limit
      const result = await this.callMCPTool('mcp_byterover-mcp_byterover-retrive-knowledge', {
        query: 'all stored knowledge data memories conversations insights',
        limit: 1000
      });

      if (!result.success) {
        throw new Error(`Failed to retrieve ByteRover knowledge: ${result.error}`);
      }

      const memories = result.data?.memories || [];
      await this.log(`Retrieved ${memories.length} memories from ByteRover`);
      
      return memories;
    } catch (error) {
      await this.log(`Error retrieving ByteRover knowledge: ${error.message}`);
      throw error;
    }
  }

  async migrateMemoryToOpenMemory(memory, index, total) {
    const targetTool = `mcp_${this.targetMemory}_add-memory`;
    
    await this.log(`[${index + 1}/${total}] Processing memory: ${memory.content?.substring(0, 100)}...`);

    if (this.dryRun) {
      await this.log(`[DRY RUN] Would add to ${this.targetMemory}: ${memory.content?.substring(0, 200)}...`);
      return { success: true, dryRun: true };
    }

    try {
      const result = await this.callMCPTool(targetTool, {
        content: memory.content
      });

      if (result.success) {
        await this.log(`✅ Successfully migrated memory ${index + 1}`);
      } else {
        await this.log(`❌ Failed to migrate memory ${index + 1}: ${result.error}`);
      }

      return result;
    } catch (error) {
      await this.log(`❌ Error migrating memory ${index + 1}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async verifyMigration() {
    await this.log(`Verifying migration by listing ${this.targetMemory} memories...`);
    
    try {
      const listTool = `mcp_${this.targetMemory}_list-memories`;
      const result = await this.callMCPTool(listTool);
      
      if (result.success) {
        const memoryCount = result.data?.memories?.length || 0;
        await this.log(`✅ Verification complete: ${memoryCount} memories found in ${this.targetMemory}`);
        return memoryCount;
      } else {
        await this.log(`❌ Verification failed: ${result.error}`);
        return -1;
      }
    } catch (error) {
      await this.log(`❌ Verification error: ${error.message}`);
      return -1;
    }
  }

  async generateMigrationReport(byteRoverMemories, results, finalCount) {
    const reportPath = `reports/migration-report-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.md`;
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    const report = `# ByteRover to OpenMemory Migration Report

## Migration Summary

- **Source**: ByteRover MCP
- **Target**: ${this.targetMemory} MCP
- **Migration Date**: ${new Date().toISOString()}
- **Dry Run**: ${this.dryRun ? 'Yes' : 'No'}

## Statistics

- **Total Memories Retrieved**: ${byteRoverMemories.length}
- **Successfully Migrated**: ${successCount}
- **Failed Migrations**: ${failureCount}
- **Final Memory Count in Target**: ${finalCount}

## Migration Details

### Source Data Overview

The following types of knowledge were found in ByteRover:

${byteRoverMemories.slice(0, 10).map((memory, i) => {
  const preview = memory.content?.substring(0, 200) || 'No content';
  const tags = memory.tags ? memory.tags.join(', ') : 'No tags';
  return `${i + 1}. **${preview}${preview.length > 200 ? '...' : ''}**
   - Tags: ${tags}
   - Score: ${memory.score || 'N/A'}`;
}).join('\n\n')}

${byteRoverMemories.length > 10 ? `\n... and ${byteRoverMemories.length - 10} more memories` : ''}

### Migration Results

${results.map((result, i) => {
  const status = result.success ? '✅' : '❌';
  const memory = byteRoverMemories[i];
  const preview = memory?.content?.substring(0, 100) || 'Unknown';
  return `${status} Memory ${i + 1}: ${preview}${preview.length > 100 ? '...' : ''}${result.error ? ` (Error: ${result.error})` : ''}`;
}).join('\n')}

## Recommendations

${this.dryRun ? `
### Next Steps (Dry Run Completed)

1. Review this report to ensure the migration plan meets your needs
2. Run the migration without --dry-run flag to perform actual migration:
   \`\`\`bash
   node scripts/migrate-byterover-to-openmemory.mjs --target=${this.targetMemory}
   \`\`\`
3. Verify the migration was successful
4. Consider backing up ByteRover data before cleaning it up
` : `
### Post-Migration Actions

1. Verify all critical memories are accessible in ${this.targetMemory}
2. Test key workflows that depend on memory functionality
3. Consider keeping ByteRover data as backup for a period before cleanup
4. Update any documentation or processes that reference ByteRover
`}

${failureCount > 0 ? `
### Failed Migrations

${failureCount} memories failed to migrate. Consider:

1. Checking the log file for detailed error messages: \`${this.logFile}\`
2. Manually reviewing failed memories for data integrity issues
3. Re-running the migration for failed items only
4. Contacting support if persistent issues occur
` : ''}

## Technical Details

- **Log File**: \`${this.logFile}\`
- **Migration Script**: \`scripts/migrate-byterover-to-openmemory.mjs\`
- **Source Tool**: \`mcp_byterover-mcp_byterover-retrive-knowledge\`
- **Target Tool**: \`mcp_${this.targetMemory}_add-memory\`

---

*Generated automatically by the ByteRover to OpenMemory migration tool*
`;

    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, report);
      await this.log(`📄 Migration report generated: ${reportPath}`);
      return reportPath;
    } catch (error) {
      await this.log(`❌ Failed to generate report: ${error.message}`);
      throw error;
    }
  }

  async run() {
    try {
      await this.log('🚀 Starting ByteRover to OpenMemory migration...');
      await this.log(`Configuration: target=${this.targetMemory}, dryRun=${this.dryRun}`);

      // Step 1: Retrieve all knowledge from ByteRover
      const byteRoverMemories = await this.retrieveByteRoverKnowledge();
      
      if (byteRoverMemories.length === 0) {
        await this.log('ℹ️ No memories found in ByteRover. Migration completed.');
        return;
      }

      // Step 2: Migrate each memory to OpenMemory
      await this.log(`🔄 Beginning migration of ${byteRoverMemories.length} memories...`);
      
      const results = await byteRoverMemories.reduce(async (previousPromise, memory, index) => {
        const acc = await previousPromise;
        const result = await this.migrateMemoryToOpenMemory(memory, index, byteRoverMemories.length);
        acc.push(result);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        return acc;
      }, Promise.resolve([]));

      // Step 3: Verify migration
      const finalCount = this.dryRun ? 'N/A (dry run)' : await this.verifyMigration();

      // Step 4: Generate report
      const reportPath = await this.generateMigrationReport(byteRoverMemories, results, finalCount);

      // Step 5: Summary
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      await this.log('🎉 Migration completed!');
      await this.log(`📊 Summary: ${successCount} successful, ${failureCount} failed`);
      await this.log(`📄 Full report: ${reportPath}`);

      if (this.dryRun) {
        await this.log('ℹ️ This was a dry run. No actual data was migrated.');
        await this.log(`To perform the actual migration, run: node scripts/migrate-byterover-to-openmemory.mjs --target=${this.targetMemory}`);
      }

    } catch (error) {
      await this.log(`💥 Migration failed: ${error.message}`);
      console.error('Migration error:', error);
      process.exit(1);
    }
  }
}

// Run the migration
const migrationTool = new MCPMigrationTool();
migrationTool.run();
