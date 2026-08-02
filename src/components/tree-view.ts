/**
 * Adapted from @dpopsuev/alef-tui's TreeView component (MIT, Mario
 * Zechner) -- box-drawing constants (design/chars.js's TREE) inlined
 * directly rather than pulled in from Alef's own design system.
 */
import type { Component } from "../component.js";
import { type GlyphSet, unicodeGlyphs } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface TreeNode {
	label: string;
	component?: Component;
	children?: TreeNode[];
	collapsed?: boolean;
	style?: (s: string) => string;
}

export interface TreeViewOptions {
	nodes: TreeNode[];
	defaultStyle?: (s: string) => string;
	/** Defaults to unicodeGlyphs. Pass asciiGlyphs (or a custom set) for terminals/fonts that render box-drawing poorly. */
	glyphs?: GlyphSet;
	/** Defaults to asciiTextMeasure. A host with real ANSI-styled labels (the common case -- callers typically pre-style `label` with their own theme) should pass its own ANSI-aware measure, matching every other bounded component in this library. */
	measure?: TextMeasure;
}

/** Renders a labeled tree with box-drawing branch/pipe connectors. Each node may optionally embed a child Component (rendered indented beneath it) and/or its own list of child TreeNodes. */
export class TreeView implements Component {
	private nodes: TreeNode[];
	private readonly defaultStyle: (s: string) => string;
	private readonly glyphs: GlyphSet["tree"];
	private readonly measure: TextMeasure;

	constructor(opts: TreeViewOptions) {
		this.nodes = opts.nodes;
		this.defaultStyle = opts.defaultStyle ?? ((s) => s);
		this.glyphs = (opts.glyphs ?? unicodeGlyphs).tree;
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	setNodes(nodes: TreeNode[]): void {
		this.nodes = nodes;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const lines: string[] = [];
		const renderNode = (node: TreeNode, prefix: string, isLast: boolean): void => {
			const branch = isLast ? this.glyphs.last : this.glyphs.branch;
			const style = node.style ?? this.defaultStyle;
			lines.push(this.measure.truncateToWidth(style(`${prefix}${branch}${node.label}`), width));
			if (node.component && !node.collapsed) {
				const contentPrefix = prefix + (isLast ? this.glyphs.space : this.glyphs.pipe);
				// -2 for the "  " indent re-added below -- an embedded component's own
				// render() has no way to know about that extra indent on its own, so
				// budgeting only contentPrefix.length here let every embedded line
				// overflow the caller's requested width by exactly 2 columns.
				const contentWidth = Math.max(10, width - contentPrefix.length - 2);
				for (const line of node.component.render(contentWidth)) {
					lines.push(`${contentPrefix}  ${line}`);
				}
			}
			if (node.collapsed || !node.children?.length) return;
			const childPrefix = prefix + (isLast ? this.glyphs.space : this.glyphs.pipe);
			for (let i = 0; i < node.children.length; i++) {
				renderNode(node.children[i] as TreeNode, childPrefix, i === node.children.length - 1);
			}
		};
		for (let i = 0; i < this.nodes.length; i++) {
			renderNode(this.nodes[i] as TreeNode, "", i === this.nodes.length - 1);
		}
		return lines;
	}
}
