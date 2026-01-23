/**
 * Common query helpers for the CMS component.
 *
 * Provides reusable query patterns for looking up documents by name,
 * ID, or other common patterns with soft-delete awareness.
 */

import type { QueryCtx } from "../_generated/server.js";
import type { Id, Doc, TableNames } from "../_generated/dataModel.js";
import { isDeleted } from "./softDelete.js";

export interface GetByIdOptions {
  includeDeleted?: boolean;
}

export async function getContentTypeByName(
  ctx: QueryCtx,
  name: string,
  options: GetByIdOptions = {}
): Promise<Doc<"contentTypes"> | null> {
  const contentType = await ctx.db
    .query("contentTypes")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();

  if (!contentType) return null;
  if (!options.includeDeleted && isDeleted(contentType)) return null;
  return contentType;
}

export async function getTaxonomyByName(
  ctx: QueryCtx,
  name: string,
  options: GetByIdOptions = {}
): Promise<Doc<"taxonomies"> | null> {
  const taxonomy = await ctx.db
    .query("taxonomies")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();

  if (!taxonomy) return null;
  if (!options.includeDeleted && isDeleted(taxonomy)) return null;
  return taxonomy;
}

export async function contentTypeExists(
  ctx: QueryCtx,
  name: string,
  options: GetByIdOptions = {}
): Promise<boolean> {
  const contentType = await getContentTypeByName(ctx, name, options);
  return contentType !== null;
}

export async function taxonomyExists(
  ctx: QueryCtx,
  name: string,
  options: GetByIdOptions = {}
): Promise<boolean> {
  const taxonomy = await getTaxonomyByName(ctx, name, options);
  return taxonomy !== null;
}

export async function getActiveById<T extends TableNames>(
  ctx: QueryCtx,
  id: Id<T>,
  options: GetByIdOptions = {}
): Promise<Doc<T> | null> {
  const doc = await ctx.db.get(id);
  if (!doc) return null;
  if (
    !options.includeDeleted &&
    "deletedAt" in doc &&
    (doc as { deletedAt?: number }).deletedAt !== undefined
  ) {
    return null;
  }
  return doc;
}
