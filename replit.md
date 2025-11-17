# aimee.works Platform

## Overview
Aimee.works is a Strategy Operating System (Strategy OS) that integrates strategic planning with operational execution. It leverages OKR-based strategy management and AI-powered automation agents to achieve measurable outcomes and automate repetitive tasks. The platform's core principle is "Connect Strategy → Work → Measurement" through governed AI agents under human oversight. It supports enterprise-grade multi-tenancy and self-hosting, built on React, Express, and PostgreSQL, with the ambition of enhancing efficiency and strategic alignment through AI integration in daily operations.

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
-   **Page-Driven Architecture**: Uses `DynamicPageRenderer` with JSON configuration.
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
-   **Developer Tools**: Page Manager and Menu Builder for platform configuration.

### Key System Components
-   **Strategy Management System**: Centered around OKRs and Work Items with full offline support, including bulk operations and comprehensive filtering. Work items can be deleted by admins, managers, the creator, or the assignee. Bulk delete operations handle partial failures gracefully with clear feedback.
-   **AI Assistant System**: Context-aware business operations agent with chat interface, session management, function calling, and an action approval workflow. Supports work item management (list, filter, create, update) with human-readable action previews. All interactions are logged.
-   **Workflow Templates (Human Checklists)**: Reusable structured processes with offline photo capture and sync. Supports various step types including checklist, form, photo, signature, measurement, notes, kb_link, and geolocation. Includes completion callback system for automated actions.
    -   **Chamber Record Workflow**: A pre-configured 6-step workflow template for field engineers, including geolocation, photo evidence, and completion callbacks to automatically create fiber network node records. Includes mobile-friendly filter interfaces.
    -   **Training Document Completion Workflow**: A 3-step system template for training assignments. When training documents are assigned at `/training` (admin), work items are automatically created with embedded document viewing, acknowledgment checkboxes, and optional feedback. Completion callbacks update assignment records with audit trail (IP address, timestamp, acknowledgment status). Users complete all training through the unified work items interface at `/strategy/work-items`.
-   **AI Agent Workflows (Automation)**: Autonomous AI-driven automation with manual, webhook, and scheduled triggers, and various integrations.
    -   **Record Browser for Data Queries**: Agent Builder's Data Source Query step now features intelligent ID field detection and human-readable record selection. When filtering by foreign key fields (e.g., objectiveId, keyResultId, profitCenterId), the UI automatically shows a dropdown populated with actual records instead of requiring manual ID entry. Display format varies by table: objectives show "Title (status)", key results show "Title (current/target)", profit centers show "Name - type". Supports variable interpolation via the Braces button for dynamic filtering. Backend endpoint `/api/data-explorer/records/:tableName` handles organization-scoped record fetching with graceful handling of tables with/without organizationId columns. Frontend uses verified TABLE_RELATIONSHIPS mappings to prevent incorrect foreign key associations, falling back to text input for unknown ID fields without triggering network requests.
-   **Offline Sync System**: Manual synchronization using IndexedDB for data persistence, sync queue management, server sync, conflict resolution (server-wins), and secure data handling.
-   **AI Assistant Action Approval System**: Implements an action approval workflow for AI write operations using OpenAI's function calling with a custom approval layer, leveraging knowledge documents and AI functions.
-   **Field App PWA**: A dedicated offline-first Progressive Web App at `/field-app` for field workers. Features selective work item download, offline workflow execution, photo capture with blob storage, manual sync control, and PWA installability. Includes intelligent photo compression and parallel uploads for efficient syncing. Workflow steps do not auto-expand after completion, allowing non-sequential work patterns optimized for mobile field operations.
-   **Xero Finance Integration**: Comprehensive financial layer connecting strategy execution to financial outcomes. Accessible via Finance menu in sidebar with 4 sub-pages: Dashboard, Transactions, Profit Centers, and Xero Setup. Features OAuth 2.0 authentication, automatic transaction synchronization, AI-powered categorization, profit center tracking by geographic zone/service type/customer segment, and stakeholder-specific dashboards (CFO, CEO, investors, board, bankers). Database schema includes `financial_transactions` (comprehensive Xero transaction records with categorization, reconciliation, and Splynx mapping), `profit_centers` (business segment definitions with Xero tracking category mappings), `financial_metrics_cache` (pre-calculated KPIs), and `xero_sync_status` (sync job monitoring). Frontend pages: `/finance` (dashboard), `/finance/transactions` (categorization interface with filters, bulk operations, and date range presets), `/finance/profit-centers` (segment management), and `/integrations/xero` (OAuth setup with activity monitoring). Backend routes at `/api/finance/*` handle OAuth flow, transaction CRUD, categorization, profit center management, and dashboard metrics. Includes 5 Knowledge Base documents covering setup, profit centers, categorization, dashboard usage, and troubleshooting. Platform feature registered as "Finance & Xero Integration" with full visibility and documentation.
    -   **Date Range Presets**: Transactions page includes quick date filters (Today, This Week, This Month, Last Month, This Quarter, Last Quarter, This Year, All Time, Custom) for rapid transaction filtering and analysis.
    -   **Agent Builder Data Source**: Financial transactions are available as a queryable data source in Agent Builder workflows with full aggregation support. Agents can filter transactions by date, amount, account code, categorization status, profit center, and 20+ other fields. Supports COUNT, SUM, AVG, MIN, and MAX aggregations on any numeric field, enabling automated financial reporting, revenue tracking, and KPI updates. Example: Sum all transaction amounts for account code 601 (Residential broadband) filtered by current month to calculate monthly revenue.

## External Dependencies

### Third-Party APIs
-   **OpenAI**: AI-powered features.
-   **Splynx**: ISP management system.
-   **Airtable**: External data source for addresses, statuses, and tariffs. Supports both database-stored credentials and environment variable (AIRTABLE_API_KEY) for cross-environment persistence.
-   **Google Maps Geocoding API**: Address-to-coordinates conversion.
-   **Xero**: Accounting and financial management integration via OAuth 2.0 for transaction sync, categorization, and profit center tracking.

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