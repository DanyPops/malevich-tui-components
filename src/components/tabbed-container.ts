/**
 * A persistent tab bar (every tab's label always visible, the current one
 * highlighted) over one swappable child Component's own render/input --
 * the composable primitive an ad hoc "close this overlay, open a
 * different one" panel switch was standing in for. Left/Right cycle tabs
 * (collision-free: no per-tab content here binds those); every other key
 * delegates straight to the active tab's own content, unmodified. Set as
 * an Envelope's own content the same way any other Component would be --
 * TabbedContainer doesn't own a border of its own, just the bar + the
 * active child's render/input, so it composes with Envelope's chrome
 * (and, on top of that, a Dialog swapped in via the host's own
 * `pendingDialog ?? tabbedContainer` -- the same content-replacement
 * stacking Envelope's setContent already provides, generalized one level
 * further by the host).
 */
import type { Component } from "../component.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";

export interface TabbedContainerTab {
	key: string;
	label: string;
	content: Component;
}

export interface TabBarTheme {
	tab: (s: string) => string;
	activeTab: (s: string) => string;
	/** Applied to just a tab's first letter (its mnemonic -- see resolveMnemonic), on every tab, active or not; nested inside tab/activeTab's own wrap so both styles compose the way this codebase already composes layered styling elsewhere (e.g. theme.bold(theme.fg(...))). */
	mnemonic: (s: string) => string;
}

export interface TabbedContainerOptions {
	tabs: TabbedContainerTab[];
	theme: TabBarTheme;
	/** Defaults to the first tab. */
	initialKey?: string;
	/** Fires with the newly active key whenever the active tab actually changes (Left/Right cycling or a setActive call) -- not on a setActive to the already-active tab. */
	onChange?: (key: string) => void;
	matchesKey?: KeyMatcher;
}

export class TabbedContainer implements Component {
	private readonly tabs: TabbedContainerTab[];
	private readonly theme: TabBarTheme;
	private readonly onChange?: (key: string) => void;
	private readonly matchesKey: KeyMatcher;
	private activeIndex: number;

	constructor(opts: TabbedContainerOptions) {
		this.tabs = opts.tabs;
		this.theme = opts.theme;
		this.onChange = opts.onChange;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		const initial = opts.initialKey !== undefined ? this.tabs.findIndex((t) => t.key === opts.initialKey) : 0;
		this.activeIndex = initial >= 0 ? initial : 0;
	}

	getActiveKey(): string {
		return this.tabs[this.activeIndex]!.key;
	}

	/** Every tab's mnemonic is its label's own first letter (matching the
	 * literal highlight this bar renders) -- resolved case-insensitively,
	 * since the displayed letter is capitalized but a plain keypress sends
	 * lowercase. Returns the matching tab's key, or undefined for no match.
	 * A host decides whether/when to actually act on this (e.g. never while
	 * the active tab's own content wants that character for free-text entry
	 * instead) -- this method only answers "which tab, if any". */
	resolveMnemonic(data: string): string | undefined {
		return this.tabs.find((t) => t.label.slice(0, 1).toLowerCase() === data.toLowerCase())?.key;
	}

	setActive(key: string): void {
		const index = this.tabs.findIndex((t) => t.key === key);
		if (index < 0 || index === this.activeIndex) return;
		this.activeIndex = index;
		this.onChange?.(key);
	}

	invalidate(): void {
		for (const tab of this.tabs) tab.content.invalidate();
	}

	render(width: number): string[] {
		const bar = this.tabs
			.map((tab, i) => {
				const wrap = i === this.activeIndex ? this.theme.activeTab : this.theme.tab;
				const first = tab.label.slice(0, 1);
				const rest = tab.label.slice(1);
				return wrap(` ${this.theme.mnemonic(first)}${rest} `);
			})
			.join(" ");
		return [bar, ...this.tabs[this.activeIndex]!.content.render(width)];
	}

	handleInput(data: string): void {
		if (this.matchesKey(data, "left") || this.matchesKey(data, "shift+tab")) {
			this.cycle(-1);
			return;
		}
		if (this.matchesKey(data, "right") || this.matchesKey(data, "tab")) {
			this.cycle(1);
			return;
		}
		this.tabs[this.activeIndex]!.content.handleInput?.(data);
	}

	private cycle(delta: number): void {
		const next = (this.activeIndex + delta + this.tabs.length) % this.tabs.length;
		this.activeIndex = next;
		this.onChange?.(this.tabs[next]!.key);
	}
}
