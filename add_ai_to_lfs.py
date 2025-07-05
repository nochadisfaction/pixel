#!/usr/bin/env python3
"""
AI Folder Git LFS Setup Script
Systematically adds AI folder files to Git LFS in manageable batches
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def get_large_files(directory, min_size_mb=50):
    """Find files larger than specified size in MB"""
    large_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            try:
                size_mb = os.path.getsize(filepath) / (1024 * 1024)
                if size_mb >= min_size_mb:
                    large_files.append((filepath, size_mb))
            except OSError:
                continue
    return sorted(large_files, key=lambda x: x[1], reverse=True)

def setup_lfs_tracking():
    """Setup LFS tracking patterns"""
    patterns = [
        "ai/**/*.parquet",
        "ai/**/*dataset*.jsonl", 
        "ai/**/*dataset*.csv",
        "ai/**/*dataset*.json",
        "ai/**/*FINAL.jsonl",
        "ai/**/*integrated*.jsonl",
        "ai/**/*combined*.jsonl",
        "ai/**/*scattered*.jsonl",
        "ai/**/*.epub",
        "ai/**/*.mp3",
        "ai/**/*.sav"
    ]
    
    print("🎯 Setting up LFS tracking patterns...")
    for pattern in patterns:
        success, stdout, stderr = run_command(f'git lfs track "{pattern}"')
        if success:
            print(f"✅ Tracking: {pattern}")
        else:
            print(f"❌ Failed to track: {pattern} - {stderr}")

def add_files_by_category():
    """Add files to git in organized batches"""
    categories = {
        "processed_datasets": "ai/datasets/datasets/processed/",
        "ultrafeedback": "ai/datasets/datasets/ultrafeedback_binarized/",
        "wendy_datasets": "ai/legacy/Wendy/datasets/",
        "books_docs": "ai/docs/Books/",
        "parquet_files": "ai/datasets/datasets/*/data/*.parquet",
        "audio_files": "ai/legacy/Wendy/priority-4/*.mp3"
    }
    
    for category, path_pattern in categories.items():
        print(f"\n📁 Adding {category}...")
        
        # Check if path exists
        if "*" in path_pattern:
            # Use find for glob patterns
            success, stdout, stderr = run_command(f'find {path_pattern.split("*")[0]} -name "{path_pattern.split("/")[-1]}" 2>/dev/null | head -5')
            if stdout.strip():
                print(f"Found files matching pattern: {path_pattern}")
                response = input(f"Add {category} files? (y/n): ")
                if response.lower() == 'y':
                    run_command(f'git add {path_pattern}')
                    run_command(f'git commit -m "Add {category} to LFS"')
        else:
            if os.path.exists(path_pattern):
                response = input(f"Add {category} ({path_pattern})? (y/n): ")
                if response.lower() == 'y':
                    success, stdout, stderr = run_command(f'git add "{path_pattern}"')
                    if success:
                        run_command(f'git commit -m "Add {category} to LFS"')
                        print(f"✅ Added {category}")
                    else:
                        print(f"❌ Failed to add {category}: {stderr}")
            else:
                print(f"⚠️ Path not found: {path_pattern}")

def main():
    """Main execution function"""
    print("🚀 AI Folder Git LFS Setup")
    print("=" * 40)
    
    # Check if we're in a git repository
    if not os.path.exists('.git'):
        print("❌ Not in a git repository. Please run from project root.")
        sys.exit(1)
    
    # Check if git lfs is available
    success, stdout, stderr = run_command('git lfs version')
    if not success:
        print("❌ Git LFS not installed or not available")
        sys.exit(1)
    
    print(f"✅ Git LFS version: {stdout.strip()}")
    
    # Initialize LFS
    run_command('git lfs install')
    
    # Setup tracking patterns
    setup_lfs_tracking()
    
    # Add .gitattributes
    run_command('git add .gitattributes')
    
    # Show large files
    print("\n📊 Large files in AI folder (>50MB):")
    large_files = get_large_files('ai', 50)
    for filepath, size_mb in large_files[:10]:
        print(f"  {filepath}: {size_mb:.1f}MB")
    
    if large_files:
        print(f"\nFound {len(large_files)} large files total")
    
    # Interactive file addition
    print("\n🎯 Ready to add files in batches...")
    add_files_by_category()
    
    print("\n✅ Setup complete!")
    print("Next steps:")
    print("1. Review staged files: git status")
    print("2. Push to LFS remote: git push origin main")
    print("3. Verify LFS files: git lfs ls-files")

if __name__ == "__main__":
    main()