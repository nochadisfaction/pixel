#!/bin/bash
# Bash script to set Key Vault secrets after deployment

set -e

# Function to display usage
usage() {
    echo "Usage: $0 -v KEYVAULT_NAME [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --vault-name            Key Vault name (required)"
    echo "  --azure-openai-key          Azure OpenAI API key"
    echo "  --azure-openai-endpoint     Azure OpenAI endpoint"
    echo "  --supabase-url              Supabase URL"
    echo "  --supabase-anon-key         Supabase anonymous key"
    echo "  --clerk-publishable-key     Clerk publishable key"
    echo "  --clerk-secret-key          Clerk secret key"
    echo "  --sentry-dsn                Sentry DSN"
    echo "  --sentry-auth-token         Sentry auth token"
    echo "  --azure-ad-client-secret    Azure AD client secret"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -v my-keyvault --clerk-publishable-key pk_test_xxx --supabase-url https://xxx.supabase.co"
    exit 1
}

# Parse command line arguments
VAULT_NAME=""
AZURE_OPENAI_KEY=""
AZURE_OPENAI_ENDPOINT=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
AZURE_AD_CLIENT_SECRET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--vault-name)
            VAULT_NAME="$2"
            shift 2
            ;;
        --azure-openai-key)
            AZURE_OPENAI_KEY="$2"
            shift 2
            ;;
        --azure-openai-endpoint)
            AZURE_OPENAI_ENDPOINT="$2"
            shift 2
            ;;
        --supabase-url)
            SUPABASE_URL="$2"
            shift 2
            ;;
        --supabase-anon-key)
            SUPABASE_ANON_KEY="$2"
            shift 2
            ;;
        --clerk-publishable-key)
            CLERK_PUBLISHABLE_KEY="$2"
            shift 2
            ;;
        --clerk-secret-key)
            CLERK_SECRET_KEY="$2"
            shift 2
            ;;
        --sentry-dsn)
            SENTRY_DSN="$2"
            shift 2
            ;;
        --sentry-auth-token)
            SENTRY_AUTH_TOKEN="$2"
            shift 2
            ;;
        --azure-ad-client-secret)
            AZURE_AD_CLIENT_SECRET="$2"
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
if [[ -z "$VAULT_NAME" ]]; then
    echo "Error: Key Vault name is required"
    usage
fi

echo "Setting Key Vault secrets for: $VAULT_NAME"

# Function to set secret if value is provided
set_secret_if_provided() {
    local secret_name=$1
    local secret_value=$2
    local vault_name=$3
    
    if [[ -n "$secret_value" ]]; then
        echo "Setting secret: $secret_name"
        if az keyvault secret set --vault-name "$vault_name" --name "$secret_name" --value "$secret_value" --output none; then
            echo "✓ Successfully set secret: $secret_name"
        else
            echo "✗ Failed to set secret: $secret_name"
            return 1
        fi
    else
        echo "Skipping secret: $secret_name (no value provided)"
    fi
}

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo "Error: Azure CLI not found. Please install Azure CLI first."
    exit 1
fi

if ! az account show &> /dev/null; then
    echo "Error: Not logged in to Azure CLI. Please run 'az login' first."
    exit 1
fi

ACCOUNT_INFO=$(az account show --query "{name: user.name, subscription: name}" --output tsv)
echo "Logged in as: $ACCOUNT_INFO"

echo ""
echo "Setting secrets..."

# Set secrets
set_secret_if_provided "azure-openai-api-key" "$AZURE_OPENAI_KEY" "$VAULT_NAME"
set_secret_if_provided "azure-openai-endpoint" "$AZURE_OPENAI_ENDPOINT" "$VAULT_NAME"
set_secret_if_provided "supabase-url" "$SUPABASE_URL" "$VAULT_NAME"
set_secret_if_provided "supabase-anon-key" "$SUPABASE_ANON_KEY" "$VAULT_NAME"
set_secret_if_provided "clerk-publishable-key" "$CLERK_PUBLISHABLE_KEY" "$VAULT_NAME"
set_secret_if_provided "clerk-secret-key" "$CLERK_SECRET_KEY" "$VAULT_NAME"
set_secret_if_provided "sentry-dsn" "$SENTRY_DSN" "$VAULT_NAME"
set_secret_if_provided "sentry-auth-token" "$SENTRY_AUTH_TOKEN" "$VAULT_NAME"
set_secret_if_provided "azure-ad-client-secret" "$AZURE_AD_CLIENT_SECRET" "$VAULT_NAME"

echo ""
echo "✓ Secrets configuration completed!"
echo ""
echo "Note: Your App Service will automatically pick up these secrets via Key Vault references."

# Display current secrets (names only, not values)
echo ""
echo "Current secrets in Key Vault:"
if ! az keyvault secret list --vault-name "$VAULT_NAME" --query "[].name" --output table; then
    echo "Unable to list secrets. Please check your permissions."
fi
