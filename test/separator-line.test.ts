import { describe, expect, it } from "bun:test";
import { SeparatorLine } from "../src/components/separator-line.ts";

describe("SeparatorLine", () => {
	it("renders a plain full-width rule with no labels", () => {
		const line = new SeparatorLine();
		expect(line.render(10)).toEqual(["─".repeat(10)]);
	});

	it("uses the requested weight's glyph", () => {
		const line = new SeparatorLine({ weight: "thick" });
		expect(line.render(5)).toEqual(["━".repeat(5)]);
	});

	it("embeds a left label with corners preserved on both ends", () => {
		const line = new SeparatorLine({ label: "Title" });
		const [rendered] = line.render(20);
		expect(rendered?.startsWith("─")).toBe(true);
		expect(rendered).toContain("Title");
		expect(rendered).toHaveLength(20);
	});

	it("embeds a right label via labelAlign", () => {
		const line = new SeparatorLine({ label: "Right", labelAlign: "right" });
		const [rendered] = line.render(20);
		expect(rendered).toContain("Right");
		expect(rendered?.endsWith("─")).toBe(true);
	});

	it("embeds independent left and right labels via setLeftLabel/setRightLabel", () => {
		const line = new SeparatorLine();
		line.setLeftLabel("L");
		line.setRightLabel("R");
		const [rendered] = line.render(30);
		expect(rendered).toContain("L");
		expect(rendered).toContain("R");
	});

	it("truncates a label too long to fit within the available width", () => {
		const line = new SeparatorLine({ label: "a very long title that will not fit" });
		const [rendered] = line.render(15);
		expect(rendered).toHaveLength(15);
		expect(rendered).toContain("…");
	});

	it("returns a single empty line for a non-positive width", () => {
		expect(new SeparatorLine({ label: "x" }).render(0)).toEqual([""]);
	});

	it("applies a style function", () => {
		const line = new SeparatorLine({ style: (s) => `<${s}>` });
		expect(line.render(3)[0]).toStartWith("<");
	});

	it("setLabel (deprecated) sets the left label by default, or the right when labelAlign is right", () => {
		const left = new SeparatorLine();
		left.setLabel("L");
		expect(left.render(10)[0]).toContain("L");

		const right = new SeparatorLine({ labelAlign: "right" });
		right.setLabel("R");
		expect(right.render(10)[0]).toContain("R");
	});

	it("implements the Component interface (render + invalidate)", () => {
		const line = new SeparatorLine();
		expect(typeof line.render).toBe("function");
		expect(() => line.invalidate()).not.toThrow();
	});
});
