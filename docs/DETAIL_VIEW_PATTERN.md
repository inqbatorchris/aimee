# Detail/Edit View Pattern Documentation

## Overview
The Detail/Edit View pattern is a standardized UI component design for displaying detailed information about an entity (objectives, tasks, etc.) in a slide-out panel that pushes content aside rather than overlaying it.

## Core Design Principles

### 1. Panel Behavior
- **Slide-out from right**: Panel appears from the right edge of the screen
- **Push content**: Main content shifts left instead of being overlapped
- **No overlay**: No darkened background or modal overlay
- **Fixed width**: Consistent 600px width across all tabs/content
- **Full height**: Panel extends full viewport height

### 2. Visual Structure

```
┌─────────────────────────────────────────┐
│  Title Bar                              │
│  ┌────────────────────────────────┐ [X] │
│  │ 🎯 Entity Title                │     │
│  └────────────────────────────────┘     │
│  Status Badge | Progress % | Owner      │
│  ══════════════════════════════════     │
│  Progress Bar (if applicable)           │
│  ─────────────────────────────────      │
│  [Tab 1] [Tab 2] [Tab 3] (Desktop)     │
│  [Dropdown Menu ▼] (Mobile)            │
│  ─────────────────────────────────      │
│  Tab Content Area                       │
│  (Scrollable)                          │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Component Structure

#### Header Section
- **Title**: Icon + Entity name
- **Close button**: X button in top-right corner
- **Metadata**: Status badge, progress percentage, owner
- **Actions menu**: Dropdown for edit/delete operations

#### Navigation
- **Desktop**: Horizontal tabs with icons
- **Mobile**: Dropdown selector for space efficiency
- **Active state**: Clear visual indication of selected tab

#### Content Area
- **Scrollable**: Vertical scroll for long content
- **Consistent width**: All tabs maintain same panel width
- **Padding**: Uniform padding across all tab content

## Implementation Example

### 1. Container Component (SheetContainer)

```tsx
<SheetContainer panelOpen={panelOpen} panelWidth="600px">
  {/* Main page content */}
  <div className="h-full flex flex-col">
    {/* Page content here */}
  </div>
  
  {/* Detail panel */}
  {selectedItem && (
    <DetailPanel
      itemId={selectedItem.id}
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
    />
  )}
</SheetContainer>
```

### 2. Detail Panel Component

```tsx
<Sheet
  open={open}
  onClose={onClose}
  width="600px"
  title={/* Title component */}
  description={/* Metadata component */}
>
  <div className="flex flex-col h-full">
    {/* Progress bar if applicable */}
    
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* Desktop tabs */}
      <TabsList className="hidden sm:grid">
        {/* Tab triggers */}
      </TabsList>
      
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          {/* Select options */}
        </Select>
      </div>
      
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <TabsContent className="h-full overflow-y-auto">
          <div className="w-full">
            {/* Content */}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  </div>
</Sheet>
```

## Design Specifications

### Dimensions
- **Panel width**: 600px (fixed)
- **Close button**: 32x32px
- **Tab height**: 40px (desktop), 36px (mobile)
- **Content padding**: 16px (mobile), 24px (desktop)

### Colors & Styling
- **Background**: White (`bg-white`)
- **Border**: Light gray (`border-gray-200`)
- **Shadow**: Medium elevation (`shadow-lg`)
- **Tab active**: Primary color with underline
- **Tab inactive**: Muted text color

### Responsive Behavior
- **Desktop (≥640px)**: 
  - Horizontal tabs
  - 600px panel width
  - Push main content

- **Mobile (<640px)**:
  - Dropdown tab selector
  - Full screen width
  - Slide over content (space constraints)

### Animation
- **Slide duration**: 300ms
- **Easing**: `ease-in-out`
- **Content push**: Synchronized with panel slide

## Usage Guidelines

### When to Use
- Viewing detailed information about an item
- Editing complex entities with multiple sections
- Comparing items side-by-side
- Quick previews without navigation

### When NOT to Use
- Simple confirmations (use modal)
- Full-screen forms (use dedicated page)
- Critical errors (use alert dialog)
- Quick actions (use dropdown menu)

## Accessibility

### Keyboard Navigation
- **Escape**: Close panel
- **Tab**: Navigate between elements
- **Arrow keys**: Navigate tabs (desktop)
- **Enter/Space**: Select tab

### Screen Readers
- Proper ARIA labels on all interactive elements
- Focus management when panel opens/closes
- Announce panel state changes

### Visual Indicators
- Clear focus states
- High contrast mode support
- Sufficient color contrast ratios

## Code Components

### Required Components
1. `Sheet` - Base panel component
2. `SheetContainer` - Layout wrapper
3. `Tabs/TabsContent/TabsList/TabsTrigger` - Tab navigation
4. `Select` - Mobile dropdown
5. `Button` - Actions
6. `Badge` - Status indicators
7. `Progress` - Progress visualization

### State Management
```tsx
const [panelOpen, setPanelOpen] = useState(false);
const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
const [activeTab, setActiveTab] = useState('details');

// Reset tab when panel opens
useEffect(() => {
  if (panelOpen && selectedItemId) {
    setActiveTab('details');
  }
}, [panelOpen, selectedItemId]);
```

## Testing Checklist

### Functionality
- [ ] Panel slides in/out smoothly
- [ ] Content pushes aside correctly
- [ ] No overlay appears
- [ ] Close button works
- [ ] Escape key closes panel
- [ ] Tabs switch content properly
- [ ] Mobile dropdown works

### Visual
- [ ] Consistent 600px width
- [ ] No width changes between tabs
- [ ] Proper spacing/padding
- [ ] Responsive on all screen sizes
- [ ] Animations are smooth

### Accessibility
- [ ] Keyboard navigable
- [ ] Screen reader compatible
- [ ] Focus management works
- [ ] ARIA labels present

## Examples in Codebase

### Implemented Patterns
1. **Objective Detail Panel** - `/client/src/components/objective-detail/ObjectiveDetailPanel.tsx`
2. **Task Detail Panel** - `/client/src/components/task-detail/TaskDetailPanel.tsx`

### Key Features
- Bypass API for data fetching
- Tab-based content organization
- Edit/Delete actions in dropdown
- Progress visualization
- Mobile-responsive design

## Migration Guide

### Converting from Modal to Slide Panel

1. Replace `Dialog` with `Sheet`
2. Wrap page in `SheetContainer`
3. Remove overlay/backdrop code
4. Adjust width to 600px
5. Convert modal tabs to panel tabs
6. Add mobile dropdown for tabs
7. Update close handlers

### Example Migration
```tsx
// Before (Modal)
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    {/* content */}
  </DialogContent>
</Dialog>

// After (Slide Panel)
<SheetContainer panelOpen={open} panelWidth="600px">
  {/* main content */}
  <Sheet open={open} onClose={() => setOpen(false)}>
    {/* panel content */}
  </Sheet>
</SheetContainer>
```

## Best Practices

1. **Always reset state** when panel opens
2. **Preload data** when possible for instant display
3. **Handle loading states** gracefully
4. **Provide clear close options** (button, escape, click outside)
5. **Maintain scroll position** when switching tabs
6. **Use consistent animations** across all panels
7. **Test on multiple screen sizes** especially mobile
8. **Ensure accessibility** with proper ARIA labels

## Future Enhancements

- [ ] Resizable panel width
- [ ] Multiple panels support
- [ ] Panel docking options
- [ ] Keyboard shortcuts for tabs
- [ ] Panel state persistence
- [ ] Animation customization
- [ ] Theme variants

---

*Last Updated: January 2025*
*Pattern Version: 1.0*