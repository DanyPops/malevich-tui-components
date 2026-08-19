/**
 * A pure, time-driven "which page is currently visible" calculator for a card whose own content
 * has more rows than fit in its configured visible-row budget -- the auto-rotating overflow hint
 * a wide card grid needs once one card's own list genuinely outgrows its space.
 *
 * Deliberately owns no timer of its own (no bare `Date.now()`/`setInterval` wired into this
 * type): `pageIndex`/`currentPageBounds()` are pure functions of elapsed time since construction,
 * always correct for whatever moment they're read -- a caller drives its OWN repaint cadence
 * (e.g. an existing poll timer) and simply re-reads the current page each time, the same
 * separation-of-concerns this ecosystem's own `BoundedPoll` keeps between "when to tick" and
 * "what a tick means". `now` is injectable so tests never depend on real timers.
 *
 * Formatting a `page/total` hint into a card's own title is deliberately NOT this module's
 * concern -- callers vary in how (or whether) they want to show it.
 */
export interface AutoRotatingWindowOptions {
	/** Total number of underlying rows to page through. */
	totalRows: number;
	/** How many rows are visible per page. */
	pageSize: number;
	/** How often the visible page advances, in ms. */
	intervalMs: number;
	/** Injectable clock -- defaults to Date.now. */
	now?: () => number;
}

export class AutoRotatingWindow {
	private readonly pageSize: number;
	private readonly intervalMs: number;
	private readonly now: () => number;
	private readonly startedAt: number;
	private totalRows: number;

	constructor(options: AutoRotatingWindowOptions) {
		this.pageSize = Math.max(1, options.pageSize);
		this.intervalMs = Math.max(1, options.intervalMs);
		this.now = options.now ?? Date.now;
		this.totalRows = Math.max(0, options.totalRows);
		this.startedAt = this.now();
	}

	/** Updates the underlying row count (e.g. after a data refresh) -- pageCount/isPaging reflect
	 * the new total immediately; the page index keeps advancing purely from elapsed time, so a
	 * shrinking total can make it jump rather than smoothly continue -- always a VALID index into
	 * the new total, never a stale one from before the refresh. */
	setTotalRows(totalRows: number): void {
		this.totalRows = Math.max(0, totalRows);
	}

	get pageCount(): number {
		return Math.max(1, Math.ceil(this.totalRows / this.pageSize));
	}

	/** True iff there are genuinely more rows than fit in one page -- never true for content that
	 * already fits, so a caller can use this to decide whether to show a page hint at all. */
	get isPaging(): boolean {
		return this.totalRows > this.pageSize;
	}

	get pageIndex(): number {
		if (!this.isPaging) return 0;
		const elapsed = Math.max(0, this.now() - this.startedAt);
		const elapsedPages = Math.floor(elapsed / this.intervalMs);
		return elapsedPages % this.pageCount;
	}

	/** The current page's own [start, end) row-index bounds into the underlying (0-based) rows. */
	currentPageBounds(): { start: number; end: number } {
		const start = this.pageIndex * this.pageSize;
		return { start, end: Math.min(this.totalRows, start + this.pageSize) };
	}
}
