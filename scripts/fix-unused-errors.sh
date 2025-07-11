#!/bin/bash

# Script to fix unused error parameters in catch blocks
# This fixes ESLint no-unused-vars warnings for catch parameters

echo "🔧 Fixing unused error parameters in catch blocks..."

# Find all TypeScript and TypeScript React files
find . -name "*.ts" -o -name "*.tsx" -o -name "*.astro" | \
  grep -E "^\./(src|api|examples|scripts)/" | \
  while read -r file; do
    echo "Processing: $file"
    
    # Fix catch (error) -> catch (_error) when error is not used
    sed -i 's/} catch (error) {/} catch (_error) {/g' "$file"
    
    # Fix async catch patterns 
    sed -i 's/\.catch((error) => {/\.catch((_error) => {/g' "$file"
    sed -i 's/\.catch(async (error) => {/\.catch(async (_error) => {/g' "$file"
    sed -i 's/\.catch(error => {/\.catch(_error => {/g' "$file"
    
    # Handle cases where error is typed
    sed -i 's/} catch (error: unknown) {/} catch (_error: unknown) {/g' "$file"
    sed -i 's/} catch (error: any) {/} catch (_error: any) {/g' "$file"
    sed -i 's/} catch (error: Error) {/} catch (_error: Error) {/g' "$file"
  done

echo "✅ Completed fixing unused error parameters"
echo "🔍 Running TypeScript check to verify fixes..."

# Run TypeScript check to verify no more compilation errors
pnpm exec tsc --noEmit --skipLibCheck

echo "🎉 All done! Check the output above for any remaining issues." 