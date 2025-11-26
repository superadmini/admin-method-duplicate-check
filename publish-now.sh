#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  准备发布 Admin Method Duplicate Check 到 VS Code Marketplace"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 切换 Node 版本
echo "📦 切换到 Node.js v23.6.1..."
source ~/.nvm/nvm.sh
nvm use 23.6.1

echo ""
echo "✅ publisher: superadmini"
echo "✅ 准备发布 Admin Method Duplicate Check v0.1.6"
echo ""
echo "🚀 现在开始发布..."
echo ""

# 发布
vsce publish

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"