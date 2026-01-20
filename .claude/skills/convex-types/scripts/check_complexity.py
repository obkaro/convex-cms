#!/usr/bin/env python3
"""
Type Complexity Checker for TS2589 Prevention

Analyzes TypeScript files for type complexity issues with improved accuracy.
Measures type depth, nesting, and complexity metrics.
"""

import re
import sys
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass, field


@dataclass
class ComplexityMetric:
    """Metrics for a single file or function"""
    name: str
    line: int
    max_type_depth: int
    union_count: int
    intersection_count: int
    generic_count: int
    conditional_count: int
    score: float
    recommendations: List[str] = field(default_factory=list)
    

class ComplexityChecker:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        self.content = self.file_path.read_text(encoding='utf-8')
        self.lines = self.content.split('\n')
        self.metrics: List[ComplexityMetric] = []
    
    def analyze(self) -> List[ComplexityMetric]:
        """Analyze the file and return complexity metrics"""
        try:
            self.analyze_functions()
            self.analyze_types()
        except Exception as e:
            print(f"Warning: Analysis encountered an error: {e}", file=sys.stderr)
        
        return self.metrics
    
    def analyze_functions(self):
        """Analyze Convex function signatures"""
        function_pattern = re.compile(
            r'export\s+const\s+(\w+)\s*=\s*(query|mutation|action)\s*\('
        )
        
        for i, line in enumerate(self.lines, 1):
            match = function_pattern.search(line)
            if match:
                func_name = match.group(1)
                func_type = match.group(2)
                # Analyze the function signature
                signature = self.extract_function_signature(i)
                complexity = self.calculate_complexity(signature, i)
                complexity.name = f"{func_name} ({func_type})"
                
                # Add specific recommendations
                self.add_recommendations(complexity, signature)
                
                self.metrics.append(complexity)
    
    def analyze_types(self):
        """Analyze type definitions"""
        type_pattern = re.compile(r'(type|interface)\s+(\w+)\s*[=<]')
        
        for i, line in enumerate(self.lines, 1):
            match = type_pattern.search(line)
            if match:
                type_keyword = match.group(1)
                type_name = match.group(2)
                # Analyze the type definition
                type_def = self.extract_type_definition(i)
                complexity = self.calculate_complexity(type_def, i)
                complexity.name = f"{type_name} ({type_keyword})"
                
                # Add specific recommendations
                self.add_recommendations(complexity, type_def)
                
                self.metrics.append(complexity)
    
    def extract_function_signature(self, start_line: int) -> str:
        """Extract a complete function signature"""
        signature = []
        depth = 0
        max_lines = 50  # Prevent runaway
        
        for i in range(start_line - 1, min(start_line + max_lines, len(self.lines))):
            line = self.lines[i]
            signature.append(line)
            
            depth += line.count('(') + line.count('{')
            depth -= line.count(')') + line.count('}')
            
            if depth <= 0 and ('})' in line or ');' in line):
                break
        
        return '\n'.join(signature)
    
    def extract_type_definition(self, start_line: int) -> str:
        """Extract a complete type definition"""
        definition = []
        depth = 0
        max_lines = 30  # Prevent runaway
        
        for i in range(start_line - 1, min(start_line + max_lines, len(self.lines))):
            line = self.lines[i]
            definition.append(line)
            
            depth += line.count('{') + line.count('<') + line.count('(')
            depth -= line.count('}') + line.count('>') + line.count(')')
            
            # End conditions
            if depth <= 0:
                if ';' in line or ('}' in line and i > start_line - 1):
                    break
        
        return '\n'.join(definition)
    
    def calculate_complexity(self, code: str, line: int) -> ComplexityMetric:
        """Calculate complexity metrics for a code snippet"""
        # Count type depth (nested braces and angle brackets)
        max_depth = self.calculate_type_depth(code)
        
        # Count union types (exclude comparison operators)
        union_count = len([m for m in re.finditer(r'\s\|\s', code) if '||' not in code[max(0, m.start()-1):m.end()+1]])
        
        # Count intersection types
        intersection_count = len([m for m in re.finditer(r'\s&\s', code) if '&&' not in code[max(0, m.start()-1):m.end()+1]])
        
        # Count generic parameters (exclude comparison operators)
        generic_count = len([m for m in re.finditer(r'<(?!=)', code)])
        
        # Count conditional types
        conditional_count = len(re.findall(r'extends\s+\w+.*\?.*:', code))
        
        # Calculate overall complexity score (weighted)
        score = (
            max_depth * 3.0 +           # Depth is most impactful
            union_count * 2.5 +          # Unions are expensive
            intersection_count * 1.5 +   # Intersections less so
            generic_count * 2.0 +        # Generics add complexity
            conditional_count * 5.0      # Conditionals are very expensive
        )
        
        return ComplexityMetric(
            name="",
            line=line,
            max_type_depth=max_depth,
            union_count=union_count,
            intersection_count=intersection_count,
            generic_count=generic_count,
            conditional_count=conditional_count,
            score=score
        )
    
    def calculate_type_depth(self, code: str) -> int:
        """Calculate maximum nesting depth"""
        max_depth = 0
        current_depth = 0
        
        # Remove string literals to avoid counting brackets in strings
        code_cleaned = re.sub(r'"[^"]*"', '""', code)
        code_cleaned = re.sub(r"'[^']*'", "''", code_cleaned)
        
        for char in code_cleaned:
            if char in '{<[(':
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            elif char in '}>[)':
                current_depth = max(0, current_depth - 1)
        
        return max_depth
    
    def add_recommendations(self, metric: ComplexityMetric, code: str):
        """Add specific recommendations based on metrics"""
        if metric.max_type_depth > 5:
            metric.recommendations.append("Type depth >5: Flatten nested structures")
        if metric.union_count > 5:
            metric.recommendations.append("Union count >5: Split or categorize unions")
        if metric.conditional_count > 0:
            metric.recommendations.append("Has conditional types: Replace with explicit types")
        if metric.generic_count > 3:
            metric.recommendations.append("Many generics: Simplify generic constraints")
        
        # Check for missing return type in functions
        if 'handler:' in code and 'Promise<' not in code and '=>' in code:
            if not re.search(r':\s*Promise<', code):
                metric.recommendations.append("Missing explicit return type: Add Promise<Type>")
    
    def generate_report(self) -> str:
        """Generate a complexity report"""
        if not self.metrics:
            return f"\n✅ No complex types found in {self.file_path.name}\n"
        
        # Sort by complexity score
        sorted_metrics = sorted(self.metrics, key=lambda m: m.score, reverse=True)
        
        report = [f"\n📊 Type Complexity Report: {self.file_path.name}"]
        report.append("=" * 75)
        
        # Summary statistics
        total_items = len(self.metrics)
        avg_score = sum(m.score for m in self.metrics) / total_items if total_items > 0 else 0
        max_score = max((m.score for m in self.metrics), default=0)
        critical_items = [m for m in self.metrics if m.score > 30]
        high_items = [m for m in self.metrics if 20 < m.score <= 30]
        
        report.append(f"\n📈 Summary:")
        report.append(f"  Total definitions analyzed: {total_items}")
        report.append(f"  Average complexity score: {avg_score:.1f}")
        report.append(f"  Maximum complexity score: {max_score:.1f}")
        report.append(f"  Critical complexity (>30): {len(critical_items)}")
        report.append(f"  High complexity (20-30): {len(high_items)}")
        
        # Critical complexity items
        if critical_items:
            report.append(f"\n🔴 CRITICAL Complexity (Score >30) - {len(critical_items)} item(s):")
            report.append("-" * 75)
            
            for metric in critical_items[:5]:  # Show top 5 critical
                report.append(f"\n{metric.name} (line {metric.line})")
                report.append(f"  Score: {metric.score:.1f}")
                report.append(f"  Metrics: depth={metric.max_type_depth}, unions={metric.union_count}, " +
                            f"intersections={metric.intersection_count}, " +
                            f"generics={metric.generic_count}, conditionals={metric.conditional_count}")
                if metric.recommendations:
                    report.append(f"  Recommendations:")
                    for rec in metric.recommendations:
                        report.append(f"    • {rec}")
        
        # High complexity items
        if high_items and not critical_items:  # Only show if no critical
            report.append(f"\n🟡 HIGH Complexity (Score 20-30) - {len(high_items)} item(s):")
            report.append("-" * 75)
            
            for metric in high_items[:5]:  # Show top 5 high
                report.append(f"\n{metric.name} (line {metric.line}) - Score: {metric.score:.1f}")
                if metric.recommendations:
                    for rec in metric.recommendations:
                        report.append(f"  • {rec}")
        
        # Overall recommendations
        report.append("\n" + "=" * 75)
        report.append("\n💡 Overall Assessment:")
        
        if len(critical_items) > 0:
            report.append("  🔴 CRITICAL: Immediate refactoring required")
            report.append("     Action: Focus on items with score >30")
        elif len(high_items) > 0:
            report.append("  🟡 WARNING: Consider refactoring high-complexity items")
            report.append("     Action: Review items with score 20-30")
        else:
            report.append("  🟢 GOOD: All types within acceptable complexity")
            report.append("     Action: Maintain current practices")
        
        report.append("\n📚 Next Steps:")
        report.append("  1. Read references/refactoring-guide.md for fix strategies")
        report.append("  2. Extract inline types to types.ts")
        report.append("  3. Flatten deeply nested structures")
        report.append("  4. Simplify unions and conditionals")
        report.append("  5. Run audit_schema.py for schema-specific checks")
        report.append("")
        
        return "\n".join(report)


def main():
    if len(sys.argv) < 2:
        print("TS2589 Type Complexity Checker")
        print("\nUsage: check_complexity.py <path-to-typescript-file>")
        print("\nExample:")
        print("  python check_complexity.py convex/functions.ts")
        print("\nThis script analyzes TypeScript files for type complexity issues.")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        checker = ComplexityChecker(file_path)
        metrics = checker.analyze()
        report = checker.generate_report()
        print(report)
        
        # Exit with error code if critical complexity found
        critical_count = sum(1 for m in metrics if m.score > 30)
        if critical_count > 0:
            sys.exit(1)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Error: Unexpected error during analysis: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
