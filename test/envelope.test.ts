import { describe, expect, it } from "bun:test";
import { Envelope } from "../src/components/envelope.ts";

describe("Envelope", () => {
	it("renders just the title bar when no content has been set, regardless of collapsed state", () => {
		const env = new Envelope({ title: "Details" });
		const lines = env.render(20);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain("Details");
		expect(lines[0]).toStartWith("╭");
		expect(lines[0]).toEndWith("╮");
	});

	it("renders content inside the border when expanded with content set", () => {
		const env = new Envelope({ title: "T", collapsed: false });
		env.setContent({ render: () => ["hello"], invalidate: () => {} });
		const lines = env.render(20);
		expect(lines).toHaveLength(3); // top, content, bottom
		expect(lines[1]).toContain("hello");
		expect(lines[1]).toStartWith("│");
		expect(lines[2]).toStartWith("╰");
	});

	it("uses the light border style", () => {
		const env = new Envelope({ title: "T", borderStyle: "light" });
		expect(env.render(10)[0]).toStartWith("┌");
	});

	it("uses the heavy border style", () => {
		const env = new Envelope({ title: "T", borderStyle: "heavy" });
		expect(env.render(10)[0]).toStartWith("┏");
	});

	it("toggle() flips collapsed state (default is expanded, unlike Collapsible)", () => {
		const env = new Envelope({ title: "T" });
		expect(env.collapsed).toBe(false);
		env.toggle();
		expect(env.collapsed).toBe(true);
	});

	it("setTitle() updates the rendered title bar", () => {
		const env = new Envelope({ title: "old" });
		env.setTitle("new");
		expect(env.render(20)[0]).toContain("new");
	});

	it("truncates a title too long for the available width", () => {
		const env = new Envelope({ title: "a very long title indeed" });
		expect(env.render(15)[0]).toContain("…");
	});

	it("pads shorter content lines to the inner width before the closing border", () => {
		const env = new Envelope({ title: "T", collapsed: false });
		env.setContent({ render: () => ["hi"], invalidate: () => {} });
		const lines = env.render(20);
		expect(lines[1]).toHaveLength(20);
	});

	it("invalidate() forwards to the content Component when set", () => {
		let invalidated = false;
		const env = new Envelope({ title: "T" });
		env.setContent({ render: () => [], invalidate: () => { invalidated = true; } });
		env.invalidate();
		expect(invalidated).toBe(true);
	});
});
