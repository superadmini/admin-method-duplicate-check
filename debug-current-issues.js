// 调试当前问题
const fs = require('fs');

// 从extension.js复制的detectMethodContext函数
function detectMethodContext(lines, currentLineIndex, methodName) {
    const context = {
        type: 'module',
        className: null,
        fullName: methodName,
        indentLevel: 0,
        isClassMethod: false,
        getFullName: function(name) {
            if (this.className) {
                return `${this.className}.${name}`;
            }
            return name;
        }
    };
    
    const currentLine = lines[currentLineIndex];
    const indentMatch = currentLine.match(/^(\s*)/);
    if (indentMatch) {
        context.indentLevel = indentMatch[1].length;
    }
    
    for (let i = currentLineIndex - 1; i >= 0; i--) {
        const line = lines[i];
        
        if (line.trim() === '' || line.trim().startsWith('#')) {
            continue;
        }
        
        const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (classMatch) {
            const classIndentMatch = line.match(/^(\s*)/);
            const classIndentLevel = classIndentMatch ? classIndentMatch[1].length : 0;
            
            if (classIndentLevel < context.indentLevel) {
                context.type = 'class';
                context.className = classMatch[1];
                context.isClassMethod = true;
                context.fullName = `${context.className}.${methodName}`;
                break;
            }
        }
        
        const lineIndentMatch = line.match(/^(\s*)/);
        const lineIndentLevel = lineIndentMatch ? lineIndentMatch[1].length : 0;
        if (lineIndentLevel <= context.indentLevel && line.trim() !== '') {
            break;
        }
    }
    
    return context;
}

// 检查method2的具体情况
function debugMethod2() {
    const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');
    const lines = content.split('\n');
    
    console.log('=== 调试method2问题 ===\n');
    
    // 查找所有method2
    const method2Lines = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('def method2')) {
            method2Lines.push({
                lineNumber: i + 1,
                content: lines[i].trim(),
                context: detectMethodContext(lines, i, 'method2')
            });
        }
    }
    
    console.log('找到的method2方法:');
    method2Lines.forEach(method => {
        console.log(`第${method.lineNumber}行: "${method.content}"`);
        console.log(`  完整限定名: ${method.context.fullName}`);
        console.log(`  类型: ${method.context.type}`);
        console.log(`  类名: ${method.context.className || '无'}`);
        console.log(`  缩进级别: ${method.context.indentLevel}`);
        console.log('');
    });
    
    // 检查上下文检测是否正确
    console.log('=== 上下文检测验证 ===');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('class TestClass')) {
            console.log(`第${i + 1}行: "${line.trim()}"`);
            const indentMatch = line.match(/^(\s*)/);
            console.log(`  缩进: ${indentMatch ? indentMatch[1].length : 0} 个空格`);
        }
    }
    
    return method2Lines;
}

debugMethod2();