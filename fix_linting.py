#!/usr/bin/env python3
"""
Script to fix common linting issues in the codebase.
"""

import os
import re
from pathlib import Path


def fix_file_linting(file_path: Path):
    """Fix common linting issues in a Python file."""
    print(f"Fixing {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix trailing whitespace
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Remove trailing whitespace
        fixed_line = line.rstrip()
        
        # Fix blank lines with whitespace
        if not fixed_line.strip():
            fixed_line = ''
        
        fixed_lines.append(fixed_line)
    
    content = '\n'.join(fixed_lines)
    
    # Ensure file ends with newline
    if content and not content.endswith('\n'):
        content += '\n'
    
    # Fix common indentation issues
    content = re.sub(r'\n +\n', '\n\n', content)  # Remove whitespace-only lines
    
    # Remove unused imports (basic patterns)
    lines = content.split('\n')
    import_lines = []
    other_lines = []
    in_imports = True
    
    for line in lines:
        if line.startswith('from ') or line.startswith('import '):
            if in_imports:
                import_lines.append(line)
            else:
                other_lines.append(line)
        elif line.strip() == '':
            if in_imports:
                import_lines.append(line)
            else:
                other_lines.append(line)
        else:
            in_imports = False
            other_lines.append(line)
    
    # Check which imports are actually used
    used_imports = []
    full_content = '\n'.join(other_lines)
    
    for import_line in import_lines:
        if import_line.strip() == '':
            used_imports.append(import_line)
            continue
            
        # Extract imported names
        if import_line.startswith('from '):
            # from module import name1, name2
            match = re.match(r'from .+ import (.+)', import_line)
            if match:
                imports = match.group(1)
                # Handle multiple imports
                if '(' in imports:
                    # Multi-line import
                    used_imports.append(import_line)
                else:
                    names = [name.strip() for name in imports.split(',')]
                    used_names = []
                    for name in names:
                        clean_name = name.split(' as ')[0].strip()
                        if clean_name in full_content:
                            used_names.append(name)
                    
                    if used_names:
                        base = import_line.split(' import ')[0]
                        used_imports.append(f"{base} import {', '.join(used_names)}")
        elif import_line.startswith('import '):
            # import module
            module = import_line.replace('import ', '').strip()
            if module in full_content:
                used_imports.append(import_line)
        else:
            used_imports.append(import_line)
    
    # Reconstruct content
    content = '\n'.join(used_imports + other_lines)
    
    # Write back if changed
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Fixed {file_path}")
    else:
        print(f"  No changes needed for {file_path}")


def main():
    """Fix linting issues in all Python files in the data directory."""
    data_dir = Path("ai/pixel/data")
    
    if not data_dir.exists():
        print(f"Directory {data_dir} not found")
        return
    
    python_files = list(data_dir.glob("*.py"))
    
    for file_path in python_files:
        if file_path.name.startswith('test_'):
            continue  # Skip test files for now
        
        try:
            fix_file_linting(file_path)
        except Exception as e:
            print(f"Error fixing {file_path}: {e}")
    
    print("Linting fixes completed!")


if __name__ == "__main__":
    main()
