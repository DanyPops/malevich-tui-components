import { describe, expect, it } from "bun:test";
import { buildDetailLines, type DetailViewTheme } from "../src/components/detail-view.js";

const plainTheme: DetailViewTheme = {
	field: (s) => s,
	heading: (s) => s,
	byline: (s) => s,
	body: (s) => s,
};

describe("buildDetailLines", () => {
	it("renders fields with no blank line between them", () => {
		const lines = buildDetailLines(80, {
			theme: plainTheme,
			fields: [
				{ label: "Status", value: "todo" },
				{ label: "Priority", value: "high" },
			],
		});
		expect(lines).toEqual(["Status: todo", "Priority: high"]);
	});

	it("omits a field entirely when the caller doesn't include it -- no emptiness filtering inside", () => {
		const lines = buildDetailLines(80, { theme: plainTheme, fields: [{ label: "Status", value: "todo" }] });
		expect(lines).toEqual(["Status: todo"]);
	});

	it("a body-only section gets a blank line before the heading and a blank line before the body", () => {
		const lines = buildDetailLines(80, {
			theme: plainTheme,
			sections: [{ heading: "Description:", body: "The full description." }],
		});
		expect(lines).toEqual(["", "Description:", "", "The full description."]);
	});

	it("a thread section gives each item its own leading blank line, byline, then body", () => {
		const lines = buildDetailLines(80, {
			theme: plainTheme,
			sections: [{
				heading: "Comments (2):",
				items: [
					{ byline: "Alice · 2024-01-01", body: "First comment" },
					{ byline: "Bob · 2024-01-02", body: "Second comment" },
				],
			}],
		});
		expect(lines).toEqual([
			"", "Comments (2):",
			"", "Alice · 2024-01-01", "First comment",
			"", "Bob · 2024-01-02", "Second comment",
		]);
	});

	it("a thread item without a byline skips just that line, not the blank or the body", () => {
		const lines = buildDetailLines(80, {
			theme: plainTheme,
			sections: [{ items: [{ body: "No byline here" }] }],
		});
		// One blank from the section's own leading separator, one from the item's own -- a
		// section always gets its separating blank line even with no heading.
		expect(lines).toEqual(["", "", "No byline here"]);
	});

	it("fields and sections compose in order: all fields first, then each section", () => {
		const lines = buildDetailLines(80, {
			theme: plainTheme,
			fields: [{ label: "Status", value: "todo" }],
			sections: [{ heading: "Description:", body: "text" }, { heading: "Comments (0):" }],
		});
		expect(lines).toEqual(["Status: todo", "", "Description:", "", "text", "", "Comments (0):"]);
	});

	it("wraps long text to the given width", () => {
		const lines = buildDetailLines(10, { theme: plainTheme, fields: [{ label: "Note", value: "one two three four five" }] });
		expect(lines.length).toBeGreaterThan(1);
		for (const line of lines) expect(line.length).toBeLessThanOrEqual(10);
	});

	it("applies each theme style to its own line kind", () => {
		const styled: DetailViewTheme = {
			field: (s) => `[field]${s}`,
			heading: (s) => `[heading]${s}`,
			byline: (s) => `[byline]${s}`,
			body: (s) => `[body]${s}`,
		};
		const lines = buildDetailLines(80, {
			theme: styled,
			fields: [{ label: "Status", value: "todo" }],
			sections: [{ heading: "Comments (1):", items: [{ byline: "Alice", body: "Hi" }] }],
		});
		expect(lines).toEqual([
			"[field]Status: todo",
			"", "[heading]Comments (1):",
			"", "[byline]Alice", "[body]Hi",
		]);
	});

	it("renders an empty string as a single blank line, not zero lines", () => {
		const lines = buildDetailLines(80, { theme: plainTheme, fields: [{ label: "Empty", value: "" }] });
		expect(lines).toEqual(["Empty: "]);
	});
});
