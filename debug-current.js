// 检查当前debug_test.py中实际被检测到的所有方法
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

function debugMethodDetection(fileName) {
    const content = fs.readFileSync(fileName, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n=== 调试方法检测: ${fileName} ===\n`);
    
    const allMatches = [];
    
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
                
                allMatches.push({
                    lineNumber: i + 1,
                    lineContent: line.trim(),
                    pattern: patternInfo.lang,
                    methodName: methodName,
                    fullMatch: match[0]
                });
                
                console.log(`第${i + 1}行匹配:`);
                console.log(`  内容: "${line.trim()}"`);
                console.log(`  模式: ${patternInfo.lang}`);
                console.log(`  方法名: "${methodName}"`);
                console.log(`  完整匹配: "${match[0]}"`);
                console.log('');
                
                break; // 找到匹配后跳出内层循环
            }
        }
    }
    
    console.log(`\n=== 所有匹配的方法 ===`);
    allMatches.forEach(match => {
        console.log(`第${match.lineNumber}行: ${match.methodName} (${match.pattern})`);
    });
    
    // 统计重复
    const methodCounts = new Map();
    allMatches.forEach(match => {
        const count = methodCounts.get(match.methodName) || 0;
        methodCounts.set(match.methodName, count + 1);
    });
    
    console.log(`\n=== 重复统计 ===`);
    methodCounts.forEach((count, name) => {
        console.log(`${name}: ${count} 次`);
        if (count > 1) {
            console.log(`  ^^^ 被判断为重复`);
            // 显示所有出现
            allMatches.filter(m => m.methodName === name).forEach(m => {
                console.log(`    第${m.lineNumber}行: ${m.lineContent}`);
            });
        }
    });
    
    return allMatches;
}

// 运行调试
const matches = debugMethodDetection('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py');

console.log(`\n=== 问题分析 ===`);
console.log(`总共检测到 ${matches.length} 个方法`);
console.log('如果method2不应该被标记为重复，那么：');
console.log('1. 要么文件中确实只有一个method2');
console.log('2. 要么检测逻辑错误地匹配了其他内容为method2');
console.log('3. 要么其他语言的模式错误地匹配了Python文件');