/**
 * CMS Setup
 *
 * Reuses the shared content type definitions and adds server-side typed helpers
 * for Convex functions.
 */

import { createTypedHelpers } from "convex-cms";
import { components } from "./_generated/api";
import { changelogEntry, roadmapItem } from "../shared/cmsDefinitions";

export { changelogEntry, roadmapItem } from "../shared/cmsDefinitions";

export const content = createTypedHelpers(components.cms, {
	roadmap: roadmapItem,
	changelog: changelogEntry,
});
