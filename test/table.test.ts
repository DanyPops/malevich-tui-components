import { describe, expect, it } from "bun:test";
import { asciiGlyphs } from "../src/glyphs.ts";
import { deriveTableColumns, Table } from "../src/components/table.ts";

describe("Table", () => {
	it("renders a header, separator, and one line per row", () => {
		const table = new Table({
			columns: [{ header: "Engine", key: "engine" }, { header: "Credits", key: "credits" }],
			rows: [{ engine: "tavily", credits: "2" }, { engine: "brave", credits: "0" }],
		});
		const lines = table.render(80);
		expect(lines).toHaveLength(4); // header + separator + 2 rows
		expect(lines[0]).toContain("Engine");
		expect(lines[0]).toContain("Credits");
		expect(lines[1]).toMatch(/^─+/);
		expect(lines[2]).toContain("tavily");
		expect(lines[3]).toContain("brave");
	});

	it("sizes each column to its widest header or cell", () => {
		const table = new Table({
			columns: [{ header: "X", key: "x" }],
			rows: [{ x: "a-much-longer-value" }],
		});
		const [header] = table.render(80);
		expect(header?.trimEnd()).toBe("X");
		// Column width is derived from the longest cell -- check via the separator's length.
		const [, separator] = table.render(80);
		expect(separator).toBe("─".repeat("a-much-longer-value".length));
	});

	it("respects a fixed column width and truncates longer content with an ellipsis", () => {
		const table = new Table({
			columns: [{ header: "Name", key: "name", width: 6 }],
			rows: [{ name: "a-very-long-value" }],
		});
		const lines = table.render(80);
		expect(lines[2]).toBe(`${"a-very".slice(0, 5)}…`);
	});

	it("right-aligns a column when requested", () => {
		const table = new Table({
			columns: [{ header: "N", key: "n", width: 5, align: "right" }],
			rows: [{ n: "7" }],
		});
		const lines = table.render(80);
		expect(lines[2]).toBe("    7");
	});

	it("shrinks the last column to fit when total width exceeds the viewport", () => {
		const table = new Table({
			columns: [
				{ header: "A", key: "a", width: 10 },
				{ header: "B", key: "b", width: 50 },
			],
			rows: [{ a: "x", b: "y" }],
		});
		const lines = table.render(20);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(20);
	});

	it("applies headerStyle and cellStyle when provided", () => {
		const table = new Table({
			columns: [{ header: "H", key: "h", width: 3 }],
			rows: [{ h: "v" }],
			headerStyle: (t) => `[${t}]`,
			cellStyle: (t, key) => `<${key}:${t}>`,
		});
		const lines = table.render(80);
		expect(lines[0]).toBe("[H  ]");
		expect(lines[2]).toBe("<h:v  >");
	});

	it("setRows() replaces the rendered rows without constructing a new Table", () => {
		const table = new Table({ columns: [{ header: "X", key: "x", width: 3 }], rows: [{ x: "a" }] });
		table.setRows([{ x: "b" }]);
		const lines = table.render(80);
		expect(lines[2]).toContain("b");
	});

	it("uses a custom TextMeasure when provided instead of the ASCII-only default", () => {
		let measured = 0;
		const table = new Table({
			columns: [{ header: "X", key: "x" }],
			rows: [{ x: "y" }],
			measure: {
				visibleWidth: (s) => { measured++; return s.length; },
				truncateToWidth: (s) => s,
			},
		});
		table.render(80);
		expect(measured).toBeGreaterThan(0);
	});

	it("renders an empty table (no rows) as just header and separator", () => {
		const table = new Table({ columns: [{ header: "X", key: "x" }], rows: [] });
		expect(table.render(80)).toHaveLength(2);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const table = new Table({ columns: [], rows: [] });
		expect(typeof table.render).toBe("function");
		expect(typeof table.invalidate).toBe("function");
		expect(() => table.invalidate()).not.toThrow();
	});

	it("draws its separator from an injected glyph set instead of the unicode default", () => {
		const table = new Table({ columns: [{ header: "X", key: "x" }], rows: [], glyphs: asciiGlyphs });
		expect(table.render(80)[1]).toBe("-".repeat(1));
	});
});

describe("deriveTableColumns", () => {
	it("returns undefined for an empty array", () => {
		expect(deriveTableColumns([])).toBeUndefined();
	});

	it("returns undefined when any item isn't a plain object", () => {
		expect(deriveTableColumns([{ a: 1 }, "not an object"])).toBeUndefined();
		expect(deriveTableColumns([{ a: 1 }, [1, 2]])).toBeUndefined();
		expect(deriveTableColumns([{ a: 1 }, null])).toBeUndefined();
	});

	it("unions keys across items and derives one column per key", () => {
		const derived = deriveTableColumns([{ id: "1", title: "First" }, { id: "2", extra: true }]);
		expect(derived?.columns.map((c) => c.key).sort()).toEqual(["extra", "id", "title"]);
	});

	it("keeps string values as-is and JSON-stringifies non-string values, filling missing keys with an empty string", () => {
		const derived = deriveTableColumns([{ id: "1", title: "First", tags: ["a", "b"] }, { id: "2", title: "Second" }]);
		expect(derived?.rows).toEqual([
			{ id: "1", title: "First", tags: '["a","b"]' },
			{ id: "2", title: "Second", tags: "" },
		]);
	});

	it("round-trips through a real Table render", () => {
		const derived = deriveTableColumns([{ id: "1", title: "First" }]);
		const table = new Table({ ...derived! });
		const text = table.render(80).join("\n");
		expect(text).toContain("First");
	});
});
