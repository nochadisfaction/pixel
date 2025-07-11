# Azure Build Optimizations

This document outlines the optimizations made to improve the Azure DevOps pipeline build process.

## Issues Addressed

### 1. Logger Initialization Error
**Problem**: `Cannot access 'logger$f' before initialization` error in admin-components chunk
**Solution**: 
- Made default logger export lazy to prevent initialization order issues
- Standardized import paths from relative to alias (@/lib/logging)
- Implemented lazy logger initialization in admin components

### 2. Memory Usage Warnings (96.68% usage)
**Problem**: Azure pipeline was hitting memory limits during build
**Solution**:
- Reduced build concurrency from 2 to 1 in CI environments
- Switched from terser to esbuild minification for CI (faster and uses less memory)
- Disabled compression reporting in CI environments
- Added `build:azure` command with optimized Node.js memory settings

### 3. Large Chunk Warnings (>1000 kB)
**Problem**: Bundle chunks were too large, affecting performance
**Solution**:
- Improved manual chunk splitting for better granularity
- Split React ecosystem into smaller chunks
- Split Radix UI components individually
- Split AI/ML libraries by specific package
- Reduced chunk size warning threshold to 800KB

## Recommended Azure Pipeline Changes

### Update Build Command
Replace the current build command with:
```yaml
- script: pnpm run build:azure
  displayName: 'Build application with memory optimization'
```

### Memory Settings
The `build:azure` command uses optimized Node.js memory settings:
- `--max-old-space-size=5120` (5GB instead of 8GB)
- `--max-semi-space-size=256` (optimized garbage collection)
- `--optimize-for-size` (prioritize memory usage over speed)

### CI Environment Detection
The build automatically detects CI environments and applies optimizations:
- Reduces build concurrency
- Uses esbuild instead of terser
- Disables compression reporting
- Enables memory-optimized settings

## Performance Impact

These optimizations should result in:
- **Reduced memory usage**: ~30% reduction in peak memory consumption
- **Faster builds**: esbuild is significantly faster than terser
- **Better chunk sizes**: Improved client-side performance with smaller, more focused chunks
- **More reliable builds**: Less likely to hit memory limits in CI environments

## Monitoring

Monitor the following metrics after applying these changes:
- Build completion rate
- Memory usage peaks
- Build time duration
- Client-side bundle performance 