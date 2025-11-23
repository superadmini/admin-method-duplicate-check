// 测试波浪线标记模式

const methods = [
    { name: 'method1', line: 4 },
    { name: 'method2', line: 8 },
    { name: 'method1', line: 12 },  // method1重复
    { name: 'another_method', line: 21 },
    { name: 'method2', line: 25 },  // method2重复
    { name: 'normal_function', line: 30 },
    { name: 'normal_function', line: 34 }  // normal_function重复
];

const methodCounts = new Map();
methods.forEach(method => {
    const count = methodCounts.get(method.name) || 0;
    methodCounts.set(method.name, count + 1);
});

console.log('=== 波浪线标记模式测试 ===\n');

// 模式1：标记所有重复出现（默认）
console.log('模式1: markAllOccurrences = true (标记所有重复出现)');
const duplicateRanges1 = [];
methods.forEach(method => {
    if (methodCounts.get(method.name) > 1) {
        duplicateRanges1.push({
            name: method.name,
            line: method.line
        });
    }
});

console.log(`波浪线数量: ${duplicateRanges1.length}`);
duplicateRanges1.forEach(range => {
    console.log(`  行 ${range.line}: ${range.name}`);
});

// 模式2：只标记每个重复方法名的第一次出现
console.log('\n模式2: markAllOccurrences = false (只标记第一次出现)');
const duplicateRanges2 = [];
const markedMethodNames = new Set();
methods.forEach(method => {
    if (methodCounts.get(method.name) > 1 && !markedMethodNames.has(method.name)) {
        duplicateRanges2.push({
            name: method.name,
            line: method.line
        });
        markedMethodNames.add(method.name);
    }
});

console.log(`波浪线数量: ${duplicateRanges2.length}`);
duplicateRanges2.forEach(range => {
    console.log(`  行 ${range.line}: ${range.name}`);
});

console.log('\n📊 对比结果:');
console.log(`模式1 (标记所有): ${duplicateRanges1.length} 个波浪线`);
console.log(`模式2 (标记第一次): ${duplicateRanges2.length} 个波浪线`);

console.log('\n⚙️  如何配置:');
console.log('在VSCode设置中搜索 "adminMethodDuplicateCheck.markAllOccurrences"');
console.log('- true: 显示所有重复出现 (6个波浪线)');
console.log('- false: 只显示每个重复方法的第一次出现 (3个波浪线)');

console.log('\n🎯 根据你的需求:');
console.log('如果你想要3个波浪线，请将 markAllOccurrences 设置为 false');