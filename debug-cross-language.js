// 检查是否有跨语言模式错误匹配Python文件
const fs = require('fs');

// 所有模式，包括非Python的
const allPatterns = [
    { pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'python' },
    { pattern: /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, lang: 'javascript' },
    { pattern: /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(/, lang: 'javascript' },
    { pattern: /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[{=>]/, lang: 'javascript' },
    { pattern: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'java' },
    { pattern: /^\s*(?:\w+\s+(?:\*+\s*)*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*[{;]/, lang: 'cpp' },
    { pattern: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'csharp' },
    { pattern: /^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'php' },
    { pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_!?]*)/, lang: 'ruby' },
    { pattern: /^\s*func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'go' },
    { pattern: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'rust' },
    { pattern: /^\s*(?:public\s+|private\s+|internal\s+)?(?:static\s+)?func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'swift' },
    { pattern: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+)?(?:suspend\s+)?fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'kotlin' },
    { pattern: /^\s*(?:def\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'scala' },
    { pattern: /^\s*(?:\w+\s+(?:\*+\s*)*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*[{;]/, lang: 'dart' },
    { pattern: /^\s*(?:Public\s+|Private\s+|Protected\s+)?(Function|Sub)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'vb', groupIndex: 2 }
];

function checkCrossLanguageMatching(fileName) {
    const content = fs.readFileSync(fileName, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n=== 检查跨语言模式匹配: ${fileName} ===\n`);
    
    // 重点检查method2相关的行
    const targetLines = [8, 25]; // method2出现的行号
    
    targetLines.forEach(lineNum => {
        const lineIndex = lineNum - 1;
        const line = lines[lineIndex];
        
        console.log(`\n--- 第${lineNum}行: "${line.trim()}" ---`);
        
        let matches = [];
        
        for (const patternInfo of allPatterns) {
            const match = line.match(patternInfo.pattern);
            if (match) {
                const methodName = match[patternInfo.groupIndex || 1];
                matches.push({
                    pattern: patternInfo.lang,
                    methodName: methodName,
                    fullMatch: match[0]
                });
            }
        }
        
        if (matches.length > 0) {
            console.log(`匹配到 ${matches.length} 个模式:`);
            matches.forEach(m => {
                console.log(`  ${m.pattern}: "${m.methodName}" (完整匹配: "${m.fullMatch}")`);
            });
        } else {
            console.log("没有匹配任何模式");
        }
    });
    
    // 检查是否其他语言模式也匹配了Python文件
    console.log(`\n=== 检查所有非Python模式是否错误匹配 ===`);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('#') || line.trim() === '') {
            continue;
        }
        
        for (const patternInfo of allPatterns) {
            if (patternInfo.lang === 'python') continue; // 跳过Python模式
            
            const match = line.match(patternInfo.pattern);
            if (match) {
                const methodName = match[patternInfo.groupIndex || 1];
                console.log(`第${i + 1}行被${patternInfo.lang}模式错误匹配: "${line.trim()}"`);
                console.log(`  方法名: "${methodName}"`);
                console.log(`  完整匹配: "${match[0]}"`);
                console.log('');
            }
        }
    }
}

// 运行检查
checkCrossLanguageMatching('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py');