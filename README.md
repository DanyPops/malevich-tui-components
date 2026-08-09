# Malevich

A headless, renderer-agnostic TUI component library — layout and interaction
algorithms only. Color, text measurement, key semantics, and terminal
compositing are all host-supplied ports, not something Malevich owns or
hardcodes; it depends only on the `Component`/`Focusable` interface shape, not
on any specific TUI framework's package, so a component runs unmodified on
any host whose types match that shape, e.g.
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
| `ProgressBar` | A single-line `label filled/empty-bar pct%` meter. Progress geometry is renderer-neutral; choose `shade`, bordered `smooth`, bordered `blocks`, `ascii`, a custom glyph set, or a completely custom renderer. |
| `Dialog` | A bordered title+body+action-hints dialog, dispatching to the matching action on its key. `framed: false` omits its own top/bottom rule for nesting inside a host's own already-drawn border (e.g. an Envelope). |
| `Toast` | A single auto-dismissing message (or wrapped Component). |
| `NotificationQueue` | A capped, auto-expiring queue of leveled (info/success/warning/error) notifications. |
| `ScrollView` | Wraps a child in a fixed-height, vertically scrollable viewport with an optional scrollbar. |
| `SplitPane` | Two children side by side, separated by a border, split by a ratio. |
| `Collapsible` | A toggleable header that shows/hides a wrapped child. |
| `CollapsibleText` | A collapsible block for long text, showing the first N lines behind a toggle. |
| `TreeView` | A labeled tree with box-drawing connectors; nodes may embed a child Component and/or nested children. |
| `Menu` | A bordered, keyboard-navigable action list with per-item shortcut keys. |
| `MultiSelectList` | A bounded checkbox list with a focus-following row viewport, optional action rows, shortcuts, and separate state-model access for direct tests. |
| `Badge` | A single-line `label: count` indicator, abbreviating large counts (1.5k, 2.0M). |
| `SeparatorLine` | A full-width rule with optional embedded left/right labels. |
| `Envelope` | A bordered, collapsible box with the title embedded in the top border. |
| `Card` | A bordered entity surface with caller-supplied title/content/footer lines and explicit selected/unselected frame and body styles. |
| `BorderedSelectPanel` | Wraps a host-provided list Component (e.g. the host's own SelectList) in a border+title+help-text scaffold -- formalizes a pattern found hand-rolled in five separate real codebases. Owns no selection logic itself. `framed: false` omits its own top/bottom rule for nesting inside a host's own already-drawn border (e.g. an Envelope). |
| `MaskedInput` | A single-line input rendering only mask glyphs, with bracketed-paste handling. Generalized from Enigma's own. |
| `Form` | An N-field Tab/Shift+Tab-navigable form with required-field validation, keyed to a Record result. Composes with the host's own text inputs and Malevich's MaskedInput. |
| `HistoryChart` | A cumulative, stacked-by-series ASCII bar chart with a Y-axis scale, an optional budget threshold line, X-axis time labels, and a legend. |
| `Text` | Plain "render a string, styled and fit to width" primitive -- truncates or word-wraps to the render width. |
| `Board` | A multi-column card board (Kanban-style): items grouped into columns, keyboard-navigable selection (arrow keys move between cards, skipping empty columns), caller-supplied card rendering. |
| `TabMenu` | A horizontal tab bar that can descend into child levels -- Enter on a branch node walks down into its children, Escape walks back up (or cancels at the root). A leaf node resolves `onSelect` with its value; a mnemonic character jumps to and activates a node in one step. |
| `TabbedContainer` | A persistent tab bar (every tab's label always visible) over one swappable child Component -- the composable primitive for hosting several sibling features (Packages/Find/Config/Settings, say) in one long-lived overlay instead of each closing and opening its own. Left/Right or Tab/Shift-Tab cycle; a mnemonic character jumps directly, defaulting to a tab's own first letter or set explicitly when two labels would collide on it. Every other key delegates straight to the active tab's own content. |
| `Spinner` | A tiny indeterminate-progress ticker for a single in-flight async call with no discrete step count -- renders no chrome of its own, a host embeds `glyph()` inline (a table cell, a status line, a dialog). |

## Utilities

| Export | Description |
|---|---|
| `GlyphTheme` / `unicodeGlyphs` / `asciiGlyphs` | Complete injectable drawing policy for lines, boxes, trees, progress tracks, scrollbars, charts, spinners, disclosure/selection indicators, masks, and gutters. Drawing components default to `unicodeGlyphs`; pass `asciiGlyphs` through a component's `glyphs` or `glyphTheme` option for an ASCII visual policy. Component-specific character options still override the shared policy. |
| `calculateProgressBarGeometry` / `renderProgressBar` | Two-stage progress primitive: calculate normalized drawable-cell geometry without choosing characters, then render that geometry through `ProgressGlyphs`. “Geometry” is intentional UI-pipeline terminology; compositing means combining already-rendered layers and is owned by the host TUI. |
| `deriveTableColumns` | Given `unknown[]`, derives `Table`-ready columns/rows when every item is a plain object: unions the keys, stringifies non-string values. Returns `undefined` for non-tabular input. |
| `firstDistinctStyle` | Given a baseline-styled string and candidate-styled strings (in preference order), returns the first candidate that's visually distinct from the baseline, else a fallback -- the fix for a theme that maps two semantic color tokens to the same underlying color, making a more specific token look identical to plain text. |
| `renderFramedPanel` | The rule+title+content+rule scaffold shared by `Dialog`, `Menu`, and `BorderedSelectPanel` -- assembly only, callers pass already-styled/measured lines. |
| `KeyMatcher` / `legacyKeyMatcher` | Injectable named-key recognition (`matchesKey(data, keyId)`), accepted via `matchesKey` on `Board`, `TabMenu`, `TabbedContainer`, `Form`, `MaskedInput`, `Menu`, `ScrollView`, and `Dialog` -- pass a host's real matcher (Kitty-protocol-aware) instead of the small legacy-sequences-only default. |
| `findMnemonicConflicts` / `assertNoMnemonicConflicts` | Tree-style accelerator-key conflict detection -- given a `MnemonicContext` tree describing which key bindings are reachable together (a root's own plus whichever single child is active), reports any key bound to more than one distinct action along a path. Meant to run as a standing test assertion against a real application's own keybinding tree. |

## Rendering architecture

Malevich separates four concerns:

1. **State and interaction** update component models.
2. **Measurement/layout** calculate terminal-cell geometry through host-supplied `TextMeasure` ports.
3. **Rendering** maps geometry and state to strings using an injected `GlyphTheme` and caller-supplied style functions.
4. **Compositing** is left to the host TUI, which mounts Malevich's rendered lines into its own surface/layer tree.

The distinction is visible in the progress API: `calculateProgressBarGeometry()` normalizes `value/max` and calculates filled cells; `renderProgressBar()` chooses full, partial, empty, and delimiter characters. Other geometry-heavy primitives use the same boundary where it pays for itself, while simple text components remain simple rather than acquiring ceremonial layout objects.

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
