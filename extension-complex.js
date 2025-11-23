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
        warning: null
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

        // 应用装饰器
        if (config.get('enableWavyLine', true)) {
            editor.setDecorations(decorationTypes.wavyLine, duplicateRanges);
        }
        
        if (warningRanges.length > 0) {
            editor.setDecorations(decorationTypes.warning, warningRanges);
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
            
            const duplicateCount = duplicateMethodNames.size;
            if (duplicateCount > 0) {
                console.log(`发现 ${duplicateCount} 个重复的方法名，准备显示弹窗`);
                vscode.window.showWarningMessage(
                    `发现 ${duplicateCount} 个重复的方法名 | Found ${duplicateCount} duplicate method names`,
                    '查看详情 | View Details'
                ).then(selection => {
                    if (selection === '查看详情 | View Details') {
                        // 跳转到第一个重复方法
                        if (duplicateRanges.length > 0) {
                            const firstDuplicate = duplicateRanges[0];
                            editor.selection = new vscode.Selection(
                                firstDuplicate.range.start,
                                firstDuplicate.range.start
                            );
                            editor.revealRange(firstDuplicate.range);
                        }
                    }
                });
            }
        }
    }

    // 清理装饰器
    function clearDecorations(editor) {
        if (editor && decorationTypes.wavyLine && decorationTypes.warning) {
            editor.setDecorations(decorationTypes.wavyLine, []);
            editor.setDecorations(decorationTypes.warning, []);
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
        decorationTypes.warning
    );
}

function deactivate() {
    // 清理资源
}

module.exports = {
    activate,
    deactivate
};