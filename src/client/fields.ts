/**
 * Semantic Field Helpers
 *
 * Provides typed field constructors that return Convex validators
 * with CMS metadata attached. The admin UI uses this metadata to
 * render the correct field component automatically.
 *
 * @example
 * ```typescript
 * import { defineContentType, fields } from "convex-cms";
 * import { v } from "convex/values";
 *
 * export const product = defineContentType({
 *   name: "Product",
 *   validator: v.object({
 *     name: v.string(),
 *     price: fields.money({ currency: "USD" }),
 *     salePrice: v.optional(fields.money({ currency: "USD" })),
 *   }),
 * });
 * ```
 */

import { v } from "convex/values";

/** Symbol keys for CMS field metadata (avoids string key collisions) */
export const CMS_FIELD_TYPE = Symbol.for("cms:fieldType");
export const CMS_FIELD_OPTIONS = Symbol.for("cms:fieldOptions");

/**
 * Attach CMS metadata to a Convex validator.
 * The metadata is read by `inferFieldType` in `defineContentType.ts`.
 */
function withCmsMetadata<T>(
  validator: T,
  fieldType: string,
  fieldOptions?: Record<string, unknown>
): T {
  const v = validator as Record<symbol, unknown>;
  v[CMS_FIELD_TYPE] = fieldType;
  if (fieldOptions) {
    v[CMS_FIELD_OPTIONS] = fieldOptions;
  }
  return validator;
}

/**
 * Check if a validator has CMS field type metadata.
 */
export function getCmsFieldType(validator: unknown): string | undefined {
  return (validator as Record<symbol, unknown>)?.[CMS_FIELD_TYPE] as
    | string
    | undefined;
}

/**
 * Get CMS field options from a validator.
 */
export function getCmsFieldOptions(
  validator: unknown
): Record<string, unknown> | undefined {
  return (validator as Record<symbol, unknown>)?.[CMS_FIELD_OPTIONS] as
    | Record<string, unknown>
    | undefined;
}

export const fields = {
  /**
   * Money field — stores `{ amount: number, currency: string }`.
   *
   * `amount` is in minor units (e.g. cents: 1500 = $15.00).
   * `currency` is an ISO 4217 code (e.g. "CAD", "USD", "EUR").
   *
   * The admin UI renders this as a currency-formatted input with
   * automatic major/minor unit conversion.
   *
   * @param options.currency - Default currency code (default: "CAD")
   *
   * @example
   * ```typescript
   * price: fields.money({ currency: "CAD" }),
   * salePrice: v.optional(fields.money({ currency: "USD" })),
   * ```
   */
  money(options?: { currency?: string }) {
    const validator = v.object({
      amount: v.number(),
      currency: v.string(),
    });
    return withCmsMetadata(validator, "money", {
      defaultCurrency: options?.currency ?? "CAD",
    });
  },
};
