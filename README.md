# Malevich

A terminal-UI component library. Depends only on the `Component`/`Focusable`
interface shape, not on any specific TUI framework's package — a component
runs unmodified on any host whose types match that shape, e.g.
[`@earendil-works/pi-tui`](https://github.com/earendil-works/pi-mono/tree/main/packages/tui)
or [`@dpopsuev/alef-tui`](https://github.com/dpopsuev/alef).

## Install

```bash
bun add malevich-tui-components
```

## Usage

```ts
import { Table } from "malevich-tui-components";

const table = new Table({
  columns: [{ header: "Engine", key: "engine" }, { header: "Credits", key: "credits" }],
  rows: [{ engine: "tavily", credits: "2" }],
});

// Mount it however your host TUI framework mounts a Component --
// e.g. inside Pi's ctx.ui.custom().
console.log(table.render(80).join("\n"));
```

Pass a host's own `visibleWidth`/`truncateToWidth` (both `pi-tui` and
`alef-tui` export these) via the `measure` option for correct Unicode/ANSI
handling; components default to plain-ASCII measurement otherwise.

## Components

| Component | Description |
|---|---|
| `Table` | Tabular data with auto-sized or fixed column widths, alignment, and a header separator. |

## License

MIT. The `Table` component and the `Component`/`Focusable` interfaces are
adapted from Mario Zechner's `pi-tui`/`alef-tui` (also MIT) — see [LICENSE](LICENSE).

## Development

```bash
bun install
bun test
bun x tsc --noEmit
bun run build
```
