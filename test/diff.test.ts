import { describe, expect, it } from "bun:test";
import { classifyDiffLine, renderDiffLines } from "../src/components/diff.js";

const plainTheme = {
	add: (s: string) => `[+]${s}`,
	remove: (s: string) => `[-]${s}`,
	context: (s: string) => `[ ]${s}`,
	hunk: (s: string) => `[@]${s}`,
	header: (s: string) => `[#]${s}`,
};

const REAL_DIFF = [
	"diff --git a/src/greet.ts b/src/greet.ts",
	"index 1111111..2222222 100644",
	"--- a/src/greet.ts",
	"+++ b/src/greet.ts",
	"@@ -1,3 +1,3 @@",
	" function greet(name: string) {",
	"-  return `Hi ${name}`;",
	"+  return `Hello, ${name}!`;",
	" }",
].join("\n");

describe("classifyDiffLine", () => {
	it("classifies a hunk header", () => {
		expect(classifyDiffLine("@@ -1,3 +1,3 @@")).toBe("hunk");
	});

	it("classifies file-header lines (+++/---) as header, never as add/remove -- the naive single-character-prefix check would misread these", () => {
		expect(classifyDiffLine("--- a/src/greet.ts")).toBe("header");
		expect(classifyDiffLine("+++ b/src/greet.ts")).toBe("header");
	});

	it("classifies diff --git and index lines as header", () => {
		expect(classifyDiffLine("diff --git a/src/greet.ts b/src/greet.ts")).toBe("header");
		expect(classifyDiffLine("index 1111111..2222222 100644")).toBe("header");
	});

	it("classifies a real added line as add", () => {
		expect(classifyDiffLine("+  return `Hello, ${name}!`;")).toBe("add");
	});

	it("classifies a real removed line as remove", () => {
		expect(classifyDiffLine("-  return `Hi ${name}`;")).toBe("remove");
	});

	it("classifies a space-prefixed context line as context", () => {
		expect(classifyDiffLine(" function greet(name: string) {")).toBe("context");
	});

	it("classifies a truly empty line as context, not other -- git diff emits blank context lines with no trailing space", () => {
		expect(classifyDiffLine("")).toBe("context");
	});

	it("classifies a no-newline marker as other", () => {
		expect(classifyDiffLine("\\ No newline at end of file")).toBe("other");
	});
});

describe("renderDiffLines", () => {
	it("returns an empty array for empty diff text", () => {
		expect(renderDiffLines(80, "")).toEqual([]);
	});

	it("styles every line kind distinctly through the given theme, 1:1 with the input lines", () => {
		const lines = renderDiffLines(80, REAL_DIFF, plainTheme);
		expect(lines).toEqual([
			"[#]diff --git a/src/greet.ts b/src/greet.ts",
			"[#]index 1111111..2222222 100644",
			"[#]--- a/src/greet.ts",
			"[#]+++ b/src/greet.ts",
			"[@]@@ -1,3 +1,3 @@",
			"[ ] function greet(name: string) {",
			"[-]-  return `Hi ${name}`;",
			"[+]+  return `Hello, ${name}!`;",
			"[ ] }",
		]);
	});

	it("falls back to plain pass-through styling when no theme is given", () => {
		const lines = renderDiffLines(80, "+added\n-removed\n context");
		expect(lines).toEqual(["+added", "-removed", " context"]);
	});

	it("never returns a line wider than the given width, even for a single very long changed line", () => {
		const longDiff = `+${"x".repeat(500)}`;
		const lines = renderDiffLines(40, longDiff, plainTheme);
		expect(lines).toHaveLength(1);
		expect(lines[0]!.length).toBeLessThanOrEqual(40);
	});

	it("strips exactly one trailing newline instead of manufacturing a spurious empty final line", () => {
		const lines = renderDiffLines(80, `${REAL_DIFF}\n`, plainTheme);
		expect(lines).toHaveLength(REAL_DIFF.split("\n").length);
	});
});
