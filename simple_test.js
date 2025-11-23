// 简化测试 - 检查实际检测到的方法

const fs = require('fs');

// Python方法检测模式
const pythonPattern = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

// 读取debug_test.py
const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');
const lines = content.split('\n');

console.log('=== 逐行分析debug_test.py ===\n');

const methods = [];
const nonMatches = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 跳过注释和空行
    if (trimmed.startsWith('#') || trimmed === '') {
        continue;
    }
    
    // 检查是否匹配def模式
    const match = line.match(pythonPattern);
    
    if (match) {
        const methodName = match[1];
        
        // 额外检查：确保不是f-string中的内容
        if (line.includes('f"') || line.includes("f'")) {
            nonMatches.push({ line: i + 1, content: trimmed, reason: 'f-string line' });
            continue;
        }
        
        // 额外检查：确保不是print语句
        if (line.includes('print(')) {
            nonMatches.push({ line: i + 1, content: trimmed, reason: 'print statement' });
            continue;
        }
        
        methods.push({
            line: i + 1,
            name: methodName,
            content: trimmed
        });
    } else {
        // 记录为什么某些行不匹配
        if (trimmed.includes('def') || trimmed.includes('print') || trimmed.includes('f"') || trimmed.includes("f'")) {
            nonMatches.push({ line: i + 1, content: trimmed, reason: 'no def pattern match' });
        }
    }
}

console.log('✅ 检测到的方法:');
methods.forEach(method => {
    console.log(`  行 ${method.line}: ${method.name} - "${method.content}"`);
});

console.log(`\n❌ 未匹配的相关行:`);
nonMatches.forEach(item => {
    console.log(`  行 ${item.line}: "${item.content}" (${item.reason})`);
});

// 统计重复
const methodCounts = new Map();
methods.forEach(method => {
    const count = methodCounts.get(method.name) || 0;
    methodCounts.set(method.name, count + 1);
});

console.log(`\n📊 统计结果:`);
console.log(`总方法数: ${methods.length}`);

let duplicateCount = 0;
methodCounts.forEach((count, name) => {
    if (count > 1) {
        console.log(`  ${name}: ${count} 次 (重复)`);
        duplicateCount++;
    } else {
        console.log(`  ${name}: ${count} 次 (正常)`);
    }
});

console.log(`\n重复方法名数: ${duplicateCount}`);

// 预期结果
console.log(`\n🎯 预期结果:`);
console.log(`应该检测到7个方法: method1(2次), method2(2次), another_method(1次), normal_function(2次)`);
console.log(`重复方法名数: 3个 (method1, method2, normal_function)`);

if (methods.length === 7 && duplicateCount === 3) {
    console.log(`\n✅ 测试通过！`);
} else {
    console.log(`\n❌ 测试失败！实际: ${methods.length}个方法, ${duplicateCount}个重复`);
}