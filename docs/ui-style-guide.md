# Overspray UI style guide

Taken from the live app (`next/app.css`, `next/ui.js`, `next/tools.js`, `next/map.js`, `next/cargrad.js` at v0.68-pieces.195). Every value below is what the code uses today. Copy this file into another project and build to it.

## 1. Rules (Zac's, not up for debate)

1. **Dark mode first.** Design and screenshot in dark. Light must still work, and "Match system" is the default setting.
2. **No popups for questions you can answer in place.** No confirm boxes, no popup with a checkbox. To confirm a delete, the button itself turns red and reads **Confirm**; a click anywhere else stands it down. (One old exception: "Start a new livery?" still uses a dialog.)
3. **Rename in place.** Double-click a name (or click an already-picked one) and it becomes a text box in the row. Enter or click away keeps it, Esc cancels.
4. **Button names never change.** No "Trim" turning into "Trimmed to 3" or "Done", no Group/Ungroup swapping. State shows by the button lighting up (accent fill), not by new words.
5. **Grey out, don't hide.** A control that can't be used right now stays where it is at reduced opacity.
6. **No emojis, anywhere.** Not in the UI, not in messages.
7. **No icons on words.** Fold titles, buttons, menus and lists are plain text. Icons only where there is no room for a word: the left tool strip, the small header buttons on cards (Float, Fold, Hide), the zoom buttons, and the small x on tiles.
8. **Folds open on their own.** Opening one never closes another.
9. **Tight and quiet.** Small type, thin grey outlines, little padding. No glows, no thick borders, no big blue focus rings on text boxes.
10. **Ask before changing sizes nobody asked for.** If a size wasn't part of the request, leave it.
11. **Buttons in tidy grids.** In a panel, buttons sit two to a row, all the same width, inside the fold they belong to. No loose clusters.

## 2. Colour tokens

All colour comes from these CSS variables. Never write a raw colour in a component.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bar` | `#ffffff` | `#24272d` | Top bar, tool strip, inputs, buttons |
| `--panel` | `#ffffff` | `#2b2f36` | Cards, menus, dialogs, floating windows |
| `--stage` | `#e4e7ec` | `#3b4049` | Page/canvas background behind everything |
| `--line` | `#d5d9e0` | `#454a54` | Every 1px outline and divider; also fold title bars |
| `--fg` | `#1c2128` | `#eef0f3` | Main text |
| `--muted` | `#5d6673` | `#a9b1bd` | Labels, secondary text, hover outline, text-box focus edge |
| `--hover` | `#eef1f5` | `#373c45` | Hover fill; floating card header |
| `--accent` | `#1f5fe0` | `#7aa5ff` | Pressed tools/buttons, switches on, drop lines, selection on canvas |
| `--accent-fg` | `#ffffff` | `#0d1830` | Text on accent |
| `--accent-soft` | `#e3ecff` | `#2e3d60` | Selected list row, picked chip/tile |
| `--live` | `#16885a` | `#4fd18e` | "Live" status dot and outline |
| `--bad` | `#c0362c` | `#ff8a7d` | Errors, red Confirm button, error toast |
| `--shade` | `rgba(20,30,50,.2)` | `rgba(0,0,0,.45)` | All drop shadows |

Other fixed colours:
- Warning text: `#d98a00`, weight 600.
- Dialog backdrop: `rgba(10, 14, 22, .45)`.
- Art preview tiles sit on mid grey `#8a909a` so black, white and colour logos all show.
- Fill-bar fill: `color-mix(in srgb, var(--accent) 28%, transparent)`.

### Copy-paste token block

```css
:root {
  --bar: #ffffff; --panel: #ffffff; --stage: #e4e7ec; --line: #d5d9e0;
  --fg: #1c2128; --muted: #5d6673; --hover: #eef1f5;
  --accent: #1f5fe0; --accent-fg: #ffffff; --accent-soft: #e3ecff;
  --live: #16885a; --bad: #c0362c; --shade: rgba(20, 30, 50, .2);
  --ui: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bar: #24272d; --panel: #2b2f36; --stage: #3b4049; --line: #454a54;
    --fg: #eef0f3; --muted: #a9b1bd; --hover: #373c45;
    --accent: #7aa5ff; --accent-fg: #0d1830; --accent-soft: #2e3d60;
    --live: #4fd18e; --bad: #ff8a7d; --shade: rgba(0, 0, 0, .45);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] { /* same dark values as above */ }
```

Theme switch: `data-theme="light"` or `"dark"` on `<html>`, or no attribute for Match system. The choice is kept in `localStorage` (`next-theme`). Menu offers Light / Dark / Match system with a tick on the current one; the top bar has a half-moon button that flips it.

## 3. Type

- UI font: **IBM Plex Sans** 400/500/600 (Google Fonts). Fallback Segoe UI, system-ui.
- Numbers, keys, hex codes: **IBM Plex Mono** 400/500.
- Brand name only: **Rubik Spray Paint** (18px in the bar, 34px in About). Nowhere else.
- Base: `13px / 1.35`.

| Size | Weight | Where |
|---|---|---|
| 11px | 600, caps, `letter-spacing: .07em`, `--muted` | Card titles, sub-headings, fold titles, shortcut group headings |
| 11px mono | 400 | Keycaps, menu shortcut hints, counts |
| 12px | 400 | Hints, notes, chips, tooltips, segmented buttons, finish buttons |
| 12px mono | 400 | Every number box and value (fill bars, X/Y, zoom %) |
| 12.5px | 400 | Toast |
| 13px | 400 | Everything else |
| 14px | 600 | Selected item's name in Properties; empty-screen text |
| 15px | default bold | Dialog title |

Weights: 500 for pressed buttons and group names, 600 for headings and names, 700 for list section headings. Nothing heavier.

Numbers are right-aligned. Names cut off with an ellipsis, never wrap.

## 4. Corners

| Radius | Where |
|---|---|
| 2px | Drag handles, Layers grip line |
| 4px | Small swatches (16px), the input inside a row, rename box, colour blocks |
| 5px | Keycaps, eye button, bar tracks, small text inputs |
| 6px | **Default.** Buttons, rows, fields, fill bars, switches' rows, colour inputs, tiles' art, tooltips, fold title bars |
| 7px | Finish buttons |
| 8px | Mode switch, zoom box, X/Y box, big colour dots, search box, list rows with images |
| 9px | Drop-down menus, library tiles, switch track |
| 10px | Cards (panels), tool options box, colour picker, car gradient window |
| 12px | Dialogs |
| 14px | Pop-out drawing sheet frame |
| 50% / 99px | Round dots, small x buttons, pills, chips, hint, toast |

## 5. Lines, outlines and focus

- **Every outline is 1px `var(--line)`.** Cards, fields, buttons, swatches, inputs, dividers, tracks.
- **Hover on a box-like control** (field, switch row, fill bar, track): outline turns `var(--muted)`. No fill change.
- **Hover on a button, row or menu item:** fill turns `var(--hover)`.
- **Focus, keyboard (buttons, tools):** `outline: 2px solid var(--accent); outline-offset: 1px`.
- **Focus while typing (text boxes, fill bars, selects):** `outline: 1px solid var(--muted); outline-offset: -1px`. A thin grey edge, never the blue ring.
- **Picked item:** outline turns `var(--accent)` and fill `var(--accent-soft)` (chips, tiles, finish buttons, library tabs).
- **Picked item with its own colour** (gradient bars): 1px outline in that item's colour.
- Dividers: `border-top: 1px solid var(--line)`, margin `5px 0` in menus, `8px 6px` in panels.
- "Belongs to the switch above": `border-left: 2px solid var(--line)`, indented 8px.
- Group members in a list: 3px stripe on the left in the group's colour (`inset 3px 0 0`), indented to 28px.
- Drag-and-drop lines: 2px `var(--accent)` inset at the top or bottom of the row; dropping into a group = 2px accent outline round the row.

## 6. Shadows

All use `var(--shade)`.

| Shadow | Where |
|---|---|
| `0 1px 3px` | Pressed mode button |
| `0 4px 14px` | Docked cards, tool options box |
| `0 8px 24px` | Toast |
| `0 10px 30px` | Drop-down menus |
| `0 12px 34px` | Floating cards, colour picker, car gradient window |
| `0 24px 60px` | Dialogs |

## 7. Spacing

- Gaps are small: 2px (tool strip items, card body rows), 4px, 6px (the usual gap), 8px, 10px (between cards).
- Card body padding: `4px 8px 10px`.
- Row (list item): `padding: 5px 6px`, gap 8px.
- Field / fill bar / switch: `margin: 4px 6px`, height **30px**.
- Two side by side: CSS grid, 2 equal columns, gap 6px, margin `4px 6px`.
- Buttons in a card: grid, 2 equal columns, gap 6px, height 30px, padding `4px 6px`.
- Menu item: `padding: 6px 9px`. Menu box padding 5px.
- Dialog: title `14px 18px 4px`, body `6px 18px 4px` with 8px gap, footer `12px 18px 16px` with buttons right-aligned, 8px gap.
- Top bar: `padding: 6px 14px`, gap `4px 14px`.

## 8. Layout

- The canvas (stage) takes the whole screen. One top bar, one slim tool strip on the left, cards floating over the canvas on the right.
- Grid: `"bar bar" auto / "tools stage" 1fr`.
- **Dock:** top 12px, right 12px, width **268px**, 10px between cards.
- **Grow to fit.** Cards are only as tall as their content. Only when they'd run off the screen does the first card keep its height (starts at 30% of the screen) and the second scroll inside itself.
- The first card's height is changed by dragging its bottom edge (a 9px grip with a 32 x 3px line, `--line`, `--muted` on hover). Minimum 60px; leaves 200px for the card below.
- Bottom-left of the stage: hint pill, zoom box, X/Y box, 14px from the left, 12px from the bottom.
- Under 760px wide: dock is `min(268px, 100% - 24px)`, hint hidden.
- `prefers-reduced-motion`: all transitions and animations off.

## 9. Top bar

- Background `--bar`, 1px `--line` bottom edge.
- Menus: plain text buttons `padding: 5px 9px`, `--hover` fill on hover and while open.
- Drop-down: 4px below, min-width 228px, padding 5px, radius 9px, shadow `0 10px 30px`. Items fill the width with the shortcut on the right in 11px mono `--muted`. A tick (`✓`, accent) marks the current choice.
- Mode switch (Paint / Finish / Map): centred, a `--hover` track with 2px padding and radius 8px; buttons `4px 16px`, weight 500, `--muted`; pressed = `--panel` fill, `--fg` text, `0 1px 3px` shadow.
- Status pill (Live): `4px 10px`, round, 1px `--line`, 12px `--muted`, 7px dot. On = `--live` dot and outline; error = `--bad`.
- Icon buttons: 30 x 30, 18px icon, `--muted`, `--fg` + `--hover` on hover.

## 10. Tool strip

- Left, `padding: 8px 6px`, 4px gap, `--bar`, 1px `--line` right edge.
- Tool: 36 x 36, radius 6px, 20px icon, `--muted`. Hover: `--hover` fill, `--fg`. On: `--accent` fill, `--accent-fg`.
- Icons: line icons, `stroke-width: 1.6`, round caps and joins, no fill.
- Tooltip: to the right, 8px gap, `4px 8px`, radius 6px, `--fg` background with `--bar` text (inverted), 12px, fades in over .12s.
- Tool options box (opens beside the strip): top-left of the stage at 8px/10px, padding 4px, radius 10px, shadow `0 4px 14px`.

## 11. Cards (panels)

- `--panel`, 1px `--line`, radius **10px**, shadow `0 4px 14px`, `overflow: hidden`.
- Header: `padding: 6px 6px 6px 12px`. Title 11px caps `--muted` on the left. Three 24 x 24 icon buttons on the right (14px icons): Float, Fold, Hide.
- Body: scrolls inside itself; rows never squash.

### Floating cards and windows

- Float button pops the card off the dock onto the stage, same 268px width, shadow grows to `0 12px 34px`.
- **Header becomes the handle:** `--hover` fill, `cursor: grab`. Drag anywhere on the header except its buttons.
- Kept on screen: at least 60px stays visible on the right and 30px at the bottom, so the header can always be grabbed. Same check when a saved position is restored on a smaller window.
- Position, fold state and height are saved and come back next visit.
- A floating window that isn't a card (the car gradient window): `--panel`, 1px `--line`, radius 10px, shadow `0 12px 34px`, `padding: 4px 12px 8px`, width `min(640px, 100% - 32px)`, starts centred 64px above the bottom. Title bar is bold text on the left and a close x on the right, `cursor: move`.
- Live while dragging: anything the window controls updates as you drag, not on release.

## 12. Controls

All controls in a panel follow one shape: **a full-width 30px box with its name inside on the left in `--muted` and its value on the right.** Pairs like X / Y are two half-width boxes side by side.

### Fill-bar slider (instead of a range slider)

- 30px box, 1px `--line`, radius 6px, `padding: 0 4px 0 10px`, `--bar` background.
- Fills from the left with accent at 28% as the value rises (`--p` percent).
- Name on the left (`--muted`, ellipsis), number on the right (12px mono, 46px wide, right-aligned).
- `cursor: ew-resize`. Drag anywhere along it; it moves by how far you drag, not to where you point, so a short bar still steps by one. **Shift = slower** (1/8 speed).
- Under 3px of movement counts as a click: the number becomes a box to type in. Enter or click away keeps it.
- The real `<input type="range">` sits hidden underneath for the arrow keys and screen readers.
- Hover: outline `--muted`. Focus: 1px `--muted` inside edge.

### One-row box (list, text, number)

- Same 30px box, `padding: 2px 4px 2px 10px`, name on the left in `--muted`.
- The control inside has **no frame of its own**: no border, radius 4px, `--panel` background (so an open list follows dark mode), text right-aligned.
- A list shows its value and the browser's own ▾ arrow.
- A text area stacks under its name instead.

### Switch (on/off)

- The row: 30px box, name on the left in `--muted`, switch on the right, `padding: 0 8px 0 10px`. Whole row is clickable.
- Track 30 x 16, radius 9px, `--line` when off, `--accent` when on.
- Knob 12 x 12 white circle, 2px inset, shadow `0 1px 2px`, slides 14px over .12s.
- Disabled: whole row at 45% opacity.

### Buttons

- `.btn`: `padding: 5px 12px`, 1px `--line`, radius 6px, `--bar` fill, `--hover` on hover.
- Main button: `--accent` fill and outline, `--accent-fg` text, weight 500; hover brightens 8%.
- On (pressed state): same as main. This is how a fixed-name button shows it's on.
- Disabled: 40% opacity, no pointer.
- **Delete with Confirm:** first click turns the button `--bad` fill and outline, `--panel` text, weight 500, and changes the word to **Confirm**. Second click deletes. A click anywhere else turns it back. It must not change size or move the layout (give it a min-width).
- Segmented choice (2 to 4 options): one 1px-outlined box, radius 6px, buttons split by 1px `--line`, 12px `--muted`, pressed = accent fill.
- Small x (remove): 14 to 20px circle, `--fg` fill with `--bar` icon (inverted), top-right corner, hidden until you point at its tile (fade .12s).

### Lists (rows)

- Row: `padding: 5px 6px`, radius 6px, gap 8px, hover `--hover`, selected `--accent-soft`.
- 16 x 16 swatch on the left (radius 4px, 1px `--line`), name fills the middle, small 24 x 24 buttons on the right (eye, `--muted`; off = 35% opacity).
- Row's x only shows on hover.
- Group head row: weight 500 name, a 16px twist arrow, count in 11px mono.
- Rename box in a row: `padding: 1px 5px`, 1px `--muted` edge, radius 4px, `--bar` fill, no outline.
- Library/project lists with pictures: 44px image, radius 6px, bold name with a `--muted` small line under it.
- Long drop-down lists: section headings are bold disabled options, left-aligned; choices right-aligned; no dashes or indents.

### Colour swatches

- Colour input: 38 x 26, 1px `--line`, radius 6px. In a row with a fill bar: 30px tall.
- Big swatch at the top of Properties: 40 x 40.
- Round dots (palette, used colours): 18 x 18 circle, 1px `--line`. Big dots: 34 x 34, radius 8px. Hover or picked: 2px accent outline, 1-2px offset.
- Chips (colour + name): round pill, `3px 9px 3px 4px`, 1px `--line`, 12px. Picked = accent outline + `--accent-soft`. Saved colours sit two to a row as squarer chips (radius 6px).
- Colour picker pop-up: 232px wide, padding 10px, gap 9px, radius 10px, shadow `0 12px 34px`. 150px colour square (radius 6px), 12px hue strip, 24px current-colour square, hex/RGB boxes in 12px mono with a small mode button.

### Folds

- `<details>` with a shaded title bar: `--line` fill, `--fg` text, 11px caps weight 600, `padding: 7px 10px`, radius 6px, `margin: 0 6px 4px`.
- 12px space above each fold (8px above the first).
- Arrow after the title: `▸` closed, `▾` open, `--muted`.
- **A closed fold shows its state on the right** in normal case `--muted` text (for example "Repeat · Off").
- No icons in fold titles. Each fold opens and closes on its own.
- Plain sub-headings inside a card: 11px caps 600 `--muted`, `padding: 8px 6px 2px`.

### Tiles (library, finishes)

- Library tiles: grid of `minmax(104px, 1fr)`, gap 8px, 1px `--line`, radius 9px, `--bar` fill; hover = accent outline. Art 68px tall on `#8a909a` grey, radius 6px. Label 12px, ellipsis.
- Finish buttons: 3 columns, gap 6px, `6px 2px`, radius 7px, 12px.
- Small shape tiles: 24 x 24, radius 6px, 16px line icon.

### Dialogs (only for real windows: Palettes, Library, Settings, Shortcuts)

- `--panel`, 1px `--line`, radius 12px, shadow `0 24px 60px`, width `min(440px, 100% - 32px)`. Wide: 720px. Palettes: 600px.
- Backdrop `rgba(10, 14, 22, .45)`.
- Label/value rows in a 130px + rest grid, labels `--muted`.
- Body scrolls at 60vh (82vh for Shortcuts).
- Footer buttons right-aligned. Use Close, not OK, when nothing needs saving.
- Keycaps: 1px `--line` with a 2px bottom edge, radius 5px, `2px 6px`, 11px mono.

### Messages

- Toast: centred 14px from the top, round pill, `7px 14px`, `--fg` fill with `--bar` text (inverted), 12.5px, shadow `0 8px 24px`. Goes after **3.2s**; errors are `--bad` with white text and stay **6.5s**.
- Hint: round pill bottom-left, `5px 10px`, `--panel`, 1px `--line`, 12px `--muted`, one line with ellipsis.
- Notes in panels: 12px `--muted`, `padding: 4px 6px`.
- Attention pulse (to point at the next step): 1.2s loop, `0 0 0 3px --accent-soft, 0 0 0 5px --accent` at the middle.

## 13. Handles

### In the panels (car gradient window)

- Strip 34px tall, radius 5px, 1px `--line`.
- Colour blocks 18px tall, 1px `--line` outline, radius 4px, min 6px wide, `cursor: grab`.
- Bars 14px tall in a track with 1px `--line` (hover `--muted`), radius 5px. Bar fill = its colour at 65%, flat (no fades).
- End handles: **5px wide**, radius 2px, `cursor: ew-resize`, 1px `--panel` ring so they show on any colour. On a bar they stand 2px past it top and bottom; on a block they sit inside it. Each grabs 3px wider on both sides than it looks.

### On the canvas

Every canvas line is drawn twice: a wide white (or near-black) line under a thin coloured one, so it shows on any livery.

| Thing | Look |
|---|---|
| Selected shape outline | 3.5px white under 1.5px accent |
| Corner points | 4.5px squares in accent, 1.5px white edge |
| Bend dot (mid-line) | 4px-radius white circle, 1.5px accent edge |
| Box frame | 1px accent at 45% opacity |
| Resize handles | 5px white squares at the frame corners |
| Layer hanging off the sheet | dashed `5 4`, 3px white under 1.25px `#5b6472` |
| Fade / repeat aim | line 4px white under 1.5px `#101114` dashed `6 4`; start = white ring, end = solid dark dot, 6.5px radius, 2px edge |
| Panel outlines (map) | 1.25px `#101114` (3px in the car guide) |
| Snap target | 8px ring, 4px white under 2px accent |
| Picked link end | 11px ring, 5px `#101114` under 2.5px accent |

Near-black on canvas is `#101114`, never pure black.

Canvas colour sets:
- Panel tints: `hsl(i * 137.5, 62%, 50% or 64%)` (golden-angle steps, light/dark alternate).
- Pair check: everything grey `#d4d4d8`, first panel pink `#ff2bd6`, second blue `#00a3ff`.
- Edge-link bands (pick strong, unlike colours): `#ffffff #101114 #e6194b #3cb44b #ffe119 #4363d8 #f58231 #911eb4 #42d4f4 #f032e6 #bfef45 #469990 #9a6324 #808000`.

## 14. Words

- Plain words a user would say. "Hide", not "Toggle visibility".
- Sentence case for buttons and menus ("Save this livery's colours"); caps only for the 11px headings, done in CSS.
- `…` after a menu item that opens a window ("Palettes…").
- Tooltips say what happens, in a short sentence.
- Names are cut with an ellipsis, never wrapped.
