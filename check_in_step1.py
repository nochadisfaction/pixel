#!/usr/bin/env python3
import subprocess
import sys

# Run the check-in for step 1
result = subprocess.run([
    sys.executable, "check_ollama.py", 
    "Step 1 completed: Consolidated and corrected feature detection and polyfill loading logic in feature-detector.js. Added missing definitions for polyfillMap, unsupportedFeatures, window.featureDetection, polyfillsToLoad, BufferPolyfill, and loadScript function. This resolves the ReferenceError that was causing JavaScript execution to fail on the login page."
], capture_output=True, text=True)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

sys.exit(result.returncode)