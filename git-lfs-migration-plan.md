# Git LFS Migration Plan

## Current State
- **Git LFS Version**: 3.6.1 ✅
- **Repository**: pixelated2 (Astro web development project)
- **Files to migrate**: 482 binary files already committed
- **New files to track**: 6,364 image files + 1,528 font files + 825 multimedia files + 664 archives

## Files Already Configured for LFS
- `.gitattributes` updated with comprehensive patterns
- Python dependencies (*.pyd, *.dll)
- Archive files (*.7z, *.zip, etc.)
- Binary executables and libraries
- Image files (*.jpg, *.png, *.gif, etc.)
- Font files (*.ttf, *.woff, *.woff2, etc.)
- Audio/Video files
- 3D models and ML models
- Database files
- Large documentation files

## Migration Strategy

### Option 1: Fresh Start (Recommended for development)
1. Commit current .gitattributes changes
2. Use `git lfs migrate import` to rewrite history
3. Force push to update remote

### Option 2: Going Forward Only (Safer for shared repositories)
1. Commit .gitattributes changes
2. New files will automatically use LFS
3. Existing files remain in regular git (larger repo size but no history rewrite)

## Commands for Fresh Start Migration

```bash
# 1. Commit the .gitattributes changes
git commit -m "Add comprehensive Git LFS configuration"

# 2. Migrate existing files to LFS (this rewrites history)
git lfs migrate import --include="*.jpg,*.jpeg,*.png,*.gif,*.bmp,*.tiff,*.webp,*.ico" --everything
git lfs migrate import --include="*.ttf,*.otf,*.woff,*.woff2,*.eot" --everything  
git lfs migrate import --include="*.zip,*.tar.gz,*.rar,*.7z,*.jar,*.bin" --everything
git lfs migrate import --include="*.mp3,*.wav,*.mp4,*.mov,*.avi,*.webm" --everything
git lfs migrate import --include="*.pdf,*.doc,*.docx,*.ppt,*.pptx" --everything

# 3. Push the migrated repository (force push required)
git push origin --force --all
git push origin --force --tags

# 4. Verify LFS is working
git lfs ls-files
```

## Post-Migration Verification

```bash
# Check LFS status
git lfs status

# Verify file tracking
git lfs track

# Check repository size reduction
git count-objects -vH

# Ensure new files are automatically tracked
touch test.png
git add test.png
git status  # Should show LFS pointer
```

## Team Coordination

⚠️ **Important**: If using Option 1 (history rewrite):
- Notify all team members before migration
- All team members must delete local clones and re-clone after migration
- Any open pull requests will need to be recreated

## Storage Considerations

- LFS files are stored separately from git history
- GitHub provides 1GB free LFS storage, then paid tiers
- Consider cleaning up old test files and build artifacts before migration

## Backup Plan

Before migration:
```bash
# Create backup branch
git branch backup-before-lfs-migration
git push origin backup-before-lfs-migration
``` 