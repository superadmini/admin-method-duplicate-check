# Test file for method duplicate detection

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
def normal_function2():
    """Normal function"""
    pass

def normal_function():
    """Duplicate function - should be highlighted"""
    pass

def normal_function():
    """Duplicate function - should be highlighted"""
    pass


# JavaScript-like patterns that should NOT match in Python
print(f"Hello {name}")
result = some_function(args)
if condition:
    pass