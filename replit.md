# aimee.works Platform

## Overview
Aimee.works is a Strategy Operating System (Strategy OS) that integrates strategic planning with operational execution. It leverages OKR-based strategy management and AI-powered automation agents to achieve measurable outcomes and automate repetitive tasks. The platform's core principle is "Connect Strategy → Work → Measurement" through governed AI agents under human oversight. It supports enterprise-grade multi-tenancy and self-hosting, aiming to enhance efficiency and strategic alignment through AI integration in daily operations.

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
-   **Strategy Management System**: OKR and Work Item centric with offline support, bulk operations, and comprehensive filtering.
-   **AI Assistant System**: Context-aware business operations agent with chat interface, session management, function calling, and an action approval workflow. Supports work item management with human-readable action previews.
-   **Workflow Templates (Human Checklists)**: Reusable structured processes with offline photo capture and sync. Supports various step types (checklist, form, photo, signature, measurement, notes, kb_link, geolocation) and completion callbacks. Examples include a Chamber Record Workflow and Training Document Completion Workflow.
-   **AI Agent Workflows (Automation)**: Autonomous AI-driven automation with manual, webhook, and scheduled triggers.
    -   **Record Browser for Data Queries**: Agent Builder's Data Source Query step features intelligent ID field detection and human-readable record selection.
    -   **Splynx Query System**: Integrates with Splynx for querying entities (customers, leads, support_tickets) with advanced filtering (including customer labels and date ranges) and dual operation modes (Count/List). Supports variable interpolation and optional Key Result auto-update.
    -   **Workflow Iteration & Work Item Creation**: Supports `for_each` loops to iterate over query results and create platform work items or Splynx tasks dynamically.
-   **Offline Sync System**: Manual synchronization using IndexedDB for data persistence, sync queue management, and conflict resolution.
-   **AI Assistant Action Approval System**: Implements an action approval workflow for AI write operations using OpenAI's function calling with a custom approval layer.
-   **Field App PWA**: A dedicated offline-first Progressive Web App at `/field-app` for field workers, featuring selective work item download, offline workflow execution, photo capture, and manual sync.
-   **Xero Finance Integration**: Connects strategy execution to financial outcomes via OAuth 2.0, automatic transaction synchronization, AI-powered categorization, profit center tracking, and stakeholder-specific dashboards. Financial transactions are also available as a queryable data source in Agent Builder workflows with aggregation support.

## External Dependencies

### Third-Party APIs
-   **OpenAI**: AI-powered features.
-   **Splynx**: ISP management system.
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