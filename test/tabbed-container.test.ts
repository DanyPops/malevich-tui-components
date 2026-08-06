import { describe, expect, it } from "bun:test";
import type { Component } from "../src/component.ts";
import { TabbedContainer, type TabbedContainerTab } from "../src/components/tabbed-container.ts";
import { asciiTextMeasure } from "../src/text-measure.ts";

const THEME = { tab: (s: string) => s, activeTab: (s: string) => `[${s}]`, mnemonic: (s: string) => `<${s}>` };

function fakeContent(lines: string[]): Component & { received: string[] } {
	const received: string[] = [];
	return {
		received,
		render: () => lines,
		invalidate() {},
		handleInput(data: string) {
			received.push(data);
		},
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
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		const bar = container.render(80)[0]!;
		expect(bar).toContain("lpha");
		expect(bar).toContain("eta");
		expect(bar).toContain("amma");
		// Active tab's whole plain label is wrapped by activeTab; an inactive
		// one only by tab, with its mnemonic highlighted separately.
		expect(bar).toContain("[ Alpha ]");
		expect(bar).toContain("<B>eta");
		expect(bar).toContain("<G>amma");
	});

	// The first letter of every UNFOCUSED tab's label is its mnemonic --
	// pressing it jumps straight there, so it's rendered in a visually
	// distinct style from the rest of the label. The active tab is already
	// where you are, so it renders its plain label with no mnemonic
	// highlight -- there's nothing to advertise a jump to.
	it("highlights each label's first letter distinctly, as its mnemonic, on unfocused tabs only", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		const bar = container.render(80)[0]!;
		expect(bar).not.toContain("<A>"); // Alpha is active -- no mnemonic highlight
		expect(bar).toContain("<B>");
		expect(bar).toContain("<G>");
	});

	it("renders the active tab's own content directly below the tab bar", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		expect(container.render(80)).toEqual(["[ Alpha ]  <B>eta   <G>amma ", "alpha body"]);
	});

	it("defaults to the first tab, or an explicit initialKey when given", () => {
		const withDefault = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		expect(withDefault.getActiveKey()).toBe("a");
		const withInitial = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure, initialKey: "b" });
		expect(withInitial.getActiveKey()).toBe("b");
	});

	it("setActive switches which tab is highlighted and rendered", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		container.setActive("c");
		expect(container.getActiveKey()).toBe("c");
		const lines = container.render(80);
		expect(lines[0]).toContain("[ Gamma ]"); // now active -- plain label, no mnemonic
		expect(lines[0]).toContain("<A>lpha"); // now unfocused -- mnemonic highlighted
		expect(lines).toEqual([lines[0]!, "gamma body"]);
	});

	it("setActive to an unknown key is a no-op, not a throw", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		expect(() => container.setActive("nonexistent")).not.toThrow();
		expect(container.getActiveKey()).toBe("a");
	});

	it("Left/Right arrows cycle tabs, wrapping at both ends", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
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
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		container.handleInput("\t"); // tab
		expect(container.getActiveKey()).toBe("b");
		container.handleInput("\x1b[Z"); // shift+tab
		expect(container.getActiveKey()).toBe("a");
		container.handleInput("\x1b[Z"); // wraps backward
		expect(container.getActiveKey()).toBe("c");
	});

	describe("resolveMnemonic", () => {
		it("resolves a label's first letter, case-insensitively, to that tab's key", () => {
			const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
			expect(container.resolveMnemonic("a")).toBe("a");
			expect(container.resolveMnemonic("A")).toBe("a");
			expect(container.resolveMnemonic("g")).toBe("c"); // Gamma's own key is "c", not "g"
		});

		it("returns undefined for a letter matching no tab's mnemonic", () => {
			const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
			expect(container.resolveMnemonic("z")).toBeUndefined();
		});

		it("an explicit mnemonic overrides the label's own first letter, resolving and rendering distinctly", () => {
			const overridden: TabbedContainerTab[] = [
				{ key: "gh", label: "GitHub", content: fakeContent(["gh body"]), mnemonic: "h" },
				{ key: "gl", label: "GitLab", content: fakeContent(["gl body"]), mnemonic: "l" },
			];
			const container = new TabbedContainer({ tabs: overridden, theme: THEME, measure: asciiTextMeasure });
			// The default first-letter ('g') would collide between GitHub and GitLab --
			// neither resolves via 'g' once both have an explicit override.
			expect(container.resolveMnemonic("g")).toBeUndefined();
			expect(container.resolveMnemonic("h")).toBe("gh");
			expect(container.resolveMnemonic("l")).toBe("gl");
			// The active tab (GitHub, first by default) renders its plain label; GitLab
			// (unfocused) highlights its override letter in place -- "l" occurs inside
			// "GitLab" itself, so it's styled where it actually sits, not bracketed.
			const bar = container.render(80)[0]!;
			expect(bar).toContain("[ GitHub ]");
			expect(bar).toContain("Git<L>ab");
		});

		it("highlights an explicit mnemonic in place wherever it occurs mid-label, not just as a prefix", () => {
			const midLabel: TabbedContainerTab[] = [
				{ key: "a", label: "Alpha", content: fakeContent(["a"]) },
				{ key: "board", label: "Board view", content: fakeContent(["b"]), mnemonic: "v" },
			];
			const container = new TabbedContainer({ tabs: midLabel, theme: THEME, measure: asciiTextMeasure });
			const bar = container.render(80)[0]!;
			expect(bar).toContain("Board <v>iew");
			expect(container.resolveMnemonic("v")).toBe("board");
		});

		it("falls back to a bracketed hint only when the mnemonic doesn't occur anywhere in the label", () => {
			const absent: TabbedContainerTab[] = [
				{ key: "a", label: "Alpha", content: fakeContent(["a"]) },
				{ key: "board", label: "Board view", content: fakeContent(["b"]), mnemonic: "u" },
			];
			const container = new TabbedContainer({ tabs: absent, theme: THEME, measure: asciiTextMeasure });
			const bar = container.render(80)[0]!;
			expect(bar).toContain("<[u]>Board view");
			expect(container.resolveMnemonic("u")).toBe("board");
		});
	});

	it("fires onChange with the newly active key whenever the active tab changes", () => {
		const changes: string[] = [];
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure, onChange: (key) => changes.push(key) });
		container.handleInput("\x1b[C");
		container.setActive("a");
		expect(changes).toEqual(["b", "a"]);
	});

	it("setActive to the already-active tab does not fire onChange again", () => {
		const changes: string[] = [];
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure, onChange: (key) => changes.push(key) });
		container.setActive("a");
		expect(changes).toEqual([]);
	});

	it("delegates any key other than Left/Right straight to the active tab's own content", () => {
		const t = tabs();
		const container = new TabbedContainer({ tabs: t, theme: THEME, measure: asciiTextMeasure });
		container.handleInput("x");
		expect((t[0]!.content as ReturnType<typeof fakeContent>).received).toEqual(["x"]);
		expect((t[1]!.content as ReturnType<typeof fakeContent>).received).toEqual([]);
	});

	it("invalidate propagates to every tab's content, not just the active one", () => {
		const t = tabs();
		const container = new TabbedContainer({ tabs: t, theme: THEME, measure: asciiTextMeasure });
		let invalidated = 0;
		for (const tab of t)
			tab.content.invalidate = () => {
				invalidated += 1;
			};
		container.invalidate();
		expect(invalidated).toBe(3);
	});

	it("bounds the tab bar to the render width through the injected measure", () => {
		const tabs = [
			{ key: "packages", label: "Packages", content: fakeContent([]) },
			{ key: "find", label: "Find", content: fakeContent([]) },
			{ key: "config", label: "Config", content: fakeContent([]) },
			{ key: "settings", label: "Settings", content: fakeContent([]) },
		];
		const container = new TabbedContainer({ tabs, theme: THEME, measure: asciiTextMeasure });
		expect(container.render(36)[0]).toHaveLength(36);
	});

	it("never truncates mid-ANSI-escape-sequence given a real ANSI-aware measure (regression)", () => {
		// Real 256-color theme, matching a real host's Theme.fg exactly (this exact
		// escape shape is what corrupted mid-cut in the wild -- see pi-tickets'
		// own tui.test.ts width-consistency regression, caused by a caller that
		// never passed a real measure at all -- now impossible, measure is required).
		const realAnsiTheme = {
			tab: (s: string) => `\x1b[38;5;208m${s}\x1b[0m`,
			activeTab: (s: string) => `\x1b[38;5;208m${s}\x1b[0m`,
			mnemonic: (s: string) => `\x1b[38;5;208m${s}\x1b[0m`,
		};
		// A minimal but real ANSI-aware measure: strips escape codes before counting/slicing,
		// unlike asciiTextMeasure's raw-byte-count truncateToWidth.
		const ansiAwareMeasure = {
			visibleWidth: (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "").length,
			truncateToWidth: (text: string, maxWidth: number) => {
				let visible = 0;
				let result = "";
				for (let i = 0; i < text.length; ) {
					const match = /^\x1b\[[0-9;]*m/.exec(text.slice(i));
					if (match) {
						result += match[0];
						i += match[0].length;
						continue;
					}
					if (visible >= maxWidth) break;
					result += text[i];
					visible += 1;
					i += 1;
				}
				return result;
			},
		};
		const wideTabs = [
			{ key: "gh", label: "GitHub", content: fakeContent([]) },
			{ key: "jira", label: "Jira", content: fakeContent([]) },
			{ key: "gl", label: "GitLab", content: fakeContent([]) },
		];
		const container = new TabbedContainer({ tabs: wideTabs, theme: realAnsiTheme, measure: ansiAwareMeasure });
		const bar = container.render(30)[0]!;

		// Strip every COMPLETE CSI sequence; anything left over that still starts
		// an escape means one was cut mid-sequence -- a real terminal reads that
		// as garbage/leftover bytes, not a color code.
		const withoutCompleteSequences = bar.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
		expect(withoutCompleteSequences).not.toContain("\x1b");
	});

	it("implements the Component interface", () => {
		const container = new TabbedContainer({ tabs: tabs(), theme: THEME, measure: asciiTextMeasure });
		expect(typeof container.render).toBe("function");
		expect(typeof container.handleInput).toBe("function");
		expect(() => container.invalidate()).not.toThrow();
	});
});
