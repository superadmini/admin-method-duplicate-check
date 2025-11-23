// 调试类定义的正则表达式匹配
const fs = require('fs');

function debugClassRegex() {
    const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');
    const lines = content.split('\n');
    
    console.log('=== 调试类定义正则表达式 ===');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('class')) {
            console.log(`第${i + 1}行: "${line}"`);
            
            const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (classMatch) {
                console.log(`  ✅ 匹配成功: ${classMatch[1]}`);
                console.log(`  完整匹配: "${classMatch[0]}"`);
                
                const classIndentMatch = line.match(/^(\s*)/);
                const classIndentLevel = classIndentMatch ? classIndentMatch[1].length : 0;
                console.log(`  缩进级别: ${classIndentLevel} 个空格`);
            } else {
                console.log(`  ❌ 匹配失败`);
            }
        }
    }
    
    // 测试正则表达式
    console.log('\n=== 测试正则表达式 ===');
    const testLines = [
        'class TestClass:',
        '  class TestClass:',
        '    class TestClass:',
        'class TestClass: # comment'
    ];
    
    testLines.forEach(line => {
        const match = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        console.log(`"${line}" -> ${match ? match[1] : '无匹配'}`);
    });
}

debugClassRegex();