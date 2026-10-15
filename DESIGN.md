---
name: TaskDeck
description: An audit workpaper for recurring work, where every company cell is stamped with a tick, initials and a date.
colors:
  index-blue: "#34509a"
  tick-green: "#176b4c"
  review-red: "#b8301f"
  ground: "#f3f5f4"
  ink: "#1d2420"
  paper: "#ffffff"
  graphite: "#4b5852"
  wash: "#e7ebe9"
  hairline: "#cbd2cf"
  field-line: "#b4bdb9"
  index-wash: "#e8ecf6"
typography:
  heading:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  wordmark:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  task-title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  stamp:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tabular-nums"
  stamp-small:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    fontFeature: "tabular-nums"
rounded:
  xs: "2px"
  sm: "2.4px"
  md: "3.2px"
  lg: "4px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.index-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-primary-compact:
    backgroundColor: "{colors.index-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "28px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
  workpaper-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  chip-assignee:
    backgroundColor: "{colors.wash}"
    textColor: "#2c3631"
    rounded: "{rounded.sm}"
    padding: "0 6px"
  chip-scope:
    textColor: "{colors.graphite}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
  stamp-cell:
    textColor: "{colors.ink}"
    typography: "{typography.stamp}"
    height: "52px"
    width: "84px"
---

# Design System: TaskDeck

## Overview

**Creative North Star: "The Audit Workpaper"**

TaskDeck looks like the working paper an auditor signs: a cool grey ground, white sheets ruled with hairlines, and a pencil tickmark with initials and a date in every cell that has been done. The unit of design is the occurrence per company, not the task card. One task becomes one row; each company is one independently stamped cell. Progress is read from the marks themselves, never from a progress bar.

State is carried by form, not hue. A completed cell holds a slanted tick; a not-applicable cell holds a circled "n/a"; an open cell holds a dashed empty box. Green and red only reinforce what the shape already says. The system is dense, flat and quiet, with one blue (the index colour) for links, active navigation, focus and the primary action.

Admin pages are not restyled; they inherit the tokens through the shadcn variable names and nothing more.

**Key Characteristics:**
- Flat sheets separated by 1px hairlines; no shadow at rest.
- State by form (tick, circled n/a, dashed box); colour is secondary.
- Stamps (initials plus dd.mm) are the primary evidence and are set in mono.
- One tick drawing, authored once, reused for the cell, key, login example and logo.
- Small corner radii (4px base), square-ish like ruled paper.

## Colors

A cool grey-green paper palette with three working inks: index blue, pencil green, review red.

### Primary
- **Index Blue** (`index-blue`): the reference-blue of a workpaper index. Primary buttons, links, focus ring, active nav item text, the demo banner tint, the covering/reassignment marks, and text selection (22% mix). Also the logo frame. It is the only action colour.

### Secondary
- **Pencil Tick Green** (`tick-green`): the stamped state only. The tick, "All stamped", the stamped label in the task-first list, the "all caught up" icon, and a 10% hover wash on an open cell inviting a stamp. Chosen darker than a typical green to hold text contrast on white.

### Tertiary
- **Review Red** (`review-red`): the reviewer's red pencil. The circled n/a, the strike on n/a stamp-strip squares, the overdue due-label (with a clock icon), and destructive/invalid states. It is never a side border or a row fill.

### Neutral
- **Cool Grey Ground** (`ground`): page background.
- **Workpaper White** (`paper`): sheets, table, cards, sidebar, top bar.
- **Ink** (`ink`): body text and sticky-column text.
- **Graphite** (`graphite`): muted text, company column headers, scope chips, due labels.
- **Pencil Wash** (`wash`): assignee chip fill, secondary and muted surfaces, segmented toggle track. Accent surfaces use #e1e7e4 in the stylesheet.
- **Hairline** (`hairline`): all rules, table borders, card borders, sidebar border.
- **Field Line** (`field-line`): input borders.
- **Index Wash** (`index-wash`): active sidebar item background.

A derived dark companion set exists in the stylesheet (`.dark`) but has no UI entry point; do not design against it.

### Named Rules
**The Form-Before-Colour Rule.** Every state must be legible in greyscale. If a state is distinguishable only by hue, it is wrong.

**The One Blue Rule.** Index blue is the only action and link colour. Green means stamped, red means reviewer's mark or overdue, and neither is ever used for decoration.

## Typography

**Display/UI Font:** Hanken Grotesk (with system-ui fallback)
**Label/Mono Font:** JetBrains Mono

**Character:** A plain, slightly warm grotesque for everything people read, and a mono reserved for everything that was measured or signed.

### Hierarchy
- **Heading** (600, 1.25rem, 1.4): page title ("Dashboard").
- **Wordmark** (600, 1.125rem, -0.025em tracking): "TaskDeck" in the sidebar.
- **Task title** (500, 0.875rem): row headers in the grid and cards.
- **Body** (400, 0.875rem): table text, buttons (500), summary line.
- **Label** (500, 0.75rem): column headers, chips, legend, due labels.
- **Stamp** (400, 0.75rem, tabular, line-height 1): initials and dd.mm in cells, "n/n stamped" counts. A 11px variant sets the secondary dd.mm beside a relative due label.

### Named Rules
**The Mono-Is-Evidence Rule.** JetBrains Mono appears only for stamps (initials plus date), counts ("3/6 stamped") and dates. Never for labels, buttons, headings or decoration. All tabular numerals are enabled on tables and `data-tabular` elements.

## Layout

App shell is a flex row: white sidebar (240px at xl 1280px and up, a 64px icon rail from 768px, replaced by a mobile nav dropdown below md), then a column with an optional demo banner, a white top bar carrying the user menu on the right, and a main area padded 16px (24px from md).

The dashboard stacks: heading with a state summary line (due today, overdue as an aria-pressed filter, later this week), then scope and period controls, filters, and the content. Desktop defaults to the workpaper grid with a Grid/List toggle (visible from lg); below lg only the task-first list is shown.

The grid is one bordered white sheet that scrolls both ways inside a max height of viewport minus 13rem. Task column (min 16rem) sticks left, the Action column (min 10.5rem) sticks right with a soft left-edge shadow, the header row sticks to the top, and company columns are 84px wide (5.25rem) with two-line clamped names. Cells are at least 52px tall. Companies are sorted by name; a task outside a company's scope shows a faint en dash. Beyond seven companies a hint line announces sideways scroll. The legend ("Key") closes the sheet.

The task-first list uses 10px-gap stacked bordered cards; a card expands to company rows with 44px targets on touch (28px at sm and up). Spacing is a compact 4/8/12/16/24px rhythm.

## Elevation & Depth

Flat. Depth is conveyed by white sheets on a grey ground and 1px hairlines. The only shadow in the system is the faint left-edge shadow on the sticky Action column, which says "content scrolls beneath" and nothing else. Dropdown menus use the stock shadcn popover treatment.

### Named Rules
**The Flat-Sheet Rule.** Surfaces carry no shadow at rest. A shadow is permitted only to mark a sticky edge over scrolling content.

## Shapes

Small, near-square corners: base radius 0.25rem (4px) with the shadcn scale derived from it (0.6x, 0.8x, 1.4x). Tables and cards use the 3.2px step; chips 2.4px; buttons 4px (compact 3.2px). The open-cell box is a 3px-radius dashed square; stamp-strip squares are 10px with 2px radius. The only fully round shape is the n/a circle (a pill border around "n/a"). The segmented layout toggle uses a larger track radius. Dashed borders mean "empty, awaiting a mark" (open box, empty-state frames).

## Components

### Tickmark
One slanted pencil stroke, 16x16 viewBox, round caps, stroke 2.6 by default (3 at small sizes), drawn in `currentColor`. It is the system's signature and is defined once; never redraw it.

### Status Mark
Completed: tick in Pencil Tick Green, 16px (the open box is 20px in the grid). N/A: a pill border in Review Red around 11px medium "n/a". Open: a dashed 16px box in muted foreground. The grid's open cell is itself the stamp button (hover washes it 10% green, focus ring in index blue).

### Stamp Cell
Mark above a mono stamp: initials and dd.mm (e.g. "OL 15.10"). A tooltip gives the full name and time; screen readers get a sr-only sentence including the N/A reason. A hover-revealed 20px options button sits at the cell's corner (Mark N/A, Reopen). Covering or reassignment-requested states add a small index-blue icon at the cell foot.

### Stamp Strip
Per-task row of 10px squares, one per company: filled green when completed, red-diagonal-struck when N/A, dashed when open. The progress shape without a progress bar, used in the task-first list.

### Buttons
- **Primary:** index-blue fill, white text, 4px radius, 32px high (28px in the grid's Action column, 44px on touch). Label "Complete (n)" in the grid, "Complete remaining (n)" in the list. When everything is stamped it is replaced by a green tick and "All stamped".
- **Outline / Ghost:** N/A is outline, Reopen and the row menu are ghost. Hover is a pencil-wash fill.
- **Focus:** 2px index-blue ring.

### Chips
Assignee chip: pencil-wash fill, 2.4px radius, 12px text. Scope chip and status notes: hairline outline, graphite text.

### Workpaper Sheet / Cards
White, hairline border, 3.2px radius, no shadow. Empty states use a dashed hairline frame.

### Navigation
Sidebar: wordmark with the logo (index-blue square frame around a green tick), nav items with icons; active item on index-wash with index text. Collapses to an icon rail, then a dropdown. Top bar is white with a hairline underside.

### Legend
Always the last element of the grid: "Key", then tick "stamped with initials and date", n/a "not applicable", dashed box "open, click to stamp". It uses the live Status Mark so it cannot drift.

### Login Fan-out Preview
A static, labelled "Example" miniature of the grid using the same Status Mark and mono stamps, with sample data stated as such.

## Do's and Don'ts

### Do:
- **Do** carry state by form: tick for stamped, circled n/a, dashed open box. Reinforce with colour only after.
- **Do** put the stamp (initials plus dd.mm) in every resolved cell, in JetBrains Mono.
- **Do** keep surfaces white on the cool grey ground, separated by hairlines (#cbd2cf).
- **Do** use index blue as the sole action colour and keep primary actions to one per row.
- **Do** give touch targets 44px on mobile; use title and sr-only text for full names and N/A reasons.
- **Do** use only the data that exists. Columns and marks come from real fields (task, company cells, stamps).
- **Do** let admin pages inherit tokens only (the shadcn variable names); restyle them as their own surface.

### Don't:
- **Don't** add Ref or Reviewed columns, reviewer sign-offs, or any invented audit data. The product has no such data, and the workpaper idiom does not license fabricating it.
- **Don't** mark overdue with a coloured side border, row tint or red-everything. Overdue is a red due-label with a clock icon and the filter in the summary line.
- **Don't** communicate state by colour alone.
- **Don't** use JetBrains Mono for labels, buttons, headings or decoration.
- **Don't** replace the progress shape with a progress bar, or rebuild the card list as the desktop default.
- **Don't** add shadows to resting surfaces.
- **Don't** redraw the tick; import `TickMark`.
