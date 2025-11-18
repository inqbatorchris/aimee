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
    -   **Splynx Task Creation**: Create tasks in Splynx scheduling system with automatic field mapping (taskName→title, projectId→project_id, customerId→customer_id). **Required fields**: Task Name, Project ID, and Workflow Status ID. The Workflow Status ID must match valid status IDs from your Splynx project's workflow configuration (check Splynx Admin → Scheduling → Projects → [Your Project] → Workflow settings).
    -   **Workflow Iteration & Work Item Creation**: Supports `for_each` loops to iterate over query results and create platform work items or Splynx tasks dynamically.
    -   **Enhanced Loop Integration Actions**: Integration actions (create_splynx_task, etc.) fully supported inside for_each loops with recursive nested variable substitution. UI features include:
        -   **VariableFieldPicker**: Autocomplete field picker with sparkles button for selecting fields from loop context (e.g., `{{currentItem.id}}`, `{{currentItem.name}}`). Includes search/filter capability.
        -   **DataInspectorPanel**: Right-side panel showing available variables from previous workflow steps with expandable field structure, type information, and copy-to-clipboard functionality. Auto-detects common Splynx entities (customers, leads, work items) and displays relevant fields.
-   **Offline Sync System**: Manual synchronization using IndexedDB for data persistence, sync queue management, and conflict resolution.
-   **AI Assistant Action Approval System**: Implements an action approval workflow for AI write operations using OpenAI's function calling with a custom approval layer.
-   **Field App PWA**: A dedicated offline-first Progressive Web App at `/field-app` for field workers, featuring selective work item download, offline workflow execution, photo capture, and manual sync.
    -   **Fiber Network Node Creation**: Field engineers can create fiber network node records (chambers, cabinets, splices) offline with GPS auto-capture, photo requirements (minimum 1 photo), and metadata. Each created node automatically generates a sign-off work item (due in 7 days, assigned to Field Team) with the "Fiber Node Sign-Off" workflow template. All data is stored in IndexedDB offline and syncs to the server when online, with proper ID mapping between local and server records.
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

## Production Deployment

### Deployment Tools & Documentation
-   **Production Deployment Plan**: `PRODUCTION_DEPLOYMENT_PLAN.md` - Comprehensive guide covering all critical database tables, integration credentials, environment variables, and synchronization requirements for production deployment.
-   **Data Export Script**: `server/scripts/export-production-data.ts` - Automated tool to export critical production data including organizations, users (human + agent), integrations (with encrypted credentials), agent workflows, menu system, pages, knowledge base, and AI assistant configuration.

### Critical Database Tables for Production
1. **Organizations** - Core tenant data (must migrate first)
2. **Users** - Including agent users that represent automation workflows
3. **Integrations** - External platform connections with encrypted credentials (Splynx, Xero, OpenAI)
4. **Agent Workflows** - All automation logic and workflow definitions
5. **Agent Workflow Schedules** - Cron schedules for automated workflows
6. **Menu System** - Navigation sections and items
7. **Pages** - Dynamic page configurations
8. **Knowledge Base** - Documentation and help articles
9. **AI Assistant Config** - AI system configuration and enabled functions

### Security Requirements for Production
-   **ENCRYPTION_KEY**: Must be identical in development and production for credential decryption to work. Integration credentials are encrypted using this key and stored in the `integrations.credentialsEncrypted` field.
-   **JWT & Session Secrets**: Production-specific JWT_SECRET and SESSION_SECRET required.
-   **Environment Variables**: Database connection (auto-configured by Replit), API keys for external services.

### Data Export Usage
Run the export script to generate JSON and SQL files for production import:
```bash
npx tsx server/scripts/export-production-data.ts [organizationId]
```
Generates:
- `production-export/production-data-{orgId}.json` - Complete data export
- `production-export/production-import-{orgId}.sql` - SQL import script
- `production-export/export-summary-{orgId}.txt` - Human-readable summary

### Deployment Validation Checklist
After production deployment:
- [ ] All integrations show "Connected" status
- [ ] Test workflow executes successfully
- [ ] Agent users exist and are active
- [ ] Menu navigation loads correctly
- [ ] Knowledge base articles visible
- [ ] AI assistant responds correctly
- [ ] Splynx task creation works end-to-end
- [ ] Encrypted credentials decrypt properly