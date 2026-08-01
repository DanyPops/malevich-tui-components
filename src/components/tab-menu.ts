/**
 * Horizontal tab bar that can descend into child levels -- a "pick a
 * provider, then pick a mode" flow expressed as one walkable tree instead
 * of a chain of separate dialogs. Enter on a node with children walks down
 * into them; Escape walks back up one level, or cancels at the root. A
 * node without children is a leaf: Enter resolves onSelect with its value.
 */
import type { Component } from "../component.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";

export interface TabMenuNode<T> {
	label: string;
	/** Single-character shortcut that jumps straight to this node and activates it -- same as moving the highlight here and pressing Enter. */
	mnemonic?: string;
	/** Shown on the description line whenever this node is highlighted. */
	description?: string;
	/** Present on a branch node: Enter walks down into these instead of resolving. */
	children?: TabMenuNode<T>[];
	/** Present on a leaf node (no children): Enter resolves onSelect with this. */
	value?: T;
}

export interface TabMenuTheme {
	tab: (s: string) => string;
	activeTab: (s: string) => string;
	breadcrumb: (s: string) => string;
	description: (s: string) => string;
	help: (s: string) => string;
}

export interface TabMenuOptions<T> {
	nodes: TabMenuNode<T>[];
	theme: TabMenuTheme;
	/** Fires when Enter (or a mnemonic) resolves a leaf node. */
	onSelect?: (value: T) => void;
	/** Fires when Escape is pressed at the root level. */
	onCancel?: () => void;
	matchesKey?: KeyMatcher;
}

interface Level<T> {
	nodes: TabMenuNode<T>[];
	index: number;
}

/**
 * A caller that wants to skip a level with only one real choice (e.g. a
 * single configured provider) should compress that ahead of construction --
 * seed `nodes` with the already-descended level rather than asking this
 * component to guess when skipping is appropriate.
 */
export class TabMenu<T> implements Component {
	private readonly matchesKey: KeyMatcher;
	private readonly stack: Level<T>[];

	constructor(private readonly opts: TabMenuOptions<T>) {
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		this.stack = [{ nodes: opts.nodes, index: 0 }];
	}

	invalidate(): void {}

	/** Labels of the ancestor nodes walked down through to reach the current level, root first. Empty at the top. */
	getBreadcrumb(): string[] {
		return this.stack.slice(0, -1).map((level) => level.nodes[level.index]!.label);
	}

	getCurrentNode(): TabMenuNode<T> | undefined {
		const level = this.currentLevel();
		return level.nodes[level.index];
	}

	render(_width: number): string[] {
		const level = this.currentLevel();
		const { theme } = this.opts;
		const breadcrumb = this.getBreadcrumb();
		const prefix = breadcrumb.length > 0 ? `${theme.breadcrumb(`${breadcrumb.join(" \u203a ")} \u203a`)} ` : "";
		const tabs = level.nodes
			.map((node, i) => (i === level.index ? theme.activeTab(` ${node.label} `) : theme.tab(` ${node.label} `)))
			.join(" ");

		const lines = [prefix + tabs];
		const current = level.nodes[level.index];
		if (current?.description) lines.push(theme.description(current.description));
		lines.push(theme.help(this.helpText(level, current)));
		return lines;
	}

	handleInput(data: string): void {
		if (this.matchesKey(data, "escape")) {
			if (this.stack.length > 1) this.stack.pop();
			else this.opts.onCancel?.();
			return;
		}
		if (this.matchesKey(data, "enter")) {
			this.activate(this.currentLevel().index);
			return;
		}
		if (this.matchesKey(data, "left") || this.matchesKey(data, "shift+tab")) {
			this.move(-1);
			return;
		}
		if (this.matchesKey(data, "right") || this.matchesKey(data, "tab")) {
			this.move(1);
			return;
		}
		const level = this.currentLevel();
		const mnemonicIndex = level.nodes.findIndex((n) => n.mnemonic === data);
		if (mnemonicIndex >= 0) this.activate(mnemonicIndex);
	}

	private currentLevel(): Level<T> {
		return this.stack[this.stack.length - 1]!;
	}

	private move(delta: number): void {
		const level = this.currentLevel();
		level.index = (level.index + delta + level.nodes.length) % level.nodes.length;
	}

	private activate(index: number): void {
		const level = this.currentLevel();
		const node = level.nodes[index];
		if (!node) return;
		level.index = index;
		if (node.children?.length) {
			this.stack.push({ nodes: node.children, index: 0 });
			return;
		}
		this.opts.onSelect?.(node.value as T);
	}

	private helpText(level: Level<T>, current: TabMenuNode<T> | undefined): string {
		const parts = ["\u2190\u2192/tab flip"];
		for (const node of level.nodes) if (node.mnemonic) parts.push(`${node.mnemonic} ${node.label}`);
		parts.push(current?.children?.length ? "enter open" : "enter select");
		parts.push(this.stack.length > 1 ? "esc back" : "esc cancel");
		return parts.join(" \u2022 ");
	}
}
