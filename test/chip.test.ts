import { describe, expect, it } from "bun:test";
import { Chip, formatChip } from "../src/components/chip.ts";

describe("formatChip", () => {
	it("defaults to bracket shape with no style", () => {
		expect(formatChip("In Progress")).toBe("[In Progress]");
	});

	it("wraps chevron shape", () => {
		expect(formatChip("backend", { shape: "chevron" })).toBe("\u2039backend\u203a");
	});

	it("plain shape applies no wrapping at all", () => {
		expect(formatChip("clean", { shape: "plain" })).toBe("clean");
	});

	it("prefixes an icon with a single space before the label", () => {
		expect(formatChip("approved", { icon: "\u2713" })).toBe("[\u2713 approved]");
	});

	it("applies a custom style function around the already-wrapped text", () => {
		expect(formatChip("done", { style: (s) => `<${s}>` })).toBe("<[done]>");
	});

	it("combines icon, plain shape, and style together", () => {
		expect(formatChip("clean", { icon: "\u2713", shape: "plain", style: (s) => s.toUpperCase() })).toBe("\u2713 CLEAN");
	});
});

describe("Chip", () => {
	it("renders its constructed label through formatChip's default bracket shape", () => {
		const chip = new Chip({ label: "TO DO" });
		expect(chip.render(80)).toEqual(["[TO DO]"]);
	});

	it("renders an empty label as empty brackets when never set", () => {
		const chip = new Chip();
		expect(chip.render(80)).toEqual(["[]"]);
	});

	it("setLabel updates what the next render produces", () => {
		const chip = new Chip({ label: "DRAFT" });
		chip.setLabel("MERGED");
		expect(chip.render(80)).toEqual(["[MERGED]"]);
	});

	it("passes icon/shape/style options through to formatChip", () => {
		const chip = new Chip({ label: "approved", icon: "\u2713", shape: "plain", style: (s) => `(${s})` });
		expect(chip.render(80)).toEqual(["(\u2713 approved)"]);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const chip = new Chip();
		expect(typeof chip.render).toBe("function");
		expect(() => chip.invalidate()).not.toThrow();
	});
});
