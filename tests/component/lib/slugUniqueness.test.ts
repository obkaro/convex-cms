import { describe, it, expect, vi } from "vitest";
import {
  checkSlugUniqueness,
  ensureUniqueSlug,
  findNextAvailableSlug,
  validateSlugFormat,
  type SlugEntry,
  type SlugQueryFn,
  type SlugPrefixQueryFn,
} from "../../../src/component/lib/slugUniqueness.js";

describe("checkSlugUniqueness", () => {
  describe("basic uniqueness checks", () => {
    it("returns isUnique: true when slug does not exist", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);
      const result = await checkSlugUniqueness("my-post", queryFn);

      expect(result.isUnique).toBe(true);
      expect(result.existingEntryId).toBeUndefined();
      expect(result.suggestedSlug).toBeUndefined();
    });

    it("returns isUnique: false with existingEntryId when slug exists", async () => {
      const existingEntry: SlugEntry = { _id: "entry123", slug: "my-post" };
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(existingEntry);

      const result = await checkSlugUniqueness("my-post", queryFn);

      expect(result.isUnique).toBe(false);
      expect(result.existingEntryId).toBe("entry123");
      expect(result.suggestedSlug).toBeDefined();
    });

    it("suggests an alternative slug when conflict exists", async () => {
      const existingEntry: SlugEntry = { _id: "entry123", slug: "my-post" };
      const queryFn: SlugQueryFn = vi
        .fn()
        .mockResolvedValueOnce(existingEntry) // Initial check
        .mockResolvedValueOnce(existingEntry) // my-post (for suggestion)
        .mockResolvedValueOnce(null); // my-post-1 is available

      const result = await checkSlugUniqueness("my-post", queryFn);

      expect(result.isUnique).toBe(false);
      expect(result.suggestedSlug).toBe("my-post-1");
    });
  });

  describe("excludeEntryId option", () => {
    it("returns isUnique: true when existing entry matches excludeEntryId", async () => {
      const existingEntry: SlugEntry = { _id: "entry123", slug: "my-post" };
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(existingEntry);

      const result = await checkSlugUniqueness("my-post", queryFn, {
        excludeEntryId: "entry123",
      });

      expect(result.isUnique).toBe(true);
    });

    it("returns isUnique: false when existing entry does not match excludeEntryId", async () => {
      const existingEntry: SlugEntry = { _id: "entry123", slug: "my-post" };
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(existingEntry);

      const result = await checkSlugUniqueness("my-post", queryFn, {
        excludeEntryId: "differentEntry",
      });

      expect(result.isUnique).toBe(false);
      expect(result.existingEntryId).toBe("entry123");
    });
  });

  describe("invalid slug format", () => {
    it("returns isUnique: false with suggested correction for uppercase slugs", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await checkSlugUniqueness("My-Post", queryFn);

      expect(result.isUnique).toBe(false);
      expect(result.suggestedSlug).toBe("my-post");
    });

    it("returns isUnique: false with suggested correction for slugs with spaces", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await checkSlugUniqueness("my post", queryFn);

      expect(result.isUnique).toBe(false);
      expect(result.suggestedSlug).toBe("my-post");
    });
  });
});

describe("ensureUniqueSlug", () => {
  describe("basic functionality", () => {
    it("returns the base slug if it is unique", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await ensureUniqueSlug("my-post", queryFn);

      expect(result).toBe("my-post");
      expect(queryFn).toHaveBeenCalledWith("my-post");
    });

    it("appends -1 suffix when base slug exists", async () => {
      const existingEntry: SlugEntry = { _id: "entry123", slug: "my-post" };
      const queryFn: SlugQueryFn = vi
        .fn()
        .mockResolvedValueOnce(existingEntry) // my-post
        .mockResolvedValueOnce(null); // my-post-1

      const result = await ensureUniqueSlug("my-post", queryFn);

      expect(result).toBe("my-post-1");
    });

    it("increments suffix until unique slug is found", async () => {
      const queryFn: SlugQueryFn = vi
        .fn()
        .mockResolvedValueOnce({ _id: "e1", slug: "post" })
        .mockResolvedValueOnce({ _id: "e2", slug: "post-1" })
        .mockResolvedValueOnce({ _id: "e3", slug: "post-2" })
        .mockResolvedValueOnce(null); // post-3 is available

      const result = await ensureUniqueSlug("post", queryFn);

      expect(result).toBe("post-3");
    });
  });

  describe("title normalization", () => {
    it("converts titles to valid slugs", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await ensureUniqueSlug("Hello World!", queryFn);

      expect(result).toBe("hello-world");
    });

    it("handles unicode characters", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await ensureUniqueSlug("Café & Restaurant", queryFn);

      expect(result).toBe("cafe-and-restaurant");
    });

    it("uses 'untitled' fallback for empty slugs", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await ensureUniqueSlug("", queryFn);

      expect(result).toBe("untitled");
    });

    it("uses 'untitled' fallback for slugs that normalize to empty", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(null);

      const result = await ensureUniqueSlug("!!!", queryFn);

      expect(result).toBe("untitled");
    });
  });

  describe("excludeEntryId option", () => {
    it("excludes the specified entry from uniqueness check", async () => {
      const existingEntry: SlugEntry = { _id: "entry123", slug: "my-post" };
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue(existingEntry);

      const result = await ensureUniqueSlug("my-post", queryFn, {
        excludeEntryId: "entry123",
      });

      expect(result).toBe("my-post");
    });
  });

  describe("maxAttempts option", () => {
    it("falls back to timestamp after maxAttempts exceeded", async () => {
      const queryFn: SlugQueryFn = vi.fn().mockResolvedValue({ _id: "e", slug: "post" });

      const result = await ensureUniqueSlug("post", queryFn, { maxAttempts: 3 });

      // Should be post-{timestamp} after 3 failed attempts
      expect(result).toMatch(/^post-[a-z0-9]+$/);
      expect(queryFn).toHaveBeenCalledTimes(4); // base + 3 attempts
    });
  });
});

describe("findNextAvailableSlug", () => {
  describe("basic functionality", () => {
    it("returns base slug when no entries exist", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([]);

      const result = await findNextAvailableSlug("my-post", prefixQueryFn);

      expect(result).toBe("my-post");
    });

    it("returns base slug when only unrelated entries exist", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "e1", slug: "other-post" },
        { _id: "e2", slug: "another-post" },
      ]);

      const result = await findNextAvailableSlug("my-post", prefixQueryFn);

      expect(result).toBe("my-post");
    });

    it("returns slug-1 when base slug exists", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "e1", slug: "my-post" },
      ]);

      const result = await findNextAvailableSlug("my-post", prefixQueryFn);

      expect(result).toBe("my-post-1");
    });

    it("finds the next available number", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "e1", slug: "post" },
        { _id: "e2", slug: "post-1" },
        { _id: "e3", slug: "post-2" },
      ]);

      const result = await findNextAvailableSlug("post", prefixQueryFn);

      expect(result).toBe("post-3");
    });

    it("fills gaps in numbering", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "e1", slug: "post" },
        { _id: "e2", slug: "post-1" },
        { _id: "e3", slug: "post-3" }, // Gap at 2
        { _id: "e4", slug: "post-5" }, // Gap at 4
      ]);

      const result = await findNextAvailableSlug("post", prefixQueryFn);

      expect(result).toBe("post-2"); // Fills the first gap
    });
  });

  describe("soft-deleted entries", () => {
    it("ignores soft-deleted entries", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "e1", slug: "my-post", deletedAt: 1234567890 },
      ]);

      const result = await findNextAvailableSlug("my-post", prefixQueryFn);

      expect(result).toBe("my-post"); // Base is available (deleted entry ignored)
    });
  });

  describe("excludeEntryId option", () => {
    it("excludes specified entry from check", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "entry123", slug: "my-post" },
      ]);

      const result = await findNextAvailableSlug("my-post", prefixQueryFn, {
        excludeEntryId: "entry123",
      });

      expect(result).toBe("my-post");
    });
  });

  describe("custom separator", () => {
    it("works with underscore separator", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([
        { _id: "e1", slug: "my_post" },
        { _id: "e2", slug: "my_post_1" },
      ]);

      const result = await findNextAvailableSlug("my_post", prefixQueryFn, {
        separator: "_",
      });

      expect(result).toBe("my_post_2");
    });
  });

  describe("invalid base slug normalization", () => {
    it("normalizes invalid slugs before processing", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([]);

      const result = await findNextAvailableSlug("My Post!", prefixQueryFn);

      expect(result).toBe("my-post");
    });

    it("uses untitled for empty slugs", async () => {
      const prefixQueryFn: SlugPrefixQueryFn = vi.fn().mockResolvedValue([]);

      const result = await findNextAvailableSlug("", prefixQueryFn);

      expect(result).toBe("untitled");
    });
  });
});

describe("validateSlugFormat", () => {
  describe("valid slugs", () => {
    it("returns empty array for valid slugs", () => {
      expect(validateSlugFormat("hello-world")).toEqual([]);
      expect(validateSlugFormat("my-post-123")).toEqual([]);
      expect(validateSlugFormat("a")).toEqual([]);
      expect(validateSlugFormat("123")).toEqual([]);
    });
  });

  describe("required validation", () => {
    it("returns error for empty string", () => {
      const errors = validateSlugFormat("");
      expect(errors).toContain("Slug is required");
    });

    it("returns error for null/undefined", () => {
      expect(validateSlugFormat(null as unknown as string)).toContain("Slug is required");
      expect(validateSlugFormat(undefined as unknown as string)).toContain("Slug is required");
    });
  });

  describe("length validation", () => {
    it("returns error for slugs over 100 characters", () => {
      const longSlug = "a".repeat(101);
      const errors = validateSlugFormat(longSlug);
      expect(errors).toContain("Slug must be 100 characters or less");
    });

    it("accepts slugs of exactly 100 characters", () => {
      const exactSlug = "a".repeat(100);
      const errors = validateSlugFormat(exactSlug);
      expect(errors).not.toContain("Slug must be 100 characters or less");
    });
  });

  describe("case validation", () => {
    it("returns error for uppercase characters", () => {
      const errors = validateSlugFormat("Hello-World");
      expect(errors).toContain("Slug must be lowercase");
    });
  });

  describe("separator validation", () => {
    it("returns error for leading separator", () => {
      const errors = validateSlugFormat("-hello-world");
      expect(errors).toContain("Slug cannot start with '-'");
    });

    it("returns error for trailing separator", () => {
      const errors = validateSlugFormat("hello-world-");
      expect(errors).toContain("Slug cannot end with '-'");
    });

    it("returns error for consecutive separators", () => {
      const errors = validateSlugFormat("hello--world");
      expect(errors).toContain("Slug cannot contain consecutive '-' characters");
    });
  });

  describe("character validation", () => {
    it("returns error for spaces", () => {
      const errors = validateSlugFormat("hello world");
      expect(errors).toContain("Slug can only contain lowercase letters, numbers, and hyphens");
    });

    it("returns error for special characters", () => {
      const errors = validateSlugFormat("hello@world");
      expect(errors).toContain("Slug can only contain lowercase letters, numbers, and hyphens");
    });

    it("returns error for underscores with default separator", () => {
      const errors = validateSlugFormat("hello_world");
      expect(errors).toContain("Slug can only contain lowercase letters, numbers, and hyphens");
    });
  });

  describe("custom separator", () => {
    it("validates with underscore separator", () => {
      expect(validateSlugFormat("hello_world", "_")).toEqual([]);
      expect(validateSlugFormat("_hello_world", "_")).toContain("Slug cannot start with '_'");
      expect(validateSlugFormat("hello__world", "_")).toContain(
        "Slug cannot contain consecutive '_' characters"
      );
    });
  });

  describe("multiple errors", () => {
    it("returns all applicable errors", () => {
      const errors = validateSlugFormat("-Hello--World-");
      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain("Slug must be lowercase");
      expect(errors).toContain("Slug cannot start with '-'");
      expect(errors).toContain("Slug cannot end with '-'");
      expect(errors).toContain("Slug cannot contain consecutive '-' characters");
    });
  });
});
