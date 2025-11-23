// 更新后的详细调试脚本
const fs = require('fs');

function detectMethodContextDetailed(lines, currentLineIndex, methodName) {
    console.log(`\n=== 检测第${currentLineIndex + 1}行的${methodName}方法 ===`);
    
    const context = {
        type: 'module',
        className: null,
        fullName: methodName,
        indentLevel: 0,
        isClassMethod: false,
        isStaticMethod: false,
        getFullName: function(name) {
            return this.className ? `${this.className}.${name}` : name;
        }
    };
    
    const currentLine = lines[currentLineIndex];
    const indentMatch = currentLine.match(/^(\s*)/);
    if (indentMatch) {
        context.indentLevel = indentMatch[1].length;
    }
    
    console.log(`当前行: "${currentLine.trim()}"`);
    console.log(`缩进级别: ${context.indentLevel} 个空格`);
    
    // 向上查找类定义
    for (let i = currentLineIndex - 1; i >= 0; i--) {
        const line = lines[i];
        
        console.log(`检查第${i + 1}行: "${line.trim()}"`);
        
        if (line.trim() === '' || line.trim().startsWith('#')) {
            console.log(`  跳过 (空行或注释)`);
            continue;
        }
        
        const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (classMatch) {
            const classIndentMatch = line.match(/^(\s*)/);
            const classIndentLevel = classIndentMatch ? classIndentMatch[1].length : 0;
            
            console.log(`  找到类定义: ${classMatch[1]}`);
            console.log(`  类缩进级别: ${classIndentLevel} 个空格`);
            console.log(`  当前方法缩进级别: ${context.indentLevel} 个空格`);
            console.log(`  类缩进 < 方法缩进: ${classIndentLevel < context.indentLevel}`);
            
            if (classIndentLevel < context.indentLevel) {
                context.type = 'class';
                context.className = classMatch[1];
                context.isClassMethod = true;
                context.fullName = `${context.className}.${methodName}`;
                console.log(`  ✅ 方法在类内部: ${context.fullName}`);
                break;
            } else {
                console.log(`  ❌ 类缩进不小于方法缩进，继续查找`);
            }
        }
        
        const lineIndentMatch = line.match(/^(\s*)/);
        const lineIndentLevel = lineIndentMatch ? lineIndentMatch[1].length : 0;
        console.log(`  行缩进级别: ${lineIndentLevel} 个空格`);
        console.log(`  行缩进 <= 方法缩进: ${lineIndentLevel <= context.indentLevel}`);
        console.log(`  行非空: ${line.trim() !== ''}`);
        console.log(`  是类或函数定义: ${!!(line.match(/^\s*(class|def)\s/) || line.match(/^\s*(async\s+)?def\s/))}`);
        
        // 只有遇到模块级函数定义（缩进为0）时才停止，类内部的方法不停止查找
        if (lineIndentLevel === 0 && line.trim() !== '' && 
            (line.match(/^\s*def\s/) || line.match(/^\s*(async\s+)?def\s/))) {
            console.log(`  停止查找 (遇到模块级函数定义)`);
            break;
        }
    }
    
    console.log(`最终结果: ${context.fullName} (${context.type})`);
    return context;
}

function debugAllMethod2() {
    const content = fs.readFileSync('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py', 'utf8');
    const lines = content.split('\n');
    
    console.log('=== 详细调试所有method2方法 ===');
    
    // 查找所有method2
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('def method2')) {
            detectMethodContextDetailed(lines, i, 'method2');
        }
    }
}

debugAllMethod2();