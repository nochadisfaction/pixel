#!/usr/bin/env python3
import subprocess
import sys

# Step 1 check-in
print("🔄 Running Step 1 check-in...")
result = subprocess.run([
    "node", "scripts/ollama-checkin.mjs", 
    "Step 1: Fixed feature detection script by adding missing definitions - polyfillMap, unsupportedFeatures, BufferPolyfill, loadScript function, and window.featureDetection global. This resolves the ReferenceError that prevented proper JavaScript module loading on the login page."
], capture_output=True, text=True)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

print(f"\n🏁 Exit code: {result.returncode}")
sys.exit(result.returncode)