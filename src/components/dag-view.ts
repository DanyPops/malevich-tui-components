/**
 * TreeView only handles single-parent hierarchies (containment). A real
 * dependency graph -- a node depending on several siblings -- isn't
 * tree-shaped at all. DagView fills that gap, but stays a pure renderer
 * over an already-computed topological ordering, matching TreeView's own
 * and HistoryChart's own division of labor: a caller (e.g. a task
 * scheduler's own ready/blocked/invalid classification) computes its
 * domain-specific layers; this component never re-derives a topological
 * sort of its own, so two different callers' layering semantics never
 * fight each other.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { computeTruncationBounds } from "../truncation.js";

export interface DagNode {
	id: string;
	label: string;
	style?: (s: string) => string;
}

export interface DagEdge {
	from: string;
	to: string;
	label?: string;
}

export interface DagViewOptions {
	/** Pre-computed topological layers (outer index = execution/dependency order). Never computed by this component. */
	readonly layers: readonly (readonly string[])[];
	readonly nodes: readonly DagNode[];
	readonly edges: readonly DagEdge[];
	/** Node ids that could not be placed in any layer (part of a cycle) -- rendered in a final, distinctly labeled section rather than silently dropped. */
	readonly cycleIds?: readonly string[];
	readonly defaultStyle?: (s: string) => string;
	readonly edgeStyle?: (s: string) => string;
	readonly layerHeaderStyle?: (s: string) => string;
	readonly cycleHeaderStyle?: (s: string) => string;
	/** Default: "Layer {index + 1}/{count}". */
	readonly layerLabel?: (layerIndex: number, layerCount: number) => string;
	/** Default: "Cycle (unresolved order)". */
	readonly cycleLabel?: string;
	/** A node id named by an edge but absent from `nodes` -- default: the bare id itself. */
	readonly unknownNodeLabel?: (id: string) => string;
	/** Default: "depends on: a, b". */
	readonly edgeAnnotation?: (fromLabels: readonly string[]) => string;
	readonly measure?: TextMeasure;
	/** True to show every node with no "... more" line, matching Pi's tool-row expand affordance. */
	readonly expanded: boolean;
	/** How many nodes total (across all layers and the cycle section) to show when collapsed. */
	readonly visibleNodeCount: number;
	/** Builds the trailing "... N more" line from the real hidden count -- only called when collapsed and more nodes exist. */
	readonly moreLine: (hiddenCount: number) => string;
}

type Placement = { id: string; layerIndex: number } | { id: string; layerIndex: "cycle" };

/** Renders a topologically-layered DAG: each layer as a headed group of node labels, with a dependency annotation under any node whose incoming edges originate from an earlier or same layer. Nodes that could never be layered (cycleIds) render in a final, distinct section. */
export class DagView implements Component {
	private readonly measure: TextMeasure;

	constructor(private readonly opts: DagViewOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const opts = this.opts;
		const safeWidth = Math.max(1, width);
		const style = opts.defaultStyle ?? ((s) => s);
		const edgeStyle = opts.edgeStyle ?? style;
		const layerHeaderStyle = opts.layerHeaderStyle ?? style;
		const cycleHeaderStyle = opts.cycleHeaderStyle ?? style;
		const layerLabel = opts.layerLabel ?? ((index, count) => `Layer ${index + 1}/${count}`);
		const cycleLabel = opts.cycleLabel ?? "Cycle (unresolved order)";
		const unknownNodeLabel = opts.unknownNodeLabel ?? ((id) => id);
		const edgeAnnotation = opts.edgeAnnotation ?? ((fromLabels) => `depends on: ${fromLabels.join(", ")}`);

		const nodesById = new Map(opts.nodes.map((node) => [node.id, node]));
		const incomingFrom = new Map<string, string[]>();
		for (const edge of opts.edges) {
			const sources = incomingFrom.get(edge.to) ?? [];
			sources.push(edge.from);
			incomingFrom.set(edge.to, sources);
		}

		const placements: Placement[] = [];
		opts.layers.forEach((layer, layerIndex) => {
			for (const id of layer) placements.push({ id, layerIndex });
		});
		for (const id of opts.cycleIds ?? []) placements.push({ id, layerIndex: "cycle" });

		if (placements.length === 0) return [];

		const { displayCount, hiddenCount } = computeTruncationBounds(placements.length, opts.visibleNodeCount, opts.expanded);
		const visible = placements.slice(0, displayCount);

		const lines: string[] = [];
		let currentSection: number | "cycle" | undefined;
		for (const placement of visible) {
			if (placement.layerIndex !== currentSection) {
				currentSection = placement.layerIndex;
				const header =
					placement.layerIndex === "cycle"
						? cycleHeaderStyle(cycleLabel)
						: layerHeaderStyle(layerLabel(placement.layerIndex, opts.layers.length));
				lines.push(this.measure.truncateToWidth(header, safeWidth, "…"));
			}
			const node = nodesById.get(placement.id);
			const label = node ? style(node.style ? node.style(node.label) : node.label) : style(unknownNodeLabel(placement.id));
			lines.push(this.measure.truncateToWidth(`  ${label}`, safeWidth, "…"));

			const sources = incomingFrom.get(placement.id);
			if (sources && sources.length > 0) {
				const fromLabels = sources.map((id) => nodesById.get(id)?.label ?? unknownNodeLabel(id));
				lines.push(this.measure.truncateToWidth(`    ${edgeStyle(edgeAnnotation(fromLabels))}`, safeWidth, "…"));
			}
		}
		if (hiddenCount > 0) lines.push(this.measure.truncateToWidth(opts.moreLine(hiddenCount), safeWidth, "…"));
		return lines;
	}
}
