import { describe, expect, it } from "bun:test";
import { Collapsible } from "../src/components/collapsible.ts";

describe("Collapsible", () => {
	it("starts collapsed by default, showing only the header", () => {
		const c = new Collapsible({ header: "Details" });
		c.setContent({ render: () => ["hidden"], invalidate: () => {} });
		expect(c.collapsed).toBe(true);
		expect(c.render(80)).toEqual(["▸ Details"]);
	});

	it("shows the content once expanded", () => {
		const c = new Collapsible({ header: "Details", collapsed: false });
		c.setContent({ render: () => ["visible"], invalidate: () => {} });
		expect(c.render(80)).toEqual(["▾ Details", "visible"]);
	});

	it("toggle() flips collapsed state", () => {
		const c = new Collapsible({ header: "H" });
		c.toggle();
		expect(c.collapsed).toBe(false);
		c.toggle();
		expect(c.collapsed).toBe(true);
	});

	it("expand()/collapse() set state directly, idempotently", () => {
		const c = new Collapsible({ header: "H" });
		c.expand();
		expect(c.collapsed).toBe(false);
		c.expand();
		expect(c.collapsed).toBe(false);
		c.collapse();
		expect(c.collapsed).toBe(true);
	});

	it("renders just the header with no content set, even when expanded", () => {
		const c = new Collapsible({ header: "H", collapsed: false });
		expect(c.render(80)).toEqual(["▾ H"]);
	});

	it("setHeader() updates subsequent renders", () => {
		const c = new Collapsible({ header: "old" });
		c.setHeader("new");
		expect(c.render(80)).toEqual(["▸ new"]);
	});

	it("applies headerStyle to the header line only", () => {
		const c = new Collapsible({ header: "H", headerStyle: (s) => `[${s}]` });
		expect(c.render(80)).toEqual(["[▸ H]"]);
	});

	it("invalidate() forwards to the content Component when set", () => {
		let invalidated = false;
		const c = new Collapsible({ header: "H" });
		c.setContent({ render: () => [], invalidate: () => { invalidated = true; } });
		c.invalidate();
		expect(invalidated).toBe(true);
	});

	it("invalidate() does not throw when no content has been set", () => {
		const c = new Collapsible({ header: "H" });
		expect(() => c.invalidate()).not.toThrow();
	});
});
