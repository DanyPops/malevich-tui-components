import { describe, expect, it } from "bun:test";
import { type CardRowSpec, renderCardRow } from "../src/components/card-row.ts";
import { asciiTextMeasure } from "../src/text-measure.ts";

const visibleWidth = asciiTextMeasure.visibleWidth;

function fixedCard(label: string, lines: readonly string[]): CardRowSpec {
	return { label, render: () => [...lines] };
}

describe("renderCardRow", () => {
	it("returns [] for an empty spec list", () => {
		expect(renderCardRow([], 80)).toEqual([]);
	});

	it("1 card fills the FULL given width -- top/bottom borders and every content line all equal width", () => {
		const lines = renderCardRow([fixedCard("Tickets · Issues (4)", ["jira:CNF-25982  GNSS timing reference failure"])], 100);
		expect(lines.length).toBe(3); // top border, 1 content line, bottom border
		for (const line of lines) expect(visibleWidth(line)).toBe(100);
		expect(lines[0]).toContain("Tickets · Issues (4)");
		expect(lines[1]).toContain("jira:CNF-25982");
	});

	it("2 cards each stretch to roughly half the width, joined by exactly one row consuming the full width", () => {
		const lines = renderCardRow([fixedCard("Pipes · Jobs (3)", ["a job"]), fixedCard("Pipes · Approvals (1)", ["an approval"])], 100, {
			minCardWidth: 20,
		});
		for (const line of lines) expect(visibleWidth(line)).toBe(100);
		expect(lines[0]).toContain("Pipes · Jobs (3)");
		expect(lines[0]).toContain("Pipes · Approvals (1)");
	});

	it("3 cards all fit in ONE row on a wide-enough terminal", () => {
		const specs = [fixedCard("A", ["a"]), fixedCard("B", ["b"]), fixedCard("C", ["c"])];
		const lines = renderCardRow(specs, 160, { minCardWidth: 40 });
		// Every card's own top-border label appears on the SAME first line -- one row, not wrapped.
		expect(lines[0]).toContain("A");
		expect(lines[0]).toContain("B");
		expect(lines[0]).toContain("C");
		for (const line of lines) expect(visibleWidth(line)).toBe(160);
	});

	it("3 cards WRAP once the terminal is too narrow for 3 columns at minCardWidth -- the remainder row ALSO stretches to fill the full width, not left at leftover width", () => {
		const specs = [fixedCard("A", ["a"]), fixedCard("B", ["b"]), fixedCard("C", ["c"])];
		const lines = renderCardRow(specs, 100, { minCardWidth: 40 }); // only 2 columns fit at 40 each
		const joined = lines.join("\n");
		// A and B share the first row; C wraps to its own second row.
		expect(lines[0]).toContain("A");
		expect(lines[0]).toContain("B");
		expect(lines[0]).not.toContain("C");
		const cRowIndex = lines.findIndex((line) => line.includes("C"));
		expect(cRowIndex).toBeGreaterThan(0);
		// EVERY line in BOTH rows -- including C's own solo remainder row -- fills the full width.
		for (const line of lines) expect(visibleWidth(line)).toBe(100);
		expect(joined).toContain("A");
	});

	it("pads a shorter card's body with blank lines to the tallest card's height BEFORE framing -- every border in the row lands on the same physical output line", () => {
		// A real, live incident caught while drafting this design: padding a shorter card's own
		// content AFTER assembling its box misaligns that card's bottom border onto a row that still
		// has a taller sibling's own content, interleaving border and content on the same line.
		const short = fixedCard("Short", ["one line"]);
		const tall = fixedCard("Tall", ["line one", "line two", "line three"]);
		const lines = renderCardRow([short, tall], 100, { minCardWidth: 20 });
		// Exactly one top border row, 3 content rows (tallest card's own height), one bottom border row.
		expect(lines.length).toBe(5);
		const bottomBorderRow = lines[lines.length - 1]!;
		// Every card's own bottom-border corner (╰...╯) must appear on this SAME final line -- not
		// interleaved with a sibling's still-open content on an earlier line.
		expect(bottomBorderRow).toContain("╰");
		expect(bottomBorderRow).toContain("╯");
		expect((bottomBorderRow.match(/╰/g) ?? []).length).toBe(2);
		expect((bottomBorderRow.match(/╯/g) ?? []).length).toBe(2);
		// No earlier line accidentally contains a bottom-border corner (the exact misalignment bug).
		for (const line of lines.slice(0, -1)) {
			expect(line).not.toContain("╰");
			expect(line).not.toContain("╯");
		}
	});

	it("gives each card's render() the width it actually gets in the row it lands in, not a pre-guessed one", () => {
		const seen: number[] = [];
		const widthAware: CardRowSpec = {
			label: "Wide-aware",
			render: (width) => {
				seen.push(width);
				return ["x".repeat(width)];
			},
		};
		renderCardRow([widthAware], 100); // solo card: gets nearly the full width
		renderCardRow([widthAware, fixedCard("Other", ["y"])], 100, { minCardWidth: 20 }); // shares the row: gets roughly half
		expect(seen[0]).toBeGreaterThan(seen[1]!);
	});

	it("never renders a line wider than the given width, regardless of card content", () => {
		const long = fixedCard("A very long label that would overflow a narrow card".repeat(2), ["x".repeat(500)]);
		const lines = renderCardRow([long], 60);
		for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(60);
	});

	it("applies frameStyle to the border and each card's own style to its label text (reusing WidgetSection.style)", () => {
		const spec: CardRowSpec = { label: "Styled", render: () => ["body"], style: (s) => `<label>${s}</label>` };
		const lines = renderCardRow([spec], 80, { frameStyle: (s) => `<frame>${s}</frame>` });
		expect(lines[0]).toContain("<label>Styled</label>");
		expect(lines[0]).toContain("<frame>");
	});
});
