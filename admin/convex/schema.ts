import { defineSchema } from "convex/server";

/**
 * Admin UI Schema
 *
 * This schema is intentionally empty - all CMS data is stored
 * in the component's isolated database. This file exists to
 * satisfy Convex's schema requirements for the admin deployment.
 */
const schema = defineSchema({});

export default schema;
