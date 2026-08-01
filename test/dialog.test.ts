import { describe, expect, it } from "bun:test";
import { asciiGlyphs } from "../src/glyphs.ts";
import { Dialog } from "../src/components/dialog.ts";

const THEME = { border: (s: string) => s, title: (s: string) => s, body: (s: string) => s, dim: (s: string) => s };

describe("Dialog", () => {
	it("renders a bordered title, body, and action hints", () => {
		const dialog = new Dialog({
			title: "Confirm",
			body: "Are you sure?",
			actions: [{ label: "Yes", key: "y", action: () => {} }, { label: "No", key: "n", action: () => {} }],
			theme: THEME,
		});
		const lines = dialog.render(40);
		expect(lines[0]).toBe("─".repeat(40));
		expect(lines[1]).toContain("Confirm");
		expect(lines.some((l) => l.includes("Are you sure?"))).toBe(true);
		expect(lines.some((l) => l.includes("[y] Yes") && l.includes("[n] No"))).toBe(true);
		expect(lines[lines.length - 1]).toBe("─".repeat(40));
	});

	it("renders a multi-line body as separate lines", () => {
		const dialog = new Dialog({ title: "T", body: "line1\nline2", actions: [], theme: THEME });
		const lines = dialog.render(40);
		expect(lines.some((l) => l.includes("line1"))).toBe(true);
		expect(lines.some((l) => l.includes("line2"))).toBe(true);
	});

	it("truncates a body line longer than the available width", () => {
		const dialog = new Dialog({ title: "T", body: "x".repeat(100), actions: [], theme: THEME });
		const lines = dialog.render(20);
		expect(lines.some((l) => l.includes("…"))).toBe(true);
	});

	it("invokes the matching action's callback on its key, case-insensitively", () => {
		let called = false;
		const dialog = new Dialog({ title: "T", body: "b", actions: [{ label: "Yes", key: "y", action: () => { called = true; } }], theme: THEME });
		dialog.handleInput("Y");
		expect(called).toBe(true);
	});

	it("does nothing for a key with no matching action", () => {
		let called = false;
		const dialog = new Dialog({ title: "T", body: "b", actions: [{ label: "Yes", key: "y", action: () => { called = true; } }], theme: THEME });
		dialog.handleInput("z");
		expect(called).toBe(false);
	});

	it("Escape invokes the action keyed \"n\" or \"Esc\", if any", () => {
		let called = false;
		const dialog = new Dialog({ title: "T", body: "b", actions: [{ label: "No", key: "n", action: () => { called = true; } }], theme: THEME });
		dialog.handleInput("\x1b");
		expect(called).toBe(true);
	});

	it("Escape with no n/Esc-keyed action is a no-op, not a throw", () => {
		const dialog = new Dialog({ title: "T", body: "b", actions: [{ label: "Yes", key: "y", action: () => {} }], theme: THEME });
		expect(() => dialog.handleInput("\x1b")).not.toThrow();
	});

	it("implements the Component interface (render + invalidate)", () => {
		const dialog = new Dialog({ title: "T", body: "b", actions: [], theme: THEME });
		expect(typeof dialog.render).toBe("function");
		expect(() => dialog.invalidate()).not.toThrow();
	});

	// A Dialog rendered as another already-bordered container's own content
	// (e.g. an Envelope's setContent) doesn't need its own top/bottom rule --
	// confirmed live as a real user-reported bug: two horizontal rules landed
	// back to back, immediately inside the Envelope's own top/bottom border.
	it("omits its own top/bottom rule when framed is false, keeping title/body/hints", () => {
		const dialog = new Dialog({ title: "Confirm", body: "Are you sure?", actions: [{ label: "Yes", key: "y", action: () => {} }], theme: THEME, framed: false });
		const lines = dialog.render(40);
		expect(lines[0]).not.toBe("─".repeat(40));
		expect(lines[lines.length - 1]).not.toBe("─".repeat(40));
		expect(lines[0]).toContain("Confirm");
		expect(lines.some((l) => l.includes("Are you sure?"))).toBe(true);
		expect(lines.some((l) => l.includes("[y] Yes"))).toBe(true);
	});

	it("draws its border from an injected glyph set instead of the unicode default", () => {
		const dialog = new Dialog({ title: "T", body: "b", actions: [], theme: THEME, glyphs: asciiGlyphs });
		const lines = dialog.render(10);
		expect(lines[0]).toBe("-".repeat(10));
		expect(lines[lines.length - 1]).toBe("-".repeat(10));
	});

	it("uses a custom KeyMatcher when provided instead of the legacy default", () => {
		let called = false;
		const dialog = new Dialog({
			title: "T",
			body: "b",
			actions: [{ label: "No", key: "n", action: () => { called = true; } }],
			theme: THEME,
			matchesKey: (data, keyId) => keyId === "escape" && data === "CUSTOM_ESCAPE",
		});
		dialog.handleInput("\x1b");
		expect(called).toBe(false);
		dialog.handleInput("CUSTOM_ESCAPE");
		expect(called).toBe(true);
	});
});
