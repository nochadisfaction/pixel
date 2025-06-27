#!/bin/bash

# AWS Amplify Deployment Script with Fixed Configuration
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main function
main() {
    log_info "Starting AWS Amplify deployment with fixed configuration..."
    
    # 1. Use the AWS-specific Astro config
    log_info "Setting up AWS-specific configuration..."
    cp astro.config.aws.mjs astro.config.mjs
    
    # 2. Use the fixed amplify.yml
    log_info "Using fixed Amplify configuration..."
    cp amplify-fixed.yml amplify.yml
    
    # 3. Clean up any previous build artifacts
    log_info "Cleaning up previous build artifacts..."
    rm -rf .amplify-hosting
    rm -rf dist
    
    # 4. Build locally to test
    log_info "Building locally to verify..."
    AWS_DEPLOYMENT=1 pnpm run build
    
    # 5. Check if build succeeded
    if [ ! -d ".amplify-hosting" ]; then
        log_error "Build failed! No .amplify-hosting directory created."
        exit 1
    fi
    
    log_success "Local build successful!"
    log_info "Build artifacts:"
    du -sh .amplify-hosting/
    
    # 6. Deploy to Amplify using the AWS CLI
    log_info "Ready to deploy to Amplify!"
    log_info "To deploy, run the following command:"
    echo "aws amplify start-deployment --app-id d1ub6j7vfsd6kq --branch-name master"
    
    log_success "Setup completed successfully!"
}

# Run main function
main "$@"