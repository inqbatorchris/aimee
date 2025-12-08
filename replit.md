# aimee.works Platform

## Overview
Aimee.works is a Strategy Operating System (Strategy OS) designed to integrate strategic planning with operational execution. It utilizes OKR-based strategy management and AI-powered automation agents to achieve measurable outcomes and automate repetitive tasks. The platform's core principle is "Connect Strategy → Work → Measurement" through governed AI agents under human oversight. It supports enterprise-grade multi-tenancy and self-hosting, aiming to enhance efficiency and strategic alignment through AI integration in daily operations. Key capabilities include AI-powered fiber splice documentation, AI-driven support ticket response drafting, and robust field app functionalities. The platform also includes an OCR data extraction system for equipment details and manual editing capabilities for extracted data, alongside a chunked download system for the field app to handle large data volumes reliably.

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
-   **AI Assistant System**: Context-aware business operations agent with chat interface, session management, function calling, and an action approval workflow.
-   **Workflow Templates (Human Checklists)**: Reusable structured processes with offline photo capture and sync, supporting various step types and completion callbacks.
-   **AI Agent Workflows (Automation)**: Autonomous AI-driven automation with manual, webhook, and scheduled triggers, including integration for external systems.
-   **Offline Sync System**: Manual synchronization using IndexedDB for data persistence, sync queue management, and conflict resolution.
-   **AI Assistant Action Approval System**: Implements an action approval workflow for AI write operations.
-   **Field App PWA**: Offline-first Progressive Web App for field workers, supporting selective work item download, offline workflow execution, photo capture, manual sync, and offline fiber network node creation with batched downloads for memory management.
-   **Fiber Network Node Type Management**: Dynamic, organization-scoped node type system with full CRUD operations.
-   **Xero Finance Integration**: Connects strategy execution to financial outcomes via OAuth 2.0, transaction synchronization, AI categorization, and profit center tracking.
-   **Manual Splice Documentation System**: Desktop interface for documenting fiber-to-fiber splice connections with a visual click-to-connect UI, splice tray management, and TIA-598-C color standards.
-   **AI-Powered Splice Documentation Workflow**: Voice-to-data system for field splice documentation, utilizing AI for transcription and parsing, with desktop review and verification.
-   **AI Ticket Drafting Integration**: AI-powered support ticket response drafting system integrated with Agent Builder workflows, including setup UI, KB selectors, and performance tracking.
-   **Fiber Status Visibility System**: Real-time fiber utilization tracking across the network, aggregating data from terminations, connections, and work items, displayed with status badges and utilization progress bars.
-   **OCR Data Extraction**: Automatically extracts equipment data (serial numbers, MAC addresses, models) from photos during field installations and writes to source records.
-   **Manual Equipment Data Editing**: Allows manual correction or entry of equipment data with inline editing, individual field saves, and full activity tracking.
-   **Customer Appointment Booking System**: Permanent, shareable booking URLs using unique slugs (e.g., `/book/field-visit-abc123`). Each appointment type can be configured as "open" (anyone can book) or "authenticated" (requires customer login). Features include: inline login for authenticated bookings, customer contact info collection, Splynx task creation on confirmation, and organization branding on public booking pages. Designed for easy sharing across email, SMS, support messages, and website embeds. Legacy token-based system retained for backward compatibility.
-   **Calendar Management System**: Comprehensive team calendar with multi-source event visualization aggregating Splynx scheduling tasks, work items, holiday requests, and calendar blocks. Features include: multiple view modes (monthly, weekly, daily, roadmap), team and user filtering, color-coded event types (blue=Splynx tasks, purple=work items, green=holidays, orange=blocks), and real-time data aggregation. Routes: `/settings/calendar`. Database tables: `user_calendar_settings`, `holiday_allowances`, `holiday_requests`, `public_holidays`, `calendar_blocks`, with integration to `splynx_teams` and `splynx_administrators` for external scheduling data.

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