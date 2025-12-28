#!/usr/bin/env python3
"""
Navigation Builder Skill - Generator Script

Helps add screens to navigation types and stack/tab navigators.
"""

import os
import sys
import re

def add_to_param_list(file_path, screen_name, params="undefined"):
    """Add a screen to AppStackParamList in navigationTypes.ts."""
    if not os.path.exists(file_path):
        return False
        
    with open(file_path, 'r') as f:
        content = f.read()
        
    pattern = r'(export type AppStackParamList = \{)(.*?)(\})'
    replacement = f'\\1\\2  {screen_name}: {params}\n\\3'
    
    if screen_name in content:
        print(f"Screen {screen_name} already in param list.")
        return False
        
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    return True

def add_to_stack(file_path, screen_name, component_name):
    """Add a screen to AppStack in AppNavigator.tsx."""
    if not os.path.exists(file_path):
        return False
        
    with open(file_path, 'r') as f:
        content = f.read()
        
    anchor = '{/** 🔥 Your screens go here */}'
    replacement = f'{anchor}\n      <Stack.Screen name="{screen_name}" component={{{component_name}}} />'
    
    if f'name="{screen_name}"' in content:
        print(f"Screen {screen_name} already in stack.")
        return False
        
    new_content = content.replace(anchor, replacement)
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    return True

def main():
    # Example usage: script.py add_screen ScreenName ComponentName "{ id: string }"
    if len(sys.argv) < 3:
        print("Usage: generate_navigator.py add_screen ScreenName ComponentName [Params]")
        return
        
    cmd = sys.argv[1]
    screen_name = sys.argv[2]
    component_name = sys.argv[3]
    params = sys.argv[4] if len(sys.argv) > 4 else "undefined"
    
    if cmd == "add_screen":
        types_path = "app/navigators/navigationTypes.ts"
        nav_path = "app/navigators/AppNavigator.tsx"
        
        if add_to_param_list(types_path, screen_name, params):
            print(f"Added {screen_name} to param list.")
            
        if add_to_stack(nav_path, screen_name, component_name):
            print(f"Added {screen_name} to AppStack.")

if __name__ == "__main__":
    main()
