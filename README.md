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
| `ProgressBar` | A single-line `label filled/empty-bar pct%` meter. |
| `Dialog` | A bordered title+body+action-hints dialog, dispatching to the matching action on its key. |
| `Toast` | A single auto-dismissing message (or wrapped Component). |
| `NotificationQueue` | A capped, auto-expiring queue of leveled (info/success/warning/error) notifications. |
| `ScrollView` | Wraps a child in a fixed-height, vertically scrollable viewport with an optional scrollbar. |
| `SplitPane` | Two children side by side, separated by a border, split by a ratio. |
| `Collapsible` | A toggleable header that shows/hides a wrapped child. |
| `CollapsibleText` | A collapsible block for long text, showing the first N lines behind a toggle. |
| `TreeView` | A labeled tree with box-drawing connectors; nodes may embed a child Component and/or nested children. |
| `Menu` | A bordered, keyboard-navigable action list with per-item shortcut keys. |
| `Badge` | A single-line `label: count` indicator, abbreviating large counts (1.5k, 2.0M). |
| `SeparatorLine` | A full-width rule with optional embedded left/right labels. |
| `Envelope` | A bordered, collapsible box with the title embedded in the top border. |
| `BorderedSelectPanel` | Wraps a host-provided list Component (e.g. the host's own SelectList) in a border+title+help-text scaffold -- formalizes a pattern found hand-rolled in five separate real codebases. Owns no selection logic itself. |

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
