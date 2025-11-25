# aimee.works Platform

## Overview
Aimee.works is a Strategy Operating System (Strategy OS) designed to integrate strategic planning with operational execution. It utilizes OKR-based strategy management and AI-powered automation agents to achieve measurable outcomes and automate repetitive tasks. The platform's core principle is "Connect Strategy → Work → Measurement" through governed AI agents under human oversight. It supports enterprise-grade multi-tenancy and self-hosting, aiming to enhance efficiency and strategic alignment through AI integration in daily operations. Key capabilities include AI-powered fiber splice documentation, AI-driven support ticket response drafting, and robust field app functionalities.

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
-   **Workflow Templates (Human Checklists)**: Reusable structured processes with offline photo capture and sync. Supports various step types (checklist, form, photo, signature, measurement, notes, kb_link, geolocation) and completion callbacks.
-   **AI Agent Workflows (Automation)**: Autonomous AI-driven automation with manual, webhook, and scheduled triggers. Includes integration for external systems like Splynx for querying entities, creating tasks, and email campaign deployment. Features `for_each` loops for iterating over query results.
-   **Offline Sync System**: Manual synchronization using IndexedDB for data persistence, sync queue management, and conflict resolution.
-   **AI Assistant Action Approval System**: Implements an action approval workflow for AI write operations using OpenAI's function calling with a custom approval layer.
-   **Field App PWA**: A dedicated offline-first Progressive Web App at `/field-app` for field workers, featuring selective work item download, offline workflow execution, photo capture, and manual sync. Includes functionality for offline fiber network node creation with GPS, photo requirements, and automatic sign-off work item generation. Implements batched downloads (5 items per batch) with sequential photo processing to prevent memory overflow on mobile devices.
-   **Fiber Network Node Type Management**: Dynamic, organization-scoped node type system allowing administrators to add, remove, and manage fiber network node types. Node types automatically sync between desktop and mobile field app, with full CRUD operations in desktop Settings and dropdown selection during node creation/editing.
-   **Xero Finance Integration**: Connects strategy execution to financial outcomes via OAuth 2.0, automatic transaction synchronization, AI-powered categorization, profit center tracking, and stakeholder-specific dashboards.
-   **AI-Powered Splice Documentation Workflow**: Comprehensive voice-to-data system for documenting fiber-to-fiber splice connections in the field. Field engineers photograph splice trays and record voice descriptions, which are automatically transcribed via OpenAI Whisper and parsed by GPT-4 to extract structured splice data (cable IDs, fiber numbers, buffer tube colors). The workflow enables desktop review and verification before committing connections to fiber network nodes. Work items attach directly to fiber nodes via `workflowMetadata.fiberNodeId` (not address records). Architecture: Voice memo upload → AI processing (async) → Human review in `fiber_splice_documentation` step → Workflow completion → Webhook callback to `/api/fiber-network/save-splice-connections` → Splice connections appended to `node.fiberDetails.spliceConnections[]`. Implemented with `audio_recordings` table, `audioProcessingService` for AI extraction, field-app upload endpoints, and WorkflowStep UI component with auto-loading of AI-extracted data.
-   **AI Ticket Drafting Integration**: Provides an AI-powered support ticket response drafting system integrated with Agent Builder workflows. It includes a setup UI for model selection, dual KB document selectors, and performance tracking. Generated drafts automatically pre-fill into ticket viewer "Quick Reply" textareas with visual indicators for AI-generated content.
-   **Fiber Status Visibility System**: Real-time fiber utilization tracking across the network. The `fiber_terminations` table tracks customer premise connections (single cable model) with fields for cable_id, fiber_number, service details, and live status. Backend API endpoints aggregate fiber usage: `/cables/:id/fiber-status` for per-cable details, `/nodes/:nodeId/fiber-status` for per-node summary, and `/cables/utilization` batch endpoint for table view. UI displays status badges (AVAILABLE in green, USED in blue, LIVE in amber, RESERVED in gray) in splice tray dialogs and cable dropdowns. Node detail sheet includes "Fibers" tab with cable utilization progress bars, color-coded (green < 50%, amber 50-80%, red > 80%). Cables table shows utilization column with real-time progress bars. TIA-598-C color standards fully integrated throughout.

## External Dependencies

### Third-Party APIs
-   **OpenAI**: AI-powered features for transcription, data extraction, and drafting.
-   **Splynx**: ISP management system for customer data, email campaigns, and task management.
-   **Airtable**: External data source.
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