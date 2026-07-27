import { describe, expect, it } from "bun:test";
import { asciiTextMeasure } from "../src/text-measure.ts";

describe("asciiTextMeasure", () => {
	it("visibleWidth is the string length for plain ASCII", () => {
		expect(asciiTextMeasure.visibleWidth("hello")).toBe(5);
		expect(asciiTextMeasure.visibleWidth("")).toBe(0);
	});

	it("truncateToWidth returns the text unchanged when it already fits", () => {
		expect(asciiTextMeasure.truncateToWidth("hi", 10)).toBe("hi");
	});

	it("truncateToWidth truncates and appends the ellipsis when too long", () => {
		expect(asciiTextMeasure.truncateToWidth("hello world", 6)).toBe("hello…");
	});

	it("truncateToWidth with a custom ellipsis", () => {
		expect(asciiTextMeasure.truncateToWidth("hello world", 7, "...")).toBe("hell...");
	});

	it("truncateToWidth returns empty string for a non-positive width", () => {
		expect(asciiTextMeasure.truncateToWidth("hello", 0)).toBe("");
		expect(asciiTextMeasure.truncateToWidth("hello", -1)).toBe("");
	});

	it("truncateToWidth hard-cuts (no ellipsis) when the ellipsis itself doesn't fit", () => {
		expect(asciiTextMeasure.truncateToWidth("hello", 1, "…")).toBe("h");
	});
});
