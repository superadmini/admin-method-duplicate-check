// Test script to simulate the extension's method detection logic

// Simulate the method patterns from extension.js
const methodPatterns = [
    // Python: def method_name( - 更严格的匹配，避免误识别
    { 
        pattern: /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, 
        lang: 'python',
        validate: (line, match) => {
            // 确保这行不是注释且确实包含def
            return line.includes('def') && !line.trim().startsWith('#');
        }
    }
];

// Test the debug_test.py content
const testContent = `# Test file for method duplicate detection

class TestClass:
    def method1(self):
        """First method - should be normal"""
        pass
    
    def method2(self):
        """Second method - should be normal"""
        pass
    
    def method1(self):
        """Duplicate method - should be highlighted"""
        pass

# These should NOT be detected as methods
print(f"SSL import error: {e}")
print(f"Another message: {test}")
format_string = f"Format with {variable}"

def another_method(self):
    """Another method - should be normal"""
    pass

def method2(self):
    """Another duplicate - should be highlighted"""
    pass

# More edge cases
def normal_function():
    """Normal function"""
    pass

def normal_function():
    """Duplicate function - should be highlighted"""
    pass

# JavaScript-like patterns that should NOT match in Python
print(f"Hello {name}")
result = some_function(args)
if condition:
    pass`;

const lines = testContent.split('\n');
const methods = [];

console.log('Testing method detection on debug_test.py:\n');

// Find all methods
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip comment lines and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
    }
    
    for (const patternInfo of methodPatterns) {
        // Only use Python patterns for Python files
        if (patternInfo.lang !== 'python') {
            continue;
        }
        
        const match = line.match(patternInfo.pattern);
        if (match) {
            const methodName = match[patternInfo.groupIndex || 1];
            
            // Use validation function
            if (patternInfo.validate && !patternInfo.validate(line, match)) {
                continue;
            }
            
            // Additional check: ensure not f-string content
            if (line.includes('f"') || line.includes("f'")) {
                // If f-string line, skip non-def matches
                if (patternInfo.lang === 'python' && !line.includes('def ')) {
                    continue;
                }
            }
            
            // Additional check: ensure not print statements
            if (line.includes('print(') || line.includes('console.log(') || line.includes('alert(')) {
                continue;
            }
            
            methods.push({
                name: methodName,
                line: i + 1,
                text: line.trim()
            });
            break; // Found match, break inner loop
        }
    }
}

console.log('Detected methods:');
methods.forEach(method => {
    console.log(`  Line ${method.line}: ${method.name} - "${method.text}"`);
});

// Find duplicates
const methodCounts = new Map();
methods.forEach(method => {
    const count = methodCounts.get(method.name) || 0;
    methodCounts.set(method.name, count + 1);
});

console.log('\nDuplicate analysis:');
methodCounts.forEach((count, name) => {
    if (count > 1) {
        console.log(`  ${name}: appears ${count} times (DUPLICATE)`);
    } else {
        console.log(`  ${name}: appears ${count} time (normal)`);
    }
});

console.log('\nExpected behavior:');
console.log('  method1: should be duplicate (appears 2 times)');
console.log('  method2: should be duplicate (appears 2 times)');
console.log('  another_method: should be normal (appears 1 time)');
console.log('  normal_function: should be duplicate (appears 2 times)');
console.log('  print statements and f-strings: should NOT be detected as methods');