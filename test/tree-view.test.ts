import { describe, expect, it } from "bun:test";
import { TreeView } from "../src/components/tree-view.ts";

describe("TreeView", () => {
	it("renders a flat list of nodes with branch connectors, last node using the corner glyph", () => {
		const tree = new TreeView({ nodes: [{ label: "a" }, { label: "b" }] });
		expect(tree.render(80)).toEqual(["├── a", "└── b"]);
	});

	it("renders nested children indented under their parent", () => {
		const tree = new TreeView({ nodes: [{ label: "parent", children: [{ label: "child" }] }] });
		expect(tree.render(80)).toEqual(["└── parent", "    └── child"]);
	});

	it("does not render children when the node is collapsed", () => {
		const tree = new TreeView({ nodes: [{ label: "parent", collapsed: true, children: [{ label: "hidden" }] }] });
		expect(tree.render(80)).toEqual(["└── parent"]);
	});

	it("renders an embedded Component's output indented beneath its node", () => {
		const tree = new TreeView({ nodes: [{ label: "node", component: { render: () => ["embedded"], invalidate: () => {} } }] });
		const lines = tree.render(80);
		expect(lines[0]).toBe("└── node");
		expect(lines[1]).toContain("embedded");
	});

	it("does not render an embedded Component when the node is collapsed", () => {
		const tree = new TreeView({ nodes: [{ label: "node", collapsed: true, component: { render: () => ["hidden"], invalidate: () => {} } }] });
		expect(tree.render(80)).toEqual(["└── node"]);
	});

	it("applies a per-node style, falling back to defaultStyle", () => {
		const tree = new TreeView({
			nodes: [{ label: "styled", style: (s) => `[${s}]` }, { label: "default" }],
			defaultStyle: (s) => `<${s}>`,
		});
		const lines = tree.render(80);
		expect(lines[0]).toStartWith("[");
		expect(lines[1]).toStartWith("<");
	});

	it("setNodes() replaces the tree for the next render", () => {
		const tree = new TreeView({ nodes: [{ label: "old" }] });
		tree.setNodes([{ label: "new" }]);
		expect(tree.render(80)).toEqual(["└── new"]);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const tree = new TreeView({ nodes: [] });
		expect(tree.render(80)).toEqual([]);
		expect(() => tree.invalidate()).not.toThrow();
	});
});
