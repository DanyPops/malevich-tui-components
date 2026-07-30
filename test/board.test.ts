import { describe, expect, it } from "bun:test";
import { Board, type BoardColumn } from "../src/components/board.ts";

const THEME = { header: (s: string) => s, border: (s: string) => s, empty: (s: string) => s };

function columns(overrides?: Partial<Record<"a" | "b" | "c", string[]>>): BoardColumn<string>[] {
	return [
		{ name: "A", items: overrides?.a ?? ["a1", "a2"] },
		{ name: "B", items: overrides?.b ?? ["b1"] },
		{ name: "C", items: overrides?.c ?? [] },
	];
}

function renderItem(item: string, _width: number, selected: boolean): string[] {
	return [selected ? `>${item}` : item];
}

describe("Board", () => {
	it("renders every column's header with its own item count and an empty label for a column with no items", () => {
		const board = new Board({ columns: columns(), renderItem, theme: THEME });
		const rendered = board.render(60).join("\n");
		expect(rendered).toContain("A: 2");
		expect(rendered).toContain("B: 1");
		expect(rendered).toContain("C: 0");
		expect(rendered).toContain("(empty)");
	});

	it("selects the first non-empty column's first item by default", () => {
		const board = new Board({ columns: columns({ a: [] }), renderItem, theme: THEME });
		expect(board.getSelection()).toEqual({ column: 1, index: 0 });
		expect(board.getSelectedItem()).toBe("b1");
	});

	it("down/up move the selection within a column, clamped at its edges", () => {
		const board = new Board({ columns: columns(), renderItem, theme: THEME });
		board.handleInput("\x1b[B");
		expect(board.getSelection()).toEqual({ column: 0, index: 1 });
		board.handleInput("\x1b[B"); // already at the last item -- stays put
		expect(board.getSelection()).toEqual({ column: 0, index: 1 });
		board.handleInput("\x1b[A");
		expect(board.getSelection()).toEqual({ column: 0, index: 0 });
	});

	it("right/left move across columns, skipping empty ones, and stop at the edges instead of wrapping", () => {
		const board = new Board({ columns: columns(), renderItem, theme: THEME }); // C is empty
		board.handleInput("\x1b[C"); // right: A -> B
		expect(board.getSelection().column).toBe(1);
		board.handleInput("\x1b[C"); // right: B -> C is empty, no non-empty column beyond it -- stays at B
		expect(board.getSelection().column).toBe(1);
		board.handleInput("\x1b[D"); // left: B -> A
		expect(board.getSelection().column).toBe(0);
		board.handleInput("\x1b[D"); // left of the first column -- stays put
		expect(board.getSelection().column).toBe(0);
	});

	it("enter calls onSelect with the currently selected item", () => {
		let selected: string | undefined;
		const board = new Board({ columns: columns(), renderItem, theme: THEME, onSelect: (item) => { selected = item; } });
		board.handleInput("\r");
		expect(selected).toBe("a1");
	});

	it("escape calls onClose", () => {
		let closed = false;
		const board = new Board({ columns: columns(), renderItem, theme: THEME, onClose: () => { closed = true; } });
		board.handleInput("\x1b");
		expect(closed).toBe(true);
	});

	it("highlights the selected card via renderItem's own `selected` flag", () => {
		const board = new Board({ columns: columns(), renderItem, theme: THEME });
		expect(board.render(60).join("\n")).toContain(">a1");
	});

	it("getItemRanges reports the row range each card occupies, reflecting the most recent render", () => {
		const board = new Board({ columns: columns(), renderItem, theme: THEME });
		board.render(60);
		const ranges = board.getItemRanges();
		expect(ranges[0]).toHaveLength(2); // column A has 2 items
		expect(ranges[1]).toHaveLength(1); // column B has 1 item
		expect(ranges[2]).toHaveLength(0); // column C is empty
		expect(ranges[0]?.[1]!.start).toBeGreaterThan(ranges[0]?.[0]!.end ?? -1);
	});

	it("pads every rendered row to the same total width, keeping columns aligned", () => {
		const board = new Board({ columns: columns(), renderItem, theme: THEME });
		const lines = board.render(60);
		const widths = new Set(lines.map((l) => l.length));
		expect(widths.size).toBe(1);
	});

	it("does not cap items per column -- every item is rendered so a selection can reach any of them", () => {
		const many = Array.from({ length: 50 }, (_, i) => `item-${i}`);
		const board = new Board({ columns: [{ name: "A", items: many }], renderItem, theme: THEME });
		const rendered = board.render(40).join("\n");
		expect(rendered).toContain("item-0");
		expect(rendered).toContain("item-49");
	});
});
