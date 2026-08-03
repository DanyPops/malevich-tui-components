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
		env.setContent({
			render: () => [],
			invalidate: () => {
				invalidated = true;
			},
		});
		env.invalidate();
		expect(invalidated).toBe(true);
	});

	// Real terminal styling is ANSI escape codes embedded directly in the
	// string -- the default asciiTextMeasure counts every escape byte as a
	// visible character, so it undercounts the padding a styled line needs.
	// Every existing test above uses plain unstyled content, which can never
	// catch this: it only shows up once a real theme (or anything else that
	// emits real ANSI) is in the picture. Confirmed live in pi-packed's own
	// panel, where this exact gap put the right border at a different column
	// on every row depending on how much styling that row happened to carry.
	const ansiOrange = (s: string) => `\u001b[38;5;208m${s}\u001b[0m`;
	function stripAnsi(s: string): string {
		return s.replace(/\u001b\[[0-9;]*m/g, "");
	}

	it("misaligns the right border when styled content is measured with the default ASCII-only measure", () => {
		const env = new Envelope({ title: "T", collapsed: false });
		// One styled line, one plain line of the same real visible length --
		// the ANSI escape bytes inflate only the styled line's raw .length.
		env.setContent({ render: () => [ansiOrange("short"), "short"], invalidate: () => {} });
		const lines = env.render(20);
		const visibleWidths = lines.slice(1, -1).map((line) => stripAnsi(line).length);
		expect(new Set(visibleWidths).size).toBeGreaterThan(1); // the actual bug: not all 20
	});

	it("aligns the right border correctly when an ANSI-aware measure is injected", () => {
		const ansiAwareMeasure = {
			visibleWidth: (text: string) => stripAnsi(text).length,
			truncateToWidth: (text: string, _maxWidth: number) => text, // not exercised by this fixture
		};
		const env = new Envelope({ title: "T", collapsed: false, measure: ansiAwareMeasure });
		env.setContent({ render: () => [ansiOrange("short"), "short"], invalidate: () => {} });
		const lines = env.render(20);
		const visibleWidths = lines.slice(1, -1).map((line) => stripAnsi(line).length);
		expect(new Set(visibleWidths)).toEqual(new Set([20])); // both lines land on the same real column
	});

	it("styles border segments independently so styled content cannot reset the closing border", () => {
		const env = new Envelope({
			title: "T",
			collapsed: false,
			style: (s) => `[${s}]`,
			titleStyle: (s) => `<${s}>`,
		});
		env.setContent({ render: () => ["{body}"], invalidate: () => {} });

		const lines = env.render(12);

		expect(lines[0]).toBe("[╭]< ▾ T >[─────╮]");
		expect(lines[1]).toBe("[│] {body}   [│]");
		expect(lines[2]).toBe("[╰──────────╯]");
	});
});
