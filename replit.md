# aimee.works Platform

## Overview
Aimee.works is a Strategy Operating System (Strategy OS) designed to integrate strategic planning with operational execution. It utilizes OKR-based strategy management and AI-powered automation agents to achieve measurable outcomes and automate repetitive tasks. The platform's core principle is "Connect Strategy → Work → Measurement" through governed AI agents under human oversight. It supports enterprise-grade multi-tenancy and self-hosting, aiming to enhance efficiency and strategic alignment through AI integration in daily operations.

## Recent Changes

### November 2025 - AI-Powered Splice Documentation Workflow
**Feature**: Complete AI-powered fiber splice documentation system using voice transcription and structured data extraction for field engineers.

**Implementation**:
- **Audio Recording in Field App**: New `audio_recording` workflow step type with MediaRecorder API for field voice memos
- **IndexedDB Audio Storage**: Audio files stored in IndexedDB (similar to photos) with IDs in stepData to prevent JSON serialization issues
- **Field App Sync**: Audio recordings uploaded to server via FormData, stored as base64 in workflow step evidence
- **OpenAI Whisper Integration**: `transcribeAudioFromBase64()` method in OpenAI service for speech-to-text transcription ($0.003 per minute)
- **GPT-4 Data Extraction**: `extractSpliceConnections()` method extracts structured splice connection data from transcriptions ($0.01 per request)
- **Database Schema Extensions**: `fiberDetails` JSONB field extended with `cables` and `spliceConnections` arrays for cable routes and splice documentation
- **Backend API Routes**: `/api/fiber-network/nodes/:id/cables`, `/api/fiber-network/nodes/:id/splice-connections`, `/api/fiber-network/transcribe-splice`, `/api/fiber-network/extract-splice-data`
- **Workflow Template**: "Document Splice Tray" template with photo capture, audio recording, and notes steps for comprehensive field documentation
- **Cost Efficiency**: ~$0.013 per splice documentation (Whisper + GPT-4o-mini), highly affordable for large-scale field operations

**Technical Details**:
- Files: `client/src/pages/field-app/components/WorkflowStep.tsx`, `client/src/lib/field-app/db.ts`, `client/src/pages/field-app/Sync.tsx`, `server/routes/field-app.ts`, `server/routes/fiber-network.ts`, `server/services/integrations/openaiService.ts`, `shared/schema.ts`
- Audio storage: ArrayBuffer format in IndexedDB `audioRecordings` store with metadata (duration, size, capturedAt)
- Sync queue: Extended to include 'audio' type for offline-first audio upload handling
- Database fields: `cables` array stores {id, startNodeId, endNodeId, cableType, fiberCount, length, status}, `spliceConnections` array stores {id, cableId, tubeNumber, fiberPosition, connectedTo, spliceLoss, notes}
- Cleanup: Component unmount properly stops MediaRecorder and releases microphone resources
- **Bug Fix** (Nov 24): Audio persistence bug where Blobs were stored directly in stepData causing data loss during JSON serialization. Fixed by implementing IndexedDB storage with saveAudio() method mirroring photo storage pattern.

**Workflow**:
1. Field engineer captures splice tray photos
2. Records voice memo describing connections (e.g., "tube 1 fiber 3 blue to tube 2 fiber 5 green")
3. Audio saved to IndexedDB with metadata
4. On sync, audio uploaded to server and stored in workflow evidence
5. (Future) Desktop user triggers transcription via API → Whisper converts speech to text
6. (Future) GPT-4 extracts structured splice connections from transcription
7. (Future) Splice connections saved to fiber node `fiberDetails.spliceConnections` for visualization and reporting

### November 2025 - AI Ticket Drafting Integration
**Feature**: Complete AI-powered support ticket response drafting system integrated with Agent Builder workflows and workflow template execution.

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
- **End-to-End Integration** (Nov 23, 2025): AI drafts automatically pre-fill into SplynxTicketViewer "Quick Reply" textarea when work items are opened in workflow templates. Visual indicators (Sparkles icon, AI Draft badge, blue alert) show when content is AI-generated. Users can review, edit, or restore the draft before sending. Edit tracking uses Levenshtein distance algorithm to calculate percentage changes, displayed after sending.

**Technical Details**:
- Files: `client/src/pages/integrations/AITicketDraftingSetup.tsx`, `server/routes/ai-drafting.ts`, `server/services/workflow/WorkflowExecutor.ts`, `client/src/components/workflow/WorkflowStepBuilder.tsx`, `client/src/components/workflow/SplynxTicketViewer.tsx`
- Configuration includes: model type, temperature (0-2), max tokens, system prompt docs, knowledge base docs, linked objective/key results
- Validation requires: minimum 1 system prompt document, 1 objective, 1 key result
- Accessible only via Integration Hub card (emerald color, MessageSquareText icon)
- **Workflow Setup**: Users create workflows with webhook triggers (Splynx ticket creation) → Create Work Item step → AI Draft Response step
- **Default KB Document**: "Support Ticket AI System Prompt - ISP/MSP" (ID 39) provides comprehensive ISP/MSP response guidelines
- **Draft Pre-fill Flow**: SplynxTicketViewer queries `/api/ai-drafting/drafts/work-item/${workItemId}` → pre-fills "Quick Reply" textarea on mount → tracks edits → PATCH to `/api/ai-drafting/drafts/${draftId}` on send → calculates edit % via Levenshtein distance
- **Component Architecture**: Workflow template uses step type "splynx_ticket" with mode "unified" which renders SplynxTicketViewer component (not SplynxTicketStep)
- **Bug Fixes** (Nov 23): 
  - Fixed database schema mismatch in WorkflowExecutor where AI draft generation was attempting to save to non-existent fields (`draftContent`, `modelUsed`, `configurationSnapshot`, `status`). Now correctly saves to `originalDraft` (text) and `generationMetadata` (jsonb) fields per schema definition in `ticket_draft_responses` table. This prevented drafts from being saved and caused frontend crashes due to null `originalDraft` values.
  - Fixed type mismatch where editPercentage was returned as string but frontend expected number for `.toFixed()` calls. Backend now returns numeric value; frontend uses defensive `Number()` parsing for robustness.
  - Fixed broken ticket viewer rendering caused by conditional message display logic. Restored simple, always-visible layout for reliable functionality across all devices.

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