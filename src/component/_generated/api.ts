/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as contentEntries from "../contentEntries.js";
import type * as contentEntryMutations from "../contentEntryMutations.js";
import type * as contentTypeMutations from "../contentTypeMutations.js";
import type * as index from "../index.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_referenceResolver from "../lib/referenceResolver.js";
import type * as lib_slugGenerator from "../lib/slugGenerator.js";
import type * as lib_slugUniqueness from "../lib/slugUniqueness.js";
import type * as validation from "../validation.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  contentEntries: typeof contentEntries;
  contentEntryMutations: typeof contentEntryMutations;
  contentTypeMutations: typeof contentTypeMutations;
  index: typeof index;
  "lib/index": typeof lib_index;
  "lib/referenceResolver": typeof lib_referenceResolver;
  "lib/slugGenerator": typeof lib_slugGenerator;
  "lib/slugUniqueness": typeof lib_slugUniqueness;
  validation: typeof validation;
  validators: typeof validators;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
