// 测试修改后的逻辑 - 只标记重复的出现，不标记第一次出现
const fs = require('fs');

// 模拟新的检测逻辑
function checkDuplicateMethodsNew(fileName, text) {
    const lines = text.split('\n');
    const methods = [];
    
    // Python模式
    const pythonPattern = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

    // 查找所有方法
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('#') || line.trim() === '') {
            continue;
        }
        
        const match = line.match(pythonPattern);
        if (match && fileName.endsWith('.py')) {
            const methodName = match[1];
            
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

    console.log(`\n=== 找到的方法 ===`);
    methods.forEach((method, index) => {
        console.log(`${index + 1}. 第${method.line + 1}行: ${method.name} - "${method.text}"`);
    });

    // 查找重复方法
    const methodCounts = new Map();
    methods.forEach(method => {
        const count = methodCounts.get(method.name) || 0;
        methodCounts.set(method.name, count + 1);
    });

    console.log(`\n=== 方法统计 ===`);
    methodCounts.forEach((count, name) => {
        console.log(`${name}: ${count} 次`);
    });

    // 新逻辑：只标记重复的出现（不标记第一次出现）
    const duplicateRanges = [];
    
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
                duplicateRanges.push({
                    name: method.name,
                    line: method.line + 1,
                    text: method.text,
                    reason: `重复出现 (第${currentIndex + 1}个出现，共${methodOccurrences.length}个)`
                });
            }
        }
    });

    console.log(`\n=== 应该被标记为重复的方法 ===`);
    if (duplicateRanges.length === 0) {
        console.log("无");
    } else {
        duplicateRanges.forEach(dup => {
            console.log(`第${dup.line}行: ${dup.name} - "${dup.text}" (${dup.reason})`);
        });
    }

    console.log(`\n=== 不应该被标记的方法 ===`);
    methods.forEach(method => {
        const isMarked = duplicateRanges.some(dup => 
            dup.line === method.line + 1 && dup.name === method.name
        );
        if (!isMarked) {
            if (methodCounts.get(method.name) > 1) {
                console.log(`第${method.line + 1}行: ${method.name} - "${method.text}" (第一次出现，不标记)`);
            } else {
                console.log(`第${method.line + 1}行: ${method.name} - "${method.text}" (唯一方法，不标记)`);
            }
        }
    });

    return duplicateRanges;
}

// 读取测试文件
const fileName = 'debug_test.py';
const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');

const duplicates = checkDuplicateMethodsNew(fileName, content);

console.log(`\n=== 最终结果 ===`);
console.log(`应该被标记为重复的方法数量: ${duplicates.length}`);
console.log('期望结果: 3个方法被标记（method1的第2次出现，method2的第2次出现，normal_function的第2次出现）');