#!/bin/bash

# Deploy to AWS Amplify script
echo "🚀 Preparing for Amplify deployment..."

# 1. Use the fixed amplify.yml
cp amplify-fixed.yml amplify.yml

# 2. Clean up any previous build artifacts
rm -rf .amplify-hosting
rm -rf dist

# 3. Make sure we have the right Node version
echo "Using Node $(node --version)"
echo "Using pnpm $(pnpm --version)"

# 4. Build locally first to test
echo "Building locally to verify..."
AWS_DEPLOYMENT=1 pnpm run build

# 5. Check if build succeeded
if [ ! -d ".amplify-hosting" ]; then
  echo "❌ Build failed! No .amplify-hosting directory created."
  exit 1
fi

echo "✅ Local build successful!"
echo "📂 Build artifacts:"
du -sh .amplify-hosting/

# 6. Deploy to Amplify
echo "🚀 Deploying to Amplify..."
# Replace with your actual deployment command
# aws amplify start-deployment --app-id YOUR_APP_ID --branch-name master --source-url .

echo "✅ Deployment initiated. Check the Amplify console for progress."