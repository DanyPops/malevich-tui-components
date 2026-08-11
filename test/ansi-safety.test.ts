import { describe, expect, it } from "bun:test";
import { neutralizeEmbeddedFullResets } from "../src/ansi-safety.ts";

describe("neutralizeEmbeddedFullResets", () => {
	it("leaves plain text with no escape codes untouched", () => {
		expect(neutralizeEmbeddedFullResets("plain text")).toBe("plain text");
	});

	it("replaces a single embedded full reset with the non-background reset sequence", () => {
		expect(neutralizeEmbeddedFullResets("hi\x1b[0m")).toBe("hi\x1b[22;23;24;25;27;28;29;39m");
	});

	it("replaces every occurrence, not just the first", () => {
		const input = "a\x1b[0mb\x1b[0mc";
		expect(neutralizeEmbeddedFullResets(input)).toBe("a\x1b[22;23;24;25;27;28;29;39mb\x1b[22;23;24;25;27;28;29;39mc");
	});

	it("never leaves a bare \\x1b[0m in its output", () => {
		const input = "\x1b[31mred\x1b[0m plain \x1b[1mbold\x1b[0m";
		expect(neutralizeEmbeddedFullResets(input)).not.toContain("\x1b[0m");
	});

	it("leaves other SGR codes (color, bold) untouched", () => {
		const input = "\x1b[31mred\x1b[0m";
		expect(neutralizeEmbeddedFullResets(input)).toBe("\x1b[31mred\x1b[22;23;24;25;27;28;29;39m");
	});

	it("the replacement never itself contains a background reset code (49)", () => {
		expect(neutralizeEmbeddedFullResets("x\x1b[0m")).not.toContain(";49");
	});
});
