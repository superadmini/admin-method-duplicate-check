// Test file for class duplicate detection and method line count

// Duplicate class - Class 1
class TestClass {
    constructor() {
        this.value = 0;
    }
    
    // Method with 5 lines
    method1() {
        console.log("Method 1");
        console.log("Line 2");
        console.log("Line 3");
        console.log("Line 4");
        console.log("Line 5");
    }
    
    // Method with 3 lines
    method2() {
        console.log("Method 2");
        console.log("Line 2");
        console.log("Line 3");
    }
    
    // Duplicate method - 1st occurrence
    duplicateMethod() {
        console.log("Duplicate method 1");
        return true;
    }
}

// Duplicate class - Class 2
class TestClass {
    constructor() {
        this.value = 1;
    }
    
    // Duplicate method - 2nd occurrence  
    duplicateMethod() {
        console.log("Duplicate method 2");
        return false;
    }
}

// Another class
class AnotherClass {
    // Duplicate method - 3rd occurrence
    duplicateMethod() {
        console.log("Duplicate method 3");
        return null;
    }
    
    // Method with 8 lines
    longMethod() {
        console.log("Long method");
        console.log("Line 2");
        console.log("Line 3");
        console.log("Line 4");
        console.log("Line 5");
        console.log("Line 6");
        console.log("Line 7");
        console.log("Line 8");
    }
}