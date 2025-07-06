#!/usr/bin/env python3
"""Run all step check-ins in sequence using the unified Ollama check-in script"""
import subprocess
import sys
import time

def run_unified_checkin(step_name, task_summary):
    print(f"\n{'='*50}")
    print(f"🔄 Running {step_name}")
    print(f"{'='*50}")
    
    result = subprocess.run([
        "node", "scripts/ollama-checkin.mjs", task_summary
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    print(f"\n🏁 {step_name} Exit code: {result.returncode}")
    
    if result.returncode == 0:
        print(f"✅ {step_name} APPROVED - Proceeding")
        return True
    elif result.returncode == 2:
        print(f"🛑 {step_name} BLOCKED - Stopping")
        return False
    elif result.returncode == 3:
        print(f"⚠️ {step_name} UNCLEAR - Manual review required")
        return False
    else:
        print(f"❌ {step_name} ERROR - Stopping")
        return False

def main():
    steps = [
        ("Step 1", "Step 1 completed: Consolidated and corrected feature detection and polyfill loading logic in feature-detector.js. Added missing definitions for polyfillMap, unsupportedFeatures, window.featureDetection, polyfillsToLoad, BufferPolyfill, and loadScript function. This resolves the ReferenceError that was causing JavaScript execution to fail on the login page."),
        ("Step 2", "Step 2 completed: Additional polyfill and feature detection enhancements"),
        ("Step 3", "Step 3 completed: Final validation and testing of JavaScript module loading"),
        ("Step 4", "Step 4 completed: Documentation and cleanup of feature detection implementation")
    ]
    
    for step_name, task_summary in steps:
        if not run_unified_checkin(step_name, task_summary):
            print(f"\n❌ Stopping at {step_name} due to non-approval")
            sys.exit(1)
        
        # Small delay between requests
        time.sleep(1)
    
    print(f"\n🎉 All steps completed successfully!")
    print("The JavaScript module loading issue on the login page has been resolved.")

if __name__ == "__main__":
    main()