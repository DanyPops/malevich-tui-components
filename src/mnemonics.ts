/**
 * Tree-style mnemonic/accelerator conflict detection -- the same rule
 * real menu systems have used for decades (Win32, Motif, Swing, JavaFX):
 * "no two commands available from the same menu bar should have the same
 * accelerator key." Conflicts are scoped to what's actually reachable at
 * once (a root's own bindings plus whichever single child is currently
 * active), not global uniqueness -- two sibling contexts (e.g. two
 * different tabs, never simultaneously visible) may freely reuse the same
 * key for two different things.
 */
export interface KeyBinding {
	/** The raw key this binding fires on, e.g. "s", "\x1b", "\t". */
	key: string;
	/** Human-readable action, used to report a conflict and to recognize
	 * the SAME action bound via two different code paths (not a conflict --
	 * see findMnemonicConflicts' own doc comment). */
	description: string;
}

export interface MnemonicContext {
	name: string;
	bindings: KeyBinding[];
	/** Never simultaneously active with a sibling -- only with ancestors. */
	children?: MnemonicContext[];
}

export interface MnemonicConflict {
	/** Context names from the tree's root to the conflicting leaf, inclusive. */
	path: string[];
	key: string;
	/** The >=2 distinct actions this key would ambiguously trigger along this path. */
	descriptions: string[];
}

/**
 * Walks every root-to-leaf path and reports a key bound to more than one
 * DISTINCT action anywhere along that path -- the set of bindings
 * genuinely reachable at once when that leaf is the active context.
 * Two bindings sharing the same key but the identical description are not
 * a conflict: that's the same action wired through two code paths (e.g. a
 * generic host-level shortcut and a context's own richer version of the
 * same jump), not an ambiguity a user could ever perceive.
 */
export function findMnemonicConflicts(root: MnemonicContext): MnemonicConflict[] {
	const conflicts: MnemonicConflict[] = [];

	function walk(context: MnemonicContext, ancestors: MnemonicContext[]): void {
		const path = [...ancestors, context];
		if (!context.children || context.children.length === 0) {
			const byKey = new Map<string, Set<string>>();
			for (const ctx of path) {
				for (const binding of ctx.bindings) {
					const descriptions = byKey.get(binding.key) ?? new Set<string>();
					descriptions.add(binding.description);
					byKey.set(binding.key, descriptions);
				}
			}
			for (const [key, descriptions] of byKey) {
				if (descriptions.size > 1) {
					conflicts.push({ path: path.map((c) => c.name), key, descriptions: [...descriptions] });
				}
			}
			return;
		}
		for (const child of context.children) walk(child, path);
	}

	walk(root, []);
	return conflicts;
}

/** Formats a conflict list into one readable, actionable multi-line message. */
export function formatMnemonicConflicts(conflicts: MnemonicConflict[]): string {
	return conflicts
		.map((c) => `key ${JSON.stringify(c.key)} in ${c.path.join(" > ")}: ${c.descriptions.join(" vs. ")}`)
		.join("\n");
}

/** Throws with a formatted, actionable message if any conflict exists --
 * meant to run as a standing test assertion (a "built-in" check) against
 * a real application's own mnemonic tree, so a newly added keybinding
 * that collides with an already-reachable one fails loudly immediately,
 * not just when someone happens to notice live. */
export function assertNoMnemonicConflicts(root: MnemonicContext): void {
	const conflicts = findMnemonicConflicts(root);
	if (conflicts.length > 0) {
		throw new Error(`mnemonic/keybinding conflict(s) detected:\n${formatMnemonicConflicts(conflicts)}`);
	}
}
