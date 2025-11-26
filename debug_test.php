<?php

class TestClass {
    // First method - should be normal
    public function method1() {
        echo "This is method1";
        return true;
    }

    // Second method - should be normal
    private function method2() {
        echo "This is method2";
        return false;
    }

    // Duplicate of method1 - should be marked
    public function method1() {
        echo "This is duplicate method1";
        return "duplicate";
    }

    // Third method - should be normal
    protected function method3($param1, $param2) {
        return $param1 + $param2;
    }

    // Duplicate of method2 - should be marked
    private function method2() {
        echo "This is another duplicate method2";
        return null;
    }
}

// Functions outside class - module level
function global_function1() {
    echo "Global function 1";
}

function global_function2() {
    echo "Global function 2";
}

// Duplicate global function - should be marked
function global_function1() {
    echo "Duplicate global function 1";
}

class AnotherClass {
    // Static method - should be normal
    public static function staticMethod() {
        return "static";
    }

    // Another method - should be normal
    public function anotherMethod() {
        return "another";
    }

    // Duplicate static method - should be marked
    public static function staticMethod() {
        return "duplicate static";
    }
}

// Test different PHP method variations
class VariationsClass {
    // Method with type hints
    public function typedMethod(string $param): int {
        return strlen($param);
    }

    // Method with default parameters
    public function defaultMethod($param = "default") {
        return $param;
    }

    // Duplicate of typedMethod - should be marked
    public function typedMethod(string $param): int {
        return strlen($param) * 2;
    }

    // Method with visibility modifiers
    private function privateMethod() {
        return "private";
    }

    // Another private method - should be normal
    private function anotherPrivateMethod() {
        return "another private";
    }

    // Duplicate of privateMethod - should be marked
    private function privateMethod() {
        return "duplicate private";
    }
}

// Test function with different parameter patterns
function function_with_underscores() {
    echo "Function with underscores";
}

function function_with_underscores() {
    echo "Duplicate function with underscores";
}

// Test camelCase functions
function camelCaseFunction() {
    echo "Camel case function";
}

function camelCaseFunction() {
    echo "Duplicate camel case function";
}

// Test with different visibility in same class
class VisibilityTest {
    public function sameNameMethod() {
        return "public";
    }

    // This should be marked as duplicate even with different visibility
    private function sameNameMethod() {
        return "private";
    }

    // This should also be marked
    protected function sameNameMethod() {
        return "protected";
    }
}

class VisibilityTest {
    public function sameNameMethod() {
        return "public";
    }

    // This should be marked as duplicate even with different visibility
    private function sameNameMethod() {
        return "private";
    }

    // This should also be marked
    protected function sameNameMethod() {
        return "protected";
    }
}

?>