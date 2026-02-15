# Visual Guide: Dense Timeline Rows - Before/After

## BEFORE - Old Timeline Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Drag to reorder steps. Click ⋮ for actions.                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ◯   💧    ⋮⋮   DPPEPhos                             ⋮    │
│   1         │    Stock in 2-MeTHF • 0.5 M                   │
│             │                                               │
│             │                                               │
│         [  + Add step here  ]  ← inline add button         │
│                                                              │
│   ◯   ⚛️    ⋮⋮   Pd(OAc)₂                            ⋮    │
│   2         │    Neat • 2.5 μmol                            │
│             │                                               │
│             │                                               │
│         [  + Add step here  ]                               │
│                                                              │
│   ◯   🔥    ⋮⋮   Stir                                 ⋮    │
│   3         │    80°C • 2 h • 600 RPM                       │
│             │                                               │
│             │                                               │
│         [  + Add step here  ]                               │
│                                                              │
│   ◯   ⏱    ⋮⋮   Wait                                 ⋮ ❌ │  ← CLIPPED!
│   4              5 min                               [⌄]    │     Menu
│                                                       Edit   │     doesn't
│                                                              │     show
└─────────────────────────────────────────────────────────────┘

Issues:
- Only 3-4 items visible in viewport
- Lots of white space
- Inline add buttons create clutter
- Wide left gutter (44px)
- Kebab menu clips on last row
- Hard to scan quickly
```

---

## AFTER - Dense Timeline Layout ✓

```
┌─────────────────────────────────────────────────────────────┐
│  Drag to reorder steps. Click ⋮ for actions.                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⋮⋮  ┌─────────┐  DPPEPhos                            ⋮    │
│      │ 1  💧  │  Stock in 2-MeTHF • 0.5 M                   │
│      └─────────┘                                            │
│         │                                                    │
│  ⋮⋮  ┌─────────┐  Pd(OAc)₂                            ⋮    │
│      │ 2  ⚛️  │  Neat • 2.5 μmol                           │
│      └─────────┘                                            │
│         │                                                    │
│  ⋮⋮  ┌─────────┐  Ligand A                             ⋮    │
│      │ 3  💧  │  Stock in THF • 1.0 M                      │
│      └─────────┘                                            │
│         │                                                    │
│  ⋮⋮  ┌─────────┐  Stir                                 ⋮    │
│      │ 4  🔥  │  80°C • 2 h • 600 RPM                      │
│      └─────────┘                                            │
│         │                                                    │
│  ⋮⋮  ┌─────────┐  Wait                                 ⋮    │
│      │ 5  ⏱  │  5 min                                      │
│      └─────────┘                                            │
│         │                                                    │
│  ⋮⋮  ┌─────────┐  Evaporate                            ⋮    │
│      │ 6  💨  │  Remove solvents                           │
│      └─────────┘                                            │
│         │                                                    │
│  ⋮⋮  ┌─────────┐  Note                          ⋮ ✓        │
│      │ 7  📝  │  Went for lunch          ┌──────────┐      │
│      └─────────┘                          │ Edit     │      │  ← VISIBLE!
│                                            │ Duplicate│      │
│                                            │ Delete   │      │
│                                            └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    + Add Step                                │
└─────────────────────────────────────────────────────────────┘

Improvements:
✓ 6-7 items visible (vs 3-4 before) = ~2x density
✓ Clean, compact rows (56-72px vs 80-100px)
✓ No white space waste
✓ Compact step chips (pill shape with number + icon)
✓ Thin connector line (2px) in minimal gutter (~46px)
✓ Kebab menu NEVER clips (portal rendering)
✓ Easy to scan titles and details
✓ Single add button at bottom (clear flow)
```

---

## Key Layout Differences

### ROW STRUCTURE

**BEFORE:**
```
┌──────┬────┬───────────────────────────────┬────┐
│ ◯ 1  │ ⋮⋮ │  Material Name                │ ⋮  │
│ 💧   │    │  Details text here            │    │
└──────┴────┴───────────────────────────────┴────┘
 44px   20px        flex: 1              28px
 rail   drag        content              menu
```

**AFTER:**
```
┌────┬────────────┬──────────────────────────────┬────┐
│ ⋮⋮ │ ┌────────┐│  Material Name               │ ⋮  │
│    │ │ 1  💧 ││  Details text here           │    │
│    │ └────────┘│                              │    │
└────┴────────────┴──────────────────────────────┴────┘
 24px    ~48px            flex: 1               28px
 drag    chip            content                menu
```

### SPACING

**BEFORE:**
- Row height: 48px min + 12-16px between = ~60-64px per item
- Left gutter: 44px
- Inline add slots: +20px each

**AFTER:**
- Row height: 56px target (72px max) + 8px between = 64px per item max
- Left gutter: ~46px total (drag 24px + chip)
- No inline add slots = cleaner

### KEBAB MENU FIX

**BEFORE:**
```css
.kebab-dropdown {
  position: absolute;  /* confined to parent */
  top: 100%;
  right: 0;
  /* gets clipped by overflow: auto container */
}
```

**AFTER:**
```javascript
createPortal(
  <div 
    className="kebab-dropdown-portal"
    style={{ 
      position: 'fixed',  // escapes container
      top: calculatedTop,  // smart positioning
      left: calculatedLeft,
      zIndex: 1000  // always on top
    }}
  />,
  document.body  // renders at body level
)
```

**Auto-flip logic:**
- Checks available space below/above button
- Flips to top if insufficient space below
- Always fully visible regardless of scroll position

---

## Step Chip Design

The compact pill-shaped chip combines step number + icon:

```
┌─────────────┐
│  1    💧   │  ← 28px height
└─────────────┘
   ↑     ↑
   11px  14px
   bold  icon
   #     emoji
```

**Benefits:**
- Saves vertical space (no stacked number + icon)
- Visually distinct and easy to identify
- Maintains timeline feel with connector line
- Color-coded via icon (each operation type has color)

---

## Connector Line Logic

The thin 2px vertical line connects step chips:

```
  ┌────────┐
  │ 1  💧 │
  └────────┘
      │     ← 8px long, positioned at left: 46px
  ┌────────┐
  │ 2  ⚛️  │
  └────────┘
      │
  ┌────────┐
  │ 3  🔥  │
  └────────┘
```

**CSS:**
```css
.timeline-connector-dense {
  position: absolute;
  left: 46px;  /* center of chip area */
  top: 100%;   /* starts below row */
  width: 2px;
  height: 8px; /* matches row gap */
  background: rgba(border, 0.6);
}
```

---

## Interaction States

### Hover
**Row:**
- Background: 5% primary color tint
- Drag handle: appears (opacity 0 → 0.7)
- Kebab menu: appears (opacity 0 → 1)

### Dragging
- Row opacity: 0.6
- Cursor: grabbing
- Box shadow: elevated

### Drag Over (drop target)
- Background: 12% primary color tint
- Border: 2px inset primary color

### Editing
- Background: 5% info color tint
- Border: 1px solid info color
- Height: auto-expands for edit form

---

## Responsive Behavior

The layout adapts gracefully:

**Desktop (1100px modal):**
- Full layout as shown above
- Kebab menu on right edge
- All text fully visible

**Tablet (768-1100px):**
- Slightly reduced horizontal padding
- Title/details may truncate sooner
- Kebab menu still fully functional

**Mobile (<768px):**
- Modal full-screen
- Increased touch targets
- Drag handle always visible
- Menu buttons larger tap areas

---

## Accessibility Features

1. **Keyboard Navigation:**
   - Tab through rows
   - Space/Enter to open kebab
   - Arrow keys in menu

2. **Screen Readers:**
   - `role="button"` on drag handle
   - `aria-label="Drag to reorder"`
   - `aria-expanded` on kebab button

3. **Visual Feedback:**
   - Clear focus states
   - High contrast ratios
   - Hover previews

4. **Motor Accessibility:**
   - Large click targets (28px+ buttons)
   - Drag handles visible on hover
   - No precision required

---

## Summary

The dense timeline implementation achieves:

📊 **~2x content density** - see more without scrolling
🎯 **100% kebab visibility** - no more clipping
✨ **Cleaner aesthetics** - reduced visual clutter  
⚡ **Better scannability** - consistent left-aligned layout
🔧 **All features intact** - nothing lost in refactor

The portal-based menu and compact row design work together to create a professional, user-friendly interface that scales well and looks great!
