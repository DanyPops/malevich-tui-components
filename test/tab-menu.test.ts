import { describe, expect, it } from "bun:test";
import { TabMenu, type TabMenuNode } from "../src/components/tab-menu.ts";

const THEME = {
	tab: (s: string) => s,
	activeTab: (s: string) => `[${s}]`,
	breadcrumb: (s: string) => s,
	description: (s: string) => s,
	help: (s: string) => s,
};

function tree(): TabMenuNode<string>[] {
	return [
		{ label: "GitHub", mnemonic: "h", description: "Issues", value: "github:issues" },
		{
			label: "Jira",
			mnemonic: "j",
			description: "Issues, saved queries, and board view",
			children: [
				{ label: "Issues", value: "jira:issues" },
				{ label: "Saved queries", value: "jira:query" },
				{ label: "Board view", value: "jira:board" },
			],
		},
	];
}

describe("TabMenu", () => {
	it("renders every node's label with the highlighted one wrapped by activeTab", () => {
		const menu = new TabMenu({ nodes: tree(), theme: THEME });
		const rendered = menu.render(80).join("\n");
		expect(rendered).toContain("[ GitHub ]");
		expect(rendered).toContain("Jira");
		expect(rendered).not.toContain("[ Jira ]");
	});

	it("right/tab moves the highlight to the next node, wrapping past the last", () => {
		const menu = new TabMenu({ nodes: tree(), theme: THEME });
		menu.handleInput("\t");
		expect(menu.getCurrentNode()?.label).toBe("Jira");
		menu.handleInput("\t");
		expect(menu.getCurrentNode()?.label).toBe("GitHub");
	});

	it("left/shift+tab moves backward, wrapping to the last node from the first", () => {
		const menu = new TabMenu({ nodes: tree(), theme: THEME });
		menu.handleInput("\x1b[D");
		expect(menu.getCurrentNode()?.label).toBe("Jira");
	});

	it("enter on a leaf node resolves onSelect with its value", () => {
		let selected: string | undefined;
		const menu = new TabMenu({
			nodes: tree(),
			theme: THEME,
			onSelect: (v) => {
				selected = v;
			},
		});
		menu.handleInput("\r");
		expect(selected).toBe("github:issues");
	});

	it("enter on a branch node walks down into its children instead of resolving", () => {
		let selected: string | undefined;
		const menu = new TabMenu({
			nodes: tree(),
			theme: THEME,
			onSelect: (v) => {
				selected = v;
			},
		});
		menu.handleInput("\t"); // -> Jira
		menu.handleInput("\r"); // descend
		expect(selected).toBeUndefined();
		expect(menu.getCurrentNode()?.label).toBe("Issues");
		expect(menu.getBreadcrumb()).toEqual(["Jira"]);
	});

	it("escape inside a child level walks back up one level instead of canceling", () => {
		let canceled = false;
		const menu = new TabMenu({ nodes: tree(), theme: THEME, onCancel: () => (canceled = true) });
		menu.handleInput("\t"); // -> Jira
		menu.handleInput("\r"); // descend into Jira's modes
		menu.handleInput("\x1b"); // back up, not cancel
		expect(canceled).toBe(false);
		expect(menu.getBreadcrumb()).toEqual([]);
		expect(menu.getCurrentNode()?.label).toBe("Jira");
	});

	it("escape at the root cancels", () => {
		let canceled = false;
		const menu = new TabMenu({ nodes: tree(), theme: THEME, onCancel: () => (canceled = true) });
		menu.handleInput("\x1b");
		expect(canceled).toBe(true);
	});

	it("a mnemonic jumps to and activates its node in one step -- resolving a leaf, or descending a branch", () => {
		let selected: string | undefined;
		const menu = new TabMenu({
			nodes: tree(),
			theme: THEME,
			onSelect: (v) => {
				selected = v;
			},
		});
		menu.handleInput("j"); // Jira has children -- descends, does not resolve
		expect(selected).toBeUndefined();
		expect(menu.getCurrentNode()?.label).toBe("Issues");

		const leafMenu = new TabMenu({
			nodes: tree(),
			theme: THEME,
			onSelect: (v) => {
				selected = v;
			},
		});
		leafMenu.handleInput("h"); // GitHub is a leaf -- resolves immediately
		expect(selected).toBe("github:issues");
	});

	it("an unrecognized mnemonic is a no-op", () => {
		let selected: string | undefined;
		const menu = new TabMenu({
			nodes: tree(),
			theme: THEME,
			onSelect: (v) => {
				selected = v;
			},
		});
		menu.handleInput("z");
		expect(selected).toBeUndefined();
		expect(menu.getCurrentNode()?.label).toBe("GitHub");
	});

	it("the help line names esc as 'cancel' at the root and 'back' once descended, and 'enter open' vs 'enter select' by node kind", () => {
		const menu = new TabMenu({ nodes: tree(), theme: THEME });
		expect(menu.render(80).join("\n")).toContain("enter select");
		expect(menu.render(80).join("\n")).toContain("esc cancel");
		menu.handleInput("\t"); // -> Jira (a branch)
		expect(menu.render(80).join("\n")).toContain("enter open");
		menu.handleInput("\r"); // descend
		expect(menu.render(80).join("\n")).toContain("esc back");
	});
});
