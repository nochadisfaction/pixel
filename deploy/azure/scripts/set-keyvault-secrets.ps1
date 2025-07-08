#!/usr/bin/env pwsh
# PowerShell script to set Key Vault secrets after deployment
param(
    [Parameter(Mandatory = $true)]
    [string]$KeyVaultName,
    
    [Parameter(Mandatory = $false)]
    [string]$AzureOpenAIKey = "",
    
    [Parameter(Mandatory = $false)]
    [string]$AzureOpenAIEndpoint = "",
    
    [Parameter(Mandatory = $false)]
    [string]$SupabaseUrl = "",
    
    [Parameter(Mandatory = $false)]
    [string]$SupabaseAnonKey = "",
    
    [Parameter(Mandatory = $false)]
    [string]$ClerkPublishableKey = "",
    
    [Parameter(Mandatory = $false)]
    [string]$ClerkSecretKey = "",
    
    [Parameter(Mandatory = $false)]
    [string]$SentryDsn = "",
    
    [Parameter(Mandatory = $false)]
    [string]$SentryAuthToken = "",
    
    [Parameter(Mandatory = $false)]
    [string]$AzureAdClientSecret = ""
)

Write-Host "Setting Key Vault secrets for: $KeyVaultName" -ForegroundColor Green

# Function to set secret if value is provided
function Set-SecretIfProvided {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$VaultName
    )
    
    if (-not [string]::IsNullOrWhiteSpace($SecretValue)) {
        Write-Host "Setting secret: $SecretName" -ForegroundColor Yellow
        try {
            az keyvault secret set --vault-name $VaultName --name $SecretName --value $SecretValue --output none
            Write-Host "✓ Successfully set secret: $SecretName" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ Failed to set secret: $SecretName - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Skipping secret: $SecretName (no value provided)" -ForegroundColor Gray
    }
}

# Check if Azure CLI is installed and logged in
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Cyan
    Write-Host "Current subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan

    # Optionally prompt for confirmation if this is a production environment
    if ($KeyVaultName -like "*prod*") {
        $confirmation = Read-Host "You are about to set secrets in a production Key Vault. Continue? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
}
catch {
    Write-Host "Error: Azure CLI not found or not logged in. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Set secrets
Write-Host "`nSetting secrets..." -ForegroundColor Blue

Set-SecretIfProvided -SecretName "azure-openai-api-key" -SecretValue $AzureOpenAIKey -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "azure-openai-endpoint" -SecretValue $AzureOpenAIEndpoint -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "supabase-url" -SecretValue $SupabaseUrl -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "supabase-anon-key" -SecretValue $SupabaseAnonKey -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "clerk-publishable-key" -SecretValue $ClerkPublishableKey -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "clerk-secret-key" -SecretValue $ClerkSecretKey -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "sentry-dsn" -SecretValue $SentryDsn -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "sentry-auth-token" -SecretValue $SentryAuthToken -VaultName $KeyVaultName
Set-SecretIfProvided -SecretName "azure-ad-client-secret" -SecretValue $AzureAdClientSecret -VaultName $KeyVaultName

Write-Host "`n✓ Secrets configuration completed!" -ForegroundColor Green
Write-Host "`nNote: Your App Service will automatically pick up these secrets via Key Vault references." -ForegroundColor Cyan

# Display current secrets (names only, not values)
Write-Host "`nCurrent secrets in Key Vault:" -ForegroundColor Blue
try {
    az keyvault secret list --vault-name $KeyVaultName --query "[].name" --output table
}
catch {
    Write-Host "Unable to list secrets. Please check your permissions." -ForegroundColor Yellow
}
