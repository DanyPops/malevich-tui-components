/**
 * Composes several named sections of ONE aboveEditor persistent widget (e.g. Papyrus's own Tasks
 * and Notes) into a single shared tree instead of each section repeating "<Owner> · <Label>" as
 * its own independent flat header -- "Papyrus" once, with "Tasks"/"Notes" as its own indented
 * children (TreeView). Lays exactly two sections out side by side (SplitPane) once the viewport
 * is wide enough for both columns at their minimum width; falls back to the stacked tree
 * otherwise, and for any section count other than two (a grid beyond two columns is real future
 * work, not needed by any current adopter).
 *
 * Each section supplies its own `render(width)`, not pre-computed lines: this group calls it with
 * whatever width that section actually gets in the CHOSEN layout -- the full viewport when
 * stacked, half of it (minus the border) in a two-column grid -- so a section's own truncation is
 * always correct for the space it was actually given, not a width guessed before the layout
 * decision was made.
 */
import type { Component } from "../component.js";
import type { GlyphSet } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { SplitPane } from "./split-pane.js";
import { type TreeNode, TreeView } from "./tree-view.js";

export interface WidgetSection {
	label: string;
	/** Renders this section's own body lines for the width it's actually given -- the full
	 * viewport when stacked, one column's width in a two-up grid. */
	render: (width: number) => string[];
	style?: (s: string) => string;
}

export interface WidgetSectionGroupOptions {
	/** The Vehicle/tool's own display name, e.g. "Papyrus" -- the tree's single root label, or the
	 * shared header line above a two-column layout. */
	owner: string;
	sections: readonly WidgetSection[];
	ownerStyle?: (s: string) => string;
	measure?: TextMeasure;
	glyphs?: GlyphSet;
	/**
	 * Minimum width EACH column needs before a two-section group lays out side by side instead of
	 * stacked -- the group needs roughly `2 * minColumnWidth` total. Defaults to 30. Pass Infinity
	 * to always stack.
	 */
	minColumnWidth?: number;
}

function sectionComponent(section: WidgetSection): Component {
	return { render: (width: number) => section.render(width), invalidate: () => {} };
}

/** A section's own header line plus its body, both bounded to `width` -- used for the two-column
 * grid path, where TreeView's own branch/indent machinery doesn't apply. */
function columnComponent(section: WidgetSection, measure: TextMeasure): Component {
	return {
		render(width: number): string[] {
			const header = measure.truncateToWidth(section.style ? section.style(section.label) : section.label, width);
			return [header, ...section.render(width).map((line) => measure.truncateToWidth(line, width))];
		},
		invalidate(): void {},
	};
}

/**
 * Renders one Vehicle's own group of aboveEditor widget sections. Two sections wide enough for
 * `minColumnWidth` each render side by side under one shared owner header line; any other section
 * count (0, 1, 3+), or two sections in too narrow a viewport, renders as a stacked tree instead
 * (owner as the single root, each section as one of its children, embedding that section's own
 * rendered lines).
 */
export function renderWidgetSectionGroup(options: WidgetSectionGroupOptions): Component {
	const { owner, sections, ownerStyle = (s: string) => s, measure = asciiTextMeasure, glyphs, minColumnWidth = 30 } = options;
	const treeNodes: TreeNode[] = [
		{
			label: owner,
			style: ownerStyle,
			children: sections.map((section) => ({
				label: section.label,
				style: section.style,
				component: sectionComponent(section),
			})),
		},
	];
	const stacked = new TreeView({ nodes: treeNodes, measure, glyphs });
	if (sections.length !== 2) return stacked;
	const [first, second] = sections as [WidgetSection, WidgetSection];
	const pane = new SplitPane(columnComponent(first, measure), columnComponent(second, measure), {
		measure,
		ratio: 0.5,
		minLeftWidth: minColumnWidth,
		minRightWidth: minColumnWidth,
	});
	return {
		render(width: number): string[] {
			if (width < minColumnWidth * 2 + 1) return stacked.render(width);
			return [measure.truncateToWidth(ownerStyle(owner), width), ...pane.render(width)];
		},
		invalidate(): void {
			stacked.invalidate();
			pane.invalidate();
		},
	};
}
