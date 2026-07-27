/**
 * Compile-time contract, not a runtime test: proves a Malevich component
 * satisfies a real host TUI library's own `Component` type, rather than
 * merely asserting structural compatibility in a comment. Checked by
 * `bun x tsc --noEmit` (included in tsconfig.json) -- if this file fails to
 * compile, the compatibility claim is false and the build fails.
 *
 * @earendil-works/pi-tui is a devDependency purely for this file; Malevich
 * itself declares no dependency on it (or on @dpopsuev/alef-tui) at all.
 */
import type { Component as PiComponent } from "@earendil-works/pi-tui";
import { Table } from "../src/index.ts";

const table = new Table({ columns: [{ header: "Engine", key: "engine" }], rows: [] });

// If Table's shape ever drifts from pi-tui's own Component interface, this
// assignment stops compiling -- the whole point of this file.
const asPiComponent: PiComponent = table;
void asPiComponent;
