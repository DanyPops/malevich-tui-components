import { describe, expect, it } from "bun:test";
import { asciiGlyphs, unicodeGlyphs } from "../src/glyphs.ts";

describe("glyphs", () => {
	it("unicodeGlyphs and asciiGlyphs both define every line weight and tree connector", () => {
		for (const set of [unicodeGlyphs, asciiGlyphs]) {
			for (const weight of ["thin", "thick", "dotted", "dashed"] as const) {
				expect(typeof set.line[weight]).toBe("string");
				expect(set.line[weight].length).toBeGreaterThan(0);
			}
			for (const key of ["branch", "last", "pipe", "space"] as const) {
				expect(typeof set.tree[key]).toBe("string");
			}
		}
	});

	it("asciiGlyphs contains no non-ASCII characters", () => {
		const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s);
		expect(Object.values(asciiGlyphs.line).every(isAscii)).toBe(true);
		expect(Object.values(asciiGlyphs.tree).every(isAscii)).toBe(true);
	});

	it("unicodeGlyphs matches this library's original hardcoded characters, so it's a safe default", () => {
		expect(unicodeGlyphs.line.thin).toBe("─");
		expect(unicodeGlyphs.tree.branch).toBe("├── ");
		expect(unicodeGlyphs.tree.last).toBe("└── ");
	});
});
