# Dense Timeline Rows - Testing Checklist

## ✅ Implementation Complete

Date: 2026-02-13  
Feature: Dense Timeline Rows for Dispense Order (Step 3)  
Status: **READY FOR TESTING**

---

## Pre-Testing Checklist

### Code Changes
- [x] Import `createPortal` from 'react-dom'
- [x] Import `useEffect` hook
- [x] Implement portal-based KebabMenu component
- [x] Refactor TimelineRow to dense layout
- [x] Remove inline-add functionality
- [x] Simplify state management (remove hoverIndex)
- [x] Add CSS for `.timeline-layout-dense`
- [x] Add CSS for `.timeline-row-dense`
- [x] Add CSS for `.kebab-dropdown-portal`
- [x] Add CSS for `.timeline-step-chip`
- [x] Add CSS for `.timeline-connector-dense`

### Files Modified
- [x] `DispenseOrderStep.js` - Component logic
- [x] `PlatingProtocol.css` - Styling

### Documentation
- [x] Implementation summary created
- [x] Visual guide created
- [x] Testing checklist created

---

## Manual Testing Checklist

### 1. Visual Inspection

#### Density & Layout
- [ ] **Row Height**: Rows are visually compact (56-72px)
- [ ] **Vertical Spacing**: 8-12px gap between rows
- [ ] **Left Gutter**: Drag handle + chip totals ~46-64px (not wide)
- [ ] **Step Chip**: Pill-shaped, contains number + icon, 28px height
- [ ] **Connector Line**: Thin 2px vertical line visible between chips
- [ ] **Content Alignment**: Title and details are left-aligned
- [ ] **Truncation**: Long text shows ellipsis (...) when too long

#### Comparison
- [ ] **More Visible**: Can see ~2x more steps vs before
- [ ] **Less White Space**: No large gaps or excessive padding
- [ ] **Clean Look**: No visual clutter from inline-add buttons

### 2. Kebab Menu (Primary Fix)

#### Bottom Row - Most Critical
- [ ] Open menu on **last row** in list
- [ ] Menu dropdown is **fully visible** (not cut off)
- [ ] Menu appears **above** the button (flipped) when near bottom
- [ ] Menu has proper shadow and appears on top of everything
- [ ] Clicking outside menu closes it
- [ ] Clicking backdrop closes menu

#### Middle Rows
- [ ] Open menu on **middle row**
- [ ] Menu appears **below** the button (default placement)
- [ ] Menu is fully visible and clickable
- [ ] All three options visible: Edit / Duplicate / Delete

#### Top Row
- [ ] Open menu on **first row**
- [ ] Menu appears correctly
- [ ] No overlap with header

#### Edge Cases
- [ ] Scroll to bottom, open last menu → flips up ✓
- [ ] Scroll to top, open first menu → stays down ✓
- [ ] Resize window while menu open → repositions correctly
- [ ] Open menu, scroll list → menu stays in place (should close if preferred)

### 3. Drag & Drop Reordering

#### Basic Reordering
- [ ] Hover over row → drag handle (⋮⋮) appears
- [ ] Click and drag step 1 to position 3
- [ ] Visual feedback during drag (opacity change)
- [ ] Drop zone highlighted (border/background change)
- [ ] Order updates correctly after drop
- [ ] Connector lines update correctly

#### Edge Cases
- [ ] Drag first item to last position
- [ ] Drag last item to first position
- [ ] Drag item to same position (no change)
- [ ] Drag while editing (should not be draggable)

### 4. Edit Operations

#### Inline Editing
- [ ] Click **Edit** on Wait operation
- [ ] Row expands to show inline form
- [ ] Form has Duration + Unit inputs
- [ ] Form has Cancel + Save buttons
- [ ] **Save**: updates operation, collapses row
- [ ] **Cancel**: discards changes, collapses row
- [ ] Row is **not draggable** while editing

#### Different Operation Types
- [ ] Edit **Stir**: shows Temp, Time, RPM fields
- [ ] Edit **Note**: shows textarea
- [ ] **Evaporate**: shows "No parameters" (Edit disabled)
- [ ] **Dispense**: Edit button hidden (can't edit, wrong flow)

### 5. Duplicate Operation

#### Functionality
- [ ] Duplicate Wait → creates new Wait with same params
- [ ] Duplicate Stir → creates new Stir with same params
- [ ] Duplicate Note → creates new Note with same text
- [ ] New step appears **immediately after** original
- [ ] Step numbers update correctly (1,2,3 → 1,2,2,3)

#### Integration
- [ ] Duplicate does not trigger edit mode
- [ ] Connector lines adjust correctly
- [ ] Can immediately drag new duplicate

### 6. Delete Operation

#### Functionality
- [ ] Delete **Wait** → removes from list
- [ ] Delete **Stir** → removes from list
- [ ] Delete **Note** → removes from list
- [ ] Delete **Evaporate** → removes from list
- [ ] Delete **Dispense** → does nothing (protected)

#### Edge Cases
- [ ] Delete while editing → cancels edit, removes step
- [ ] Delete only remaining unit op → works
- [ ] Delete when only dispense ops remain → still protected

### 7. Add Step (Bottom Button)

#### Click Flow
- [ ] Click **"+ Add Step"** button
- [ ] Step type chooser modal appears (centered)
- [ ] Modal shows 4 options: Wait, Stir, Evaporate, Note
- [ ] Click **Wait** → adds Wait to end, opens edit form
- [ ] Click **Stir** → adds Stir to end, opens edit form
- [ ] Click **Note** → adds Note to end, opens edit form
- [ ] Click **Evaporate** → adds Evaporate to end, no edit
- [ ] Click outside chooser → closes without adding

#### Integration
- [ ] New step gets next step number
- [ ] Connector line extends to new step
- [ ] Can immediately interact with new step

### 8. Long Text Truncation

#### Title Truncation
- [ ] Create material with **very long name** (50+ chars)
- [ ] Title shows ellipsis: "Very Long Material Name That..."
- [ ] Title does **not** wrap to 2 lines
- [ ] Title does **not** break layout

#### Details Truncation
- [ ] Create stock solution with **long details** (80+ chars)
- [ ] Details show ellipsis: "Stock in Long Solvent Name..."
- [ ] Details do **not** wrap to 2+ lines
- [ ] Details do **not** break layout

#### Note Truncation
- [ ] Create Note with **long text** (100+ chars)
- [ ] Note summary shows first 40 chars + "..."
- [ ] Edit to see full text
- [ ] Full text visible in edit form

### 9. Scrolling Behavior

#### List Scrolling
- [ ] Add 10+ steps
- [ ] List area scrolls independently
- [ ] Header stays fixed (not scrolling)
- [ ] Footer stays fixed (not scrolling)
- [ ] Scrollbar appears on right side
- [ ] Bottom padding prevents last row clipping (20px)

#### Scroll States
- [ ] Scroll to top → first row fully visible
- [ ] Scroll to middle → smooth scrolling
- [ ] Scroll to bottom → last row has breathing room
- [ ] Scroll with keyboard (arrow keys) works

### 10. Responsive Behavior

#### Modal Resize
- [ ] Resize modal wider → layout adjusts
- [ ] Resize modal narrower → text truncates appropriately
- [ ] Minimum width maintains usability
- [ ] Maximum width constrains content width

#### Different Viewports
- [ ] Test at 1100px (wide modal)
- [ ] Test at 900px (medium modal)
- [ ] Test at 768px (narrow/tablet)
- [ ] All features accessible at all sizes

### 11. Interaction States

#### Hover States
- [ ] Hover row → background tints slightly
- [ ] Hover row → drag handle appears (fades in)
- [ ] Hover row → kebab menu appears (fades in)
- [ ] Hover drag handle → cursor changes to grab
- [ ] Hover kebab button → background changes

#### Focus States
- [ ] Tab to drag handle → focus visible
- [ ] Tab to kebab button → focus visible  
- [ ] Focus persists during keyboard navigation
- [ ] Focus styles match design system

#### Active States
- [ ] Click drag handle → cursor changes to grabbing
- [ ] Click kebab → menu opens
- [ ] Click edit → row expands
- [ ] All transitions smooth (no jank)

### 12. Keyboard Accessibility

#### Navigation
- [ ] Tab through rows in sequence
- [ ] Tab to drag handle → press Space/Enter (should focus)
- [ ] Tab to kebab → press Space/Enter to open menu
- [ ] Arrow keys navigate within menu
- [ ] Escape closes menu
- [ ] Escape cancels edit form

#### Screen Reader
- [ ] Drag handle has aria-label "Drag to reorder"
- [ ] Kebab has aria-label "Step actions"
- [ ] Kebab has aria-expanded state
- [ ] Menu items have clear labels
- [ ] Step numbers announced

### 13. Performance

#### Rendering
- [ ] Initial load is fast (<500ms)
- [ ] Adding step is instant
- [ ] Deleting step is instant
- [ ] Reordering is smooth (60fps)
- [ ] No lag when opening menus

#### Large Lists
- [ ] Test with 20 steps → still performant
- [ ] Test with 50 steps → acceptable performance
- [ ] Scrolling remains smooth
- [ ] No memory leaks over time

### 14. Integration with Wizard

#### Step Flow
- [ ] Navigate from Step 2 → Step 3 → data persists
- [ ] Navigate Step 3 → Step 2 → Step 3 → changes preserved
- [ ] Click **Next** from Step 3 → proceeds to Step 4
- [ ] Click **Back** from Step 3 → returns to Step 2

#### Data Persistence
- [ ] Reorder steps → navigate away → come back → order preserved
- [ ] Add/delete steps → navigate away → come back → changes preserved
- [ ] Edit operation → navigate away → come back → edits preserved

### 15. Edge Cases & Error Handling

#### Empty States
- [ ] Zero materials → shows "No Materials" message
- [ ] Only dispense ops → Add Step still works

#### Rapid Interactions
- [ ] Rapidly click menu button → no duplicate menus
- [ ] Rapidly add steps → all added correctly
- [ ] Spam delete → only valid deletes occur

#### Odd Scenarios
- [ ] Open menu, delete step → menu closes gracefully
- [ ] Edit step, then reorder → edit cancels, reorder works
- [ ] Duplicate while another is being edited → works independently

---

## Acceptance Criteria Final Check

After completing all tests above, verify these final criteria:

### ✅ Visible Density Improved
- [ ] Can see at least **2x more steps** in same viewport vs before
- [ ] No wasted white space
- [ ] Compact, professional appearance

### ✅ No Clipped Kebab Menus
- [ ] Kebab menu **always fully visible** on every row
- [ ] Menu flips to top when near bottom
- [ ] Menu never hidden or cut off

### ✅ Reorder Still Works
- [ ] Drag-and-drop fully functional
- [ ] Visual feedback clear and smooth
- [ ] Order changes persist correctly

### ✅ Edit/Delete Still Work
- [ ] All operation types can be edited (except Dispense/Evaporate)
- [ ] Duplicate creates correct copies
- [ ] Delete removes steps (except Dispense)

### ✅ Long Text Truncates Cleanly
- [ ] Title truncates at 1 line with ellipsis
- [ ] Details truncate at 1 line with ellipsis
- [ ] Layout never breaks with long content

---

## Bug Tracking

If any issues found during testing, document here:

### Issue #1
**Title:** _[Description]_  
**Severity:** Critical / High / Medium / Low  
**Steps to Reproduce:**  
1. _[Step 1]_
2. _[Step 2]_

**Expected:** _[What should happen]_  
**Actual:** _[What actually happens]_  
**Fix Needed:** _[Proposed solution]_

---

## Sign-Off

- [ ] **Developer**: All code changes implemented correctly
- [ ] **QA/Tester**: All manual tests passed
- [ ] **Product**: UI/UX matches requirements
- [ ] **Stakeholder**: Ready for production deployment

**Tested by:** _________________  
**Date:** _________________  
**Approved by:** _________________  
**Date:** _________________

---

## Next Steps After Testing

1. [ ] Fix any bugs found during testing
2. [ ] Re-test after fixes
3. [ ] Update documentation if needed
4. [ ] Deploy to staging environment
5. [ ] Get user feedback
6. [ ] Deploy to production
7. [ ] Monitor for any issues
8. [ ] Collect analytics on improved density

---

## Known Limitations (Not Bugs)

These are intentional design choices:

1. **Dispense operations cannot be edited** - By design (use Step 2 for material config)
2. **Dispense operations cannot be deleted** - Protected (they represent materials)
3. **Evaporate has no edit form** - No parameters to edit
4. **Add Step only at bottom** - Simplified from inline-add approach
5. **Max 2 lines per row** - Enforced for density (56-72px height)

---

_Last updated: 2026-02-13_
