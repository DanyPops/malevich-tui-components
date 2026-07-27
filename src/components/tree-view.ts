/**
 * Adapted from @dpopsuev/alef-tui's TreeView component (MIT, Mario
 * Zechner) -- box-drawing constants (design/chars.js's TREE) inlined
 * directly rather than pulled in from Alef's own design system.
 */
import type { Component } from "../component.js";

const TREE = {
	branch: "├── ",
	last: "└── ",
	pipe: "│   ",
	space: "    ",
} as const;

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
}

/** Renders a labeled tree with box-drawing branch/pipe connectors. Each node may optionally embed a child Component (rendered indented beneath it) and/or its own list of child TreeNodes. */
export class TreeView implements Component {
	private nodes: TreeNode[];
	private readonly defaultStyle: (s: string) => string;

	constructor(opts: TreeViewOptions) {
		this.nodes = opts.nodes;
		this.defaultStyle = opts.defaultStyle ?? ((s) => s);
	}

	setNodes(nodes: TreeNode[]): void {
		this.nodes = nodes;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const lines: string[] = [];
		const renderNode = (node: TreeNode, prefix: string, isLast: boolean): void => {
			const branch = isLast ? TREE.last : TREE.branch;
			const style = node.style ?? this.defaultStyle;
			lines.push(style(`${prefix}${branch}${node.label}`));
			if (node.component && !node.collapsed) {
				const contentPrefix = prefix + (isLast ? TREE.space : TREE.pipe);
				const contentWidth = Math.max(10, width - contentPrefix.length);
				for (const line of node.component.render(contentWidth)) {
					lines.push(`${contentPrefix}  ${line}`);
				}
			}
			if (node.collapsed || !node.children?.length) return;
			const childPrefix = prefix + (isLast ? TREE.space : TREE.pipe);
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
