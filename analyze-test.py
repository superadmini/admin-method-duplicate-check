#!/usr/bin/env python3
# 分析debug_test.py中的方法

with open('debug_test.py', 'r') as f:
    content = f.read()

print("=== debug_test.py 中的方法分析 ===")
print()

lines = content.split('\n')
methods = []

for i, line in enumerate(lines):
    if 'def ' in line and not line.strip().startswith('#'):
        # 提取方法名
        import re
        match = re.search(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
        if match:
            method_name = match.group(1)
            methods.append((i+1, method_name, line.strip()))
            print(f"第{i+1}行: {method_name} - {line.strip()}")

print()
print("=== 方法统计 ===")
from collections import defaultdict
method_counts = defaultdict(int)
for line_num, method_name, line_content in methods:
    method_counts[method_name] += 1

for method_name, count in method_counts.items():
    status = "重复" if count > 1 else "唯一"
    print(f"{method_name}: {count} 次 ({status})")

print()
print("=== 期望结果 ===")
print("应该被标记为重复的方法:")
duplicates = []
for line_num, method_name, line_content in methods:
    if method_counts[method_name] > 1:
        duplicates.append((line_num, method_name))
        print(f"  第{line_num}行: {method_name}")

print()
print("不应该被标记为重复的方法:")
unique = []
for line_num, method_name, line_content in methods:
    if method_counts[method_name] == 1:
        unique.append((line_num, method_name))
        print(f"  第{line_num}行: {method_name}")

print()
print(f"总结: {len(duplicates)}个方法应该被标记为重复，{len(unique)}个方法不应该被标记")