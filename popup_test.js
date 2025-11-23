// 测试弹窗统计逻辑

const methods = [
    { name: 'method1' },
    { name: 'method2' },
    { name: 'method1' },  // 重复
    { name: 'another_method' },
    { name: 'method2' },  // 重复
    { name: 'normal_function' },
    { name: 'normal_function' }  // 重复
];

// 模拟methodCounts
const methodCounts = new Map();
methods.forEach(method => {
    const count = methodCounts.get(method.name) || 0;
    methodCounts.set(method.name, count + 1);
});

console.log('=== 弹窗统计逻辑测试 ===\n');

// 旧的统计方式（错误）
const duplicateRanges = methods.filter(method => 
    methodCounts.get(method.name) > 1
);

console.log('旧的统计方式（显示重复出现次数）:');
console.log(`duplicateRanges.length: ${duplicateRanges.length}`);
console.log('重复的方法:', duplicateRanges.map(m => m.name));

// 新的统计方式（正确）
const duplicateMethodNames = new Set();
methods.forEach(method => {
    if (methodCounts.get(method.name) > 1) {
        duplicateMethodNames.add(method.name);
    }
});

console.log('\n新的统计方式（显示重复方法名数量）:');
console.log(`duplicateMethodNames.size: ${duplicateMethodNames.size}`);
console.log('重复的方法名:', Array.from(duplicateMethodNames));

console.log('\n📊 统计结果对比:');
console.log(`旧方式: ${duplicateRanges.length} 个重复（这是重复出现次数）`);
console.log(`新方式: ${duplicateMethodNames.size} 个重复（这是重复方法名数量）`);

console.log('\n✅ 修复后应该显示: "发现 3 个重复的方法名"');
console.log('而不是: "发现 6 个重复的方法名"');