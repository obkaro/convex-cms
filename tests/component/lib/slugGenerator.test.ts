import { describe, it, expect, vi } from "vitest";
import {
	generateSlug,
	isValidSlug,
	generateUniqueSlug,
} from "../../../src/component/lib/slugGenerator.js";

describe("generateSlug", () => {
	describe("basic functionality", () => {
		it("converts simple strings to lowercase slugs", () => {
			expect(generateSlug("Hello World")).toBe("hello-world");
		});

		it("handles empty strings", () => {
			expect(generateSlug("")).toBe("");
		});

		it("handles null/undefined gracefully", () => {
			expect(generateSlug((null as unknown) as string)).toBe("");
			expect(generateSlug((undefined as unknown) as string)).toBe("");
		});

		it("trims leading and trailing whitespace", () => {
			expect(generateSlug("  Hello World  ")).toBe("hello-world");
		});

		it("collapses multiple spaces into single separator", () => {
			expect(generateSlug("Hello    World")).toBe("hello-world");
		});

		it("removes leading and trailing separators", () => {
			expect(generateSlug("-Hello World-")).toBe("hello-world");
		});
	});

	describe("special characters", () => {
		it("removes punctuation marks", () => {
			expect(generateSlug("Hello, World!")).toBe("hello-world");
			expect(generateSlug("What's up?")).toBe("whats-up");
		});

		it("handles ampersand", () => {
			expect(generateSlug("Rock & Roll")).toBe("rock-and-roll");
		});

		it("handles at symbol", () => {
			expect(generateSlug("Email @ Work")).toBe("email-at-work");
		});

		it("handles various symbols", () => {
			expect(generateSlug("100% Pure")).toBe("100percent-pure");
			expect(generateSlug("1 + 1 = 2")).toBe("1-plus-1-equals-2");
		});

		it("handles parentheses and brackets", () => {
			expect(generateSlug("Hello (World)")).toBe("hello-world");
			expect(generateSlug("Test [Value]")).toBe("test-value");
		});
	});

	describe("unicode and international characters", () => {
		it("handles German umlauts", () => {
			expect(generateSlug("Über Größe")).toBe("ueber-groesse");
			expect(generateSlug("Fußball")).toBe("fussball");
		});

		it("handles French accents", () => {
			expect(generateSlug("Café Résumé")).toBe("cafe-resume");
			expect(generateSlug("Garçon")).toBe("garcon");
		});

		it("handles Spanish characters", () => {
			expect(generateSlug("Señor Niño")).toBe("senor-nino");
		});

		it("handles Nordic characters", () => {
			expect(generateSlug("Ålborg Øresund")).toBe("alborg-oresund");
		});

		it("handles Polish characters", () => {
			expect(generateSlug("Łódź")).toBe("lodz");
		});

		it("handles accented characters via normalization", () => {
			expect(generateSlug("naïve")).toBe("naive");
			expect(generateSlug("résumé")).toBe("resume");
		});
	});

	describe("options", () => {
		it("respects maxLength option", () => {
			const slug = generateSlug(
				"This is a very long title that should be truncated",
				{
					maxLength: 20,
				},
			);
			expect(slug.length).toBeLessThanOrEqual(20);
			expect(slug).toBe("this-is-a-very-long");
		});

		it("truncates at word boundary when possible", () => {
			const slug = generateSlug("hello world testing", { maxLength: 15 });
			expect(slug).toBe("hello-world");
		});

		it("allows custom separator", () => {
			expect(generateSlug("Hello World", { separator: "_" })).toBe(
				"hello_world",
			);
		});

		it("can preserve case when lowercase is false", () => {
			expect(generateSlug("Hello World", { lowercase: false })).toBe(
				"Hello-World",
			);
		});

		it("allows custom replacements", () => {
			const slug = generateSlug("5 Stars", {
				customReplacements: { "5": "five" },
			});
			expect(slug).toBe("five-stars");
		});

		it("custom replacements override defaults", () => {
			const slug = generateSlug("Rock & Roll", {
				customReplacements: { "&": "n" },
			});
			expect(slug).toBe("rock-n-roll");
		});
	});

	describe("edge cases", () => {
		it("handles numbers", () => {
			expect(generateSlug("2026 Annual Report")).toBe("2026-annual-report");
		});

		it("handles mixed case", () => {
			expect(generateSlug("CamelCase Title")).toBe("camelcase-title");
		});

		it("handles already valid slugs", () => {
			expect(generateSlug("already-a-slug")).toBe("already-a-slug");
		});

		it("handles only special characters", () => {
			// @ -> at, # -> hash, % -> percent
			// ! and $ are removed (not in replacement map)
			// No spaces between them, so replacements are concatenated
			expect(generateSlug("!@#$%")).toBe("athash-percent");
		});

		it("handles only whitespace", () => {
			expect(generateSlug("   ")).toBe("");
		});

		it("handles very long single word", () => {
			const longWord = "a".repeat(150);
			const slug = generateSlug(longWord, { maxLength: 100 });
			expect(slug.length).toBe(100);
		});
	});
});

describe("isValidSlug", () => {
	it("validates correct slugs", () => {
		expect(isValidSlug("hello-world")).toBe(true);
		expect(isValidSlug("hello")).toBe(true);
		expect(isValidSlug("hello-world-123")).toBe(true);
		expect(isValidSlug("123")).toBe(true);
	});

	it("rejects invalid slugs", () => {
		expect(isValidSlug("Hello-World")).toBe(false); // uppercase
		expect(isValidSlug("hello--world")).toBe(false); // double separator
		expect(isValidSlug("-hello-world")).toBe(false); // leading separator
		expect(isValidSlug("hello-world-")).toBe(false); // trailing separator
		expect(isValidSlug("hello world")).toBe(false); // space
		expect(isValidSlug("hello_world")).toBe(false); // underscore (wrong separator)
		expect(isValidSlug("")).toBe(false); // empty
	});

	it("respects custom separator", () => {
		expect(isValidSlug("hello_world", "_")).toBe(true);
		expect(isValidSlug("hello-world", "_")).toBe(false);
	});

	it("handles null/undefined", () => {
		expect(isValidSlug((null as unknown) as string)).toBe(false);
		expect(isValidSlug((undefined as unknown) as string)).toBe(false);
	});
});

describe("generateUniqueSlug", () => {
	it("returns base slug if already unique", async () => {
		const isUnique = vi.fn().mockResolvedValue(true);
		const result = await generateUniqueSlug("hello-world", isUnique);
		expect(result).toBe("hello-world");
		expect(isUnique).toHaveBeenCalledTimes(1);
		expect(isUnique).toHaveBeenCalledWith("hello-world");
	});

	it("appends numeric suffix if base is not unique", async () => {
		const isUnique = vi
			.fn()
			.mockResolvedValueOnce(false) // hello-world
			.mockResolvedValueOnce(false) // hello-world-1
			.mockResolvedValueOnce(true); // hello-world-2
		const result = await generateUniqueSlug("hello-world", isUnique);
		expect(result).toBe("hello-world-2");
		expect(isUnique).toHaveBeenCalledTimes(3);
	});

	it("falls back to timestamp after max attempts", async () => {
		const isUnique = vi.fn().mockResolvedValue(false);
		const result = await generateUniqueSlug("hello-world", isUnique, 3);
		expect(result).toMatch(/^hello-world-[a-z0-9]+$/);
		expect(isUnique).toHaveBeenCalledTimes(4); // base + 3 attempts
	});

	it("respects custom maxAttempts", async () => {
		let callCount = 0;
		const isUnique = vi.fn().mockImplementation(() => {
			callCount++;
			return Promise.resolve(callCount === 6);
		});
		const result = await generateUniqueSlug("test", isUnique, 10);
		expect(result).toBe("test-5");
		expect(isUnique).toHaveBeenCalledTimes(6);
	});
});
