import { describe, expect, it } from "bun:test";
import { statelessComponent } from "../src/component.js";

describe("statelessComponent", () => {
	it("wraps a render function as a Component with a no-op invalidate", () => {
		const component = statelessComponent((width) => [`width=${width}`]);
		expect(component.render(80)).toEqual(["width=80"]);
		expect(() => component.invalidate()).not.toThrow();
	});

	it("recomputes on every render() call -- no caching of the previous width's output", () => {
		const component = statelessComponent((width) => [`width=${width}`]);
		expect(component.render(40)).toEqual(["width=40"]);
		expect(component.render(100)).toEqual(["width=100"]);
	});
});
