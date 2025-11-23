// 测试上下文感知的方法重复检测
const fs = require('fs');

// 模拟detectMethodContext函数
function detectMethodContext(lines, currentLineIndex, methodName) {
    const context = {
        type: 'module', // 默认模块级别
        className: null,
        fullName: methodName,
        indentLevel: 0,
        isClassMethod: false,
        isStaticMethod: false,
        getFullName: function(name) {
            if (this.className) {
                return `${this.className}.${name}`;
            }
            return name;
        }
    };
    
    // 检查当前行的缩进级别
    const currentLine = lines[currentLineIndex];
    const indentMatch = currentLine.match(/^(\s*)/);
    if (indentMatch) {
        context.indentLevel = indentMatch[1].length;
    }
    
    // 向上查找类定义
    for (let i = currentLineIndex - 1; i >= 0; i--) {
        const line = lines[i];
        
        // 如果遇到空行或注释，继续向上查找
        if (line.trim() === '' || line.trim().startsWith('#')) {
            continue;
        }
        
        // 检查是否是类定义
        const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (classMatch) {
            const classIndentMatch = line.match(/^(\s*)/);
            const classIndentLevel = classIndentMatch ? classIndentMatch[1].length : 0;
            
            // 如果类定义的缩进级别小于当前方法的缩进级别，说明方法在类内部
            if (classIndentLevel < context.indentLevel) {
                context.type = 'class';
                context.className = classMatch[1];
                context.isClassMethod = true;
                context.fullName = `${context.className}.${methodName}`;
                
                // 检查是否是静态方法（查找@staticmethod装饰器）
                for (let j = i + 1; j < currentLineIndex; j++) {
                    if (lines[j].trim() === '@staticmethod') {
                        context.isStaticMethod = true;
                        break;
                    }
                }
                break;
            }
        }
        
        // 如果遇到同级别或更低级别的其他定义，停止查找
        const lineIndentMatch = line.match(/^(\s*)/);
        const lineIndentLevel = lineIndentMatch ? lineIndentMatch[1].length : 0;
        if (lineIndentLevel <= context.indentLevel && line.trim() !== '') {
            break;
        }
    }
    
    return context;
}

// Python模式
const pythonPattern = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

function testContextAwareDetection(fileName) {
    const content = fs.readFileSync(fileName, 'utf8');
    const lines = content.split('\n');
    const methods = [];
    
    console.log(`\n=== 上下文感知的方法检测: ${fileName} ===\n`);
    
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
            
            // 检测方法上下文
            const context = detectMethodContext(lines, i, methodName);
            
            methods.push({
                name: methodName,
                line: i,
                text: line.trim(),
                context: context,
                fullName: context.getFullName(methodName)
            });
        }
    }
    
    console.log('=== 检测到的方法及其上下文 ===');
    methods.forEach(method => {
        console.log(`第${method.line + 1}行: ${method.name}`);
        console.log(`  完整限定名: ${method.fullName}`);
        console.log(`  类型: ${method.context.type}`);
        console.log(`  是否类方法: ${method.context.isClassMethod}`);
        console.log(`  类名: ${method.context.className || '无'}`);
        console.log(`  内容: ${method.text}`);
        console.log('');
    });
    
    // 使用完整限定名统计重复
    const methodCounts = new Map();
    methods.forEach(method => {
        const fullName = method.fullName;
        const count = methodCounts.get(fullName) || 0;
        methodCounts.set(fullName, count + 1);
    });
    
    console.log('=== 重复检测（使用完整限定名） ===');
    methodCounts.forEach((count, fullName) => {
        console.log(`${fullName}: ${count} 次`);
        if (count > 1) {
            console.log(`  ^^^ 被判断为重复`);
            methods.filter(m => m.fullName === fullName).forEach(m => {
                console.log(`    第${m.line + 1}行: ${m.text}`);
            });
        }
    });
    
    // 找出重复的方法
    const duplicates = [];
    methods.forEach(method => {
        const fullName = method.fullName;
        if (methodCounts.get(fullName) > 1) {
            const methodOccurrences = methods.filter(m => m.fullName === fullName);
            const currentIndex = methodOccurrences.findIndex(m => 
                m.line === method.line
            );
            
            if (currentIndex > 0) {
                duplicates.push({
                    line: method.line + 1,
                    name: method.name,
                    fullName: method.fullName,
                    text: method.text,
                    reason: `重复出现 (第${currentIndex + 1}/${methodOccurrences.length})`
                });
            }
        }
    });
    
    console.log('\n=== 应该被标记为重复的方法 ===');
    if (duplicates.length === 0) {
        console.log('无');
    } else {
        duplicates.forEach(dup => {
            console.log(`第${dup.line}行: ${dup.name} (${dup.fullName}) - "${dup.text}" (${dup.reason})`);
        });
    }
    
    console.log('\n=== 不应该被标记的方法 ===');
    methods.forEach(method => {
        const isMarked = duplicates.some(dup => 
            dup.line === method.line + 1 && dup.fullName === method.fullName
        );
        if (!isMarked) {
            const fullName = method.fullName;
            if (methodCounts.get(fullName) > 1) {
                console.log(`第${method.line + 1}行: ${method.name} (${method.fullName}) - "${method.text}" (第一次出现，不标记)`);
            } else {
                console.log(`第${method.line + 1}行: ${method.name} (${method.fullName}) - "${method.text}" (唯一方法，不标记)`);
            }
        }
    });
    
    return { methods, duplicates, methodCounts };
}

// 运行测试
const result = testContextAwareDetection('/Users/liqilin/PycharmProjects/vs code/Admin-Method-Duplicate-Check/debug_test.py');

console.log(`\n=== 验证结果 ===`);
console.log(`总方法数: ${result.methods.length}`);
console.log(`应该被标记为重复: ${result.duplicates.length}`);
console.log(`不应该被标记: ${result.methods.length - result.duplicates.length}`);

console.log('\n🎯 预期结果验证:');
// 根据文件内容，期望的结果：
// - method1: 2次重复（都在TestClass中）→ 1个被标记
// - method2: 2次，但一个是TestClass.method2，一个是module.method2 → 不重复
// - another_method: 1次 → 不重复
// - normal_function2: 1次 → 不重复  
// - normal_function: 2次（都是module级别）→ 1个被标记

const expectedMarked = 2; // method1(第2次), normal_function(第2次)
const expectedUnmarked = 6; // 其他所有方法

if (result.duplicates.length === expectedMarked) {
    console.log('✅ 测试通过！上下文感知检测成功');
    console.log('   现在method2不再被错误地标记为重复');
    console.log('   TestClass.method2 和 module.method2 被正确区分为不同的方法');
} else {
    console.log('❌ 测试失败');
    console.log(`   期望: ${expectedMarked}个被标记`);
    console.log(`   实际: ${result.duplicates.length}个被标记`);
}