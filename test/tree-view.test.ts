import { describe, expect, it } from "bun:test";
import { TreeView } from "../src/components/tree-view.ts";
import { asciiGlyphs } from "../src/glyphs.ts";

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

	it("budgets an embedded Component's own width for the extra two-space indent re-added around its output", () => {
		const tree = new TreeView({
			nodes: [
				{
					label: "node",
					component: {
						render: (width: number) => ["x".repeat(width)], // fills whatever width it's told, exposing any over-budget
						invalidate: () => {},
					},
				},
			],
		});
		// Below ~16 the component's own 10-char minimum (guaranteeing it always
		// gets *some* usable width) can legitimately still overflow a
		// pathologically narrow request -- 20+ is the realistic floor this
		// guards, matching the width range real terminal rendering exercises.
		for (const width of [20, 40, 80]) {
			for (const line of tree.render(width)) expect(line.length).toBeLessThanOrEqual(width);
		}
	});

	it("does not render an embedded Component when the node is collapsed", () => {
		const tree = new TreeView({
			nodes: [{ label: "node", collapsed: true, component: { render: () => ["hidden"], invalidate: () => {} } }],
		});
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

	it("draws its connectors from an injected glyph set instead of the unicode default", () => {
		const tree = new TreeView({ nodes: [{ label: "a" }, { label: "b" }], glyphs: asciiGlyphs });
		expect(tree.render(80)).toEqual(["|-- a", "`-- b"]);
	});
});
