# Knowledge Base Enterprise Transformation - Master Implementation Plan v3

## Executive Summary

This plan transforms the existing Knowledge Base from an MVP document repository into an **Enterprise Document Intelligence Hub** with AI-native workflows. The implementation preserves all existing infrastructure (menu/pages tables, Drizzle ORM, React stack) while adding new capabilities for:

- **Training modules** with step-based playbooks, quizzes, points system, and progress tracking
- **Microsoft 365 integration** for OneDrive and Teams file linking via Microsoft Graph API
- **Customer document lifecycle** with expiration tracking and version control
- **AI-powered content generation** with mandatory human approval workflow
- **Public report portal** with role-based access control and visual query builder
- **Team Page** as a central social/collaboration hub with WhatsApp integration

**Core Principle:** User Journeys First, Technical Implementation Second

**Version History:**
- v1: Initial plan with 6 user journeys, migration strategy, UI mockups
- v2: Extended with training modules, external file links, public reports, report viewer role, detailed UI specifications, AI editor integration
- v3 (current): Final specifications with Microsoft Graph integration, points system, Team Page, WhatsApp bridge, role-based report access, visual query builder, AI approval pipeline

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
users                        - User accounts with roles
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
- Action approval workflow for write operations (MUST be preserved and extended)

### 1.2 Current Limitations

1. **Flat Document Structure** - No folder hierarchy, only category tags
2. **No Step-Based Learning** - Documents are single-page, no playbook workflow
3. **Limited Lifecycle Management** - No expiration, review cycles, or approval workflows
4. **Basic Search** - Text matching only, no semantic search
5. **No AI Content Generation** - Manual content creation only
6. **Single Document Type UX** - All docs treated the same in UI
7. **No External File Management** - Files must be fully imported, no linking
8. **No Public-Facing Reports** - All content is internal only
9. **No Data-Driven Widgets** - Static content only, no embedded queries
10. **No Team Social Hub** - No central collaboration space
11. **No Microsoft 365 Integration** - Cannot browse OneDrive/Teams files

---

## Part 2: User Journeys (Core Scope Definition)

### Journey 1: Training Manager Creates Training Module

**Persona:** Sarah, Operations Manager
**Goal:** Create step-by-step onboarding guide for new field technicians
**Document Type:** `training_module`

**Target Experience:**
```
1. Opens Knowledge Hub → Training Center
2. Clicks "New Training Module" → Module editor opens
3. Defines module metadata:
   - Title: "Fiber Splice Certification"
   - Audience: Field Technicians (via role selector)
   - Estimated time: 2 hours (auto-calculated from steps)
   - Prerequisites: Links to "Basic Tools Training" module
   - Certification: Enabled (generates PDF on completion)
   - Points Value: 50 points (custom value set by creator)
4. Adds Steps via step-type selector:
   - Step 1: Video - "Safety Overview" (YouTube/Vimeo embed)
   - Step 2: Checklist - "Equipment Verification" (interactive checklist)
   - Step 3: Resource - "Procedure Guide" (rich text with images)
   - Step 4: Quiz - "Knowledge Check" (10 questions, custom points per question)
   - Step 5: Practical Task - "Hands-On Assessment" (supervisor sign-off)
5. For each step, can:
   - Reorder via drag-and-drop
   - Mark as required/optional
   - Set time estimate
   - Attach files from Microsoft 365 (External File Link Documents)
   - Link to other KB documents using / command
6. Chooses completion requirements:
   - Option A: Complete all steps
   - Option B: Pass quiz
   - Option C: Both (all steps + pass quiz)
7. Sets quiz configuration:
   - Passing score threshold (e.g., 80%)
   - Points per question (custom values)
   - Max attempts
8. Uses AI assist (requires human approval):
   - "Propose step breakdown for this topic" → AI suggests structure → User approves
   - "Draft quiz questions from content" → AI generates questions → User approves
9. Publishes module and assigns to team with due date
10. Monitors progress dashboard with per-user completion rates
```

**Required Features:**
- Training module document type with ordered steps
- Step types: video, checklist, resource, quiz, practical_task
- Progress tracking per user per step
- Quiz system with custom points per question
- Module-level points value (awarded on completion)
- Completion requirements: all steps / pass quiz / both (creator chooses)
- Drag-and-drop step reordering
- Microsoft 365 file attachments per step
- AI assist with mandatory human approval
- Assignment management with due dates
- Certificate generation on completion

---

### Journey 2: Field Technician Completes Training

**Persona:** Mike, New Field Technician
**Goal:** Complete required training before first job
**Document Type:** `training_module` (viewer mode)

**Target Experience:**
```
1. Logs in → Sees "My Training" widget on My Day page
2. Widget shows:
   - 2 Active trainings with progress bars
   - 1 Overdue training (red highlight)
   - 3 Completed trainings (last 30 days)
   - Total points earned: 150 pts
3. Clicks "Fiber Splice Certification" (Due: 3 days)
4. Training Viewer opens with:
   - Left sidebar: Step list with status icons (✓ completed, ● current, ○ pending)
   - Main area: Current step content
   - Top bar: Progress bar, time spent, points available
5. Completes steps in order:
   - Step 1 (Video): Watches embedded YouTube video, clicks "Mark as Watched"
   - Step 2 (Checklist): Checks off each item, clicks "Submit Checklist"
   - Step 3 (Resource): Reads content, can open attached Microsoft 365 files in same tab
   - Step 4 (Quiz): Answers 10 questions, submits
     - Score: 85% (PASS - threshold 80%)
     - Points earned from quiz: 40 pts
     - Can see correct answers after submission
   - Step 5 (Practical Task): Clicks "Request Supervisor Sign-off"
6. All requirements met → "Training Complete" confirmation
7. Points awarded: 50 pts (module completion) + 40 pts (quiz) = 90 pts
8. Certificate auto-generated (PDF)
9. Points visible on:
   - User's Profile page
   - User's card on Team Page
```

**Required Features:**
- Training viewer with step-by-step navigation
- Step status tracking (not started, in progress, completed, failed)
- Embedded video player (YouTube/Vimeo)
- Interactive checklists with completion validation
- Quiz taking interface with immediate feedback
- Points calculation and display
- Supervisor sign-off workflow
- Certificate generation (PDF)
- Mobile-responsive step viewer

---

### Journey 3: Customer Success Manager Manages Contracts

**Persona:** Lisa, Customer Success Manager
**Goal:** Store and manage customer contracts with lifecycle tracking
**Document Types:** `contract`, `policy`, `external_file_link`

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
3. Clicks "Add from Microsoft 365" button
4. Microsoft 365 browser opens:
   - Shows list of Teams user has access to
   - Drills down: Team → Channel → Files
   - Selects "MSA-2024.pdf"
   - Aimee creates External File Link Document automatically
5. File record shows in folder:
   - Title: MSA-2024.pdf
   - Source: Teams > Sales > Contracts
   - Type: Contract
   - Lifecycle Status: Active (expires March 15) ⚠️
6. Clicks file → Opens in Microsoft's native viewer (same browser tab)
7. Can edit metadata in Aimee:
   - Set expiration date
   - Link to customer entity
   - Add version notes
8. Receives automated email: "Contract expires in 30 days"
9. Clicks "Start Renewal" → Creates work item with contract attached
```

**Required Features:**
- Folder hierarchy with drag/drop organization
- Microsoft Graph API integration for OneDrive/Teams browsing
- External File Link documents (metadata only, opens in Microsoft viewer)
- Document lifecycle (draft → pending_review → active → expiring → expired → archived)
- Expiration tracking with automated email alerts
- Version history with change summaries
- Customer/entity linking
- Full audit trail in activity log
- Work item creation from documents

---

### Journey 4: Marketing Lead Generates Content with AI

**Persona:** Alex, Marketing Coordinator
**Goal:** Create campaign content using AI assistance
**Document Types:** `marketing_email`, `website_page`, `internal_kb`

**Target Experience:**
```
1. Opens Knowledge Hub → Content Studio
2. Creates new Marketing Email document
3. Opens editor with AI button visible in toolbar
4. Uses / command to link documents:
   - Types "/" → Inline search appears (not modal)
   - Types "brand" → Shows matching documents
   - Selects "Brand Voice Guidelines" → Text hyperlink inserted
5. Uses AI assist modes (ALL REQUIRE HUMAN APPROVAL):
   
   Mode 1: "Draft this section"
   - Clicks AI button → selects "Draft this section"
   - Enters brief: "Announce Q2 fiber expansion to enterprise customers"
   - AI generates draft → SHOWS IN PREVIEW PANEL
   - Alex reviews → Clicks "Approve & Insert" or "Reject"
   - ONLY after approval is content inserted into document
   
   Mode 2: "Improve / tighten this text"
   - Selects paragraph
   - Clicks AI → "Improve this"
   - AI suggests rewrite → Shows diff view
   - Alex clicks "Accept" or "Reject"
   - Changes only applied after explicit approval
   
   Mode 3: "Summarize linked documents"
   - Document has 3 linked KB articles
   - Clicks AI → "Summarize linked docs"
   - AI produces summary → Shows in preview
   - Alex approves before insertion
   
   Mode 4: "Update with latest requirements"
   - Working on Terms of Service document
   - Clicks AI → "Update with latest legal requirements"
   - AI searches internet, suggests updates with citations
   - ALL suggestions require explicit approval
   - Legal content auto-flagged for additional review
   
6. Saves document → Version created automatically
7. All AI interactions logged with approval/rejection status
8. Publishes to Content Library
```

**Required Features:**
- AI button in editor toolbar with mode selector
- **ALL AI operations require explicit human approval before applying**
- AI never auto-commits any changes
- Draft mode: Generate content from brief + context → Approval required
- Improve mode: Rewrite selected text → Approval required
- Summarize mode: Condense linked documents → Approval required
- Update mode: Fetch external requirements → Approval required + legal flag
- Diff view for all AI suggestions
- Activity logging for all AI interactions with approval status
- Approval workflow for sensitive content

---

### Journey 5: Support Agent Uses AI to Answer Customer Questions

**Persona:** Tom, Support Agent
**Goal:** Quickly find and share accurate information from KB

**Target Experience:**
```
1. Customer asks: "What's your fiber splicing warranty?"
2. Tom asks AI Assistant: "What is our fiber splicing warranty policy?"
3. AI searches KB semantically:
   - Finds "Fiber Services Warranty Policy" document
   - Extracts relevant section
   - Cites source document with link
4. AI responds with source citations
5. Tom reviews response for accuracy
6. Tom clicks "Share with Customer" → Response added to ticket
7. Usage tracked for KB analytics
```

**Required Features:**
- Semantic search across all KB documents
- Source citation with document links
- Freshness indicators (last updated date)
- Share/export to tickets functionality
- Usage analytics

---

### Journey 6: Administrator Migrates Existing Content

**Persona:** Admin User
**Goal:** Transition from current KB to new system without data loss

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
   - Convert 2 docs to Training Module format
5. Admin reviews and approves each suggestion
6. Migration runs with:
   - Real-time progress bar
   - Rollback capability at any point
   - Full audit log
7. Old URLs redirect to new locations
8. No broken links or lost data
```

**Required Features:**
- Migration analysis tool
- Category-to-folder converter
- Bulk operations with preview
- URL redirection
- Rollback capability
- Audit logging

---

### Journey 7: External Stakeholder Views Public Report (UPDATED v3)

**Persona:** David, Investor/Board Member (has `report_viewer` role)
**Goal:** View company progress reports with real-time data

**Target Experience:**
```
1. Receives email: "Your Q4 Board Report access has been granted"
2. Clicks link: https://app.company.com/reports/q4-2024-board
3. Sees login screen (NO PASSWORD OPTION - role-based only):
   - Logs in with report_viewer credentials
   - System checks if user has access to this specific report
4. Report opens with:
   - Header: Company logo, Report title, Date
   - Tab navigation: [Executive Summary] [Financial] [Operations] [Outlook]
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
   
6. Clicks "Download Full Report as PDF"
7. All access logged for compliance
8. report_viewer can ONLY access:
   - Their Profile
   - Reports assigned to them
   - NO other menu items visible
```

**Required Features:**
- Public report document type with sections
- Public URL with slug (/reports/{slug})
- **Role-based access control ONLY (no password option)**
- report_viewer role with minimal permissions
- Access lists support: specific users + roles
- Section-based navigation (tabs)
- Rich text blocks
- Data table blocks (visual query builder)
- Chart blocks (visual query builder)
- Embedded document snippets
- CSV/PDF export
- Access logging

---

### Journey 8: Internal User Builds a Public Report (UPDATED v3)

**Persona:** CFO's Executive Assistant
**Goal:** Create a quarterly investor report with live data

**Target Experience:**
```
1. Opens Knowledge Hub → Reports
2. Clicks "New Public Report"
3. Report Builder opens (DRAG-AND-PREVIEW interface, not modal-driven):
   - Left panel: Section list (draggable)
   - Center panel: Live preview of selected section
   - Right panel: Block properties
4. Configures report settings:
   - Title: "Q4 2024 Board Report"
   - URL slug: q4-2024-board (auto-generated, editable)
   - Access Control:
     - Add specific users: david@investor.com, board@company.com
     - Add roles: report_viewer, admin
5. Adds sections (drag to reorder):
   - "Executive Summary"
   - "Financial Performance"
   - "Operations"
   - "Outlook"
6. Edits "Financial Performance" section:
   
   DRAGS Rich Text block into preview area:
   - Types intro paragraph directly in preview
   - Uses / command to link KB documents
   
   DRAGS Data Table block into preview area:
   - Visual Query Builder opens:
     - Entity/Table: [Revenue Transactions ▾]
     - Filters:
       - Quarter = Q4 2024
       - Organization = Current
     - Columns: [✓] Date [✓] Amount [✓] Category
     - Sorting: Date DESC
     - Aggregations: SUM(Amount), COUNT(*)
     - Joins: [+ Add Join] → Customers table on customer_id
     - Enable CSV download: ✓
   - Preview shows live data
   
   DRAGS Chart block into preview area:
   - Chart Type: [Line ▾]
   - Visual Query Builder:
     - Entity: Monthly Revenue
     - X-Axis: Month
     - Y-Axis: SUM(Revenue)
   - Preview shows rendered chart
   
   DRAGS Knowledge Document block into preview area:
   - Select document: "Q4 Financial Analysis"
   - Select section: "Summary" (heading-based)
   - Preview shows embedded content
   
7. Live preview updates as blocks are added/configured
8. Publishes report → URL becomes active
9. Shares access with stakeholders (adds to access list)
```

**Required Features:**
- Drag-and-preview Report Builder (NOT modal-driven)
- Section management with drag reordering
- Block types: rich text, data table, chart, document snippet
- **Visual Query Builder with:**
  - Entity/table selection
  - Filter conditions
  - Column selection
  - Sorting
  - Aggregations (SUM, AVG, COUNT, MIN, MAX)
  - Join support (multi-table queries)
- Live preview mode
- Role-based and user-based access lists
- Publish/unpublish toggle
- Share link generation (no password, role-based only)

---

### Journey 9: Team Member Uses Team Page (NEW v3)

**Persona:** Any team member
**Goal:** Stay connected with team activity and collaboration

**Target Experience:**
```
1. Opens Team Page from main navigation
2. Sees three main areas:

   AREA 1: Team Directory (Left panel)
   - Grid/list of team members
   - Each card shows:
     - Avatar (or initials)
     - Name
     - Role
     - Status indicator (🟢 Active, 🟡 Away, 🔵 In Meeting)
   - Click any user → Opens detailed profile

   AREA 2: User Profile (Sheet/modal when user clicked)
   - Header: Avatar, Name, Role, Points (e.g., "250 pts")
   - Sections:
     - Training: Completed modules, progress on active, total points
     - Work Items: Active, Completed this week, Stuck/Blocked (highlighted)
     - OKRs: Objectives they own, Key Results they contribute to
     - Recent Activity: Last 5 actions
   - Quick actions: Assign work item, Send message

   AREA 3: Activity Feed (Right panel)
   - Real-time feed of team activity:
     - "John completed Fiber Splice Training (+50 pts)"
     - "Lisa published new KB doc: Warranty Policy v2"
     - "New sale: Acme Corp - $15,000" (via automation)
     - "Mike updated Work Item: Zone A Installation"
   - Events can be pushed via automation layer
   - Filterable by type, user, date

   AREA 4: WhatsApp Messages (Tab or section)
   - Read-only display of WhatsApp group messages
   - Each message shows:
     - Sender name
     - Sender phone number
     - Timestamp
     - Text content
     - Media (images/videos) if available
   - If sender phone matches Aimee user → Shows their avatar
   - Bridge/bot pulls messages into Aimee
   - No two-way posting in v1
```

**Required Features:**
- Team Directory with avatars, names, roles, status
- User Profile with:
  - Points display
  - Training completions and progress
  - Work items (active, completed, stuck/blocked)
  - OKRs owned/participated
  - Recent activity
- Activity Feed with:
  - Training completions
  - New KB documents
  - Sales events (via automation)
  - Custom events via automation layer
- WhatsApp Integration (read-only):
  - Message display (sender, phone, timestamp, text, media)
  - User matching by phone number
  - Bridge/bot architecture

---

### Journey 10: User Attaches Microsoft 365 Files (NEW v3)

**Persona:** Any user working with documents
**Goal:** Link files from OneDrive or Teams without duplicating

**Target Experience:**
```
1. User is on any of these pages:
   - Knowledge Document editor
   - Training Module step
   - Objective Detail
   - Key Result Detail
   - Work Item Detail

2. Clicks "Add from Microsoft 365" button

3. Microsoft 365 Browser modal opens:
   - Tab 1: OneDrive
     - Shows user's OneDrive folders/files
     - Can navigate folder structure
   - Tab 2: Teams
     - Shows list of Teams user is member of
     - Click Team → Shows Channels
     - Click Channel → Shows Files in that channel

4. User navigates: Sales Team → Contracts Channel → Q4-Contracts folder

5. Selects one or more files (checkbox multi-select)

6. Clicks "Link Selected"

7. Aimee automatically:
   - Creates External File Link Document for each file
   - Stores ONLY metadata:
     - Filename
     - File type (PDF, DOCX, XLSX, etc.)
     - File size
     - Microsoft Graph URL pointer
     - Teams/Channel path (if from Teams)
   - Links document to current context (objective, work item, etc.)
   - Mirrors folder structure in Knowledge Hub (optional)

8. Later, when user clicks the linked file:
   - Opens in Microsoft's native online viewer
   - Same browser tab (not new tab)
   - No file download required
   - No binary content stored in Aimee
```

**Required Features:**
- Microsoft Graph API integration
- OAuth flow for Microsoft 365 authentication
- OneDrive file browser
- Teams browser (Teams → Channels → Files)
- Multi-file selection
- External File Link Document creation
- Metadata-only storage (no binary content)
- Files open in Microsoft viewer in same tab
- Folder structure mirroring (optional)

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
├── Reports/ (public_report documents)
│   ├── Board Reports/
│   ├── Investor Updates/
│   └── Customer Reports/
│
├── Microsoft 365 Files/ (external_file_link documents)
│   ├── [Mirrored from OneDrive structure]
│   └── [Mirrored from Teams structure]
│
└── Internal KB/ (internal_kb documents)
    └── [Migrated content]
```

### 3.2 Document Types Definition

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
  // NEW TYPES (v3)
  // ========================================
  
  training_module: {
    label: 'Training Module',
    icon: 'GraduationCap',
    color: 'emerald',
    features: ['steps', 'progress_tracking', 'quiz', 'points', 'certification', 'assignments'],
    description: 'Step-based learning content with videos, checklists, quizzes, and points'
  },
  
  external_file_link: {
    label: 'External File (Microsoft 365)',
    icon: 'ExternalLink',
    color: 'cyan',
    features: ['metadata_only', 'microsoft_viewer', 'graph_api'],
    description: 'Pointer to file in OneDrive/Teams (opens in Microsoft viewer)'
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
    features: ['sections', 'data_widgets', 'role_based_access', 'visual_query_builder'],
    description: 'Externally-viewable reports with embedded data and role-based access'
  },
  
  quick_reference: {
    label: 'Quick Reference',
    icon: 'Zap',
    color: 'yellow',
    features: ['searchable', 'printable', 'single_page'],
    description: 'Single-page reference documents for quick lookup'
  }
} as const;

export type DocumentType = keyof typeof documentTypeConfig;
```

### 3.3 User Roles (UPDATED v3)

```typescript
// Extended user roles
type UserRole = 
  | 'super_admin'    // Full system access
  | 'admin'          // Organization admin
  | 'manager'        // Team/project management
  | 'member'         // Standard employee
  | 'viewer'         // Read-only internal access
  | 'report_viewer'; // NEW: External stakeholder with minimal access

// Role permissions matrix
const rolePermissions = {
  super_admin: { /* full access */ },
  admin: { /* organization admin access */ },
  manager: { /* team management access */ },
  member: { /* standard access */ },
  viewer: { /* read-only access */ },
  
  report_viewer: {
    // MINIMAL ACCESS - for external stakeholders only
    knowledge_hub: false,
    training: false,
    objectives: false,
    work_items: false,
    team_page: false,
    settings: false,
    integrations: false,
    
    // CAN ONLY ACCESS:
    profile: true,                    // Their own profile
    reports: 'assigned_only',         // Only reports in their access list
    
    // Report-specific permissions
    can_view_report_data: true,
    can_download_csv: true,
    can_download_pdf: true,
  }
};
```

### 3.4 Training Module Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents                                                  │
│ ├── id: 123                                                         │
│ ├── document_type: 'training_module'                                │
│ ├── title: "Fiber Splice Certification"                             │
│ ├── content: (overview/intro content only)                          │
│ ├── metadata: {                                                     │
│ │     audience: 'field_tech',                                       │
│ │     cert_enabled: true,                                           │
│ │     points_value: 50,  // Module completion points                │
│ │     completion_requirements: 'both'  // 'all_steps'|'quiz'|'both' │
│ │   }                                                               │
│ └── folder_id: 45                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ training_module_steps                                                │
│ ├── step 1: { type: 'video', title: 'Safety Overview', ... }        │
│ ├── step 2: { type: 'checklist', title: 'Equipment Check', ... }    │
│ ├── step 3: { type: 'resource', title: 'Procedure Guide', ... }     │
│ ├── step 4: { type: 'quiz', title: 'Knowledge Check', config: {     │
│ │              passing_score: 80, points_per_question: [...] } }    │
│ └── step 5: { type: 'practical', title: 'Hands-On', ... }           │
│                                                                      │
│ Each step can have:                                                  │
│ - Rich text content (stored in DB)                                  │
│ - Embedded videos (YouTube/Vimeo URL)                               │
│ - Checklist items                                                   │
│ - External File Link attachments (Microsoft 365)                    │
│ - Internal document links (via / command)                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 External File Link Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents                                                  │
│ ├── id: 456                                                         │
│ ├── document_type: 'external_file_link'                             │
│ ├── title: "MSA-2024-AcmeCorp.pdf"                                  │
│ ├── content: null  (NO BINARY CONTENT STORED)                       │
│ ├── folder_id: 78                                                   │
│ └── metadata: {                                                     │
│       // Microsoft Graph API data                                   │
│       graph_item_id: 'abc123...',                                   │
│       graph_drive_id: 'xyz789...',                                  │
│       web_url: 'https://...sharepoint.com/.../file.pdf',            │
│                                                                     │
│       // File metadata                                              │
│       file_name: 'MSA-2024-AcmeCorp.pdf',                          │
│       file_size: 2457600,  // bytes                                 │
│       mime_type: 'application/pdf',                                 │
│                                                                     │
│       // Source location                                            │
│       source_type: 'teams',  // 'onedrive' | 'teams'                │
│       team_name: 'Sales Team',                                      │
│       channel_name: 'Contracts',                                    │
│       folder_path: '/Q4-Contracts',                                 │
│                                                                     │
│       // For AI text extraction (populated on demand)               │
│       extracted_text: null,                                         │
│       extracted_at: null                                            │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘

KEY BEHAVIORS:
1. NO binary content stored in Aimee DB
2. Files always open in Microsoft's native viewer (same browser tab)
3. Metadata fetched via Microsoft Graph API
4. For AI access: text extracted on-demand via parsing layer
```

### 3.6 Public Report Data Model (UPDATED v3)

```
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents                                                  │
│ ├── id: 789                                                         │
│ ├── document_type: 'public_report'                                  │
│ ├── title: "Q4 2024 Board Report"                                   │
│ ├── content: null                                                   │
│ └── metadata: {                                                     │
│       slug: 'q4-2024-board',                                        │
│       // NO PASSWORD - role-based only                              │
│       allowed_users: [101, 102, 103],  // User IDs                  │
│       allowed_roles: ['report_viewer', 'admin'],                    │
│       published: true,                                              │
│       published_at: '2024-01-15T10:30:00Z'                          │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ public_report_sections  (stored as individual records)               │
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
│ │              query_config: {                                       │
│ │                entity: 'revenue_transactions',                     │
│ │                filters: [...],                                     │
│ │                columns: [...],                                     │
│ │                sorting: [...],                                     │
│ │                aggregations: [...],                                │
│ │                joins: [...]                                        │
│ │              } }                                                   │
│ ├── block 3: { section_id: 2, type: 'chart', order: 3,              │
│ │              chart_type: 'line',                                   │
│ │              query_config: {...} }                                 │
│ └── block 4: { section_id: 2, type: 'doc_snippet', order: 4,        │
│                config: { doc_id: 123, heading: 'Summary' } }         │
└─────────────────────────────────────────────────────────────────────┘

ACCESS CONTROL FLOW:
1. User requests /reports/{slug}
2. Is user logged in?
   └── NO → Redirect to login
3. Is user in allowed_users OR has role in allowed_roles?
   ├── NO → Show "Access Denied"
   └── YES → Render report
4. Log access for compliance
```

### 3.7 Points System Data Model (NEW v3)

```
┌─────────────────────────────────────────────────────────────────────┐
│ user_points                                                          │
│ ├── id: SERIAL                                                      │
│ ├── user_id: INTEGER (FK → users)                                   │
│ ├── organization_id: INTEGER (FK → organizations)                   │
│ ├── total_points: INTEGER                                           │
│ ├── updated_at: TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ point_transactions                                                   │
│ ├── id: SERIAL                                                      │
│ ├── user_id: INTEGER (FK → users)                                   │
│ ├── points: INTEGER (positive or negative)                          │
│ ├── source_type: VARCHAR  // 'training_completion', 'quiz', etc.    │
│ ├── source_id: INTEGER    // training_module ID, etc.               │
│ ├── description: VARCHAR  // "Completed Fiber Splice Training"      │
│ ├── created_at: TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘

POINTS RULES:
1. NO universal scoring rules - each module creator sets custom values
2. Module completion points: Set per training_module (e.g., 50 pts)
3. Quiz points: Set per question by creator (e.g., 5 pts each)
4. Points displayed on:
   - User's Profile page
   - User's card on Team Page
5. NO leaderboard in v1
```

### 3.8 Team Page Data Model (NEW v3)

```
┌─────────────────────────────────────────────────────────────────────┐
│ user_status                                                          │
│ ├── user_id: INTEGER (FK → users, UNIQUE)                           │
│ ├── status: VARCHAR  // 'active', 'away', 'in_meeting', 'offline'   │
│ ├── status_message: VARCHAR  // Optional custom message             │
│ ├── updated_at: TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ activity_feed                                                        │
│ ├── id: SERIAL                                                      │
│ ├── organization_id: INTEGER (FK → organizations)                   │
│ ├── user_id: INTEGER (FK → users, nullable for system events)       │
│ ├── event_type: VARCHAR                                             │
│ │   // 'training_completed', 'document_published', 'sale_recorded', │
│ │   // 'work_item_updated', 'whatsapp_message', 'custom'            │
│ ├── title: VARCHAR                                                  │
│ ├── description: TEXT                                               │
│ ├── metadata: JSONB                                                 │
│ ├── created_at: TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ whatsapp_messages  (NEW - for read-only bridge)                      │
│ ├── id: SERIAL                                                      │
│ ├── organization_id: INTEGER (FK → organizations)                   │
│ ├── group_id: VARCHAR  // WhatsApp group identifier                 │
│ ├── group_name: VARCHAR                                             │
│ ├── sender_phone: VARCHAR  // Phone number                          │
│ ├── sender_name: VARCHAR   // As shown in WhatsApp                  │
│ ├── matched_user_id: INTEGER (FK → users, nullable)                 │
│ ├── message_type: VARCHAR  // 'text', 'image', 'video', 'document'  │
│ ├── text_content: TEXT                                              │
│ ├── media_url: TEXT        // For images/videos                     │
│ ├── whatsapp_timestamp: TIMESTAMP                                   │
│ ├── received_at: TIMESTAMP                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Database Schema (SQL)

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
  folder_type VARCHAR(50) DEFAULT 'general',
  icon VARCHAR(100),
  color VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, parent_id, slug)
);

-- ========================================
-- TRAINING MODULE SYSTEM
-- ========================================

CREATE TABLE training_module_steps (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  step_type VARCHAR(50) NOT NULL, -- video, checklist, resource, quiz, practical_task
  content TEXT, -- Rich text content (stored in Aimee's DB)
  config JSONB DEFAULT '{}',
  /*
    video: { url, embed_type: 'youtube'|'vimeo' }
    checklist: { items: [{ id, label, required }] }
    resource: {} (content in 'content' field)
    quiz: { passing_score, max_attempts, points_per_question: [5,5,10,...] }
    practical_task: { instructions, requires_supervisor_signoff }
  */
  attachments JSONB DEFAULT '[]', -- Array of external_file_link document IDs
  required BOOLEAN DEFAULT TRUE,
  estimated_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE training_quiz_questions (
  id SERIAL PRIMARY KEY,
  step_id INTEGER REFERENCES training_module_steps(id) ON DELETE CASCADE NOT NULL,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, short_answer
  options JSONB, -- For multiple choice: [{ id, text, is_correct }]
  correct_answer TEXT,
  explanation TEXT,
  points INTEGER DEFAULT 1, -- Custom points per question
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE training_progress (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assignment_id INTEGER REFERENCES document_assignments(id),
  current_step_id INTEGER REFERENCES training_module_steps(id),
  status VARCHAR(50) DEFAULT 'not_started',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_time_seconds INTEGER DEFAULT 0,
  quiz_score DECIMAL(5,2),
  quiz_points_earned INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  step_completions JSONB DEFAULT '{}',
  certificate_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(document_id, user_id, assignment_id)
);

-- ========================================
-- POINTS SYSTEM
-- ========================================

CREATE TABLE user_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  total_points INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE point_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  points INTEGER NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- training_completion, quiz, manual_adjustment
  source_id INTEGER,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- DOCUMENT LIFECYCLE
-- ========================================

CREATE TABLE document_lifecycle (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE UNIQUE NOT NULL,
  lifecycle_status VARCHAR(50) DEFAULT 'draft',
  effective_date DATE,
  expiration_date DATE,
  review_date DATE,
  review_cycle_days INTEGER,
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

-- ========================================
-- PUBLIC REPORTS (ROLE-BASED ACCESS)
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

CREATE TABLE public_report_blocks (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES public_report_sections(id) ON DELETE CASCADE NOT NULL,
  block_type VARCHAR(50) NOT NULL, -- rich_text, data_table, chart, doc_snippet
  block_order INTEGER NOT NULL,
  content TEXT, -- For rich_text blocks
  query_config JSONB DEFAULT '{}', -- For data_table and chart blocks
  /*
    query_config structure:
    {
      entity: 'work_items',
      filters: [{ field: 'status', op: 'eq', value: 'completed' }],
      columns: ['title', 'status', 'due_date'],
      sorting: [{ field: 'due_date', direction: 'desc' }],
      aggregations: [{ field: 'amount', fn: 'sum' }],
      joins: [{ table: 'users', on: 'assigned_to = users.id', columns: ['name'] }],
      enable_csv: true,
      enable_pdf: false
    }
  */
  config JSONB DEFAULT '{}', -- For doc_snippet and other blocks
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public_report_access_log (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  access_type VARCHAR(50) NOT NULL, -- view, download_csv, download_pdf
  ip_address VARCHAR(45),
  user_agent TEXT,
  section_viewed VARCHAR(255),
  accessed_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- TEAM PAGE
-- ========================================

CREATE TABLE user_status (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'offline', -- active, away, in_meeting, offline
  status_message VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activity_feed (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE whatsapp_messages (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  group_id VARCHAR(255) NOT NULL,
  group_name VARCHAR(255),
  sender_phone VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255),
  matched_user_id INTEGER REFERENCES users(id),
  message_type VARCHAR(50) DEFAULT 'text',
  text_content TEXT,
  media_url TEXT,
  whatsapp_timestamp TIMESTAMP NOT NULL,
  received_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- AI CONTENT GENERATION (WITH APPROVAL)
-- ========================================

CREATE TABLE ai_content_generations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  document_id INTEGER REFERENCES knowledge_documents(id),
  mode VARCHAR(50) NOT NULL, -- draft, improve, summarize, update_requirements
  prompt TEXT NOT NULL,
  context_documents JSONB DEFAULT '[]',
  original_text TEXT,
  generated_content TEXT,
  -- Approval tracking
  approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  -- Metadata
  model_used VARCHAR(100),
  tokens_used INTEGER,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- MICROSOFT 365 INTEGRATION
-- ========================================

CREATE TABLE microsoft_365_connections (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  scopes TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- ========================================
-- SCHEMA MODIFICATIONS (Existing Tables)
-- ========================================

ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  folder_id INTEGER REFERENCES knowledge_folders(id);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  document_type VARCHAR(50) DEFAULT 'internal_kb';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  public_slug VARCHAR(255) UNIQUE;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  access_config JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_docs_folder ON knowledge_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_kb_docs_type ON knowledge_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kb_docs_slug ON knowledge_documents(public_slug);
CREATE INDEX IF NOT EXISTS idx_activity_feed_org ON activity_feed(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_org ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_timestamp ON whatsapp_messages(whatsapp_timestamp);
```

---

## Part 5: UI Layout Descriptions (Detailed Wireframes)

### 5.1 Knowledge Hub Home Page

**URL:** `/knowledge-hub`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📚 Knowledge Hub                    🔍 [Search documents...        ]    │ │
│ │                                                                         │ │
│ │ [+ New ▾]  [Add from Microsoft 365]  [⚙️ Settings]                      │ │
│ │                                                                         │ │
│ │ (New dropdown: Document, Training Module, Report, Folder)               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ LEFT SIDEBAR          │ MAIN CONTENT AREA                                   │
│ (240px fixed width)   │                                                     │
│                       │ ┌─────────────────────────────────────────────────┐ │
│ ┌───────────────────┐ │ │ TAB BAR                                         │ │
│ │ NAVIGATION        │ │ │ [All Docs] [Microsoft 365] [Recent] [Favorites] │ │
│ │                   │ │ └─────────────────────────────────────────────────┘ │
│ │ 📁 All Documents  │ │                                                     │
│ │                   │ │ ┌─────────────────────────────────────────────────┐ │
│ │ 🎓 Training       │ │ │ FOLDER BREADCRUMB                               │ │
│ │   ├ Modules       │ │ │ Home / Training / Certifications                │ │
│ │   ├ My Training   │ │ └─────────────────────────────────────────────────┘ │
│ │   └ Assignments   │ │                                                     │
│ │                   │ │ ┌─────────────────────────────────────────────────┐ │
│ │ 📁 Customer Vault │ │ │ CONTENT GRID                                    │ │
│ │   ├ Contracts     │ │ │                                                 │ │
│ │   └ Policies      │ │ │ ┌──────────┐ ┌──────────┐ ┌──────────┐         │ │
│ │                   │ │ │ │ 📁       │ │ 🎓       │ │ 📄       │         │ │
│ │ ✨ Content Studio │ │ │ │ Safety   │ │ Fiber    │ │ Quick    │         │ │
│ │                   │ │ │ │ 3 items  │ │ Training │ │ Ref Card │         │ │
│ │ 📊 Reports        │ │ │ │          │ │ 50 pts   │ │          │         │ │
│ │                   │ │ │ └──────────┘ └──────────┘ └──────────┘         │ │
│ │ 📂 Internal KB    │ │ │                                                 │ │
│ │                   │ │ └─────────────────────────────────────────────────┘ │
│ │ ─────────────────│ │                                                     │
│ │                   │ │ ┌─────────────────────────────────────────────────┐ │
│ │ ⚙️ Settings       │ │ │ MICROSOFT 365 TAB (when selected)               │ │
│ │ 📈 Analytics      │ │ │                                                 │ │
│ │                   │ │ │ Connect to Microsoft 365 to browse:             │ │
│ └───────────────────┘ │ │   • OneDrive files                              │ │
│                       │ │   • Teams files                                 │ │
│                       │ │                                                 │ │
│                       │ │ [Connect Microsoft 365]                         │ │
│                       │ │                                                 │ │
│                       │ │ (After connected, shows file browser)           │ │
│                       │ └─────────────────────────────────────────────────┘ │
└───────────────────────┴─────────────────────────────────────────────────────┘
```

### 5.2 Knowledge Document Editor (with AI Button)

**URL:** `/knowledge-hub/documents/{id}/edit`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ← Back                             [Preview] [Save Draft] [Publish ▾]   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DOCUMENT METADATA                                                       │ │
│ │ Title: [Warranty Policy                                             ]   │ │
│ │ Type: [Policy ▾]   Folder: [Customer Vault / Policies ▾]               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ EDITOR TOOLBAR                                                          │ │
│ │                                                                         │ │
│ │ [B] [I] [U] │ H1 H2 H3 │ • ─ 1. │ 🔗 📷 │ [/ Link] │ [🤖 AI ▾]         │ │
│ │                                                                         │ │
│ │ (/ Link: Type / to search and insert document links)                    │ │
│ │                                                                         │ │
│ │ (AI Dropdown:                                                           │ │
│ │  • Draft this section                                                   │ │
│ │  • Improve this text                                                    │ │
│ │  • Summarize linked docs                                                │ │
│ │  • Update with requirements)                                            │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ EDITOR CONTENT AREA                                                     │ │
│ │                                                                         │ │
│ │ [Editable rich text...]                                                 │ │
│ │                                                                         │ │
│ │ The warranty policy covers all fiber splicing work...                   │ │
│ │                                                                         │ │
│ │ See also: Installation Guide  ← (Simple text hyperlink, no preview)    │ │
│ │                                                                         │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ / INLINE SEARCH (appears when user types /)                         │ │ │
│ │ │                                                                     │ │ │
│ │ │ Search: [install                                               ]    │ │ │
│ │ │                                                                     │ │ │
│ │ │ 📄 Installation Guide                                               │ │ │
│ │ │ 📄 Installation Checklist                                           │ │ │
│ │ │ 🎓 Installation Training Module                                     │ │ │
│ │ │                                                                     │ │ │
│ │ │ (Click to insert as text link)                                      │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**AI APPROVAL FLOW (Modal appears after AI generates content):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI Generated Content - APPROVAL REQUIRED                          [X Close]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Mode: Draft this section                                                    │
│                                                                             │
│ ┌─ YOUR BRIEF ────────────────────────────────────────────────────────────┐ │
│ │ "Write a claims process section for warranty policy"                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ AI GENERATED CONTENT ──────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ ## Claims Process                                                       │ │
│ │                                                                         │ │
│ │ To file a warranty claim:                                               │ │
│ │                                                                         │ │
│ │ 1. Contact support@company.com                                          │ │
│ │ 2. Provide installation reference number                                │ │
│ │ 3. Describe the issue with photos                                       │ │
│ │                                                                         │ │
│ │ Response time: 5 business days                                          │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ⚠️ This content will NOT be applied until you approve it.                  │
│                                                                             │
│          [Regenerate]        [❌ Reject]        [✓ Approve & Insert]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Training Module Editor

**URL:** `/knowledge-hub/training/modules/{id}/edit`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ← Back to Training    Training Module Editor                            │ │
│ │                                               [Preview] [Save] [Publish]│ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ MODULE SETTINGS                                                         │ │
│ │                                                                         │ │
│ │ Title: [Fiber Splice Certification                                  ]   │ │
│ │ Description: [Complete certification for field technicians          ]   │ │
│ │                                                                         │ │
│ │ Points Value: [50   ] pts  (awarded on completion)                      │ │
│ │                                                                         │ │
│ │ Completion Requirements:                                                │ │
│ │   ○ Complete all steps                                                  │ │
│ │   ○ Pass quiz                                                           │ │
│ │   ● Both (all steps + pass quiz)                                        │ │
│ │                                                                         │ │
│ │ ☑️ Issue certificate on completion                                      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STEPS                                              [🤖 AI Suggest Steps]│ │
│ │                                                                         │ │
│ │ ┌── STEP 1: Video ───────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ Title: [Safety Overview                                         ]   │ │ │
│ │ │ Video URL: [https://youtube.com/watch?v=...                     ]   │ │ │
│ │ │ Embed preview: [YouTube player thumbnail]                           │ │ │
│ │ │ Description (rich text): [Watch this safety video before...     ]   │ │ │
│ │ │ Attachments: [+ Add from Microsoft 365]                             │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 2: Checklist ───────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ Title: [Equipment Verification                                  ]   │ │ │
│ │ │ Items:                                                              │ │ │
│ │ │   ☐ Fusion splicer calibrated                               [🗑️]   │ │ │
│ │ │   ☐ Fiber cleaver blade count < 10,000                      [🗑️]   │ │ │
│ │ │   [+ Add item]                                                      │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 3: Resource ────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ Title: [Splicing Procedure Guide                                ]   │ │ │
│ │ │ Content (rich text editor):                                         │ │ │
│ │ │ ┌─────────────────────────────────────────────────────────────────┐│ │ │
│ │ │ │ [B] [I] [U] │ H1 H2 │ • ─ │ / │ [🤖 AI]                        ││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ ## Splice Procedure                                             ││ │ │
│ │ │ │ 1. Prepare the fibers...                                        ││ │ │
│ │ │ │ 2. Clean with alcohol...                                        ││ │ │
│ │ │ │                                                                 ││ │ │
│ │ │ │ (/ command works here for linking)                              ││ │ │
│ │ │ └─────────────────────────────────────────────────────────────────┘│ │ │
│ │ │ Attachments: 📎 Reference-Card.pdf (Microsoft 365)                  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ┌── STEP 4: Quiz ────────────────────────────────────── ⋮ ▲ ▼ 🗑️ ────┐ │ │
│ │ │ Title: [Knowledge Check                                         ]   │ │ │
│ │ │ Passing Score: [80  %]   Max Attempts: [3]                          │ │ │
│ │ │                                                                     │ │ │
│ │ │ Questions:                          [🤖 Generate Questions from Content]│ │
│ │ │ ┌─────────────────────────────────────────────────────────────────┐│ │ │
│ │ │ │ Q1: What is the correct cleave angle?                    5 pts  ││ │ │
│ │ │ │ Q2: Name 3 safety requirements                           5 pts  ││ │ │
│ │ │ │ Q3: What is acceptable loss threshold?                  10 pts  ││ │ │
│ │ │ │ [+ Add Question]                                                ││ │ │
│ │ │ └─────────────────────────────────────────────────────────────────┘│ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ [+ Add Step: 📺 Video | ☑️ Checklist | 📝 Resource | 🧪 Quiz | 🔧 Task] │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Public Report Builder (Drag-and-Preview)

**URL:** `/knowledge-hub/reports/{id}/build`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ← Back to Reports    Report Builder                                     │ │
│ │                                        [Preview] [Unpublish] [Share 🔗] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ REPORT SETTINGS                                                         │ │
│ │                                                                         │ │
│ │ Title: [Q4 2024 Board Report                                        ]   │ │
│ │ URL: /reports/[q4-2024-board        ]                                   │ │
│ │                                                                         │ │
│ │ Access Control (Role-Based - No Passwords):                             │ │
│ │   Users: [david@investor.com, board@company.com]  [+ Add User]          │ │
│ │   Roles: [☑️ report_viewer] [☑️ admin] [☐ manager]                      │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────┬───────────────────────────────┬───────────────────────┤
│ SECTIONS            │ LIVE PREVIEW                  │ BLOCK PROPERTIES      │
│ (Left, 200px)       │ (Center, flexible)            │ (Right, 300px)        │
│                     │                               │                       │
│ ┌─────────────────┐ │ ┌───────────────────────────┐ │ ┌───────────────────┐ │
│ │ DRAG TO REORDER │ │ │ SECTION: Financial        │ │ │ DATA TABLE BLOCK  │ │
│ │                 │ │ │                           │ │ │                   │ │
│ │ ┌─────────────┐ │ │ │ (Tab bar showing all      │ │ │ Entity:           │ │
│ │ │ Executive   │ │ │ │  sections as preview)     │ │ │ [Revenue Trans ▾] │ │
│ │ │ Summary     │ │ │ │                           │ │ │                   │ │
│ │ └─────────────┘ │ │ │ ┌───────────────────────┐ │ │ │ Filters:          │ │
│ │                 │ │ │ │ Q4 demonstrated strong│ │ │ │ Quarter = Q4 2024 │ │
│ │ ┌─────────────┐ │ │ │ │ financial performance │ │ │ │ [+ Add Filter]    │ │
│ │ │ Financial ● │ │ │ │ │ with 23% growth...    │ │ │ │                   │ │
│ │ │ (selected)  │ │ │ │ └───────────────────────┘ │ │ │ Columns:          │ │
│ │ └─────────────┘ │ │ │                           │ │ │ [✓] Date          │ │
│ │                 │ │ │ ┌───────────────────────┐ │ │ │ [✓] Amount        │ │
│ │ ┌─────────────┐ │ │ │ │ DATA TABLE (selected) │ │ │ │ [✓] Category      │ │
│ │ │ Operations  │ │ │ │ │                       │ │ │ │                   │ │
│ │ └─────────────┘ │ │ │ │ Quarter │ Revenue     │ │ │ │ Sorting:          │ │
│ │                 │ │ │ │ ────────│─────────    │ │ │ │ Date DESC         │ │
│ │ ┌─────────────┐ │ │ │ │ Q1 2024 │ $1,200,000  │ │ │ │                   │ │
│ │ │ Outlook     │ │ │ │ │ Q2 2024 │ $1,350,000  │ │ │ │ Aggregations:     │ │
│ │ └─────────────┘ │ │ │ │ Q3 2024 │ $1,480,000  │ │ │ │ [✓] SUM(Amount)   │ │
│ │                 │ │ │ │ Q4 2024 │ $1,720,000  │ │ │ │ [✓] COUNT(*)      │ │
│ │ [+ Add Section] │ │ │ └───────────────────────┘ │ │ │                   │ │
│ │                 │ │ │                           │ │ │ Joins:            │ │
│ │ ─────────────── │ │ │ ┌───────────────────────┐ │ │ │ [+ Add Join]      │ │
│ │                 │ │ │ │ CHART (Line)          │ │ │ │                   │ │
│ │ BLOCK PALETTE   │ │ │ │                       │ │ │ │ Options:          │ │
│ │                 │ │ │ │ [Chart visualization] │ │ │ │ [✓] Enable CSV    │ │
│ │ ┌─────────────┐ │ │ │ └───────────────────────┘ │ │ │ [☐] Enable PDF    │ │
│ │ │ 📝 Text     │ │ │ │                           │ │ │                   │ │
│ │ └─────────────┘ │ │ │ ┌───────────────────────┐ │ │ └───────────────────┘ │
│ │ ┌─────────────┐ │ │ │ │ DOC SNIPPET           │ │ │                       │
│ │ │ 📊 Table    │ │ │ │ │ From: Q4 Analysis     │ │ │                       │
│ │ └─────────────┘ │ │ │ │ "The fourth quarter..."│ │ │                       │
│ │ ┌─────────────┐ │ │ │ └───────────────────────┘ │ │                       │
│ │ │ 📈 Chart    │ │ │ │                           │ │                       │
│ │ └─────────────┘ │ │ │ DRAG blocks from palette  │ │                       │
│ │ ┌─────────────┐ │ │ │ to preview area           │ │                       │
│ │ │ 📄 Doc      │ │ │ │                           │ │                       │
│ │ └─────────────┘ │ │ └───────────────────────────┘ │                       │
│ │                 │ │                               │                       │
│ └─────────────────┘ │                               │                       │
└─────────────────────┴───────────────────────────────┴───────────────────────┘
```

### 5.5 Public Report Viewer (External-Facing)

**URL:** `/reports/{slug}`

**Login Screen (for report_viewer):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                     ┌───────────────────────────────────┐                   │
│                     │                                   │                   │
│                     │          [COMPANY LOGO]           │                   │
│                     │                                   │                   │
│                     │   Q4 2024 Board Report            │                   │
│                     │                                   │                   │
│                     │   ─────────────────────────────   │                   │
│                     │                                   │                   │
│                     │   Please log in to view this     │                   │
│                     │   report.                        │                   │
│                     │                                   │                   │
│                     │   Email:                          │                   │
│                     │   ┌───────────────────────────┐   │                   │
│                     │   │ david@investor.com        │   │                   │
│                     │   └───────────────────────────┘   │                   │
│                     │                                   │                   │
│                     │   Password:                       │                   │
│                     │   ┌───────────────────────────┐   │                   │
│                     │   │ ••••••••••                │   │                   │
│                     │   └───────────────────────────┘   │                   │
│                     │                                   │                   │
│                     │            [Log In]               │                   │
│                     │                                   │                   │
│                     │   ─────────────────────────────   │                   │
│                     │                                   │                   │
│                     │   Don't have access? Contact     │                   │
│                     │   the report administrator.      │                   │
│                     │                                   │                   │
│                     └───────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Report View (after login):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REPORT HEADER                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [COMPANY LOGO]                                    [📄 Download PDF]     │ │
│ │                                                                         │ │
│ │ Q4 2024 Board Report                                                    │ │
│ │ Published: January 15, 2024                                             │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ SECTION TABS                                                                │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Executive Summary] [Financial ●] [Operations] [Outlook]                │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ SECTION CONTENT: Financial Performance                                      │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ RICH TEXT BLOCK                                                         │ │
│ │                                                                         │ │
│ │ Q4 demonstrated strong financial performance with revenue growth of     │ │
│ │ 23% year-over-year...                                                   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DATA TABLE BLOCK                                      [📥 Download CSV] │ │
│ │                                                                         │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Quarter    │ Revenue      │ Growth    │ Status      │               │ │ │
│ │ ├─────────────────────────────────────────────────────────────────────┤ │ │
│ │ │ Q1 2024    │ $1,200,000   │ +15%      │ ✓ Exceeded  │               │ │ │
│ │ │ Q2 2024    │ $1,350,000   │ +18%      │ ✓ Exceeded  │               │ │ │
│ │ │ Q3 2024    │ $1,480,000   │ +21%      │ ✓ Exceeded  │               │ │ │
│ │ │ Q4 2024    │ $1,720,000   │ +23%      │ ✓ Exceeded  │               │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ CHART BLOCK                                                             │ │
│ │                                                                         │ │
│ │     $1.8M ┤                                              ●              │ │
│ │           │                                         ●                   │ │
│ │     $1.5M ┤                                    ●                        │ │
│ │           │                               ●                             │ │
│ │     $1.2M ┼────────────────────────────────────────────────────────     │ │
│ │           Q1      Q2      Q3      Q4                                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DOCUMENT SNIPPET BLOCK                                                  │ │
│ │                                                                         │ │
│ │ From: Q4 Financial Analysis                                             │ │
│ │ ───────────────────────────                                             │ │
│ │ "The fourth quarter exceeded expectations across all key metrics..."    │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Team Page

**URL:** `/team`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 👥 Team                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─ TAB BAR ───────────────────────────────────────────────────────────────┐ │
│ │ [Directory] [Activity Feed] [WhatsApp Messages]                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ DIRECTORY TAB ─────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ 🔍 [Search team members...                                         ]    │ │
│ │                                                                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │ │
│ │ │   [Avatar]  │ │   [Avatar]  │ │   [Avatar]  │ │   [Avatar]  │        │ │
│ │ │             │ │             │ │             │ │             │        │ │
│ │ │ John Smith  │ │ Lisa Chen   │ │ Mike Wilson │ │ Sarah Davis │        │ │
│ │ │ Field Tech  │ │ CS Manager  │ │ Field Tech  │ │ Operations  │        │ │
│ │ │ 🟢 Active   │ │ 🟡 Away     │ │ 🔵 Meeting  │ │ 🟢 Active   │        │ │
│ │ │             │ │             │ │             │ │             │        │ │
│ │ │ 250 pts     │ │ 180 pts     │ │ 320 pts     │ │ 410 pts     │        │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │ │
│ │                                                                         │ │
│ │ (Click any card to open User Profile sheet)                             │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ ACTIVITY FEED TAB ─────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ Filter: [All Events ▾]                                                  │ │
│ │                                                                         │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🎓 John completed "Fiber Splice Training" (+50 pts)    2 hours ago  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 📄 Lisa published "Warranty Policy v2"                  3 hours ago │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 💰 New Sale: Acme Corp - $15,000 (via automation)      5 hours ago  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ✅ Mike updated Work Item: Zone A Installation        Yesterday     │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ WHATSAPP TAB ──────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ Group: [Field Team ▾]                                                   │ │
│ │                                                                         │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [John Avatar] John Smith (+1-555-0101)              10:30 AM        │ │ │
│ │ │ "Just finished the splice at Zone A, all good!"                     │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [?] Unknown (+1-555-0199)                           10:25 AM        │ │ │
│ │ │ "Can someone bring extra sleeves to site B?"                        │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [Mike Avatar] Mike Wilson (+1-555-0102)             10:20 AM        │ │ │
│ │ │ [📷 Image: Site photo]                                              │ │ │
│ │ │ "Weather looking rough for this afternoon"                          │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ (Read-only display - no posting from Aimee)                             │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**User Profile Sheet (opens when clicking team member):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER PROFILE                                                       [X Close]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ HEADER                                                                  │ │
│ │                                                                         │ │
│ │ [Large Avatar]   John Smith                                             │ │
│ │                  Field Technician                                       │ │
│ │                  🟢 Active                                              │ │
│ │                                                                         │ │
│ │                  ⭐ 250 points                                          │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ TRAINING ──────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ Completed: 5 modules                                                    │ │
│ │ In Progress: 2 modules                                                  │ │
│ │                                                                         │ │
│ │ Recent:                                                                 │ │
│ │   ✓ Fiber Splice Training (50 pts)              Completed Feb 15       │ │
│ │   ✓ Safety Fundamentals (30 pts)                Completed Feb 10       │ │
│ │   ● Customer Service (20%)                      Due Mar 5              │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ WORK ITEMS ────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ Active: 4    Completed This Week: 8    🔴 Stuck/Blocked: 1             │ │
│ │                                                                         │ │
│ │   🔴 Zone B Installation (BLOCKED - waiting for permits)               │ │
│ │   🟡 Zone A Maintenance (In Progress)                                  │ │
│ │   🟢 Customer Setup - Acme (Ready)                                     │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ OBJECTIVES & KEY RESULTS ──────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ Owns:                                                                   │ │
│ │   🎯 Complete Q1 Installations (Progress: 75%)                         │ │
│ │                                                                         │ │
│ │ Contributes to:                                                         │ │
│ │   🎯 Expand Network Coverage (KR: Zone Installations)                  │ │
│ │   🎯 Improve Customer Satisfaction (KR: On-time completions)           │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─ RECENT ACTIVITY ───────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │ • Completed work item "Zone A Setup"                      2 hours ago  │ │
│ │ • Updated progress on KR "Zone Installations"             3 hours ago  │ │
│ │ • Completed training "Fiber Splice Training"             Yesterday     │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                      [Assign Work Item]  [Send Message]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Technical Integration Notes

### 6.1 Microsoft Graph API Integration

**Scope Required:**
```
Files.Read.All        - Read files from OneDrive and SharePoint
Sites.Read.All        - Read SharePoint sites (for Teams files)
Team.ReadBasic.All    - Read Teams the user is member of
Channel.ReadBasic.All - Read channel information
offline_access        - For refresh tokens
```

**Authentication Flow:**
1. User clicks "Connect Microsoft 365"
2. Redirect to Microsoft OAuth2 authorization endpoint
3. User grants permissions
4. Exchange authorization code for tokens
5. Store encrypted tokens in `microsoft_365_connections` table
6. Refresh tokens automatically before expiry

**File Browser Implementation:**
```typescript
// Get user's OneDrive root
GET /me/drive/root/children

// Navigate folders
GET /me/drive/items/{folder_id}/children

// Get Teams user is member of
GET /me/joinedTeams

// Get Team channels
GET /teams/{team_id}/channels

// Get channel files (files are in SharePoint)
GET /teams/{team_id}/channels/{channel_id}/filesFolder
GET /drives/{drive_id}/items/{folder_id}/children

// File metadata for External File Link
GET /drives/{drive_id}/items/{item_id}
Response includes: name, size, mimeType, webUrl, @microsoft.graph.downloadUrl
```

**Opening Files:**
- Store `webUrl` from Graph API in document metadata
- On click: `window.location.href = webUrl` (same tab, opens in Microsoft viewer)

### 6.2 WhatsApp Bridge Architecture

**Bridge/Bot Component (External Service):**
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   WhatsApp      │ ───── │   Bridge Bot    │ ───── │     Aimee       │
│   Groups        │       │   (External)    │       │     API         │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

**Bridge Implementation Options:**
1. **WhatsApp Business API** (recommended for official support)
2. **WhatsApp Web automation** (requires compliance review)
3. **Third-party bridge** (e.g., wwebjs, Baileys)

**Aimee API Endpoint:**
```typescript
// POST /api/whatsapp/inbound
interface WhatsAppInboundMessage {
  groupId: string;
  groupName: string;
  senderPhone: string;
  senderName: string;
  messageType: 'text' | 'image' | 'video' | 'document';
  textContent?: string;
  mediaUrl?: string;  // URL to media file (stored by bridge)
  whatsappTimestamp: string;
}
```

**User Matching:**
- Query `users` table by phone number
- If match found, set `matched_user_id` and display user's avatar
- If no match, display generic avatar with phone number

**Future Enhancements (v2+):**
- Media storage in Aimee
- Automated categorization of messages
- Marketing asset generation from media

### 6.3 AI Approval Pipeline

**CRITICAL: AI never auto-commits any changes**

**Flow:**
```
1. User triggers AI mode (Draft/Improve/Summarize/Update)
2. AI generates content
3. Generated content stored in ai_content_generations with status='pending'
4. Preview shown to user in modal
5. User chooses:
   - [Approve & Insert] → status='approved', content inserted
   - [Reject] → status='rejected', content discarded
   - [Regenerate] → New generation created, old stays pending
6. All actions logged in activity log
```

**For External Files (PDF/Word) with AI:**
```
1. User requests AI analysis of external file
2. System checks external_file_registry.extracted_text
3. If null/stale:
   a. Fetch file from Microsoft Graph API
   b. Extract text using appropriate parser:
      - PDF: pdf-parse
      - DOCX: mammoth.js
   c. Store in extracted_text column
4. AI processes extracted text
5. AI suggests changes → User approval required
6. If approved and file is editable:
   - For DOCX: Use docx library to apply changes
   - For PDF: Generate annotated version or suggest manual edits
   - Upload new version via Graph API
7. All changes logged
```

### 6.4 PDF/Word Parsing

**Parsing Libraries:**
```typescript
// PDF extraction
import pdfParse from 'pdf-parse';

async function extractPdfText(fileBuffer: Buffer): Promise<string> {
  const data = await pdfParse(fileBuffer);
  return data.text;
}

// DOCX extraction
import mammoth from 'mammoth';

async function extractDocxText(fileBuffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return result.value;
}

// XLSX extraction (for reference, less common for AI)
import xlsx from 'xlsx';

async function extractXlsxText(fileBuffer: Buffer): Promise<string> {
  const workbook = xlsx.read(fileBuffer);
  // Convert sheets to text representation
  return Object.values(workbook.Sheets)
    .map(sheet => xlsx.utils.sheet_to_csv(sheet))
    .join('\n\n');
}
```

**Text Extraction Pipeline:**
```typescript
async function extractTextForAI(documentId: number): Promise<string> {
  const doc = await getDocument(documentId);
  
  if (doc.document_type !== 'external_file_link') {
    return doc.content; // Internal documents have content directly
  }
  
  const metadata = doc.metadata as ExternalFileMetadata;
  
  // Check cache
  if (metadata.extracted_text && isRecent(metadata.extracted_at)) {
    return metadata.extracted_text;
  }
  
  // Fetch from Microsoft Graph
  const fileBuffer = await downloadFromGraph(metadata.graph_drive_id, metadata.graph_item_id);
  
  // Extract based on mime type
  let text: string;
  switch (metadata.mime_type) {
    case 'application/pdf':
      text = await extractPdfText(fileBuffer);
      break;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      text = await extractDocxText(fileBuffer);
      break;
    default:
      throw new Error(`Unsupported file type: ${metadata.mime_type}`);
  }
  
  // Cache extracted text
  await updateDocumentMetadata(documentId, {
    extracted_text: text,
    extracted_at: new Date().toISOString()
  });
  
  return text;
}
```

### 6.5 Internal Document Linking (/ Command)

**Implementation:**
- Uses TipTap editor with custom extension
- Typing `/` triggers inline suggestion popup (NOT modal)
- Popup shows as user types: `/` → `/bra` → `/brand`
- Results filtered in real-time
- Selecting a result inserts a simple text hyperlink

**Editor Extension:**
```typescript
// TipTap Slash Command Extension
const SlashCommand = Extension.create({
  name: 'slashCommand',
  
  addKeyboardShortcuts() {
    return {
      '/': () => {
        // Show inline popup positioned at cursor
        this.editor.commands.showSlashMenu();
        return true;
      }
    };
  }
});

// Popup behavior:
// - Positioned inline at cursor (not centered modal)
// - Shows search input + results
// - Up/Down to navigate
// - Enter to select
// - Escape to close
// - Inserts: <a href="/knowledge-hub/documents/{id}">{title}</a>
```

**Works in:**
- Knowledge Documents (rich text editor)
- Training Module steps (resource content)
- Public Report rich text blocks

---

## Part 7: Migration Strategy

### 7.1 Migration Phases

```
Phase 0: Preparation (1-2 days)
├── Create new database tables
├── Add columns to existing tables
├── Deploy Microsoft Graph integration (disabled)
├── Deploy WhatsApp bridge endpoint (disabled)
└── Test on development database

Phase 1: Parallel Operation (1 week)
├── Enable new UI alongside existing
├── New documents use new system
├── Existing documents unchanged
└── Feature flags for new features

Phase 2: Content Migration (1 week)
├── Auto-create folders from categories
├── Move documents to folders
├── Preserve assignments and progress
└── URL redirects active

Phase 3: Full Cutover (2-3 days)
├── New navigation active
├── Old UI hidden
├── Microsoft 365 integration enabled
├── Team Page enabled
└── WhatsApp bridge enabled

Phase 4: Cleanup (1 week)
├── Remove deprecated code
├── Performance optimization
├── Documentation update
└── User training
```

### 7.2 Rollback Capability

At each phase:
- Database changes are additive (no destructive migrations)
- Feature flags allow instant disable
- Old data remains accessible
- Full audit logging

---

## Part 8: Implementation Phases (12-Week Timeline)

### Phase 1: Foundation (Week 1-2)
- Database schema creation
- Folder CRUD API + UI
- Document type extensions
- Microsoft Graph OAuth setup

### Phase 2: Training Modules (Week 3-4)
- Training module editor
- Step types implementation
- Quiz system with custom points
- Progress tracking
- Points system

### Phase 3: Document Lifecycle (Week 5-6)
- Lifecycle status workflow
- Expiration tracking + alerts
- Version comparison
- Entity linking

### Phase 4: AI Integration (Week 7-8)
- AI button with modes
- Approval workflow (NEVER auto-commit)
- PDF/Word parsing
- Activity logging

### Phase 5: Public Reports (Week 9-10)
- Report builder (drag-and-preview)
- Visual query builder
- Block types (text, table, chart, snippet)
- Role-based access (no passwords)

### Phase 6: Team & Integration (Week 11-12)
- Team Page with directory
- User profile with points
- Activity feed
- WhatsApp bridge (read-only)
- Microsoft 365 file browser
- Migration wizard

---

## Part 9: Verification Checklist

Before development, verify these are unambiguous:

### External Files
- [ ] Files always open in Microsoft viewer in same browser tab
- [ ] Only metadata stored in Aimee (no binary content)
- [ ] Microsoft Graph API for OneDrive and Teams browsing
- [ ] External File Link Documents are pointers, not copies

### Document Linking
- [ ] Simple text hyperlinks only (no preview cards)
- [ ] / command triggers inline search (not modal)
- [ ] Works in: Knowledge Docs, Training Modules, Public Reports

### Training Modules
- [ ] All step content stored in Aimee's DB
- [ ] Steps can include: rich text, checklists, embedded video, external file links
- [ ] Completion requirements: all steps / pass quiz / both (creator chooses)
- [ ] Custom points per module and per quiz question
- [ ] Points displayed on Profile and Team Page
- [ ] No leaderboard

### Team Page
- [ ] Team Directory with avatars, names, roles, status
- [ ] User Profile shows: points, training, work items, OKRs, activity
- [ ] Stuck/blocked work items highlighted
- [ ] Activity Feed with automation integration
- [ ] WhatsApp read-only display with user matching

### Public Reports
- [ ] Role-based access ONLY (no password option)
- [ ] report_viewer role can only access Profile and assigned Reports
- [ ] Access lists support: specific users + roles
- [ ] Drag-and-preview builder (not modal-driven)
- [ ] Visual query builder with filters, sorting, aggregations, joins

### AI Assistant
- [ ] ALWAYS requires human approval
- [ ] NEVER auto-commits
- [ ] Supports: drafting, rewriting, summarizing, updating with web search
- [ ] External files: extract text via parser, AI suggests, human approves

---

*Document Version: 3.0*
*Last Updated: November 2024*
*Changes from v2:*
- *Microsoft Graph API integration replaces generic external storage*
- *Role-based access for reports (no passwords)*
- *Points system with custom values*
- *Team Page with directory, activity feed, WhatsApp*
- *Drag-and-preview report builder*
- *Visual query builder with joins*
- *AI always requires human approval*
- */ command for inline document linking*
