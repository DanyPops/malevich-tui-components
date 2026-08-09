import { describe, expect, it } from "bun:test";
import { asciiGlyphs, unicodeGlyphs } from "../src/glyphs.ts";

function stringsIn(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(stringsIn);
	if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
	return [];
}

describe("glyphs", () => {
	it("unicodeGlyphs and asciiGlyphs define the same complete visual policy", () => {
		expect(Object.keys(asciiGlyphs)).toEqual(Object.keys(unicodeGlyphs));
		for (const set of [unicodeGlyphs, asciiGlyphs]) {
			expect(stringsIn(set).length).toBeGreaterThan(30);
			expect(stringsIn(set).every((glyph) => glyph.length > 0)).toBe(true);
		}
	});

	it("asciiGlyphs contains no non-ASCII characters at any nesting depth", () => {
		expect(stringsIn(asciiGlyphs).every((glyph) => /^[\x00-\x7F]*$/.test(glyph))).toBe(true);
	});

	it("unicodeGlyphs matches this library's original hardcoded characters, so it's a safe default", () => {
		expect(unicodeGlyphs.line.thin).toBe("─");
		expect(unicodeGlyphs.tree.branch).toBe("├── ");
		expect(unicodeGlyphs.tree.last).toBe("└── ");
	});
});
