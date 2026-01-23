/**
 * Schema Drift Detection
 *
 * Compares code-defined schemas against database schemas to detect
 * discrepancies that could cause runtime issues.
 *
 * @example
 * ```typescript
 * import { detectSchemaDrift } from "@convex-cms/core";
 *
 * const report = await detectSchemaDrift(ctx, cms, contentSchema);
 *
 * if (report.hasDrift) {
 *   console.warn("Schema drift detected:");
 *   console.log(report.summary);
 *
 *   for (const diff of report.fieldDifferences) {
 *     console.log(`${diff.contentType}.${diff.field}: ${diff.message}`);
 *   }
 * }
 * ```
 */

import type { ContentTypeDefinition } from "./types.js";
import type { ContentSchemaInstance } from "./defineContentType.js";
import { toFieldDefinitions, type DatabaseFieldDefinition } from "./defineContentType.js";
import type { ConvexContext } from "../wrapper.js";
import type { CmsClient } from "../wrapper.js";
import type { ContentType, FieldDefinition } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Severity level for drift issues.
 */
export type DriftSeverity = "error" | "warning" | "info";

/**
 * Type of schema difference detected.
 */
export type DriftType =
  | "CONTENT_TYPE_MISSING_IN_DB"
  | "CONTENT_TYPE_MISSING_IN_CODE"
  | "FIELD_MISSING_IN_DB"
  | "FIELD_MISSING_IN_CODE"
  | "FIELD_TYPE_MISMATCH"
  | "FIELD_REQUIRED_MISMATCH"
  | "FIELD_OPTIONS_MISMATCH"
  | "CONTENT_TYPE_METADATA_MISMATCH";

/**
 * A single schema drift issue.
 */
export interface DriftIssue {
  /**
   * Type of drift detected.
   */
  type: DriftType;

  /**
   * Severity level.
   */
  severity: DriftSeverity;

  /**
   * Content type name involved.
   */
  contentType: string;

  /**
   * Field name (if applicable).
   */
  field?: string;

  /**
   * Human-readable description of the issue.
   */
  message: string;

  /**
   * Expected value (from code).
   */
  expected?: unknown;

  /**
   * Actual value (from database).
   */
  actual?: unknown;
}

/**
 * Summary statistics for the drift report.
 */
export interface DriftSummary {
  /**
   * Number of content types only in code (not in database).
   */
  missingInDatabase: number;

  /**
   * Number of content types only in database (not in code).
   */
  missingInCode: number;

  /**
   * Number of field-level differences.
   */
  fieldDifferences: number;

  /**
   * Total number of issues found.
   */
  totalIssues: number;

  /**
   * Number of error-level issues.
   */
  errors: number;

  /**
   * Number of warning-level issues.
   */
  warnings: number;
}

/**
 * Full schema drift detection report.
 */
export interface SchemaDriftReport {
  /**
   * Whether any drift was detected.
   */
  hasDrift: boolean;

  /**
   * Summary statistics.
   */
  summary: DriftSummary;

  /**
   * All detected issues.
   */
  issues: DriftIssue[];

  /**
   * Content types defined in code but not in database.
   */
  missingInDatabase: string[];

  /**
   * Content types in database but not in code.
   */
  missingInCode: string[];

  /**
   * Timestamp when the check was performed.
   */
  checkedAt: number;
}

/**
 * Options for drift detection.
 */
export interface DetectDriftOptions {
  /**
   * Whether to include info-level issues in the report.
   * @default false
   */
  includeInfoLevel?: boolean;

  /**
   * Content type names to check. If not provided, checks all.
   */
  contentTypes?: string[];

  /**
   * Whether to treat missing-in-database as errors.
   * When true, code types not in DB are errors; when false, they're warnings.
   * @default true
   */
  strictMissingInDb?: boolean;

  /**
   * Whether to treat missing-in-code as errors.
   * When false, DB types not in code are warnings (allows admin-created types).
   * @default false
   */
  strictMissingInCode?: boolean;
}

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Detects schema drift between code-defined schemas and database state.
 *
 * @param ctx - Convex context
 * @param cmsClient - The CMS client to use for database queries
 * @param schema - The code-defined content schema
 * @param options - Detection options
 * @returns A drift report with all detected issues
 *
 * @example
 * ```typescript
 * const report = await detectSchemaDrift(ctx, cms, contentSchema);
 *
 * if (report.hasDrift) {
 *   console.error("Schema drift detected!");
 *   console.log(`Errors: ${report.summary.errors}`);
 *   console.log(`Warnings: ${report.summary.warnings}`);
 *
 *   for (const issue of report.issues) {
 *     console.log(`[${issue.severity}] ${issue.message}`);
 *   }
 * }
 * ```
 */
export async function detectSchemaDrift<
  TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
>(
  ctx: ConvexContext,
  cmsClient: CmsClient,
  schema: TSchema,
  options: DetectDriftOptions = {}
): Promise<SchemaDriftReport> {
  const {
    includeInfoLevel = false,
    contentTypes: filterTypes,
    strictMissingInDb = true,
    strictMissingInCode = false,
  } = options;

  const issues: DriftIssue[] = [];
  const missingInDatabase: string[] = [];
  const missingInCode: string[] = [];

  // Get all content types from database
  const dbTypes = await cmsClient.contentTypes.getAll(ctx);
  const dbTypeMap = new Map(dbTypes.map((t) => [t.name, t]));

  // Get code-defined content types
  const codeDefinitions = Object.values(schema.definitions) as ContentTypeDefinition[];
  const codeTypeNames = new Set(codeDefinitions.map((d) => d.name));

  // Filter if specific types requested
  const typesToCheck = filterTypes
    ? codeDefinitions.filter((d) => filterTypes.includes(d.name))
    : codeDefinitions;

  // Check code types against database
  for (const codeDef of typesToCheck) {
    const dbType = dbTypeMap.get(codeDef.name);

    if (!dbType) {
      // Code type not in database
      missingInDatabase.push(codeDef.name);
      issues.push({
        type: "CONTENT_TYPE_MISSING_IN_DB",
        severity: strictMissingInDb ? "error" : "warning",
        contentType: codeDef.name,
        message: `Content type "${codeDef.name}" is defined in code but not registered in the database`,
      });
      continue;
    }

    // Compare fields
    const codeFields = toFieldDefinitions(codeDef);
    const fieldIssues = compareFields(codeDef.name, codeFields, dbType.fields);
    issues.push(...fieldIssues);

    // Compare metadata (info level)
    if (includeInfoLevel) {
      const metaIssues = compareMetadata(codeDef, dbType);
      issues.push(...metaIssues);
    }
  }

  // Check for database types not in code
  const dbTypeNames = filterTypes
    ? dbTypes.filter((t) => filterTypes.includes(t.name)).map((t) => t.name)
    : dbTypes.map((t) => t.name);

  for (const dbTypeName of dbTypeNames) {
    if (!codeTypeNames.has(dbTypeName)) {
      missingInCode.push(dbTypeName);
      issues.push({
        type: "CONTENT_TYPE_MISSING_IN_CODE",
        severity: strictMissingInCode ? "error" : "warning",
        contentType: dbTypeName,
        message: `Content type "${dbTypeName}" exists in database but is not defined in code`,
      });
    }
  }

  // Calculate summary
  const summary: DriftSummary = {
    missingInDatabase: missingInDatabase.length,
    missingInCode: missingInCode.length,
    fieldDifferences: issues.filter((i) => i.field !== undefined).length,
    totalIssues: issues.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };

  return {
    hasDrift: issues.length > 0,
    summary,
    issues: includeInfoLevel ? issues : issues.filter((i) => i.severity !== "info"),
    missingInDatabase,
    missingInCode,
    checkedAt: Date.now(),
  };
}

/**
 * Compare field definitions between code and database.
 */
function compareFields(
  contentTypeName: string,
  codeFields: DatabaseFieldDefinition[],
  dbFields: FieldDefinition[]
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  const codeFieldMap = new Map(codeFields.map((f) => [f.name, f]));
  const dbFieldMap = new Map(dbFields.map((f) => [f.name, f]));

  // Check code fields against database
  for (const codeField of codeFields) {
    const dbField = dbFieldMap.get(codeField.name);

    if (!dbField) {
      issues.push({
        type: "FIELD_MISSING_IN_DB",
        severity: "error",
        contentType: contentTypeName,
        field: codeField.name,
        message: `Field "${codeField.name}" is defined in code but not in the database schema`,
      });
      continue;
    }

    // Check type
    if (codeField.type !== dbField.type) {
      issues.push({
        type: "FIELD_TYPE_MISMATCH",
        severity: "error",
        contentType: contentTypeName,
        field: codeField.name,
        message: `Field "${codeField.name}" type mismatch: code expects "${codeField.type}", database has "${dbField.type}"`,
        expected: codeField.type,
        actual: dbField.type,
      });
    }

    // Check required
    if (codeField.required !== dbField.required) {
      issues.push({
        type: "FIELD_REQUIRED_MISMATCH",
        severity: "warning",
        contentType: contentTypeName,
        field: codeField.name,
        message: `Field "${codeField.name}" required mismatch: code expects ${codeField.required ? "required" : "optional"}, database has ${dbField.required ? "required" : "optional"}`,
        expected: codeField.required,
        actual: dbField.required,
      });
    }

    // Check options (selective comparison)
    // Cast to Record<string, unknown> since FieldOptions shape may vary
    const optionsDiff = compareFieldOptions(
      codeField.options as Record<string, unknown> | undefined,
      dbField.options as Record<string, unknown> | undefined
    );
    if (optionsDiff) {
      issues.push({
        type: "FIELD_OPTIONS_MISMATCH",
        severity: "warning",
        contentType: contentTypeName,
        field: codeField.name,
        message: `Field "${codeField.name}" has different options: ${optionsDiff}`,
      });
    }
  }

  // Check for fields in database not in code
  for (const dbField of dbFields) {
    if (!codeFieldMap.has(dbField.name)) {
      issues.push({
        type: "FIELD_MISSING_IN_CODE",
        severity: "warning",
        contentType: contentTypeName,
        field: dbField.name,
        message: `Field "${dbField.name}" exists in database but is not defined in code`,
      });
    }
  }

  return issues;
}

/**
 * Compare field options and return a description of differences.
 */
function compareFieldOptions(
  codeOptions: Record<string, unknown> | undefined,
  dbOptions: Record<string, unknown> | undefined
): string | null {
  if (!codeOptions && !dbOptions) return null;
  if (!codeOptions && dbOptions) return "database has options, code does not";
  if (codeOptions && !dbOptions) return "code has options, database does not";

  const differences: string[] = [];

  // Check for important option differences
  const importantOptions = [
    "minLength",
    "maxLength",
    "min",
    "max",
    "pattern",
    "allowedContentTypes",
    "allowedMimeTypes",
    "multiple",
    "options", // for select fields
  ];

  for (const key of importantOptions) {
    const codeValue = codeOptions![key];
    const dbValue = dbOptions![key];

    if (codeValue !== undefined && dbValue === undefined) {
      differences.push(`${key} missing in database`);
    } else if (codeValue === undefined && dbValue !== undefined) {
      differences.push(`${key} missing in code`);
    } else if (JSON.stringify(codeValue) !== JSON.stringify(dbValue)) {
      differences.push(`${key} differs`);
    }
  }

  return differences.length > 0 ? differences.join(", ") : null;
}

/**
 * Compare content type metadata.
 */
function compareMetadata(
  codeDef: ContentTypeDefinition,
  dbType: ContentType
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  if (codeDef.meta?.displayName && codeDef.meta.displayName !== dbType.displayName) {
    issues.push({
      type: "CONTENT_TYPE_METADATA_MISMATCH",
      severity: "info",
      contentType: codeDef.name,
      message: `Display name mismatch: code has "${codeDef.meta.displayName}", database has "${dbType.displayName}"`,
      expected: codeDef.meta.displayName,
      actual: dbType.displayName,
    });
  }

  if (codeDef.meta?.titleField && codeDef.meta.titleField !== dbType.titleField) {
    issues.push({
      type: "CONTENT_TYPE_METADATA_MISMATCH",
      severity: "info",
      contentType: codeDef.name,
      message: `Title field mismatch: code has "${codeDef.meta.titleField}", database has "${dbType.titleField}"`,
      expected: codeDef.meta.titleField,
      actual: dbType.titleField,
    });
  }

  return issues;
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format a drift report as a human-readable string.
 *
 * @param report - The drift report to format
 * @returns A formatted string suitable for console output
 */
export function formatDriftReport(report: SchemaDriftReport): string {
  if (!report.hasDrift) {
    return "No schema drift detected. Code and database schemas are in sync.";
  }

  const lines: string[] = [
    "Schema Drift Report",
    "===================",
    "",
    `Total Issues: ${report.summary.totalIssues}`,
    `  Errors: ${report.summary.errors}`,
    `  Warnings: ${report.summary.warnings}`,
    "",
  ];

  if (report.missingInDatabase.length > 0) {
    lines.push("Content Types Missing in Database:");
    for (const name of report.missingInDatabase) {
      lines.push(`  - ${name}`);
    }
    lines.push("");
  }

  if (report.missingInCode.length > 0) {
    lines.push("Content Types Missing in Code:");
    for (const name of report.missingInCode) {
      lines.push(`  - ${name}`);
    }
    lines.push("");
  }

  const fieldIssues = report.issues.filter((i) => i.field);
  if (fieldIssues.length > 0) {
    lines.push("Field Differences:");
    for (const issue of fieldIssues) {
      const prefix = issue.severity === "error" ? "[ERROR]" : "[WARN]";
      lines.push(`  ${prefix} ${issue.contentType}.${issue.field}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

/**
 * Check if a drift report h errors (not just warnings).
 *
 * @param report - The drift report to check
 * @returns true if there are error-level issues
 */
export function hasErrors(report: SchemaDriftReport): boolean {
  return report.summary.errors > 0;
}

/**
 * Filter a drift report to only include specific content types.
 *
 * @param report - The full drift report
 * @param contentTypes - Content type names to include
 * @returns A filtered report
 */
export function filterReportByContentTypes(
  report: SchemaDriftReport,
  contentTypes: string[]
): SchemaDriftReport {
  const typeSet = new Set(contentTypes);

  const filteredIssues = report.issues.filter((i) => typeSet.has(i.contentType));

  return {
    ...report,
    issues: filteredIssues,
    missingInDatabase: report.missingInDatabase.filter((n) => typeSet.has(n)),
    missingInCode: report.missingInCode.filter((n) => typeSet.has(n)),
    summary: {
      missingInDatabase: report.missingInDatabase.filter((n) => typeSet.has(n)).length,
      missingInCode: report.missingInCode.filter((n) => typeSet.has(n)).length,
      fieldDifferences: filteredIssues.filter((i) => i.field !== undefined).length,
      totalIssues: filteredIssues.length,
      errors: filteredIssues.filter((i) => i.severity === "error").length,
      warnings: filteredIssues.filter((i) => i.severity === "warning").length,
    },
    hasDrift: filteredIssues.length > 0,
  };
}
