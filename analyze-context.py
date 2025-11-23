#!/usr/bin/env python3
# 分析method2的上下文，看看是否应该被认为是不同的方法

with open('debug_test.py', 'r') as f:
    lines = f.readlines()

print("=== method2 出现的上下文分析 ===")
print()

for i, line in enumerate(lines, 1):
    if 'def method2' in line:
        print(f"第{i}行: {line.rstrip()}")
        print("上下文:")
        start = max(0, i-3)
        end = min(len(lines), i+2)
        for j in range(start, end):
            marker = ">>> " if j == i-1 else "    "
            print(f"{marker}{j+1:2d}|{lines[j].rstrip()}")
        print()

print("=== 分析 ===")
print("两个method2的区别:")
print("1. 第8行的method2: 在TestClass类内部")
print("2. 第25行的method2: 在模块级别（类外部）")
print()
print("在Python中，这两个确实是不同的方法:")
print("- TestClass.method2 (实例方法)")
print("- module.method2 (模块级函数)")
print()
print("如果扩展应该区分类方法和模块函数，那么检测逻辑需要改进。")