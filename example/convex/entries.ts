/**
 * Content Entries API - Re-exports for Admin UI
 *
 * The admin UI expects functions at api.entries.*
 */

import { entries } from "./admin";

export const {
  list,
  get,
  create,
  update,
  publish,
  unpublish,
  duplicate,
  schedule,
  cancelSchedule,
  getScheduled,
} = entries;

// Re-export delete as remove (delete is a reserved word, and admin UI uses "remove")
export const remove = entries.delete;
