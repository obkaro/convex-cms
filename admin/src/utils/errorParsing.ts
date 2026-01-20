import type { FieldError } from '../components/fields/types';

/**
 * Parses server validation errors into field-level errors.
 *
 * Supported error formats:
 * 1. JSON format: {"errors": [{"field": "name", "message": "error"}]}
 * 2. Structured text: "Content validation failed: field1: error1; field2: error2"
 * 3. Plain message: "Some error message"
 *
 * @param error - The error to parse (Error object or string)
 * @returns Object with fieldErrors map and a general error message
 */
export function parseServerError(
  error: Error | string | unknown
): { fieldErrors: Record<string, FieldError>; generalError: string | null } {
  const result: { fieldErrors: Record<string, FieldError>; generalError: string | null } = {
    fieldErrors: {},
    generalError: null,
  };

  if (!error) {
    return result;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Try to parse JSON error format first
  try {
    // Check if the error message contains JSON
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Handle {"errors": [{"field": "...", "message": "..."}]} format
      if (Array.isArray(parsed.errors)) {
        for (const err of parsed.errors) {
          if (err.field && err.message) {
            result.fieldErrors[err.field] = {
              message: err.message,
              code: err.code ?? 'SERVER_ERROR',
            };
          }
        }
        if (Object.keys(result.fieldErrors).length > 0) {
          return result;
        }
      }

      // Handle {"field": "...", "message": "..."} format (single error)
      if (parsed.field && parsed.message) {
        result.fieldErrors[parsed.field] = {
          message: parsed.message,
          code: parsed.code ?? 'SERVER_ERROR',
        };
        return result;
      }

      // Handle {fieldName: errorMessage} format
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        let hasFieldErrors = false;
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string' && key !== 'message' && key !== 'code') {
            result.fieldErrors[key] = {
              message: value,
              code: 'SERVER_ERROR',
            };
            hasFieldErrors = true;
          }
        }
        if (hasFieldErrors) {
          return result;
        }
      }
    }
  } catch {
    // JSON parsing failed, continue with text parsing
  }

  // Try to parse "Content validation failed:" format
  const validationPattern = /(?:Content validation failed|Validation error|Validation failed):\s*(.+)/i;
  const validationMatch = message.match(validationPattern);

  if (validationMatch) {
    const errorPart = validationMatch[1].trim();

    // Split by semicolon to get individual field errors
    const fieldErrorParts = errorPart.split(/;\s*/);

    for (const part of fieldErrorParts) {
      // Try to extract "fieldName: errorMessage" pattern
      const colonIndex = part.indexOf(':');
      if (colonIndex > 0 && colonIndex < part.length - 1) {
        const fieldName = part.substring(0, colonIndex).trim();
        const errorMsg = part.substring(colonIndex + 1).trim();

        // Validate field name looks reasonable (no spaces, reasonable length)
        if (fieldName && !fieldName.includes(' ') && fieldName.length <= 50 && errorMsg) {
          result.fieldErrors[fieldName] = {
            message: errorMsg,
            code: 'SERVER_ERROR',
          };
        }
      }
    }

    if (Object.keys(result.fieldErrors).length > 0) {
      return result;
    }
  }

  // If we couldn't parse field errors, return the general error message
  result.generalError = message;
  return result;
}

/**
 * Format an error for display to users.
 * Removes technical details and provides a user-friendly message.
 */
export function formatErrorForDisplay(error: Error | string | unknown): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  const message = error instanceof Error ? error.message : String(error);

  // Remove common technical prefixes
  const cleanedMessage = message
    .replace(/^(Error|ConvexError|ValidationError|ServerError):\s*/i, '')
    .replace(/^\[.*?\]\s*/, ''); // Remove bracketed prefixes like [HTTP 500]

  // Capitalize first letter
  return cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
}

/**
 * Determines if an error is likely transient (network issue, timeout)
 * and worth retrying automatically.
 */
export function isRetryableError(error: Error | string | unknown): boolean {
  if (!error) return false;

  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

  const retryablePatterns = [
    'network',
    'timeout',
    'timed out',
    'connection',
    'fetch failed',
    'failed to fetch',
    'offline',
    'unavailable',
    'rate limit',
    'too many requests',
    '503',
    '504',
    '429',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}
