#!/bin/zsh

# Find all .mdx files
find . -type f -name "*.mdx" | while read -r file; do
  mdfile="${file%.mdx}.md"
  # Remove import/export lines and JSX tags, keep Markdown
  awk '
    # Remove import/export lines
    /^[[:space:]]*import / { next }
    /^[[:space:]]*export / { next }
    # Remove lines that are only JSX tags (opening/closing/self-closing)
    /^[[:space:]]*<.*\/>[[:space:]]*$/ { next }
    /^[[:space:]]*<[A-Za-z0-9].*>[[:space:]]*$/ { next }
    /^[[:space:]]*<\/[A-Za-z0-9].*>[[:space:]]*$/ { next }
    # Otherwise, print the line
    { print }
  ' "$file" > "$mdfile"
  echo "Converted $file -> $mdfile"
done

echo "Conversion complete. Review the .md files before deleting the .mdx files."