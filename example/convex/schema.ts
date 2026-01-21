import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	gear: defineTable({
		body: v.string(),
		user: v.id("users"),
	}),
});
