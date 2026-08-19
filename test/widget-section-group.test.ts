import { describe, expect, it } from "bun:test";
import { renderWidgetSectionGroup, type WidgetSection } from "../src/components/widget-section-group.ts";

/** A section whose render() ignores width -- fine for content already known to fit; the
 * truncation test below exercises a width-aware section separately. */
function fixedSection(label: string, lines: readonly string[], style?: (s: string) => string): WidgetSection {
	return { label, style, render: () => [...lines] };
}

describe("renderWidgetSectionGroup", () => {
	it("renders a single section as a stacked tree: owner as root, the section as its only child", () => {
		const component = renderWidgetSectionGroup({ owner: "Papyrus", sections: [fixedSection("Notes 7", [])] });
		expect(component.render(80)).toEqual(["└── Papyrus", "    └── Notes 7"]);
	});

	it("stacks more than two sections as additional tree branches, not a grid", () => {
		const component = renderWidgetSectionGroup({
			owner: "Papyrus",
			sections: [fixedSection("Tasks", ["a task"]), fixedSection("Notes 7", []), fixedSection("Discussions 2", [])],
		});
		const lines = component.render(80);
		expect(lines[0]).toBe("└── Papyrus");
		expect(lines.some((line) => line.includes("Tasks"))).toBe(true);
		expect(lines.some((line) => line.includes("Notes 7"))).toBe(true);
		expect(lines.some((line) => line.includes("Discussions 2"))).toBe(true);
		expect(lines.some((line) => line.includes("a task"))).toBe(true);
	});

	it("embeds each section's own body lines indented beneath its own branch", () => {
		const component = renderWidgetSectionGroup({ owner: "Papyrus", sections: [fixedSection("Tasks", ["▶ task one", "  task two"])] });
		const lines = component.render(80);
		expect(lines[0]).toBe("└── Papyrus");
		expect(lines[1]).toBe("    └── Tasks");
		expect(lines[2]?.trim()).toBe("▶ task one");
		expect(lines[3]?.trim()).toBe("task two");
		// Each subsequent line indents at least as deep as the section's own branch.
		expect(lines[2]?.startsWith(" ".repeat(6))).toBe(true);
	});

	it("stacks two sections vertically when the viewport is too narrow for two columns", () => {
		const component = renderWidgetSectionGroup({
			owner: "Papyrus",
			sections: [fixedSection("Tasks", ["a task"]), fixedSection("Notes 7", [])],
			minColumnWidth: 30,
		});
		const lines = component.render(40); // < 2*30+1
		expect(lines[0]).toBe("└── Papyrus");
		expect(lines.length).toBeGreaterThan(1);
	});

	it("lays exactly two sections out side by side once the viewport is wide enough for both columns", () => {
		const component = renderWidgetSectionGroup({
			owner: "Papyrus",
			sections: [fixedSection("Tasks", ["a task"]), fixedSection("Notes", ["a note"])],
			minColumnWidth: 10,
		});
		const lines = component.render(80); // >= 2*10+1
		expect(lines[0]).toBe("Papyrus");
		// Both column headers appear on the SAME line (side by side), not as separate tree branches.
		expect(lines[1]).toContain("Tasks");
		expect(lines[1]).toContain("Notes");
		expect(lines[2]).toContain("a task");
		expect(lines[2]).toContain("a note");
	});

	it("gives each section's render() the width it actually gets in the chosen layout, not a pre-guessed one", () => {
		const seen: number[] = [];
		const widthAware: WidgetSection = {
			label: "Tasks",
			render: (width) => {
				seen.push(width);
				return ["x".repeat(width)];
			},
		};
		const stackedComponent = renderWidgetSectionGroup({ owner: "Papyrus", sections: [widthAware], minColumnWidth: 1000 });
		stackedComponent.render(80);
		const gridComponent = renderWidgetSectionGroup({
			owner: "Papyrus",
			sections: [widthAware, fixedSection("Notes", [])],
			minColumnWidth: 10,
		});
		gridComponent.render(80);
		// Stacked: gets the (indent-reduced) full width. Grid: gets roughly half. Never the same
		// guessed value regardless of which layout was actually chosen.
		expect(seen[0]).toBeGreaterThan(seen[1]!);
	});

	it("never renders a grid for a single section, regardless of width", () => {
		const component = renderWidgetSectionGroup({ owner: "Pipes", sections: [fixedSection("Jobs · 3 subscribed", ["job one"])] });
		expect(component.render(200)[0]).toBe("└── Pipes");
	});

	it("applies each section's own style function to its branch label (whole styled branch line, matching TreeView's own convention)", () => {
		const component = renderWidgetSectionGroup({
			owner: "Papyrus",
			sections: [fixedSection("Notes", [], (s) => `<label>${s}</label>`)],
		});
		const lines = component.render(80);
		expect(lines[0]).toContain("Papyrus");
		expect(lines[1]).toStartWith("<label>");
		expect(lines[1]).toContain("Notes");
		expect(lines[1]).toEndWith("</label>");
	});

	it("applies ownerStyle to the shared header line in the two-column grid layout", () => {
		const component = renderWidgetSectionGroup({
			owner: "Papyrus",
			ownerStyle: (s) => `<owner>${s}</owner>`,
			sections: [fixedSection("Tasks", []), fixedSection("Notes", [])],
			minColumnWidth: 10,
		});
		expect(component.render(80)[0]).toBe("<owner>Papyrus</owner>");
	});

	it("truncates the owner header line and each section's own branch/column-header label, in both layouts, to the given width", () => {
		// Section BODY truncation is each section's own render(width) responsibility (it's the one
		// that knows how to wrap/bound its own content) -- this only guarantees the group's own
		// owner/label lines, the ones it composes itself, never overflow regardless of caller input.
		const long = "x".repeat(200);
		const stacked = renderWidgetSectionGroup({ owner: long, sections: [fixedSection(long, [])] });
		const stackedLines = stacked.render(40);
		expect(stackedLines[0]!.length).toBeLessThanOrEqual(40);
		expect(stackedLines[1]!.length).toBeLessThanOrEqual(40);

		const grid = renderWidgetSectionGroup({
			owner: long,
			sections: [fixedSection(long, []), fixedSection(long, [])],
			minColumnWidth: 10,
		});
		const gridLines = grid.render(80);
		expect(gridLines[0]!.length).toBeLessThanOrEqual(80);
		expect(gridLines[1]!.length).toBeLessThanOrEqual(80);
	});

	it("a width-aware section correctly bounds its own body in either layout -- the real contract every actual caller relies on", () => {
		function widthAware(label: string): WidgetSection {
			return { label, render: (width) => ["y".repeat(width * 3)].map((s) => s.slice(0, width)) };
		}
		const stacked = renderWidgetSectionGroup({ owner: "Papyrus", sections: [widthAware("Tasks")] });
		for (const line of stacked.render(40)) expect(line.length).toBeLessThanOrEqual(40);

		const grid = renderWidgetSectionGroup({ owner: "Papyrus", sections: [widthAware("Tasks"), widthAware("Notes")], minColumnWidth: 10 });
		for (const line of grid.render(80)) expect(line.length).toBeLessThanOrEqual(80);
	});

	it("invalidate() never throws, for either layout", () => {
		const single = renderWidgetSectionGroup({ owner: "Papyrus", sections: [fixedSection("Notes", [])] });
		const grid = renderWidgetSectionGroup({
			owner: "Papyrus",
			sections: [fixedSection("Tasks", []), fixedSection("Notes", [])],
			minColumnWidth: 10,
		});
		expect(() => single.invalidate()).not.toThrow();
		expect(() => grid.invalidate()).not.toThrow();
	});
});
