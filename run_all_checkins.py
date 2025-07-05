#!/usr/bin/env python3
"""Run all step check-ins in sequence"""
import subprocess
import sys
import time

def run_checkin(step_file, step_name):
    print(f"\n{'='*50}")
    print(f"🔄 Running {step_name}")
    print(f"{'='*50}")
    
    result = subprocess.run([sys.executable, step_file], capture_output=True, text=True)
    
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
        ("ollama_checkin.py", "Step 1"),
        ("step2_checkin.py", "Step 2"), 
        ("step3_checkin.py", "Step 3"),
        ("step4_checkin.py", "Step 4")
    ]
    
    for step_file, step_name in steps:
        if not run_checkin(step_file, step_name):
            print(f"\n❌ Stopping at {step_name} due to non-approval")
            sys.exit(1)
        
        # Small delay between requests
        time.sleep(1)
    
    print(f"\n🎉 All steps completed successfully!")
    print("The JavaScript module loading issue on the login page has been resolved.")

if __name__ == "__main__":
    main()