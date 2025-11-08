# Documentation Changes Required

## replit.md Changes

### Current Documentation (Lines to Modify)

The `replit.md` file currently has NO mention of the training/knowledge base system in the Key System Components section.

**Current Key System Components (lines 36-44):**
```markdown
### Key System Components
-   **Strategy Management System**: Centered around OKRs and Work Items...
-   **AI Assistant System**: Context-aware business operations agent...
-   **Workflow Templates (Human Checklists)**: Reusable structured processes...
-   **Chamber Record Workflow**: A pre-configured 6-step workflow...
-   **AI Agent Workflows (Automation)**: Autonomous AI-driven automation...
-   **Offline Sync System**: Manual synchronization using IndexedDB...
-   **AI Assistant Action Approval System**: Implements an action approval workflow...
-   **Field App PWA**: A dedicated offline-first Progressive Web App...
```

### Proposed Addition

**ADD after AI Assistant System:**

```markdown
-   **Training & Knowledge Base System**: Document-based training with work item integration. Admins create training documents at `/training` with rich content, categories, and metadata. Training assignments automatically create work items with a 3-step completion workflow (review material, acknowledge understanding, optional notes). Users complete training through the unified work items interface. Completion callbacks update assignment records with audit trail including IP address, timestamp, and acknowledgment status. Supports team-based assignments and progress tracking.
```

### Alternative (Shorter Version)

If you prefer brevity:

```markdown
-   **Training & Knowledge Base**: Knowledge base documents with work item integration. Training assignments create work items with completion workflows, audit trails, and team progress tracking.
```

---

## New Documentation File

**Create:** `docs/TRAINING_SYSTEM.md`

Full content provided in TRAINING_WORK_ITEMS_INTEGRATION_PLAN.md (lines in that file show complete markdown).

This new file will document:
- System overview
- Admin workflow
- User workflow
- Completion callback mechanism
- Database schema relationships
- Integration architecture

---

## Menu/Navigation Documentation

### Current Menu Structure (needs update)

The training system will use these routes:

**Admin Routes (Keep):**
- `/training` - Training document management

**User Routes (Remove):**
- `/training-personal` ❌ REMOVE
- `/training/document/:id` ❌ REMOVE

**User Routes (Use existing):**
- `/strategy/work-items` - Now includes training assignments

### Navigation Documentation Update

If you have navigation documentation (could be in replit.md or separate file), update to reflect:

```markdown
### Training Access Points

**Admins:**
- Create/edit documents: `/training`
- Assign training: Click "Assign" button on document cards
- View team progress: "Team Progress" tab on `/training` page

**Users:**
- View assigned training: `/strategy/work-items` (filter by "Training" type)
- Complete training: Open work item → Start workflow → Complete 3 steps
```

---

## API Documentation (if exists)

If you maintain API documentation, add:

### Training Endpoints

**Admin Endpoints:**
```
POST /api/knowledge-base/assignments
  - Creates document assignment
  - Auto-creates work item with training workflow
  - Returns: { assignment, workItem }

GET /api/knowledge-base/team-progress
  - Team training completion statistics
  - Returns: Array of { user, assigned, completed, rate }
```

**System Endpoints (Internal):**
```
POST /api/knowledge-base/assignments/complete-from-workflow
  - Webhook called by workflow completion callback
  - Updates assignment status to 'completed'
  - Logs IP address and acknowledgment
  - Body: { organizationId, workItemId, acknowledgedUnderstanding, completionNotes }
```

---

## README or Setup Documentation

If you have setup/onboarding docs, add:

### Training System Setup

**Initialize workflow template:**
```bash
npm run init-training-workflow
```

**Database migration:**
```bash
npm run db:push --force
```

**Verify setup:**
1. Check workflow template exists: Query `workflow_templates` table for ID `training-document-completion`
2. Assign test training document to yourself
3. Verify work item created in work items list
4. Complete workflow and verify assignment marked complete

---

## Feature Flag Documentation (if applicable)

If you use feature flags:

```markdown
### Training System
- Feature ID: `training_system`
- Status: `live`
- Routes: `/training` (admin), integrated with `/strategy/work-items` (users)
- Dependencies: Work items system, workflow templates
```

---

## Change Log Entry

For your change log or release notes:

```markdown
### [Version X.X.X] - [Date]

#### Changed
- **Training System Integration**: Training assignments now create work items instead of using separate portal
- Removed `/training-personal` and `/training/document/:id` pages
- Users complete training via unified work items interface
- Added 3-step training workflow: review material, acknowledge understanding, optional notes

#### Added
- Training workflow template: `training-document-completion`
- Completion callback webhook for automatic assignment updates
- Training filter in work items list
- Embedded document viewer in work item panel
- Audit trail with IP address and acknowledgment logging

#### Database Changes
- Added `work_item_id` to `document_assignments` table
- Added `metadata` JSONB column to `document_assignments`
- Added `acknowledged_understanding` boolean to `document_assignments`

#### Deprecated
- Standalone training pages (removed)
- Direct training completion API (replaced by workflow callbacks)
```

---

## Summary of Documentation Updates

**Files to Update:**
1. ✅ `replit.md` - Add training system to Key System Components
2. ✅ Create `docs/TRAINING_SYSTEM.md` - Complete training documentation
3. ✅ Navigation docs (if separate) - Update menu structure
4. ✅ API docs (if exists) - Add training endpoints
5. ✅ Setup docs (if exists) - Add init steps
6. ✅ Change log - Document changes

**Key Points to Document:**
- Training creates work items (not standalone)
- 3-step completion workflow
- Completion callbacks mechanism
- Audit trail features
- Admin vs user workflows
- Database schema relationships

**Tone/Style:**
- Simple, everyday language (per user preferences)
- Focus on user workflow, not technical implementation
- Clear separation of admin vs user documentation
- Include setup/verification steps
