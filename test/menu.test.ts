import { describe, expect, it } from "bun:test";
import { Menu } from "../src/components/menu.ts";

const THEME = { border: (s: string) => s, selected: (s: string) => `>${s}`, normal: (s: string) => s, dim: (s: string) => s, title: (s: string) => s };

function items(actions: Array<() => void> = []) {
	return [
		{ label: "First", key: "f", action: actions[0] ?? (() => {}) },
		{ label: "Second", key: "s", description: "the second one", action: actions[1] ?? (() => {}) },
	];
}

describe("Menu", () => {
	it("renders a bordered list with the first item selected by default", () => {
		const menu = new Menu({ items: items(), theme: THEME });
		const lines = menu.render(40);
		expect(lines[0]).toBe("─".repeat(40));
		expect(lines[1]).toStartWith(">");
		expect(lines[1]).toContain("First");
		expect(lines[2]).not.toStartWith(">");
	});

	it("renders the title below the top border when provided, matching Dialog/BorderedSelectPanel's shared frame order", () => {
		const menu = new Menu({ items: items(), title: "Actions", theme: THEME });
		expect(menu.render(40)[1]).toBe("Actions");
	});

	it("includes the key hint and description in each item's line", () => {
		const menu = new Menu({ items: items(), theme: THEME });
		const lines = menu.render(40);
		expect(lines[1]).toContain("[f]");
		expect(lines[2]).toContain("[s]");
		expect(lines[2]).toContain("the second one");
	});

	it("Down/j moves selection forward, wrapping past the last item", () => {
		const menu = new Menu({ items: items(), theme: THEME });
		menu.handleInput("j");
		expect(menu.render(40)[2]).toStartWith(">");
		menu.handleInput("j");
		expect(menu.render(40)[1]).toStartWith(">"); // wrapped back to the first
	});

	it("Up/k moves selection backward, wrapping before the first item", () => {
		const menu = new Menu({ items: items(), theme: THEME });
		menu.handleInput("k");
		expect(menu.render(40)[2]).toStartWith(">"); // wrapped to the last
	});

	it("Enter runs the selected item's action", () => {
		let ran = false;
		const menu = new Menu({ items: items([() => { ran = true; }]), theme: THEME });
		menu.handleInput("\r");
		expect(ran).toBe(true);
	});

	it("a direct shortcut key runs that item's action regardless of current selection", () => {
		let ran = false;
		const menu = new Menu({ items: items([() => {}, () => { ran = true; }]), theme: THEME });
		menu.handleInput("s");
		expect(ran).toBe(true);
	});

	it("Escape and q both invoke onClose", () => {
		let closes = 0;
		const menu = new Menu({ items: items(), theme: THEME, onClose: () => { closes++; } });
		menu.handleInput("\x1b");
		menu.handleInput("q");
		expect(closes).toBe(2);
	});

	it("truncates an item line longer than the available width", () => {
		const menu = new Menu({ items: [{ label: "x".repeat(100), action: () => {} }], theme: THEME });
		expect(menu.render(20)[1]).toContain("…");
	});

	it("uses a custom KeyMatcher when provided instead of the legacy default", () => {
		const menu = new Menu({ items: items(), theme: THEME, matchesKey: (data, keyId) => keyId === "down" && data === "CUSTOM_DOWN" });
		menu.handleInput("CUSTOM_DOWN");
		expect(menu.render(40)[2]).toStartWith(">");
	});

	it("implements the Component interface (render + invalidate)", () => {
		const menu = new Menu({ items: items(), theme: THEME });
		expect(typeof menu.render).toBe("function");
		expect(() => menu.invalidate()).not.toThrow();
	});
});
