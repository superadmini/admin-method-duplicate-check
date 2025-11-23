// 模拟VSCode扩展环境的完整测试

// 模拟VSCode的Range类
class MockRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

class MockPosition {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}

// 模拟VSCode API
const mockVscode = {
    Range: MockRange,
    Position: MockPosition,
    workspace: {
        getConfiguration: (section) => ({
            get: (key, defaultValue) => {
                const config = {
                    'adminMethodDuplicateCheck.enabled': true,
                    'adminMethodDuplicateCheck.fileExtensions': ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.dart', '.vb', '.lua', '.pl', '.r', '.m', '.sh', '.bash', '.zsh', '.fish', '.pas', '.delphi', '.ada', '.fortran', '.f90', '.cob', '.asm', '.s', '.nim', '.zig', '.v', '.crystal', '.elm', '.purescript', '.idris', '.agda', '.coq', '.lean', '.f#', '.ocaml', '.reason', '.rescript'],
                    'adminMethodDuplicateCheck.enableWavyLine': true,
                    'adminMethodDuplicateCheck.enablePopup': true,
                    'adminMethodDuplicateCheck.wavyLineColor': '#ff0000',
                    'adminMethodDuplicateCheck.warningColor': '#ff8800'
                };
                return config[`${section}.${key}`] || defaultValue;
            }
        })
    }
};

// 扩展的核心逻辑（从extension.js复制）
function checkDuplicateMethods(document) {
    const config = mockVscode.workspace.getConfiguration('adminMethodDuplicateCheck');
    
    if (!config.get('enabled', true)) {
        return [];
    }

    const fileExtensions = config.get('fileExtensions', []);
    const fileExtension = '.' + document.fileName.split('.').pop().toLowerCase();
    
    if (!fileExtensions.includes(fileExtension)) {
        return [];
    }

    const text = document.getText();
    const lines = text.split('\n');
    const methods = [];

    // 方法名匹配模式 - 支持多种编程语言，更严格的匹配
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
        // JavaScript/TypeScript: function method_name(
        { 
            pattern: /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, 
            lang: 'javascript',
            validate: (line, match) => line.includes('function')
        },
        // Java: public/private/protected static final type method_name(
        { 
            pattern: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'java',
            validate: (line, match) => line.includes('(') && !line.includes('if') && !line.includes('while') && !line.includes('for')
        },
        // C/C++: type method_name(
        { 
            pattern: /^\s*(?:\w+\s+(?:\*+\s*)*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*[{;]/, 
            lang: 'cpp',
            validate: (line, match) => line.includes('(') && (line.includes('{') || line.includes(';'))
        },
        // C#: public/private/protected static type method_name(
        { 
            pattern: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'csharp',
            validate: (line, match) => line.includes('(') && !line.includes('if') && !line.includes('while')
        },
        // PHP: function method_name(
        { 
            pattern: /^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'php',
            validate: (line, match) => line.includes('function')
        },
        // Ruby: def method_name
        { 
            pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_!?]*)/, 
            lang: 'ruby',
            validate: (line, match) => line.includes('def')
        },
        // Go: func (receiver) method_name(
        { 
            pattern: /^\s*func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'go',
            validate: (line, match) => line.includes('func')
        },
        // Rust: fn method_name(
        { 
            pattern: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'rust',
            validate: (line, match) => line.includes('fn')
        },
        // Swift: func method_name(
        { 
            pattern: /^\s*(?:public\s+|private\s+|internal\s+)?(?:static\s+)?func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'swift',
            validate: (line, match) => line.includes('func')
        },
        // Kotlin: fun method_name(
        { 
            pattern: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+)?(?:suspend\s+)?fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'kotlin',
            validate: (line, match) => line.includes('fun')
        },
        // Scala: def method_name(
        { 
            pattern: /^\s*(?:def\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'scala',
            validate: (line, match) => line.includes('def')
        },
        // Dart: type method_name(
        { 
            pattern: /^\s*(?:\w+\s+(?:\*+\s*)*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*[{;]/, 
            lang: 'dart',
            validate: (line, match) => line.includes('(') && (line.includes('{') || line.includes(';'))
        },
        // VB: Function/Sub method_name(
        { 
            pattern: /^\s*(?:Public\s+|Private\s+|Protected\s+)?(Function|Sub)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
            lang: 'vb', 
            groupIndex: 2,
            validate: (line, match) => line.includes('Function') || line.includes('Sub')
        }
    ];

    // 查找所有方法
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过注释行和空行
        if (line.trim().startsWith('#') || line.trim() === '') {
            continue;
        }
        
        for (const patternInfo of methodPatterns) {
            // 只对Python文件使用Python模式，避免跨语言误匹配
            if (document.fileName.endsWith('.py') && patternInfo.lang !== 'python') {
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
                
                // 找到方法名在整行中的准确位置
                const fullMatch = match[0];
                const fullMatchStart = match.index;
                
                // 在完整匹配中找到方法名的位置
                let methodNameStartInMatch;
                if (patternInfo.groupIndex) {
                    // 如果使用了捕获组
                    const groupMatch = line.match(patternInfo.pattern);
                    methodNameStartInMatch = line.indexOf(groupMatch[patternInfo.groupIndex], fullMatchStart) - fullMatchStart;
                } else {
                    // 默认第一个捕获组
                    methodNameStartInMatch = fullMatch.indexOf(methodName);
                }
                
                const methodStart = fullMatchStart + methodNameStartInMatch;
                const methodEnd = methodStart + methodName.length;
                
                methods.push({
                    name: methodName,
                    line: i,
                    start: methodStart,
                    end: methodEnd,
                    range: new mockVscode.Range(
                        new mockVscode.Position(i, methodStart),
                        new mockVscode.Position(i, methodEnd)
                    ),
                    fullLine: line.trim()
                });
                break; // 找到匹配后跳出内层循环
            }
        }
    }

    // 查找重复方法
    const methodCounts = new Map();
    methods.forEach(method => {
        const count = methodCounts.get(method.name) || 0;
        methodCounts.set(method.name, count + 1);
    });

    // 标记重复方法
    const duplicateRanges = [];
    const duplicateMethods = [];
    
    methods.forEach(method => {
        if (methodCounts.get(method.name) > 1) {
            duplicateRanges.push({
                range: method.range,
                hoverMessage: `Duplicate method name: '${method.name}' (found ${methodCounts.get(method.name)} times)`
            });
            
            duplicateMethods.push({
                name: method.name,
                line: method.line + 1,
                fullLine: method.fullLine
            });
        }
    });

    // 计算重复的方法名数量（不是重复的出现次数）
    const duplicateMethodNames = new Set();
    methodCounts.forEach((count, name) => {
        if (count > 1) {
            duplicateMethodNames.add(name);
        }
    });

    return {
        totalMethods: methods.length,
        duplicateMethods: duplicateMethods,
        duplicateRanges: duplicateRanges,
        methodCounts: methodCounts,
        duplicateMethodNamesCount: duplicateMethodNames.size
    };
}

// 测试debug_test.py
const fs = require('fs');
const debugTestContent = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');

const mockDocument = {
    fileName: 'debug_test.py',
    getText: () => debugTestContent
};

console.log('=== 真实VSCode扩展环境模拟测试 ===\n');
console.log('测试文件: debug_test.py\n');

const result = checkDuplicateMethods(mockDocument);

console.log('检测到的所有方法:');
result.methodCounts.forEach((count, name) => {
    console.log(`  ${name}: ${count} 次`);
});

console.log(`\n总方法数: ${result.totalMethods}`);
console.log(`重复方法数: ${result.duplicateMethods.length}`);

if (result.duplicateMethods.length > 0) {
    console.log('\n重复方法详情:');
    result.duplicateMethods.forEach(method => {
        console.log(`  行 ${method.line}: ${method.name} - "${method.fullLine}"`);
    });
}

console.log('\n=== 预期结果对比 ===');
console.log('应该检测到的方法:');
console.log('  method1: 2 次 (重复)');
console.log('  method2: 2 次 (重复)');
console.log('  another_method: 1 次 (正常)');
console.log('  normal_function: 2 次 (重复)');
console.log('\n不应该检测到的内容:');
console.log('  print(f"...") 语句');
console.log('  f-string 格式化');
console.log('  注释行');
console.log('  空行');
console.log('  变量赋值');

if (result.totalMethods === 7 && result.duplicateMethods.length === 3) {
    console.log('\n✅ 测试通过！检测逻辑正确');
} else {
    console.log(`\n❌ 测试失败！期望7个方法，3个重复；实际${result.totalMethods}个方法，${result.duplicateMethods.length}个重复`);
}