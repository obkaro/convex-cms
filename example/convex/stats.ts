/**
 * Stats API - Re-exports for Admin UI
 *
 * The admin UI expects functions at api.stats.*
 */

import { stats } from "./admin";

export const { getDashboardStats } = stats;
