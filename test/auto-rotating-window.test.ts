import { describe, expect, it } from "bun:test";
import { AutoRotatingWindow } from "../src/auto-rotating-window.ts";

describe("AutoRotatingWindow", () => {
	it("never pages when everything already fits in one page", () => {
		const window = new AutoRotatingWindow({ totalRows: 3, pageSize: 5, intervalMs: 1000 });
		expect(window.isPaging).toBe(false);
		expect(window.pageCount).toBe(1);
		expect(window.pageIndex).toBe(0);
		expect(window.currentPageBounds()).toEqual({ start: 0, end: 3 });
	});

	it("pages when there are more rows than fit in one page", () => {
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 1000 });
		expect(window.isPaging).toBe(true);
		expect(window.pageCount).toBe(4); // ceil(10/3)
	});

	it("never advances before the configured interval has elapsed", () => {
		let now = 0;
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 1000, now: () => now });
		expect(window.pageIndex).toBe(0);
		now = 500;
		expect(window.pageIndex).toBe(0);
		now = 999;
		expect(window.pageIndex).toBe(0);
	});

	it("advances exactly one page once the interval elapses, using an injected clock -- no real timers", () => {
		let now = 0;
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 1000, now: () => now });
		now = 1000;
		expect(window.pageIndex).toBe(1);
		now = 2000;
		expect(window.pageIndex).toBe(2);
		now = 2999;
		expect(window.pageIndex).toBe(2);
	});

	it("wraps back to page 0 after the last page", () => {
		let now = 0;
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 1000, now: () => now }); // 4 pages: 0,1,2,3
		now = 3000;
		expect(window.pageIndex).toBe(3);
		now = 4000;
		expect(window.pageIndex).toBe(0);
		now = 5000;
		expect(window.pageIndex).toBe(1);
	});

	it("currentPageBounds() returns the correct [start, end) slice for the current page", () => {
		let now = 0;
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 1000, now: () => now });
		expect(window.currentPageBounds()).toEqual({ start: 0, end: 3 });
		now = 1000;
		expect(window.currentPageBounds()).toEqual({ start: 3, end: 6 });
		now = 3000; // last page: only 1 row remains (10 = 3+3+3+1)
		expect(window.currentPageBounds()).toEqual({ start: 9, end: 10 });
	});

	it("setTotalRows() updates pageCount/isPaging -- e.g. a data refresh that shrinks below pageSize stops paging", () => {
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 1000 });
		expect(window.isPaging).toBe(true);
		window.setTotalRows(2);
		expect(window.isPaging).toBe(false);
		expect(window.pageIndex).toBe(0);
		expect(window.currentPageBounds()).toEqual({ start: 0, end: 2 });
	});

	it("clamps a non-positive pageSize/totalRows rather than throwing or dividing by zero", () => {
		const window = new AutoRotatingWindow({ totalRows: -5, pageSize: 0, intervalMs: 1000 });
		expect(() => window.pageIndex).not.toThrow();
		expect(window.pageCount).toBeGreaterThanOrEqual(1);
		expect(window.currentPageBounds().start).toBeGreaterThanOrEqual(0);
	});

	it("defaults to a real Date.now()-based clock when none is injected", () => {
		const window = new AutoRotatingWindow({ totalRows: 10, pageSize: 3, intervalMs: 60_000 });
		// Constructed "now" -- far from any real interval boundary -- must be page 0.
		expect(window.pageIndex).toBe(0);
	});
});
