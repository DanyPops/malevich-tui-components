import { describe, expect, it } from "bun:test";
import { MultiSelectList, MultiSelectListModel } from "../src/components/multi-select-list.ts";

const THEME = {
	cursor: (s: string) => s,
	checked: (s: string) => s,
	unchecked: (s: string) => s,
	selectedLabel: (s: string) => s,
	label: (s: string) => s,
	description: (s: string) => s,
	status: (s: string) => s,
};

function items(count = 8) {
	return Array.from({ length: count }, (_, index) => ({ value: index + 1, label: `Topic ${index + 1}` }));
}

function list(count = 8, overrides: Record<string, unknown> = {}) {
	return new MultiSelectList({ items: items(count), maxVisibleRows: 5, theme: THEME, ...overrides });
}

describe("MultiSelectListModel", () => {
	it("moves focus directly and wraps at either boundary", () => {
		const model = new MultiSelectListModel(items(3));
		model.focus(2);
		expect(model.focusedItem?.value).toBe(3);
		model.focusNext();
		expect(model.focusedItem?.value).toBe(1);
		model.focusPrevious();
		expect(model.focusedItem?.value).toBe(3);
	});

	it("toggles focused state on and off without changing focus", () => {
		const model = new MultiSelectListModel(items(3));
		model.focus(1);
		expect(model.toggle()).toBe(true);
		expect(model.checkedValues).toEqual([2]);
		expect(model.focusedItem?.value).toBe(2);
		expect(model.toggle()).toBe(false);
		expect(model.checkedValues).toEqual([]);
	});

	it("confirms checked values in item order, or the focused value when none are checked", () => {
		const model = new MultiSelectListModel(items(3));
		model.focus(1);
		expect(model.confirmFocused()).toEqual({ kind: "submit", values: [2] });
		model.setChecked(2, true);
		model.setChecked(0, true);
		expect(model.confirmFocused()).toEqual({ kind: "submit", values: [1, 3] });
	});

	it("models an action row separately from selectable values", () => {
		const action = { value: "custom", label: "Type something", toggleable: false, confirmAction: "activate" as const };
		const model = new MultiSelectListModel([{ value: "option", label: "Option" }, action]);
		model.focus(1);
		expect(model.toggle()).toBeUndefined();
		expect(model.confirmFocused()).toEqual({ kind: "activate", item: action });
		expect(model.checkedValues).toEqual([]);
	});
});

describe("MultiSelectList rendering and input integration", () => {
	it("drives the exact four-row regression: down to the fifth item scrolls it into view, then space toggles it", () => {
		const component = list();
		expect(component.render(40)).toEqual(["→ 1. [ ] Topic 1", "  2. [ ] Topic 2", "  3. [ ] Topic 3", "  4. [ ] Topic 4", "  (1/8)"]);

		for (let index = 0; index < 4; index++) component.handleInput("\x1b[B");
		expect(component.render(40)).toContain("→ 5. [ ] Topic 5");
		component.handleInput(" ");
		expect(component.checkedValues).toEqual([5]);
		expect(component.render(40)).toContain("→ 5. [✓] Topic 5");
	});

	it("recomputes the viewport when its parent changes the row budget", () => {
		const component = list();
		component.setMaxVisibleRows(3);
		component.focus(4);
		const lines = component.render(40);
		expect(lines).toHaveLength(3);
		expect(lines).toContain("→ 5. [ ] Topic 5");
	});

	it("moves the viewport back up when focus returns above its visible range", () => {
		const component = list();
		component.focus(6);
		expect(component.render(40)).toContain("→ 7. [ ] Topic 7");
		component.focus(1);
		expect(component.render(40)).toContain("→ 2. [ ] Topic 2");
	});

	it("keeps a directly-focused item visible when descriptions consume additional rows", () => {
		const component = new MultiSelectList({
			items: Array.from({ length: 5 }, (_, index) => ({
				value: index + 1,
				label: `Topic ${index + 1}`,
				description: `Description ${index + 1}`,
			})),
			maxVisibleRows: 5,
			theme: THEME,
		});
		component.focus(4);
		expect(component.render(40)).toContain("→ 5. [ ] Topic 5");
	});

	it.each([40, 80, 120] as const)("bounds every rendered line at %i columns", (width) => {
		const component = new MultiSelectList({
			items: [{ value: 1, label: "A long selectable topic ".repeat(8), description: "A long description ".repeat(12) }],
			maxVisibleRows: 5,
			theme: THEME,
		});
		for (const line of component.render(width)) expect(line.length).toBeLessThanOrEqual(width);
	});

	it("uses the injected semantic keymap", () => {
		const component = list(3, { matchesKey: (data: string, key: string) => data === `mapped:${key}` });
		component.handleInput("mapped:down");
		expect(component.model.focusedItem?.value).toBe(2);
		component.handleInput("mapped:space");
		expect(component.checkedValues).toEqual([2]);
	});

	it("renders cursor and checkbox glyphs with identity styling, so focus and checked state do not depend on color", () => {
		const component = list(2);
		component.model.setChecked(0, true);
		const line = component.render(40)[0] ?? "";
		expect(line).toContain("→");
		expect(line).toContain("[✓]");
	});
});
