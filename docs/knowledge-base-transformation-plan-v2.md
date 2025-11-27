# Knowledge Base Enterprise Transformation - Implementation Plan v2

## Executive Summary

This plan transforms the existing Knowledge Base from an MVP document repository into an **Enterprise Document Intelligence Hub** with AI-native workflows. The implementation preserves all existing infrastructure (menu/pages tables, Drizzle ORM, React stack) while adding new capabilities for:

- **Training modules** with step-based playbooks, quizzes, and progress tracking
- **External file management** with Google Drive-style file manager
- **Customer document lifecycle** with expiration tracking and version control
- **AI-powered content generation** integrated directly into editors
- **Public report portal** for external stakeholders with data widgets and access control

**Core Principle:** User Journeys First, Technical Implementation Second

**Version History:**
- v1: Initial plan with 6 user journeys, migration strategy, UI mockups
- v2 (current): Extended with training modules, external file links, public reports, report viewer role, detailed UI specifications, AI editor integration

---

## Part 1: Current State Analysis

### 1.1 Existing Infrastructure Inventory

#### Database Tables (Preserved)
```
knowledge_documents          - Core document storage (24 records across orgs)
knowledge_categories         - Hierarchical categories (parentId support exists)
knowledge_document_versions  - Version history tracking
knowledge_document_attachments - Links to strategy items (OKR, tasks, work items)
knowledge_document_activity  - Activity logging
document_assignments         - Training assignments with progress tracking
```

#### Menu/Navigation System (Database-Driven)
```
pages                 - Page definitions with unified_status (draft/dev/live/archived)
menu_sections         - Navigation sections (Strategy & OKRs, Core, Integrations)
menu_items            - Individual navigation links (linked via pageId to pages)
```

Current Knowledge Base menu entry:
- Section: "Strategy & OKRs" (section_id: 7)
- Path: /strategy/knowledge-base
- Page Status: live
- Icon: 📚

#### Existing Document Types (shared/documentTypes.ts)
```typescript
internal_kb       - Internal Knowledge Base
website_page      - Website Page
customer_kb       - Customer Knowledge Base
marketing_email   - Marketing Email
marketing_letter  - Marketing Letter
attachment        - Attachment
```

#### AI Integration Points
- AI Chat Sessions with function calling
- OpenAI service with per-org API key management
- Existing KB functions: list_knowledge_documents, create_knowledge_document, update_knowledge_document
- Action approval workflow for write operations

### 1.2 Current Limitations

1. **Flat Document Structure** - No folder hierarchy, only category tags
2. **No Step-Based Learning** - Documents are single-page, no playbook workflow
3. **Limited Lifecycle Management** - No expiration, review cycles, or approval workflows
4. **Basic Search** - Text matching only, no semantic search
5. **No AI Content Generation** - Manual content creation only
6. **Single Document Type UX** - All docs treated the same in UI
7. **(NEW) No External File Management** - Files must be fully imported, no linking
8. **(NEW) No Public-Facing Reports** - All content is internal only
9. **(NEW) No Data-Driven Widgets** - Static content only, no embedded queries

---

## Part 2: User Journeys (Core Scope Definition)

### Journey 1: Training Manager Creates Training Module

**Persona:** Sarah, Operations Manager
**Goal:** Create step-by-step onboarding guide for new field technicians
**Document Type:** `training_module`

**Current Experience:**
1. Creates a single long document
2. Manually tracks who has read it
3. No way to verify comprehension
4. No structured learning path

**Target Experience:**
```
1. Opens Knowledge Hub → Training Center
2. Clicks "New Training Module" → Module wizard opens
3. Defines module metadata:
   - Title: "Fiber Splice Certification"
   - Audience: Field Technicians (via role selector)
   - Estimated time: 2 hours (auto-calculated from steps)
   - Prerequisites: Links to "Basic Tools Training" module
   - Certification: Enabled (generates PDF on completion)
4. Adds Steps via step-type selector:
   - Step 1: Video - "Safety Overview" (YouTube/Vimeo URL + transcript)
   - Step 2: Checklist - "Equipment Verification" (interactive checklist)
   - Step 3: Resource - "Procedure Guide" (rich text with images)
   - Step 4: Quiz - "Knowledge Check" (10 questions, 80% to pass)
   - Step 5: Practical Task - "Hands-On Assessment" (supervisor sign-off)
5. For each step, can:
   - Reorder via drag-and-drop
   - Mark as required/optional
   - Set time estimate
   - Attach files (External File Link Documents)
6. Uses AI assist to:
   - "Propose step breakdown for this topic" → AI suggests structure
   - "Draft quiz questions from content" → AI generates questions
7. Sets completion requirements:
   - All required steps completed
   - Quiz score ≥ 80%
   - Supervisor approval (if practical task exists)
8. Publishes module and assigns to team with due date
9. Monitors progress dashboard with per-user completion rates
```

**Required Features (v1):**
- Training module document type with ordered steps
- Step types: video, checklist, resource, quiz, practical_task
- Progress tracking per user per step
- Quiz system with questions, scoring, and attempts
- Drag-and-drop step reordering
- File attachments per step (External File Link Documents)
- AI assist for step proposal and quiz generation
- Assignment management with due dates
- Certificate generation on completion

---

### Journey 2: Field Technician Completes Training

**Persona:** Mike, New Field Technician
**Goal:** Complete required training before first job
**Document Type:** `training_module` (viewer mode)

**Current Experience:**
1. Receives email with document link
2. Opens document, skims content
3. No verification of completion
4. No clear progress indicator

**Target Experience:**
```
1. Logs in → Sees "My Training" widget on My Day page
2. Widget shows:
   - 2 Active trainings with progress bars
   - 1 Overdue training (red highlight)
   - 3 Completed trainings (last 30 days)
3. Clicks "Fiber Splice Certification" (Due: 3 days)
4. Training Viewer opens with:
   - Left sidebar: Step list with status icons (✓ completed, ● current, ○ pending)
   - Main area: Current step content
   - Top bar: Progress bar, time spent, estimated time remaining
5. Completes steps in order:
   - Step 1 (Video): Watches video, clicks "Mark as Watched"
     - System tracks watch time
   - Step 2 (Checklist): Checks off each item, clicks "Submit Checklist"
     - All items must be checked to proceed
   - Step 3 (Resource): Reads content, clicks "Mark as Read"
     - Can download attached files for reference
   - Step 4 (Quiz): Answers 10 questions, submits
     - Score: 85% (PASS - threshold 80%)
     - Can see correct answers after submission
     - If failed, can retry (max 3 attempts)
   - Step 5 (Practical Task): Clicks "Request Supervisor Sign-off"
     - Supervisor receives notification
     - Supervisor opens their view, observes work, signs off
6. All steps completed → "Training Complete" confirmation
7. Certificate auto-generated (PDF):
   - Employee name, training title, completion date, score
   - QR code linking to verification page
8. Training record added to employee profile
9. Can revisit training for reference (read-only, shows completion badge)
```

**Required Features (v1):**
- Training viewer with step-by-step navigation
- Step status tracking (not started, in progress, completed, failed)
- Video progress tracking
- Interactive checklists with completion validation
- Quiz taking interface with immediate feedback
- Supervisor sign-off workflow
- Certificate generation (PDF)
- Offline support for field completion (Field App integration)
- Mobile-responsive step viewer

---

### Journey 3: Customer Success Manager Manages Contracts

**Persona:** Lisa, Customer Success Manager
**Goal:** Store and manage customer contracts with lifecycle tracking
**Document Types:** `contract`, `policy`, `external_file_link`

**Current Experience:**
1. Documents scattered in shared drive
2. No expiration tracking
3. Manual version control
4. No audit trail

**Target Experience:**
```
1. Opens Knowledge Hub → Customer Vault
2. Navigates folder hierarchy (tree view on left):
   Enterprise Customers/
   ├── Acme Corp/
   │   ├── Contracts/
   │   │   ├── MSA-2024.pdf (expires in 30 days ⚠️)
   │   │   └── SLA-Addendum.pdf
   │   └── Policies/
   └── TechStart Inc/
3. Clicks "MSA-2024.pdf" → Document detail sheet opens
4. Sees document information:
   - File: MSA-2024.pdf (link to external storage)
   - Type: Contract
   - Lifecycle Status: Active (expires March 15) ⚠️
   - Version: 2.1 (3 previous versions available)
   - Related Entity: Linked to Acme Corp customer record
   - Activity: Last reviewed by John, Jan 10
5. Available actions:
   - [View/Download] - Opens in new tab
   - [Upload New Version] - Prompts for file + change summary
   - [Start Renewal] - Creates work item for contract renewal
   - [Edit Metadata] - Change dates, status, etc.
   - [View History] - Shows all versions and activity
6. Receives automated email: "Contract expires in 30 days"
7. Clicks "Start Renewal" → Creates work item with contract attached
8. Uploads new version:
   - Drag-drops new PDF
   - Adds change summary: "Updated pricing for Year 2"
   - Old version archived, audit trail preserved
   - Version number auto-increments to 2.2
```

**Required Features (v1):**
- Folder hierarchy with drag/drop organization
- External file link documents (pointer to storage, not embedded)
- Document lifecycle (draft → pending_review → active → expiring → expired → archived)
- Expiration tracking with automated email alerts
- Version history with change summaries
- Version comparison view (side-by-side if text-based)
- Customer/entity linking (to CRM or internal records)
- Full audit trail in activity log
- Work item creation from documents

---

### Journey 4: Marketing Lead Generates Content with AI

**Persona:** Alex, Marketing Coordinator
**Goal:** Create campaign content using AI assistance
**Document Types:** `marketing_email`, `website_page`, `internal_kb`

**Current Experience:**
1. Opens external AI tool
2. Manually provides context
3. Copies output to document
4. No brand consistency
5. No content library integration

**Target Experience:**
```
1. Opens Knowledge Hub → Content Studio
2. Creates new Marketing Email document
3. Opens editor with AI button visible in toolbar
4. Uses AI assist modes:
   
   Mode 1: "Draft this section"
   - Clicks AI button → selects "Draft this section"
   - Enters brief: "Announce Q2 fiber expansion to enterprise customers"
   - AI retrieves context:
     - Brand Voice Guidelines (from KB, auto-selected)
     - Q2 Expansion Technical Specs (from KB, suggested)
     - Previous successful campaigns (optional)
   - AI generates draft in editor
   - Alex reviews, makes minor edits
   
   Mode 2: "Improve / tighten this text"
   - Selects paragraph
   - Clicks AI → "Improve this"
   - AI rewrites while preserving meaning
   - Shows diff view: original vs. improved
   - Alex accepts or rejects changes
   
   Mode 3: "Summarize linked documents"
   - Document has 3 linked KB articles
   - Clicks AI → "Summarize linked docs"
   - AI produces executive summary
   
   Mode 4: "Update with latest requirements"
   - Working on Terms of Service document
   - Clicks AI → "Update with latest legal requirements"
   - AI accesses web to fetch current best practices
   - AI suggests specific clause updates
   - Changes flagged for legal review before publishing
   
5. Saves document → Version created automatically
6. All AI interactions logged in activity log
7. Submits for approval if required (legal content)
8. Publishes to Content Library
```

**Required Features (v1):**
- AI button in editor toolbar with mode selector
- Draft mode: Generate content from brief + context
- Improve mode: Rewrite selected text
- Summarize mode: Condense linked documents
- Update mode: Fetch external requirements (requires approval)
- Context document selection (auto-suggested from KB)
- Diff view for AI changes
- Activity logging for all AI interactions
- Approval workflow for sensitive content

---

### Journey 5: Support Agent Uses AI to Answer Customer Questions

**Persona:** Tom, Support Agent
**Goal:** Quickly find and share accurate information from KB

**Current Experience:**
1. Searches KB manually
2. May find outdated info
3. Copies/pastes to ticket
4. No confidence in accuracy

**Target Experience:**
```
1. Customer asks: "What's your fiber splicing warranty?"
2. Tom asks AI Assistant: "What is our fiber splicing warranty policy?"
3. AI searches KB semantically:
   - Finds "Fiber Services Warranty Policy" document
   - Extracts relevant section
   - Cites source document with link
4. AI responds:
   "Based on our Fiber Services Warranty Policy (last updated: Jan 2024),
   fiber splicing work is covered for 5 years from installation date.
   Coverage includes: [list]. Exclusions: [list].
   Source: /Customer Documents/Policies/Fiber-Warranty-Policy.pdf"
5. Tom clicks "Share with Customer" button
6. Response formatted and added to ticket
7. Usage tracked for KB analytics
```

**Required Features (v1):**
- Semantic search across all KB documents
- Source citation with document links
- Freshness indicators (last updated date)
- Share/export to tickets functionality
- Usage analytics

---

### Journey 6: Administrator Migrates Existing Content

**Persona:** Admin User
**Goal:** Transition from current KB to new system without data loss

**Current Experience:**
- 24 existing documents
- Existing assignments and progress
- Current menu structure

**Target Experience:**
```
1. Admin opens Knowledge Hub Settings
2. Clicks "Migration Assistant"
3. System analyzes existing content:
   - 16 documents in org 3
   - 8 documents in org 4
   - Categories: Platform Documentation, AI Tools, etc.
4. Migration wizard suggests:
   - Create folder: "Platform Documentation"
   - Move 8 docs to this folder
   - Convert 2 docs to Training Module format (detected step-like structure)
5. Admin reviews and approves each suggestion
6. Migration runs with:
   - Real-time progress bar
   - Rollback capability at any point
   - Full audit log
7. Old URLs redirect to new locations
8. No broken links or lost data
```

**Required Features (v1):**
- Migration analysis tool
- Category-to-folder converter
- Bulk operations with preview
- URL redirection
- Rollback capability
- Audit logging

---

### Journey 7: External Stakeholder Views Public Report (NEW)

**Persona:** David, Investor/Board Member
**Goal:** View company progress reports with real-time data

**Current Experience:**
1. Receives PDF report via email
2. Data is already stale when received
3. No interactivity
4. No drill-down capability

**Target Experience:**
```
1. Receives email: "Q4 Board Report is ready"
2. Clicks link: https://app.company.com/reports/q4-2024-board
3. Sees password entry screen:
   - "Enter password to view this report"
   - Enters password provided in email
4. Report opens with:
   - Header: Company logo, Report title, Date
   - Top navigation: [Executive Summary] [Financial] [Operations] [Outlook]
5. Navigates through sections:
   
   Section 1: Executive Summary
   - Rich text overview
   - Key metrics table (pulled live from DB)
   - Trend chart (revenue over 4 quarters)
   
   Section 2: Financial Performance
   - Revenue table with filter by quarter
   - Embedded snippet from "Q4 Financial Analysis" KB doc
   - Download button: "Export as CSV"
   
   Section 3: Operations
   - Work items completion chart
   - OKR progress table
   - Interactive filters (by team, by objective)
   
   Section 4: Outlook
   - Static rich text content
   
6. Clicks "Download Full Report as PDF"
7. All access logged for compliance
```

**Required Features (v1):**
- Public report document type with sections
- Public URL with slug (/reports/{slug})
- Password protection option
- Auth-only option (report_viewer role)
- Section-based navigation
- Rich text blocks
- Data table blocks (DB query-backed)
- Chart blocks (DB query-backed)
- Embedded document snippets
- CSV/PDF export
- Access logging

---

### Journey 8: Internal User Builds a Public Report (NEW)

**Persona:** CFO's Executive Assistant
**Goal:** Create a quarterly investor report with live data

**Target Experience:**
```
1. Opens Knowledge Hub → Reports
2. Clicks "New Public Report"
3. Report builder opens with:
   - Left panel: Report settings + Section list
   - Right panel: Block editor for selected section
4. Configures report settings:
   - Title: "Q4 2024 Board Report"
   - URL slug: q4-2024-board (auto-generated, editable)
   - Access: Password protected
   - Password: [auto-generated, can customize]
   - Allowed viewers: [none] (password is sufficient)
5. Adds sections:
   - [+ Add Section] → "Executive Summary"
   - [+ Add Section] → "Financial Performance"
   - [+ Add Section] → "Operations"
   - [+ Add Section] → "Outlook"
6. Edits "Financial Performance" section:
   - Adds Rich Text block: Intro paragraph
   - Adds Data Table block:
     - Data source: [Select table] → "Revenue Transactions"
     - Filters: Quarter = Q4 2024, Organization = Current
     - Columns: Date, Amount, Category
     - Enable CSV download: ✓
   - Adds Chart block:
     - Type: Line chart
     - Data source: Revenue by month
     - X-axis: Month, Y-axis: Revenue
   - Adds Document Snippet block:
     - Source: "Q4 Financial Analysis" KB doc
     - Section: "Summary" heading
7. Previews report as external viewer
8. Publishes report → URL becomes active
9. Shares link + password with stakeholders
```

**Required Features (v1):**
- Report builder UI with section management
- Block types: rich text, data table, chart, document snippet
- Visual query builder for data blocks
- Live preview mode
- Publish/unpublish toggle
- Share link generation
- Password management

---

## Part 3: Information Architecture & Data Model

### 3.1 Extended Document Type Hierarchy

```
Knowledge Hub/
├── Training Center/
│   ├── Training Modules/ (training_module documents)
│   │   ├── Onboarding/
│   │   ├── Certifications/
│   │   └── Procedures/
│   └── Quick References/ (quick_reference documents)
│
├── Customer Vault/
│   ├── Contracts/ (contract documents + external_file_link)
│   ├── Policies/ (policy documents + external_file_link)
│   ├── Terms & Conditions/
│   └── By Customer/
│       └── [Dynamic folders per customer entity]
│
├── Content Studio/
│   ├── Marketing/
│   │   ├── Email Templates/
│   │   ├── Social Posts/
│   │   └── Campaign Assets/
│   ├── Website Content/ (website_page documents)
│   └── PR & Communications/
│
├── Reports/ (public_report documents) (NEW)
│   ├── Board Reports/
│   ├── Investor Updates/
│   └── Customer Reports/
│
├── Files/ (external_file_link documents) (NEW)
│   └── [Organized by folder structure]
│
└── Internal KB/ (internal_kb documents)
    └── [Migrated content]
```

### 3.2 Document Types Definition (NEW)

```typescript
// Extended shared/documentTypes.ts
export const documentTypeConfig = {
  // ========================================
  // EXISTING TYPES (preserved)
  // ========================================
  internal_kb: { 
    label: 'Internal Knowledge Base', 
    icon: 'BookOpen', 
    color: 'blue',
    features: ['rich_text', 'versioning', 'linking', 'attachments']
  },
  website_page: { 
    label: 'Website Page', 
    icon: 'Globe', 
    color: 'green',
    features: ['rich_text', 'versioning', 'seo']
  },
  customer_kb: { 
    label: 'Customer Knowledge Base', 
    icon: 'Users', 
    color: 'purple',
    features: ['rich_text', 'versioning', 'public_sharing']
  },
  marketing_email: { 
    label: 'Marketing Email', 
    icon: 'Mail', 
    color: 'orange',
    features: ['rich_text', 'ai_generation', 'templates']
  },
  marketing_letter: { 
    label: 'Marketing Letter', 
    icon: 'FileText', 
    color: 'gray',
    features: ['rich_text', 'ai_generation', 'templates']
  },
  attachment: { 
    label: 'Attachment', 
    icon: 'Paperclip', 
    color: 'slate',
    features: ['file_storage']
  },
  
  // ========================================
  // NEW TYPES
  // ========================================
  
  training_module: {
    label: 'Training Module',
    icon: 'GraduationCap',
    color: 'emerald',
    features: ['steps', 'progress_tracking', 'quiz', 'certification', 'assignments'],
    description: 'Step-based learning content with videos, checklists, quizzes, and assessments'
  },
  
  external_file_link: {
    label: 'External File',
    icon: 'ExternalLink',
    color: 'cyan',
    features: ['file_reference', 'metadata_only', 'lazy_load'],
    description: 'Pointer to file in external storage (Word, PDF, Excel, etc.)'
  },
  
  contract: {
    label: 'Contract',
    icon: 'FileSignature',
    color: 'amber',
    features: ['lifecycle', 'expiration', 'versions', 'approval', 'entity_linking'],
    description: 'Legal agreements with lifecycle tracking and expiration alerts'
  },
  
  policy: {
    label: 'Policy Document',
    icon: 'Shield',
    color: 'blue',
    features: ['lifecycle', 'acknowledgment', 'versions', 'approval'],
    description: 'Internal or external policies requiring acknowledgment'
  },
  
  public_report: {
    label: 'Public Report',
    icon: 'PresentationChart',
    color: 'violet',
    features: ['sections', 'data_widgets', 'public_access', 'password_protection'],
    description: 'Externally-viewable reports with embedded data and access control'
  },
  
  quick_reference: {
    label: 'Quick Reference',
    icon: 'Zap',
    color: 'yellow',
    features: ['searchable', 'printable', 'single_page'],
    description: 'Single-page reference documents for quick lookup'
  },
  
  template: {
    label: 'Content Template',
    icon: 'LayoutTemplate',
    color: 'pink',
    features: ['ai_generation', 'variables', 'variants'],
    description: 'Reusable templates for content generation'
  }
} as const;

export type DocumentType = keyof typeof documentTypeConfig;
```

### 3.3 Training Module Document Type (NEW - Detailed)

A Training Module is a **specialization of knowledge_documents** with additional structure stored in related tables:

```
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents                                                  │
│ ├── id: 123                                                         │
│ ├── document_type: 'training_module'                                │
│ ├── title: "Fiber Splice Certification"                             │
│ ├── content: (overview/intro content only)                          │
│ ├── metadata: { audience: 'field_tech', cert_enabled: true }       │
│ └── folder_id: 45 (Training/Certifications)                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ training_module_steps                                                │
│ ├── step 1: { type: 'video', title: 'Safety Overview', ... }        │
│ ├── step 2: { type: 'checklist', title: 'Equipment Check', ... }    │
│ ├── step 3: { type: 'resource', title: 'Procedure Guide', ... }     │
│ ├── step 4: { type: 'quiz', title: 'Knowledge Check', ... }         │
│ └── step 5: { type: 'practical', title: 'Hands-On', ... }           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many (for quiz steps)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ training_quiz_questions                                              │
│ ├── question 1: { text: '...', type: 'multiple_choice', ... }       │
│ ├── question 2: { text: '...', type: 'true_false', ... }            │
│ └── question 3: { text: '...', type: 'short_answer', ... }          │
└─────────────────────────────────────────────────────────────────────┘
```

Progress is tracked per user per assignment:

```
┌─────────────────────────────────────────────────────────────────────┐
│ document_assignments                                                 │
│ ├── id: 789                                                         │
│ ├── document_id: 123 (training_module)                              │
│ ├── user_id: 456                                                    │
│ ├── due_date: 2024-03-15                                            │
│ └── status: 'in_progress'                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:1
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ training_progress                                                    │
│ ├── assignment_id: 789                                              │
│ ├── current_step_id: 3                                              │
│ ├── status: 'in_progress'                                           │
│ ├── total_time_seconds: 2700 (45 min)                               │
│ ├── quiz_score: null (not taken yet)                                │
│ ├── quiz_attempts: 0                                                │
│ └── step_completions: {                                             │
│       "1": { completed_at: '...', data: { watched: true } },        │
│       "2": { completed_at: '...', data: { items_checked: [...] } }  │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 External File Link Document Type (NEW - Detailed)

An External File Link is a **lightweight document record** that points to a file stored in external storage:

```
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents                                                  │
│ ├── id: 456                                                         │
│ ├── document_type: 'external_file_link'                             │
│ ├── title: "MSA-2024-AcmeCorp.pdf"                                  │
│ ├── content: null (no embedded content)                             │
│ ├── folder_id: 78 (Customer Vault/Acme Corp/Contracts)              │
│ └── metadata: {                                                     │
│       file_path: '/storage/customers/acme/msa-2024.pdf',            │
│       file_name: 'MSA-2024-AcmeCorp.pdf',                          │
│       file_size: 2457600, // bytes                                  │
│       mime_type: 'application/pdf',                                 │
│       checksum: 'sha256:abc123...',                                 │
│       external_storage_id: 'gs://bucket/path...',                   │
│       last_synced_at: '2024-01-15T10:30:00Z'                       │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Behaviors:**
1. **No Binary on Load:** Page renders document metadata instantly; file downloads only on explicit user action
2. **Version Tracking:** Each new file upload creates a new version entry
3. **Lifecycle Integration:** Can have expiration dates, review cycles
4. **Entity Linking:** Can be linked to objectives, KRs, work items, customers
5. **AI Access:** For Word/PDF, system can extract text for AI processing on demand

### 3.5 Public Report Document Type (NEW - Detailed)

A Public Report is a **multi-section document** with embedded data widgets:

```
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents                                                  │
│ ├── id: 789                                                         │
│ ├── document_type: 'public_report'                                  │
│ ├── title: "Q4 2024 Board Report"                                   │
│ ├── content: null (content in sections)                             │
│ └── metadata: {                                                     │
│       slug: 'q4-2024-board',                                        │
│       access_type: 'password', // 'public'|'password'|'auth'|'both' │
│       password_hash: 'bcrypt:...',                                  │
│       allowed_users: [], // user IDs for auth-based access          │
│       allowed_roles: ['report_viewer'],                             │
│       published: true,                                              │
│       published_at: '2024-01-15T10:30:00Z'                          │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ public_report_sections                                               │
│ ├── section 1: { title: 'Executive Summary', order: 1 }             │
│ ├── section 2: { title: 'Financial Performance', order: 2 }         │
│ └── section 3: { title: 'Operations', order: 3 }                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ public_report_blocks                                                 │
│ ├── block 1: { section_id: 2, type: 'rich_text', order: 1,          │
│ │              content: '<p>Introduction...</p>' }                   │
│ ├── block 2: { section_id: 2, type: 'data_table', order: 2,         │
│ │              config: { query: {...}, columns: [...],               │
│ │                        enable_csv: true } }                        │
│ ├── block 3: { section_id: 2, type: 'chart', order: 3,              │
│ │              config: { type: 'line', query: {...} } }             │
│ └── block 4: { section_id: 2, type: 'doc_snippet', order: 4,        │
│                config: { doc_id: 123, heading: 'Summary' } }         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Report Viewer User Role (NEW)

Extend the existing user role system:

```typescript
// Existing roles (preserved)
type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'viewer';

// Extended roles
type ExtendedUserRole = UserRole | 'report_viewer';

// Role permissions matrix
const rolePermissions = {
  // ... existing permissions ...
  
  report_viewer: {
    // Can ONLY access public reports they're authorized for
    knowledge_hub: false,
    reports: 'authorized_only', // Only reports where they're in allowed_users or allowed_roles
    objectives: false,
    work_items: false,
    settings: false,
    
    // Report-specific permissions
    can_view_report_data: true,
    can_download_csv: true,
    can_download_pdf: true,
    can_comment: false, // v2 feature
  }
};
```

**Access Control Flow:**
```
User requests /reports/{slug}
    │
    ├── Is report public (access_type: 'public')?
    │   └── YES → Render report
    │
    ├── Is access_type: 'password'?
    │   └── YES → Show password form
    │       └── Password correct? → Render report
    │
    ├── Is access_type: 'auth'?
    │   └── YES → Is user logged in?
    │       ├── NO → Redirect to login
    │       └── YES → Is user in allowed_users OR has allowed_roles?
    │           ├── NO → Show "Access Denied"
    │           └── YES → Render report
    │
    └── Is access_type: 'both' (password + auth)?
        └── Check both conditions
```

---

## Part 4: Database Schema Extensions

### 4.1 New Tables Required

```sql
-- ========================================
-- FOLDER SYSTEM
-- ========================================

CREATE TABLE knowledge_folders (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  parent_id INTEGER REFERENCES knowledge_folders(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  folder_type VARCHAR(50) DEFAULT 'general', -- training, customer, content, internal, reports, files
  icon VARCHAR(100),
  color VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE, -- Cannot be deleted
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, parent_id, slug)
);

CREATE INDEX idx_folders_org ON knowledge_folders(organization_id);
CREATE INDEX idx_folders_parent ON knowledge_folders(parent_id);
CREATE INDEX idx_folders_type ON knowledge_folders(folder_type);

-- ========================================
-- TRAINING MODULE SYSTEM (NEW)
-- ========================================

CREATE TABLE training_module_steps (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  step_type VARCHAR(50) NOT NULL, -- video, checklist, resource, quiz, practical_task
  content TEXT, -- Rich text content for resource steps
  config JSONB DEFAULT '{}', -- Type-specific configuration
  /*
    video: { url, duration_seconds, require_full_watch }
    checklist: { items: [{ id, label, required }] }
    resource: {} (content is in 'content' field)
    quiz: { passing_score, max_attempts, time_limit_minutes }
    practical_task: { instructions, requires_supervisor_signoff }
  */
  attachments JSONB DEFAULT '[]', -- Array of external_file_link document IDs
  required BOOLEAN DEFAULT TRUE,
  estimated_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_steps_doc ON training_module_steps(document_id);

CREATE TABLE training_quiz_questions (
  id SERIAL PRIMARY KEY,
  step_id INTEGER REFERENCES training_module_steps(id) ON DELETE CASCADE NOT NULL,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, short_answer
  options JSONB, -- For multiple choice: [{ id, text, is_correct }]
  correct_answer TEXT, -- For true_false: 'true'|'false', for short_answer: expected text
  explanation TEXT, -- Shown after answer
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_step ON training_quiz_questions(step_id);

CREATE TABLE training_progress (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assignment_id INTEGER REFERENCES document_assignments(id),
  current_step_id INTEGER REFERENCES training_module_steps(id),
  status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_time_seconds INTEGER DEFAULT 0,
  quiz_score DECIMAL(5,2),
  quiz_attempts INTEGER DEFAULT 0,
  step_completions JSONB DEFAULT '{}', -- {step_id: {completed_at, data, score}}
  certificate_url TEXT, -- URL to generated certificate PDF
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(document_id, user_id, assignment_id)
);

CREATE INDEX idx_training_progress_user ON training_progress(user_id);
CREATE INDEX idx_training_progress_doc ON training_progress(document_id);
CREATE INDEX idx_training_progress_status ON training_progress(status);

-- ========================================
-- DOCUMENT LIFECYCLE MANAGEMENT
-- ========================================

CREATE TABLE document_lifecycle (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE UNIQUE NOT NULL,
  lifecycle_status VARCHAR(50) DEFAULT 'draft', 
  -- draft, pending_review, active, expiring, expired, archived
  effective_date DATE,
  expiration_date DATE,
  review_date DATE,
  review_cycle_days INTEGER, -- Auto-set next review
  last_reviewed_at TIMESTAMP,
  last_reviewed_by INTEGER REFERENCES users(id),
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  acknowledgment_count INTEGER DEFAULT 0,
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  renewal_work_item_id INTEGER REFERENCES work_items(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_doc ON document_lifecycle(document_id);
CREATE INDEX idx_lifecycle_status ON document_lifecycle(lifecycle_status);
CREATE INDEX idx_lifecycle_expiration ON document_lifecycle(expiration_date);

-- ========================================
-- DOCUMENT-ENTITY LINKING
-- ========================================

CREATE TABLE document_entity_links (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- customer, project, product, team, user
  entity_id INTEGER NOT NULL, -- ID in the referenced table
  entity_name VARCHAR(255), -- Denormalized for display
  link_type VARCHAR(50) DEFAULT 'related', -- primary, related, reference
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_entity_links_doc ON document_entity_links(document_id);
CREATE INDEX idx_entity_links_entity ON document_entity_links(entity_type, entity_id);

-- ========================================
-- PUBLIC REPORTS SYSTEM (NEW)
-- ========================================

CREATE TABLE public_report_sections (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  section_order INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_report_sections_doc ON public_report_sections(document_id);

CREATE TABLE public_report_blocks (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES public_report_sections(id) ON DELETE CASCADE NOT NULL,
  block_type VARCHAR(50) NOT NULL, -- rich_text, data_table, chart, doc_snippet, image
  block_order INTEGER NOT NULL,
  content TEXT, -- For rich_text blocks
  config JSONB DEFAULT '{}',
  /*
    data_table: { 
      data_source: 'work_items', 
      filters: [...], 
      columns: [...], 
      enable_csv: true,
      enable_pdf: false
    }
    chart: { 
      chart_type: 'line'|'bar'|'pie', 
      data_source: '...', 
      x_axis: '...', 
      y_axis: '...' 
    }
    doc_snippet: { 
      document_id: 123, 
      heading: 'Summary', 
      max_chars: 500 
    }
  */
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_report_blocks_section ON public_report_blocks(section_id);

CREATE TABLE public_report_access_log (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id), -- NULL for anonymous/password access
  access_type VARCHAR(50) NOT NULL, -- password, auth, direct
  ip_address VARCHAR(45),
  user_agent TEXT,
  action VARCHAR(50) NOT NULL, -- view, download_csv, download_pdf
  section_viewed VARCHAR(255),
  accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_report_access_doc ON public_report_access_log(document_id);
CREATE INDEX idx_report_access_time ON public_report_access_log(accessed_at);

-- ========================================
-- AI CONTENT GENERATION
-- ========================================

CREATE TABLE ai_content_generations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  document_id INTEGER REFERENCES knowledge_documents(id),
  mode VARCHAR(50) NOT NULL, -- draft, improve, summarize, update_requirements
  content_type VARCHAR(50), -- email, article, section, etc.
  prompt TEXT NOT NULL,
  context_documents JSONB DEFAULT '[]', -- KB docs used as context: [{id, title}]
  original_text TEXT, -- For improve mode
  generated_content TEXT,
  variants JSONB DEFAULT '[]', -- Alternative versions
  model_used VARCHAR(100),
  tokens_used INTEGER,
  applied BOOLEAN DEFAULT FALSE, -- Was the generation inserted into document?
  feedback_rating INTEGER, -- 1-5 stars
  feedback_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_gen_org ON ai_content_generations(organization_id);
CREATE INDEX idx_ai_gen_user ON ai_content_generations(user_id);
CREATE INDEX idx_ai_gen_doc ON ai_content_generations(document_id);

-- ========================================
-- EXTERNAL FILE STORAGE TRACKING
-- ========================================

CREATE TABLE external_file_registry (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Server-side path or cloud storage URL
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL, -- Bytes
  mime_type VARCHAR(100) NOT NULL,
  checksum VARCHAR(255), -- SHA-256 for integrity verification
  storage_backend VARCHAR(50) DEFAULT 'local', -- local, gcs, s3, azure
  storage_metadata JSONB DEFAULT '{}', -- Backend-specific data
  extracted_text TEXT, -- For AI processing (populated on demand)
  extracted_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ext_files_org ON external_file_registry(organization_id);
CREATE INDEX idx_ext_files_doc ON external_file_registry(document_id);
CREATE INDEX idx_ext_files_path ON external_file_registry(file_path);
```

### 4.2 Schema Modifications (Existing Tables)

```sql
-- Add to knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  folder_id INTEGER REFERENCES knowledge_folders(id);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  document_type VARCHAR(50) DEFAULT 'internal_kb';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  template_variables JSONB DEFAULT '[]';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  search_vector TSVECTOR;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  embedding_id VARCHAR(255);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  last_ai_indexed_at TIMESTAMP;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  public_slug VARCHAR(255) UNIQUE;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  access_config JSONB DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_kb_docs_folder ON knowledge_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_kb_docs_type ON knowledge_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kb_docs_search ON knowledge_documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_kb_docs_slug ON knowledge_documents(public_slug);

-- Add report_viewer to users table
-- (Assuming role is stored in users.role as VARCHAR)
-- No schema change needed if role is already VARCHAR; just use 'report_viewer' as a value
```

---

## Part 5: UI Layout Descriptions (Detailed Wireframes)

### 5.1 Knowledge Hub Home Page

**URL:** `/knowledge-hub`
**Purpose:** Main entry point for all document management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📚 Knowledge Hub                    🔍 [Search documents...        ]    │ │
│ │                                                                         │ │
│ │ [+ New Document ▾]  [📤 Upload Files]  [⚙️ Settings]                    │ │
│ │                                                                         │ │
│ │ (Dropdown shows: New Document, New Training Module, New Report,         │ │
│ │  New Folder, Upload Files)                                              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ LEFT SIDEBAR          │ MAIN CONTENT AREA                                   │
│ (240px fixed width)   │                                                     │
│                       │ ┌─────────────────────────────────────────────────┐ │
│ ┌───────────────────┐ │ │ QUICK ACTIONS BAR                               │ │
│ │ NAVIGATION        │ │ │                                                 │ │
│ │                   │ │ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│ │
│ │ 📁 All Documents  │ │ │ │ 📝 New  │ │ 🎓 New  │ │ 📊 New  │ │ 🤖 AI   ││ │
│ │   (active state)  │ │ │ │Document │ │Training │ │ Report │ │Generate ││ │
│ │                   │ │ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘│ │
│ │ 🎓 Training       │ │ └─────────────────────────────────────────────────┘ │
│ │   ├ Modules       │ │                                                     │
│ │   ├ My Training   │ │ ┌─────────────────────────────────────────────────┐ │
│ │   └ Assignments   │ │ │ TAB BAR                                         │ │
│ │                   │ │ │ [Documents] [Files] [Recent] [Favorites]        │ │
│ │ 📁 Customer Vault │ │ └─────────────────────────────────────────────────┘ │
│ │   ├ Contracts     │ │                                                     │
│ │   ├ Policies      │ │ ┌─────────────────────────────────────────────────┐ │
│ │   └ By Customer   │ │ │ DOCUMENTS TAB (when selected)                   │ │
│ │                   │ │ │                                                 │ │
│ │ ✨ Content Studio │ │ │ FOLDER PATH: Home / Training / Certifications   │ │
│ │   ├ Marketing     │ │ │ [Breadcrumb navigation, each segment clickable] │ │
│ │   ├ Website       │ │ │                                                 │ │
│ │   └ Templates     │ │ │ ┌── SORT/FILTER BAR ──────────────────────────┐│ │
│ │                   │ │ │ │ View: [Grid ▾] Sort: [Modified ▾] Type: [All]││ │
│ │ 📊 Reports        │ │ │ └─────────────────────────────────────────────┘│ │
│ │                   │ │ │                                                 │ │
│ │ 📂 Internal KB    │ │ │ ┌── CONTENT GRID/LIST ────────────────────────┐│ │
│ │   └ [folders...]  │ │ │ │                                             ││ │
│ │                   │ │ │ │ ┌────────────┐ ┌────────────┐ ┌────────────┐││ │
│ │ ─────────────────│ │ │ │ │ 📁         │ │ 📁         │ │ 📁         │││ │
│ │                   │ │ │ │ │ Onboarding │ │ Technical  │ │ Safety     │││ │
│ │ 📥 Files          │ │ │ │ │ 4 items    │ │ 8 items    │ │ 3 items    │││ │
│ │ (File Manager)    │ │ │ │ └────────────┘ └────────────┘ └────────────┘││ │
│ │                   │ │ │ │                                             ││ │
│ │ ─────────────────│ │ │ │ ┌────────────┐ ┌────────────┐ ┌────────────┐││ │
│ │                   │ │ │ │ │ 🎓         │ │ 📄         │ │ 📄         │││ │
│ │ ⚙️ Settings       │ │ │ │ │ Fiber      │ │ Equipment  │ │ Quick Ref  │││ │
│ │ 📈 Analytics      │ │ │ │ │ Splicing   │ │ Guide      │ │ Card       │││ │
│ │                   │ │ │ │ │ Training   │ │            │ │            │││ │
│ └───────────────────┘ │ │ │ │ 5 steps    │ │ 12 pages   │ │ 2 pages    │││ │
│                       │ │ │ │ ⚠️ Due: 3d │ │            │ │            │││ │
│                       │ │ │ └────────────┘ └────────────┘ └────────────┘││ │
│                       │ │ │                                             ││ │
│                       │ │ └─────────────────────────────────────────────┘│ │
│                       │ └─────────────────────────────────────────────────┘ │
│                       │                                                     │
│                       │ ┌─────────────────────────────────────────────────┐ │
│                       │ │ FILES TAB (when selected) - GOOGLE DRIVE STYLE  │ │
│                       │ │                                                 │ │
│                       │ │ ┌── DROP ZONE ──────────────────────────────────┐│ │
│                       │ │ │  ┌─────────────────────────────────────────┐ ││ │
│                       │ │ │  │     ☁️ Drag and drop files here         │ ││ │
│                       │ │ │  │           or click to browse            │ ││ │
│                       │ │ │  └─────────────────────────────────────────┘ ││ │
│                       │ │ └───────────────────────────────────────────────┘│ │
│                       │ │                                                 │ │
│                       │ │ ┌── FILE LIST (Table View) ─────────────────────┐│ │
│                       │ │ │ ☐ Name          Type    Size    Modified  Owner││ │
│                       │ │ │ ─────────────────────────────────────────────││ │
│                       │ │ │ ☐ 📄 MSA-2024   PDF     2.3MB   Jan 15   John ││ │
│                       │ │ │ ☐ 📊 Report-Q4  XLSX    1.1MB   Jan 10   Lisa ││ │
│                       │ │ │ ☐ 📝 Proposal   DOCX    450KB   Jan 8    Alex ││ │
│                       │ │ │                                             ││ │
│                       │ │ │ [Selected: 2] [Download] [Move] [Delete]    ││ │
│                       │ │ └─────────────────────────────────────────────┘│ │
│                       │ └─────────────────────────────────────────────────┘ │
└───────────────────────┴─────────────────────────────────────────────────────┘
```

**Interaction Details:**

1. **Left Sidebar Navigation:**
   - Collapsible sections with chevron indicators
   - Active item has highlighted background
   - Badge counts for items needing attention
   - Drag-drop folders between sections

2. **Search Bar:**
   - Instant search as you type (debounced 300ms)
   - Filters: Type, Folder, Status, Date Range
   - AI-powered: "Ask AI about these docs..."

3. **File Drop Zone (Files Tab):**
   - Visual feedback on drag-over (dashed border turns solid blue)
   - Progress indicator during upload
   - Auto-creates External File Link document
   - Shows in folder where user currently is

4. **Document Cards:**
   - Click to open document detail/viewer
   - Right-click for context menu (Edit, Delete, Move, Download)
   - Status badges (Draft, Published, Expired ⚠️)
   - Type indicators (🎓 Training, 📊 Report, etc.)

---

### 5.2 Standard Knowledge Document Editor

**URL:** `/knowledge-hub/documents/{id}/edit` or `/knowledge-hub/documents/new`
**Purpose:** Rich text editing with AI assistance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ← Back to Knowledge Hub    Document Editor                              │ │
│ │                                                                         │ │
│ │                                [Preview] [Save Draft] [Publish ▾]       │ │
│ │                                                                         │ │
│ │                                (Publish dropdown: Publish Now,          │ │
│ │                                 Schedule, Submit for Review)            │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DOCUMENT METADATA BAR                                                   │ │
│ │                                                                         │ │
│ │ Title: [Fiber Services Warranty Policy                              ]   │ │
│ │                                                                         │ │
│ │ Type: [Policy ▾]   Folder: [Customer Vault / Policies ▾]               │ │
│ │                                                                         │ │
│ │ Status: Published ✓   Version: 2.1   Last saved: 2 min ago             │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ EDITOR TOOLBAR                                                          │ │
│ │                                                                         │ │
│ │ [B] [I] [U] [S] │ H1 H2 H3 │ • ─ 1. │ "" │ 🔗 📷 📎 │ ┌─┐ │ [🤖 AI ▾]  │ │
│ │                 │          │        │    │         │ └─┘ │             │ │
│ │                                                                         │ │
│ │ (AI Dropdown shows:                                                     │ │
│ │  • Draft this section - Generate content from brief                     │ │
│ │  • Improve this text - Rewrite selected text                            │ │
│ │  • Summarize linked docs - Create summary                               │ │
│ │  • Update with requirements - Fetch latest standards)                   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────┬─────────────────────────┤
│ EDITOR AREA (Main Content)                        │ RIGHT PANEL (Collapsible)│
│ (Takes 70% width)                                 │ (Takes 30% width)        │
│                                                   │                         │
│ ┌───────────────────────────────────────────────┐ │ ┌───────────────────────┐│
│ │                                               │ │ │ DOCUMENT INFO         ││
│ │ [Editable rich text content area]             │ │ │                       ││
│ │                                               │ │ │ Created: Jan 5, 2024  ││
│ │ The warranty policy covers all fiber         │ │ │ By: John Smith        ││
│ │ splicing work performed by certified         │ │ │                       ││
│ │ technicians...                               │ │ │ Modified: Jan 15, 2024││
│ │                                               │ │ │ By: Lisa Johnson      ││
│ │ ## Coverage Period                            │ │ │                       ││
│ │                                               │ │ │ Version: 2.1          ││
│ │ All splice work is covered for a period      │ │ │ [View History]        ││
│ │ of five (5) years from the installation      │ │ └───────────────────────┘│
│ │ date...                                       │ │                         │
│ │                                               │ │ ┌───────────────────────┐│
│ │ ## Exclusions                                 │ │ │ LINKED DOCUMENTS      ││
│ │                                               │ │ │                       ││
│ │ The following are not covered:               │ │ │ 📄 Installation Guide  ││
│ │ • Damage from natural disasters              │ │ │ 📄 Service Terms v3    ││
│ │ • Unauthorized modifications                 │ │ │                       ││
│ │ • Normal wear and tear                       │ │ │ [+ Link Document]     ││
│ │                                               │ │ └───────────────────────┘│
│ │ [Link to: Installation Guide] ← Internal link │ │                         │
│ │                                               │ │ ┌───────────────────────┐│
│ │ ## Claims Process                             │ │ │ ATTACHED FILES        ││
│ │                                               │ │ │                       ││
│ │ To file a warranty claim:                    │ │ │ 📎 Claim Form.pdf     ││
│ │ 1. Contact support@company.com               │ │ │ 📎 Coverage Map.xlsx  ││
│ │ 2. Provide installation reference            │ │ │                       ││
│ │ 3. Describe the issue                        │ │ │ [📤 Drop files here]  ││
│ │                                               │ │ └───────────────────────┘│
│ │                                               │ │                         │
│ │                                               │ │ ┌───────────────────────┐│
│ │                                               │ │ │ LIFECYCLE             ││
│ │                                               │ │ │                       ││
│ │                                               │ │ │ Status: Active        ││
│ │                                               │ │ │ Effective: Jan 1      ││
│ │                                               │ │ │ Expires: Never        ││
│ │                                               │ │ │ Review: Jul 1 (180d)  ││
│ │                                               │ │ │                       ││
│ │                                               │ │ │ [Edit Lifecycle]      ││
│ │                                               │ │ └───────────────────────┘│
│ └───────────────────────────────────────────────┘ │                         │
└───────────────────────────────────────────────────┴─────────────────────────┘
```

**AI Assist Flow (Example: "Draft this section"):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI ASSIST MODAL                                                    [X Close]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Mode: Draft this section                                                    │
│                                                                             │
│ ┌─ BRIEF ─────────────────────────────────────────────────────────────────┐ │
│ │ What should this section cover?                                         │ │
│ │                                                                         │ │
│ │ [Write about the claims process for warranty requests, including      ] │ │
│ │ [required documentation and typical timeline                          ] │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ CONTEXT DOCUMENTS (AI will reference these) ───────────────────────────┐ │
│ │                                                                         │ │
│ │ ☑️ Brand Voice Guidelines                           (auto-included)     │ │
│ │ ☑️ Current Document: Fiber Services Warranty        (auto-included)     │ │
│ │ ☐ Claims Processing SOP                            [Add]                │ │
│ │                                                                         │ │
│ │ [+ Search KB for more context]                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ GENERATION OPTIONS ────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ Tone: [Match document ▾]   Length: [Medium ▾]   Variants: [1 ▾]        │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                               [Cancel]  [🤖 Generate Draft] │
└─────────────────────────────────────────────────────────────────────────────┘

[After generation - shows in same modal]:

┌─────────────────────────────────────────────────────────────────────────────┐
│ AI ASSIST - Generated Draft                                        [X Close]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─ GENERATED CONTENT ─────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ ## Claims Process                                                       │ │
│ │                                                                         │ │
│ │ Filing a warranty claim is straightforward. Follow these steps:        │ │
│ │                                                                         │ │
│ │ 1. **Contact Support**: Email support@company.com or call our          │ │
│ │    warranty hotline at 1-800-XXX-XXXX.                                 │ │
│ │                                                                         │ │
│ │ 2. **Provide Documentation**:                                          │ │
│ │    - Original installation reference number                            │ │
│ │    - Photos of the affected splice points                              │ │
│ │    - Description of the observed issue                                 │ │
│ │                                                                         │ │
│ │ 3. **Await Assessment**: Our team will review your claim within        │ │
│ │    5 business days and contact you with next steps.                    │ │
│ │                                                                         │ │
│ │ Typical resolution time: 10-15 business days from claim submission.    │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ FEEDBACK ──────────────────────────────────────────────────────────────┐ │
│ │ Rate this generation: ⭐ ⭐ ⭐ ⭐ ☆                                      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│            [Regenerate]  [Edit Before Inserting]  [Insert at Cursor]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Interaction Details:**

1. **AI Button:**
   - Always visible in toolbar
   - Click opens dropdown with modes
   - Keyboard shortcut: Ctrl+Shift+A

2. **Internal Linking:**
   - Type `[[` to trigger document search
   - Shows matching docs in popup
   - Creates smart link that updates if doc moves

3. **File Attachments:**
   - Drag files to attachment area
   - Auto-creates External File Link document
   - Shows in right panel with actions

4. **Version History:**
   - Every save creates implicit version
   - "Save with Note" creates named version
   - Compare any two versions side-by-side

---

### 5.3 Training Module Editor

**URL:** `/knowledge-hub/training/modules/{id}/edit` or `.../new`
**Purpose:** Build step-based training content

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ← Back to Training    Training Module Editor                            │ │
│ │                                                                         │ │
│ │                                        [Preview] [Save] [Publish ▾]     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ MODULE SETTINGS PANEL (Collapsible, default expanded for new modules)   │ │
│ │                                                                         │ │
│ │ Title: [Fiber Splice Certification Training                         ]   │ │
│ │                                                                         │ │
│ │ Description:                                                            │ │
│ │ [Complete certification program for field technicians covering        ] │ │
│ │ [safety, equipment, procedures, and practical assessment              ] │ │
│ │                                                                         │ │
│ │ Audience: [Field Technicians ▾]      Est. Time: [2 hours] (auto-calc)  │ │
│ │                                                                         │ │
│ │ Prerequisites: [+ Add prerequisite module]                              │ │
│ │   • Basic Tools Training ✓                                              │ │
│ │                                                                         │ │
│ │ ☑️ Issue certificate on completion                                      │ │
│ │ ☐ Require supervisor sign-off                                          │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STEPS PANEL                                                   [🤖 AI ▾] │ │
│ │                                                                         │ │
│ │ (AI options: "Propose step breakdown", "Generate quiz from content")   │ │
│ │                                                                         │ │
│ │ ┌── STEP 1 ──────────────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ 📺 Video Step                                                       │ │ │
│ │ │                                                                     │ │ │
│ │ │ Title: [Safety Overview                                         ]   │ │ │
│ │ │                                                                     │ │ │
│ │ │ Video URL: [https://youtube.com/watch?v=...                     ]   │ │ │
│ │ │ Duration: 8 min (auto-detected)                                     │ │ │
│ │ │                                                                     │ │ │
│ │ │ ☑️ Require full watch   ☐ Allow skip after 50%                      │ │ │
│ │ │                                                                     │ │ │
│ │ │ Description (shown below video):                                    │ │ │
│ │ │ [This video covers essential safety protocols...                 ]  │ │ │
│ │ │                                                                     │ │ │
│ │ │ Attachments: [+ Add file]                                           │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 2 ──────────────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ ☑️ Checklist Step                                                   │ │ │
│ │ │                                                                     │ │ │
│ │ │ Title: [Equipment Verification                                  ]   │ │ │
│ │ │                                                                     │ │ │
│ │ │ Instructions: [Check each item before proceeding to practical    ]  │ │ │
│ │ │               [work...                                           ]  │ │ │
│ │ │                                                                     │ │ │
│ │ │ Checklist Items:                                                    │ │ │
│ │ │ ┌─────────────────────────────────────────────────────────────────┐│ │ │
│ │ │ │ ☐ Fusion splicer (calibrated within 30 days)              [🗑️] ││ │ │
│ │ │ │ ☐ Fiber cleaver (blade count < 10,000)                    [🗑️] ││ │ │
│ │ │ │ ☐ Splice sleeves (minimum 20 units)                       [🗑️] ││ │ │
│ │ │ │ ☐ Fiber stripper (in good condition)                      [🗑️] ││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ [+ Add checklist item]                                          ││ │ │
│ │ │ └─────────────────────────────────────────────────────────────────┘│ │ │
│ │ │                                                                     │ │ │
│ │ │ ☑️ All items required                                               │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 3 ──────────────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ 📝 Resource Step                                                    │ │ │
│ │ │                                                                     │ │ │
│ │ │ Title: [Splicing Procedure Guide                                ]   │ │ │
│ │ │                                                                     │ │ │
│ │ │ ┌── RICH TEXT EDITOR ────────────────────────────────────────────┐ │ │ │
│ │ │ │ [B] [I] [U] │ H1 H2 H3 │ • ─ │ 🔗 📷 │ [🤖 AI]                 │ │ │ │
│ │ │ │                                                                 │ │ │ │
│ │ │ │ ## Splice Procedure                                             │ │ │ │
│ │ │ │                                                                 │ │ │ │
│ │ │ │ 1. Prepare the fibers by stripping the coating...              │ │ │ │
│ │ │ │ 2. Clean with alcohol wipes...                                 │ │ │ │
│ │ │ │ 3. Cleave the fiber at 90 degrees...                           │ │ │ │
│ │ │ │                                                                 │ │ │ │
│ │ │ │ [Image: splice-diagram.png]                                     │ │ │ │
│ │ │ │                                                                 │ │ │ │
│ │ │ └─────────────────────────────────────────────────────────────────┘ │ │ │
│ │ │                                                                     │ │ │
│ │ │ Attachments: 📎 Splice-Reference-Card.pdf                           │ │ │
│ │ │              [+ Add file]                                           │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 4 ──────────────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ 🧪 Quiz Step                                                        │ │ │
│ │ │                                                                     │ │ │
│ │ │ Title: [Knowledge Check                                         ]   │ │ │
│ │ │                                                                     │ │ │
│ │ │ Passing Score: [80 %]      Max Attempts: [3]                        │ │ │
│ │ │ Time Limit: ☐ Enabled  [__ min]                                     │ │ │
│ │ │                                                                     │ │ │
│ │ │ Questions: 10 total                          [🤖 Generate Questions]│ │ │
│ │ │                                                                     │ │ │
│ │ │ ┌── Q1 ─────────────────────────────────────────────── ▲ ▼ 🗑️ ───┐│ │ │
│ │ │ │ Type: [Multiple Choice ▾]                                       ││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ Question: [What is the recommended cleave angle for            ]││ │ │
│ │ │ │          [single-mode fiber?                                   ]││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ Options:                                                        ││ │ │
│ │ │ │   ○ 45 degrees                                                  ││ │ │
│ │ │ │   ● 90 degrees  ← (correct)                                     ││ │ │
│ │ │ │   ○ 120 degrees                                                 ││ │ │
│ │ │ │   ○ Any angle is acceptable                                     ││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ Explanation (shown after answer):                               ││ │ │
│ │ │ │ [A 90-degree cleave ensures minimal signal loss...            ] ││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ Points: [1]                                                     ││ │ │
│ │ │ └─────────────────────────────────────────────────────────────────┘│ │ │
│ │ │                                                                     │ │ │
│ │ │ [+ Add Question]                                                    │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 5 ──────────────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ 🔧 Practical Task Step                                              │ │ │
│ │ │                                                                     │ │ │
│ │ │ Title: [Hands-On Splice Assessment                              ]   │ │ │
│ │ │                                                                     │ │ │
│ │ │ Instructions for Trainee:                                           │ │ │
│ │ │ [Complete a supervised splice on test fiber. Notify your          ] │ │ │
│ │ │ [supervisor when ready for assessment.                            ] │ │ │
│ │ │                                                                     │ │ │
│ │ │ ☑️ Requires supervisor sign-off                                     │ │ │
│ │ │                                                                     │ │ │
│ │ │ Supervisor Instructions:                                            │ │ │
│ │ │ [Observe the trainee completing a splice. Verify proper            ]│ │ │
│ │ │ [technique and acceptable loss readings (<0.1dB).                  ]│ │ │
│ │ │                                                                     │ │ │
│ │ │ Assessment Criteria:                                                │ │ │
│ │ │   ☐ Proper PPE worn                                                │ │ │
│ │ │   ☐ Clean workspace maintained                                     │ │ │
│ │ │   ☐ Correct splice procedure followed                              │ │ │
│ │ │   ☐ Splice loss within tolerance                                   │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ [+ Add Step: 📺 Video | ☑️ Checklist | 📝 Resource | 🧪 Quiz | 🔧 Task] │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ COMPLETION SETTINGS (Collapsible)                                       │ │
│ │                                                                         │ │
│ │ Required for completion:                                                │ │
│ │   ☑️ All required steps completed                                       │ │
│ │   ☑️ Quiz passed (minimum 80%)                                          │ │
│ │   ☑️ Practical task signed off                                          │ │
│ │                                                                         │ │
│ │ Certificate:                                                            │ │
│ │   ☑️ Generate PDF certificate on completion                             │ │
│ │   Template: [Standard Certification ▾]                                  │ │
│ │   Expiration: ☐ Certificate expires after [__ months]                   │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Interaction Details:**

1. **Step Reordering:**
   - Drag via ⋮ handle
   - Up/Down arrows for keyboard users
   - Steps renumber automatically

2. **AI Step Proposal:**
   - Click "AI > Propose step breakdown"
   - Enter topic/learning objectives
   - AI suggests step structure
   - User can accept/modify/reject

3. **AI Quiz Generation:**
   - Click "Generate Questions" in quiz step
   - AI reads content from resource steps
   - Generates relevant questions
   - User reviews and edits

4. **Preview Mode:**
   - Shows learner's view
   - Can navigate through steps
   - Doesn't record progress

---

### 5.4 Training Dashboard (My Training)

**URL:** `/knowledge-hub/training/my-training`
**Purpose:** Personal training progress view

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🎓 My Training                                    [📜 Download Certs]   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ PROGRESS SUMMARY CARDS                                                  │ │
│ │                                                                         │ │
│ │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │ │
│ │ │  📚 Active       │ │  ✅ Completed    │ │  ⏰ Overdue      │         │ │
│ │ │                  │ │                  │ │                  │         │ │
│ │ │       2          │ │       5          │ │       1          │         │ │
│ │ │                  │ │  this quarter    │ │                  │         │ │
│ │ └──────────────────┘ └──────────────────┘ └──────────────────┘         │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ACTIVE TRAINING                                                         │ │
│ │                                                                         │ │
│ │ ┌─ TRAINING CARD ─────────────────────────────────────────────────────┐ │ │
│ │ │                                                                     │ │ │
│ │ │ 🎓 Fiber Splice Certification                    Due: Mar 5, 2024   │ │ │
│ │ │    Assigned by: Sarah Johnson on Feb 15                             │ │ │
│ │ │                                                                     │ │ │
│ │ │ Progress: ████████████░░░░░░░░░░ 60%                                │ │ │
│ │ │                                                                     │ │ │
│ │ │ Current Step: Step 3 of 5 - Splicing Procedure Guide               │ │ │
│ │ │ Time Invested: 45 min    Estimated Remaining: 1h 15min              │ │ │
│ │ │                                                                     │ │ │
│ │ │ Steps:                                                              │ │ │
│ │ │   ✓ Step 1: Safety Overview (Video) - 10 min                        │ │ │
│ │ │   ✓ Step 2: Equipment Verification (Checklist) - 5 min              │ │ │
│ │ │   ● Step 3: Splicing Procedure Guide (Resource) - 30 min ← Current  │ │ │
│ │ │   ○ Step 4: Knowledge Check (Quiz)                                  │ │ │
│ │ │   ○ Step 5: Hands-On Assessment (Practical)                         │ │ │
│ │ │                                                                     │ │ │
│ │ │                                                        [Continue →] │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌─ TRAINING CARD ─────────────────────────────────────────────────────┐ │ │
│ │ │                                                                     │ │ │
│ │ │ 📖 Customer Service Excellence           ⚠️ OVERDUE: Feb 28, 2024   │ │ │
│ │ │    Assigned by: HR Team on Feb 1                                    │ │ │
│ │ │                                                                     │ │ │
│ │ │ Progress: ████░░░░░░░░░░░░░░░░░░ 20%                                │ │ │
│ │ │                                                                     │ │ │
│ │ │ Current Step: Step 1 of 4 - Introduction to Service                 │ │ │
│ │ │                                                                     │ │ │
│ │ │                                                           [Start →] │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ COMPLETED TRAINING                                         [View All]  │ │
│ │                                                                         │ │
│ │ ┌────────────────────────────────────────────────────────────────────┐  │ │
│ │ │ ✅ Safety Fundamentals                     Completed: Feb 15, 2024 │  │ │
│ │ │    Score: 95%  |  Time: 1h 30min  |  📜 Certificate: [Download]   │  │ │
│ │ └────────────────────────────────────────────────────────────────────┘  │ │
│ │                                                                         │ │
│ │ ┌────────────────────────────────────────────────────────────────────┐  │ │
│ │ │ ✅ Workplace Safety Update 2024            Completed: Jan 30, 2024 │  │ │
│ │ │    Score: 88%  |  Time: 45min  |  📜 Certificate: [Download]      │  │ │
│ │ └────────────────────────────────────────────────────────────────────┘  │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.5 Objective / Key Result / Work Item Detail - Documents Section (NEW)

**Location:** On existing detail pages for objectives, key results, and work items
**Purpose:** Attach and manage related documents

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Existing Objective Detail Header: OKR-2024-Q1-03]                          │
│ [Objective: Expand Fiber Network to 5 New Enterprise Zones]                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [... existing objective content: description, key results, progress ...]   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📎 DOCUMENTS & FILES                                    [Collapse ▲]   │ │
│ │                                                                         │ │
│ │ ┌── ATTACHED DOCUMENTS ─────────────────────────────────────────────┐   │ │
│ │ │                                                                   │   │ │
│ │ │  📄 Q1 Expansion Technical Specs                                  │   │ │
│ │ │     Knowledge Document • Internal KB • v2.0                       │   │ │
│ │ │     [View] [Detach]                                               │   │ │
│ │ │                                                                   │   │ │
│ │ │  📄 Fiber Network Installation Guide                              │   │ │
│ │ │     Knowledge Document • Training Reference                       │   │ │
│ │ │     [View] [Detach]                                               │   │ │
│ │ │                                                                   │   │ │
│ │ │  📎 Site-Survey-Zone-A.pdf                                        │   │ │
│ │ │     External File • PDF • 3.2MB • Uploaded Jan 10                 │   │ │
│ │ │     [Download] [View Details] [Detach]                            │   │ │
│ │ │                                                                   │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                         │ │
│ │ ┌── ATTACH OPTIONS ─────────────────────────────────────────────────┐   │ │
│ │ │                                                                   │   │ │
│ │ │  ┌─────────────────────────────────────────────────────────────┐ │   │ │
│ │ │  │         ☁️ Drag and drop files here                         │ │   │ │
│ │ │  │              to upload and attach                           │ │   │ │
│ │ │  │                                                             │ │   │ │
│ │ │  │  (Files are stored externally and linked here)              │ │   │ │
│ │ │  └─────────────────────────────────────────────────────────────┘ │   │ │
│ │ │                                                                   │   │ │
│ │ │  [📚 Attach from Knowledge Base]   [📤 Upload New File]          │   │ │
│ │ │                                                                   │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                         │ │
│ │ ┌── REQUIRED TRAINING ──────────────────────────────────────────────┐   │ │
│ │ │                                                                   │   │ │
│ │ │  🎓 Fiber Installation Certification                              │   │ │
│ │ │     Required for team members working on this objective           │   │ │
│ │ │     Completion: 8/10 team members (80%)                           │   │ │
│ │ │     [View Progress] [Manage Assignments]                          │   │ │
│ │ │                                                                   │   │ │
│ │ │  [+ Link Training Module]                                         │   │ │
│ │ │                                                                   │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Attach from Knowledge Base Modal:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Attach Document from Knowledge Base                               [X Close] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 🔍 [Search documents...                                              ]      │
│                                                                             │
│ Filter by: [All Types ▾]  [All Folders ▾]                                   │
│                                                                             │
│ ┌── RESULTS ────────────────────────────────────────────────────────────┐   │
│ │                                                                       │   │
│ │ ☐ 📄 Q1 Expansion Technical Specs                                     │   │
│ │      Internal KB • /Internal KB/Technical                             │   │
│ │                                                                       │   │
│ │ ☐ 📄 Fiber Network Installation Guide                                 │   │
│ │      Internal KB • /Training/References                               │   │
│ │                                                                       │   │
│ │ ☐ 📎 Zone-A-Permits.pdf                                               │   │
│ │      External File • /Customer Vault/Permits                          │   │
│ │                                                                       │   │
│ │ ☐ 🎓 Fiber Installation Certification                                 │   │
│ │      Training Module • /Training/Certifications                       │   │
│ │                                                                       │   │
│ │ ☐ 📄 Vendor Contract - FiberCorp                                      │   │
│ │      Contract • /Customer Vault/Vendors                               │   │
│ │                                                                       │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ Selected: 2 documents                                                       │
│                                                                             │
│                                              [Cancel]  [Attach Selected]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Behavior when file is dropped:**

1. File upload starts immediately (progress indicator)
2. File stored in external storage (server-side path generated)
3. External File Link document auto-created:
   - Title = filename
   - Folder = organization's default "Files" folder
   - Metadata = file_path, size, mime_type, etc.
4. New document attached to current objective/KR/work item
5. Toast: "File uploaded and attached successfully"

---

### 5.6 Public Report Builder

**URL:** `/knowledge-hub/reports/{id}/build`
**Purpose:** Build data-driven reports for external stakeholders

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ← Back to Reports    Report Builder                                     │ │
│ │                                                                         │ │
│ │                                [Preview] [Unpublish] [Share Link 🔗]    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ REPORT SETTINGS (Collapsible)                                           │ │
│ │                                                                         │ │
│ │ Title: [Q4 2024 Board Report                                        ]   │ │
│ │                                                                         │ │
│ │ URL: /reports/[q4-2024-board     ] (auto-generated, editable)           │ │
│ │                                                                         │ │
│ │ Access Control:                                                         │ │
│ │   ○ Public (no authentication required)                                 │ │
│ │   ● Password Protected                                                  │ │
│ │   ○ Authenticated Users Only (requires login)                           │ │
│ │   ○ Both (password + login)                                             │ │
│ │                                                                         │ │
│ │ Password: [••••••••••] [👁️ Show] [🔄 Regenerate]                        │ │
│ │                                                                         │ │
│ │ Allowed Roles: (for auth-based access)                                  │ │
│ │   ☑️ report_viewer   ☑️ admin   ☐ manager   ☐ member                    │ │
│ │                                                                         │ │
│ │ Status: 🟢 Published   Published at: Jan 15, 2024 10:30 AM              │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ SECTIONS PANEL          │ BLOCK EDITOR (for selected section)              │
│ (Left side, 280px)      │ (Right side, remaining width)                    │
│                         │                                                   │
│ ┌─────────────────────┐ │ ┌───────────────────────────────────────────────┐ │
│ │ SECTIONS            │ │ │ Section: Financial Performance                │ │
│ │                     │ │ │                                               │ │
│ │ ┌─────────────────┐ │ │ │ ┌─ BLOCKS ─────────────────────────────────┐ │ │
│ │ │ 1. Executive    │ │ │ │ │                                         │ │ │
│ │ │    Summary      │ │ │ │ │ ┌── BLOCK 1: Rich Text ──── ▲ ▼ 🗑️ ──┐ │ │ │
│ │ │    3 blocks     │ │ │ │ │ │                                     │ │ │ │
│ │ └─────────────────┘ │ │ │ │ │ [B] [I] [U] │ H1 H2 H3 │ • ─ │ [🤖] │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │ ┌─────────────────┐ │ │ │ │ │ Q4 demonstrated strong financial    │ │ │ │
│ │ │ 2. Financial    │ │ │ │ │ │ performance with revenue growth     │ │ │ │
│ │ │    Performance  │ │ │ │ │ │ of 23% year-over-year...            │ │ │ │
│ │ │    4 blocks  ←  │ │ │ │ │ │                                     │ │ │ │
│ │ │    (selected)   │ │ │ │ │ └─────────────────────────────────────┘ │ │ │
│ │ └─────────────────┘ │ │ │ │                                         │ │ │
│ │                     │ │ │ │ ┌── BLOCK 2: Data Table ── ▲ ▼ 🗑️ ──┐ │ │ │
│ │ ┌─────────────────┐ │ │ │ │ │                                     │ │ │ │
│ │ │ 3. Operations   │ │ │ │ │ │ 📊 Data Table Block                 │ │ │ │
│ │ │    2 blocks     │ │ │ │ │ │                                     │ │ │ │
│ │ └─────────────────┘ │ │ │ │ │ Data Source: [Revenue Transactions▾]│ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │ ┌─────────────────┐ │ │ │ │ │ Filters:                            │ │ │ │
│ │ │ 4. Outlook      │ │ │ │ │ │   Quarter = [Q4 2024]               │ │ │ │
│ │ │    1 block      │ │ │ │ │ │   Organization = [Current]          │ │ │ │
│ │ └─────────────────┘ │ │ │ │ │   [+ Add Filter]                    │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │ [+ Add Section]     │ │ │ │ │ Columns:                            │ │ │ │
│ │                     │ │ │ │ │   ☑️ Date   ☑️ Amount   ☑️ Category │ │ │ │
│ │                     │ │ │ │ │   ☐ Notes  ☐ Reference              │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ Options:                            │ │ │ │
│ │                     │ │ │ │ │   ☑️ Enable CSV download            │ │ │ │
│ │                     │ │ │ │ │   ☐ Enable PDF export               │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ [Preview Data]                      │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ └─────────────────────────────────────┘ │ │ │
│ │                     │ │ │ │                                         │ │ │
│ │                     │ │ │ │ ┌── BLOCK 3: Chart ──────── ▲ ▼ 🗑️ ──┐ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ 📈 Chart Block                      │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ Chart Type: [Line ▾]                │ │ │ │
│ │                     │ │ │ │ │ Data Source: [Monthly Revenue ▾]    │ │ │ │
│ │                     │ │ │ │ │ X-Axis: [Month]   Y-Axis: [Revenue] │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ [Preview Chart]                     │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ └─────────────────────────────────────┘ │ │ │
│ │                     │ │ │ │                                         │ │ │
│ │                     │ │ │ │ ┌── BLOCK 4: Doc Snippet ─ ▲ ▼ 🗑️ ──┐ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ 📄 Document Snippet Block           │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ Source Doc: [Q4 Financial Analysis▾]│ │ │ │
│ │                     │ │ │ │ │ Section: [Summary ▾] (heading-based)│ │ │ │
│ │                     │ │ │ │ │ Max Length: [500 chars]             │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ ☑️ Show "Read More" link to full doc│ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ │ [Preview Snippet]                   │ │ │ │
│ │                     │ │ │ │ │                                     │ │ │ │
│ │                     │ │ │ │ └─────────────────────────────────────┘ │ │ │
│ │                     │ │ │ │                                         │ │ │
│ │                     │ │ │ │ [+ Add Block: 📝 Text | 📊 Table |       │ │ │
│ │                     │ │ │ │              📈 Chart | 📄 Snippet]     │ │ │
│ │                     │ │ │ │                                         │ │ │
│ │                     │ │ │ └─────────────────────────────────────────┘ │ │
│ │                     │ │                                               │ │
│ └─────────────────────┘ │ └───────────────────────────────────────────────┘ │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

### 5.7 Public Report Viewer (External-Facing)

**URL:** `/reports/{slug}` (e.g., `/reports/q4-2024-board`)
**Purpose:** Read-only view for external stakeholders

**Password Entry Screen (if password protected):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                                                                             │
│                     ┌───────────────────────────────────┐                   │
│                     │                                   │                   │
│                     │          [COMPANY LOGO]           │                   │
│                     │                                   │                   │
│                     │   Q4 2024 Board Report            │                   │
│                     │                                   │                   │
│                     │   ─────────────────────────────   │                   │
│                     │                                   │                   │
│                     │   This report is password         │                   │
│                     │   protected.                      │                   │
│                     │                                   │                   │
│                     │   Password:                       │                   │
│                     │   ┌───────────────────────────┐   │                   │
│                     │   │ ••••••••••                │   │                   │
│                     │   └───────────────────────────┘   │                   │
│                     │                                   │                   │
│                     │            [View Report]          │                   │
│                     │                                   │                   │
│                     │   ─────────────────────────────   │                   │
│                     │                                   │                   │
│                     │   For access, contact the report  │                   │
│                     │   administrator.                  │                   │
│                     │                                   │                   │
│                     └───────────────────────────────────┘                   │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Report Viewer (after authentication):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REPORT HEADER                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ [COMPANY LOGO]                                                          │ │
│ │                                                                         │ │
│ │ Q4 2024 Board Report                                                    │ │
│ │ Published: January 15, 2024                                             │ │
│ │                                                                         │ │
│ │                                               [📄 Download PDF]         │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────── │
│ SECTION NAVIGATION (Horizontal tabs or left sidebar)                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Executive Summary] [Financial Performance ●] [Operations] [Outlook]   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ SECTION CONTENT: Financial Performance                                      │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ RICH TEXT BLOCK                                                         │ │
│ │                                                                         │ │
│ │ Q4 demonstrated strong financial performance with revenue growth of     │ │
│ │ 23% year-over-year. Key highlights include successful expansion into    │ │
│ │ three new enterprise zones and improved customer retention rates.       │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DATA TABLE BLOCK                                        [📥 Download CSV]│ │
│ │                                                                         │ │
│ │ Revenue by Quarter                                                      │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ Quarter    │ Revenue      │ Growth    │ Target     │ Status      │   │ │
│ │ ├───────────────────────────────────────────────────────────────────┤   │ │
│ │ │ Q1 2024    │ $1,200,000   │ +15%      │ $1,100,000 │ ✓ Exceeded  │   │ │
│ │ │ Q2 2024    │ $1,350,000   │ +18%      │ $1,250,000 │ ✓ Exceeded  │   │ │
│ │ │ Q3 2024    │ $1,480,000   │ +21%      │ $1,400,000 │ ✓ Exceeded  │   │ │
│ │ │ Q4 2024    │ $1,720,000   │ +23%      │ $1,600,000 │ ✓ Exceeded  │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ CHART BLOCK                                                             │ │
│ │                                                                         │ │
│ │ Revenue Trend (2024)                                                    │ │
│ │                                                                         │ │
│ │     $1.8M ┤                                              ●              │ │
│ │           │                                         ●                   │ │
│ │     $1.5M ┤                                    ●                        │ │
│ │           │                               ●                             │ │
│ │     $1.2M ┤                          ●                                  │ │
│ │           │                     ●                                       │ │
│ │     $0.9M ┤                ●                                            │ │
│ │           │           ●                                                 │ │
│ │     $0.6M ┼────────────────────────────────────────────────────────     │ │
│ │           Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec    │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DOCUMENT SNIPPET BLOCK                                                  │ │
│ │                                                                         │ │
│ │ From: Q4 Financial Analysis                                             │ │
│ │ ───────────────────────────                                             │ │
│ │                                                                         │ │
│ │ "The fourth quarter exceeded expectations across all key metrics.       │ │
│ │ Strategic investments in infrastructure paid dividends with improved    │ │
│ │ operational efficiency and customer satisfaction scores reaching        │ │
│ │ all-time highs of 94%..."                                               │ │
│ │                                                                         │ │
│ │ [Read Full Document →]                                                  │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                      │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ © 2024 Company Name. This report is confidential.                       │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Technical Notes & Decisions

### 6.1 Document Type Modeling Decision

**Approach:** Use a single `knowledge_documents` table with `document_type` discriminator column, plus specialized related tables for type-specific data.

**Rationale:**
- Preserves existing infrastructure
- Enables cross-type queries (search all docs)
- Avoids table explosion
- Type-specific behavior in code, not schema

**Implementation:**
```typescript
// All document types share these core fields
interface BaseDocument {
  id: number;
  organizationId: number;
  title: string;
  content: string | null; // May be null for external files
  documentType: DocumentType;
  folderId: number | null;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, any>; // Type-specific data
  // ... timestamps, author, etc.
}

// Type-specific extensions via related tables:
// - training_module → training_module_steps, training_quiz_questions, training_progress
// - external_file_link → external_file_registry
// - public_report → public_report_sections, public_report_blocks
// - contract/policy → document_lifecycle
```

### 6.2 External Storage Integration

**v1 Approach:** Server-side file storage with database pointers

**Storage Backend Options:**
1. **Local filesystem** (default): Files in `/storage/files/{org_id}/{path}`
2. **Google Cloud Storage** (configurable): Files in `gs://bucket/{org_id}/{path}`
3. **S3-compatible** (future): For AWS or MinIO

**File Upload Flow:**
```
1. User drops file in UI
2. Frontend sends file to POST /api/knowledge-hub/files/upload
3. Backend:
   a. Generates unique path based on org_id and timestamp
   b. Stores file in configured backend
   c. Creates external_file_registry entry with:
      - file_path, file_name, file_size, mime_type
      - checksum (SHA-256)
      - storage_backend identifier
   d. Creates knowledge_documents entry with:
      - document_type: 'external_file_link'
      - title: filename
      - metadata: { file_registry_id: ... }
4. Returns document ID to frontend
5. Frontend can now attach this doc to objectives/work items
```

**File Access Flow:**
```
1. User clicks "Download" on external file doc
2. Frontend requests GET /api/knowledge-hub/files/{doc_id}/download
3. Backend:
   a. Looks up external_file_registry by doc_id
   b. Generates signed URL or streams file from storage
   c. Logs access in activity log
4. File downloads in browser
```

### 6.3 AI Integration in Editor

**v1 Modes:**

| Mode | Input | AI Behavior | Output |
|------|-------|-------------|--------|
| Draft | Brief + context docs | Generate content matching brief | Rich text to insert |
| Improve | Selected text + context | Rewrite for clarity/concision | Replacement text + diff |
| Summarize | Linked doc IDs | Extract and condense | Summary paragraph |
| Update Requirements | Document + web search | Fetch current standards | Suggestions with citations |

**API Design:**
```typescript
// POST /api/knowledge-hub/ai/generate
interface AIGenerateRequest {
  mode: 'draft' | 'improve' | 'summarize' | 'update_requirements';
  documentId?: number; // Current document (for context)
  selectedText?: string; // For improve mode
  brief?: string; // For draft mode
  contextDocumentIds?: number[]; // Additional KB docs for context
  options?: {
    tone?: 'match_document' | 'professional' | 'casual';
    length?: 'short' | 'medium' | 'long';
    variants?: number; // Generate multiple options
  };
}

interface AIGenerateResponse {
  content: string;
  variants?: string[];
  sourcesUsed: { id: number; title: string }[];
  tokensUsed: number;
  generationId: number; // For feedback/tracking
}
```

**Guardrails:**
- Legal/compliance content: Requires approval before publishing
- External web searches: Limited to trusted domains
- Rate limiting: Max 50 generations/user/day
- All generations logged with prompt and output

### 6.4 AI Interaction with External Files

**v1 Approach:** Read-only text extraction for AI context

**Supported Formats:**
- PDF: Extract text using pdf-parse or similar
- Word (DOCX): Extract text using mammoth.js
- Plain text: Direct read
- Excel (XLSX): Convert to structured text/table

**Extraction Flow:**
```
1. AI needs to reference external file doc
2. System checks external_file_registry.extracted_text
3. If null or stale:
   a. Fetch file from storage
   b. Extract text based on mime_type
   c. Store in extracted_text column
   d. Update extracted_at timestamp
4. Return extracted text to AI
```

**Future (v2):** AI-suggested edits that can be applied back to original files (requires document generation libraries)

### 6.5 Data Widget Query System (Reports)

**v1 Query Builder:**
- Predefined data sources (not arbitrary SQL)
- Filter by organization, date range, status
- Column selection from allowed list
- Aggregation options (sum, count, average)

**Example Data Sources:**
```typescript
const dataSources = {
  'revenue_transactions': {
    table: 'xero_transactions',
    allowedColumns: ['date', 'amount', 'category', 'reference'],
    filters: ['organization_id', 'date_range', 'category'],
  },
  'work_items_summary': {
    table: 'work_items',
    allowedColumns: ['title', 'status', 'due_date', 'assigned_to', 'completed_at'],
    filters: ['organization_id', 'date_range', 'status', 'team_id'],
    aggregations: ['count_by_status', 'completion_rate'],
  },
  'okr_progress': {
    table: 'objectives',
    allowedColumns: ['title', 'progress', 'status', 'target_date'],
    filters: ['organization_id', 'cycle', 'team_id'],
  },
};
```

**Security:** All queries scoped to organization_id, validated on backend

---

## Part 7: Migration Strategy

### 7.1 Migration Phases

```
Phase 0: Preparation (No user impact)
├── Create new database tables
├── Add new columns to knowledge_documents
├── Build migration scripts
├── Test on development database
└── Duration: 1-2 days

Phase 1: Parallel Operation (Low risk)
├── Deploy new UI alongside existing
├── New documents use new system
├── Existing documents unchanged
├── Dual navigation available
└── Duration: 1 week

Phase 2: Content Migration (Medium risk)
├── Auto-create folders from categories
├── Move documents to appropriate folders
├── Convert tagged docs to new types
├── Preserve all existing data
└── Duration: 1 week

Phase 3: Full Cutover (Higher risk)
├── Update menu to new Knowledge Hub
├── Redirect old URLs
├── Archive old UI code
├── Enable all new features
└── Duration: 2-3 days

Phase 4: Cleanup (No user impact)
├── Remove deprecated code paths
├── Archive old navigation items
├── Update documentation
├── Performance optimization
└── Duration: 1 week
```

### 7.2 Rollback Strategy

**Trigger Conditions:**
1. Data integrity errors affecting >5% of documents
2. Critical functionality broken (create, edit, view)
3. Performance degradation >3x baseline
4. User-blocking bugs in production

**Rollback Procedure:**
1. Restore menu_items visibility (hide new, show old)
2. Update page status back to 'dev'
3. Maintain new data (don't delete)
4. Investigate and fix issues
5. Re-attempt migration with fixes

---

## Part 8: Implementation Phases (Revised Timeline)

### Phase 1: Foundation (Week 1-2)
- Create database tables
- Folder CRUD API + UI
- Document type extensions
- External file upload/download

### Phase 2: Training Modules (Week 3-4)
- Training module editor
- Step types (video, checklist, resource, quiz, practical)
- Training viewer for learners
- Progress tracking

### Phase 3: Document Lifecycle (Week 5-6)
- Lifecycle status workflow
- Expiration tracking + alerts
- Version comparison
- Entity linking

### Phase 4: AI Integration (Week 7-8)
- In-editor AI button with modes
- Context document retrieval
- AI logging and feedback
- External file text extraction

### Phase 5: Public Reports (Week 9-10)
- Report builder UI
- Block types (text, table, chart, snippet)
- Query builder for data blocks
- Public viewer with access control

### Phase 6: Migration & Polish (Week 11-12)
- Migration wizard
- URL redirects
- Menu updates
- Performance optimization
- Documentation

---

## Part 9: Success Metrics

### Adoption Metrics
- % of users accessing Knowledge Hub vs. old KB
- Number of training modules created
- Number of documents organized into folders
- AI content generation usage
- Public reports published

### Engagement Metrics
- Training completion rates (target: 85%+)
- Average time to find documents (target: <30 seconds)
- Quiz pass rates
- Document freshness (% reviewed within cycle)

### Business Metrics
- Reduction in support tickets about finding information
- Time saved in onboarding (measured in training hours)
- External stakeholder report engagement
- Compliance audit pass rate (100% for customer docs)

---

## Appendix A: API Endpoints (Proposed)

```
# Folders
GET    /api/knowledge-hub/folders
POST   /api/knowledge-hub/folders
PATCH  /api/knowledge-hub/folders/:id
DELETE /api/knowledge-hub/folders/:id
POST   /api/knowledge-hub/folders/:id/move

# Documents (extends existing)
GET    /api/knowledge-hub/documents
POST   /api/knowledge-hub/documents
GET    /api/knowledge-hub/documents/:id
PATCH  /api/knowledge-hub/documents/:id
DELETE /api/knowledge-hub/documents/:id
POST   /api/knowledge-hub/documents/:id/attach-to/:entityType/:entityId

# External Files
POST   /api/knowledge-hub/files/upload
GET    /api/knowledge-hub/files/:id/download
GET    /api/knowledge-hub/files/:id/metadata
POST   /api/knowledge-hub/files/:id/extract-text

# Training Modules
GET    /api/knowledge-hub/training/modules
POST   /api/knowledge-hub/training/modules
GET    /api/knowledge-hub/training/modules/:id
PATCH  /api/knowledge-hub/training/modules/:id
GET    /api/knowledge-hub/training/modules/:id/steps
POST   /api/knowledge-hub/training/modules/:id/steps
PATCH  /api/knowledge-hub/training/modules/:id/steps/:stepId
DELETE /api/knowledge-hub/training/modules/:id/steps/:stepId

# Training Progress
GET    /api/knowledge-hub/training/my-training
GET    /api/knowledge-hub/training/modules/:id/progress
POST   /api/knowledge-hub/training/modules/:id/progress/step/:stepId
GET    /api/knowledge-hub/training/modules/:id/certificate

# Document Lifecycle
GET    /api/knowledge-hub/documents/:id/lifecycle
PATCH  /api/knowledge-hub/documents/:id/lifecycle
GET    /api/knowledge-hub/lifecycle/expiring
GET    /api/knowledge-hub/lifecycle/pending-review

# AI Content
POST   /api/knowledge-hub/ai/generate
GET    /api/knowledge-hub/ai/generations
POST   /api/knowledge-hub/ai/generations/:id/feedback

# Public Reports
GET    /api/knowledge-hub/reports
POST   /api/knowledge-hub/reports
GET    /api/knowledge-hub/reports/:id
PATCH  /api/knowledge-hub/reports/:id
GET    /api/knowledge-hub/reports/:id/sections
POST   /api/knowledge-hub/reports/:id/sections
GET    /api/knowledge-hub/reports/:id/sections/:sectionId/blocks

# Public Report Viewer (no auth for public, conditional for protected)
GET    /api/reports/:slug/access (check access requirements)
POST   /api/reports/:slug/authenticate (password verification)
GET    /api/reports/:slug/content (returns full report if authorized)
GET    /api/reports/:slug/data/:blockId (fetch data for data blocks)
GET    /api/reports/:slug/download/pdf
GET    /api/reports/:slug/download/csv/:blockId

# Migration
GET    /api/knowledge-hub/migration/analyze
POST   /api/knowledge-hub/migration/execute
GET    /api/knowledge-hub/migration/status
POST   /api/knowledge-hub/migration/rollback
```

---

## Appendix B: File Structure (Proposed)

```
client/src/pages/KnowledgeHub/
├── index.tsx                      # Main hub page
├── KnowledgeHubLayout.tsx         # Shared layout with sidebar
├── AllDocuments.tsx               # Document listing with folders
├── FileManager.tsx                # Google Drive-style file view (NEW)
├── Training/
│   ├── TrainingCenter.tsx         # Training dashboard
│   ├── ModuleEditor.tsx           # Training module editor (NEW)
│   ├── ModuleViewer.tsx           # Step-by-step viewer (NEW)
│   ├── MyTraining.tsx             # Personal progress
│   └── Assignments.tsx            # Admin assignment view
├── CustomerDocs/
│   ├── CustomerVault.tsx          # Folder-based doc management
│   ├── LifecycleDashboard.tsx     # Expiration/review tracking
│   └── DocumentDetail.tsx         # Single doc with lifecycle
├── ContentStudio/
│   ├── ContentStudio.tsx          # Marketing content hub
│   ├── AIWizard.tsx               # AI generation flow
│   └── Templates.tsx              # Template management
├── Reports/                       # NEW
│   ├── ReportList.tsx             # List of reports
│   ├── ReportBuilder.tsx          # Report builder UI
│   └── blocks/
│       ├── RichTextBlock.tsx
│       ├── DataTableBlock.tsx
│       ├── ChartBlock.tsx
│       └── DocSnippetBlock.tsx
└── Settings/
    ├── HubSettings.tsx            # Configuration
    └── MigrationWizard.tsx        # Content migration

client/src/pages/PublicReport/     # NEW - External-facing
├── ReportViewer.tsx               # Main viewer
├── PasswordEntry.tsx              # Password form
└── ReportContent.tsx              # Section renderer

client/src/components/KnowledgeHub/
├── FolderTree.tsx                 # Folder navigation
├── FolderBreadcrumb.tsx           # Path breadcrumb
├── DocumentCard.tsx               # Document preview card
├── DocumentsFilesSection.tsx      # For OKR/Work Item detail (NEW)
├── TrainingStepEditor.tsx         # Step editing component (NEW)
├── TrainingStepViewer.tsx         # Step viewing component (NEW)
├── QuizEditor.tsx                 # Quiz question editor
├── QuizTaker.tsx                  # Quiz taking interface
├── LifecycleBadge.tsx             # Document status badge
├── AIEditorButton.tsx             # In-editor AI button (NEW)
├── AIGenerateModal.tsx            # AI generation modal (NEW)
└── FileDropZone.tsx               # Drag-drop file upload (NEW)

server/routes/
├── knowledge-hub.ts               # Core document operations
├── knowledge-hub-folders.ts       # Folder operations
├── knowledge-hub-files.ts         # External file operations (NEW)
├── knowledge-hub-training.ts      # Training module operations (NEW)
├── knowledge-hub-lifecycle.ts     # Lifecycle operations
├── knowledge-hub-ai.ts            # AI content operations
├── knowledge-hub-reports.ts       # Report builder operations (NEW)
└── public-reports.ts              # Public report viewer API (NEW)
```

---

*Document Version: 2.0*
*Last Updated: November 2024*
*Changes from v1: Added training modules, external file links, public reports, report viewer role, detailed UI specifications, AI editor integration*
