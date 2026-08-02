import { describe, expect, it } from "bun:test";
import { visibleWidth } from "@earendil-works/pi-tui";
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

	it("truncates a node's own label line to the given width, not just an embedded component's", () => {
		const tree = new TreeView({ nodes: [{ label: "A".repeat(200) }] });
		expect(tree.render(20)[0]?.length).toBeLessThanOrEqual(20);
	});

	it("truncates a nested child's label at its own indented width, not the outer width", () => {
		const tree = new TreeView({ nodes: [{ label: "parent", children: [{ label: "B".repeat(200) }] }] });
		for (const line of tree.render(20)) expect(line.length).toBeLessThanOrEqual(20);
	});

	it("uses an injected measure instead of the built-in ascii default, matching every other bounded component in this library", () => {
		const tree = new TreeView({
			nodes: [{ label: "hello" }],
			measure: { visibleWidth, truncateToWidth: (text) => `<custom>${text}</custom>` },
		});
		expect(tree.render(80)[0]).toBe("<custom>└── hello</custom>");
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
