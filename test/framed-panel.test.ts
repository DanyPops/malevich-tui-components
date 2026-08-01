import { describe, expect, it } from "bun:test";
import { renderFramedPanel } from "../src/components/framed-panel.ts";

describe("renderFramedPanel", () => {
	it("wraps contentLines between a styled top and bottom rule of the given width", () => {
		const lines = renderFramedPanel({ width: 5, rule: "-", ruleStyle: (s) => s, contentLines: ["a", "b"] });
		expect(lines).toEqual(["-----", "a", "b", "-----"]);
	});

	it("places titleLines directly under the top rule, before contentLines", () => {
		const lines = renderFramedPanel({ width: 3, rule: "-", ruleStyle: (s) => s, titleLines: ["Title"], contentLines: ["body"] });
		expect(lines).toEqual(["---", "Title", "body", "---"]);
	});

	it("places footerLines directly above the bottom rule, after contentLines", () => {
		const lines = renderFramedPanel({ width: 3, rule: "-", ruleStyle: (s) => s, contentLines: ["body"], footerLines: ["help"] });
		expect(lines).toEqual(["---", "body", "help", "---"]);
	});

	it("applies ruleStyle only to the repeated rule, not to title/content/footer lines", () => {
		const lines = renderFramedPanel({
			width: 3,
			rule: "-",
			ruleStyle: (s) => `[${s}]`,
			titleLines: ["T"],
			contentLines: ["C"],
			footerLines: ["F"],
		});
		expect(lines).toEqual(["[---]", "T", "C", "F", "[---]"]);
	});

	it("clamps width to at least 1 for the rule", () => {
		const lines = renderFramedPanel({ width: 0, rule: "-", ruleStyle: (s) => s, contentLines: [] });
		expect(lines).toEqual(["-", "-"]);
	});

	// A panel nested inside another already-bordered container (e.g. a Dialog
	// rendered as an Envelope's own content) doesn't need its own top/bottom
	// rule -- two sets of horizontal rules back-to-back read as a redundant
	// double border. Omitting `rule` entirely skips both, with no placeholder.
	it("omits both rules entirely when rule is not given -- for nesting inside an already-framed container", () => {
		const lines = renderFramedPanel({ width: 5, titleLines: ["Title"], contentLines: ["body"], footerLines: ["help"] });
		expect(lines).toEqual(["Title", "body", "help"]);
	});
});
