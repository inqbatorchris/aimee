# Strategy Mind Map - Detailed Mockup & Implementation Plan

## Executive Summary

This document outlines the complete design and implementation for visualizing organizational strategy as an interactive mind map. The system will display Mission → Objectives → Key Results → Tasks as connected nodes, with team/department categorization enabling org-chart style views and personalized focus modes.

---

## 1. Data Model Changes

### 1.1 Adding Teams to Objectives

**Database Change:**
```sql
ALTER TABLE objectives 
ADD COLUMN team_id INTEGER REFERENCES teams(id);

CREATE INDEX idx_objectives_team ON objectives(team_id);
```

**Schema Update (shared/schema.ts):**
```typescript
export const objectives = pgTable("objectives", {
  // ... existing fields
  teamId: integer("team_id").references(() => teams.id),
  // ... rest of fields
});
```

### 1.2 Team Inheritance Cascade

When creating child items, they inherit the parent's team:
- **Objective** → has `teamId` (user selectable)
- **Key Result** → inherits `teamId` from parent Objective (can override)
- **Key Result Task** → inherits `teamId` from parent Key Result (can override)
- **Work Item** → inherits `teamId` from parent task/KR (can override)

---

## 2. UI Changes to Objectives Page

### 2.1 View Switcher Component

**Location:** Top-right corner of Objectives page, next to filters

**Design:**
```
┌─────────────────────────────────────────────────────────┐
│  Objectives                                    🔍 Filter │
│  ┌──────────────────┐                                   │
│  │ Table │ Mind Map │  ← Toggle button group            │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Defaults to "Table" view (current behavior)
- Click "Mind Map" to switch to visualization
- Selection persisted in localStorage: `strategyViewMode`
- Smooth transition between views (fade animation)

### 2.2 Team Field in Create/Edit Objective Dialog

**Update CreateObjectiveDialog.tsx:**

Add team selector between "Owner" and "Priority" fields:

```
┌──────────────────────────────────────────┐
│ Create New Objective                     │
├──────────────────────────────────────────┤
│ Objective Title                          │
│ [Increase customer satisfaction...    ] │
│                                          │
│ Description                              │
│ [                                     ] │
│                                          │
│ Owner                 Team               │
│ [Select owner ▼]     [Select team ▼]    │
│                                          │
│ Category              Priority           │
│ [Strategic   ▼]      [High       ▼]     │
└──────────────────────────────────────────┘
```

**Team Dropdown:**
- Fetches from `/api/teams`
- Shows team name
- Optional field (objectives can have no team)
- Placeholder: "Select a department/team..."

### 2.3 Team Display in Table View

**Update Objectives.tsx table:**

Add "Team" column between "Owner" and "Status":

```
┌─────────────────┬──────────┬──────────────┬─────────┬──────────┐
│ Objective       │ Owner    │ Team         │ Status  │ Progress │
├─────────────────┼──────────┼──────────────┼─────────┼──────────┤
│ ▼ Revenue Growth│ Sarah C. │ 💼 Sales     │ On Track│ ████ 75% │
│   ↳ KR: $10M... │ Sarah C. │ 💼 Sales     │ On Track│ ████ 80% │
│   ↳ KR: 50 new..│ Mark T.  │ 💼 Marketing │ At Risk │ ██░░ 45% │
└─────────────────┴──────────┴──────────────┴─────────┴──────────┘
```

**Team Badge Design:**
- Icon + Name format: `💼 Sales`
- Color-coded by team (consistent across UI)
- Clickable to filter by team
- Inline editable (click to change)

---

## 3. Mind Map Visualization

### 3.1 Library Selection: React Flow

**Why React Flow:**
- Battle-tested, performant for 100+ nodes
- Built-in zoom, pan, mini-map
- Custom node support (shadcn integration)
- Touch/mobile gesture support
- TypeScript-first
- MIT license

**Installation:**
```bash
npm install reactflow
```

### 3.2 Layout Modes

#### Mode 1: Tree Layout (Default) - Org Chart Style

**Visual Structure:**
```
                    ┌──────────────────┐
                    │   MISSION        │
                    │   "Empower..."   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
        │ Sales Team│  │ Product │  │Engineering│
        │ Objective │  │  Team   │  │   Team    │
        │ Revenue   │  │ Objective│  │ Objective │
        └─────┬─────┘  └────┬────┘  └─────┬─────┘
              │             │              │
        ┌─────┼─────┐       │        ┌────┼────┐
        │     │     │       │        │    │    │
    ┌───▼┐ ┌─▼──┐ ┌▼───┐ ┌▼──┐  ┌──▼┐ ┌─▼──┐ ┌▼───┐
    │ KR │ │ KR │ │ KR │ │KR │  │ KR│ │ KR │ │ KR │
    │ #1 │ │ #2 │ │ #3 │ │#1 │  │ #1│ │ #2 │ │ #3 │
    └────┘ └────┘ └────┘ └───┘  └───┘ └────┘ └────┘
```

**Layout Algorithm:** Dagre (hierarchical tree)
- Top-down flow
- Even spacing between siblings
- Grouped by team (color-coded backgrounds)
- Auto-adjusts node positions

#### Mode 2: Radial Layout - Sunburst Style

**Visual Structure:**
```
                   KR ○
                      ╲
        KR ○──────Obj──────○ KR
                  ╱  ╲
              KR ○    ○ KR
                 │
                 │
            ┌────○────┐
            │ MISSION │  ← Center
            └────○────┘
                 │
                 │
              Obj○─────○ KR
               ╱  ╲
           KR○    ○KR
```

**Layout Algorithm:** Custom radial positioning
- Mission at center
- Objectives in first ring
- Key Results in second ring
- Tasks in outer ring
- Angular spacing by team (pie chart sectors)

### 3.3 Node Design

#### Mission Node (Root)
```
┌─────────────────────────────┐
│ 🎯 MISSION                  │
├─────────────────────────────┤
│ Empower businesses through  │
│ innovative technology       │
│                             │
│ 📊 4 Objectives             │
│ ✓ 75% Overall Progress      │
└─────────────────────────────┘
```
- Larger than other nodes (2x width)
- Distinct background gradient
- Shows aggregate stats
- Always visible (can't collapse)

#### Objective Node
```
┌──────────────────────────┐
│ 💼 Sales Team            │ ← Team badge
├──────────────────────────┤
│ Increase Revenue         │ ← Title
│                          │
│ 👤 Sarah Chen            │ ← Owner
│ 🎯 $10M target           │ ← Target
│ ████░░░░ 75%             │ ← Progress
│                          │
│ 📋 3 Key Results         │ ← Child count
└──────────────────────────┘
```
- Team color accent on left border
- Status indicator (🟢 on track, 🟡 at risk, 🔴 off track)
- Click to expand/collapse key results
- Hover shows tooltip with description

#### Key Result Node
```
┌────────────────────────┐
│ Achieve $10M in sales  │ ← Title
├────────────────────────┤
│ $8M / $10M             │ ← Progress metric
│ ████████░░ 80%         │ ← Progress bar
│                        │
│ 👤 Sarah Chen          │ ← Owner (if different)
│ 📅 Due: Q2 2025        │ ← Timeline
│ ✓ 5/7 Tasks            │ ← Task completion
└────────────────────────┘
```
- Smaller than objectives
- Inherits team color
- Double-click to view tasks
- Badge for task count

#### Task Node (Work Item)
```
┌──────────────────┐
│ ✓ Launch platform│ ← Title + status icon
├──────────────────┤
│ 👤 Dev Team      │ ← Assignee
│ 📅 Mar 15        │ ← Due date
└──────────────────┘
```
- Smallest node
- Checkbox-style status icon
- Minimal detail (title only)
- Click to open detail panel

### 3.4 Edge (Connection) Design

**Visual Style:**
- Smooth bezier curves (not straight lines)
- Subtle gradient from parent to child
- Arrow markers on child end
- Thickness indicates "weight" (number of completed children)

**Color Coding:**
- Inherits team color when connected to team objective
- Gray for unassigned/cross-team connections
- Animated pulse for "at risk" paths

### 3.5 Interactive Features

#### Zoom & Pan
- Mouse wheel to zoom (10% - 300%)
- Click and drag canvas to pan
- Fit-to-screen button (resets view)
- Zoom controls in bottom-right corner

#### Expand/Collapse
- Click node header to toggle children
- "Expand All" / "Collapse All" buttons in toolbar
- Collapsed nodes show child count badge
- Smooth animation on expand/collapse

#### Search & Highlight
```
┌────────────────────────────────┐
│ 🔍 Search objectives, KRs...   │
└────────────────────────────────┘
```
- Live search as you type
- Highlights matching nodes (yellow glow)
- Auto-expands parent nodes to show matches
- Navigate matches with up/down arrows

#### Click Interactions
- **Single click node:** Select (highlight)
- **Double click node:** Expand/collapse
- **Click node title:** Open detail panel
- **Right click node:** Context menu (edit, delete, add child)

---

## 4. Filter & Focus Modes

### 4.1 Filter Panel (Sidebar)

**Location:** Collapsible left sidebar

```
┌─────────────────────┐
│ FILTERS             │
├─────────────────────┤
│ 📊 View By          │
│ ○ All Items         │
│ ● By Team           │
│ ○ By Owner          │
│                     │
│ 👥 Teams            │
│ ☑ Sales             │
│ ☑ Marketing         │
│ ☐ Engineering       │
│ ☐ Product           │
│                     │
│ 📈 Status           │
│ ☑ On Track          │
│ ☑ At Risk           │
│ ☐ Off Track         │
│ ☐ Completed         │
│                     │
│ 👤 Owner            │
│ [Select owner... ▼] │
│                     │
│ [Reset Filters]     │
└─────────────────────┘
```

### 4.2 Focus Modes

#### "My Work" Mode
**Behavior:**
- Highlights nodes owned/assigned to current user (full opacity)
- Dims other nodes (30% opacity)
- Shows connecting path from user nodes to mission
- Badge count: "Showing 8 of 24 items"

**Use Case:** Team member sees only their responsibilities

#### "By Team" Mode
**Behavior:**
- Groups nodes by team in tree layout
- Each team gets distinct color zone
- Team name appears as section header
- Can select multiple teams (checkboxes)

**Use Case:** Manager reviews single department

#### "All" Mode (Default)
**Behavior:**
- Shows complete hierarchy
- All nodes visible and interactive
- No filtering applied

**Use Case:** Leadership sees big picture

### 4.3 Visual Indicators

**Progress Colors:**
- 🟢 Green: On track (75%+ progress)
- 🟡 Yellow: At risk (40-74% progress)
- 🔴 Red: Off track (<40% progress)
- ⚪ Gray: Not started
- ✅ Blue: Completed

**Team Colors** (consistent across platform):
- 🔵 Sales: Blue (#3B82F6)
- 🟢 Marketing: Green (#10B981)
- 🟣 Engineering: Purple (#8B5CF6)
- 🟠 Product: Orange (#F59E0B)
- 🔴 Operations: Red (#EF4444)
- ⚫ Unassigned: Gray (#6B7280)

---

## 5. Mobile Experience

### 5.1 Touch Gestures

- **Pinch to zoom:** Two-finger pinch in/out
- **Pan:** Two-finger drag
- **Tap node:** Select
- **Double-tap node:** Expand/collapse
- **Long-press node:** Context menu

### 5.2 Mobile Layout Adjustments

- Simplified node design (less text)
- Larger tap targets (minimum 44x44px)
- Bottom sheet for filters (instead of sidebar)
- Floating action button for "Fit to screen"
- Swipe gesture to open/close filter panel

### 5.3 Performance Optimizations

- Virtual rendering (only visible nodes in viewport)
- Lazy loading for collapsed branches
- Debounced search (300ms)
- Throttled pan/zoom events
- Image/avatar lazy loading

---

## 6. Mini-Map Component

**Location:** Bottom-right corner (toggleable)

```
┌─────────────────────┐
│ ┌─────────────────┐ │
│ │    ╔═══╗        │ │ ← Full hierarchy preview
│ │    ║░░░║        │ │
│ │   ╔╩═╦═╩╗       │ │
│ │   ║  ║  ║       │ │
│ │   ╚══╩══╝       │ │
│ │                 │ │
│ │   [View Rect]   │ │ ← Current viewport
│ └─────────────────┘ │
│ [−][□][×]          │ ← Minimize/Maximize/Close
└─────────────────────┘
```

**Behavior:**
- Shows simplified view of entire hierarchy
- Viewport rectangle shows current visible area
- Click mini-map to jump to location
- Auto-hides when zoomed out to 50% or less

---

## 7. Detail Panel Integration

### 7.1 Side Panel (Right Slide-out)

When user clicks node title, slide-out panel appears from right:

```
┌────────────────────────────────────┐
│ ← Back to Map                    × │
├────────────────────────────────────┤
│ 🎯 Increase Revenue                │
│                                    │
│ 💼 Team: Sales                     │
│ 👤 Owner: Sarah Chen               │
│ 📅 Target: Q2 2025                 │
│                                    │
│ ┌─ Details ─┬─ Key Results ─┬─ Activity ─┐
│ │                                        │
│ │ Description:                           │
│ │ Drive new revenue through...           │
│ │                                        │
│ │ Progress: 75%                          │
│ │ █████████░░░░░░                       │
│ │                                        │
│ │ KPIs:                                  │
│ │ • Target: $10M                         │
│ │ • Current: $7.5M                       │
│ │                                        │
│ └────────────────────────────────────────┘
│                                    │
│ [Edit] [Add Key Result]            │
└────────────────────────────────────┘
```

**Tabs:**
1. **Details:** Description, metrics, status
2. **Key Results:** List of child KRs
3. **Activity:** Recent updates, comments

### 7.2 Breadcrumb Navigation

Show path from Mission to current node:

```
Mission > Sales Team Objective > Achieve $10M > Launch Platform Task
                                                 ^^^^^^^^^^^^^^^^^
                                                 Currently viewing
```

Click any breadcrumb to navigate/highlight that node in map.

---

## 8. Toolbar Controls

**Location:** Top of mind map canvas

```
┌──────────────────────────────────────────────────────────────┐
│ [Tree Layout ▼] [Expand All] [Collapse All] [Fit Screen]    │
│                                                              │
│ [🔍 Search...] [👥 My Work] [📊 By Team] [☰ Filters]       │
│                                                [−] [□] [+]  │ ← Zoom
└──────────────────────────────────────────────────────────────┘
```

**Controls:**
1. **Layout selector:** Tree / Radial dropdown
2. **Expand All:** Expands entire hierarchy
3. **Collapse All:** Collapses to objectives only
4. **Fit Screen:** Auto-zoom to show all nodes
5. **Search:** Real-time search with highlighting
6. **My Work:** Toggle personal focus mode
7. **By Team:** Toggle team grouping
8. **Filters:** Open filter sidebar
9. **Zoom:** -10% / Reset / +10%

---

## 9. Page Integration - Objectives View

### 9.1 URL Structure

- `/strategy/objectives` - Current table view (default)
- `/strategy/objectives?view=mindmap` - Mind map view
- `/strategy/objectives?view=mindmap&layout=radial` - Radial layout
- `/strategy/objectives?view=mindmap&focus=mywork` - My Work mode
- `/strategy/objectives?view=mindmap&team=3` - Filtered by team ID

### 9.2 State Persistence

**LocalStorage keys:**
```javascript
{
  "strategyViewMode": "mindmap",        // or "table"
  "mindmapLayout": "tree",               // or "radial"
  "mindmapZoom": 1.0,                    // 0.1 to 3.0
  "mindmapPosition": { x: 0, y: 0 },     // canvas offset
  "mindmapExpandedNodes": [1, 5, 12],    // array of node IDs
  "mindmapFilters": {
    "teams": [1, 2],
    "status": ["On Track", "At Risk"],
    "owner": null
  }
}
```

### 9.3 Component Structure

```
client/src/pages/strategy/Objectives.tsx
  └─ ViewSwitcher component
      ├─ TableView (existing)
      └─ MindMapView (new)
          ├─ MindMapToolbar
          ├─ FilterSidebar
          ├─ ReactFlowCanvas
          │   ├─ MissionNode
          │   ├─ ObjectiveNode
          │   ├─ KeyResultNode
          │   └─ TaskNode
          ├─ MiniMap
          └─ DetailPanel
```

---

## 10. Platform Feature Entry

### 10.1 Feature Record (platform_features table)

```sql
INSERT INTO platform_features (
  organization_id,
  name,
  visibility_status,
  is_enabled,
  scope_definition,
  icon,
  route,
  overview,
  user_documentation
) VALUES (
  NULL,  -- Global feature
  'Strategy Mind Map Visualization',
  'live',
  true,
  'Interactive visualization of organizational strategy hierarchy',
  'GitBranch',  -- Lucide icon
  '/strategy/objectives?view=mindmap',
  'Transform your strategy from tables to an interactive mind map. See how Mission cascades through Objectives, Key Results, and Tasks. Filter by team, focus on your work, and navigate complex hierarchies with ease.',
  '<h2>Getting Started</h2>
   <p>Navigate to Strategy > Objectives and click the "Mind Map" toggle...</p>
   <h3>View Modes</h3>
   <ul>
     <li><strong>Tree Layout:</strong> Traditional top-down org chart style</li>
     <li><strong>Radial Layout:</strong> Center-out circular view with Mission at center</li>
   </ul>
   <h3>Focus Modes</h3>
   <p>Use "My Work" to highlight only items assigned to you, dimming others for clarity.</p>
   ...'
);
```

---

## 11. User Documentation Article

### 11.1 Knowledge Base Entry

**Title:** Understanding the Strategy Mind Map

**Sections:**
1. **Introduction**
   - What is the mind map?
   - When to use table vs. mind map view

2. **Navigation Basics**
   - Zoom and pan controls
   - Expanding/collapsing nodes
   - Using the mini-map

3. **Layout Options**
   - Tree layout explanation
   - Radial layout explanation
   - Switching between layouts

4. **Filtering & Focus**
   - Filtering by team
   - Filtering by status
   - "My Work" focus mode
   - Combining filters

5. **Understanding Nodes**
   - Node color meanings
   - Progress indicators
   - Team associations
   - Owner assignments

6. **Interacting with Strategy**
   - Clicking nodes to view details
   - Editing from the mind map
   - Adding new objectives/KRs
   - Reassigning ownership

7. **Mobile Usage**
   - Touch gestures
   - Mobile-specific features
   - Performance tips

8. **Best Practices**
   - Organizing by teams
   - Keeping hierarchy manageable
   - Regular updates for accuracy

---

## 12. Implementation Phases

### Phase 1: Foundation (Tasks 1-8)
- Add `teamId` to objectives (DB + schema + API)
- Update UI to allow team selection
- Implement team inheritance logic
- Test team assignment flow

**Deliverable:** Users can assign teams to objectives and see team badges in table view

### Phase 2: Basic Mind Map (Tasks 9-14)
- Install React Flow
- Create custom node components
- Implement tree layout
- Add view switcher to Objectives page
- Basic zoom/pan controls

**Deliverable:** Users can toggle to mind map and see basic hierarchy

### Phase 3: Interactivity (Tasks 15-18)
- Add filter functionality
- Implement focus modes
- Node click → detail panel
- Mini-map component

**Deliverable:** Fully interactive mind map with filtering

### Phase 4: Polish & Mobile (Tasks 19-20)
- Radial layout option
- Mobile gestures and responsive design
- Performance optimizations
- State persistence

**Deliverable:** Production-ready mind map on all devices

### Phase 5: Documentation (Tasks 21-23)
- Platform feature entry
- User documentation
- End-to-end testing

**Deliverable:** Documented, testable feature ready for users

---

## 13. Success Metrics

**User Engagement:**
- % of users who switch to mind map view
- Average time spent in mind map vs. table
- Click-through rate on nodes

**Utility:**
- Number of filters applied per session
- "My Work" mode usage frequency
- Mobile vs. desktop usage ratio

**Performance:**
- Time to render 100 nodes: < 500ms
- Zoom/pan FPS: 60fps
- Mobile load time: < 2s

---

## 14. Future Enhancements (Not in MVP)

1. **Export Options**
   - PNG image export
   - PDF export with org chart styling
   - Share public read-only link

2. **Advanced Layouts**
   - Force-directed graph
   - Timeline view (Gantt-style)
   - Matrix view (team × objective grid)

3. **Collaboration Features**
   - Real-time cursors (see who's viewing what)
   - Comments on nodes
   - @mention notifications

4. **AI-Powered Insights**
   - Auto-suggest connections
   - Detect orphaned objectives
   - Recommend rebalancing workload

5. **Presentation Mode**
   - Slide-by-slide navigation
   - Presenter notes
   - Auto-advance option

---

## Appendix A: Component File Structure

```
client/src/
├─ components/
│  └─ strategy-mindmap/
│     ├─ MindMapView.tsx              (Main container)
│     ├─ MindMapToolbar.tsx           (Controls)
│     ├─ FilterSidebar.tsx            (Filter panel)
│     ├─ MindMapCanvas.tsx            (React Flow wrapper)
│     ├─ nodes/
│     │  ├─ MissionNode.tsx           (Custom node)
│     │  ├─ ObjectiveNode.tsx         (Custom node)
│     │  ├─ KeyResultNode.tsx         (Custom node)
│     │  └─ TaskNode.tsx              (Custom node)
│     ├─ layouts/
│     │  ├─ treeLayout.ts             (Dagre algorithm)
│     │  └─ radialLayout.ts           (Custom radial)
│     ├─ MindMapMiniMap.tsx           (Mini-map)
│     └─ types.ts                     (TypeScript interfaces)
└─ pages/
   └─ strategy/
      └─ Objectives.tsx               (Updated with switcher)
```

---

## Appendix B: API Endpoints Required

**Existing (no changes):**
- `GET /api/strategy/objectives` - List objectives
- `POST /api/strategy/objectives` - Create objective
- `PATCH /api/strategy/objectives/:id` - Update objective
- `GET /api/strategy/key-results` - List key results
- `GET /api/teams` - List teams

**New/Modified:**
- `GET /api/strategy/hierarchy` - Full hierarchy for mind map
  - Returns: Mission + all objectives + all KRs + all tasks in single response
  - Includes team data, owner data, progress calculations
  - Optimized query with joins

**Response format:**
```json
{
  "mission": {
    "id": 1,
    "mission": "Empower businesses...",
    "vision": "To be the leading...",
    "progress": 75
  },
  "objectives": [
    {
      "id": 1,
      "title": "Increase Revenue",
      "teamId": 2,
      "team": { "id": 2, "name": "Sales", "color": "#3B82F6" },
      "ownerId": 5,
      "owner": { "id": 5, "fullName": "Sarah Chen", "avatarUrl": "..." },
      "status": "On Track",
      "progress": 75,
      "targetValue": 10000000,
      "currentValue": 7500000,
      "keyResults": [
        {
          "id": 1,
          "title": "Achieve $10M in sales",
          "status": "On Track",
          "progress": 80,
          "tasks": [...]
        }
      ]
    }
  ]
}
```

---

## Appendix C: Color Palette

**Team Colors:**
```css
--team-sales: #3B82F6;       /* Blue */
--team-marketing: #10B981;   /* Green */
--team-engineering: #8B5CF6; /* Purple */
--team-product: #F59E0B;     /* Orange */
--team-operations: #EF4444;  /* Red */
--team-unassigned: #6B7280;  /* Gray */
```

**Status Colors:**
```css
--status-on-track: #10B981;   /* Green */
--status-at-risk: #F59E0B;    /* Yellow */
--status-off-track: #EF4444;  /* Red */
--status-not-started: #6B7280;/* Gray */
--status-completed: #3B82F6;  /* Blue */
```

**Node Styles:**
```css
.mindmap-node {
  background: white;
  border: 2px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 12px;
  min-width: 200px;
}

.mindmap-node.mission {
  min-width: 400px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.mindmap-node.selected {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.mindmap-node.dimmed {
  opacity: 0.3;
}
```

---

**End of Mockup**
