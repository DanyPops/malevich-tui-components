import { describe, expect, it } from "bun:test";
import { deriveTableColumns, Table } from "../src/components/table.ts";
import { asciiGlyphs } from "../src/glyphs.ts";

describe("Table", () => {
	it("renders a header, separator, and one line per row", () => {
		const table = new Table({
			columns: [
				{ header: "Engine", key: "engine" },
				{ header: "Credits", key: "credits" },
			],
			rows: [
				{ engine: "tavily", credits: "2" },
				{ engine: "brave", credits: "0" },
			],
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

	// Real crash, reported live via Pi's own renderer: "Rendered line N exceeds
	// terminal width" -- Pi's TUI hard-fails (uncaughtException, whole session
	// exits) the moment any rendered line is wider than the real terminal.
	// Root cause: the old shrink pass only ever touched the LAST column,
	// assuming every other column was already reasonably sized -- true for a
	// typical 2-3 short-column table, false the moment an auto-derived table
	// (deriveTableColumns over arbitrary object rows, e.g. Papyrus notes with
	// a full-text `body` field) puts a huge natural-width column anywhere
	// OTHER than last. This is Pi's actual rendering rule, not a style
	// preference -- every column must be capped, not just whichever is last.
	it("never renders a line wider than the given width, no matter which column is the huge one", () => {
		const table = new Table({
			columns: [
				{ header: "Body", key: "body" }, // huge natural width, NOT the last column
				{ header: "Id", key: "id" }, // short, and IS the last column
			],
			rows: [{ body: "x".repeat(500), id: "abc" }],
		});
		const width = 40;
		const lines = table.render(width);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(width);
	});

	// Closer to the exact real-world shape that crashed: many columns, most
	// short (id/kind/status/timestamps), a couple of arbitrarily long ones
	// (title/body) scattered in the middle and not last -- the auto-derived
	// table Vehicle's generic renderer builds from a notes_list result.
	// A cell value with an embedded newline (e.g. a multi-paragraph note body) breaks the
	// one-array-entry-per-physical-terminal-line contract every Component.render() consumer
	// depends on: even when the string's own character count stays within colWidths[i] (so
	// the row's total length is correctly bounded), the terminal itself starts a new physical
	// line the instant it hits the embedded \n mid-cell -- and everything printed after that on
	// what the TUI framework still thinks is "one line" keeps accumulating onto a runaway
	// visible width, exactly the crash shape reported live against a notes_list result whose
	// body field was a real multi-line note.
	it("strips embedded newlines from cell content instead of letting them survive into a rendered line", () => {
		const table = new Table({
			columns: [
				{ header: "id", key: "id" },
				{ header: "body", key: "body" },
			],
			rows: [
				{
					id: "a",
					body: "Hi\nThis is the rest of a very long multi-line note body that goes on and on and on and on for quite a while to force truncation mid-way through, well past the embedded newline character at the start.",
				},
				{ id: "b", body: "Short." },
			],
		});
		const lines = table.render(60);
		for (const line of lines) {
			expect(line).not.toContain("\n");
			expect(line.length).toBeLessThanOrEqual(60);
		}
	});

	it("deriveTableColumns strips embedded newlines from string values before they ever reach Table", () => {
		const derived = deriveTableColumns([{ id: "a", body: "line one\nline two\nline three" }]);
		expect(derived?.rows[0]?.body).not.toContain("\n");
	});

	it("fits a realistic multi-column table (short id/kind/status columns plus long title/body columns) within a real terminal width", () => {
		const table = new Table({
			columns: [
				{ header: "id", key: "id" },
				{ header: "kind", key: "kind" },
				{ header: "title", key: "title" },
				{ header: "status", key: "status" },
				{ header: "body", key: "body" },
				{ header: "created_at", key: "created_at" },
			],
			rows: [
				{
					id: "4fab0e98-4dcb-4f0f-a529-64dbee2de202",
					kind: "doc",
					title: "making Papyrus discuss more robust, allow multi-page discussions, multi-answer",
					status: "draft",
					body: "making Papyrus discuss more robust, allow multi-page discussions, multi-answer, allow more complex relationships to playbooks, tasks, docs & rules.",
					created_at: "2026-08-01T09:40:33.349Z",
				},
			],
		});
		const width = 179; // the real terminal width from the crash report
		const lines = table.render(width);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(width);
	});

	// Pathological case: enough columns that even a per-column minimum floor
	// (kept for readability in the common case) can't be honored within the
	// given width. Pi's own hard rule -- never render a line wider than the
	// real terminal, or the whole session crashes -- must win over that
	// readability floor; an unreadable table beats a crashed session.
	it("never exceeds the given width even when there are too many columns for any per-column minimum to fit", () => {
		const columns = Array.from({ length: 50 }, (_, i) => ({ header: `c${i}`, key: `c${i}` }));
		const row: Record<string, string> = {};
		for (const col of columns) row[col.key] = `value-${col.key}`;
		const table = new Table({ columns, rows: [row] });
		const width = 60; // far too narrow for 50 columns at any sane minimum
		const lines = table.render(width);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(width);
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
				visibleWidth: (s) => {
					measured++;
					return s.length;
				},
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
		const derived = deriveTableColumns([
			{ id: "1", title: "First" },
			{ id: "2", extra: true },
		]);
		expect(derived?.columns.map((c) => c.key).sort()).toEqual(["extra", "id", "title"]);
	});

	it("keeps string values as-is and JSON-stringifies non-string values, filling missing keys with an empty string", () => {
		const derived = deriveTableColumns([
			{ id: "1", title: "First", tags: ["a", "b"] },
			{ id: "2", title: "Second" },
		]);
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

	// A mega-value field (e.g. a notes_list result's full-text `body`) shouldn't just be
	// safely truncated at RENDER time (Table already guarantees that) -- its full,
	// untruncated length still feeds the natural-width computation that decides how much
	// room every OTHER column gets, so one huge outlier column can starve every genuinely
	// useful column down to Table's own MIN_COLUMN_WIDTH floor even on an otherwise roomy
	// terminal. Capping a cell's length at the data layer, before it ever reaches Table,
	// fixes the skew at its source instead of only hiding the symptom downstream.
	it("caps an oversized cell value at a default length, so it can't skew every other column's natural width", () => {
		const derived = deriveTableColumns([{ id: "a", body: "x".repeat(5000) }]);
		expect(derived?.rows[0]?.body.length).toBeLessThanOrEqual(120);
		expect(derived?.rows[0]?.body.endsWith("…")).toBe(true);
	});

	it("leaves a cell under the cap completely untouched", () => {
		const derived = deriveTableColumns([{ id: "1", title: "First" }]);
		expect(derived?.rows[0]?.title).toBe("First");
	});

	it("applies the cap after JSON-stringifying a non-string value, not before", () => {
		const derived = deriveTableColumns([{ tags: Array.from({ length: 200 }, (_, i) => `tag-${i}`) }]);
		expect(derived?.rows[0]?.tags.length).toBeLessThanOrEqual(120);
	});

	it("honors a caller-supplied maxCellLength override", () => {
		const derived = deriveTableColumns([{ body: "x".repeat(50) }], { maxCellLength: 10 });
		expect(derived?.rows[0]?.body).toBe(`${"x".repeat(9)}…`);
	});

	it("disables the cap entirely when maxCellLength is Infinity", () => {
		const huge = "x".repeat(5000);
		const derived = deriveTableColumns([{ body: huge }], { maxCellLength: Number.POSITIVE_INFINITY });
		expect(derived?.rows[0]?.body).toBe(huge);
	});
});
