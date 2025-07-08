#!/bin/bash
# Script to validate Key Vault integration with App Service

set -e

# Function to display usage
usage() {
    echo "Usage: $0 -r RESOURCE_GROUP -a APP_NAME -v VAULT_NAME"
    echo ""
    echo "Options:"
    echo "  -r, --resource-group    Azure resource group name"
    echo "  -a, --app-name          App Service name"
    echo "  -v, --vault-name        Key Vault name"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -r pixelated-prod-rg -a pixelated-prod-app -v pixelated-prod-kv"
    exit 1
}

# Parse command line arguments
RESOURCE_GROUP=""
APP_NAME=""
VAULT_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -a|--app-name)
            APP_NAME="$2"
            shift 2
            ;;
        -v|--vault-name)
            VAULT_NAME="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check required parameters
if [[ -z "$RESOURCE_GROUP" || -z "$APP_NAME" || -z "$VAULT_NAME" ]]; then
    echo "Error: All parameters are required"
    usage
fi

echo "🔍 Validating Key Vault integration for App Service..."
echo "Resource Group: $RESOURCE_GROUP"
echo "App Service: $APP_NAME"
echo "Key Vault: $VAULT_NAME"
echo ""

# Check if Azure CLI is logged in
if ! az account show &> /dev/null; then
    echo "❌ Error: Not logged in to Azure CLI. Please run 'az login' first."
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Check if resource group exists
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo "❌ Error: Resource group '$RESOURCE_GROUP' not found"
    exit 1
fi
echo "✅ Resource group exists"

# Check if App Service exists
if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "❌ Error: App Service '$APP_NAME' not found"
    exit 1
fi
echo "✅ App Service exists"

# Check if Key Vault exists
if ! az keyvault show --name "$VAULT_NAME" &> /dev/null; then
    echo "❌ Error: Key Vault '$VAULT_NAME' not found"
    exit 1
fi
echo "✅ Key Vault exists"

# Check App Service managed identity
echo ""
echo "🔍 Checking App Service managed identity..."
MANAGED_IDENTITY=$(az webapp identity show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "principalId" --output tsv 2>/dev/null)

if [[ -z "$MANAGED_IDENTITY" || "$MANAGED_IDENTITY" == "null" ]]; then
    echo "❌ Error: App Service managed identity not configured"
    exit 1
fi
echo "✅ Managed identity configured: $MANAGED_IDENTITY"

# Check Key Vault access policy
echo ""
echo "🔍 Checking Key Vault access policy..."
ACCESS_POLICY_COUNT=$(az keyvault show --name "$VAULT_NAME" --query "properties.accessPolicies[?objectId=='$MANAGED_IDENTITY'] | length(@)" --output tsv)

if [[ "$ACCESS_POLICY_COUNT" -eq 0 ]]; then
    echo "❌ Error: No access policy found for App Service managed identity"
    exit 1
fi
echo "✅ Access policy configured for managed identity"

# Check required secrets exist
echo ""
echo "🔍 Checking required secrets in Key Vault..."
REQUIRED_SECRETS=(
    "clerk-publishable-key"
    "clerk-secret-key"
    "azure-openai-api-key"
    "azure-openai-endpoint"
    "supabase-url"
    "supabase-anon-key"
    "sentry-dsn"
    "sentry-auth-token"
    "azure-ad-client-secret"
)

MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    # capture both output and exit code
    secret_result=$(az keyvault secret show --vault-name "$VAULT_NAME" --name "$secret" 2>&1)
    if [[ $? -eq 0 ]]; then
        echo "✅ Secret exists: $secret"
    else
        # differentiate not-found vs. access-denied
        if [[ "$secret_result" == *"SecretNotFound"* ]]; then
            echo "⚠️  Secret missing: $secret"
            MISSING_SECRETS+=("$secret")
        else
            echo "⚠️  Cannot access secret: $secret (permission issue)"
        fi
    fi
done

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo ""
    echo "⚠️  Warning: ${#MISSING_SECRETS[@]} secrets are missing"
    echo "Missing secrets: ${MISSING_SECRETS[*]}"
    echo "Use the set-keyvault-secrets.sh script to add them"
fi

# Check App Service app settings
echo ""
echo "🔍 Checking App Service app settings for Key Vault references..."
APP_SETTINGS=$(az webapp config appsettings list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[?contains(value, '@Microsoft.KeyVault')]" --output json)

if [[ "$APP_SETTINGS" == "[]" ]]; then
    echo "❌ Error: No Key Vault references found in app settings"
    exit 1
fi

KEY_VAULT_REFS=$(echo "$APP_SETTINGS" | jq -r '.[].name' | wc -l)
echo "✅ Found $KEY_VAULT_REFS Key Vault references in app settings"

# Display Key Vault references
echo ""
echo "📋 Key Vault references in App Service:"
echo "$APP_SETTINGS" | jq -r '.[] | "  \(.name): \(.value)"'

# Check specific Clerk configuration
echo ""
echo "🔍 Checking Clerk configuration..."
CLERK_PUBLIC_KEY=$(echo "$APP_SETTINGS" | jq -r '.[] | select(.name=="PUBLIC_CLERK_PUBLISHABLE_KEY" or .name=="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") | .value')

if [[ -n "$CLERK_PUBLIC_KEY" && "$CLERK_PUBLIC_KEY" != "null" ]]; then
    echo "✅ Clerk publishable key configured: $CLERK_PUBLIC_KEY"
else
    echo "⚠️  Warning: Clerk publishable key not found in app settings"
fi

CLERK_SECRET_KEY=$(echo "$APP_SETTINGS" | jq -r '.[] | select(.name=="CLERK_SECRET_KEY") | .value')

if [[ -n "$CLERK_SECRET_KEY" && "$CLERK_SECRET_KEY" != "null" ]]; then
    echo "✅ Clerk secret key configured: $CLERK_SECRET_KEY"
else
    echo "⚠️  Warning: Clerk secret key not found in app settings"
fi

# Test App Service runtime (if possible)
echo ""
echo "🔍 Testing runtime access (optional - requires App Service to be running)..."

# Try to get environment variable from running app (this might fail if app is not running)
if az webapp ssh --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --command "echo \$PUBLIC_CLERK_PUBLISHABLE_KEY" 2>/dev/null | grep -v "^$" > /dev/null; then
    echo "✅ App Service can access environment variables at runtime"
else
    echo "⚠️  Could not test runtime access (app may not be running or SSH not enabled)"
fi

echo ""
echo "🎉 Key Vault integration validation completed!"
echo ""
echo "Summary:"
echo "  ✅ App Service managed identity: Configured"
echo "  ✅ Key Vault access policy: Configured"
echo "  📊 Key Vault references: $KEY_VAULT_REFS found"
if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo "  ⚠️  Missing secrets: ${#MISSING_SECRETS[@]}"
else
    echo "  ✅ All required secrets: Present"
fi

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo ""
    echo "Next steps:"
    echo "1. Set missing secrets using:"
    echo "   ./scripts/set-keyvault-secrets.sh --vault-name $VAULT_NAME [options]"
    echo "2. Restart App Service to reload configuration:"
    echo "   az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
fi
