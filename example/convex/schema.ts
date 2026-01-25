import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Example app schema demonstrating CMS integration.
 *
 * The users table shows how to store CMS role assignments
 * for use with the getUserRole hook in cms.ts.
 */
export default defineSchema({
  /**
   * Users table with CMS role assignments.
   *
   * The cmsRole field maps users to CMS roles:
   * - "admin": Full access to all CMS features
   * - "editor": Can edit and publish content
   * - "author": Can create and edit own content
   * - "viewer": Read-only access
   */
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    /** CMS role assignment - determines what actions the user can perform */
    cmsRole: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("editor"),
        v.literal("author"),
        v.literal("viewer")
      )
    ),
    /** When the user was created */
    createdAt: v.optional(v.number()),
    /** Last login timestamp */
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["cmsRole"]),
});
