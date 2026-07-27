import { describe, expect, it } from "bun:test";
import { Badge, formatBadgeCount } from "../src/components/badge.ts";

describe("formatBadgeCount", () => {
	it("renders 0 as \"0\"", () => expect(formatBadgeCount(0)).toBe("0"));
	it("renders small counts verbatim", () => expect(formatBadgeCount(42)).toBe("42"));
	it("abbreviates thousands with one decimal", () => expect(formatBadgeCount(1_500)).toBe("1.5k"));
	it("abbreviates ten-thousands+ as a rounded k", () => expect(formatBadgeCount(12_345)).toBe("12k"));
	it("abbreviates millions with one decimal", () => expect(formatBadgeCount(2_000_000)).toBe("2.0M"));
});

describe("Badge", () => {
	it("renders just the formatted count with no label", () => {
		const badge = new Badge();
		badge.setValue(5);
		expect(badge.render(80)).toEqual(["5"]);
	});

	it("prefixes the label when provided", () => {
		const badge = new Badge({ label: "Unread" });
		badge.setValue(1_500);
		expect(badge.render(80)).toEqual(["Unread: 1.5k"]);
	});

	it("applies a custom style function", () => {
		const badge = new Badge({ style: (s) => `[${s}]` });
		expect(badge.render(80)).toEqual(["[0]"]);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const badge = new Badge();
		expect(typeof badge.render).toBe("function");
		expect(() => badge.invalidate()).not.toThrow();
	});
});
