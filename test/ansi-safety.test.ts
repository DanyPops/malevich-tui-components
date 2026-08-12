import { describe, expect, it } from "bun:test";
import { neutralizeEmbeddedFullResets, safeTruncateToWidth } from "../src/ansi-safety.ts";

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

describe("safeTruncateToWidth", () => {
	const fakeHostTruncate = (text: string, maxWidth: number) => `${text.slice(0, maxWidth)}\x1b[0m`;

	it("truncates via the host function, then neutralizes its embedded full reset", () => {
		expect(safeTruncateToWidth(fakeHostTruncate, "hello world", 5)).toBe("hello\x1b[22;23;24;25;27;28;29;39m");
	});

	it("passes ellipsis and pad through to the host function", () => {
		const spy = (text: string, maxWidth: number, ellipsis?: string, pad?: boolean) => {
			expect(ellipsis).toBe("...");
			expect(pad).toBe(true);
			return text.slice(0, maxWidth);
		};
		safeTruncateToWidth(spy, "hello", 3, "...", true);
	});

	it("degrades to the untruncated text instead of throwing when the host function isn't one", () => {
		expect(() => safeTruncateToWidth(undefined, "hello world", 5)).not.toThrow();
		expect(safeTruncateToWidth(undefined, "hello world", 5)).toBe("hello world");
	});

	it("still neutralizes an embedded full reset even when it fell back to the untruncated text", () => {
		expect(safeTruncateToWidth(undefined, "hi\x1b[0m", 5)).toBe("hi\x1b[22;23;24;25;27;28;29;39m");
	});
});
