/**
 * Extracted from @danypops/pi-lector's rendering layer -- the identical
 * "show the first N items, append a '... K more' line for the rest" shape
 * was hand-duplicated across 14 call sites there (find_symbols,
 * document_symbols, go_to_definition/find_references/hover's location
 * lists, diagnostics, call-hierarchy directions, workspace_map, git
 * status/log/diff, cross-workspace search, package_source candidates,
 * find_files, search_code), with zero shared test coverage of the
 * truncation math itself -- one of those sites had already drifted to
 * computing the hidden count with a flipped sign, harmless only because
 * both forms happen to agree at every call site's actual usage.
 *
 * Deliberately NOT a stateful Component: which items are "expanded" is
 * owned by Pi's own tool-row state (renderResult's `expanded` argument),
 * not by anything a Malevich consumer would toggle locally the way
 * Dialog/CollapsibleText do. A pure function matching buildDetailLines'
 * own house style -- caller supplies wording (header/empty-state/hint
 * text vary per tool and are not this module's concern; keeping them out
 * also keeps this host-agnostic, with no assumption of any particular
 * "press X to expand" keybinding string), this function owns only the
 * truncation arithmetic (see computeTruncationBounds, shared with
 * renderBoundedTable's identical row-bounding shape for Table).
 */

import { computeTruncationBounds } from "../truncation.js";

export interface TruncatedListOptions<T> {
	readonly items: readonly T[];
	/** True to show every item with no "... more" line, matching Pi's tool-row expand affordance. */
	readonly expanded: boolean;
	/** How many items to show when collapsed. Deliberately no shared default -- callers' natural visible counts range from 5 to 60 depending on how much one item costs to read. */
	readonly visibleCount: number;
	readonly formatItem: (item: T, index: number) => string;
	/** Builds the trailing "... N more (hint)" line from the real hidden count -- only called when collapsed and more items exist. */
	readonly moreLine: (hiddenCount: number) => string;
	/** An optional trailing line describing upstream truncation (e.g. "search itself was truncated by maxMatches/maxBytes") -- independent of display truncation, so it's appended in both the expanded and collapsed cases when given. */
	readonly truncationWarning?: string;
}

/** Builds a truncated list's body lines: the visible items, an optional "... N more" line, and an optional trailing truncation-warning line. Returns `[]` for an empty item list -- the caller renders its own "no results" message instead, since that wording varies per tool. */
export function renderTruncatedList<T>(options: TruncatedListOptions<T>): string[] {
	if (options.items.length === 0) return [];
	const { displayCount, hiddenCount } = computeTruncationBounds(options.items.length, options.visibleCount, options.expanded);
	const lines: string[] = [];
	for (let index = 0; index < displayCount; index++) lines.push(options.formatItem(options.items[index] as T, index));
	if (hiddenCount > 0) lines.push(options.moreLine(hiddenCount));
	if (options.truncationWarning !== undefined) lines.push(options.truncationWarning);
	return lines;
}
