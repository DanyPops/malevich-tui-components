/**
 * Shared arithmetic behind every "show the first N, note how many more
 * remain unless Pi's own expanded flag says otherwise" component in this
 * library (TruncatedList, Table via renderBoundedTable). Kept as one
 * internal function rather than let each component reimplement
 * `Math.min`/subtraction on its own -- that duplication already happened
 * once (a hand-rolled copy in a consumer had drifted to a flipped hidden-
 * count sign) before TruncatedList existed to prevent it.
 */
export interface TruncationBounds {
	readonly displayCount: number;
	readonly hiddenCount: number;
}

export function computeTruncationBounds(totalCount: number, visibleCount: number, expanded: boolean): TruncationBounds {
	const displayCount = expanded ? totalCount : Math.min(visibleCount, totalCount);
	return { displayCount, hiddenCount: totalCount - displayCount };
}
