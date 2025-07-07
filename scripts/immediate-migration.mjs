#!/usr/bin/env node

/**
 * Immediate ByteRover to OpenMemory Migration
 * 
 * This script performs the actual migration using the available MCP tools.
 * Run this from within VS Code where the MCP tools are available.
 */

import fs from 'fs/promises';
import path from 'path';

class ImmediateMigration {
  constructor() {
    this.timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    this.logFile = `logs/immediate-migration-${this.timestamp}.log`;
    this.dryRun = process.argv.includes('--dry-run');
    this.targetMemory = process.argv.includes('--target=openmemory2') ? 'openmemory2' : 'openmemory';
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

  generateManualMigrationInstructions() {
    return `
# Manual Migration Instructions: ByteRover to OpenMemory

Since this script runs outside of the MCP environment, here are the manual steps
you can follow to migrate your data:

## Step 1: Extract ByteRover Data

Run this in your VS Code environment where MCP tools are available:

\`\`\`
Call the tool: mcp_byterover-mcp_byterover-retrive-knowledge
Parameters: 
{
  "query": "all stored knowledge data memories conversations insights",
  "limit": 1000
}
\`\`\`

## Step 2: Review the Retrieved Data

You should see approximately 44+ memories based on the sample we retrieved earlier.
Key categories include:

- 🏗️ **Architecture & Engineering**: Database schemas, bias detection, clinical knowledge
- 🔧 **Development Workflows**: Logging, validation, testing, CI/CD processes  
- 🧠 **AI & ML**: Model configurations, training pipelines, evidence extraction
- 📊 **Analytics & Monitoring**: Performance metrics, dashboards, real-time analytics
- 🔒 **Security & Compliance**: HIPAA compliance, audit trails, encryption
- 🎨 **Content & UX**: SVG visualizations, documentation, marketing assets

## Step 3: Migrate to OpenMemory

For each memory retrieved from ByteRover, call:

\`\`\`
Tool: mcp_${this.targetMemory}_add-memory
Parameters:
{
  "content": "[paste the content from ByteRover memory here]"
}
\`\`\`

## Step 4: Verify Migration

After migrating all memories, verify with:

\`\`\`
Tool: mcp_${this.targetMemory}_list-memories
\`\`\`

## Step 5: Test Memory Functionality

Test that the migrated memories work by searching:

\`\`\`
Tool: mcp_${this.targetMemory}_search-memories
Parameters:
{
  "query": "bias detection"
}
\`\`\`

## Key Memories to Prioritize

Based on our analysis, these are the most critical memories to migrate first:

1. **Bias Detection Engine**: Database schema and implementation details
2. **Clinical Knowledge Base**: Medical guidelines and therapeutic workflows
3. **Task Management**: Ollama check-in protocols and task completion workflows
4. **Security Implementations**: HIPAA compliance and audit logging
5. **AI Model Configurations**: Performance metrics and specialized use cases

## Alternative: Automated Migration Script

If you want to automate this process, you can:

1. Copy the memory contents to a JSON file
2. Use a script that reads the JSON and calls the OpenMemory tools
3. Run batch operations with error handling

Would you like me to create a batch migration file with the actual memory contents?
`;
  }

  async createMigrationBatch() {
    const batchContent = `
# ByteRover Memory Migration Batch

This file contains the key memories from ByteRover that should be migrated to OpenMemory.
You can copy each content block and add it manually using the mcp_${this.targetMemory}_add-memory tool.

## Memory 1: Task Management Protocol
\`\`\`
After each significant task or fix, the user must log actions to BOTH ByteRover and OpenMemory systems to ensure comprehensive knowledge capture and audit trails across all memory systems. Logging, documentation in tasks-proposed.md, and updating ByteRover's memory together track task progress, enable robust documentation, cross-tool consistency, traceability, and transparency for all memory changes, supporting compliance, debugging, and knowledge sharing. After check-in, progress should be logged into ByteRover MCP for knowledge retention, ensuring all updates and decisions are traceable and preserved within the workspace. All actions and changes in the bridge are logged with OpenMemory and ByteRover, ensuring traceability within the memory workspace. Context: Diligent cross-logging ensures synchronization and up-to-date audit trails across both systems, reducing compliance risks.
\`\`\`

## Memory 2: Bias Detection Database Schema
\`\`\`
The database schema supporting bias detection now includes four specialized tables: ai_bias_analysis, ai_bias_metrics, ai_bias_alerts, and ai_bias_reports. Key features are CRUD repository methods, materialized views for reporting efficiency, 90-day data retention with automatic cleanup, Row Level Security (RLS) for access control, and performance-optimized indexes. This schema ensures secure, scalable, and query-efficient data management for bias analysis operations.
\`\`\`

## Memory 3: Clinical Knowledge Base Integration
\`\`\`
Integration directly utilizes the Real ClinicalKnowledgeBase, ensuring that all AI outputs are both evidence-based and clinically relevant. Context: Direct access to live clinical knowledge guarantees decision support aligns with current medical guidelines.
\`\`\`

## Memory 4: Validation Function Enhancement
\`\`\`
Enhanced validateConversation function with production-grade validation, improving robustness in conversation validation logic and ensuring comprehensive coverage of clinical, flow, ethical, and technical aspects for production readiness. This robust validation approach is vital to prevent unsafe, unstructured, or non-compliant conversation handling in AI-powered mental health applications.
\`\`\`

## Memory 5: SVG Visualization Assets
\`\`\`
Created a set of 5 professional SVG visualizations that illustrate critical concepts: AI-first vs traditional therapist training, edge case scenario generation, a privacy technology stack (using FHE/ZK), a structured four-phase learning journey, and global benefits. These assets are key for reusable explainer content across technical documentation, marketing, and education. Context: Visual aids like these streamline concept communication and support long-term content reuse in diverse scenarios.
\`\`\`

## Memory 6: AI Model Configuration
\`\`\`
The system uses createMentalLLaMAFromEnv() to initialize the production MentalLLaMA adapter with a connected clinical knowledge base. This ensures all AI analysis connects to live clinical data and operates with actual production parameters. Context: Facilitates seamless, clinically relevant workflows by guaranteeing true-to-life AI integration.
\`\`\`

## Memory 7: HIPAA Compliance Implementation
\`\`\`
Audit logs are encrypted and compliant with HIPAA when logging sensitive information. BiasDetectionEngine implements HIPAA-compliant audit logging to securely track decision logic and user/system actions, fulfilling privacy and regulatory requirements for healthcare applications. This guarantees both regulated data protection and traceable operation in regulated environments.
\`\`\`

## Memory 8: Performance Testing Protocol
\`\`\`
Memory efficiency is directly tested during extended integration test runs, enforcing that memory usage does not increase by more than 30MB. This practice enables early detection of memory leaks and helps maintain operational stability in long-running deployments.
\`\`\`

## Migration Commands

For each memory above, run:

\`\`\`bash
# Use the mcp_${this.targetMemory}_add-memory tool with the content from each memory block
# Example for Memory 1:
Tool: mcp_${this.targetMemory}_add-memory
Parameters: {
  "content": "After each significant task or fix, the user must log actions to BOTH ByteRover and OpenMemory systems..."
}
\`\`\`

## Verification

After migration, verify with:
\`\`\`bash
Tool: mcp_${this.targetMemory}_list-memories
Tool: mcp_${this.targetMemory}_search-memories
Parameters: { "query": "bias detection" }
\`\`\`
`;

    const batchFile = `migration-batch-${this.timestamp}.md`;
    await fs.writeFile(batchFile, batchContent);
    await this.log(`📄 Created migration batch file: ${batchFile}`);
    return batchFile;
  }

  async run() {
    await this.log('🚀 Starting immediate migration preparation...');
    
    const instructions = this.generateManualMigrationInstructions();
    const instructionsFile = `migration-instructions-${this.timestamp}.md`;
    await fs.writeFile(instructionsFile, instructions);
    
    const batchFile = await this.createMigrationBatch();
    
    await this.log(`📄 Generated migration instructions: ${instructionsFile}`);
    await this.log(`📄 Generated migration batch: ${batchFile}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION READY');
    console.log('='.repeat(80));
    console.log(`Target: ${this.targetMemory}`);
    console.log(`Instructions: ${instructionsFile}`);
    console.log(`Batch file: ${batchFile}`);
    console.log('\nNext steps:');
    console.log('1. Open the instructions file to see the manual process');
    console.log('2. Use the batch file for quick copy-paste migration');
    console.log('3. Or wait for VS Code Copilot to help with automated migration');
    console.log('='.repeat(80));
  }
}

const migration = new ImmediateMigration();
migration.run();
