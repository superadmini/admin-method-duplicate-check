// 完整模拟VSCode扩展的检测逻辑
const fs = require('fs');

// 方法名匹配模式 - 从extension.js复制
const methodPatterns = [
    // Python: def method_name( - 更严格的匹配，避免误识别
    { pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'python' },
    // JavaScript/TypeScript: function method_name(, method_name(, const method_name = (, async method_name(
    { pattern: /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, lang: 'javascript' },
    { pattern: /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(/, lang: 'javascript' },
    { pattern: /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[{=>]/, lang: 'javascript' },
    // Java: public/private/protected static final type method_name(
    { pattern: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'java' },
    // C/C++: type method_name(
    { pattern: /^\s*(?:\w+\s+(?:\*+\s*)*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*[{;]/, lang: 'cpp' },
    // C#: public/private/protected static type method_name(
    { pattern: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'csharp' },
    // PHP: function method_name(
    { pattern: /^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'php' },
    // Ruby: def method_name
    { pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_!?]*)/, lang: 'ruby' },
    // Go: func (receiver) method_name(
    { pattern: /^\s*func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'go' },
    // Rust: fn method_name(
    { pattern: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'rust' },
    // Swift: func method_name(
    { pattern: /^\s*(?:public\s+|private\s+|internal\s+)?(?:static\s+)?func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'swift' },
    // Kotlin: fun method_name(
    { pattern: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+)?(?:suspend\s+)?fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'kotlin' },
    // Scala: def method_name(
    { pattern: /^\s*(?:def\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'scala' },
    // Dart: type method_name(
    { pattern: /^\s*(?:\w+\s+(?:\*+\s*)*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*[{;]/, lang: 'dart' },
    // VB: Function/Sub method_name(
    { pattern: /^\s*(?:Public\s+|Private\s+|Protected\s+)?(Function|Sub)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'vb', groupIndex: 2 }
];

// 模拟VSCode的检测逻辑
function checkDuplicateMethods(fileName, text) {
    const lines = text.split('\n');
    const methods = [];
    
    console.log(`\n=== 分析文件: ${fileName} ===`);
    console.log(`文件总行数: ${lines.length}`);

    // 查找所有方法
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
                
                console.log(`第${i + 1}行匹配: "${line.trim()}"`);
                console.log(`  模式: ${patternInfo.lang}`);
                console.log(`  方法名: ${methodName}`);
                
                methods.push({
                    name: methodName,
                    line: i,
                    text: line.trim()
                });
                break; // 找到匹配后跳出内层循环
            }
        }
    }

    console.log(`\n找到的方法总数: ${methods.length}`);
    methods.forEach(method => {
        console.log(`  第${method.line + 1}行: ${method.name}`);
    });

    // 查找重复方法
    const methodCounts = new Map();
    methods.forEach(method => {
        const count = methodCounts.get(method.name) || 0;
        methodCounts.set(method.name, count + 1);
    });

    console.log('\n=== 方法统计 ===');
    methodCounts.forEach((count, name) => {
        console.log(`${name}: ${count} 次`);
        if (count > 1) {
            console.log(`  ^^^ 重复方法名`);
        }
    });

    // 找出重复的方法
    const duplicates = [];
    methods.forEach(method => {
        if (methodCounts.get(method.name) > 1) {
            duplicates.push(method);
        }
    });

    console.log(`\n=== 重复方法详情 ===`);
    console.log(`重复的方法总数: ${duplicates.length}`);
    duplicates.forEach(method => {
        console.log(`  第${method.line + 1}行: ${method.name} - "${method.text}"`);
    });

    return duplicates;
}

// 读取测试文件
const fileName = 'debug_test.py';
const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');

const duplicates = checkDuplicateMethods(fileName, content);

console.log(`\n=== 最终结果 ===`);
console.log(`应该被标记为重复的方法数量: ${duplicates.length}`);
console.log('期望结果: 6个方法被标记（3个重复的方法名，每个出现2次）');