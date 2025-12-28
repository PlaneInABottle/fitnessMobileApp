#!/usr/bin/env python3
"""
i18n Workflow Skill - Translation Generator

Adds new translation keys to all language files in the Purrsuit Mobile App.
"""

import os
import sys
import re

I18N_DIR = "app/i18n"
LANGUAGES = ["ar", "en", "es", "fr", "hi", "ja", "ko"]

def add_translation(section, key, value):
    """Add a new translation key to all language files."""
    for lang in LANGUAGES:
        file_path = os.path.join(I18N_DIR, f"{lang}.ts")
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Find the section
        section_pattern = rf"({section}: {{}})(.*?)({{}},)"
        
        # If section exists, add the key
        if re.search(section_pattern, content, re.DOTALL):
            new_entry = f'    {key}: "{value if lang == "en" else value}",'
            replacement = f'\1\2  {new_entry}\n  \3'
            new_content = re.sub(section_pattern, replacement, content, flags=re.DOTALL)
            
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"Added {key} to {section} in {lang}.ts")
        else:
            # If section doesn't exist, we could create it, but for safety we'll just report it
            print(f"Section {section} not found in {lang}.ts")

def main():
    if len(sys.argv) < 4:
        print("Usage: add_translation.py section key value")
        return
        
    section = sys.argv[1]
    key = sys.argv[2]
    value = sys.argv[3]
    
    add_translation(section, key, value)

if __name__ == "__main__":
    main()
