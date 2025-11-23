// 最终测试 - 使用修复后的完整逻辑

const fs = require('fs');

// 完整的方法模式（从修复后的extension.js复制）
const methodPatterns = [
    // Python: def method_name( - 更严格的匹配，避免误识别
    { 
        pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
        lang: 'python',
        validate: (line, match) => {
            // 确保这行不是注释且确实包含def
            return line.includes('def') && !line.trim().startsWith('#');
        }
    },
    // 其他语言模式...
];

// 读取debug_test.py
const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');
const lines = content.split('\n');

console.log('=== 使用修复后的完整逻辑测试 ===\n');

const methods = [];
const fileName = 'debug_test.py';

// 完整的检测逻辑
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跳过注释行和空行
    if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
    }
    
    for (const patternInfo of methodPatterns) {
        // 只对Python文件使用Python模式，避免跨语言误匹配
        if (fileName.endsWith('.py') && patternInfo.lang !== 'python') {
            continue;
        }
        
        const match = line.match(patternInfo.pattern);
        if (match) {
            const methodName = match[patternInfo.groupIndex || 1];
            
            // 使用验证函数进行额外检查
            if (patternInfo.validate && !patternInfo.validate(line, match)) {
                continue;
            }
            
            // 额外检查：确保不是f-string中的内容
            if (line.includes('f"') || line.includes("f'")) {
                // 如果是f-string行，跳过非def的匹配
                if (patternInfo.lang === 'python' && !line.includes('def ')) {
                    continue;
                }
            }
            
            // 额外检查：确保不是print语句或其他函数调用
            if (line.includes('print(') || line.includes('console.log(') || line.includes('alert(')) {
                continue;
            }
            
            methods.push({
                name: methodName,
                line: i + 1,
                content: line.trim()
            });
            break; // 找到匹配后跳出内层循环
        }
    }
}

console.log('✅ 检测到的方法:');
methods.forEach(method => {
    console.log(`  行 ${method.line}: ${method.name} - "${method.content}"`);
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
    console.log(`\n✅ 修复成功！现在应该正确检测了。`);
    console.log(`\n📦 新的VSIX文件: admin-method-duplicate-check-0.0.3-fixed.vsix`);
    console.log(`请重新安装这个VSIX文件测试。`);
} else {
    console.log(`\n❌ 还有问题！实际: ${methods.length}个方法, ${duplicateCount}个重复`);
}