/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditLog from "../auditLog.js";
import type * as authorization from "../authorization.js";
import type * as authorizationHooks from "../authorizationHooks.js";
import type * as bulkOperations from "../bulkOperations.js";
import type * as contentEntries from "../contentEntries.js";
import type * as contentEntryMutations from "../contentEntryMutations.js";
import type * as contentEntryValidation from "../contentEntryValidation.js";
import type * as contentLock from "../contentLock.js";
import type * as contentTypeMigration from "../contentTypeMigration.js";
import type * as contentTypeMutations from "../contentTypeMutations.js";
import type * as contentTypes from "../contentTypes.js";
import type * as documentTypes from "../documentTypes.js";
import type * as eventEmitter from "../eventEmitter.js";
import type * as exportImport from "../exportImport.js";
import type * as index from "../index.js";
import type * as lib_deepReferenceResolver from "../lib/deepReferenceResolver.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_mediaReferenceResolver from "../lib/mediaReferenceResolver.js";
import type * as lib_metadataExtractor from "../lib/metadataExtractor.js";
import type * as lib_mutationAuth from "../lib/mutationAuth.js";
import type * as lib_ragContentChunker from "../lib/ragContentChunker.js";
import type * as lib_referenceResolver from "../lib/referenceResolver.js";
import type * as lib_slugGenerator from "../lib/slugGenerator.js";
import type * as lib_slugUniqueness from "../lib/slugUniqueness.js";
import type * as localeFallbackChain from "../localeFallbackChain.js";
import type * as localeFields from "../localeFields.js";
import type * as mediaAssetMutations from "../mediaAssetMutations.js";
import type * as mediaAssets from "../mediaAssets.js";
import type * as mediaFolderMutations from "../mediaFolderMutations.js";
import type * as mediaUploadMutations from "../mediaUploadMutations.js";
import type * as mediaVariantMutations from "../mediaVariantMutations.js";
import type * as mediaVariants from "../mediaVariants.js";
import type * as ragContentIndexer from "../ragContentIndexer.js";
import type * as rateLimitHooks from "../rateLimitHooks.js";
import type * as roles from "../roles.js";
import type * as scheduledPublish from "../scheduledPublish.js";
import type * as taxonomies from "../taxonomies.js";
import type * as taxonomyMutations from "../taxonomyMutations.js";
import type * as trash from "../trash.js";
import type * as types from "../types.js";
import type * as userContext from "../userContext.js";
import type * as validation from "../validation.js";
import type * as validators from "../validators.js";
import type * as versionMutations from "../versionMutations.js";
import type * as webhookTrigger from "../webhookTrigger.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  auditLog: typeof auditLog;
  authorization: typeof authorization;
  authorizationHooks: typeof authorizationHooks;
  bulkOperations: typeof bulkOperations;
  contentEntries: typeof contentEntries;
  contentEntryMutations: typeof contentEntryMutations;
  contentEntryValidation: typeof contentEntryValidation;
  contentLock: typeof contentLock;
  contentTypeMigration: typeof contentTypeMigration;
  contentTypeMutations: typeof contentTypeMutations;
  contentTypes: typeof contentTypes;
  documentTypes: typeof documentTypes;
  eventEmitter: typeof eventEmitter;
  exportImport: typeof exportImport;
  index: typeof index;
  "lib/deepReferenceResolver": typeof lib_deepReferenceResolver;
  "lib/errors": typeof lib_errors;
  "lib/index": typeof lib_index;
  "lib/mediaReferenceResolver": typeof lib_mediaReferenceResolver;
  "lib/metadataExtractor": typeof lib_metadataExtractor;
  "lib/mutationAuth": typeof lib_mutationAuth;
  "lib/ragContentChunker": typeof lib_ragContentChunker;
  "lib/referenceResolver": typeof lib_referenceResolver;
  "lib/slugGenerator": typeof lib_slugGenerator;
  "lib/slugUniqueness": typeof lib_slugUniqueness;
  localeFallbackChain: typeof localeFallbackChain;
  localeFields: typeof localeFields;
  mediaAssetMutations: typeof mediaAssetMutations;
  mediaAssets: typeof mediaAssets;
  mediaFolderMutations: typeof mediaFolderMutations;
  mediaUploadMutations: typeof mediaUploadMutations;
  mediaVariantMutations: typeof mediaVariantMutations;
  mediaVariants: typeof mediaVariants;
  ragContentIndexer: typeof ragContentIndexer;
  rateLimitHooks: typeof rateLimitHooks;
  roles: typeof roles;
  scheduledPublish: typeof scheduledPublish;
  taxonomies: typeof taxonomies;
  taxonomyMutations: typeof taxonomyMutations;
  trash: typeof trash;
  types: typeof types;
  userContext: typeof userContext;
  validation: typeof validation;
  validators: typeof validators;
  versionMutations: typeof versionMutations;
  webhookTrigger: typeof webhookTrigger;
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
