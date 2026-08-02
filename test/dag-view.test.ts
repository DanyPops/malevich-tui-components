import { describe, expect, it } from "bun:test";
import { DagView } from "../src/components/dag-view.ts";

const noop = () => "";

describe("DagView", () => {
	it("renders each layer as a headed group of node labels, in order", () => {
		const dag = new DagView({
			layers: [["a"], ["b", "c"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
				{ id: "c", label: "C" },
			],
			edges: [],
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		expect(dag.render(80)).toEqual(["Layer 1/2", "  A", "Layer 2/2", "  B", "  C"]);
	});

	it("annotates a node with the labels of nodes it depends on, resolved from an earlier layer", () => {
		const dag = new DagView({
			layers: [["a"], ["b"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
			],
			edges: [{ from: "a", to: "b" }],
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		expect(dag.render(80)).toEqual(["Layer 1/2", "  A", "Layer 2/2", "  B", "    depends on: A"]);
	});

	it("annotates a same-layer dependency too, not just cross-layer ones", () => {
		const dag = new DagView({
			layers: [["a", "b"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
			],
			edges: [{ from: "a", to: "b" }],
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		expect(dag.render(80)).toEqual(["Layer 1/1", "  A", "  B", "    depends on: A"]);
	});

	it("lists multiple dependency sources for one node", () => {
		const dag = new DagView({
			layers: [["a", "b"], ["c"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
				{ id: "c", label: "C" },
			],
			edges: [
				{ from: "a", to: "c" },
				{ from: "b", to: "c" },
			],
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		expect(dag.render(80)).toContain("    depends on: A, B");
	});

	it("renders a placeholder, not a crash, for an edge naming a node absent from nodes", () => {
		const dag = new DagView({
			layers: [["a"]],
			nodes: [{ id: "a", label: "A" }],
			edges: [{ from: "ghost", to: "a" }],
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		expect(dag.render(80)).toEqual(["Layer 1/1", "  A", "    depends on: ghost"]);
	});

	it("renders cycleIds in a final, distinctly labeled section", () => {
		const dag = new DagView({
			layers: [["a"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "x", label: "X" },
				{ id: "y", label: "Y" },
			],
			edges: [],
			cycleIds: ["x", "y"],
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		expect(dag.render(80)).toEqual(["Layer 1/1", "  A", "Cycle (unresolved order)", "  X", "  Y"]);
	});

	it("bounds total visible nodes across layers and cycle section, reporting how many more remain", () => {
		const dag = new DagView({
			layers: [["a", "b", "c"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
				{ id: "c", label: "C" },
			],
			edges: [],
			expanded: false,
			visibleNodeCount: 2,
			moreLine: (hidden) => `... ${hidden} more`,
		});
		expect(dag.render(80)).toEqual(["Layer 1/1", "  A", "  B", "... 1 more"]);
	});

	it("shows every node with no truncation note when expanded is true", () => {
		const dag = new DagView({
			layers: [["a", "b", "c"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
				{ id: "c", label: "C" },
			],
			edges: [],
			expanded: true,
			visibleNodeCount: 2,
			moreLine: (hidden) => `... ${hidden} more`,
		});
		expect(dag.render(80)).toEqual(["Layer 1/1", "  A", "  B", "  C"]);
	});

	it("returns an empty array for no layers and no cycle section", () => {
		const dag = new DagView({ layers: [], nodes: [], edges: [], expanded: false, visibleNodeCount: 10, moreLine: noop });
		expect(dag.render(80)).toEqual([]);
	});

	it("truncates a rendered line to the given width", () => {
		const dag = new DagView({
			layers: [["a"]],
			nodes: [{ id: "a", label: "A".repeat(200) }],
			edges: [],
			expanded: true,
			visibleNodeCount: 10,
			moreLine: noop,
		});
		for (const line of dag.render(20)) expect(line.length).toBeLessThanOrEqual(20);
	});

	it("applies defaultStyle to node labels and layer/cycle headers, edgeStyle to dependency annotations", () => {
		const dag = new DagView({
			layers: [["a"], ["b"]],
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
			],
			edges: [{ from: "a", to: "b" }],
			cycleIds: ["z"],
			defaultStyle: (s) => `<d>${s}</d>`,
			edgeStyle: (s) => `<e>${s}</e>`,
			expanded: true,
			visibleNodeCount: 100,
			moreLine: noop,
		});
		const lines = dag.render(80);
		expect(lines).toContain("<d>Layer 1/2</d>");
		expect(lines).toContain("  <d>A</d>");
		expect(lines).toContain("    <e>depends on: A</e>");
	});

	it("implements the Component interface (render + invalidate)", () => {
		const dag = new DagView({ layers: [], nodes: [], edges: [], expanded: false, visibleNodeCount: 10, moreLine: noop });
		expect(() => dag.invalidate()).not.toThrow();
	});
});
