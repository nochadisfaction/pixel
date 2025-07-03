# TypeScript Server Debugging Guide

## Quick Debugging Commands

### Immediate Actions When TypeScript Server Crashes

1. **Restart TypeScript Server**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "TypeScript: Restart TS Server"
   - Press Enter

2. **Check Server Logs**
   - Press `Ctrl+Shift+P`
   - Type "TypeScript: Open TS Server log"
   - Look for error patterns, memory issues, or crash reports

3. **Run Debug Script**
   ```bash
   # Quick analysis
   ./debug-typescript.sh normal
   
   # Verbose debugging with full diagnostics
   ./debug-typescript.sh verbose
   
   # Clean cache and restart fresh
   ./debug-typescript.sh clean
   
   # Monitor server in real-time
   ./debug-typescript.sh monitor
   ```

## Debug Configurations Available

### VS Code Settings (Already Applied)
- **Verbose Logging**: TypeScript server now logs everything
- **Trace Enabled**: Full request/response tracing
- **Memory Limit**: Increased to 8GB
- **Performance Optimizations**: File watching optimized

### Alternative TypeScript Config
Use the debug-friendly configuration when main config causes issues:
```bash
# Test with relaxed TypeScript settings
npx tsc --project tsconfig.debug.json --noEmit

# Compare with main config
npx tsc --project tsconfig.json --noEmit
```

## Common Crash Causes & Solutions

### 1. Memory Issues
**Symptoms**: Server suddenly stops, no response
**Solutions**:
- Increase memory limit (already set to 8GB)
- Exclude large directories from watching
- Clean TypeScript cache: `./debug-typescript.sh clean`

### 2. Type Complexity Issues
**Symptoms**: Long pauses, eventual crashes on specific files
**Solutions**:
- Use `tsconfig.debug.json` temporarily
- Identify problematic files with: `./debug-typescript.sh verbose`
- Add `skipLibCheck: true` for immediate relief

### 3. Circular Dependency Issues
**Symptoms**: Server hangs during analysis
**Solutions**:
- Check for circular imports: `./debug-typescript.sh normal`
- Use barrel exports carefully
- Consider dependency graph analysis

### 4. File Watching Overload
**Symptoms**: High CPU usage, server becomes unresponsive
**Solutions**:
- Exclude more directories from watching (already configured)
- Use `useFsEvents` for better performance (already set)
- Close unnecessary files in editor

## Debugging Workflow

### Step 1: Immediate Diagnosis
```bash
# Run comprehensive analysis
./debug-typescript.sh verbose

# Check what VS Code TypeScript extension is doing
# Open VS Code, press F1, type "Developer: Toggle Developer Tools"
# Go to Console tab, look for TypeScript-related errors
```

### Step 2: Isolate the Problem
```bash
# Test with minimal config
npx tsc --project tsconfig.debug.json --noEmit

# If that works, the issue is in your main tsconfig.json settings
# If that fails, the issue is in your source code
```

### Step 3: Identify Problematic Files
```bash
# Check for large files
./debug-typescript.sh normal

# Test specific directories
npx tsc --project tsconfig.debug.json --noEmit src/components/**/*.ts
npx tsc --project tsconfig.debug.json --noEmit src/lib/**/*.ts
```

### Step 4: Progressive Strictness
If you need to restore strict settings:
1. Start with `tsconfig.debug.json`
2. Gradually enable strict settings one by one
3. Test after each change
4. Identify which setting causes crashes

## Log Analysis

### VS Code TypeScript Logs Location
- **Windows**: `%APPDATA%\Code\logs\[timestamp]\exthost\`
- **macOS**: `~/Library/Application Support/Code/logs/[timestamp]/exthost/`
- **Linux**: `~/.config/Code/logs/[timestamp]/exthost/`

### What to Look For
- **Memory errors**: "out of memory", "heap limit"
- **Type errors**: Specific files causing issues
- **Performance**: Long-running operations
- **Crashes**: Stack traces or sudden stops

## Performance Monitoring

### Real-time Monitoring
```bash
# Monitor TypeScript server processes
./debug-typescript.sh monitor

# Watch memory usage
watch -n 1 'ps aux | grep -E "(tsserver|typescript)" | grep -v grep'
```

### File Size Analysis
```bash
# Find largest TypeScript files
find . -name "*.ts" -o -name "*.tsx" | xargs ls -la | sort -k5 -nr | head -20

# Count total TypeScript files
find . -name "*.ts" -o -name "*.tsx" | wc -l
```

## Emergency Recovery

### If Server Keeps Crashing
1. **Use Debug Config**:
   ```bash
   cp tsconfig.json tsconfig.json.backup
   cp tsconfig.debug.json tsconfig.json
   ```

2. **Restart VS Code Completely**
   - Close all VS Code windows
   - Kill any remaining processes: `pkill -f "code\|typescript"`
   - Restart VS Code

3. **Clean Everything**:
   ```bash
   ./debug-typescript.sh clean
   rm -rf node_modules/.cache
   npm ci  # Clean install
   ```

4. **Disable TypeScript Temporarily**:
   - Add to VS Code settings: `"typescript.validate.enable": false`
   - Work on fixing issues without server interference
   - Re-enable when ready

## Advanced Debugging

### Custom TypeScript Compiler Host
If issues persist, you can create a custom compiler host to debug specific issues:

```typescript
// debug-compiler.ts
import * as ts from 'typescript';

const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("Could not find tsconfig.json");

const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
const { options, fileNames } = ts.parseJsonConfigFileContent(
  config,
  ts.sys,
  "./"
);

console.log("Compiler options:", options);
console.log("File count:", fileNames.length);
console.log("Memory limit:", options.memoryLimit);
```

### Incremental Analysis
Test files in batches to isolate issues:

```bash
# Test in chunks
find src -name "*.ts" | head -100 | xargs npx tsc --noEmit
find src -name "*.ts" | tail -n +101 | head -100 | xargs npx tsc --noEmit
```

## Prevention Tips

1. **Regular Maintenance**:
   - Run `./debug-typescript.sh clean` weekly
   - Keep dependencies updated
   - Monitor file sizes and complexity

2. **Code Organization**:
   - Avoid deeply nested imports
   - Use barrel exports judiciously
   - Keep component files under 500 lines

3. **Configuration**:
   - Regular TypeScript updates
   - Optimize include/exclude patterns
   - Monitor memory usage trends

## Support Information

If TypeScript server continues to crash after following this guide:

1. **Gather Debug Info**:
   ```bash
   ./debug-typescript.sh verbose > typescript-debug-report.txt
   ```

2. **VS Code Version**: Help → About
3. **TypeScript Version**: `npx tsc --version`
4. **Node Version**: `node --version`
5. **System Info**: `uname -a` (Linux/Mac) or `systeminfo` (Windows)

This comprehensive debugging setup should help you identify and resolve TypeScript server crashes quickly!
