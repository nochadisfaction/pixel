# Deployment Guide

This project supports deployment to both AWS and Vercel platforms. Each platform has been optimized with specific configurations.

## AWS Deployment

### Prerequisites
- AWS CLI configured with appropriate credentials
- Git remote `azure` pointing to your Azure DevOps repository
- Environment variables configured for AWS services

### Build for AWS
```bash
pnpm run build:aws
```

### Deploy to AWS
```bash
pnpm run deploy:aws
```

This will:
1. Build the project using the AWS-optimized configuration (`astro.config.aws.mjs`)
2. Push to the `azure` remote which triggers the Azure DevOps pipeline

### AWS Configuration Files
- `astro.config.aws.mjs` - AWS-optimized Astro configuration
- `staticwebapp.config.json` - Azure Static Web Apps configuration
- `azure-pipelines.yml` - CI/CD pipeline configuration
- `serverless.yml` - AWS Lambda serverless configuration

### AWS Environment Variables
Set these in your Azure DevOps pipeline or AWS environment:
```
AWS_OPENAI_API_KEY
AWS_OPENAI_ENDPOINT
AWS_AD_CLIENT_ID
AWS_AD_TENANT_ID
SENTRY_DSN
SENTRY_AUTH_TOKEN
```

## Vercel Deployment

### Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Vercel account linked: `vercel login`

### Build for Vercel
```bash
pnpm run build:vercel
```

### Deploy to Vercel
```bash
# Production deployment
pnpm run deploy:vercel

# Preview deployment
pnpm run deploy:vercel:preview
```

### Vercel Configuration Files
- `astro.config.vercel.mjs` - Vercel-optimized Astro configuration
- `vercel.json` - Vercel platform configuration

### Vercel Environment Variables
Set these in your Vercel project dashboard:
```
PUBLIC_SITE_URL
SENTRY_DSN
SENTRY_AUTH_TOKEN
NODE_ENV=production
```

## Platform-Specific Optimizations

### AWS Optimizations
- Uses Node.js adapter with standalone mode
- Memory-optimized build settings for CI environments
- Terser minification for better compression
- Azure CDN support via `AWS_CDN_ENDPOINT`
- AWS service integrations (S3, DynamoDB, etc.)

### Vercel Optimizations
- Uses Vercel serverless adapter
- Web Analytics and Speed Insights enabled
- Optimized image service with multiple sizes
- ESBuild minification for faster builds
- Function timeout configurations

## Environment-Specific Settings

### Development
```bash
pnpm dev
```

### Production Preview
```bash
# AWS
pnpm run build:aws && pnpm preview

# Vercel
pnpm run build:vercel && pnpm preview
```

## Build Outputs

### AWS Build
- Output: `dist/` directory
- Adapter: `@astrojs/node` with standalone mode
- Assets prefix: Configurable via `AWS_CDN_ENDPOINT`

### Vercel Build
- Output: `dist/` directory
- Adapter: `@astrojs/vercel/serverless`
- Functions: Automatic API route handling
- Image optimization: Built-in Vercel image service

## Troubleshooting

### Common Issues

#### Memory Issues (AWS)
If builds fail due to memory constraints:
```bash
NODE_OPTIONS='--max-old-space-size=3072' pnpm run build:aws
```

#### TypeScript Errors
Skip type checking during deployment:
```bash
# In package.json, modify build scripts to skip type checking if needed
"build:aws": "NODE_OPTIONS='--max-old-space-size=5120' astro build --config astro.config.aws.mjs"
```

#### Vercel Function Size Limits
If hitting Vercel's 250MB serverless function limit:
1. Review and optimize dependencies
2. Use dynamic imports for large libraries
3. Consider splitting large components

### Build Logs
- AWS: Check Azure DevOps pipeline logs
- Vercel: Check Vercel dashboard deployment logs

## Performance Monitoring

Both deployments include Sentry integration for error tracking and performance monitoring. Ensure your `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` are configured.

### AWS Monitoring
- Azure Application Insights
- Custom performance metrics
- Health check endpoints at `/api/health`

### Vercel Monitoring
- Vercel Analytics
- Speed Insights
- Function execution metrics

## Security

Both configurations include:
- Content Security Policy headers
- XSS protection
- CORS configuration
- Secure HTTP headers (HSTS, X-Frame-Options, etc.)

### AWS Security
- Azure Active Directory integration
- Role-based access control
- VPC security groups

### Vercel Security
- Automatic HTTPS
- Environment variable encryption
- DDoS protection

## Rollback Procedures

### AWS Rollback
```bash
# Use the existing rollback scripts
pnpm run rollback
pnpm run rollback:prod
```

### Vercel Rollback
1. Go to Vercel dashboard
2. Select the project
3. Navigate to the "Deployments" tab
4. Click "Promote to Production" on a previous successful deployment

## Support

For deployment issues:
1. Check the build logs first
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed with `pnpm install`
4. Check the specific platform's troubleshooting guides 