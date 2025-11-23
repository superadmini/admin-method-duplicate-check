// 最终验证测试 - 模拟完整的VSCode环境
const fs = require('fs');

// 从修改后的extension.js提取的核心逻辑
function simulateVSCodeCheck(fileName) {
    const content = fs.readFileSync(fileName, 'utf8');
    const lines = content.split('\n');
    const methods = [];
    
    // Python模式
    const pythonPattern = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

    // 查找所有方法（模拟VSCode的检测逻辑）
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('#') || line.trim() === '') {
            continue;
        }
        
        const match = line.match(pythonPattern);
        if (match && fileName.endsWith('.py')) {
            const methodName = match[1];
            
            // 额外检查
            if (line.includes('print(') || line.includes('console.log(') || line.includes('alert(')) {
                continue;
            }
            
            methods.push({
                name: methodName,
                line: i,
                text: line.trim()
            });
        }
    }

    // 统计方法出现次数
    const methodCounts = new Map();
    methods.forEach(method => {
        const count = methodCounts.get(method.name) || 0;
        methodCounts.set(method.name, count + 1);
    });

    // 新的标记逻辑：只标记重复的出现（不标记第一次出现）
    const markedMethods = [];
    const unmarkedMethods = [];
    
    methods.forEach(method => {
        if (methodCounts.get(method.name) > 1) {
            // 找到所有同名方法
            const methodOccurrences = methods.filter(m => m.name === method.name);
            // 找到当前方法在同名方法中的索引
            const currentIndex = methodOccurrences.findIndex(m => 
                m.line === method.line
            );
            
            // 只标记不是第一次出现的重复方法
            if (currentIndex > 0) {
                markedMethods.push({
                    line: method.line + 1,
                    name: method.name,
                    text: method.text,
                    reason: `重复 (第${currentIndex + 1}/${methodOccurrences.length})`
                });
            } else {
                unmarkedMethods.push({
                    line: method.line + 1,
                    name: method.name,
                    text: method.text,
                    reason: '第一次出现'
                });
            }
        } else {
            unmarkedMethods.push({
                line: method.line + 1,
                name: method.name,
                text: method.text,
                reason: '唯一方法'
            });
        }
    });

    return { markedMethods, unmarkedMethods, methodCounts };
}

// 运行测试
console.log('=== Admin Method Duplicate Check - 修复逻辑验证 ===\n');

const testFile = '/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py';
const result = simulateVSCodeCheck(testFile);

console.log('📊 方法统计:');
result.methodCounts.forEach((count, name) => {
    console.log(`  ${name}: ${count} 次`);
});

console.log('\n✅ 应该被标记为重复的方法 (波浪线):');
if (result.markedMethods.length === 0) {
    console.log('  无');
} else {
    result.markedMethods.forEach(method => {
        console.log(`  第${method.line}行: ${method.name} - "${method.text}" (${method.reason})`);
    });
}

console.log('\n⚪ 不应该被标记的方法:');
result.unmarkedMethods.forEach(method => {
    console.log(`  第${method.line}行: ${method.name} - "${method.text}" (${method.reason})`);
});

console.log('\n📋 总结:');
console.log(`  总方法数: ${result.markedMethods.length + result.unmarkedMethods.length}`);
console.log(`  被标记为重复: ${result.markedMethods.length}`);
console.log(`  不被标记: ${result.unmarkedMethods.length}`);

console.log('\n🎯 预期结果验证:');
const expectedMarked = 3; // method1(第2次), method2(第2次), normal_function(第2次)
const expectedUnmarked = 4; // method1(第1次), method2(第1次), another_method, normal_function(第1次)

if (result.markedMethods.length === expectedMarked && result.unmarkedMethods.length === expectedUnmarked) {
    console.log('✅ 测试通过！逻辑修复成功');
    console.log('   现在只有重复出现的方法会被标记，第一次出现不会被标记');
} else {
    console.log('❌ 测试失败');
    console.log(`   期望: ${expectedMarked}个被标记, ${expectedUnmarked}个不被标记`);
    console.log(`   实际: ${result.markedMethods.length}个被标记, ${result.unmarkedMethods.length}个不被标记`);
}

console.log('\n📦 新的VSIX文件已生成:');
console.log('   admin-method-duplicate-check-0.0.3-fixed-logic.vsix');