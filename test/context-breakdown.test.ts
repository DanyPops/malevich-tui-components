import { describe, expect, it } from "bun:test";
import {
	buildContextRows,
	renderContextRowLines,
	renderContextUsageBar,
	type ContextBarTheme,
	type ContextRowsTheme,
	type ContextSegment,
} from "../src/components/context-breakdown.ts";

const ROWS_THEME: ContextRowsTheme = {
	colorFor: (key) => (s) => `[${key}]${s}`,
	header: (s) => `**${s}**`,
};

const BAR_THEME: ContextBarTheme = {
	colorFor: (key) => (s) => `[${key}]${s}`,
	empty: (s) => `(${s})`,
};

describe("buildContextRows", () => {
	it("drops a genuinely-zero segment with no items", () => {
		const segments: ContextSegment[] = [{ key: "empty", label: "Empty", estimatedTokens: 0 }];
		expect(buildContextRows(segments)).toEqual([]);
	});

	it("keeps a segment marked unknown even at zero, since that means not-yet-measured, not measured-and-empty", () => {
		const segments: ContextSegment[] = [{ key: "basePrompt", label: "Base prompt", estimatedTokens: 0, unknown: true }];
		const rows = buildContextRows(segments);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.isHeader).toBe(true);
	});

	it("keeps a nonzero segment even when every one of its items individually rounds to zero", () => {
		const segments: ContextSegment[] = [{ key: "x", label: "X", estimatedTokens: 50, items: [{ label: "tiny", estimatedTokens: 0 }] }];
		const rows = buildContextRows(segments);
		expect(rows).toHaveLength(1); // header only -- the zero item itself is filtered
		expect(rows[0]!.text).toContain("50 tok");
	});

	it("sorts items biggest-first and computes each segment's percent against the real total, not the segment sum", () => {
		const segments: ContextSegment[] = [
			{ key: "a", label: "A", estimatedTokens: 100, items: [{ label: "small", estimatedTokens: 10 }, { label: "big", estimatedTokens: 90 }] },
		];
		const rows = buildContextRows(segments, 1000); // real total far larger than the segment's own 100
		expect(rows[0]!.text).toContain("(10.0%)"); // 100/1000, not 100/100
		expect(rows[1]!.text).toContain("big");
		expect(rows[2]!.text).toContain("small");
	});

	it("flattens real tree children directly under their parent item, biggest child first, never scrambled by a global sort", () => {
		const segments: ContextSegment[] = [
			{
				key: "messageHistory",
				label: "History",
				estimatedTokens: 300,
				items: [{ label: "branch-1", estimatedTokens: 300, children: [{ label: "leaf-a", estimatedTokens: 100 }, { label: "leaf-b", estimatedTokens: 200 }] }],
			},
		];
		const rows = buildContextRows(segments);
		expect(rows.map((r) => r.text.includes("leaf-b") ? "leaf-b" : r.text.includes("leaf-a") ? "leaf-a" : r.text.includes("branch-1") ? "branch-1" : "header")).toEqual([
			"header",
			"branch-1",
			"leaf-b",
			"leaf-a",
		]);
		expect(rows[2]!.depth).toBe(2);
	});
});

describe("renderContextRowLines", () => {
	it("styles a header row distinctly from an indented item row, both through the row's own color", () => {
		const rows = buildContextRows([{ key: "rules", label: "Rules", estimatedTokens: 50, items: [{ label: "item", estimatedTokens: 50 }] }]);
		const lines = renderContextRowLines(rows, 200, ROWS_THEME);
		expect(lines[0]).toContain("[rules]");
		expect(lines[0]).toContain("**Rules");
		expect(lines[1]).toContain("  "); // indented item
		expect(lines[1]).not.toContain("**");
	});

	it("truncates a row to the given width", () => {
		const rows = buildContextRows([{ key: "x", label: "X".repeat(300), estimatedTokens: 5 }]);
		const lines = renderContextRowLines(rows, 20, ROWS_THEME);
		expect(lines[0]!.length).toBeLessThanOrEqual(20);
	});
});

describe("renderContextUsageBar", () => {
	it("renders an entirely empty track when nothing has been observed yet, not a divide-by-zero", () => {
		expect(renderContextUsageBar(BAR_THEME, [], 10)).toBe(`(${"░".repeat(10)})`);
	});

	it("splits used cells proportionally across segments and fills the remainder as empty, honoring a real capacity distinct from the segment sum", () => {
		const segments: ContextSegment[] = [{ key: "a", label: "A", estimatedTokens: 90 }, { key: "b", label: "B", estimatedTokens: 10 }];
		const bar = renderContextUsageBar(BAR_THEME, segments, 20, 200, 100); // 100/200 = half the bar used
		const usedCells = (bar.match(/█/g) ?? []).length;
		const emptyCells = (bar.match(/░/g) ?? []).length;
		expect(usedCells).toBe(10);
		expect(emptyCells).toBe(10);
	});

	it("guarantees a tiny nonzero segment still gets at least one visible cell next to a much larger one", () => {
		const segments: ContextSegment[] = [{ key: "big", label: "Big", estimatedTokens: 9_999 }, { key: "tiny", label: "Tiny", estimatedTokens: 1 }];
		const bar = renderContextUsageBar(BAR_THEME, segments, 10);
		expect(bar).toContain("[tiny]");
	});
});
