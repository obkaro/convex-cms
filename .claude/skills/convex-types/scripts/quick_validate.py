#!/usr/bin/env python3
"""
Quick TS2589 Validator

Fast checker for immediate validation of TypeScript code against TS2589 principles.
Returns simple pass/fail with actionable suggestions.
"""

import sys
import re
from pathlib import Path


def check_file(file_path: str) -> tuple[bool, list[str]]:
    """Quick validation check. Returns (passed, issues)"""
    issues = []
    
    try:
        content = Path(file_path).read_text(encoding='utf-8')
        lines = content.split('\n')
    except Exception as e:
        return False, [f"Error reading file: {e}"]
    
    # Quick checks
    # 1. Check for deep nesting (>3 levels)
    max_depth = 0
    current_depth = 0
    for char in content:
        if char in '{<[(':
            current_depth += 1
            max_depth = max(max_depth, current_depth)
        elif char in '}>[)':
            current_depth = max(0, current_depth - 1)
    
    if max_depth > 6:  # Approximate check
        issues.append(f"❌ Deep nesting detected (depth ~{max_depth}): Likely exceeds 3-level limit")
    
    # 2. Check for large unions
    for i, line in enumerate(lines, 1):
        pipe_count = line.count('|')
        if pipe_count > 5 and (':' in line or 'type' in line):
            issues.append(f"❌ Line {i}: Large union type ({pipe_count + 1} members)")
    
    # 3. Check for conditional types
    for i, line in enumerate(lines, 1):
        if re.search(r'extends\s+\w+.*\?.*:', line):
            issues.append(f"❌ Line {i}: Conditional type detected (extends ? :)")
    
    # 4. Check for missing return types on Convex functions
    for i, line in enumerate(lines, 1):
        if re.search(r'export\s+const\s+\w+\s*=\s*(query|mutation|action)', line):
            # Check next few lines for Promise<
            has_return_type = False
            for j in range(i, min(i + 5, len(lines))):
                if 'Promise<' in lines[j]:
                    has_return_type = True
                    break
            if not has_return_type:
                issues.append(f"⚠️  Line {i}: Possible missing return type on Convex function")
    
    # 5. Check for recursive types (simple check)
    type_names = set()
    for line in lines:
        match = re.search(r'type\s+(\w+)\s*=', line)
        if match:
            type_names.add(match.group(1))
    
    for type_name in type_names:
        # Simple check: type refers to itself nearby
        pattern = rf'type\s+{type_name}\s*=.*{type_name}'
        if re.search(pattern, content):
            issues.append(f"❌ Potentially recursive type: {type_name}")
    
    # 6. Check for mapped types
    for i, line in enumerate(lines, 1):
        if re.search(r'\[K in keyof', line):
            issues.append(f"⚠️  Line {i}: Mapped type detected ([K in keyof])")
    
    # 7. Check table field counts (approximate)
    in_table = False
    field_count = 0
    table_line = 0
    for i, line in enumerate(lines, 1):
        if 'defineTable({' in line:
            in_table = True
            field_count = 0
            table_line = i
        elif in_table:
            if ':' in line and 'v.' in line:
                field_count += 1
            if '})' in line:
                if field_count > 20:
                    issues.append(f"⚠️  Line {table_line}: Table has ~{field_count} fields (max: 20)")
                in_table = False
    
    passed = len(issues) == 0
    return passed, issues


def main():
    if len(sys.argv) < 2:
        print("Quick TS2589 Validator")
        print("\nUsage: quick_validate.py <typescript-file>")
        print("\nExample:")
        print("  python quick_validate.py convex/schema.ts")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(2)
    
    print(f"\n🔍 Quick validating: {file_path}")
    print("=" * 60)
    
    passed, issues = check_file(file_path)
    
    if passed:
        print("\n✅ PASSED: No obvious TS2589 violations detected")
        print("\nNote: This is a quick check. For comprehensive analysis, run:")
        print(f"  python audit_schema.py {file_path}")
        print(f"  python check_complexity.py {file_path}")
    else:
        print(f"\n❌ FAILED: Found {len(issues)} potential issue(s)\n")
        for issue in issues:
            print(f"  {issue}")
        
        print("\n💡 Recommended Actions:")
        print("  1. Run full audit: python audit_schema.py " + file_path)
        print("  2. Review references/12-principles.md")
        print("  3. Apply fixes from references/refactoring-guide.md")
        sys.exit(1)
    
    print()


if __name__ == "__main__":
    main()
