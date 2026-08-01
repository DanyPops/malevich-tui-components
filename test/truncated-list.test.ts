import { describe, expect, it } from "bun:test";
import { renderTruncatedList } from "../src/components/truncated-list.js";

describe("renderTruncatedList", () => {
	it("returns an empty array for an empty item list -- the caller decides its own empty-state message", () => {
		const lines = renderTruncatedList({ items: [], expanded: false, visibleCount: 10, formatItem: (n: number) => String(n), moreLine: (n) => `+${n}` });
		expect(lines).toEqual([]);
	});

	it("shows every item with no more-line when there are fewer than visibleCount", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3],
			expanded: false,
			visibleCount: 10,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n}`,
		});
		expect(lines).toEqual(["1", "2", "3"]);
	});

	it("shows every item with no more-line at the exact boundary (items.length === visibleCount)", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3],
			expanded: false,
			visibleCount: 3,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n}`,
		});
		expect(lines).toEqual(["1", "2", "3"]);
	});

	it("truncates to visibleCount and appends a more-line with the real hidden count when collapsed", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3, 4, 5],
			expanded: false,
			visibleCount: 3,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n} more`,
		});
		expect(lines).toEqual(["1", "2", "3", "+2 more"]);
	});

	it("shows every item with no more-line when expanded, regardless of visibleCount", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3, 4, 5],
			expanded: true,
			visibleCount: 3,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n} more`,
		});
		expect(lines).toEqual(["1", "2", "3", "4", "5"]);
	});

	it("computes the hidden count as items.length - visibleCount, not the other way around -- regression for a real sign-flip found in production duplication", () => {
		const seen: number[] = [];
		renderTruncatedList({
			items: Array.from({ length: 12 }, (_, i) => i),
			expanded: false,
			visibleCount: 5,
			formatItem: (n) => String(n),
			moreLine: (hidden) => {
				seen.push(hidden);
				return `+${hidden}`;
			},
		});
		expect(seen).toEqual([7]);
	});

	it("passes each item's real index to formatItem, not just the item", () => {
		const lines = renderTruncatedList({
			items: ["a", "b", "c"],
			expanded: false,
			visibleCount: 10,
			formatItem: (item, index) => `${index}:${item}`,
			moreLine: (n) => `+${n}`,
		});
		expect(lines).toEqual(["0:a", "1:b", "2:c"]);
	});

	it("appends an optional trailing truncation warning after the more-line, when collapsed", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3],
			expanded: false,
			visibleCount: 2,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n}`,
			truncationWarning: "upstream result was itself capped",
		});
		expect(lines).toEqual(["1", "2", "+1", "upstream result was itself capped"]);
	});

	it("still appends the truncation warning when expanded -- it describes upstream truncation, independent of display truncation", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3],
			expanded: true,
			visibleCount: 2,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n}`,
			truncationWarning: "upstream result was itself capped",
		});
		expect(lines).toEqual(["1", "2", "3", "upstream result was itself capped"]);
	});

	it("omits the truncation warning entirely when not given", () => {
		const lines = renderTruncatedList({ items: [1], expanded: false, visibleCount: 10, formatItem: (n) => String(n), moreLine: (n) => `+${n}` });
		expect(lines).toEqual(["1"]);
	});

	it("visibleCount of 0 while collapsed shows zero items and reports every item as hidden", () => {
		const lines = renderTruncatedList({
			items: [1, 2, 3],
			expanded: false,
			visibleCount: 0,
			formatItem: (n) => String(n),
			moreLine: (n) => `+${n}`,
		});
		expect(lines).toEqual(["+3"]);
	});

	it("never mutates the input items array", () => {
		const items = [1, 2, 3, 4, 5];
		const frozen = Object.freeze([...items]);
		expect(() =>
			renderTruncatedList({ items: frozen, expanded: false, visibleCount: 2, formatItem: (n) => String(n), moreLine: (n) => `+${n}` }),
		).not.toThrow();
		expect(frozen).toEqual([1, 2, 3, 4, 5]);
	});
});
