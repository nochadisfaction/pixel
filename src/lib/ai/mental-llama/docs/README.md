# MentalLLaMA Integration - Notes and Future Work

This document outlines items that are currently stubbed, deferred, or require future work for the MentalLLaMA integration.

## Core MentalLLaMAAdapter and TaskRouter

The `MentalLLaMAAdapter.ts` and `MentalHealthTaskRouter.ts` now have a more complete foundational structure. Key updates include:

### 1. TaskRouter LLM Integration
- **Current State**: The `MentalHealthTaskRouter`'s `performBroadClassificationLLM` method **now makes actual calls to an LLM** (via `OpenAIModelProvider` if configured) for classifying text. It expects a JSON response from the LLM.
- **Future Work**:
    - Monitor and refine the prompts used for LLM classification for accuracy and reliability across diverse inputs.
    - Enhance error handling for a wider variety of LLM API issues (e.g., rate limits, content filters).
    - Explore fine-tuning a smaller, specialized model for routing if cost or latency of general-purpose LLMs becomes an issue.
    - Continuously update `LLM_CATEGORY_TO_ANALYZER_MAP` based on LLM performance and desired routing behaviors.

### 2. ModelProvider Integration
- **Current State**:
    - An `IModelProvider` interface is defined.
    - `OpenAIModelProvider` is implemented as a concrete provider.
    - `MentalLLaMAFactory` now initializes `OpenAIModelProvider` if an API key is present and passes it to the adapter and the router's `llmInvoker`.
    - `MentalLLaMAAdapter` now uses the `ModelProvider` to perform **detailed analysis for the `general_mental_health` category**.
- **Future Work**:
    - Implement detailed analysis using the `ModelProvider` for other non-crisis categories (e.g., depression, anxiety, stress) in `MentalLLaMAAdapter`. This will involve designing specific prompts for each category to elicit explanations and supporting evidence.
    - Implement other `IModelProvider` concrete classes for different LLMs (e.g., Anthropic, local models via Ollama) to allow flexibility.
    - The `analyzeMentalHealthWithExpertGuidance` and `evaluateExplanationQuality` methods in the adapter still require full implementations, which will leverage the `ModelProvider`.

### 3. PythonBridge Full Integration
- **Current State**: The `PythonBridge` is stubbed as `undefined` in the `MentalLLaMAFactory`.
- **Future Work**:
    - If specific Python-based models or libraries are required (e.g., for advanced evaluation metrics, specialized local models), implement the `MentalLLaMAPythonBridge.ts` and integrate it.
    - Optimize communication with the Python bridge if it becomes a performance bottleneck.

## Performance Optimizations (Deferred)

The following performance optimization tasks from the original checklist are deferred until the core functionality is more completely implemented:

- **Caching Strategies**:
    - Implement caching for `TaskRouter` decisions on identical or highly similar short texts.
    - Cache responses from the `ModelProvider` where appropriate.
- **Batching Requests**:
    - Implement batching for `TaskRouter`'s LLM calls if the LLM supports it.
    - Implement batching for `ModelProvider` inference calls if underlying models support it.
- **Asynchronous Sub-tasks**:
    - Identify and refactor I/O-bound or computationally intensive sub-tasks within `analyzeMentalHealth` for asynchronous execution.
- **Pre/Post-processing Optimization**:
    - Conduct a detailed review of text cleaning, tokenization, and result formatting steps for performance.

## Scalability and Reliability (Future Work)

These items require dedicated effort once the system is more mature:

- **Scale to Production Requirements**:
    - This is a broad task that involves ongoing assessment of all components (adapter, router, model provider, APIs) under production load.
    - It includes optimizing database queries (if any), ensuring efficient resource utilization, and potentially re-architecting components that become bottlenecks.
- **Assess Infrastructure for Potential Upgrades**:
    - Evaluate hosting infrastructure for LLMs, API servers, and other components.
    - Consider needs for faster compute, more memory, optimized network configurations, etc.
- **Design Scalability Tests**:
    - Develop and execute comprehensive load testing scenarios to simulate various traffic patterns and data volumes.
    - Use these tests to identify scaling limits and bottlenecks.
- **Set up Reliability Measurement**:
    - Implement robust monitoring, logging, and alerting to track:
        - System uptime and availability.
        - Percentage of successful analyses versus errors.
        - Latency of API responses and critical internal operations.
        - Crisis alert delivery rates and notification pipeline health.
        - Resource utilization (CPU, memory, network) of deployed services.

## User/Session Flagging API Integration
- **Current State**: A `TODO` comment exists in `MentalLLaMAAdapter.ts` for this.
- **Future Work**: Once an external user/session management service/API is available for flagging accounts or sessions for immediate review, integrate this call into the crisis detection path of the adapter.

This document should be updated as these items are addressed.
