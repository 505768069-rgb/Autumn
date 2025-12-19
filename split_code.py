# -*- coding: utf-8 -*-
"""
Code split script: Split index.html into modular files
"""
import re
import os
import shutil
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

base_path = r'c:\Users\EDY\Desktop\编程学习游戏'

# Read original file
with open(os.path.join(base_path, 'index.html'), 'r', encoding='utf-8') as f:
    content = f.read()

print("Reading index.html...")

# Extract CSS (<style>...</style>)
css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if css_match:
    css_content = css_match.group(1).strip()
    css_path = os.path.join(base_path, 'css', 'styles.css')
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write('/* Programming Learning Game - Main Styles */\n\n')
        f.write(css_content)
    print(f"[OK] CSS extracted: {len(css_content)} chars -> css/styles.css")

# Extract JavaScript (<script>...</script>)
js_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
if js_match:
    js_content = js_match.group(1).strip()
    
    # Write complete app.js (all JS)
    js_path = os.path.join(base_path, 'js', 'app.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write('/* Programming Learning Game - Main App */\n\n')
        f.write(js_content)
    print(f"[OK] JavaScript extracted: {len(js_content)} chars -> js/app.js")

# Extract static HTML body content (video backgrounds, controls etc)
body_match = re.search(r'<body[^>]*>(.*?)<div id="app">', content, re.DOTALL)
static_body = ''
if body_match:
    static_body = body_match.group(1).strip()
    print(f"[OK] Static HTML body: {len(static_body)} chars")

# Create new minimal index.html
new_html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 编程知识闯关游戏</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="bg-gray-900 min-h-screen">
'''

# Add static body content
new_html += static_body

new_html += '''
    <div id="app"></div>

    <!-- Load JavaScript -->
    <script src="js/app.js"></script>
</body>
</html>
'''

# Backup original file
backup_path = os.path.join(base_path, 'index.html.backup')
if not os.path.exists(backup_path):
    shutil.copy(os.path.join(base_path, 'index.html'), backup_path)
    print("[OK] Original file backed up to index.html.backup")
else:
    print("[INFO] Backup already exists")

# Write new index.html
with open(os.path.join(base_path, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(new_html)
print("[OK] New index.html created")

print("\n=== Code split complete! ===")
print("File structure:")
print("  index.html (minimal)")
print("  index.html.backup (original)")
print("  css/")
print("    styles.css")
print("  js/")
print("    app.js")
