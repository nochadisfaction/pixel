#!/usr/bin/env node
/**
 * Node.js script to sync memories to OpenMemory using VS Code environment
 * This script processes the JSON batches created by sync-to-openmemory.py
 */

import fs from 'fs';

async function main() {
    const batchFile = '/home/vivi/pixel/memory_sync_batch.json';
    
    if (!fs.existsSync(batchFile)) {
        console.error(`Batch file not found: ${batchFile}`);
        process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
    console.log(`Found ${data.total_memories} memories in ${data.total_batches} batches`);
    
    const commands = [];
    
    for (const batch of data.batches) {
        for (const memory of batch) {
            const escapedContent = JSON.stringify(memory.content);
            commands.push(`mcp_openmemory_add-memory ${escapedContent}`);
        }
    }
    
    const commandFile = '/home/vivi/pixel/openmemory_sync_commands.txt';
    fs.writeFileSync(commandFile, commands.join('\n'));
    
    console.log(`Created ${commands.length} commands in ${commandFile}`);
    console.log('Commands ready for VS Code MCP execution');
}

main().catch(console.error);
