/**
 * Resolves a taxonomy name to its ID.
 *
 * Field definitions can specify either `taxonomyId` (direct) or `taxonomyName`
 * (resolved at render time). Since `taxonomyId` in field configs is typically
 * a human-readable name (e.g. "menu_categories"), this hook always resolves
 * it to the actual Convex document ID.
 */

import { useQuery } from "convex/react";
import { useApi } from "../embed/contexts/ApiContext";

export function useTaxonomyId(options?: {
  taxonomyId?: string;
  taxonomyName?: string;
}): string | null {
  const api = useApi();
  const directId = options?.taxonomyId;
  const name = options?.taxonomyName ?? directId;

  const taxonomiesResult = useQuery(
    api.listTaxonomies,
    name ? { isActive: true } : "skip"
  );

  if (!name) return null;

  const match = taxonomiesResult?.page?.find(
    (t: { name: string }) => t.name === name
  );
  return match?._id ?? directId ?? null;
}
