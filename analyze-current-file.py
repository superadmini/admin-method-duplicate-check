#!/usr/bin/env python3
# 分析当前debug_test.py的准确内容

with open('debug_test.py', 'r') as f:
    lines = f.readlines()

print("=== debug_test.py 完整内容 ===")
for i, line in enumerate(lines, 1):
    print(f"{i:2d}|{line.rstrip()}")

print("\n=== 只包含def的行 ===")
import re
for i, line in enumerate(lines, 1):
    if 'def ' in line and not line.strip().startswith('#'):
        match = re.search(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
        if match:
            print(f"第{i}行: {match.group(1)} - {line.strip()}")

print("\n=== 方法统计 ===")
methods = []
for i, line in enumerate(lines, 1):
    if 'def ' in line and not line.strip().startswith('#'):
        match = re.search(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
        if match:
            methods.append((i, match.group(1), line.strip()))

from collections import defaultdict
method_counts = defaultdict(int)
for line_num, method_name, line_content in methods:
    method_counts[method_name] += 1

for method_name, count in method_counts.items():
    status = "重复" if count > 1 else "唯一"
    print(f"{method_name}: {count} 次 ({status})")
    
    if count > 1:
        print("  出现位置:")
        for ln, name, content in methods:
            if name == method_name:
                print(f"    第{ln}行: {content}")