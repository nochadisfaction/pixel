
# ByteRover Memory Migration Batch

This file contains the key memories from ByteRover that should be migrated to OpenMemory.
You can copy each content block and add it manually using the mcp_openmemory_add-memory tool.

## Memory 1: Task Management Protocol
```
After each significant task or fix, the user must log actions to BOTH ByteRover and OpenMemory systems to ensure comprehensive knowledge capture and audit trails across all memory systems. Logging, documentation in tasks-proposed.md, and updating ByteRover's memory together track task progress, enable robust documentation, cross-tool consistency, traceability, and transparency for all memory changes, supporting compliance, debugging, and knowledge sharing. After check-in, progress should be logged into ByteRover MCP for knowledge retention, ensuring all updates and decisions are traceable and preserved within the workspace. All actions and changes in the bridge are logged with OpenMemory and ByteRover, ensuring traceability within the memory workspace. Context: Diligent cross-logging ensures synchronization and up-to-date audit trails across both systems, reducing compliance risks.
```

## Memory 2: Bias Detection Database Schema
```
The database schema supporting bias detection now includes four specialized tables: ai_bias_analysis, ai_bias_metrics, ai_bias_alerts, and ai_bias_reports. Key features are CRUD repository methods, materialized views for reporting efficiency, 90-day data retention with automatic cleanup, Row Level Security (RLS) for access control, and performance-optimized indexes. This schema ensures secure, scalable, and query-efficient data management for bias analysis operations.
```

## Memory 3: Clinical Knowledge Base Integration
```
Integration directly utilizes the Real ClinicalKnowledgeBase, ensuring that all AI outputs are both evidence-based and clinically relevant. Context: Direct access to live clinical knowledge guarantees decision support aligns with current medical guidelines.
```

## Memory 4: Validation Function Enhancement
```
Enhanced validateConversation function with production-grade validation, improving robustness in conversation validation logic and ensuring comprehensive coverage of clinical, flow, ethical, and technical aspects for production readiness. This robust validation approach is vital to prevent unsafe, unstructured, or non-compliant conversation handling in AI-powered mental health applications.
```

## Memory 5: SVG Visualization Assets
```
Created a set of 5 professional SVG visualizations that illustrate critical concepts: AI-first vs traditional therapist training, edge case scenario generation, a privacy technology stack (using FHE/ZK), a structured four-phase learning journey, and global benefits. These assets are key for reusable explainer content across technical documentation, marketing, and education. Context: Visual aids like these streamline concept communication and support long-term content reuse in diverse scenarios.
```

## Memory 6: AI Model Configuration
```
The system uses createMentalLLaMAFromEnv() to initialize the production MentalLLaMA adapter with a connected clinical knowledge base. This ensures all AI analysis connects to live clinical data and operates with actual production parameters. Context: Facilitates seamless, clinically relevant workflows by guaranteeing true-to-life AI integration.
```

## Memory 7: HIPAA Compliance Implementation
```
Audit logs are encrypted and compliant with HIPAA when logging sensitive information. BiasDetectionEngine implements HIPAA-compliant audit logging to securely track decision logic and user/system actions, fulfilling privacy and regulatory requirements for healthcare applications. This guarantees both regulated data protection and traceable operation in regulated environments.
```

## Memory 8: Performance Testing Protocol
```
Memory efficiency is directly tested during extended integration test runs, enforcing that memory usage does not increase by more than 30MB. This practice enables early detection of memory leaks and helps maintain operational stability in long-running deployments.
```

## Migration Commands

For each memory above, run:

```bash
# Use the mcp_openmemory_add-memory tool with the content from each memory block
# Example for Memory 1:
Tool: mcp_openmemory_add-memory
Parameters: {
  "content": "After each significant task or fix, the user must log actions to BOTH ByteRover and OpenMemory systems..."
}
```

## Verification

After migration, verify with:
```bash
Tool: mcp_openmemory_list-memories
Tool: mcp_openmemory_search-memories
Parameters: { "query": "bias detection" }
```
