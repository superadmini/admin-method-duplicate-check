const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Admin Method Duplicate Check extension is now active!');

    // 存储当前文件的重复方法信息
    let duplicateMethods = new Map();
    let decorationTypes = {
        wavyLine: null,
        warning: null,
        classWarning: null
    };

    // 检测方法的作用域和上下文
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
                    break; // 找到类定义后退出循环
                }
            }
            
            // 如果遇到同级别或更低级别的模块级函数定义，停止查找
            const lineIndentMatch = line.match(/^(\s*)/);
            const lineIndentLevel = lineIndentMatch ? lineIndentMatch[1].length : 0;
            // 只有遇到模块级函数定义（缩进为0）时才停止，类内部的方法不停止查找
            if (lineIndentLevel === 0 && line.trim() !== '' && 
                (line.match(/^\s*def\s/) || line.match(/^\s*(async\s+)?def\s/))) {
                break;
            }
        }
        
        return context;
    }

    // 方法名匹配模式 - 支持多种编程语言
    const methodPatterns = [
        // Python: def method_name( - 更严格的匹配，避免误识别
        { pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, lang: 'python' },
        // JavaScript/TypeScript: function method_name(, const method_name = (, async method_name(
        { pattern: /^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, lang: 'javascript' },
        { pattern: /^\s*(?:async\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(/, lang: 'javascript' },
        { pattern: /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function\s*\(/, lang: 'javascript' },
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

    // 类名匹配模式 - 支持多种编程语言
    const classPatterns = [
        // Python: class ClassName:
        { pattern: /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/, lang: 'python' },
        // JavaScript/TypeScript: class ClassName, class ClassName extends
        { pattern: /^\s*class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*{/, lang: 'javascript' },
        // Java: public class ClassName
        { pattern: /^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:abstract\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*(?:implements\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'java' },
        // C++: class ClassName
        { pattern: /^\s*(?:class\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*(?:public\s+|private\s+|protected\s+)?[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'cpp' },
        // C#: public class ClassName
        { pattern: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+)?(?:static\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'csharp' },
        // PHP: class ClassName
        { pattern: /^\s*(?:abstract\s+)?(?:final\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*(?:implements\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'php' },
        // Ruby: class ClassName
        { pattern: /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_?]*)\s*(?:\s*<\s*[a-zA-Z_][a-zA-Z0-9_?]*)?\s*/, lang: 'ruby' },
        // Go: type ClassName struct
        { pattern: /^\s*type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+struct\s*{/, lang: 'go' },
        // Rust: struct ClassName
        { pattern: /^\s*(?:pub\s+)?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*{/, lang: 'rust' },
        // Swift: class ClassName
        { pattern: /^\s*(?:public\s+|private\s+|internal\s+)?(?:final\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'swift' },
        // Kotlin: class ClassName
        { pattern: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+)?(?:abstract\s+|final\s+|sealed\s+|data\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*(?::\s*[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'kotlin' },
        // Scala: class ClassName
        { pattern: /^\s*(?:abstract\s+|final\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*(?:with\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*(?:\{|\s*:)/, lang: 'scala' },
        // Dart: class ClassName
        { pattern: /^\s*(?:abstract\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*(?:with\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*(?:mixin\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*{/, lang: 'dart' }
    ];

    // 更新装饰器类型
    function updateDecorationTypes() {
        const config = vscode.workspace.getConfiguration('adminMethodDuplicateCheck');
        const wavyLineColor = config.get('wavyLineColor', '#ff0000');
        const warningColor = config.get('warningColor', '#ff8800');

        // 清理旧的装饰器类型
        if (decorationTypes.wavyLine) {
            decorationTypes.wavyLine.dispose();
        }
        if (decorationTypes.warning) {
            decorationTypes.warning.dispose();
        }
        if (decorationTypes.classWarning) {
            decorationTypes.classWarning.dispose();
        }

        // 创建新的装饰器类型
        decorationTypes.wavyLine = vscode.window.createTextEditorDecorationType({
            textDecoration: `underline wavy ${wavyLineColor}`,
            color: wavyLineColor,
            backgroundColor: 'transparent',
            light: {
                textDecoration: `underline wavy ${wavyLineColor}`,
                color: wavyLineColor
            },
            dark: {
                textDecoration: `underline wavy ${wavyLineColor}`,
                color: wavyLineColor
            }
        });

        decorationTypes.warning = vscode.window.createTextEditorDecorationType({
            backgroundColor: warningColor,
            light: {
                backgroundColor: warningColor
            },
            dark: {
                backgroundColor: warningColor
            },
            gutter: true,
            gutterSize: '8px',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            overviewRulerColor: warningColor
        });

        // 创建类重复警告装饰器（使用不同颜色）
        decorationTypes.classWarning = vscode.window.createTextEditorDecorationType({
            backgroundColor: '#ff6600',
            light: {
                backgroundColor: '#ff6600'
            },
            dark: {
                backgroundColor: '#ff6600'
            },
            gutter: true,
            gutterSize: '8px',
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            overviewRulerColor: '#ff6600'
        });
    }

    // 检测重复类
    function checkDuplicateClasses(editor) {
        const document = editor.document;
        const text = document.getText();
        const lines = text.split('\n');
        const classes = [];

        // 查找所有类定义
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 跳过注释行和空行
            if (line.trim().startsWith('#') || line.trim().startsWith('//') || line.trim() === '') {
                continue;
            }
            
            for (const patternInfo of classPatterns) {
                // 语言特定过滤
                if (document.fileName.endsWith('.py') && patternInfo.lang !== 'python') {
                    continue;
                }
                if (document.fileName.endsWith('.js') && patternInfo.lang !== 'javascript') {
                    continue;
                }
                if (document.fileName.endsWith('.ts') && patternInfo.lang !== 'javascript') {
                    continue;
                }
                if (document.fileName.endsWith('.java') && patternInfo.lang !== 'java') {
                    continue;
                }
                if (document.fileName.endsWith('.cpp') && patternInfo.lang !== 'cpp') {
                    continue;
                }
                if (document.fileName.endsWith('.cs') && patternInfo.lang !== 'csharp') {
                    continue;
                }
                if (document.fileName.endsWith('.php') && patternInfo.lang !== 'php') {
                    continue;
                }
                if (document.fileName.endsWith('.rb') && patternInfo.lang !== 'ruby') {
                    continue;
                }
                if (document.fileName.endsWith('.go') && patternInfo.lang !== 'go') {
                    continue;
                }
                if (document.fileName.endsWith('.rs') && patternInfo.lang !== 'rust') {
                    continue;
                }
                if (document.fileName.endsWith('.swift') && patternInfo.lang !== 'swift') {
                    continue;
                }
                if (document.fileName.endsWith('.kt') && patternInfo.lang !== 'kotlin') {
                    continue;
                }
                if (document.fileName.endsWith('.scala') && patternInfo.lang !== 'scala') {
                    continue;
                }
                if (document.fileName.endsWith('.dart') && patternInfo.lang !== 'dart') {
                    continue;
                }
                
                const match = line.match(patternInfo.pattern);
                if (match) {
                    const className = match[1];
                    
                    // 找到类名在整行中的准确位置
                    const fullMatch = match[0];
                    const fullMatchStart = match.index;
                    const classNameStartInMatch = fullMatch.indexOf(className);
                    const classStart = fullMatchStart + classNameStartInMatch;
                    const classEnd = classStart + className.length;
                    
                    classes.push({
                        name: className,
                        line: i,
                        start: classStart,
                        end: classEnd,
                        range: new vscode.Range(
                            new vscode.Position(i, classStart),
                            new vscode.Position(i, classEnd)
                        )
                    });
                    break;
                }
            }
        }

        // 查找重复类
        const classCounts = new Map();
        classes.forEach(cls => {
            const count = classCounts.get(cls.name) || 0;
            classCounts.set(cls.name, count + 1);
        });

        return {
            classes: classes,
            classCounts: classCounts,
            duplicateClassesList: classes.filter(cls => classCounts.get(cls.name) > 1)
        };
    }

    // 检测重复方法
    function checkDuplicateMethods(editor) {
        if (!editor) {
            return;
        }

        const document = editor.document;
        const config = vscode.workspace.getConfiguration('adminMethodDuplicateCheck');
        
        console.log('检查重复方法，文件:', document.fileName);
        console.log('插件启用状态:', config.get('enabled', true));
        console.log('弹窗启用状态:', config.get('enablePopup', true));
        console.log('波浪线启用状态:', config.get('enableWavyLine', true));
        
        if (!config.get('enabled', true)) {
            clearDecorations(editor);
            return;
        }

        const fileExtensions = config.get('fileExtensions', []);
        const fileExtension = '.' + document.fileName.split('.').pop().toLowerCase();
        
        if (!fileExtensions.includes(fileExtension)) {
            clearDecorations(editor);
            return;
        }

        const text = document.getText();
        const lines = text.split('\n');
        const methods = [];
        duplicateMethods.clear();
        
        // 检测重复类
        const classCheckResult = checkDuplicateClasses(editor);

        // 查找所有方法
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 跳过注释行和空行
            if (line.trim().startsWith('#') || line.trim() === '') {
                continue;
            }
            
            for (const patternInfo of methodPatterns) {
                // 语言特定过滤：只匹配对应语言的文件
                if (document.fileName.endsWith('.py') && patternInfo.lang !== 'python') {
                    continue;
                }
                if (document.fileName.endsWith('.php') && patternInfo.lang !== 'php') {
                    continue;
                }
                if (document.fileName.endsWith('.js') && patternInfo.lang !== 'javascript') {
                    continue;
                }
                if (document.fileName.endsWith('.ts') && patternInfo.lang !== 'javascript') {
                    continue;
                }
                if (document.fileName.endsWith('.java') && patternInfo.lang !== 'java') {
                    continue;
                }
                if (document.fileName.endsWith('.cpp') && patternInfo.lang !== 'cpp') {
                    continue;
                }
                if (document.fileName.endsWith('.c') && patternInfo.lang !== 'cpp') {
                    continue;
                }
                if (document.fileName.endsWith('.cs') && patternInfo.lang !== 'csharp') {
                    continue;
                }
                if (document.fileName.endsWith('.rb') && patternInfo.lang !== 'ruby') {
                    continue;
                }
                if (document.fileName.endsWith('.go') && patternInfo.lang !== 'go') {
                    continue;
                }
                if (document.fileName.endsWith('.rs') && patternInfo.lang !== 'rust') {
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
                    
                    // PHP特定检查：确保是方法定义而不是函数调用
                    if (patternInfo.lang === 'php') {
                        // 必须包含function关键字
                        if (!line.includes('function')) {
                            continue;
                        }
                        // 排除return语句中的函数调用
                        if (line.trim().startsWith('return ')) {
                            continue;
                        }
                        // 排除变量赋值中的函数调用
                        if (line.includes('=') && !line.includes('function')) {
                            continue;
                        }
                    }
                    
                    // JavaScript特定检查：确保是方法定义而不是控制结构
                    if (patternInfo.lang === 'javascript') {
                        // 排除if语句
                        if (line.includes('if ')) {
                            continue;
                        }
                        // 排除while语句
                        if (line.includes('while ')) {
                            continue;
                        }
                        // 排除for语句
                        if (line.includes('for ')) {
                            continue;
                        }
                        // 排除switch语句
                        if (line.includes('switch ')) {
                            continue;
                        }
                        // 排除catch语句
                        if (line.includes('catch ')) {
                            continue;
                        }
                        // 排除函数调用（不是定义）
                        if (line.includes('.') && !line.includes('function') && !line.includes('=') && !line.includes('async')) {
                            // 如果包含点号且不包含function/=，可能是对象方法调用
                            // 但要排除像 "const obj = { method() {} }" 这样的情况
                            if (!line.includes('{') || (line.includes('{') && line.indexOf('.') < line.indexOf('{'))) {
                                continue;
                            }
                        }
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
                    
                    // 检测方法的作用域和上下文
                    const context = detectMethodContext(lines, i, methodName);
                    
                    methods.push({
                        name: methodName,
                        line: i,
                        start: methodStart,
                        end: methodEnd,
                        context: context,
                        fullName: context.getFullName ? context.getFullName(methodName) : methodName,
                        range: new vscode.Range(
                            new vscode.Position(i, methodStart),
                            new vscode.Position(i, methodEnd)
                        )
                    });
                    break; // 找到匹配后跳出内层循环
                }
            }
        }

        // 查找重复方法 - 使用完整限定名
        const methodCounts = new Map();
        methods.forEach(method => {
            const fullName = method.fullName || method.name;
            const count = methodCounts.get(fullName) || 0;
            methodCounts.set(fullName, count + 1);
        });
        
        console.log('检测到的方法:', methods.map(m => ({name: m.name, fullName: m.fullName, line: m.line})));
        console.log('方法计数:', Array.from(methodCounts.entries()));

        // 标记重复方法 - 使用完整限定名
        const duplicateRanges = [];
        const warningRanges = [];
        const markAllOccurrences = config.get('markAllOccurrences', true);
        
        if (markAllOccurrences) {
            // 标记所有重复的方法出现
            methods.forEach(method => {
                const fullName = method.fullName || method.name;
                if (methodCounts.get(fullName) > 1) {
                    duplicateRanges.push({
                        range: method.range,
                        hoverMessage: `Duplicate method: '${fullName}' (found ${methodCounts.get(fullName)} times)`
                    });
                    
                    // 添加到滚动条警告
                    warningRanges.push({
                        range: new vscode.Range(
                            new vscode.Position(method.line, 0),
                            new vscode.Position(method.line, 0)
                        )
                    });
                }
            });
        } else {
            // 只标记重复方法的后续出现（不标记第一次出现）
            methods.forEach(method => {
                const fullName = method.fullName || method.name;
                if (methodCounts.get(fullName) > 1) {
                    // 找到所有同名方法（使用完整限定名）
                    const methodOccurrences = methods.filter(m => 
                        (m.fullName || m.name) === fullName
                    );
                    // 找到当前方法在同名方法中的索引
                    const currentIndex = methodOccurrences.findIndex(m => 
                        m.line === method.line && m.start === method.start
                    );
                    
                    // 只标记不是第一次出现的重复方法
                    if (currentIndex > 0) {
                        duplicateRanges.push({
                            range: method.range,
                            hoverMessage: `Duplicate method: '${fullName}' (found ${methodCounts.get(fullName)} times)`
                        });
                        
                        // 添加到滚动条警告
                        warningRanges.push({
                            range: new vscode.Range(
                                new vscode.Position(method.line, 0),
                                new vscode.Position(method.line, 0)
                            )
                        });
                    }
                }
            });
        }

        console.log('重复范围数量:', duplicateRanges.length);
        console.log('警告范围数量:', warningRanges.length);
        console.log('重复类数量:', classCheckResult.duplicateClassesList.length);

        // 应用装饰器
        if (config.get('enableWavyLine', true)) {
            // 创建类重复的波浪线装饰
            const classDuplicateRanges = classCheckResult.duplicateClassesList.length > 0 ? 
                classCheckResult.duplicateClassesList.map(cls => ({
                    range: cls.range,
                    hoverMessage: `Duplicate class: '${cls.name}' (found ${classCheckResult.classCounts.get(cls.name)} times)`
                })) : [];
            
            // 合并方法和类的波浪线装饰
            const allDuplicateRanges = [...duplicateRanges, ...classDuplicateRanges];
            editor.setDecorations(decorationTypes.wavyLine, allDuplicateRanges);
        }
        
        if (warningRanges.length > 0) {
            editor.setDecorations(decorationTypes.warning, warningRanges);
        }
        
        // 应用类重复警告装饰器（行号装饰）
        if (classCheckResult.duplicateClassesList.length > 0) {
            const classWarningRanges = classCheckResult.duplicateClassesList.map(cls => ({
                range: new vscode.Range(
                    new vscode.Position(cls.line, 0),
                    new vscode.Position(cls.line, 0)
                )
            }));
            editor.setDecorations(decorationTypes.classWarning, classWarningRanges);
        }

        // 显示弹窗提示
        if (config.get('enablePopup', true)) {
            // 计算重复的方法名数量（使用完整限定名）
            const duplicateMethodNames = new Set();
            methods.forEach(method => {
                const fullName = method.fullName || method.name;
                if (methodCounts.get(fullName) > 1) {
                    duplicateMethodNames.add(fullName);
                }
            });
            
            // 计算重复的类名数量
            const duplicateClassNames = new Set();
            classCheckResult.duplicateClassesList.forEach(cls => {
                if (classCheckResult.classCounts.get(cls.name) > 1) {
                    duplicateClassNames.add(cls.name);
                }
            });
            
            const duplicateMethodCount = duplicateMethodNames.size;
            const duplicateClassCount = duplicateClassNames.size;
            const totalDuplicates = duplicateMethodCount + duplicateClassCount;
            
            console.log(`重复方法名数量: ${duplicateMethodCount}`);
            console.log(`重复类名数量: ${duplicateClassCount}`);
            console.log(`总重复数量: ${totalDuplicates}`);
            console.log(`弹窗启用状态: ${config.get('enablePopup', true)}`);
            console.log(`重复范围长度: ${duplicateRanges.length}`);
            
            if (totalDuplicates > 0) {
                let message = '';
                if (duplicateMethodCount > 0 && duplicateClassCount > 0) {
                    message = `发现 ${duplicateMethodCount} 个重复方法名和 ${duplicateClassCount} 个重复类名 | Found ${duplicateMethodCount} duplicate method names and ${duplicateClassCount} duplicate class names`;
                } else if (duplicateMethodCount > 0) {
                    message = `发现 ${duplicateMethodCount} 个重复的方法名 | Found ${duplicateMethodCount} duplicate method names`;
                } else if (duplicateClassCount > 0) {
                    message = `发现 ${duplicateClassCount} 个重复的类名 | Found ${duplicateClassCount} duplicate class names`;
                }
                
                console.log(`准备显示弹窗: ${message}`);
                vscode.window.showWarningMessage(
                    message,
                    '查看详情 | View Details'
                ).then(selection => {
                    console.log('用户选择:', selection);
                    if (selection === '查看详情 | View Details') {
                        showDuplicateDetails(editor, methods, methodCounts, duplicateRanges, classCheckResult);
                    }
                });
            } else {
                console.log('没有发现重复方法或类，不显示弹窗');
            }
        } else {
            console.log('弹窗功能已禁用');
        }
    }

    // 显示重复方法详情
    function showDuplicateDetails(editor, methods, methodCounts, duplicateRanges, classCheckResult) {
        // 按方法名分组重复项
        const duplicateGroups = new Map();
        
        // 获取当前文件路径
        const currentFilePath = editor.document.uri.fsPath;
        
        methods.forEach(method => {
            const fullName = method.fullName || method.name;
            if (methodCounts.get(fullName) > 1) {
                if (!duplicateGroups.has(fullName)) {
                    duplicateGroups.set(fullName, []);
                }
                duplicateGroups.get(fullName).push(method);
            }
        });

        // 创建详情面板内容
        const panel = vscode.window.createWebviewPanel(
            'duplicateMethodDetails',
            '重复方法和类详情 | Duplicate Methods and Classes Details',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // 生成 HTML 内容
        let html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>重复方法详情</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .method-group {
                    margin-bottom: 30px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                }
                .class-group {
                    margin-bottom: 30px;
                    border: 1px solid #ff6600;
                    border-radius: 6px;
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                }
                .method-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: var(--vscode-errorForeground);
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid var(--vscode-panel-border);
                }
                .class-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: #ff6600;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #ff6600;
                }
                .duplicate-item {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    margin: 5px 0;
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .duplicate-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .duplicate-index {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-right: 15px;
                    min-width: 30px;
                    text-align: center;
                }
                .duplicate-info {
                    flex: 1;
                    font-family: 'Consolas', 'Courier New', monospace;
                    font-size: 14px;
                }
                .delete-btn {
                    background-color: var(--vscode-errorForeground);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-left: 10px;
                    transition: background-color 0.2s;
                }
                .delete-btn:hover {
                    background-color: var(--vscode-button-background);
                }
                .refresh-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 20px;
                    font-size: 14px;
                }
                .refresh-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--vscode-foreground);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">重复方法和类详情</div>
                <button class="refresh-btn" onclick="refreshDetails()">刷新 Refresh</button>
            </div>
        `;

        let duplicateIndex = 1;
        
        // 显示重复的类
        if (classCheckResult && classCheckResult.duplicateClassesList.length > 0) {
            const classGroups = new Map();
            classCheckResult.duplicateClassesList.forEach(cls => {
                if (!classGroups.has(cls.name)) {
                    classGroups.set(cls.name, []);
                }
                classGroups.get(cls.name).push(cls);
            });
            
            classGroups.forEach((classDuplicates, className) => {
                html += `
                <div class="class-group">
                    <div class="class-name">🏛️ Class: ${className}</div>
                `;
                
                classDuplicates.forEach(cls => {
                    const startLine = cls.line + 1;
                    
                    html += `
                    <div class="duplicate-item" onclick="jumpToLine(${cls.line}, ${cls.start}, ${cls.end}, '${currentFilePath}')">
                        <div class="duplicate-index">${duplicateIndex}</div>
                        <div class="duplicate-info">duplicate class ${duplicateIndex} - line(${startLine})</div>
                    </div>
                    `;
                    duplicateIndex++;
                });
                
                html += '</div>';
            });
        }
        
        // 显示重复的方法
        duplicateGroups.forEach((duplicateMethods, methodName) => {
            html += `
            <div class="method-group">
                <div class="method-name">🔧 Method: ${methodName}</div>
            `;
            
            duplicateMethods.forEach(method => {
                const startLine = method.line + 1; // VSCode 行号从 0 开始，显示从 1 开始
                
                // 计算方法的结束行和行数
                let endLine = startLine;
                const document = editor.document;
                const totalLines = document.lineCount;
                
                // 从方法定义行开始，查找方法的结束位置
                for (let i = method.line; i < totalLines; i++) {
                    const line = document.lineAt(i).text;
                    
                    // 如果遇到空行或注释，继续查找
                    if (line.trim() === '' || line.trim().startsWith('#') || line.trim().startsWith('//')) {
                        continue;
                    }
                    
                    // 检查是否遇到下一个方法定义或类定义（缩进级别相同或更小）
                    const currentIndent = line.match(/^(\s*)/);
                    const currentIndentLevel = currentIndent ? currentIndent[1].length : 0;
                    const methodIndent = document.lineAt(method.line).text.match(/^(\s*)/);
                    const methodIndentLevel = methodIndent ? methodIndent[1].length : 0;
                    
                    // 如果遇到同级别或更高级别的定义（且不是当前方法的继续），则当前方法结束
                    if (i > method.line && currentIndentLevel <= methodIndentLevel) {
                        // 检查是否是新的方法、类、函数等定义
                        const isNextDefinition = methodPatterns.some(pattern => {
                            if (document.fileName.endsWith('.py') && pattern.lang !== 'python') return false;
                            if (document.fileName.endsWith('.php') && pattern.lang !== 'php') return false;
                            if (document.fileName.endsWith('.js') && pattern.lang !== 'javascript') return false;
                            if (document.fileName.endsWith('.ts') && pattern.lang !== 'javascript') return false;
                            if (document.fileName.endsWith('.java') && pattern.lang !== 'java') return false;
                            if (document.fileName.endsWith('.cpp') && pattern.lang !== 'cpp') return false;
                            if (document.fileName.endsWith('.c') && pattern.lang !== 'cpp') return false;
                            if (document.fileName.endsWith('.cs') && pattern.lang !== 'csharp') return false;
                            if (document.fileName.endsWith('.rb') && pattern.lang !== 'ruby') return false;
                            if (document.fileName.endsWith('.go') && pattern.lang !== 'go') return false;
                            if (document.fileName.endsWith('.rs') && pattern.lang !== 'rust') return false;
                            
                            return line.match(pattern.pattern);
                        });
                        
                        if (isNextDefinition) {
                            break; // 找到下一个定义，当前方法结束
                        }
                    }
                    
                    endLine = i + 1; // 更新结束行（+1因为显示行号从1开始）
                }
                
                const lineCount = endLine - startLine + 1;
                
                html += `
                <div class="duplicate-item" onclick="jumpToLine(${method.line}, ${method.start}, ${method.end}, '${currentFilePath}')">
                    <div class="duplicate-index">${duplicateIndex}</div>
                    <div class="duplicate-info">duplicate method ${duplicateIndex} - line(${startLine}-${endLine}) - ${lineCount} lines</div>
                    <button class="delete-btn" onclick="deleteDuplicate(event, ${method.line}, ${method.start}, ${method.end})">×</button>
                </div>
                `;
                duplicateIndex++;
            });
            
            html += '</div>';
        });

        html += `
            <script>
                const vscode = acquireVsCodeApi();
                
                function jumpToLine(line, start, end, filePath) {
                    vscode.postMessage({
                        command: 'jumpToLine',
                        line: line,
                        start: start,
                        end: end,
                        filePath: filePath
                    });
                }
                
                function deleteDuplicate(event, line, start, end) {
                    event.stopPropagation();
                    vscode.postMessage({
                        command: 'deleteDuplicate',
                        line: line,
                        start: start,
                        end: end
                    });
                }
                
                function refreshDetails() {
                    vscode.postMessage({
                        command: 'refresh'
                    });
                }
            </script>
        </body>
        </html>`;

        panel.webview.html = html;

        // 处理来自 webview 的消息
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'jumpToLine':
                        // 打开并聚焦到目标文件
                        vscode.workspace.openTextDocument(message.filePath)
                            .then(doc => {
                                return vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
                            })
                            .then(targetEditor => {
                                const jumpRange = new vscode.Range(
                                    new vscode.Position(message.line, message.start),
                                    new vscode.Position(message.line, message.end)
                                );
                                targetEditor.selection = new vscode.Selection(
                                    jumpRange.start,
                                    jumpRange.start
                                );
                                targetEditor.revealRange(jumpRange, vscode.TextEditorRevealType.InCenter);
                            })
                            .catch(err => {
                                vscode.window.showErrorMessage(`无法打开文件: ${message.filePath}\nCannot open file: ${message.filePath}`);
                            });
                        break;
                    
                    case 'deleteDuplicate':
                        // 查找方法的完整范围
                        const methodBounds = findMethodBounds(editor, message.line);
                        const document = editor.document;
                        const endLineLength = document.lineAt(methodBounds.end).text.length;
                        
                        // 显示确认对话框
                        vscode.window.showWarningMessage(
                            `确定要删除整个方法吗？这将删除从第 ${methodBounds.start + 1} 行到第 ${methodBounds.end + 1} 行的内容。\n\nAre you sure you want to delete the entire method? This will delete content from line ${methodBounds.start + 1} to line ${methodBounds.end + 1}.`,
                            '确定删除 | Delete',
                            '取消 | Cancel'
                        ).then(selection => {
                            if (selection === '确定删除 | Delete') {
                                const deleteRange = new vscode.Range(
                                    new vscode.Position(methodBounds.start, 0),
                                    new vscode.Position(methodBounds.end, endLineLength)
                                );
                                
                                // 删除整个方法
                                editor.edit(editBuilder => {
                                    editBuilder.delete(deleteRange);
                                }).then(success => {
                                    if (success) {
                                        vscode.window.showInformationMessage(`已删除整个方法 (第 ${methodBounds.start + 1}-${methodBounds.end + 1} 行) | Deleted entire method (lines ${methodBounds.start + 1}-${methodBounds.end + 1})`);
                                        // 重新检查重复方法
                                        setTimeout(() => {
                                            checkDuplicateMethods(editor);
                                            // 刷新详情面板
                                            panel.webview.postMessage({ command: 'refresh' });
                                        }, 100);
                                    }
                                });
                            }
                        });
                        break;
                    
                    case 'refresh':
                        // 重新检查并刷新详情
                        checkDuplicateMethods(editor);
                        break;
                }
            },
            undefined
        );
    }

    // 查找方法的完整范围
    function findMethodBounds(editor, methodLine) {
        const document = editor.document;
        const lines = document.getText().split('\n');
        
        // startLine 应该就是方法名所在行，不需要向上查找
        let startLine = methodLine;
        let endLine = methodLine;
        
        // 向下查找方法结束（找到下一个方法定义或空行）
        while (endLine < lines.length - 1) {
            endLine++;
            const line = lines[endLine].trim();
            
            // 检查是否遇到下一个方法定义
            const isNextMethod = methodPatterns.some(pattern => {
                if (document.fileName.endsWith('.py') && pattern.lang !== 'python') {
                    return false;
                }
                return line.match(pattern.pattern);
            });
            
            // 如果遇到空行、注释或下一个方法定义，结束查找
            if (line === '' || line.startsWith('#') || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || isNextMethod) {
                endLine--;
                break;
            }
        }
        
        return {
            start: startLine,
            end: endLine
        };
    }

    // 清理装饰器
    function clearDecorations(editor) {
        if (editor && decorationTypes.wavyLine && decorationTypes.warning && decorationTypes.classWarning) {
            editor.setDecorations(decorationTypes.wavyLine, []);
            editor.setDecorations(decorationTypes.warning, []);
            editor.setDecorations(decorationTypes.classWarning, []);
        }
    }

    // 更新装饰器类型
    updateDecorationTypes();

    // 注册事件监听器
    const activeEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            checkDuplicateMethods(editor);
        }
    });

    const documentChange = vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
            checkDuplicateMethods(editor);
        }
    });

    const configChange = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('adminMethodDuplicateCheck')) {
            updateDecorationTypes();
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                checkDuplicateMethods(editor);
            }
        }
    });

    // 初始检查
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        checkDuplicateMethods(activeEditor);
    }

    // 注册可释放资源
    context.subscriptions.push(
        activeEditorChange,
        documentChange,
        configChange,
        decorationTypes.wavyLine,
        decorationTypes.warning,
        decorationTypes.classWarning
    );
}

function deactivate() {
    // 清理资源
}

module.exports = {
    activate,
    deactivate
};