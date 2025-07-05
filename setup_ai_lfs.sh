#!/bin/bash

# Setup AI folder for Git LFS
# This script helps add large AI files to Git LFS systematically

set -e

echo "🚀 Setting up AI folder for Git LFS..."

# Check if git lfs is installed
if ! command -v git-lfs &> /dev/null; then
    echo "❌ Git LFS is not installed. Please install it first:"
    echo "   Ubuntu/Debian: sudo apt install git-lfs"
    echo "   macOS: brew install git-lfs"
    echo "   Or download from: https://git-lfs.github.io/"
    exit 1
fi

# Initialize git lfs if not already done
echo "📋 Initializing Git LFS..."
git lfs install

# Track the patterns we've defined
echo "🎯 Setting up LFS tracking patterns..."

# Large dataset files
git lfs track "ai/**/*.parquet"
git lfs track "ai/**/*dataset*.jsonl"
git lfs track "ai/**/*dataset*.csv" 
git lfs track "ai/**/*dataset*.json"

# Large processed files
git lfs track "ai/**/*FINAL.jsonl"
git lfs track "ai/**/*integrated*.jsonl"
git lfs track "ai/**/*combined*.jsonl"
git lfs track "ai/**/*scattered*.jsonl"

# Binary and media files
git lfs track "ai/**/*.epub"
git lfs track "ai/**/*.mobi"
git lfs track "ai/**/*.azw3"
git lfs track "ai/**/*.mp3"
git lfs track "ai/**/*.sav"

# Specific large files
git lfs track "ai/datasets/datasets/data/reddit_depression_dataset.csv"
git lfs track "ai/datasets/datasets/data/HealthCareMagic-100k.json"

echo "✅ LFS tracking patterns configured"

# Add .gitattributes to git
echo "📝 Adding .gitattributes to git..."
git add .gitattributes

# Show what files will be tracked by LFS
echo "🔍 Files that will be tracked by LFS:"
git lfs ls-files

echo "📊 Large files found in AI folder:"
find ai -type f -size +50M -exec ls -lh {} \; | head -20

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Review the files listed above"
echo "2. Add files to git in batches:"
echo "   git add ai/datasets/datasets/processed/"
echo "   git commit -m 'Add processed datasets to LFS'"
echo "   git add ai/datasets/datasets/ultrafeedback_binarized/"
echo "   git commit -m 'Add ultrafeedback data to LFS'"
echo "   git add ai/legacy/Wendy/datasets/"
echo "   git commit -m 'Add Wendy datasets to LFS'"
echo "3. Push to your LFS-enabled remote:"
echo "   git push origin main"
echo ""
echo "⚠️  Important: Add files in small batches to avoid timeouts!"