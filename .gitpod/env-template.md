# Gitpod Environment Variables Template

This document explains how to set up environment variables in Gitpod for the Pixelated project.

## Required Variables

### Git LFS and Gitea Authentication
For the project to compile correctly, you need to configure access to your Gitea instance:

```bash
# Your Gitea username
GITEA_USERNAME=your_gitea_username

# Your Gitea personal access token (with repository read access)
GITEA_TOKEN=your_gitea_token
```

**To get your Gitea token:**
1. Go to your Gitea instance: `https://git.pixelatedempathy.tech`
2. Navigate to Settings → Applications → Generate New Token
3. Give it a name like "Gitpod Access"
4. Select scopes: `repo` (for repository access including LFS)
5. Copy the generated token

### Setting Environment Variables in Gitpod

1. **Via Gitpod Dashboard:**
   - Go to https://gitpod.io/user/variables
   - Add variables with scope: `chadisfaction/*` (or your specific repo)
   - Set the variables above

2. **Via Command Line:**
   ```bash
   # Install gitpod CLI if not already installed
   npm install -g @gitpod/gitpod-cli
   
   # Login and set variables
   gitpod login
   gitpod env GITEA_USERNAME=your_username
   gitpod env GITEA_TOKEN=your_token
   ```

### Additional Project Environment Variables

Go to [Gitpod User Variables](https://gitpod.io/user/variables) and add these variables:

### AI Service API Keys
- `ANTHROPIC_API_KEY` - For Claude models
- `PERPLEXITY_API_KEY` - For Perplexity search
- `OPENAI_API_KEY` - For OpenAI models
- `GOOGLE_API_KEY` - For Google AI models
- `MISTRAL_API_KEY` - For Mistral models
- `AZURE_OPENAI_API_KEY` - For Azure OpenAI
- `OPENROUTER_API_KEY` - For OpenRouter models
- `XAI_API_KEY` - For xAI models
- `OLLAMA_API_KEY` - For Ollama (if using remote)

### MCP Service Keys
- `MAGIC_API_KEY` - For @21st-dev/magic MCP server

### Memory Service
- `MEM0_API_KEY` - For mem0ai memory service
- `DEFAULT_USER_ID` - Default user ID for memory (optional, defaults to "default_user")

### Database and Services
- `DATABASE_URL` - Your database connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## How to Set Up

1. Go to https://gitpod.io/user/variables
2. Click "New Variable" for each environment variable above
3. Set the name and value
4. Set scope to `chadisfaction/pixelated` (or `*/*` for all repositories)
5. Click "Add Variable"

## Variable Scope Options
- `chadisfaction/pixelated` - Only for this repository
- `chadisfaction/*` - For all your repositories
- `*/*` - For all repositories (use with caution)

## Security Notes
- API keys are automatically masked in Gitpod
- Variables are encrypted and only accessible during workspace creation
- Use repository-specific scope when possible for better security

## After Setup
Once variables are configured, your Gitpod workspace will have the same environment as your local Cursor setup, including:
- All MCP servers configured
- AI services available
- Memory service connected
- Database connections ready 