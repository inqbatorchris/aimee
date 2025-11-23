# aimee.works Platform

## Overview
Aimee.works is a Strategy Operating System (Strategy OS) designed to integrate strategic planning with operational execution. It utilizes OKR-based strategy management and AI-powered automation agents to achieve measurable outcomes and automate repetitive tasks. The platform's core principle is "Connect Strategy → Work → Measurement" through governed AI agents under human oversight. It supports enterprise-grade multi-tenancy and self-hosting, aiming to enhance efficiency and strategic alignment through AI integration in daily operations.

## Recent Changes

### November 2025 - AI Ticket Drafting Integration
**Feature**: Complete AI-powered support ticket response drafting system integrated with Agent Builder workflows.

**Implementation**:
- **Setup UI** at `/integrations/ai-ticket-drafting/setup` with model selection (GPT-4o, GPT-4o-mini, GPT-4-Turbo, GPT-3.5-Turbo)
- **Dual KB Document Selectors**: Both system prompt and reference document selectors allow attaching ANY knowledge base document (no filtering)
- **Performance Tracking**: Link to objectives and key results for analytics
- **Backend API** at `/api/ai-drafting/*` with configuration management, model listing, and draft storage
- **Database Tables**: `ai_agent_configurations` (stores config per organization) and `ticket_draft_responses` (stores generated drafts)
- **Security**: Backend validates KB document ownership to prevent cross-organization access
- **First-time Setup**: Returns default configuration when no config exists (no 404 errors)
- **Workflow Integration**: New `ai_draft_response` workflow step type in Agent Builder for automated draft generation
- **Draft Generation Logic**: Embedded in WorkflowExecutor, loads configuration and KB docs, calls OpenAI API, saves drafts with status tracking
- **Setup Guidance**: "Next Steps" card on setup page with direct link to Agent Builder and workflow creation instructions

**Technical Details**:
- Files: `client/src/pages/integrations/AITicketDraftingSetup.tsx`, `server/routes/ai-drafting.ts`, `server/services/workflow/WorkflowExecutor.ts`, `client/src/components/workflow/WorkflowStepBuilder.tsx`
- Configuration includes: model type, temperature (0-2), max tokens, system prompt docs, knowledge base docs, linked objective/key results
- Validation requires: minimum 1 system prompt document, 1 objective, 1 key result
- Accessible only via Integration Hub card (emerald color, MessageSquareText icon)
- **Workflow Setup**: Users create workflows with webhook triggers (Splynx ticket creation) → Create Work Item step → AI Draft Response step
- **Default KB Document**: "Support Ticket AI System Prompt - ISP/MSP" (ID 39) provides comprehensive ISP/MSP response guidelines

### November 2025 - Field App Chunked Download System
**Problem Solved**: Field app downloads were failing when downloading large numbers of work items or items with many high-resolution photos due to mobile browser memory limitations.

**Solution Implemented**: 
- **Batched Downloads**: Server endpoint now supports chunking via optional `offset`/`limit` parameters (backward compatible)
- **Sequential Processing**: Photos are converted one-at-a-time instead of in parallel to prevent memory spikes
- **Memory Management**: Automatic cleanup delays between batches (10ms per photo, 100ms between batches) to allow garbage collection
- **Progress Tracking**: Real-time batch progress display ("Batch 2 of 5: 40%")
- **Error Handling**: Detailed error messages showing which batch failed, with downloaded data preserved

**Technical Details**:
- Chunk size: 5 work items per batch
- Files modified: `server/routes/field-app.ts`, `client/src/pages/field-app/Download.tsx`
- All existing functionality preserved (filters, templates, execution states, photos)
- No breaking changes to API

**Impact**: Field workers can now reliably download 50+ work items with multiple photos each on mobile devices without crashes or memory issues.

## User Preferences
Preferred communication style: Simple, everyday language.
UI Development Approach: UI-first implementation with fully functional interface before backend integration. All UI components should be navigable and visually complete.
Side Panels (canonical): Use Sheet from shadcn/ui for all slide-out detail/edit views. Standard width sm:w-[640px]. Close handling: onOpenChange={(open) => !open && onClose()}. Do not add duplicate close buttons or hide the built-in one. Tests must verify close via X / Cancel / overlay click / Escape.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript
-   **UI**: Tailwind CSS, Shadcn/ui for modern SaaS design, responsive grids, and card-based layouts.
-   **State Management**: TanStack React Query
-   **Routing**: Wouter
-   **Forms**: React Hook Form with Zod
-   **Design Principles**: Modern SaaS aesthetic, modular components, responsive design, UI-first implementation.
-   **Architecture**: Page-Driven with `DynamicPageRenderer` and JSON configuration.
-   **Feature Visibility**: Features use `unified_status` (`draft`, `dev`, `live`, `archived`) with role-based filtering.
-   **Offline Support**: IndexedDB-based offline storage with manual sync for work items, workflow templates, and photo evidence, focusing on optimistic UI updates.
-   **Performance**: Strategic lazy loading with authentication boundaries for code splitting.

### Backend
-   **Runtime**: Node.js with Express.js
-   **Language**: TypeScript (ESM)
-   **Database**: PostgreSQL with Drizzle ORM (schema-first, migrations).
-   **Authentication**: JWT with role-based access control.
-   **AI Integration**: Configurable AI agents and assistance with per-organization OpenAI API key management.
-   **Core Modules**: Strategy & OKRs, Check-in Meeting System, Project Management, Tools & Agents, Help Desk.
-   **Multi-tenancy**: Implemented with `tenants`, `plans`, and `subscriptions` tables.
-   **Page Management System**: Uses `pages`, `page_visibility_rules` for database-driven rendering.

### Key System Components
-   **Strategy Management System**: Centered around OKRs and Work Items with full offline support, bulk operations, and comprehensive filtering.
-   **AI Assistant System**: Context-aware business operations agent with chat interface, session management, function calling, and an action approval workflow. Supports work item management with human-readable action previews.
-   **Workflow Templates (Human Checklists)**: Reusable structured processes with offline photo capture and sync. Supports various step types (checklist, form, photo, signature, measurement, notes, kb_link, geolocation) and completion callbacks. Examples include a Chamber Record Workflow and Training Document Completion Workflow.
-   **AI Agent Workflows (Automation)**: Autonomous AI-driven automation with manual, webhook, and scheduled triggers. Includes Splynx integration for querying entities, creating tasks, and email campaign deployment. Features `for_each` loops for iterating over query results and creating dynamic work items or tasks, with UI support for variable selection and data inspection.
-   **Offline Sync System**: Manual synchronization using IndexedDB for data persistence, sync queue management, and conflict resolution.
-   **AI Assistant Action Approval System**: Implements an action approval workflow for AI write operations using OpenAI's function calling with a custom approval layer.
-   **Field App PWA**: A dedicated offline-first Progressive Web App at `/field-app` for field workers, featuring selective work item download, offline workflow execution, photo capture, and manual sync. Includes functionality for offline fiber network node creation with GPS, photo requirements, and automatic sign-off work item generation. **Chunked Download System** (Nov 2025): Implements batched downloads (5 items per batch) with sequential photo processing to prevent memory overflow on mobile devices. Supports downloading large datasets with many high-resolution photos without crashes, includes batch-level progress tracking ("Batch 2 of 5"), and graceful error handling with detailed failure reporting.
-   **Fiber Network Node Type Management**: Dynamic, organization-scoped node type system allowing administrators to add, remove, and manage fiber network node types (Chamber, Cabinet, Pole, Splice Closure, Customer Premise, plus custom types). Node types automatically sync between desktop and mobile field app, with full CRUD operations in desktop Settings and dropdown selection during node creation/editing.
-   **Xero Finance Integration**: Connects strategy execution to financial outcomes via OAuth 2.0, automatic transaction synchronization, AI-powered categorization, profit center tracking, and stakeholder-specific dashboards. Financial transactions are available as a queryable data source in Agent Builder workflows with aggregation support.

## External Dependencies

### Third-Party APIs
-   **OpenAI**: AI-powered features.
-   **Splynx**: ISP management system for customer data, email campaigns, and task management.
-   **Airtable**: External data source for addresses, statuses, and tariffs.
-   **Google Maps Geocoding API**: Address-to-coordinates conversion.
-   **Xero**: Accounting and financial management integration.

### Key Libraries
-   **@neondatabase/serverless**: PostgreSQL connection.
-   **@tanstack/react-query**: Server state management.
-   **@radix-ui/react-\*\*\***: Accessible UI primitives.
-   **@dnd-kit/\*\*\***: Drag-and-drop functionality.
-   **drizzle-orm**: Type-safe database queries.
-   **zod**: Runtime type validation.
-   **bcrypt**: Password hashing.
-   **jsonwebtoken**: JWT authentication.
-   **multer**: File uploads.
-   **cors**: Cross-Origin Resource Sharing.
-   **TipTap**: Rich text editing.