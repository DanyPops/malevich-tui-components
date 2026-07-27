import { describe, expect, it } from "bun:test";
import { legacyKeyMatcher } from "../src/key-matcher.ts";

describe("legacyKeyMatcher", () => {
	it("matches the legacy escape sequence for each recognized key", () => {
		expect(legacyKeyMatcher("\x1b[A", "up")).toBe(true);
		expect(legacyKeyMatcher("\x1b[B", "down")).toBe(true);
		expect(legacyKeyMatcher("\x1b[D", "left")).toBe(true);
		expect(legacyKeyMatcher("\x1b[C", "right")).toBe(true);
		expect(legacyKeyMatcher("\x1b", "escape")).toBe(true);
		expect(legacyKeyMatcher("\t", "tab")).toBe(true);
		expect(legacyKeyMatcher("\x7f", "backspace")).toBe(true);
		expect(legacyKeyMatcher("\b", "backspace")).toBe(true);
		expect(legacyKeyMatcher("\x1b[Z", "shift+tab")).toBe(true);
	});

	it("matches either \\r or \\n for enter", () => {
		expect(legacyKeyMatcher("\r", "enter")).toBe(true);
		expect(legacyKeyMatcher("\n", "enter")).toBe(true);
	});

	it("does not match an unrelated sequence", () => {
		expect(legacyKeyMatcher("a", "up")).toBe(false);
	});

	it("returns false for an unrecognized keyId rather than throwing", () => {
		expect(legacyKeyMatcher("\x1b[A", "ctrl+shift+p")).toBe(false);
	});
});
