// 正确模拟VSCode的语言过滤逻辑
const fs = require('fs');

// 从extension.js复制的所有模式
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

function simulateCorrectVSCodeLogic(fileName) {
    const content = fs.readFileSync(fileName, 'utf8');
    const lines = content.split('\n');
    const methods = [];
    
    console.log(`\n=== 正确模拟VSCode逻辑: ${fileName} ===\n`);
    
    // 查找所有方法 - 应用正确的语言过滤
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过注释行和空行
        if (line.trim().startsWith('#') || line.trim() === '') {
            continue;
        }
        
        for (const patternInfo of methodPatterns) {
            // 关键：只对Python文件使用Python模式，避免跨语言误匹配
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
                
                console.log(`第${i + 1}行匹配:`);
                console.log(`  内容: "${line.trim()}"`);
                console.log(`  模式: ${patternInfo.lang}`);
                console.log(`  方法名: "${methodName}"`);
                console.log(`  完整匹配: "${match[0]}"`);
                console.log('');
                
                methods.push({
                    name: methodName,
                    line: i,
                    text: line.trim(),
                    pattern: patternInfo.lang
                });
                break; // 找到匹配后跳出内层循环
            }
        }
    }
    
    console.log(`\n=== 所有检测到的方法（应用语言过滤后） ===`);
    methods.forEach(method => {
        console.log(`第${method.line + 1}行: ${method.name} (${method.pattern})`);
    });
    
    // 统计重复
    const methodCounts = new Map();
    methods.forEach(method => {
        const count = methodCounts.get(method.name) || 0;
        methodCounts.set(method.name, count + 1);
    });
    
    console.log(`\n=== 重复统计（应用语言过滤后） ===`);
    methodCounts.forEach((count, name) => {
        console.log(`${name}: ${count} 次`);
        if (count > 1) {
            console.log(`  ^^^ 被判断为重复`);
            methods.filter(m => m.name === name).forEach(m => {
                console.log(`    第${m.line + 1}行: ${m.text}`);
            });
        }
    });
    
    return { methods, methodCounts };
}

// 运行正确模拟
const result = simulateCorrectVSCodeLogic('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py');

console.log(`\n=== 分析 ===`);
console.log(`应用语言过滤后，总共检测到 ${result.methods.length} 个方法`);

const duplicateMethods = [];
result.methodCounts.forEach((count, name) => {
    if (count > 1) {
        duplicateMethods.push({ name, count });
    }
});

console.log(`重复的方法名: ${duplicateMethods.map(m => m.name).join(', ')}`);
console.log(`如果method2不应该在重复列表中，那么可能的问题：`);
console.log(`1. 语言过滤逻辑在VSCode中实际没有生效`);
console.log(`2. 用户期望的行为与当前实现不符`);
console.log(`3. 文件内容与用户期望不符`);