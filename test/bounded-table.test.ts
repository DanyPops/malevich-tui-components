import { describe, expect, it } from "bun:test";
import { renderBoundedTable } from "../src/components/bounded-table.ts";

const columns = [{ header: "id", key: "id" }];

function rows(count: number): Record<string, string>[] {
	return Array.from({ length: count }, (_, i) => ({ id: `row-${i}` }));
}

describe("renderBoundedTable", () => {
	it("renders every row untouched, with no more-line, when under the visible cap", () => {
		const component = renderBoundedTable({
			columns,
			rows: rows(3),
			expanded: false,
			visibleRowCount: 20,
			moreLine: (hidden) => `... ${hidden} more`,
		});
		const lines = component.render(80);
		expect(lines.join("\n")).toContain("row-0");
		expect(lines.join("\n")).toContain("row-2");
		expect(lines.join("\n")).not.toContain("more");
	});

	it("bounds rows to visibleRowCount and appends the caller's more-line, using the real hidden count", () => {
		const component = renderBoundedTable({
			columns,
			rows: rows(30),
			expanded: false,
			visibleRowCount: 20,
			moreLine: (hidden) => `... ${hidden} more`,
		});
		const lines = component.render(80);
		const text = lines.join("\n");
		expect(text).toContain("row-0");
		expect(text).toContain("row-19");
		expect(text).not.toContain("row-20");
		expect(text).toContain("... 10 more");
	});

	it("shows every row with no more-line when expanded is true, regardless of visibleRowCount", () => {
		const component = renderBoundedTable({
			columns,
			rows: rows(30),
			expanded: true,
			visibleRowCount: 5,
			moreLine: (hidden) => `... ${hidden} more`,
		});
		const text = component.render(80).join("\n");
		expect(text).toContain("row-29");
		expect(text).not.toContain("more");
	});

	it("truncates the more-line itself to the given width", () => {
		const component = renderBoundedTable({
			columns,
			rows: rows(30),
			expanded: false,
			visibleRowCount: 5,
			moreLine: () => "x".repeat(100),
		});
		const lines = component.render(20);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(20);
	});

	it("passes through Table's own options (headerStyle, measure, glyphs)", () => {
		let headerStyled = false;
		const component = renderBoundedTable({
			columns,
			rows: rows(2),
			expanded: false,
			visibleRowCount: 20,
			moreLine: (hidden) => `... ${hidden} more`,
			headerStyle: (s) => {
				headerStyled = true;
				return s;
			},
		});
		component.render(80);
		expect(headerStyled).toBe(true);
	});

	it("supports setRows for a mutable result-channel component, matching Table's own contract", () => {
		const component = renderBoundedTable({
			columns,
			rows: rows(3),
			expanded: false,
			visibleRowCount: 20,
			moreLine: (hidden) => `... ${hidden} more`,
		});
		component.setRows(rows(2));
		const text = component.render(80).join("\n");
		expect(text).toContain("row-1");
		expect(text).not.toContain("row-2");
	});
});
