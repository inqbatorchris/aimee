# Knowledge Base Enterprise Transformation - Implementation Plan

## Executive Summary

This plan transforms the existing Knowledge Base from an MVP document repository into an **Enterprise Document Intelligence Hub** with AI-native workflows. The implementation preserves all existing infrastructure (menu/pages tables, Drizzle ORM, React stack) while adding new capabilities for training playbooks, customer document management, and AI-powered content generation.

**Core Principle:** User Journeys First, Technical Implementation Second

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

---

## Part 2: User Journeys (Core Scope Definition)

### Journey 1: Training Manager Creates Playbook

**Persona:** Sarah, Operations Manager
**Goal:** Create step-by-step onboarding guide for new field technicians

**Current Experience:**
1. Creates a single long document
2. Manually tracks who has read it
3. No way to verify comprehension
4. No structured learning path

**Target Experience:**
```
1. Opens Knowledge Hub → Training section
2. Clicks "New Playbook" → Wizard opens
3. Defines playbook metadata:
   - Title: "Fiber Splice Certification"
   - Audience: Field Technicians
   - Estimated time: 2 hours
   - Prerequisites: Basic Tools Training
4. Adds Steps:
   - Step 1: Safety Overview (video + acknowledgment)
   - Step 2: Equipment Checklist (interactive checklist)
   - Step 3: Procedure Guide (rich text with images)
   - Step 4: Knowledge Check (quiz with passing score)
   - Step 5: Hands-On Assessment (supervisor sign-off)
5. Sets completion requirements:
   - All steps completed
   - Quiz score ≥ 80%
   - Supervisor approval
6. Assigns to team with due date
7. Monitors progress dashboard
```

**Required Features:**
- Playbook builder with step types
- Progress tracking per user
- Quiz/assessment system
- Completion certificates
- Assignment management

---

### Journey 2: Field Technician Completes Training

**Persona:** Mike, New Field Technician
**Goal:** Complete required training before first job

**Current Experience:**
1. Receives email with document link
2. Opens document, skims content
3. No verification of completion
4. No clear progress indicator

**Target Experience:**
```
1. Opens Training Dashboard (My Training tab)
2. Sees assigned playbooks with progress bars
3. Clicks "Fiber Splice Certification" (Due: 3 days)
4. Step-by-step guided experience:
   - Step 1: Watches video, clicks "I acknowledge"
   - Step 2: Checks off equipment items
   - Step 3: Reads procedure, takes notes
   - Step 4: Completes quiz (85% - PASS)
   - Step 5: Schedules hands-on with supervisor
5. Supervisor signs off in field app
6. Receives completion certificate
7. Certification added to profile
```

**Required Features:**
- Personal training dashboard
- Progress persistence (resume where left off)
- Offline support for field completion
- Mobile-responsive step viewer
- Certificate generation

---

### Journey 3: Customer Success Manager Manages Contracts

**Persona:** Lisa, Customer Success Manager
**Goal:** Store and manage customer contracts with lifecycle tracking

**Current Experience:**
1. Documents scattered in shared drive
2. No expiration tracking
3. Manual version control
4. No audit trail

**Target Experience:**
```
1. Opens Knowledge Hub → Customer Documents
2. Navigates folder hierarchy:
   Enterprise Customers/
   ├── Acme Corp/
   │   ├── Contracts/
   │   │   ├── MSA-2024.pdf (expires in 30 days ⚠️)
   │   │   └── SLA-Addendum.pdf
   │   └── Policies/
   └── TechStart Inc/
3. Clicks "MSA-2024.pdf"
4. Sees document details:
   - Status: Active (expires March 15)
   - Version: 2.1 (3 previous versions)
   - Related: Linked to Acme Corp account
   - Activity: Last reviewed by John, Jan 10
5. Receives automated email: "Contract expires in 30 days"
6. Initiates renewal workflow
7. Uploads new version with change summary
8. Old version archived, audit trail preserved
```

**Required Features:**
- Folder hierarchy with drag/drop
- Document lifecycle (draft → active → expiring → archived)
- Expiration tracking with alerts
- Version comparison
- Customer/entity linking
- Audit trail

---

### Journey 4: Marketing Lead Generates Content with AI

**Persona:** Alex, Marketing Coordinator
**Goal:** Create campaign content using AI assistance

**Current Experience:**
1. Opens external AI tool
2. Manually provides context
3. Copies output to document
4. No brand consistency
5. No content library integration

**Target Experience:**
```
1. Opens Knowledge Hub → Content Studio
2. Clicks "AI Generate" → Content wizard opens
3. Selects content type: "Marketing Email"
4. AI asks clarifying questions:
   - Target audience? → "Enterprise IT Directors"
   - Campaign theme? → "Q2 Fiber Expansion"
   - Tone? → "Professional, solution-focused"
5. AI retrieves context:
   - Company brand guidelines (from KB)
   - Previous successful campaigns (from KB)
   - Product specifications (from KB)
6. AI generates draft with:
   - Subject line options
   - Email body
   - Call-to-action variants
7. Alex reviews, requests refinement:
   "Make the CTA more urgent"
8. Final version saved to Content Library
9. Links to campaign in work items
```

**Required Features:**
- AI content wizard with templates
- Brand context retrieval
- Multi-variant generation
- Content approval workflow
- Campaign linking

---

### Journey 5: Support Agent Uses AI to Answer Customer Questions

**Persona:** Tom, Support Agent
**Goal:** Quickly find and share accurate information

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
   - Cites source document
4. AI responds:
   "Based on our Fiber Services Warranty Policy (last updated: Jan 2024),
   fiber splicing work is covered for 5 years from installation date.
   Coverage includes: [list]. Exclusions: [list].
   Source: /Customer Documents/Policies/Fiber-Warranty-Policy.pdf"
5. Tom clicks "Share with Customer" button
6. Response formatted and added to ticket
7. Usage tracked for KB analytics
```

**Required Features:**
- Semantic search across KB
- Source citation
- Freshness indicators
- Share/export to tickets
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
   - Convert 2 docs to Playbook format
5. Admin reviews and approves
6. Migration runs with:
   - Progress bar
   - Rollback capability
   - Audit log
7. Old URLs redirect to new locations
8. No broken links or lost data
```

**Required Features:**
- Migration analysis tool
- Category-to-folder converter
- Bulk operations
- URL redirection
- Rollback capability

---

## Part 3: Information Architecture

### 3.1 New Document Type Hierarchy

```
Knowledge Hub/
├── Training Center/
│   ├── Playbooks/ (step-based learning)
│   │   ├── Onboarding/
│   │   ├── Certifications/
│   │   └── Procedures/
│   └── Quick References/ (single-page docs)
│
├── Customer Vault/
│   ├── Contracts/
│   ├── Policies/
│   ├── Terms & Conditions/
│   └── By Customer/
│       └── [Dynamic folders per customer]
│
├── Content Studio/
│   ├── Marketing/
│   │   ├── Email Templates/
│   │   ├── Social Posts/
│   │   └── Campaign Assets/
│   ├── Website Content/
│   └── PR & Communications/
│
└── Internal KB/ (existing behavior)
    └── [Migrated content]
```

### 3.2 Extended Document Types

```typescript
// Extended documentTypes.ts
export const documentTypeConfig = {
  // Existing types (preserved)
  internal_kb: { ... },
  website_page: { ... },
  customer_kb: { ... },
  marketing_email: { ... },
  marketing_letter: { ... },
  attachment: { ... },
  
  // New types
  playbook: {
    label: 'Training Playbook',
    icon: 'GraduationCap',
    color: 'emerald',
    features: ['steps', 'progress', 'quiz', 'certification']
  },
  contract: {
    label: 'Contract',
    icon: 'FileSignature',
    color: 'amber',
    features: ['lifecycle', 'expiration', 'versions', 'approval']
  },
  policy: {
    label: 'Policy Document',
    icon: 'Shield',
    color: 'blue',
    features: ['lifecycle', 'acknowledgment', 'versions']
  },
  template: {
    label: 'Content Template',
    icon: 'LayoutTemplate',
    color: 'violet',
    features: ['ai_generation', 'variables', 'variants']
  },
  quick_reference: {
    label: 'Quick Reference',
    icon: 'Zap',
    color: 'yellow',
    features: ['searchable', 'printable']
  }
};
```

---

## Part 4: Database Schema Extensions

### 4.1 New Tables Required

```sql
-- Folder hierarchy for document organization
CREATE TABLE knowledge_folders (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  parent_id INTEGER REFERENCES knowledge_folders(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  folder_type VARCHAR(50) DEFAULT 'general', -- training, customer, content, internal
  icon VARCHAR(100),
  color VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE, -- Cannot be deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, parent_id, slug)
);

-- Playbook steps for training content
CREATE TABLE playbook_steps (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  step_type VARCHAR(50) NOT NULL, -- content, video, quiz, checklist, signature, assessment
  content TEXT, -- Rich text content
  config JSONB DEFAULT '{}', -- Type-specific configuration
  required BOOLEAN DEFAULT TRUE,
  estimated_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quiz questions for playbook assessments
CREATE TABLE playbook_quiz_questions (
  id SERIAL PRIMARY KEY,
  step_id INTEGER REFERENCES playbook_steps(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, short_answer
  options JSONB, -- For multiple choice
  correct_answer TEXT,
  explanation TEXT, -- Shown after answer
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User progress through playbooks
CREATE TABLE playbook_progress (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assignment_id INTEGER REFERENCES document_assignments(id),
  current_step_id INTEGER REFERENCES playbook_steps(id),
  status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_time_seconds INTEGER DEFAULT 0,
  quiz_score DECIMAL(5,2),
  quiz_attempts INTEGER DEFAULT 0,
  step_completions JSONB DEFAULT '{}', -- {step_id: {completed_at, data}}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(document_id, user_id, assignment_id)
);

-- Document lifecycle management
CREATE TABLE document_lifecycle (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  lifecycle_status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, active, expiring, expired, archived
  effective_date DATE,
  expiration_date DATE,
  review_date DATE,
  review_cycle_days INTEGER, -- Auto-set next review
  last_reviewed_at TIMESTAMP,
  last_reviewed_by INTEGER REFERENCES users(id),
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer/entity document relationships
CREATE TABLE document_entity_links (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- customer, project, product, team
  entity_id INTEGER NOT NULL,
  entity_name VARCHAR(255), -- Denormalized for display
  link_type VARCHAR(50) DEFAULT 'related', -- primary, related, reference
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI generation history
CREATE TABLE ai_content_generations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  document_id INTEGER REFERENCES knowledge_documents(id),
  content_type VARCHAR(50) NOT NULL, -- email, social_post, article, etc.
  prompt TEXT NOT NULL,
  context_documents JSONB DEFAULT '[]', -- KB docs used as context
  model_used VARCHAR(100),
  generated_content TEXT,
  variants JSONB DEFAULT '[]', -- Alternative versions
  feedback_rating INTEGER, -- 1-5 stars
  feedback_notes TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Schema Modifications (Existing Tables)

```sql
-- Add to knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  folder_id INTEGER REFERENCES knowledge_folders(id),
  document_type VARCHAR(50) DEFAULT 'internal_kb',
  is_template BOOLEAN DEFAULT FALSE,
  template_variables JSONB DEFAULT '[]',
  search_vector TSVECTOR, -- For full-text search
  embedding_id VARCHAR(255), -- For semantic search
  last_ai_indexed_at TIMESTAMP;

-- Add indexes for new columns
CREATE INDEX idx_kb_docs_folder ON knowledge_documents(folder_id);
CREATE INDEX idx_kb_docs_type ON knowledge_documents(document_type);
CREATE INDEX idx_kb_docs_search ON knowledge_documents USING GIN(search_vector);
```

---

## Part 5: UI Mockups (Conceptual)

### 5.1 Knowledge Hub Main Navigation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Knowledge Hub                                              [+ New] [⚙️] │
├────────────────┬────────────────────────────────────────────────────────┤
│                │                                                        │
│  📚 All Docs   │  ┌──────────────────────────────────────────────────┐ │
│                │  │ 🔍 Search documents, playbooks, or ask AI...    │ │
│  🎓 Training   │  └──────────────────────────────────────────────────┘ │
│    ├ Playbooks │                                                        │
│    ├ My Progress│ ┌─────────────────────────────────────────────────────┐│
│    └ Assignments│ │ Quick Actions                                       ││
│                │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    ││
│  📁 Customer   │  │ │ 📝 New  │ │ 📚 New  │ │ 🤖 AI   │ │ 📊 View │    ││
│    ├ Contracts │  │ │Document │ │Playbook │ │Generate │ │Analytics│    ││
│    ├ Policies  │  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘    ││
│    └ By Account│  └─────────────────────────────────────────────────────┘│
│                │                                                        │
│  ✨ Content    │  ┌─────────────────────────────────────────────────────┐│
│    ├ Marketing │  │ Recent Documents                          [View All]││
│    ├ Templates │  │ ┌────────────────────────────────────────────────┐ ││
│    └ AI Drafts │  │ │ 📘 Fiber Splice Certification Playbook        │ ││
│                │  │ │    Training • 5 steps • Updated 2 days ago    │ ││
│  📂 Internal   │  │ └────────────────────────────────────────────────┘ ││
│    └ [folders] │  │ ┌────────────────────────────────────────────────┐ ││
│                │  │ │ 📄 MSA-2024-AcmeCorp                     ⚠️    │ ││
│ ─────────────  │  │ │    Contract • Expires in 28 days              │ ││
│  ⚙️ Settings   │  │ └────────────────────────────────────────────────┘ ││
│  📊 Analytics  │  │ ┌────────────────────────────────────────────────┐ ││
│                │  │ │ 📝 Q2 Fiber Expansion Email                   │ ││
│                │  │ │    Marketing • Draft • AI Generated           │ ││
│                │  │ └────────────────────────────────────────────────┘ ││
│                │  └─────────────────────────────────────────────────────┘│
└────────────────┴────────────────────────────────────────────────────────┘
```

### 5.2 Playbook Builder

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Training     Fiber Splice Certification          [Preview][Save]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─ Playbook Settings ──────────────────────────────────────────────────┐│
│ │ Title: [Fiber Splice Certification                              ]   ││
│ │ Description: [Complete training program for field technicians   ]   ││
│ │ Audience: [Field Technicians ▼]  Est. Time: [2 hours]  📋 Prerequisites││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Steps (Drag to reorder) ────────────────────────────────────────────┐│
│ │                                                                      ││
│ │  ┌─ Step 1 ──────────────────────────────────────────────── ⋮ 🗑️ ─┐ ││
│ │  │ 📺 Video: Safety Overview                                      │ ││
│ │  │ Video URL: [https://...                                  ]     │ ││
│ │  │ ☑️ Require acknowledgment    Est: [10 min]                     │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ │  ┌─ Step 2 ──────────────────────────────────────────────── ⋮ 🗑️ ─┐ ││
│ │  │ ☑️ Checklist: Equipment Verification                           │ ││
│ │  │ Items:                                                         │ ││
│ │  │   □ Fusion splicer (calibrated within 30 days)                │ ││
│ │  │   □ Fiber cleaver (blade count < 10,000)                      │ ││
│ │  │   □ Splice sleeves (min 20 units)              [+ Add Item]   │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ │  ┌─ Step 3 ──────────────────────────────────────────────── ⋮ 🗑️ ─┐ ││
│ │  │ 📝 Content: Splicing Procedure                                 │ ││
│ │  │ ┌────────────────────────────────────────────────────────────┐ │ ││
│ │  │ │ [Rich Text Editor with images, videos, etc.]               │ │ ││
│ │  │ │                                                            │ │ ││
│ │  │ └────────────────────────────────────────────────────────────┘ │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ │  ┌─ Step 4 ──────────────────────────────────────────────── ⋮ 🗑️ ─┐ ││
│ │  │ 🧪 Quiz: Knowledge Check                      Passing: [80%]   │ ││
│ │  │ Questions: 10    Max Attempts: [3]                             │ ││
│ │  │ [Edit Questions]                                               │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ │  [+ Add Step: 📝 Content | 📺 Video | ☑️ Checklist | 🧪 Quiz | ✍️ Signature]││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Completion Requirements ─────────────────────────────────────────────┐│
│ │ ☑️ All steps completed   ☑️ Quiz passed (80%)   ☐ Supervisor sign-off ││
│ │ ☑️ Issue certificate on completion                                   ││
│ └───────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Customer Document Vault with Folders

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Customer Documents                              [+ New Folder] [Upload] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 📍 Breadcrumb: Customer Documents / Enterprise / Acme Corp / Contracts  │
│                                                                         │
│ ┌─ Folder Contents ────────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │ ┌────────────────────────────────────────────────────────────────┐  ││
│ │ │ 📁 Archived                                           ⋮        │  ││
│ │ │    3 documents                                                 │  ││
│ │ └────────────────────────────────────────────────────────────────┘  ││
│ │                                                                      ││
│ │ ┌────────────────────────────────────────────────────────────────┐  ││
│ │ │ 📄 MSA-2024.pdf                               ⚠️ Exp. 28d  ⋮   │  ││
│ │ │    Contract • v2.1 • Active                                    │  ││
│ │ │    Last reviewed: Jan 10, 2024 by John Smith                   │  ││
│ │ │    [View] [Download] [New Version] [Start Renewal]             │  ││
│ │ └────────────────────────────────────────────────────────────────┘  ││
│ │                                                                      ││
│ │ ┌────────────────────────────────────────────────────────────────┐  ││
│ │ │ 📄 SLA-Addendum-2024.pdf                                   ⋮   │  ││
│ │ │    Contract • v1.0 • Active                                    │  ││
│ │ │    Effective: Mar 1, 2024 • No expiration                      │  ││
│ │ │    [View] [Download] [New Version]                             │  ││
│ │ └────────────────────────────────────────────────────────────────┘  ││
│ │                                                                      ││
│ │ ┌────────────────────────────────────────────────────────────────┐  ││
│ │ │ 📄 NDA-Mutual.pdf                                          ⋮   │  ││
│ │ │    Policy • v1.2 • Active                                      │  ││
│ │ │    Requires acknowledgment: 15/18 completed                    │  ││
│ │ │    [View] [Download] [Track Acknowledgments]                   │  ││
│ │ └────────────────────────────────────────────────────────────────┘  ││
│ │                                                                      ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Lifecycle Dashboard ─────────────────────────────────────────────────┐│
│ │  Expiring Soon (30 days)      Pending Review         Needs Approval  ││
│ │  ┌─────────────────┐         ┌─────────────────┐    ┌─────────────────┐││
│ │  │   ⚠️ 3 docs     │         │   📋 5 docs     │    │   ⏳ 2 docs     │││
│ │  └─────────────────┘         └─────────────────┘    └─────────────────┘││
│ └───────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 AI Content Generation Wizard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Content Studio                                              [Close] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 2 of 4: Define Your Content                                       │
│  ━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━                                    │
│                                                                         │
│ ┌─ Content Type ────────────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             ││
│ │  │ ✉️ Email │  │ 📱 Social│  │ 📰 Article│  │ 📄 Page  │             ││
│ │  │ ✓ Selected│ │          │  │          │  │          │             ││
│ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘             ││
│ │                                                                      ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Content Brief ───────────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │  Campaign/Topic: [Q2 Fiber Network Expansion                    ]   ││
│ │                                                                      ││
│ │  Target Audience:                                                    ││
│ │  [Enterprise IT Directors and Network Engineers              ▼]     ││
│ │                                                                      ││
│ │  Key Message:                                                        ││
│ │  ┌────────────────────────────────────────────────────────────────┐ ││
│ │  │ Announce our Q2 expansion bringing 10Gbps fiber to 5 new      │ ││
│ │  │ enterprise zones. Highlight speed, reliability, and special   │ ││
│ │  │ early-adopter pricing available through March 31.             │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ │  Tone: [Professional ▼]  Length: [Medium (200-400 words) ▼]         ││
│ │                                                                      ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Context Documents (AI will reference these) ─────────────────────────┐│
│ │                                                                      ││
│ │  ☑️ Brand Voice Guidelines                           Auto-included  ││
│ │  ☑️ Q2 Expansion Technical Specs                     Auto-included  ││
│ │  ☐ Previous Expansion Campaign (Q4 2023)            [Add]           ││
│ │  ☐ Customer Testimonials Collection                 [Add]           ││
│ │                                                                      ││
│ │  [+ Add Document from Knowledge Base]                                ││
│ │                                                                      ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│              [← Back]                                    [Generate →]   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Training Progress Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ My Training                                          [Download Certs]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─ Active Training ─────────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │  ┌────────────────────────────────────────────────────────────────┐ ││
│ │  │ 🎓 Fiber Splice Certification                 Due: Mar 5, 2024 │ ││
│ │  │                                                                │ ││
│ │  │  Progress: ████████████░░░░░░░░ 60%                            │ ││
│ │  │  Step 3 of 5: Splicing Procedure                               │ ││
│ │  │  Time spent: 45 min / Est. 2 hours                             │ ││
│ │  │                                                                │ ││
│ │  │  ✓ Step 1: Safety Overview                                     │ ││
│ │  │  ✓ Step 2: Equipment Verification                              │ ││
│ │  │  ● Step 3: Splicing Procedure (In Progress)                    │ ││
│ │  │  ○ Step 4: Knowledge Check                                     │ ││
│ │  │  ○ Step 5: Hands-On Assessment                                 │ ││
│ │  │                                                         [Continue]│ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ │  ┌────────────────────────────────────────────────────────────────┐ ││
│ │  │ 📖 Customer Service Excellence                Due: Mar 15, 2024│ ││
│ │  │  Progress: ████░░░░░░░░░░░░░░░░ 20%    Step 1 of 4             │ ││
│ │  │                                                         [Start] │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Completed (3) ───────────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │  ┌────────────────────────────────────────────────────────────────┐ ││
│ │  │ ✅ Safety Fundamentals                    Completed: Feb 15    │ ││
│ │  │    Score: 95%  |  Time: 1.5 hrs  |  Certificate: [Download]   │ ││
│ │  └────────────────────────────────────────────────────────────────┘ ││
│ │                                                                      ││
│ └───────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Migration Strategy

### 6.1 Migration Phases

```
Phase 0: Preparation (No user impact)
├── Create new database tables
├── Add new columns to knowledge_documents
├── Build migration scripts
└── Test on development database

Phase 1: Parallel Operation (Low risk)
├── Deploy new UI alongside existing
├── New documents use new system
├── Existing documents unchanged
└── Dual navigation available

Phase 2: Content Migration (Medium risk)
├── Auto-create folders from categories
├── Move documents to appropriate folders
├── Convert tagged docs to new types
└── Preserve all existing data

Phase 3: Full Cutover (Higher risk)
├── Update menu to new Knowledge Hub
├── Redirect old URLs
├── Archive old UI code
└── Enable all new features

Phase 4: Cleanup (No user impact)
├── Remove deprecated code paths
├── Archive old navigation items
├── Update documentation
└── Performance optimization
```

### 6.2 Data Migration Rules

```typescript
// Migration mapping from categories to folders
const categoryToFolderMapping = {
  'Platform Documentation': {
    folder: '/Internal/Platform Documentation',
    documentType: 'internal_kb'
  },
  'AI Tools': {
    folder: '/Internal/AI Tools',
    documentType: 'internal_kb'
  },
  'AI Assistant Instructions': {
    folder: '/Internal/AI Configuration',
    documentType: 'internal_kb',
    flags: { isSystemDoc: true }
  },
  'User Guide': {
    folder: '/Training/Quick References',
    documentType: 'quick_reference'
  },
  'Getting Started': {
    folder: '/Training/Onboarding',
    documentType: 'quick_reference',
    suggestPlaybookConversion: true
  }
};

// Documents with multiple step-like sections → suggest playbook conversion
const playbookCandidates = documents.filter(doc => {
  const headingCount = (doc.content.match(/^##?\s/gm) || []).length;
  return headingCount >= 5 && doc.categories.includes('Training');
});
```

### 6.3 Menu/Navigation Migration

```sql
-- Current state (preserved during migration)
SELECT * FROM menu_items WHERE path = '/strategy/knowledge-base';
-- id: X, title: "Knowledge Base", section_id: 7 (Strategy & OKRs)

-- Migration Step 1: Add new menu section
INSERT INTO menu_sections (organization_id, name, icon, order_index)
VALUES (3, 'Knowledge Hub', '📚', 2);  -- Between Main and Strategy

-- Migration Step 2: Add new menu items (hidden initially)
INSERT INTO menu_items (organization_id, section_id, title, path, icon, is_visible)
VALUES 
  (3, NEW_SECTION_ID, 'All Documents', '/knowledge-hub', 'FileText', false),
  (3, NEW_SECTION_ID, 'Training', '/knowledge-hub/training', 'GraduationCap', false),
  (3, NEW_SECTION_ID, 'Customer Docs', '/knowledge-hub/customer', 'Building2', false),
  (3, NEW_SECTION_ID, 'Content Studio', '/knowledge-hub/content', 'Sparkles', false);

-- Migration Step 3: Create page entries
INSERT INTO pages (organization_id, slug, path, title, status)
VALUES 
  (3, 'knowledge-hub', '/knowledge-hub', 'Knowledge Hub', 'dev'),
  (3, 'knowledge-hub-training', '/knowledge-hub/training', 'Training Center', 'dev'),
  (3, 'knowledge-hub-customer', '/knowledge-hub/customer', 'Customer Documents', 'dev'),
  (3, 'knowledge-hub-content', '/knowledge-hub/content', 'Content Studio', 'dev');

-- Migration Step 4: Enable new items, hide old
UPDATE menu_items SET is_visible = true WHERE path LIKE '/knowledge-hub%';
UPDATE menu_items SET is_visible = false WHERE path = '/strategy/knowledge-base';

-- Migration Step 5: Add URL redirect
INSERT INTO url_redirects (old_path, new_path, is_permanent)
VALUES ('/strategy/knowledge-base', '/knowledge-hub', true);
```

---

## Part 7: Risk Analysis

### 7.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | Critical | Full backup before migration, rollback scripts, incremental migration |
| Broken links to existing documents | Medium | High | URL redirect table, maintain old IDs, link validation script |
| Performance degradation with folder hierarchy | Medium | Medium | Database indexes, query optimization, lazy loading |
| AI integration failures | Medium | Medium | Fallback to manual mode, graceful degradation, rate limiting |
| Schema migration conflicts | Low | High | Use db:push --force, test on clone first, version control schema |

### 7.2 User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users confused by new navigation | High | Medium | Onboarding tour, "What's New" announcement, gradual rollout |
| Training assignments lost | Low | Critical | Preserve document_assignments table, migrate with documents |
| Search results degraded | Medium | High | A/B test search, maintain existing search as fallback |
| Mobile experience broken | Medium | Medium | Mobile-first design, responsive testing, progressive enhancement |

### 7.3 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature scope creep | High | Medium | Strict phase gates, MVP for each phase, user feedback loops |
| Adoption resistance | Medium | High | Early user involvement, training sessions, champion users |
| Compliance/audit issues with customer docs | Low | Critical | Audit logging, version history, access controls, legal review |

### 7.4 Rollback Strategy

```
Trigger Conditions for Rollback:
1. Data integrity errors affecting >5% of documents
2. Critical functionality broken (create, edit, view)
3. Performance degradation >3x baseline
4. User-blocking bugs in production

Rollback Procedure:
1. Restore menu_items visibility (hide new, show old)
2. Update page status back to 'dev'
3. Maintain new data (don't delete)
4. Investigate and fix issues
5. Re-attempt migration with fixes
```

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Database schema and folder system

Tasks:
1. Create new database tables (knowledge_folders, playbook_steps, etc.)
2. Add new columns to knowledge_documents
3. Build folder CRUD API endpoints
4. Create folder hierarchy UI component
5. Implement drag-and-drop folder management
6. Add folder navigation to existing KB page

Deliverables:
- Folder system operational
- Documents can be organized into folders
- No changes to existing document functionality

### Phase 2: Training Playbooks (Week 3-4)
**Goal:** Step-based training content

Tasks:
1. Create playbook_steps and related tables
2. Build playbook builder UI (step editor)
3. Implement step types (content, video, checklist, quiz)
4. Create playbook viewer for learners
5. Build progress tracking system
6. Integrate with document_assignments

Deliverables:
- Playbook creation and editing
- Step-by-step learning experience
- Progress persistence and tracking

### Phase 3: Document Lifecycle (Week 5-6)
**Goal:** Customer document management

Tasks:
1. Create document_lifecycle table
2. Build lifecycle status workflow
3. Implement expiration tracking and alerts
4. Add version comparison view
5. Create customer/entity linking
6. Build lifecycle dashboard

Deliverables:
- Documents have lifecycle status
- Expiration alerts working
- Customer documents organized

### Phase 4: AI Integration (Week 7-8)
**Goal:** AI-powered content and search

Tasks:
1. Implement semantic search (embeddings)
2. Create AI content generation wizard
3. Build context retrieval for AI
4. Add content templates system
5. Integrate AI with existing AI Assistant
6. Add AI functions for KB operations

Deliverables:
- AI can search KB semantically
- AI can generate content using KB context
- Content templates operational

### Phase 5: Migration & Polish (Week 9-10)
**Goal:** Full transition to new system

Tasks:
1. Build migration wizard UI
2. Implement category-to-folder migration
3. Create URL redirect system
4. Update menu/navigation
5. Add analytics and reporting
6. Performance optimization

Deliverables:
- All content migrated
- New navigation live
- Old system deprecated

---

## Part 9: Success Metrics

### Adoption Metrics
- % of users accessing Knowledge Hub vs. old KB
- Number of playbooks created
- Number of documents organized into folders
- AI content generation usage

### Engagement Metrics
- Training completion rates (target: 85%+)
- Average time to find documents (target: <30 seconds)
- Search success rate (target: >90% find what they need)
- Document freshness (% reviewed within cycle)

### Business Metrics
- Reduction in support tickets about finding information
- Time saved in onboarding (measured in training hours)
- Compliance audit pass rate (100% for customer docs)
- AI content generation satisfaction (>4/5 stars)

---

## Part 10: Dependencies and Prerequisites

### Technical Prerequisites
1. OpenAI API key configured for AI features
2. Sufficient database storage for versioning
3. File storage for document attachments
4. Search indexing infrastructure (optional: vector DB for semantic search)

### Organizational Prerequisites
1. Content owners identified for migration
2. Training on new system for admins
3. Communication plan for users
4. Legal review for customer document features

### Integration Dependencies
1. Existing AI Assistant must support new KB functions
2. Field App may need updates for offline playbooks
3. Workflow system integration for document-triggered actions

---

## Appendix A: API Endpoints (Proposed)

```
# Folders
GET    /api/knowledge-hub/folders
POST   /api/knowledge-hub/folders
PATCH  /api/knowledge-hub/folders/:id
DELETE /api/knowledge-hub/folders/:id
POST   /api/knowledge-hub/folders/:id/move

# Playbooks
GET    /api/knowledge-hub/playbooks
POST   /api/knowledge-hub/playbooks
GET    /api/knowledge-hub/playbooks/:id
PATCH  /api/knowledge-hub/playbooks/:id
DELETE /api/knowledge-hub/playbooks/:id
GET    /api/knowledge-hub/playbooks/:id/steps
POST   /api/knowledge-hub/playbooks/:id/steps
PATCH  /api/knowledge-hub/playbooks/:id/steps/:stepId
DELETE /api/knowledge-hub/playbooks/:id/steps/:stepId

# Playbook Progress
GET    /api/knowledge-hub/my-training
GET    /api/knowledge-hub/playbooks/:id/progress
POST   /api/knowledge-hub/playbooks/:id/progress/step/:stepId
GET    /api/knowledge-hub/playbooks/:id/progress/certificate

# Document Lifecycle
GET    /api/knowledge-hub/documents/:id/lifecycle
PATCH  /api/knowledge-hub/documents/:id/lifecycle
GET    /api/knowledge-hub/lifecycle/expiring
GET    /api/knowledge-hub/lifecycle/pending-review

# AI Content
POST   /api/knowledge-hub/ai/generate
POST   /api/knowledge-hub/ai/search
GET    /api/knowledge-hub/ai/generations
POST   /api/knowledge-hub/ai/generations/:id/feedback

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
├── index.tsx                    # Main hub page
├── KnowledgeHubLayout.tsx       # Shared layout with sidebar
├── AllDocuments.tsx             # Document listing with folders
├── Training/
│   ├── TrainingCenter.tsx       # Training dashboard
│   ├── PlaybookBuilder.tsx      # Create/edit playbooks
│   ├── PlaybookViewer.tsx       # Step-by-step viewer
│   ├── MyTraining.tsx           # Personal progress
│   └── Assignments.tsx          # Admin assignment view
├── CustomerDocs/
│   ├── CustomerVault.tsx        # Folder-based doc management
│   ├── LifecycleDashboard.tsx   # Expiration/review tracking
│   └── DocumentDetail.tsx       # Single doc with lifecycle
├── ContentStudio/
│   ├── ContentStudio.tsx        # Marketing content hub
│   ├── AIWizard.tsx             # AI generation flow
│   └── Templates.tsx            # Template management
└── Settings/
    ├── HubSettings.tsx          # Configuration
    └── MigrationWizard.tsx      # Content migration

client/src/components/KnowledgeHub/
├── FolderTree.tsx               # Folder navigation
├── FolderBreadcrumb.tsx         # Path breadcrumb
├── DocumentCard.tsx             # Document preview card
├── PlaybookStepEditor.tsx       # Step editing component
├── PlaybookStepViewer.tsx       # Step viewing component
├── QuizEditor.tsx               # Quiz question editor
├── QuizTaker.tsx                # Quiz taking interface
├── LifecycleBadge.tsx           # Document status badge
└── AIContentPreview.tsx         # AI generated content preview

server/routes/
├── knowledge-hub.ts             # New unified routes
├── knowledge-hub-folders.ts     # Folder operations
├── knowledge-hub-playbooks.ts   # Playbook operations
├── knowledge-hub-lifecycle.ts   # Lifecycle operations
└── knowledge-hub-ai.ts          # AI content operations
```

---

*Document Version: 1.0*
*Last Updated: November 2024*
*Author: AI Implementation Assistant*
