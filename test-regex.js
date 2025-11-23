// 测试当前的正则表达式匹配逻辑
const fs = require('fs');

// 从extension.js复制的Python模式
const pythonPattern = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

// 读取测试文件
const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');
const lines = content.split('\n');

console.log('=== 测试每一行的匹配结果 ===\n');

lines.forEach((line, index) => {
    const match = line.match(pythonPattern);
    if (match) {
        console.log(`第${index + 1}行匹配: "${line.trim()}"`);
        console.log(`  匹配到的完整内容: "${match[0]}"`);
        console.log(`  方法名: "${match[1]}"`);
        console.log('');
    } else {
        // 检查是否包含"def"但没有匹配
        if (line.includes('def')) {
            console.log(`第${index + 1}行包含def但未匹配: "${line.trim()}"`);
            console.log('');
        }
    }
});

console.log('\n=== 分析 ===');
console.log('问题可能在于：');
console.log('1. 正则表达式过于宽松，匹配了不应该匹配的内容');
console.log('2. 语言过滤没有正确工作');
console.log('3. f-string或其他模式被误识别');