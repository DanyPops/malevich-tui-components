import { describe, expect, it } from "bun:test";
import { firstDistinctStyle } from "../src/style-cascade.ts";

describe("firstDistinctStyle", () => {
	it("returns the first candidate that differs from the baseline", () => {
		expect(firstDistinctStyle("plain", ["plain", "plain", "styled"], "fallback")).toBe("styled");
	});

	it("skips undefined candidates", () => {
		expect(firstDistinctStyle("plain", [undefined, "styled"], "fallback")).toBe("styled");
	});

	it("returns fallback when every candidate matches the baseline or is undefined", () => {
		expect(firstDistinctStyle("plain", ["plain", undefined, "plain"], "fallback")).toBe("fallback");
	});

	it("returns fallback for an empty candidate list", () => {
		expect(firstDistinctStyle("plain", [], "fallback")).toBe("fallback");
	});
});
