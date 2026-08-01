import { describe, expect, it } from "bun:test";
import { assertNoMnemonicConflicts, findMnemonicConflicts, formatMnemonicConflicts, type MnemonicContext } from "../src/mnemonics.ts";

describe("findMnemonicConflicts", () => {
	it("reports no conflicts for a tree with no repeated keys anywhere", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [{ key: "\x1b", description: "close" }],
			children: [
				{ name: "tabA", bindings: [{ key: "a", description: "action A" }] },
				{ name: "tabB", bindings: [{ key: "b", description: "action B" }] },
			],
		};
		expect(findMnemonicConflicts(root)).toEqual([]);
	});

	it("allows two sibling contexts to freely reuse the same key for two different actions -- never simultaneously reachable", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [],
			children: [
				{ name: "tabA", bindings: [{ key: "v", description: "cycle view mode" }] },
				{ name: "tabB", bindings: [{ key: "v", description: "cycle scope" }] },
			],
		};
		expect(findMnemonicConflicts(root)).toEqual([]);
	});

	it("detects a real conflict between a parent's own binding and a child's, since both are reachable at once", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [{ key: "f", description: "jump to Find" }],
			children: [
				{ name: "config", bindings: [{ key: "f", description: "filter resources" }] },
			],
		};
		const conflicts = findMnemonicConflicts(root);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]).toMatchObject({ path: ["global", "config"], key: "f" });
		expect(conflicts[0]!.descriptions.sort()).toEqual(["filter resources", "jump to Find"]);
	});

	it("does not flag the same action bound via two different code paths (identical description) as a conflict", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [{ key: "f", description: "jump to Find" }],
			children: [
				{ name: "packages", bindings: [{ key: "f", description: "jump to Find" }] },
			],
		};
		expect(findMnemonicConflicts(root)).toEqual([]);
	});

	it("detects a conflict several levels deep, across every ancestor on that specific path", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [{ key: "\t", description: "next tab" }],
			children: [
				{
					name: "config",
					bindings: [{ key: "r", description: "refresh" }],
					children: [
						{ name: "config.global-scope", bindings: [{ key: "\t", description: "switch scope" }] },
						{ name: "config.project-scope", bindings: [{ key: "x", description: "remove" }] },
					],
				},
			],
		};
		const conflicts = findMnemonicConflicts(root);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]!.path).toEqual(["global", "config", "config.global-scope"]);
		expect(conflicts[0]!.key).toBe("\t");
	});

	it("reports a genuine three-way collision along one path with all three distinct descriptions", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [{ key: "s", description: "jump to Settings" }],
			children: [
				{
					name: "mid",
					bindings: [{ key: "s", description: "save" }],
					children: [{ name: "leaf", bindings: [{ key: "s", description: "search" }] }],
				},
			],
		};
		const conflicts = findMnemonicConflicts(root);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]!.descriptions.sort()).toEqual(["jump to Settings", "save", "search"]);
	});
});

describe("formatMnemonicConflicts", () => {
	it("renders one readable line per conflict", () => {
		const text = formatMnemonicConflicts([{ path: ["global", "config"], key: "f", descriptions: ["jump to Find", "filter resources"] }]);
		expect(text).toBe('key "f" in global > config: jump to Find vs. filter resources');
	});
});

describe("assertNoMnemonicConflicts", () => {
	it("does not throw for a conflict-free tree", () => {
		const root: MnemonicContext = { name: "global", bindings: [], children: [{ name: "tab", bindings: [{ key: "a", description: "a" }] }] };
		expect(() => assertNoMnemonicConflicts(root)).not.toThrow();
	});

	it("throws a formatted, actionable message when a real conflict exists", () => {
		const root: MnemonicContext = {
			name: "global",
			bindings: [{ key: "f", description: "jump to Find" }],
			children: [{ name: "config", bindings: [{ key: "f", description: "filter resources" }] }],
		};
		expect(() => assertNoMnemonicConflicts(root)).toThrow(/key "f" in global > config/);
	});
});
