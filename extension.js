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
            }
        });
    }

    // 检测重复方法
    function checkDuplicateMethods(editor) {
        if (!editor) {
            return;
        }

        const document = editor.document;
        const config = vscode.workspace.getConfiguration('adminMethodDuplicateCheck');
        
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
            
            for (const patternInfo of methodPatterns) {
                const match = line.match(patternInfo.pattern);
                if (match) {
                    const methodName = match[patternInfo.groupIndex || 1];
                    
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
                        range: new vscode.Range(
                            new vscode.Position(i, methodStart),
                            new vscode.Position(i, methodEnd)
                        )
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
        const warningRanges = [];
        
        methods.forEach(method => {
            if (methodCounts.get(method.name) > 1) {
                duplicateRanges.push({
                    range: method.range,
                    hoverMessage: `Duplicate method name: '${method.name}' (found ${methodCounts.get(method.name)} times)`
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

        // 应用装饰器
        if (config.get('enableWavyLine', true)) {
            editor.setDecorations(decorationTypes.wavyLine, duplicateRanges);
        }
        
        if (warningRanges.length > 0) {
            editor.setDecorations(decorationTypes.warning, warningRanges);
        }

        // 显示弹窗提示
        if (config.get('enablePopup', true) && duplicateRanges.length > 0) {
            const duplicateCount = duplicateRanges.length;
            vscode.window.showWarningMessage(
                `发现 ${duplicateCount} 个重复的方法名 | Found ${duplicateCount} duplicate method names`,
                '查看详情 | View Details'
            ).then(selection => {
                if (selection === '查看详情 | View Details') {
                    // 可以添加跳转到第一个重复方法的逻辑
                }
            });
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