#!/usr/bin/env python3
"""
Schema Auditor for TS2589 Prevention

Analyzes Convex schema files for patterns that could cause TS2589 errors.
Checks against the 12 core principles with improved accuracy.
"""

import re
import sys
from pathlib import Path
from typing import List
from dataclasses import dataclass


@dataclass
class Violation:
    """Represents a TS2589 principle violation"""
    principle: int
    severity: str  # "critical", "high", "medium", "low"
    message: str
    line: int
    code_snippet: str
    fix_suggestion: str = ""


class SchemaAuditor:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        self.content = self.file_path.read_text(encoding='utf-8')
        self.lines = self.content.split('\n')
        self.violations: List[Violation] = []
    
    def audit(self) -> List[Violation]:
        """Run all audit checks"""
        try:
            self.check_nesting_depth()
            self.check_union_complexity()
            self.check_field_count()
            self.check_conditional_types()
            self.check_recursive_types()
            self.check_mapped_types()
        except Exception as e:
            print(f"Warning: Audit encountered an error: {e}", file=sys.stderr)
        
        return self.violations
    
    def check_nesting_depth(self):
        """Check Principle 1: Object nesting depth (improved)"""
        depth_stack = []
        brace_stack = []
        
        for i, line in enumerate(self.lines, 1):
            # Track v.object({ openings
            if 'v.object({' in line or 'v.object( {' in line:
                depth_stack.append(i)
                brace_stack.append('{')
                
                if len(depth_stack) > 3:
                    self.violations.append(Violation(
                        principle=1,
                        severity="critical",
                        message=f"Object nesting exceeds 3 levels (currently {len(depth_stack)} levels)",
                        line=i,
                        code_snippet=line.strip(),
                        fix_suggestion="Flatten to ≤3 levels using separate tables or field prefixes"
                    ))
            
            # Track closing braces (simplified)
            if '})' in line and brace_stack:
                if depth_stack:
                    depth_stack.pop()
                if brace_stack:
                    brace_stack.pop()
    
    def check_union_complexity(self):
        """Check Principle 2: Union types with >5 members (improved)"""
        for i, line in enumerate(self.lines, 1):
            # Check v.union() calls
            if 'v.union(' in line:
                # Extract the union content more carefully
                remaining = line[line.index('v.union('):]
                paren_depth = 0
                union_content = []
                
                for char in remaining:
                    if char == '(':
                        paren_depth += 1
                    elif char == ')':
                        paren_depth -= 1
                        if paren_depth == 0:
                            break
                    union_content.append(char)
                
                union_str = ''.join(union_content)
                # Count literal/type definitions
                member_count = union_str.count('v.literal') + union_str.count('v.string') + \
                              union_str.count('v.number') + union_str.count('v.boolean')
                
                if member_count > 5:
                    self.violations.append(Violation(
                        principle=2,
                        severity="critical",
                        message=f"Union type has {member_count} members (max recommended: 5)",
                        line=i,
                        code_snippet=line.strip(),
                        fix_suggestion="Split into smaller unions or use categorization pattern"
                    ))
            
            # Check TypeScript union types (|)
            if '|' in line and (':' in line or 'type' in line):
                pipe_count = line.count('|')
                if pipe_count > 5:
                    self.violations.append(Violation(
                        principle=2,
                        severity="critical",
                        message=f"Type union has {pipe_count + 1} members (max recommended: 5)",
                        line=i,
                        code_snippet=line.strip(),
                        fix_suggestion="Break into multiple smaller unions"
                    ))
    
    def check_field_count(self):
        """Check Principle 6: Tables with >20 fields (improved)"""
        in_table = False
        table_name = None
        table_start_line = 0
        field_count = 0
        brace_depth = 0
        
        for i, line in enumerate(self.lines, 1):
            if 'defineTable({' in line or 'defineTable( {' in line:
                in_table = True
                # Extract table name
                table_match = re.search(r'(\w+):\s*defineTable', line)
                if table_match:
                    table_name = table_match.group(1)
                else:
                    table_name = "unknown"
                table_start_line = i
                field_count = 0
                brace_depth = 1
            elif in_table:
                brace_depth += line.count('{') - line.count('}')
                
                # Count field definitions
                if ':' in line and 'v.' in line and '//' not in line[:line.index(':') if ':' in line else 0]:
                    field_count += 1
                
                # Check if table definition ended
                if brace_depth == 0:
                    if field_count > 20:
                        self.violations.append(Violation(
                            principle=6,
                            severity="high",
                            message=f"Table '{table_name}' has {field_count} fields (max recommended: 20)",
                            line=table_start_line,
                            code_snippet=f"{table_name}: defineTable({{ ... }})",
                            fix_suggestion="Split into multiple related tables"
                        ))
                    in_table = False
    
    def check_conditional_types(self):
        """Check Principle 3: Conditional types in schemas"""
        for i, line in enumerate(self.lines, 1):
            if 'extends' in line and '?' in line and ':' in line:
                # Verify it's actually a conditional type
                if re.search(r'\w+\s+extends\s+\w+.*\?.*:', line):
                    self.violations.append(Violation(
                        principle=3,
                        severity="high",
                        message="Conditional type detected (avoid 'extends ? :' in schemas)",
                        line=i,
                        code_snippet=line.strip(),
                        fix_suggestion="Replace with explicit type definitions"
                    ))
    
    def check_recursive_types(self):
        """Check Principle 8: Recursive type definitions (improved)"""
        type_definitions = {}
        
        # First pass: collect type definitions
        type_pattern = re.compile(r'(?:type|interface)\s+(\w+)\s*[=<]')
        for i, line in enumerate(self.lines, 1):
            match = type_pattern.search(line)
            if match:
                type_name = match.group(1)
                type_definitions[type_name] = i
        
        # Second pass: check for self-references
        for type_name, def_line in type_definitions.items():
            # Check the next 15 lines for self-reference
            for j in range(def_line - 1, min(def_line + 15, len(self.lines))):
                if j == def_line - 1:
                    continue  # Skip the definition line itself
                
                line = self.lines[j]
                # Look for the type name as a reference (not in comments)
                if '//' in line:
                    line = line[:line.index('//')]
                if '/*' in line:
                    continue
                    
                if re.search(rf'\b{type_name}\b', line):
                    self.violations.append(Violation(
                        principle=8,
                        severity="critical",
                        message=f"Potentially recursive type definition: {type_name}",
                        line=def_line,
                        code_snippet=self.lines[def_line - 1].strip(),
                        fix_suggestion="Use ID references instead of embedding the type"
                    ))
                    break
    
    def check_mapped_types(self):
        """Check Principle 11: Mapped types in schemas"""
        for i, line in enumerate(self.lines, 1):
            if re.search(r'\[K in keyof', line):
                self.violations.append(Violation(
                    principle=11,
                    severity="medium",
                    message="Mapped type detected (avoid '[K in keyof T]' in schemas)",
                    line=i,
                    code_snippet=line.strip(),
                    fix_suggestion="Define explicit fields instead of mapping"
                ))
    
    def generate_report(self) -> str:
        """Generate a human-readable audit report"""
        if not self.violations:
            return f"\n✅ No TS2589 violations found in {self.file_path.name}\n"
        
        report = [f"\n🔍 TS2589 Audit Report: {self.file_path.name}"]
        report.append("=" * 70)
        report.append(f"\nFound {len(self.violations)} violation(s)\n")
        
        # Group by severity
        by_severity = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": []
        }
        
        for v in self.violations:
            by_severity[v.severity].append(v)
        
        for severity in ["critical", "high", "medium", "low"]:
            violations = by_severity[severity]
            if violations:
                severity_emoji = {
                    "critical": "🔴",
                    "high": "🟡",
                    "medium": "🔵",
                    "low": "⚪"
                }
                report.append(f"\n{severity_emoji[severity]} {severity.upper()} ({len(violations)}):")
                report.append("-" * 70)
                for v in violations:
                    report.append(f"\nLine {v.line} - Principle {v.principle}")
                    report.append(f"  {v.message}")
                    report.append(f"  Code: {v.code_snippet}")
                    if v.fix_suggestion:
                        report.append(f"  Fix: {v.fix_suggestion}")
        
        report.append("\n" + "=" * 70)
        report.append("\n💡 Next Steps:")
        
        critical_count = len(by_severity["critical"])
        high_count = len(by_severity["high"])
        
        if critical_count > 0:
            report.append(f"  1. Fix {critical_count} CRITICAL violation(s) immediately")
        if high_count > 0:
            report.append(f"  2. Address {high_count} HIGH severity violation(s)")
        report.append("  3. Review references/12-principles.md for detailed guidance")
        report.append("  4. Run refactoring-guide.md patterns for specific fixes")
        report.append("")
        
        return "\n".join(report)


def main():
    if len(sys.argv) < 2:
        print("TS2589 Schema Auditor")
        print("\nUsage: audit_schema.py <path-to-schema-file>")
        print("\nExample:")
        print("  python audit_schema.py convex/schema.ts")
        print("\nThis script analyzes Convex schema files for TS2589 violations.")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        auditor = SchemaAuditor(file_path)
        violations = auditor.audit()
        report = auditor.generate_report()
        print(report)
        
        # Exit with error code if critical violations found
        critical_count = sum(1 for v in violations if v.severity == "critical")
        if critical_count > 0:
            sys.exit(1)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Error: Unexpected error during audit: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
