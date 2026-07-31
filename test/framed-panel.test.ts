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
});
