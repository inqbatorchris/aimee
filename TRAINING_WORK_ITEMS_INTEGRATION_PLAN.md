# Training System + Work Items Integration Plan
## Complete Implementation Scope (NO CHANGES YET - APPROVAL REQUIRED)

---

## 🎯 **Integration Strategy**

Instead of building standalone training pages, integrate training assignments directly into the **existing work items system**. When a training document is assigned:

1. Create a work item with a training workflow template
2. User sees it in their work items list
3. User completes training through the workflow steps
4. Completion callbacks update the document assignment record
5. Single location for all assigned work (simplicity)

---

## 📊 **Current State Analysis**

### What Already Exists

**Work Items System:**
- ✅ Work items table with workflow template support
- ✅ Workflow template system with completion callbacks
- ✅ Work item workflow execution tracking
- ✅ Work item panel for viewing/completing work
- ✅ Routes: `/api/work-items/` (GET, POST, PUT, PATCH, DELETE)

**Training System:**
- ✅ Knowledge documents (rich content, categories, metadata)
- ✅ Document assignments table (users, teams, status, due dates)
- ✅ Assignment routes: `/api/knowledge-base/assignments`
- ✅ Admin UI for creating/assigning training
- ❌ User-facing completion flow (broken - needs work items integration)

**Workflow Template Features:**
- Completion callbacks with field mappings
- Webhook support for external integrations
- Step types: checklist, form, photo, signature, notes, kb_link, geolocation
- Execution tracking with evidence collection

---

## 🔧 **Detailed Implementation Plan**

### **PHASE 1: Create Training Workflow Template**

#### 1.1 Define Training Workflow Template Structure

**File:** `server/scripts/init-training-workflow-template.ts` (NEW)

```typescript
// Training workflow template with 3 steps:
const trainingWorkflowTemplate = {
  id: 'training-document-completion',
  organizationId, 
  name: 'Training Document Completion',
  description: 'Standard workflow for completing assigned training documents',
  category: 'training',
  applicableTypes: ['training'], // New work item type
  isSystemTemplate: true,
  isActive: true,
  estimatedMinutes: 30,
  
  // Steps for training completion
  steps: [
    {
      id: 'kb_link',
      type: 'kb_link',
      label: 'Review Training Material',
      description: 'Read the assigned training document carefully',
      required: true,
      order: 0,
      config: {
        documentId: null, // Will be set dynamically via workflowMetadata
        openInline: true  // Show document content in workflow panel
      }
    },
    {
      id: 'acknowledgment',
      type: 'checkbox',
      label: 'Acknowledge Understanding',
      description: 'I confirm that I have read, understood, and will comply with this training content',
      required: true,
      order: 1
    },
    {
      id: 'notes',
      type: 'notes',
      label: 'Training Notes (Optional)',
      description: 'Any questions, feedback, or comments about the training',
      required: false,
      order: 2
    }
  ],
  
  // Completion callback to update documentAssignment
  completionCallbacks: [
    {
      integrationName: 'training',
      action: 'mark_training_complete',
      webhookUrl: '/api/knowledge-base/assignments/complete-from-workflow',
      webhookMethod: 'POST',
      webhookHeaders: {
        'X-Internal-Webhook': 'true'
      },
      fieldMappings: [
        {
          sourceStepId: 'acknowledgment',
          sourceField: 'checked',
          targetField: 'acknowledgedUnderstanding'
        },
        {
          sourceStepId: 'notes',
          sourceField: 'notes',
          targetField: 'completionNotes'
        }
      ]
    }
  ]
};
```

**Database Changes:**
- ✅ No schema changes needed - uses existing `workflowTemplates` table
- Insert new template record

**Script to run:**
```bash
npm run init-training-workflow
```

---

### **PHASE 2: Modify Assignment Flow**

#### 2.1 Update Document Assignment Creation

**File:** `server/routes/knowledge-base.ts` (MODIFY)

**Current:** POST `/api/knowledge-base/assignments` creates only `documentAssignments` record

**New Behavior:** Also create a work item with training workflow

```typescript
// MODIFY: POST /assignments endpoint (around line 501-565)

async (req, res) => {
  const { userId, teamId, documentId, dueDate, priority } = req.body;
  
  // Get document details
  const document = await coreStorage.getKnowledgeDocument(documentId);
  
  if (teamId) {
    // Assign to all team members
    const members = await db.select...
    
    for (const member of members) {
      // 1. Create documentAssignment (existing)
      const assignment = await coreStorage.createDocumentAssignment({...});
      
      // 2. NEW: Create work item with training workflow
      const workItem = await db.insert(workItems).values({
        organizationId,
        title: `Training: ${document.title}`,
        description: `Complete training document: ${document.description || ''}`,
        assignedTo: member.userId,
        dueDate: dueDate || null,
        workflowTemplateId: 'training-document-completion',
        workItemType: 'training',
        workflowSource: 'system',
        workflowMetadata: {
          documentId: documentId,
          assignmentId: assignment.id,
          priority: priority || 'medium',
          estimatedReadingTime: document.estimatedReadingTime,
          documentCategory: document.category
        },
        status: 'Ready',
        createdBy: req.user.id
      }).returning();
      
      // 3. Link work item back to assignment
      await coreStorage.updateDocumentAssignment(assignment.id, {
        workItemId: workItem[0].id  // NEW FIELD
      });
    }
  } else {
    // Single user assignment (same pattern)
  }
}
```

**Database Changes:**
```typescript
// ADD to documentAssignments table in shared/schema.ts:

export const documentAssignments = pgTable("document_assignments", {
  // ... existing fields ...
  
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "set null" }), // NEW
  
  // ... existing fields ...
});

// ADD index:
index("idx_doc_assignments_work_item").on(table.workItemId)
```

**Migration:**
```bash
npm run db:push --force  # Add workItemId column
```

---

### **PHASE 3: Completion Callback Webhook**

#### 3.1 Create Webhook Endpoint

**File:** `server/routes/knowledge-base.ts` (ADD NEW ROUTE)

```typescript
// ADD: New webhook route for completion callbacks

router.post('/assignments/complete-from-workflow', authenticateToken, async (req, res) => {
  try {
    const {
      organizationId,
      workItemId,
      acknowledgedUnderstanding,
      completionNotes
    } = req.body;
    
    // Find assignment by workItemId
    const [assignment] = await db
      .select()
      .from(documentAssignments)
      .where(
        and(
          eq(documentAssignments.organizationId, organizationId),
          eq(documentAssignments.workItemId, workItemId)
        )
      )
      .limit(1);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Update assignment to completed
    await coreStorage.updateDocumentAssignment(assignment.id, {
      status: 'completed',
      completedAt: new Date(),
      completionNotes: completionNotes || null,
      acknowledgedUnderstanding: acknowledgedUnderstanding || false,
      // Store IP address for audit
      metadata: {
        ...assignment.metadata,
        completedViaWorkflow: true,
        completedIp: req.ip,
        completedTimestamp: new Date().toISOString()
      }
    });
    
    // Log activity
    await db.insert(knowledgeDocumentActivity).values({
      documentId: assignment.documentId,
      userId: assignment.userId,
      action: 'training_completed',
      details: {
        assignmentId: assignment.id,
        workItemId: workItemId,
        completedVia: 'workflow',
        acknowledgedUnderstanding
      }
    });
    
    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Error completing training via workflow:', error);
    res.status(500).json({ error: 'Failed to complete training assignment' });
  }
});
```

**Database Changes:**
```typescript
// ADD metadata column to documentAssignments (if not exists)
export const documentAssignments = pgTable("document_assignments", {
  // ... existing fields ...
  
  metadata: jsonb("metadata").$type<{
    completedViaWorkflow?: boolean;
    completedIp?: string;
    completedTimestamp?: string;
    [key: string]: any;
  }>(),
  
  acknowledgedUnderstanding: boolean("acknowledged_understanding").default(false), // NEW
  
  // ... existing fields ...
});
```

**Migration:**
```bash
npm run db:push --force  # Add metadata and acknowledgedUnderstanding columns
```

---

### **PHASE 4: Update Storage Layer**

#### 4.1 Add Storage Helper Methods

**File:** `server/core-storage.ts` (ADD METHODS)

```typescript
// ADD to IStorage interface and CoreStorage class:

async getTrainingWorkItems(userId: number, organizationId: number) {
  return await db
    .select({
      workItem: workItems,
      document: knowledgeDocuments,
      assignment: documentAssignments
    })
    .from(workItems)
    .leftJoin(
      documentAssignments,
      eq(workItems.id, documentAssignments.workItemId)
    )
    .leftJoin(
      knowledgeDocuments,
      eq(documentAssignments.documentId, knowledgeDocuments.id)
    )
    .where(
      and(
        eq(workItems.organizationId, organizationId),
        eq(workItems.assignedTo, userId),
        eq(workItems.workItemType, 'training'),
        inArray(workItems.status, ['Ready', 'In Progress', 'Planning'])
      )
    )
    .orderBy(workItems.dueDate, workItems.updatedAt);
}

async getCompletedTrainingWorkItems(userId: number, organizationId: number) {
  return await db
    .select({
      workItem: workItems,
      document: knowledgeDocuments,
      assignment: documentAssignments
    })
    .from(workItems)
    .leftJoin(
      documentAssignments,
      eq(workItems.id, documentAssignments.workItemId)
    )
    .leftJoin(
      knowledgeDocuments,
      eq(documentAssignments.documentId, knowledgeDocuments.id)
    )
    .where(
      and(
        eq(workItems.organizationId, organizationId),
        eq(workItems.assignedTo, userId),
        eq(workItems.workItemType, 'training'),
        eq(workItems.status, 'Completed')
      )
    )
    .orderBy(workItems.updatedAt.desc());
}
```

---

### **PHASE 5: Frontend Integration**

#### 5.1 Remove Standalone Training Pages

**Files to DELETE/DEPRECATE:**
- `client/src/pages/TrainingPersonal.tsx` ❌ DELETE
- `client/src/pages/TrainingDocument.tsx` ❌ DELETE  
- `client/src/components/training/SimpleCompletionDialog.tsx` ❌ DELETE
- Routes in `App.tsx`:
  - `/training-personal` ❌ REMOVE
  - `/training/document/:documentId` ❌ REMOVE

#### 5.2 Keep Admin Training Management

**Files to KEEP:**
- `client/src/pages/Training.tsx` ✅ KEEP (admin document management)
- `client/src/components/training/AssignTrainingDialog.tsx` ✅ KEEP (modified)
- `client/src/components/document-editor/` ✅ KEEP (document editing)

#### 5.3 Modify Assignment Dialog

**File:** `client/src/components/training/AssignTrainingDialog.tsx` (MODIFY)

**Change:** Update success message to mention work items

```typescript
onSuccess: () => {
  toast({
    title: "Training Assigned Successfully",
    description: `Training has been added to work items for ${selectedUsers.length + selectedTeams.length} user(s). They can complete it from their Work Items list.`
  });
  // ... rest stays same
}
```

#### 5.4 Add Training Filter to Work Items

**File:** `client/src/pages/strategy/WorkItems.tsx` (MODIFY)

**Add:** Filter option for training work items

```typescript
// ADD to filters:
<Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Types</SelectItem>
    <SelectItem value="training">📚 Training</SelectItem>
    <SelectItem value="work_item">📋 Tasks</SelectItem>
    {/* ... other types */}
  </SelectContent>
</Select>
```

#### 5.5 Enhance Work Item Panel for Training

**File:** `client/src/components/work-items/WorkItemPanel.tsx` (MODIFY)

**Add:** Special rendering for training work items with embedded document

```typescript
// ADD: Check if work item is training type
const isTrainingWorkItem = workItem.workItemType === 'training';
const documentId = workItem.workflowMetadata?.documentId;

// ADD: Fetch document if training
const { data: trainingDocument } = useQuery({
  queryKey: [`/api/knowledge-base/documents/${documentId}`],
  enabled: isTrainingWorkItem && !!documentId
});

// ADD: Show document content in workflow panel
{isTrainingWorkItem && trainingDocument && (
  <Card>
    <CardHeader>
      <CardTitle>Training Material</CardTitle>
    </CardHeader>
    <CardContent>
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: trainingDocument.content }}
      />
    </CardContent>
  </Card>
)}
```

---

### **PHASE 6: Workflow Template Display**

#### 6.1 Update KB Link Step Renderer

**File:** `client/src/components/workflow/WorkflowProgressPanel.tsx` (MODIFY)

**Add:** Support for kb_link step type

```typescript
// ADD: KB Link step renderer
case 'kb_link': {
  const documentId = step.config?.documentId || execution.workflowMetadata?.documentId;
  
  return (
    <div>
      {documentId && (
        <DocumentViewer documentId={documentId} inline={true} />
      )}
      <Checkbox
        checked={stepData?.viewed || false}
        onCheckedChange={(checked) => {
          updateStepData(step.id, { viewed: checked });
        }}
      >
        I have reviewed this document
      </Checkbox>
    </div>
  );
}
```

---

### **PHASE 7: Menu & Navigation Updates**

#### 7.1 Update Menu Structure

**Changes:**

**REMOVE:**
- "My Training" menu item (was `/training-personal`)
- "Training Documents" submenu

**KEEP:**
- "Training" (admin) at `/training` for document management

**UPDATE:**
- "Work Items" menu item now handles training assignments
- Add badge count for pending training on Work Items menu

**File:** Navigation menu configuration (depends on your menu system)

```typescript
// Update work items menu item to show training count
{
  title: 'Work Items',
  path: '/strategy/work-items',
  badge: pendingWorkItemsCount + pendingTrainingCount,
  icon: 'CheckSquare'
}
```

---

### **PHASE 8: Documentation Updates**

#### 8.1 Update System Documentation

**File:** `replit.md` (MODIFY)

**Current Section:**
```markdown
- **Training & Knowledge Base**: Knowledge base documents with training assignment
```

**New Section:**
```markdown
- **Training & Knowledge Base**: Knowledge base documents with work item integration
  - Training documents created and managed at `/training` (admin)
  - Training assignments automatically create work items
  - Users complete training through work items interface
  - Completion updates document assignment status
  - Audit trail with acknowledgment and IP logging
```

#### 8.2 Update Feature Documentation

**File:** Create `docs/TRAINING_SYSTEM.md` (NEW)

```markdown
# Training System

## Overview
Training documents are assigned through the work items system for centralized task management.

## How It Works

### Admin Workflow
1. Create training document at `/training`
2. Assign to users/teams via "Assign Training" button
3. System creates work item with training workflow
4. Track completion in Team Progress tab

### User Workflow
1. View assigned training in Work Items (`/strategy/work-items`)
2. Filter by "Training" type to see all training assignments
3. Click work item to open workflow panel
4. Complete 3-step workflow:
   - Step 1: Review training material (embedded document)
   - Step 2: Acknowledge understanding (checkbox)
   - Step 3: Optional notes/feedback
5. Submit workflow to mark complete

### Completion Callback
- Workflow completion triggers webhook
- Updates `documentAssignments.status` to 'completed'
- Logs IP address and timestamp for audit
- Records acknowledgment flag
- Creates activity log entry

## Database Schema

### Work Item Fields
- `workItemType`: 'training'
- `workflowTemplateId`: 'training-document-completion'
- `workflowMetadata.documentId`: Links to knowledge document
- `workflowMetadata.assignmentId`: Links to document assignment

### Document Assignment Fields
- `workItemId`: Links to work item
- `status`: 'assigned' | 'in_progress' | 'completed'
- `acknowledgedUnderstanding`: Boolean flag
- `completionNotes`: User feedback
- `metadata.completedIp`: IP address for audit
```

---

## 📁 **File Changes Summary**

### NEW Files (Create)
1. `server/scripts/init-training-workflow-template.ts` - Training workflow template seeder
2. `docs/TRAINING_SYSTEM.md` - Training system documentation

### MODIFIED Files
1. `shared/schema.ts`:
   - Add `workItemId` to `documentAssignments`
   - Add `metadata` to `documentAssignments`
   - Add `acknowledgedUnderstanding` to `documentAssignments`
   
2. `server/routes/knowledge-base.ts`:
   - Modify POST `/assignments` to create work items
   - Add POST `/assignments/complete-from-workflow` webhook
   
3. `server/core-storage.ts`:
   - Add `getTrainingWorkItems()`
   - Add `getCompletedTrainingWorkItems()`
   
4. `client/src/components/training/AssignTrainingDialog.tsx`:
   - Update success message
   
5. `client/src/pages/strategy/WorkItems.tsx`:
   - Add training type filter
   
6. `client/src/components/work-items/WorkItemPanel.tsx`:
   - Add training document viewer
   
7. `client/src/components/workflow/WorkflowProgressPanel.tsx`:
   - Add kb_link step renderer
   
8. `client/src/App.tsx`:
   - Remove `/training-personal` route
   - Remove `/training/document/:documentId` route
   
9. `replit.md`:
   - Update training system description

### DELETED Files
1. `client/src/pages/TrainingPersonal.tsx`
2. `client/src/pages/TrainingDocument.tsx`
3. `client/src/components/training/SimpleCompletionDialog.tsx`

---

## 🗄️ **Database Migrations**

### Migration 1: Add Work Item Link to Assignments
```sql
ALTER TABLE document_assignments 
ADD COLUMN work_item_id INTEGER REFERENCES work_items(id) ON DELETE SET NULL;

CREATE INDEX idx_doc_assignments_work_item ON document_assignments(work_item_id);
```

### Migration 2: Add Completion Metadata
```sql
ALTER TABLE document_assignments 
ADD COLUMN metadata JSONB DEFAULT '{}';

ALTER TABLE document_assignments 
ADD COLUMN acknowledged_understanding BOOLEAN DEFAULT FALSE;
```

### Migration 3: Insert Training Workflow Template
```sql
INSERT INTO workflow_templates (id, organization_id, name, description, ...)
VALUES ('training-document-completion', 1, 'Training Document Completion', ...);
```

**Run migrations:**
```bash
npm run db:push --force
npm run init-training-workflow
```

---

## 🧪 **Testing Plan**

### Test Case 1: Assign Training to User
1. Login as admin
2. Navigate to `/training`
3. Click "Assign" on a training document
4. Select user and due date
5. Submit
6. **Expected:** Work item created with training workflow
7. **Verify:** Check `work_items` table for new record
8. **Verify:** Check `document_assignments.work_item_id` is set

### Test Case 2: Complete Training as User
1. Login as assigned user
2. Navigate to `/strategy/work-items`
3. Filter by "Training" type
4. Open training work item
5. Start workflow
6. Step 1: View document
7. Step 2: Check acknowledgment box
8. Step 3: Add optional notes
9. Submit workflow
10. **Expected:** Work item status = "Completed"
11. **Verify:** `document_assignments.status` = 'completed'
12. **Verify:** `document_assignments.completed_at` is set
13. **Verify:** Activity log created

### Test Case 3: Team Assignment
1. Assign training to team (5 members)
2. **Expected:** 5 work items created (1 per member)
3. **Expected:** 5 document assignments created
4. Each member completes independently
5. **Verify:** Admin can see completion status in Team Progress

### Test Case 4: Completion Callback
1. Complete training workflow
2. **Expected:** Webhook called: POST `/api/knowledge-base/assignments/complete-from-workflow`
3. **Verify:** Request body contains:
   - `organizationId`
   - `workItemId`
   - `acknowledgedUnderstanding`
   - `completionNotes`
4. **Verify:** Assignment updated correctly
5. **Verify:** IP address logged in metadata

---

## 📋 **Implementation Checklist**

- [ ] **Phase 1:** Create training workflow template
  - [ ] Create `init-training-workflow-template.ts`
  - [ ] Test template insertion
  
- [ ] **Phase 2:** Database schema updates
  - [ ] Add `workItemId` to `documentAssignments`
  - [ ] Add `metadata` to `documentAssignments`
  - [ ] Add `acknowledgedUnderstanding` to `documentAssignments`
  - [ ] Run `npm run db:push --force`
  
- [ ] **Phase 3:** Backend routes
  - [ ] Modify POST `/api/knowledge-base/assignments` to create work items
  - [ ] Add POST `/api/knowledge-base/assignments/complete-from-workflow`
  - [ ] Test assignment creation
  - [ ] Test completion webhook
  
- [ ] **Phase 4:** Storage layer
  - [ ] Add `getTrainingWorkItems()`
  - [ ] Add `getCompletedTrainingWorkItems()`
  
- [ ] **Phase 5:** Frontend cleanup
  - [ ] Delete `TrainingPersonal.tsx`
  - [ ] Delete `TrainingDocument.tsx`
  - [ ] Delete `SimpleCompletionDialog.tsx`
  - [ ] Remove routes from `App.tsx`
  
- [ ] **Phase 6:** Frontend enhancements
  - [ ] Modify `AssignTrainingDialog.tsx` message
  - [ ] Add training filter to `WorkItems.tsx`
  - [ ] Add document viewer to `WorkItemPanel.tsx`
  - [ ] Add kb_link renderer to `WorkflowProgressPanel.tsx`
  
- [ ] **Phase 7:** Documentation
  - [ ] Update `replit.md`
  - [ ] Create `docs/TRAINING_SYSTEM.md`
  
- [ ] **Phase 8:** Testing
  - [ ] Test assignment creation
  - [ ] Test workflow completion
  - [ ] Test team assignments
  - [ ] Test completion callbacks
  - [ ] Verify audit trail

---

## ⚠️ **Risks & Considerations**

### Risk 1: Existing Training Assignments
**Issue:** Existing `documentAssignments` without `workItemId`

**Mitigation:**
```sql
-- Migration script to create work items for existing assignments
-- Run AFTER adding workItemId column
```

### Risk 2: KB Link Step Type
**Issue:** kb_link is a new step type - needs renderer implementation

**Mitigation:** 
- Implement in `WorkflowProgressPanel.tsx`
- Fall back to text link if rendering fails

### Risk 3: Workflow Template ID Conflicts
**Issue:** 'training-document-completion' must be unique

**Mitigation:**
- Check for existing template before insert
- Use upsert pattern in seeder script

---

## 🚀 **Deployment Steps**

1. **Backup database**
2. **Deploy backend changes:**
   ```bash
   git pull
   npm install
   npm run db:push --force
   npm run init-training-workflow
   ```
3. **Deploy frontend changes:**
   ```bash
   npm run build  # if needed
   ```
4. **Restart workflows:**
   ```bash
   # Workflow will auto-restart
   ```
5. **Verify:**
   - Check workflow template exists
   - Test assignment creation
   - Test completion flow

---

## 📈 **Success Metrics**

- ✅ Users see all assigned work in ONE location (Work Items)
- ✅ Training completion rate tracked via work item status
- ✅ Audit trail maintained (IP, timestamp, acknowledgment)
- ✅ Simpler UX - no separate training portal needed
- ✅ Consistent workflow interface for all task types
- ✅ Admin can track training compliance via Team Progress

---

**END OF PLAN - AWAITING APPROVAL TO PROCEED**
