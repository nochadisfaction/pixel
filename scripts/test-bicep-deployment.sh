#!/bin/bash
# Test script for Bicep deployment validation and troubleshooting
#
# This script helps debug Bicep deployment issues before running in Azure DevOps
# It can be used locally or in CI/CD to validate templates

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BICEP_TEMPLATE="$PROJECT_ROOT/deploy/azure/main.bicep"

# Default values (can be overridden via environment variables)
RESOURCE_GROUP_NAME="${RESOURCE_GROUP_NAME:-pixelated-test-rg}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
APP_NAME="${APP_NAME:-pixelated}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Azure CLI version
    AZ_VERSION=$(az --version | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    log_info "Azure CLI version: $AZ_VERSION"
    
    # Check if Bicep is installed
    if ! az bicep version &> /dev/null; then
        log_warning "Bicep is not installed. Installing..."
        az bicep install
    fi
    
    # Check Bicep version
    BICEP_VERSION=$(az bicep version)
    log_info "Bicep version: $BICEP_VERSION"
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Display current subscription
    SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
    SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
    log_info "Current subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
    
    log_success "Prerequisites check completed"
}

# Function to validate Bicep template syntax
validate_bicep_template() {
    log_info "Validating Bicep template syntax..."
    
    if [ ! -f "$BICEP_TEMPLATE" ]; then
        log_error "Bicep template not found at: $BICEP_TEMPLATE"
        exit 1
    fi
    
    # Build Bicep template to check for syntax errors
    if az bicep build --file "$BICEP_TEMPLATE" --stdout > /dev/null; then
        log_success "Bicep template syntax is valid"
    else
        log_error "Bicep template has syntax errors"
        exit 1
    fi
}

# Function to validate deployment parameters
validate_deployment() {
    log_info "Validating deployment parameters..."
    
    # Create a temporary parameters file
    TEMP_PARAMS=$(mktemp)
    cat > "$TEMP_PARAMS" << EOF
{
    "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "appName": {
            "value": "$APP_NAME"
        },
        "environment": {
            "value": "$ENVIRONMENT"
        },
        "location": {
            "value": "$LOCATION"
        },
        "enableAzureOpenAI": {
            "value": true
        },
        "enableStorage": {
            "value": true
        },
        "enableMonitoring": {
            "value": true
        }
    }
}
EOF

    # Validate deployment without actually deploying
    if az deployment group validate \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --template-file "$BICEP_TEMPLATE" \
        --parameters "@$TEMP_PARAMS" \
        --output none; then
        log_success "Deployment validation passed"
    else
        log_error "Deployment validation failed"
        # Clean up temp file
        rm -f "$TEMP_PARAMS"
        exit 1
    fi
    
    # Clean up temp file
    rm -f "$TEMP_PARAMS"
}

# Function to perform what-if analysis
perform_whatif() {
    log_info "Performing what-if analysis..."
    
    az deployment group what-if \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --template-file "$BICEP_TEMPLATE" \
        --parameters \
            appName="$APP_NAME" \
            environment="$ENVIRONMENT" \
            location="$LOCATION" \
            enableAzureOpenAI=true \
            enableStorage=true \
            enableMonitoring=true \
        --result-format FullResourcePayloads
    
    log_success "What-if analysis completed"
}

# Function to test deployment with improved error handling
test_deployment() {
    log_info "Testing deployment with Azure CLI bug workarounds..."
    
    # Configure Azure CLI to prevent output consumption issues
    export AZURE_CORE_OUTPUT=json
    export AZURE_CORE_ONLY_SHOW_ERRORS=true
    export AZURE_CORE_DISABLE_CONFIRM_PROMPT=1
    
    # Create a unique deployment name
    DEPLOYMENT_NAME="test-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Starting test deployment: $DEPLOYMENT_NAME"
    
    # Attempt deployment with the same parameters as the pipeline
    if az deployment group create \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --name "$DEPLOYMENT_NAME" \
        --template-file "$BICEP_TEMPLATE" \
        --parameters \
            appName="$APP_NAME" \
            environment="$ENVIRONMENT" \
            location="$LOCATION" \
            enableAzureOpenAI=true \
            enableStorage=true \
            enableMonitoring=true \
        --output json \
        --only-show-errors 2>/dev/null; then
        
        # Verify deployment success separately
        STATUS=$(az deployment group show \
            --resource-group "$RESOURCE_GROUP_NAME" \
            --name "$DEPLOYMENT_NAME" \
            --query "properties.provisioningState" \
            --output tsv 2>/dev/null || echo "Failed")
        
        if [ "$STATUS" = "Succeeded" ]; then
            log_success "Test deployment completed successfully"
            
            # Show deployment outputs
            log_info "Deployment outputs:"
            az deployment group show \
                --resource-group "$RESOURCE_GROUP_NAME" \
                --name "$DEPLOYMENT_NAME" \
                --query "properties.outputs" \
                --output table
        else
            log_error "Test deployment failed with status: $STATUS"
            exit 1
        fi
    else
        log_error "Test deployment failed"
        exit 1
    fi
}

# Function to check resource group
check_resource_group() {
    log_info "Checking resource group: $RESOURCE_GROUP_NAME"
    
    if az group show --name "$RESOURCE_GROUP_NAME" >/dev/null 2>&1; then
        log_success "Resource group $RESOURCE_GROUP_NAME exists"
    else
        log_warning "Resource group $RESOURCE_GROUP_NAME does not exist. Creating..."
        if az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION" --output none; then
            log_success "Resource group $RESOURCE_GROUP_NAME created successfully"
        else
            log_error "Failed to create resource group $RESOURCE_GROUP_NAME"
            exit 1
        fi
    fi
}

# Function to clean up test resources (optional)
cleanup_test_resources() {
    if [ "${CLEANUP:-false}" = "true" ]; then
        log_warning "Cleaning up test resources..."
        read -p "Are you sure you want to delete resource group $RESOURCE_GROUP_NAME? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            az group delete --name "$RESOURCE_GROUP_NAME" --yes --no-wait
            log_success "Resource group deletion initiated"
        else
            log_info "Cleanup cancelled"
        fi
    fi
}

# Function to show deployment history
show_deployment_history() {
    log_info "Recent deployment history:"
    az deployment group list \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --query "[?contains(name, 'test-') || contains(name, 'main-')].{Name:name, State:properties.provisioningState, Timestamp:properties.timestamp}" \
        --output table 2>/dev/null || log_warning "Could not retrieve deployment history"
}

# Main execution
main() {
    echo "🚀 Bicep Deployment Test Script"
    echo "================================"
    echo "Resource Group: $RESOURCE_GROUP_NAME"
    echo "Location: $LOCATION"
    echo "Environment: $ENVIRONMENT"
    echo "App Name: $APP_NAME"
    echo "================================"
    echo
    
    # Check what operation to perform
    case "${1:-validate}" in
        "validate")
            check_prerequisites
            validate_bicep_template
            check_resource_group
            validate_deployment
            log_success "Validation completed successfully"
            ;;
        "whatif")
            check_prerequisites
            validate_bicep_template
            check_resource_group
            perform_whatif
            ;;
        "deploy")
            check_prerequisites
            validate_bicep_template
            check_resource_group
            validate_deployment
            test_deployment
            log_success "Test deployment completed successfully"
            ;;
        "history")
            check_prerequisites
            check_resource_group
            show_deployment_history
            ;;
        "cleanup")
            CLEANUP=true
            cleanup_test_resources
            ;;
        "full")
            check_prerequisites
            validate_bicep_template
            check_resource_group
            validate_deployment
            perform_whatif
            echo
            read -p "Proceed with test deployment? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                test_deployment
                log_success "Full test completed successfully"
            else
                log_info "Test deployment skipped"
            fi
            ;;
        *)
            echo "Usage: $0 [validate|whatif|deploy|history|cleanup|full]"
            echo
            echo "  validate - Validate Bicep template and parameters"
            echo "  whatif   - Perform what-if analysis"
            echo "  deploy   - Run test deployment"
            echo "  history  - Show deployment history"
            echo "  cleanup  - Clean up test resources"
            echo "  full     - Run all validations and optionally deploy"
            echo
            echo "Environment variables:"
            echo "  RESOURCE_GROUP_NAME - Resource group name (default: pixelated-test-rg)"
            echo "  LOCATION           - Azure location (default: eastus)"
            echo "  ENVIRONMENT        - Environment name (default: dev)"
            echo "  APP_NAME           - Application name (default: pixelated)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
