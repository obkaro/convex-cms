/**
 * Content Types API - Re-exports for Admin UI
 *
 * The admin UI expects functions at api.contentTypes.*
 */

import { contentTypes } from "./admin";

export const { list, get, create, update } = contentTypes;

// Re-export delete with a different name (delete is a reserved word)
export const remove = contentTypes.delete;
