import { describe, expect, it } from "bun:test";
import type { Component } from "../src/component.ts";
import { TabbedContainer, type TabbedContainerTab } from "../src/components/tabbed-container.ts";

const THEME = { tab: (s: string) => s, activeTab: (s: string) => `[${s}]`, mnemonic: (s: string) => `<${s}>` };

function fakeContent(lines: string[]): Component & { received: string[] } {
	const received: string[] = [];
	return {
		received,
		render: () => lines,
		invalidate() {},
		handleInput(data: string) { received.push(data); },
	};
}

function tabs(): TabbedContainerTab[] {
	return [
		{ key: "a", label: "Alpha", content: fakeContent(["alpha body"]) },
		{ key: "b", label: "Beta", content: fakeContent(["beta body"]) },
		{ key: "c", label: "Gamma", content: fakeContent(["gamma body"]) },
	];
}

describe("TabbedContainer", () => {
	it("renders every tab's label on one persistent bar, with the active one highlighted", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		const bar = container.render(80)[0]!;
		expect(bar).toContain("lpha");
		expect(bar).toContain("eta");
		expect(bar).toContain("amma");
		// Active tab's whole label (mnemonic + rest) is wrapped by activeTab; an
		// inactive one only by tab.
		expect(bar).toContain("[ <A>lpha ");
		expect(bar).not.toContain("[<B>eta");
		expect(bar).not.toContain("[<G>amma");
	});

	// The first letter of every tab's label is its mnemonic -- pressing it
	// (from a context that isn't capturing free text) jumps straight there,
	// so it's rendered in a visually distinct style from the rest of the
	// label, on every tab, active or not (not just the active one).
	it("highlights each label's first letter distinctly, as its mnemonic, on every tab", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		const bar = container.render(80)[0]!;
		expect(bar).toContain("<A>");
		expect(bar).toContain("<B>");
		expect(bar).toContain("<G>");
	});

	it("renders the active tab's own content directly below the tab bar", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		expect(container.render(80)).toEqual(["[ <A>lpha ]  <B>eta   <G>amma ", "alpha body"]);
	});

	it("defaults to the first tab, or an explicit initialKey when given", () => {
		const withDefault = new TabbedContainer({ tabs: tabs(), theme: THEME });
		expect(withDefault.getActiveKey()).toBe("a");
		const withInitial = new TabbedContainer({ tabs: tabs(), theme: THEME, initialKey: "b" });
		expect(withInitial.getActiveKey()).toBe("b");
	});

	it("setActive switches which tab is highlighted and rendered", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		container.setActive("c");
		expect(container.getActiveKey()).toBe("c");
		const lines = container.render(80);
		expect(lines[0]).toContain("[ <G>amma ");
		expect(lines[0]).not.toContain("[<A>lpha");
		expect(lines).toEqual([lines[0]!, "gamma body"]);
	});

	it("setActive to an unknown key is a no-op, not a throw", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		expect(() => container.setActive("nonexistent")).not.toThrow();
		expect(container.getActiveKey()).toBe("a");
	});

	it("Left/Right arrows cycle tabs, wrapping at both ends", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		container.handleInput("\x1b[C"); // right
		expect(container.getActiveKey()).toBe("b");
		container.handleInput("\x1b[C");
		expect(container.getActiveKey()).toBe("c");
		container.handleInput("\x1b[C"); // wraps
		expect(container.getActiveKey()).toBe("a");
		container.handleInput("\x1b[D"); // left wraps the other way
		expect(container.getActiveKey()).toBe("c");
	});

	it("Tab/Shift-Tab also cycle tabs, wrapping at both ends -- same as Left/Right", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		container.handleInput("\t"); // tab
		expect(container.getActiveKey()).toBe("b");
		container.handleInput("\x1b[Z"); // shift+tab
		expect(container.getActiveKey()).toBe("a");
		container.handleInput("\x1b[Z"); // wraps backward
		expect(container.getActiveKey()).toBe("c");
	});

	describe("resolveMnemonic", () => {
		it("resolves a label's first letter, case-insensitively, to that tab's key", () => {
			const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
			expect(container.resolveMnemonic("a")).toBe("a");
			expect(container.resolveMnemonic("A")).toBe("a");
			expect(container.resolveMnemonic("g")).toBe("c"); // Gamma's own key is "c", not "g"
		});

		it("returns undefined for a letter matching no tab's mnemonic", () => {
			const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
			expect(container.resolveMnemonic("z")).toBeUndefined();
		});
	});

	it("fires onChange with the newly active key whenever the active tab changes", () => {
		const changes: string[] = [];
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, onChange: (key) => changes.push(key) });
		container.handleInput("\x1b[C");
		container.setActive("a");
		expect(changes).toEqual(["b", "a"]);
	});

	it("setActive to the already-active tab does not fire onChange again", () => {
		const changes: string[] = [];
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, onChange: (key) => changes.push(key) });
		container.setActive("a");
		expect(changes).toEqual([]);
	});

	it("delegates any key other than Left/Right straight to the active tab's own content", () => {
		const t = tabs();
		const container = new TabbedContainer({ tabs: t, theme: THEME });
		container.handleInput("x");
		expect((t[0]!.content as ReturnType<typeof fakeContent>).received).toEqual(["x"]);
		expect((t[1]!.content as ReturnType<typeof fakeContent>).received).toEqual([]);
	});

	it("invalidate propagates to every tab's content, not just the active one", () => {
		const t = tabs();
		const container = new TabbedContainer({ tabs: t, theme: THEME });
		let invalidated = 0;
		for (const tab of t) tab.content.invalidate = () => { invalidated += 1; };
		container.invalidate();
		expect(invalidated).toBe(3);
	});

	it("implements the Component interface", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME });
		expect(typeof container.render).toBe("function");
		expect(typeof container.handleInput).toBe("function");
		expect(() => container.invalidate()).not.toThrow();
	});
});
