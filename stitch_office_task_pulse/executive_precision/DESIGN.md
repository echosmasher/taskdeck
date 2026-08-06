---
name: Executive Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#525657'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b6e70'
  on-tertiary-container: '#eff1f3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 260px
  container-max: 1440px
  gutter: 1.5rem
  margin-page: 2rem
  stack-xs: 0.25rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style
The design system is engineered for high-performance productivity and institutional reliability. The brand personality is disciplined, efficient, and unobtrusive, allowing user data and tasks to take center stage. 

The aesthetic follows a **Corporate / Modern** direction with a focus on **Tonal Minimalism**. It prioritizes high data density and functional clarity over decorative elements. The interface utilizes subtle value shifts in background colors to define hierarchy, ensuring the user's cognitive load is spent on task management rather than navigating the UI. Visual flair is restricted to functional state changes (active, hover, success), creating a predictable and professional environment for daily office operations.

## Colors
The palette is rooted in a professional "Slate" spectrum to maintain a calm, focused environment. 

- **Primary (Indigo-Blue):** Used for primary actions, active navigation states, and brand identifiers. It signifies progress and utility.
- **Secondary (Slate):** Used for sub-navigation, secondary icons, and supporting text.
- **Neutral/Surface:** A tiered system of light greys (`#F8FAFC` to `#E2E8F0`) is used to separate the sidebar from the main content and to define card boundaries.
- **Semantic Colors:** 
    - **Green:** Exclusively for "Completed" or "Healthy" statuses.
    - **Amber:** For "Pending" or "Upcoming" warnings.
    - **Red:** For "Overdue" or "High Priority" items.
    - **Slate-Neutral:** For "N/A" or "Archived" states to de-emphasize them.

## Typography
This design system uses **Inter** exclusively to leverage its exceptional legibility at small sizes and high-density environments. 

Hierarchy is established through weight rather than dramatic size shifts. Use `600` (Semi-Bold) for interactive elements and section headers, and `400` (Regular) for data entries. For "Admin" tables or "Status Chips," use `label-md` with uppercase styling to create a distinct visual "tag" feel that is easily scannable. Line heights are kept tight to support high data density without compromising readability.

## Layout & Spacing
The layout follows a **Fixed Sidebar / Fluid Content** model. 

- **Sidebar:** Positioned on the left, fixed at 260px. It houses the primary navigation and workspace switcher.
- **Main Content:** A fluid area that uses a 12-column grid system for internal dashboard cards.
- **Breakpoints:**
    - **Desktop (1280px+):** Full sidebar, 12-column content grid, 32px page margins.
    - **Tablet (768px - 1279px):** Collapsed sidebar (icon only), 8-column content grid, 24px page margins.
    - **Mobile (<767px):** Bottom navigation or hamburger menu, single-column content, 16px page margins.

Spacing uses a strict 4px base unit to ensure alignment in data-heavy tables and calendar views.

## Elevation & Depth
Depth is used sparingly to maintain a "flat professional" feel. This design system uses **Tonal Layers** rather than heavy shadows:

1.  **Level 0 (Background):** The base page background (`#F8FAFC`).
2.  **Level 1 (Cards/Sidebar):** White surfaces (`#FFFFFF`) with a subtle 1px border (`#E2E8F0`). 
3.  **Level 2 (Active/Hover):** Very soft, diffused shadows (4px blur, 2% opacity) are only used on "Active" task cards during drag-and-drop operations to indicate they have been "lifted" from the plane.

Instead of elevation, use **Ghost Borders**—low-opacity outlines—to define input fields and table cells.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a modern, approachable feel while maintaining the structural rigidity expected of a professional tool.

- **Buttons & Inputs:** 0.25rem (4px).
- **Task Cards:** 0.5rem (8px) to visually group internal information.
- **Status Chips:** Full pill-shaped (100px) to distinguish them from interactive buttons.
- **Selection Indicators:** Sidebar active states use a vertical 3px "pill" bar on the left edge of the menu item.

## Components
- **Buttons:** Primary buttons use the Indigo base with white text. Secondary buttons use a white background with a Slate border. Actions should have a 150ms transition on hover.
- **Task Cards:** Should include a 4px left-border accent color corresponding to the task's priority or status (e.g., Red for Overdue).
- **Status Chips:** Subtle background tints (e.g., 10% opacity of the status color) with high-contrast text for maximum legibility.
- **Data Tables:** Row heights should be fixed at 48px for standard views and 40px for "Compact" views. Header rows use `label-md` typography with a light grey background (`#F1F5F9`).
- **Toggle Switches:** Use a "Track and Thumb" style. The track should turn Primary Indigo when active.
- **Calendar (OOO View):** Use a 7-column grid with light borders. "Out of Office" blocks should appear as solid horizontal spans with 50% opacity of the Primary color to allow grid lines to remain visible.
- **Input Fields:** Use a 1px border (`#CBD5E1`). On focus, the border color shifts to Primary Indigo with a 2px outer glow of 10% opacity indigo.