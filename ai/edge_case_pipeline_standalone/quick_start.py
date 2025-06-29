#!/usr/bin/env python3
"""
Quick Start Script for Edge Case Generation
Test the pipeline with a small batch
"""

import os

from edge_case_generator import EdgeCaseGenerator


def quick_test():
    """Run a quick test with 5 conversations"""

    print("🚀 Edge Case Generator - Quick Test")
    print("=" * 50)

    # Configuration - modify as needed
    API_PROVIDER = os.getenv(
        "API_PROVIDER", "openai"
    )  # Change env var or default to "openai"
    API_KEY = os.getenv(
        f"{API_PROVIDER.upper()}_API_KEY"
    )  # Dynamically get correct API key
    MODEL_NAME = os.getenv("MODEL_NAME", "gpt-3.5-turbo")  # Allow override via env

    # Only require API key for non-Ollama providers
    if API_PROVIDER != "ollama" and not API_KEY:
        print("❌ Please set your API key environment variable:")
        print(f"   export {API_PROVIDER.upper()}_API_KEY='your_key_here'")
        return

    try:
        generator = initialize_generator(API_PROVIDER, API_KEY or "", MODEL_NAME)

        # Generate small batch of prompts
        print("📝 Generating prompts (2 per category)...")
        prompts = generator.generate_prompts(scenarios_per_category=2)

        # Generate a few conversations
        print("🤖 Generating conversations (max 10)...")
        conversations = generator.generate_conversations(prompts, max_conversations=10)

        # Create training format
        print("🔄 Converting to training format...")
        training_data = generator.create_training_format(conversations)

        # Generate report
        print("📄 Generating report...")
        report = generator.generate_summary_report(conversations)
        # Optionally print or use the report to avoid unused variable warning
        if report:
            print(
                "\n--- Summary Report ---\n"
                + str(report)[:200]
                + ("..." if len(str(report)) > 200 else "")
            )

        # Results
        print("\n" + "=" * 50)
        print("✅ Quick Test Results:")
        print(f"   Generated Prompts: {len(prompts)}")
        print(f"   Generated Conversations: {len(conversations)}")
        print(f"   Training Examples: {len(training_data)}")
        print("   Output Directory: quick_test_output/")

        if conversations:
            print("\n💬 Sample Conversation:")
            sample = conversations[0]
            category = sample.get("category", "<unknown>")
            difficulty = sample.get("difficulty_level", "<unknown>")
            print(f"   Category: {category}")
            print(f"   Difficulty: {difficulty}")
            qa_pairs = sample.get("qa_pairs")
            if qa_pairs and len(qa_pairs) > 0:
                qa = qa_pairs[0]
                print(f"   Therapist: {qa.get('prompt', '')[:60]}...")
                print(f"   Client: {qa.get('response', '')[:60]}...")

        print("\n🎉 Quick test completed successfully!")
        print("📁 Check the 'quick_test_output' directory for results")

    except Exception as e:
        print(f"❌ Error during quick test: {e}")
        print("\nTroubleshooting:")
        print("1. Check your API key is correct")
        print("2. Verify internet connection")
        print("3. Check API provider spelling")
        print("4. For Ollama, ensure it's running: ollama serve")


def initialize_generator(
    api_provider: str, api_key: str, model_name: str
) -> EdgeCaseGenerator:
    # Initialize generator
    print(f"🔧 Initializing generator ({api_provider})...")
    return EdgeCaseGenerator(
        api_provider=api_provider,
        api_key=api_key,
        model_name=model_name,
        output_dir="quick_test_output",
    )


if __name__ == "__main__":
    quick_test()
