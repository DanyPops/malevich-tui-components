import { describe, expect, it } from "bun:test";
import { Board } from "../src/components/board.ts";
import { renderBox } from "../src/components/box.ts";
import { Collapsible } from "../src/components/collapsible.ts";
import { renderContextRowLines, renderContextUsageBar } from "../src/components/context-breakdown.ts";
import { HistoryChart } from "../src/components/history-chart.ts";
import { MaskedInput } from "../src/components/masked-input.ts";
import { Menu } from "../src/components/menu.ts";
import { MultiSelectList } from "../src/components/multi-select-list.ts";
import { ProgressBar } from "../src/components/progress-bar.ts";
import { ScrollView } from "../src/components/scroll-view.ts";
import { Spinner } from "../src/components/spinner.ts";
import { SplitPane } from "../src/components/split-pane.ts";
import { asciiGlyphs } from "../src/glyphs.ts";

const identity = (text: string): string => text;
const stateless = (lines: string[]) => ({ render: () => lines, invalidate: () => {} });

describe("shared glyph theme", () => {
	it("drives progress, spinner, disclosure, mask, and selection indicators", () => {
		expect(new ProgressBar({ value: 1, max: 2, width: 4, glyphTheme: asciiGlyphs }).format()).toBe("[##--]");
		expect(new Spinner({ glyphs: asciiGlyphs }).glyph()).toBe("|");
		expect(new Collapsible({ header: "Details", glyphs: asciiGlyphs }).render(20)).toEqual(["> Details"]);

		const input = new MaskedInput({ glyphs: asciiGlyphs });
		input.handleInput("secret");
		expect(input.render(20)).toEqual(["******"]);

		const list = new MultiSelectList({
			items: [{ value: "one", label: "One" }],
			glyphs: asciiGlyphs,
			theme: {
				cursor: identity,
				checked: identity,
				unchecked: identity,
				selectedLabel: identity,
				label: identity,
				description: identity,
				status: identity,
			},
		});
		expect(list.render(20)[0]).toBe("> 1. [ ] One");
	});

	it("drives frames, rules, dividers, scrollbars, and context bars", () => {
		expect(renderBox({ width: 6, lines: ["x"], glyphs: asciiGlyphs })).toEqual(["+----+", "|x   |", "+----+"]);

		const board = new Board({
			columns: [{ name: "Todo", items: [] }],
			renderItem: () => [],
			glyphs: asciiGlyphs,
			theme: { header: identity, border: identity, empty: identity },
		});
		expect(board.render(16)[1]).toBe("-".repeat(16));

		const menu = new Menu({
			items: [{ label: "Open", action: () => {} }],
			glyphs: asciiGlyphs,
			theme: { border: identity, selected: identity, normal: identity, dim: identity, title: identity },
		});
		expect(menu.render(12)[0]).toBe("-".repeat(12));

		const split = new SplitPane(stateless(["left"]), stateless(["right"]), {
			glyphs: asciiGlyphs,
			minLeftWidth: 2,
			minRightWidth: 2,
		});
		expect(split.render(12)[0]).toContain("|");

		const scroll = new ScrollView(stateless(["a", "b", "c"]), { maxHeight: 2, glyphs: asciiGlyphs });
		expect(scroll.render(5).every((line) => line.endsWith("#") || line.endsWith("."))).toBe(true);

		const contextTheme = { colorFor: () => identity, empty: identity };
		expect(renderContextUsageBar(contextTheme, [{ key: "a", label: "A", estimatedTokens: 5 }], 10, 10, 5, asciiGlyphs)).toBe("#####-----");
		expect(
			renderContextRowLines(
				[{ key: "a", isHeader: true, text: "A", depth: 0 }],
				10,
				{ colorFor: () => identity, header: identity },
				undefined,
				asciiGlyphs,
			),
		).toEqual(["| A"]);
	});

	it("drives every chart-owned drawing character", () => {
		const chart = new HistoryChart({
			title: "Usage",
			buckets: [{ start: 0, end: 1, total: 1, series: { a: 1 } }],
			series: [{ key: "a", label: "A" }],
			formatValue: String,
			formatAxisLabel: String,
			noDataText: "none",
			glyphs: asciiGlyphs,
			height: 2,
			theme: {
				title: identity,
				subtitle: identity,
				axis: identity,
				warningLine: identity,
				errorLine: identity,
				muted: identity,
				series: () => identity,
			},
		});
		const rendered = chart.render(30).join("\n");
		expect(rendered).not.toMatch(/[│─└┄■▁▂▃▄▅▆▇█]/);
		expect(rendered).toContain("*");
	});
});
