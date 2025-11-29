import {
  pgTable,
  serial,
  text,
  varchar,
  decimal,
  numeric,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
  date,
  pgEnum,
  uuid,
  time,
  smallint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ========================================
// CORE MULTI-TENANT SYSTEM TABLES
// ========================================

// Enums for core system
export const activityTypeEnum = pgEnum('activity_type', ['creation', 'status_change', 'assignment', 'comment', 'file_upload', 'kpi_update', 'agent_action', 'completion', 'deletion', 'generation', 'bulk_update', 'openai_test', 'openai_key_saved', 'ai_chat', 'field_app_sync_success', 'field_app_sync_partial', 'field_app_sync_failed', 'ocr_extraction', 'ocr_extraction_failed']);
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'manager', 'team_member', 'customer', 'dev']);
export const userTypeEnum = pgEnum('user_type', ['human', 'agent']);

// Unified visibility control system
export const unifiedStatusEnum = pgEnum('unified_status', ['draft', 'dev', 'live', 'archived']);

// Page and feature management enums
export const pageStatusEnum = pgEnum('page_status', ['draft', 'dev', 'live', 'archived']);
export const buildStatusEnum = pgEnum('build_status', ['not_started', 'building', 'testing', 'released', 'dynamic']);
export const ragStatusEnum = pgEnum('rag_status', ['red', 'amber', 'green']);
export const tenantStatusEnum = pgEnum('tenant_status', ['provisioning', 'active', 'suspended', 'deleted']);
export const planTypeEnum = pgEnum('plan_type', ['free', 'paid', 'enterprise']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial', 'active', 'past_due', 'cancelled']);
export const requestStatusEnum = pgEnum('request_status', ['submitted', 'triage', 'approved', 'rejected', 'implemented']);
export const orgScopeEnum = pgEnum('org_scope', ['all', 'specific']);
export const visibilityRuleTypeEnum = pgEnum('visibility_rule_type', ['role', 'organization', 'build_status']);
export const cardinalityEnum = pgEnum('cardinality', ['one_to_one', 'one_to_many', 'many_to_many']);
export const deleteActionEnum = pgEnum('delete_action', ['cascade', 'restrict', 'set_null', 'no_action']);

// Strategy Management enums
export const objectiveStatusEnum = pgEnum('objective_status', ['Draft', 'Active', 'On Track', 'At Risk', 'Off Track', 'Completed', 'Archived']);
export const kpiTypeEnum = pgEnum('kpi_type', ['Derived from Key Results', 'Manual Input']);

// Enums for key results (migration 002)
export const keyResultStatusEnum = pgEnum('key_result_status', ['Not Started', 'On Track', 'At Risk', 'Stuck', 'Completed']);
export const keyResultTypeEnum = pgEnum('key_result_type', ['Numeric Target', 'Percentage KPI', 'Milestone']);

// Enum for key result tasks (migration 003)
export const keyResultTaskStatusEnum = pgEnum('key_result_task_status', ['Not Started', 'On Track', 'Stuck', 'Completed']);

// Enum for routines frequency (migration 004)
export const routineFrequencyEnum = pgEnum('routine_frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'six-monthly', 'annually']);

// Enum for work items status (migration 005)
export const workItemStatusEnum = pgEnum('work_item_status', ['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived']);

// Enum for check-in cycle status (migration 006)
export const checkInCycleStatusEnum = pgEnum('check_in_cycle_status', ['Planning', 'In Progress', 'Review', 'Completed']);

// Enum for participant roles (migration 006)
export const participantRoleEnum = pgEnum('participant_role', ['Leader', 'Member', 'Watcher']);

// Enum for team default cadence (migration 007)
export const defaultCadenceEnum = pgEnum('default_cadence', ['daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']);

// Enum for check-in meeting status
export const meetingStatusEnum = pgEnum('meeting_status', ['Planning', 'Planned', 'In Progress', 'Completed', 'Skipped']);

// Enum for meeting item update status
export const updateTypeEnum = pgEnum('update_type', ['progress', 'status_change', 'notes', 'completion']);

// Enums for knowledge base documents
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published', 'archived']);
export const documentVisibilityEnum = pgEnum('document_visibility', ['public', 'internal', 'private']);

// Knowledge Hub document types (v3 extension)
export const knowledgeDocumentTypeEnum = pgEnum('knowledge_document_type', [
  'internal_kb',
  'website_page', 
  'customer_kb',
  'marketing_email',
  'marketing_letter',
  'attachment',
  'training_module',
  'external_file_link',
  'contract',
  'policy',
  'public_report',
  'quick_reference'
]);

// Training completion requirements
export const knowledgeCompletionRequirementEnum = pgEnum('knowledge_completion_requirement', [
  'all_steps',
  'quiz',
  'both'
]);

// Enum for team member roles (migration 007) - reusing same values as participantRoleEnum for consistency
export const teamRoleEnum = pgEnum('team_role', ['Leader', 'Member', 'Watcher']);

// Enums for enhanced team cadence settings
export const weekdayEnum = pgEnum('weekday', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export const monthlyRuleTypeEnum = pgEnum('monthly_rule_type', ['nth_weekday', 'day_of_month']);
export const periodRuleTypeEnum = pgEnum('period_rule_type', ['nth_weekday']);
export const nthEnum = pgEnum('nth', ['1', '2', '3', '4', 'last']);
export const meetingLengthEnum = pgEnum('meeting_length', ['15', '30', '45', '60']);

// Unified visibility control types and utilities
export type UnifiedStatus = 'draft' | 'dev' | 'live' | 'archived';
export type Role = 'super_admin' | 'admin' | 'manager' | 'team_member' | 'customer';

/**
 * Determines if an item is visible to a user based on unified status and role
 * @param unifiedStatus - The unified status of the item
 * @param userRole - The user's role
 * @returns boolean indicating if the item should be visible
 */
// Fixed function signature and added overload for objects with unifiedStatus
export function isItemVisible(unifiedStatus: UnifiedStatus, userRole: string): boolean;
export function isItemVisible(item: { unifiedStatus: UnifiedStatus }, userRole: string): boolean;
export function isItemVisible(itemOrStatus: UnifiedStatus | { unifiedStatus: UnifiedStatus }, userRole: string): boolean {
  const unifiedStatus = typeof itemOrStatus === 'string' ? itemOrStatus : itemOrStatus.unifiedStatus;
  
  switch (unifiedStatus) {
    case 'draft': return false;  // Never visible - being created
    case 'archived': return false;  // Never visible - saved but hidden
    case 'dev': return ['super_admin', 'admin'].includes(userRole);  // Only admins can see
    case 'live': return true;  // Visible to all (subject to feature enablement)
    default: return false;
  }
}

/**
 * Gets the appropriate badge color for a unified status
 */
export function getUnifiedStatusColor(status: UnifiedStatus): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700';
    case 'dev': return 'bg-purple-100 text-purple-700';
    case 'live': return 'bg-green-100 text-green-700';
    case 'archived': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// Legacy types for compatibility
export type Permission = string;
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ['*'],
  admin: ['manage_users', 'manage_features', 'view_analytics'],
  manager: ['manage_team', 'view_reports'],
  team_member: ['view_own_data'],
  customer: ['view_limited'],
};

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations table for multi-tenancy (core tenant management)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  
  // Multi-tenant settings
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("basic"), // basic, professional, enterprise
  isActive: boolean("is_active").default(true),
  maxUsers: integer("max_users").default(50),
  
  // Organization metadata
  logoUrl: varchar("logo_url", { length: 500 }),
  squareLogoUrl: varchar("square_logo_url", { length: 500 }),
  darkLogoUrl: varchar("dark_logo_url", { length: 500 }),
  darkSquareLogoUrl: varchar("dark_square_logo_url", { length: 500 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  address: jsonb("address"), // {street, city, state, zipCode, country}
  industry: varchar("industry", { length: 100 }),
  companySize: varchar("company_size", { length: 50 }), // startup, small, medium, large, enterprise
  timeZone: varchar("time_zone", { length: 100 }).default("UTC"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // Billing and subscription
  subscriptionStart: timestamp("subscription_start").defaultNow(),
  subscriptionEnd: timestamp("subscription_end"),
  billingEmail: varchar("billing_email", { length: 255 }),
  
  // Organization settings
  settings: jsonb("settings"), // Custom organization-wide settings
  features: jsonb("features"), // Enabled feature flags per organization
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organizations_domain").on(table.domain),
  index("idx_organizations_active").on(table.isActive),
]);

// Tenants table for multi-database architecture
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  dbHost: varchar("db_host", { length: 255 }).notNull(),
  dbName: varchar("db_name", { length: 255 }).notNull(),
  dbUser: varchar("db_user", { length: 255 }).notNull(),
  dbPasswordEncrypted: varchar("db_password_encrypted", { length: 500 }).notNull(),
  dbPort: integer("db_port").default(5432).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique().notNull(),
  status: tenantStatusEnum("status").default('provisioning').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenants_org").on(table.organizationId),
  index("idx_tenants_subdomain").on(table.subdomain),
]);

// Plans table for subscription management
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: planTypeEnum("type").notNull(),
  maxUsers: integer("max_users").default(5).notNull(),
  maxStorageGb: integer("max_storage_gb").default(10).notNull(),
  features: jsonb("features").default([]).notNull(),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  planId: integer("plan_id").references(() => plans.id).notNull(),
  status: subscriptionStatusEnum("status").default('trial').notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start").defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscriptions_org").on(table.organizationId),
]);

// Users table - aligned with actual database structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  username: varchar("username", { length: 255 }).notNull(),
  
  // Authentication
  passwordHash: varchar("passwordHash", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("team_member"),
  userType: userTypeEnum("user_type").default("human").notNull(),
  permissions: jsonb("permissions"),
  
  // Status fields
  isActive: boolean("is_active").default(true),
  isEmailVerified: boolean("is_email_verified").default(false),
  invitationAccepted: boolean("invitation_accepted").default(false),
  lastLoginAt: timestamp("last_login_at"),
  
  // Customer and admin references
  customerId: integer("customer_id"),
  splynxAdminId: integer("splynx_admin_id"),
  splynxCustomerId: integer("splynx_customer_id"),
  
  // Profile information
  fullName: varchar("full_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  
  // Feature flags and external integrations
  canAssignTickets: boolean("can_assign_tickets").default(false),
  firebaseUid: varchar("firebase_uid", { length: 255 }),
  vapiApiKey: varchar("vapi_api_key", { length: 255 }),
  
  // Two-factor authentication
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  
  // Profile image
  avatarUrl: varchar("avatar_url", { length: 500 }),
  
  // Audit timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_organization").on(table.organizationId),
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
  index("idx_users_active").on(table.isActive),
]);

// Theme Settings table for organization-specific theming
export const themeSettings = pgTable("theme_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Theme configuration
  lightTheme: jsonb("light_theme"),
  darkTheme: jsonb("dark_theme"),
  brandSettings: jsonb("brand_settings"), // Logo, colors, fonts
  layoutSettings: jsonb("layout_settings"), // Layout preferences
  
  // Active theme
  activeTheme: varchar("active_theme", { length: 10 }).default("light"), // light, dark, auto
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_theme_settings_org").on(table.organizationId),
]);

// Activity Logs for audit trail (multi-tenant)
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id), // Nullable for scheduled/automated runs
  
  // Activity details
  actionType: activityTypeEnum("action_type").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'user', 'feature', 'strategy', etc.
  entityId: integer("entity_id"), // ID of the affected entity
  
  // Description and metadata
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activity_logs_org").on(table.organizationId),
  index("idx_activity_logs_user").on(table.userId),
  index("idx_activity_logs_entity").on(table.entityType, table.entityId),
  index("idx_activity_logs_created").on(table.createdAt.desc()),
]);

// ========================================
// MODULAR FEATURES MANAGEMENT SYSTEM
// ========================================

// Platform Features for modular architecture (multi-tenant)
export const platformFeatures = pgTable("platform_features", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  parentFeatureId: integer("parent_feature_id"), // For hierarchy
  
  // Feature identification
  name: varchar("name", { length: 255 }).notNull(),
  
  // Visibility control (simplified)
  visibilityStatus: varchar("visibility_status", { length: 20 }).default("draft"), // 'draft', 'dev', 'live', 'archived'
  isEnabled: boolean("is_enabled").default(false),
  
  // Essential feature metadata
  scopeDefinition: text("scope_definition"), // Maps to description in UI (legacy)
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  route: varchar("route", { length: 255 }), // Frontend route path
  
  // Detailed feature specification fields
  overview: text("overview"), // Clear description of feature's purpose and capabilities
  databaseTables: jsonb("database_tables").default('{}'), // Primary and supporting tables with fields used
  userDocumentation: text("user_documentation"), // Rich text/HTML content with headings
  implementationDetails: jsonb("implementation_details").default('{}'), // API endpoints, components, technical structure
  technicalSpecifications: jsonb("technical_specifications").default('{}'), // Authentication, permissions, performance, security
  
  // Linked pages (simple JSON array of page UUIDs)
  linkedPageIds: jsonb("linked_page_ids").default([]).$type<string[]>(),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_platform_features_org").on(table.organizationId),
  index("idx_platform_features_parent").on(table.parentFeatureId),
]);

// Feature Comments for user feedback (multi-tenant)
export const featureComments = pgTable("feature_comments", {
  id: serial("id").primaryKey(),
  featureId: integer("feature_id").references(() => platformFeatures.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => users.id),
  
  message: text("message").notNull(),
  isAdminMessage: boolean("is_admin_message").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feature_comments_feature").on(table.featureId),
  index("idx_feature_comments_author").on(table.authorId),
]);


// Feature Feedback for development features
export const featureFeedback = pgTable("feature_feedback", {
  id: serial("id").primaryKey(),
  featureId: integer("feature_id").references(() => platformFeatures.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  feedbackType: varchar("feedback_type", { length: 50 }).default("comment"), // 'comment', 'vote', 'bug_report', 'feature_request'
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("new"), // 'new', 'reviewed', 'addressed'
  upvotes: integer("upvotes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feature_feedback_feature").on(table.featureId),
  index("idx_feature_feedback_user").on(table.userId),
  index("idx_feature_feedback_status").on(table.status),
]);

// ========================================
// STRATEGY MANAGEMENT MODULE (CORE FEATURE)
// ========================================

// Mission and Vision statements - one per organization
export const missionVision = pgTable("mission_vision", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull().unique(),
  
  // Mission and Vision
  mission: text("mission"),
  vision: text("vision"),
  strategyStatementHtml: text("strategy_statement_html"),
  
  // Tracking
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_mission_vision_org").on(table.organizationId),
]);

// Objectives (OKRs) - multi-tenant
export const objectives = pgTable("objectives", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Objective details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // KPI details (missing fields that exist in database)
  primaryKpi: varchar("primary_kpi", { length: 255 }),
  calculationFormula: text("calculation_formula"),
  lastCalculatedAt: timestamp("last_calculated_at"),
  
  // Categorization (existing database fields)
  category: varchar("category", { length: 255 }).default("strategic"),
  priority: varchar("priority", { length: 255 }).default("high"),
  
  // Status and KPI tracking
  status: objectiveStatusEnum("status").default("Draft").notNull(),
  targetValue: decimal("target_value", { precision: 12, scale: 2 }),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }).default("0").notNull(),
  kpiType: kpiTypeEnum("kpi_type").default("Derived from Key Results").notNull(),
  
  // Timeline tracking (target_date exists in database but was missing from schema)
  targetDate: timestamp("target_date"),
  
  // Ownership
  ownerId: integer("owner_id").references(() => users.id),
  isOwnerOnly: boolean("is_owner_only").default(false),
  
  // Team assignment
  teamId: integer("team_id").references(() => teams.id),
  
  // Display order for manual sorting
  displayOrder: integer("display_order").default(0),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_objectives_org").on(table.organizationId),
  index("idx_objectives_owner").on(table.ownerId),
  index("idx_objectives_team").on(table.teamId),
  index("idx_objectives_status").on(table.status),
  index("idx_objectives_display_order").on(table.displayOrder),
  // Partial index for Live objectives (performance optimization)
  index("idx_objectives_status_live").on(table.status).where(sql`status = 'Live'`),
]);

// Key Results for objectives - multi-tenant (migration 002)
export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  objectiveId: integer("objective_id").references(() => objectives.id, { onDelete: "cascade" }),
  
  // Key result details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Measurement (migration 002: normalized precision)
  targetValue: decimal("target_value", { precision: 12, scale: 2 }),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // KR classification (migration 002)
  type: keyResultTypeEnum("type").default("Numeric Target").notNull(),
  
  // Status (migration 002: enum)
  status: keyResultStatusEnum("status").default("Not Started").notNull(),
  
  // Optional knowledge link (migration 002)
  knowledgeDocumentId: integer("knowledge_document_id").references(() => knowledgeDocuments.id), // FK to knowledge_documents.id, no cascade
  
  // Team and user assignment (NEW)
  teamId: integer("team_id").references(() => teams.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  
  // Ownership
  ownerId: integer("owner_id").references(() => users.id),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_key_results_org").on(table.organizationId),
  index("idx_key_results_objective").on(table.objectiveId),
  index("idx_key_results_owner").on(table.ownerId),
  // Composite index for listing/filtering (migration 002)
  index("idx_key_results_objective_status").on(table.objectiveId, table.status),
]);

// Key Result Tasks - multi-tenant (migration 003) - Enhanced for work item generation
export const keyResultTasks = pgTable("key_result_tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  keyResultId: integer("key_result_id").references(() => keyResults.id, { onDelete: "cascade" }),
  
  // Task details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Task properties (migration 003: enum status, no priority)
  status: keyResultTaskStatusEnum("status").default("Not Started").notNull(),
  
  // Recurring configuration
  isRecurring: boolean("is_recurring").default(false).notNull(),
  frequency: varchar("frequency", { length: 50 }), // 'once', 'daily', 'weekly', 'monthly', 'quarterly'
  frequencyParams: jsonb("frequency_params"), // {dayOfWeek: [1,3], dayOfMonth: 15, etc.}
  
  // Duration controls (for bounded recurring tasks)
  endDate: timestamp("end_date"),
  totalOccurrences: integer("total_occurrences"),
  
  // Team and user assignment (can override Key Result)
  teamId: integer("team_id").references(() => teams.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  
  // Generation and tracking
  nextDueDate: timestamp("next_due_date"),
  lastGeneratedDate: timestamp("last_generated_date"),
  generationStatus: varchar("generation_status", { length: 20 }).default("active"), // active, paused, completed
  
  // Completion metrics
  completedCount: integer("completed_count").default(0).notNull(),
  missedCount: integer("missed_count").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastCompletedDate: timestamp("last_completed_date"),
  
  // Activity tracking
  activityLog: jsonb("activity_log").default([]), // Array of completion records
  
  // Timeline (unchanged in migration 003)
  targetCompletion: timestamp("target_completion"),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_key_result_tasks_org").on(table.organizationId),
  index("idx_key_result_tasks_key_result").on(table.keyResultId),
  index("idx_key_result_tasks_assigned").on(table.assignedTo),
  index("idx_key_result_tasks_status").on(table.status),
  // Composite index for listing/filtering (migration 003)
  index("idx_krt_keyresult_status").on(table.keyResultId, table.status),
]);

// Key Result Comments - for quick comments during check-in meetings
export const keyResultComments = pgTable("key_result_comments", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").references(() => keyResults.id, { onDelete: "cascade" }).notNull(),
  meetingId: integer("meeting_id").references(() => checkInMeetings.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_kr_comments_key_result").on(table.keyResultId),
  index("idx_kr_comments_meeting").on(table.meetingId),
  index("idx_kr_comments_user").on(table.userId),
]);

// Routines table removed - functionality moved to keyResultTasks

// Check-in Meetings (Phase-1) - Moved before workItems to resolve reference
export const checkInMeetings = pgTable("check_in_meetings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  status: meetingStatusEnum("status").default("Planning").notNull(),
  meetingType: varchar("meeting_type", { length: 50 }).default("check_in"),
  agenda: jsonb("agenda").default([]),
  notes: text("notes"),
  richNotes: jsonb("rich_notes"), // TipTap editor content for formatted meeting minutes
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_meetings_org_team").on(table.organizationId, table.teamId),
  index("idx_meetings_scheduled").on(table.scheduledDate),
  index("idx_meetings_status").on(table.status),
]);

// Team Feedback table for post-meeting individual feedback (simplified)
export const teamFeedback = pgTable("team_feedback", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  meetingId: integer("meeting_id").references(() => checkInMeetings.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Simplified 3-point rating
  overallRating: varchar("overall_rating", { length: 10 }), // 'poor', 'good', or 'great'
  
  // Items for next check-in
  itemsForNextCheckIn: text("items_for_next_check_in"), // Items that should carry over
  
  // Timestamps
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_team_feedback_meeting").on(table.meetingId),
  index("idx_team_feedback_user").on(table.userId),
]);

// Migration 005: Work Items table (Phase-1 extended with target_meeting_id) - cleaned up
export const workItems = pgTable("work_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  teamId: integer("team_id").references(() => teams.id),
  keyResultTaskId: integer("key_result_task_id").references(() => keyResultTasks.id),
  checkInCycleId: integer("check_in_cycle_id").references(() => checkInCycles.id),
  targetMeetingId: integer("target_meeting_id").references(() => checkInMeetings.id),
  status: workItemStatusEnum("status").default("Planning").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  notes: text("notes"),
  dueDate: date("due_date"),
  ownerId: integer("owner_id").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  attachments: jsonb("attachments").default([]).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Workflow support (general purpose - not field engineering specific)
  workflowTemplateId: varchar("workflow_template_id", { length: 100 }),
  workflowSource: varchar("workflow_source", { length: 50 }),
  workflowMetadata: jsonb("workflow_metadata"),
  
  // Work item type for filtering and categorization (NEW)
  workItemType: varchar("work_item_type", { length: 100 }),
}, (table) => [
  index("idx_work_items_cycle_status").on(table.checkInCycleId, table.status),
  index("idx_work_items_org_due").on(table.organizationId, table.dueDate),
  index("idx_work_items_meeting").on(table.targetMeetingId),
  index("idx_work_items_key_result_task").on(table.keyResultTaskId),
  index("idx_work_items_workflow").on(table.workflowTemplateId),
  index("idx_work_items_type").on(table.workItemType),
]);

// Check-in Cycles for strategy reviews - multi-tenant (migration 006: lean + roles)
export const checkInCycles = pgTable("check_in_cycles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  objectiveId: integer("objective_id").references(() => objectives.id, { onDelete: "cascade" }),
  
  // Team association (migration 007)
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
  
  // TODO: Removed fields in migration 006
  // name: varchar("name", { length: 255 }).notNull(),     // REMOVED in migration 006
  // cycleNumber: integer("cycle_number").notNull(),        // REMOVED in migration 006
  
  // Timeline (migration 006: ensured NOT NULL)
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  
  // Status (migration 006: enum with default)
  status: checkInCycleStatusEnum("status").default("Planning").notNull(),
  
  // Notes (migration 007)
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_check_in_cycles_org").on(table.organizationId),
  index("idx_check_in_cycles_objective").on(table.objectiveId),
  index("idx_check_in_cycles_dates").on(table.startDate, table.endDate),
  index("idx_cycles_team_period").on(table.teamId, table.startDate, table.endDate),
]);

// Check-in Cycle Participants (migration 006)
export const checkInCycleParticipants = pgTable("check_in_cycle_participants", {
  id: serial("id").primaryKey(),
  checkInCycleId: integer("check_in_cycle_id").references(() => checkInCycles.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: participantRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_participants_cycle_role").on(table.checkInCycleId, table.role),
]);

// Teams table (migration 007 + Phase-1 extensions)
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  defaultCadence: defaultCadenceEnum("default_cadence").default("weekly").notNull(),
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
  
  // Enhanced cadence settings
  cadence: defaultCadenceEnum("cadence").default("weekly").notNull(),
  weeklyWeekday: weekdayEnum("weekly_weekday").default("mon"),
  monthlyRuleType: monthlyRuleTypeEnum("monthly_rule_type").default("nth_weekday"),
  monthlyNth: nthEnum("monthly_nth").default("1"),
  monthlyWeekday: weekdayEnum("monthly_weekday").default("mon"),
  monthlyDayOfMonth: integer("monthly_day_of_month").default(1),
  periodRuleType: periodRuleTypeEnum("period_rule_type").default("nth_weekday"),
  periodNth: nthEnum("period_nth").default("1"),
  periodWeekday: weekdayEnum("period_weekday").default("mon"),
  defaultMeetingLengthMinutes: meetingLengthEnum("default_meeting_length_minutes").default("15"),
  
  // Meeting anchor fields for explicit scheduling
  // Rules of use:
  // - daily: use meeting_time only
  // - weekly/bi_weekly: use meeting_anchor_dow + meeting_time
  // - monthly: either meeting_anchor_day_of_month OR (meeting_anchor_week_of_month + meeting_anchor_dow) + meeting_time
  // - quarterly/half_yearly/annual: like monthly, but starting from meeting_anchor_month and repeating every 3/6/12 months
  meeting_time: time("meeting_time").default("09:00").notNull(), // local wall-clock time
  meeting_anchor_dow: smallint("meeting_anchor_dow"), // 0=Sun...6=Sat (for weekly/Nth weekday patterns)
  meeting_anchor_week_of_month: smallint("meeting_anchor_week_of_month"), // 1,2,3,4 or -1 for "last" (monthly/quarterly/...)
  meeting_anchor_day_of_month: smallint("meeting_anchor_day_of_month"), // 1-31 (exact day option)
  meeting_anchor_month: smallint("meeting_anchor_month"), // 1-12 (used by quarterly/half_yearly/annual as the "first" anchor month)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_teams_org").on(table.organizationId),
  index("idx_teams_name").on(table.name),
]);

// Team Members table (migration 007)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: teamRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_team_members_team").on(table.teamId),
]);

// Objectives Snapshots (migration 007)
export const objectivesSnapshots = pgTable("objectives_snapshots", {
  id: serial("id").primaryKey(),
  checkInCycleId: integer("check_in_cycle_id").references(() => checkInCycles.id, { onDelete: "cascade" }).notNull(),
  objectiveId: integer("objective_id").references(() => objectives.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: numeric("target_value"),
  currentValue: numeric("current_value"),
  progressPercentage: numeric("progress_percentage"),
  status: varchar("status", { length: 50 }),
  keyResultsCount: integer("key_results_count").default(0),
  keyResultsCompleted: integer("key_results_completed").default(0),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_obj_snapshots_cycle").on(table.checkInCycleId),
  index("idx_obj_snapshots_objective").on(table.objectiveId),
]);

// Work Items Snapshots (migration 008)
export const workItemsSnapshots = pgTable("work_items_snapshots", {
  id: serial("id").primaryKey(),
  checkInCycleId: integer("check_in_cycle_id").references(() => checkInCycles.id, { onDelete: "cascade" }).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: workItemStatusEnum("status").notNull(),
  dueDate: date("due_date"),
  ownerId: integer("owner_id").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  keyResultTaskId: integer("key_result_task_id").references(() => keyResultTasks.id),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_work_snapshots_cycle").on(table.checkInCycleId),
  index("idx_work_snapshots_item").on(table.workItemId),
  index("idx_work_snapshots_status").on(table.status),
]);

// Key Result Snapshots (Phase-1)
export const keyResultSnapshots = pgTable("key_result_snapshots", {
  id: serial("id").primaryKey(),
  checkInMeetingId: integer("check_in_meeting_id").references(() => checkInMeetings.id, { onDelete: "cascade" }).notNull(),
  keyResultId: integer("key_result_id").references(() => keyResults.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 12, scale: 2 }),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }),
  status: keyResultStatusEnum("status").notNull(),
  type: keyResultTypeEnum("type").notNull(),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_kr_snapshots_meeting").on(table.checkInMeetingId),
  index("idx_kr_snapshots_kr").on(table.keyResultId),
]);

// Meeting Topics (Phase-1)
export const meetingTopics = pgTable("meeting_topics", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => checkInMeetings.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: integer("priority").default(0),
  timeAllocated: integer("time_allocated"), // minutes
  actualTime: integer("actual_time"), // minutes
  status: varchar("status", { length: 50 }).default("pending"), // pending, discussed, deferred
  outcomes: text("outcomes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_topics_meeting").on(table.meetingId),
  index("idx_topics_priority").on(table.priority),
]);

// Meeting Attendees (Phase-1)
export const meetingAttendees = pgTable("meeting_attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => checkInMeetings.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("attendee"), // organizer, attendee, optional
  attendance: varchar("attendance", { length: 50 }).default("pending"), // pending, present, absent, partial
  joinTime: timestamp("join_time"),
  leaveTime: timestamp("leave_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_attendees_meeting").on(table.meetingId),
  index("idx_attendees_user").on(table.userId),
]);

// Meeting Item Updates (Phase-1)
export const meetingItemUpdates = pgTable("meeting_item_updates", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => checkInMeetings.id, { onDelete: "cascade" }).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id),
  keyResultId: integer("key_result_id").references(() => keyResults.id),
  objectiveId: integer("objective_id").references(() => objectives.id),
  updateType: updateTypeEnum("update_type").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  notes: text("notes"),
  updatedBy: integer("updated_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_updates_meeting").on(table.meetingId),
  index("idx_updates_work_item").on(table.workItemId),
  index("idx_updates_key_result").on(table.keyResultId),
  index("idx_updates_objective").on(table.objectiveId),
]);

// ========================================
// KNOWLEDGE BASE MODULE (CORE FEATURE)
// ========================================

// Knowledge Documents - multi-tenant  
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Knowledge Hub v3 - Folder and Type
  folderId: integer("folder_id"),
  documentType: knowledgeDocumentTypeEnum("document_type").default("internal_kb"),
  
  // Document details
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  summary: text("summary"),
  categories: text("categories").array().notNull().default([]), // Multi-select categories like tags  
  tags: text("tags").array().default([]), // Array of tags
  
  // Document status and visibility with proper enums
  status: documentStatusEnum("status").default("draft").notNull(), 
  visibility: documentVisibilityEnum("visibility").default("internal").notNull(),
  
  // Unified visibility control
  unifiedStatus: unifiedStatusEnum("unified_status").default("draft"),
  
  // Metadata
  authorId: integer("author_id").references(() => users.id),
  estimatedReadingTime: integer("estimated_reading_time"), // minutes
  metadata: jsonb("metadata"), // Additional document metadata
  
  // Knowledge Hub v3 - Training Module Settings
  completionPoints: integer("completion_points").default(0),
  completionRequirement: knowledgeCompletionRequirementEnum("completion_requirement"),
  quizPassingScore: integer("quiz_passing_score").default(70),
  
  // Knowledge Hub v3 - External File Link
  externalFileUrl: text("external_file_url"),
  externalFileSource: varchar("external_file_source", { length: 50 }),
  externalFileId: varchar("external_file_id", { length: 255 }),
  
  // AI and search
  searchVector: text("search_vector"), // For full-text search
  aiEmbedding: jsonb("ai_embedding"), // For semantic search
  
  // Audit
  publishedAt: timestamp("published_at"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_docs_org").on(table.organizationId),
  index("idx_knowledge_docs_author").on(table.authorId),
  index("idx_knowledge_docs_folder").on(table.folderId),
  index("idx_knowledge_docs_type").on(table.documentType),
  // Indexes for array columns (categories and tags) - PostgreSQL will automatically optimize for arrays
  index("idx_knowledge_docs_categories").on(table.categories),
  index("idx_knowledge_docs_tags").on(table.tags),
  index("idx_knowledge_docs_status").on(table.status),
]);

// Knowledge Categories - multi-tenant
export const knowledgeCategories: any = pgTable("knowledge_categories", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 50 }),
  icon: varchar("icon", { length: 50 }),
  
  // Hierarchy
  parentId: integer("parent_id").references(() => knowledgeCategories.id),
  sortOrder: integer("sort_order").default(0),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_categories_org").on(table.organizationId),
  index("idx_knowledge_categories_parent").on(table.parentId),
]);

// Knowledge Document Versions - for version history
export const knowledgeDocumentVersions = pgTable("knowledge_document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  versionNumber: integer("version_number").notNull(),
  
  // Version snapshot
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  summary: text("summary"),
  
  // Change tracking
  changedBy: integer("changed_by").references(() => users.id).notNull(),
  changeDescription: text("change_description"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_doc_versions_document").on(table.documentId),
  index("idx_doc_versions_number").on(table.documentId, table.versionNumber),
  index("idx_doc_versions_changed_by").on(table.changedBy),
  index("idx_doc_versions_created").on(table.createdAt.desc()),
]);

// Knowledge Document Attachments - link documents to strategy items
export const knowledgeDocumentAttachments = pgTable("knowledge_document_attachments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  
  // Links to strategy items (only one should be set)
  objectiveId: integer("objective_id").references(() => objectives.id, { onDelete: "cascade" }),
  keyResultId: integer("key_result_id").references(() => keyResults.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => keyResultTasks.id, { onDelete: "cascade" }),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "cascade" }),
  
  // Attachment metadata
  attachedBy: integer("attached_by").references(() => users.id).notNull(),
  attachedAt: timestamp("attached_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  index("idx_doc_attachments_document").on(table.documentId),
  index("idx_doc_attachments_objective").on(table.objectiveId),
  index("idx_doc_attachments_key_result").on(table.keyResultId),
  index("idx_doc_attachments_task").on(table.taskId),
  index("idx_doc_attachments_work_item").on(table.workItemId),
  index("idx_doc_attachments_attached_by").on(table.attachedBy),
]);

// Knowledge Document Activity - activity logging
export const knowledgeDocumentActivity = pgTable("knowledge_document_activity", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Activity details
  action: varchar("action", { length: 50 }).notNull(), // 'created', 'edited', 'viewed', 'published', 'archived', 'attached', 'detached', 'version_created'
  details: jsonb("details"), // Additional action details
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_doc_activity_document").on(table.documentId),
  index("idx_doc_activity_user").on(table.userId),
  index("idx_doc_activity_action").on(table.action),
  index("idx_doc_activity_created").on(table.createdAt.desc()),
]);

// Document Assignments - Training system
export const documentAssignments = pgTable("document_assignments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
  assignerId: integer("assigner_id").references(() => users.id).notNull(),
  
  // Work item integration
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "set null" }),
  
  // Assignment details
  status: varchar("status", { length: 20 }).default("assigned").notNull(), // assigned, in_progress, completed
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high
  
  // Dates
  dueDate: timestamp("due_date"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  
  // Audit trail
  completionNotes: text("completion_notes"),
  timeSpentMinutes: integer("time_spent_minutes"),
  acknowledgedUnderstanding: boolean("acknowledged_understanding").default(false),
  metadata: jsonb("metadata").$type<{
    completedViaWorkflow?: boolean;
    completedIp?: string;
    completedTimestamp?: string;
    [key: string]: any;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_doc_assignments_org").on(table.organizationId),
  index("idx_doc_assignments_document").on(table.documentId),
  index("idx_doc_assignments_user").on(table.userId),
  index("idx_doc_assignments_team").on(table.teamId),
  index("idx_doc_assignments_assigner").on(table.assignerId),
  index("idx_doc_assignments_status").on(table.status),
  index("idx_doc_assignments_due_date").on(table.dueDate),
  index("idx_doc_assignments_work_item").on(table.workItemId),
]);

// Onboarding Plans - Templates for training workflows
export const onboardingPlans = pgTable("onboarding_plans", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetRoles: jsonb("target_roles").default([]).$type<string[]>(), // ['team_member', 'manager']
  
  // Ordered list of training documents
  documentSequence: jsonb("document_sequence").default([]).$type<{
    documentId: number;
    dayOffset: number; // Days after onboarding starts
    required: boolean;
  }[]>(),
  
  isActive: boolean("is_active").default(true),
  autoAssignNewUsers: boolean("auto_assign_new_users").default(false),
  
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_plans_org").on(table.organizationId),
  index("idx_onboarding_plans_active").on(table.isActive),
]);

// User Onboarding Progress - Track user progress through onboarding
export const userOnboardingProgress = pgTable("user_onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: integer("plan_id").references(() => onboardingPlans.id, { onDelete: "cascade" }).notNull(),
  
  status: varchar("status", { length: 20 }).default("in_progress"), // in_progress, completed, paused
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  
  // Progress tracking
  progress: jsonb("progress").default({}).$type<{
    [documentId: string]: {
      assignmentId: number;
      status: string;
      completedAt?: string;
    }
  }>(),
}, (table) => [
  index("idx_user_onboarding_user").on(table.userId),
  index("idx_user_onboarding_plan").on(table.planId),
  index("idx_user_onboarding_status").on(table.status),
]);

// ========================================
// KNOWLEDGE HUB ENTERPRISE EXTENSION (v3)
// ========================================
// Note: Core enums (knowledgeDocumentTypeEnum, knowledgeCompletionRequirementEnum) 
// are defined with other document enums near line 89 for proper table references.

// Additional enums for Knowledge Hub features
export const folderTypeEnum = pgEnum('folder_type', [
  'general',
  'training', 
  'customer',
  'content',
  'internal',
]);

// Process Folder Types - for organizing agents and workflow templates
export const processFolderTypeEnum = pgEnum('process_folder_type', [
  'agents',
  'templates',
  'shared',
  'reports',
  'files'
]);

export const trainingStepTypeEnum = pgEnum('training_step_type', [
  'video',
  'checklist',
  'resource',
  'quiz',
  'practical_task'
]);

export const lifecycleStatusEnum = pgEnum('lifecycle_status', [
  'draft',
  'pending_review',
  'active',
  'expiring',
  'expired',
  'archived'
]);

export const reportAccessTypeEnum = pgEnum('report_access_type', [
  'public',
  'role_based',
  'user_based'
]);

export const reportBlockTypeEnum = pgEnum('report_block_type', [
  'rich_text',
  'data_table',
  'chart',
  'doc_snippet'
]);

export const userStatusTypeEnum = pgEnum('user_status_type', [
  'active',
  'away',
  'in_meeting',
  'offline'
]);

export const activityEventTypeEnum = pgEnum('activity_event_type', [
  'training_completed',
  'document_published',
  'sale_recorded',
  'work_item_updated',
  'whatsapp_message',
  'custom'
]);

export const aiApprovalStatusEnum = pgEnum('ai_approval_status', [
  'pending',
  'approved',
  'rejected'
]);

// Knowledge Folders - hierarchical folder system
export const knowledgeFolders = pgTable("knowledge_folders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  parentId: integer("parent_id"),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  folderType: folderTypeEnum("folder_type").default("general"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 50 }),
  metadata: jsonb("metadata").default({}),
  sortOrder: integer("sort_order").default(0),
  isSystem: boolean("is_system").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_folders_org").on(table.organizationId),
  index("idx_folders_parent").on(table.parentId),
  index("idx_folders_type").on(table.folderType),
  unique("unique_folder_slug_per_parent").on(table.organizationId, table.parentId, table.slug),
]);

// Training Module Steps
export const trainingModuleSteps = pgTable("training_module_steps", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  stepOrder: integer("step_order").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  stepType: trainingStepTypeEnum("step_type").notNull(),
  content: text("content"),
  config: jsonb("config").default({}).$type<{
    url?: string;
    embedType?: 'youtube' | 'vimeo';
    items?: Array<{ id: string; label: string; required: boolean }>;
    passingScore?: number;
    maxAttempts?: number;
    pointsPerQuestion?: number[];
    requiresSupervisorSignoff?: boolean;
    instructions?: string;
  }>(),
  attachments: jsonb("attachments").default([]).$type<number[]>(),
  required: boolean("required").default(true),
  estimatedMinutes: integer("estimated_minutes").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_training_steps_doc").on(table.documentId),
  index("idx_training_steps_order").on(table.documentId, table.stepOrder),
]);

// Training Quiz Questions
export const trainingQuizQuestions = pgTable("training_quiz_questions", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id").references(() => trainingModuleSteps.id, { onDelete: "cascade" }).notNull(),
  questionOrder: integer("question_order").notNull(),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 50 }).notNull(),
  options: jsonb("options").$type<Array<{ id: string; text: string; isCorrect: boolean }>>(),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  points: integer("points").default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_quiz_questions_step").on(table.stepId),
  index("idx_quiz_questions_order").on(table.stepId, table.questionOrder),
]);

// Training Progress
export const trainingProgress = pgTable("training_progress", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignmentId: integer("assignment_id").references(() => documentAssignments.id),
  currentStepId: integer("current_step_id").references(() => trainingModuleSteps.id),
  status: varchar("status", { length: 50 }).default("not_started"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalTimeSeconds: integer("total_time_seconds").default(0),
  quizScore: decimal("quiz_score", { precision: 5, scale: 2 }),
  quizPointsEarned: integer("quiz_points_earned").default(0),
  quizAttempts: integer("quiz_attempts").default(0),
  stepCompletions: jsonb("step_completions").default({}).$type<{
    [stepId: string]: {
      completedAt: string;
      data?: any;
      score?: number;
    };
  }>(),
  certificateUrl: text("certificate_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_training_progress_user").on(table.userId),
  index("idx_training_progress_doc").on(table.documentId),
  index("idx_training_progress_status").on(table.status),
  unique("unique_training_progress").on(table.documentId, table.userId, table.assignmentId),
]);

// User Points
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  totalPoints: integer("total_points").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_points").on(table.userId),
  index("idx_user_points_org").on(table.organizationId),
]);

// Point Transactions
export const pointTransactions = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  points: integer("points").notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceId: integer("source_id"),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_point_transactions_user").on(table.userId),
  index("idx_point_transactions_org").on(table.organizationId),
  index("idx_point_transactions_created").on(table.createdAt.desc()),
]);

// Document Lifecycle
export const documentLifecycle = pgTable("document_lifecycle", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  lifecycleStatus: lifecycleStatusEnum("lifecycle_status").default("draft"),
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  reviewDate: date("review_date"),
  reviewCycleDays: integer("review_cycle_days"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: integer("last_reviewed_by").references(() => users.id),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(false),
  acknowledgmentCount: integer("acknowledgment_count").default(0),
  approvalRequired: boolean("approval_required").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  renewalWorkItemId: integer("renewal_work_item_id").references(() => workItems.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_doc_lifecycle").on(table.documentId),
  index("idx_lifecycle_status").on(table.lifecycleStatus),
  index("idx_lifecycle_expiration").on(table.expirationDate),
]);

// Public Report Sections
export const publicReportSections = pgTable("public_report_sections", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sectionOrder: integer("section_order").notNull(),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_report_sections_doc").on(table.documentId),
  index("idx_report_sections_order").on(table.documentId, table.sectionOrder),
]);

// Public Report Blocks
export const publicReportBlocks = pgTable("public_report_blocks", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => publicReportSections.id, { onDelete: "cascade" }).notNull(),
  blockType: reportBlockTypeEnum("block_type").notNull(),
  blockOrder: integer("block_order").notNull(),
  content: text("content"),
  queryConfig: jsonb("query_config").default({}).$type<{
    entity?: string;
    filters?: Array<{ field: string; op: string; value: any }>;
    columns?: string[];
    sorting?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    aggregations?: Array<{ field: string; fn: string }>;
    joins?: Array<{ table: string; on: string; columns: string[] }>;
    enableCsv?: boolean;
    enablePdf?: boolean;
  }>(),
  config: jsonb("config").default({}).$type<{
    chartType?: 'line' | 'bar' | 'pie';
    documentId?: number;
    heading?: string;
    maxChars?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_report_blocks_section").on(table.sectionId),
  index("idx_report_blocks_order").on(table.sectionId, table.blockOrder),
]);

// Public Report Access Log
export const publicReportAccessLog = pgTable("public_report_access_log", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id),
  accessType: varchar("access_type", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sectionViewed: varchar("section_viewed", { length: 255 }),
  accessedAt: timestamp("accessed_at").defaultNow(),
}, (table) => [
  index("idx_report_access_doc").on(table.documentId),
  index("idx_report_access_time").on(table.accessedAt.desc()),
]);

// User Status (for Team Page)
export const userStatus = pgTable("user_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: userStatusTypeEnum("status").default("offline"),
  statusMessage: varchar("status_message", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_status").on(table.userId),
]);

// Activity Feed
export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  eventType: activityEventTypeEnum("event_type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activity_feed_org").on(table.organizationId),
  index("idx_activity_feed_created").on(table.createdAt.desc()),
  index("idx_activity_feed_type").on(table.eventType),
]);

// WhatsApp Messages (read-only bridge)
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  groupId: varchar("group_id", { length: 255 }).notNull(),
  groupName: varchar("group_name", { length: 255 }),
  senderPhone: varchar("sender_phone", { length: 50 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  matchedUserId: integer("matched_user_id").references(() => users.id),
  messageType: varchar("message_type", { length: 50 }).default("text"),
  textContent: text("text_content"),
  mediaUrl: text("media_url"),
  whatsappTimestamp: timestamp("whatsapp_timestamp").notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
}, (table) => [
  index("idx_whatsapp_org").on(table.organizationId),
  index("idx_whatsapp_timestamp").on(table.whatsappTimestamp.desc()),
  index("idx_whatsapp_group").on(table.groupId),
]);

// AI Content Generations (with approval workflow)
export const aiContentGenerations = pgTable("ai_content_generations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentId: integer("document_id").references(() => knowledgeDocuments.id),
  mode: varchar("mode", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  contextDocuments: jsonb("context_documents").default([]).$type<Array<{ id: number; title: string }>>(),
  originalText: text("original_text"),
  generatedContent: text("generated_content"),
  approvalStatus: aiApprovalStatusEnum("approval_status").default("pending"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  modelUsed: varchar("model_used", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  applied: boolean("applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_gen_org").on(table.organizationId),
  index("idx_ai_gen_user").on(table.userId),
  index("idx_ai_gen_doc").on(table.documentId),
  index("idx_ai_gen_status").on(table.approvalStatus),
]);

// Microsoft 365 Connections
export const microsoft365Connections = pgTable("microsoft_365_connections", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  scopes: text("scopes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_ms365_connection").on(table.organizationId, table.userId),
]);

// ========================================
// KNOWLEDGE HUB INSERT SCHEMAS
// ========================================

export const insertKnowledgeFolderSchema = createInsertSchema(knowledgeFolders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeFolder = z.infer<typeof insertKnowledgeFolderSchema>;
export type KnowledgeFolder = typeof knowledgeFolders.$inferSelect;

export const insertTrainingModuleStepSchema = createInsertSchema(trainingModuleSteps).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrainingModuleStep = z.infer<typeof insertTrainingModuleStepSchema>;
export type TrainingModuleStep = typeof trainingModuleSteps.$inferSelect;

export const insertTrainingQuizQuestionSchema = createInsertSchema(trainingQuizQuestions).omit({ id: true, createdAt: true });
export type InsertTrainingQuizQuestion = z.infer<typeof insertTrainingQuizQuestionSchema>;
export type TrainingQuizQuestion = typeof trainingQuizQuestions.$inferSelect;

export const insertTrainingProgressSchema = createInsertSchema(trainingProgress).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
export type TrainingProgress = typeof trainingProgress.$inferSelect;

export const insertUserPointsSchema = createInsertSchema(userPoints).omit({ id: true, updatedAt: true });
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type UserPoints = typeof userPoints.$inferSelect;

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({ id: true, createdAt: true });
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;

export const insertDocumentLifecycleSchema = createInsertSchema(documentLifecycle).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocumentLifecycle = z.infer<typeof insertDocumentLifecycleSchema>;
export type DocumentLifecycle = typeof documentLifecycle.$inferSelect;

export const insertPublicReportSectionSchema = createInsertSchema(publicReportSections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublicReportSection = z.infer<typeof insertPublicReportSectionSchema>;
export type PublicReportSection = typeof publicReportSections.$inferSelect;

export const insertPublicReportBlockSchema = createInsertSchema(publicReportBlocks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublicReportBlock = z.infer<typeof insertPublicReportBlockSchema>;
export type PublicReportBlock = typeof publicReportBlocks.$inferSelect;

export const insertUserStatusSchema = createInsertSchema(userStatus).omit({ id: true, updatedAt: true });
export type InsertUserStatus = z.infer<typeof insertUserStatusSchema>;
export type UserStatusType = typeof userStatus.$inferSelect;

export const insertActivityFeedSchema = createInsertSchema(activityFeed).omit({ id: true, createdAt: true });
export type InsertActivityFeed = z.infer<typeof insertActivityFeedSchema>;
export type ActivityFeed = typeof activityFeed.$inferSelect;

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, receivedAt: true });
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

export const insertAiContentGenerationSchema = createInsertSchema(aiContentGenerations).omit({ id: true, createdAt: true });
export type InsertAiContentGeneration = z.infer<typeof insertAiContentGenerationSchema>;
export type AiContentGeneration = typeof aiContentGenerations.$inferSelect;

// ========================================
// LEGACY DATA MIGRATION COMPLETED
// ========================================
// Splynx administrators table has been migrated and removed

// ========================================
// PAGE MANAGEMENT SYSTEM
// ========================================

// Layout Templates for consistent page structure
export const layoutTemplates = pgTable("layout_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // dashboard, form, menu, editor, homepage
  
  // Layout Rules and Configuration
  layoutRules: jsonb("layout_rules").notNull(), // Detailed rules for AI to follow
  sectionTemplates: jsonb("section_templates").default([]), // Predefined section types
  componentGuidelines: jsonb("component_guidelines").default({}), // Component usage rules
  responsiveBreakpoints: jsonb("responsive_breakpoints").default({}), // Mobile/tablet/desktop rules
  
  // Design Guidelines
  designPrinciples: text("design_principles"), // Written guidelines for AI
  codePatterns: jsonb("code_patterns").default([]), // Common code patterns to follow
  accessibility: jsonb("accessibility").default({}), // A11y requirements
  
  // Status and Usage
  isActive: boolean("is_active").default(true),
  isGlobal: boolean("is_global").default(false), // Available to all organizations
  usageCount: integer("usage_count").default(0), // How many pages use this template
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_layout_templates_org").on(table.organizationId),
  index("idx_layout_templates_category").on(table.category),
  index("idx_layout_templates_active").on(table.isActive),
]);

// Strategy Settings table for configurable automation
export const strategySettings = pgTable("strategy_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Cron configuration
  cronEnabled: boolean("cron_enabled").default(true).notNull(),
  cronSchedule: varchar("cron_schedule", { length: 255 }).default("0 2 * * *"),
  lookaheadDays: integer("lookahead_days").default(7).notNull(),
  lastCronExecution: timestamp("last_cron_execution"),
  
  // Generation settings
  autoGenerateWorkItems: boolean("auto_generate_work_items").default(true).notNull(),
  generateOnTaskCreation: boolean("generate_on_task_creation").default(true).notNull(),
  notifyOnGeneration: boolean("notify_on_generation").default(false).notNull(),
  notifyEmailRecipients: text("notify_email_recipients").array(),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
}, (table) => [
  index("idx_strategy_settings_org").on(table.organizationId),
]);

// Pages table for page management system
export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  slug: varchar("slug", { length: 255 }).notNull(),
  path: varchar("path", { length: 500 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Unified visibility control
  unifiedStatus: unifiedStatusEnum("unified_status").default("draft"),
  
  // Legacy status fields (to be removed in Phase 4)
  status: pageStatusEnum("status").default('draft').notNull(),
  buildStatus: buildStatusEnum("build_status").default('not_started').notNull(),
  functions: jsonb("functions").default([]),
  isCorePage: boolean("is_core_page").default(false).notNull(),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  
  // Enhanced page content and configuration
  pageContent: jsonb("page_content"), // Sections, components, and data sources
  themeOverrides: jsonb("theme_overrides"), // Page-specific theme settings
  layoutTemplateId: integer("layout_template_id").references(() => layoutTemplates.id),
  visibilityRules: jsonb("visibility_rules").default({}), // Advanced visibility controls
  pageMetadata: jsonb("page_metadata").default({}), // SEO, social sharing, etc.
  componentConfig: jsonb("component_config").default({}), // Component-specific settings
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_pages_org").on(table.organizationId),
  index("idx_pages_slug").on(table.slug),
  index("idx_pages_status").on(table.status),
  index("idx_pages_layout").on(table.layoutTemplateId),
  index("idx_pages_deleted").on(table.deletedAt),
]);

// [REMOVED: page_visibility_rules - Replaced by unified_status system]
// [REMOVED: page_docs - Not actively used]

// New page requests workflow
export const newPageRequests = pgTable("new_page_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  useCase: text("use_case"),
  targetRoles: jsonb("target_roles").default([]),
  orgScope: orgScopeEnum("org_scope").default('all'),
  orgList: jsonb("org_list"),
  functionsExpected: jsonb("functions_expected").default([]),
  status: requestStatusEnum("status").default('submitted').notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_page_requests_org").on(table.organizationId),
  index("idx_page_requests_status").on(table.status),
  index("idx_page_requests_requester").on(table.requestedBy),
]);

// ========================================
// DATABASE EXPLORER METADATA
// ========================================

// Database explorer metadata tables
export const dataTables = pgTable("data_tables", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  tableName: varchar("table_name", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }),
  description: text("description"),
  docUrl: varchar("doc_url", { length: 500 }),
  rowCount: integer("row_count").default(0),
  sizeBytes: integer("size_bytes").default(0),
  lastAnalyzed: timestamp("last_analyzed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_data_tables_org").on(table.organizationId),
]);

export const dataFields = pgTable("data_fields", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => dataTables.id, { onDelete: "cascade" }).notNull(),
  fieldName: varchar("field_name", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 100 }).notNull(),
  nullable: boolean("nullable").default(true),
  defaultValue: varchar("default_value", { length: 500 }),
  isPk: boolean("is_pk").default(false),
  isFk: boolean("is_fk").default(false),
  indexName: varchar("index_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_data_fields_table").on(table.tableId),
]);

export const dataRelationships = pgTable("data_relationships", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  fromTable: varchar("from_table", { length: 255 }).notNull(),
  fromField: varchar("from_field", { length: 255 }).notNull(),
  toTable: varchar("to_table", { length: 255 }).notNull(),
  toField: varchar("to_field", { length: 255 }).notNull(),
  cardinality: cardinalityEnum("cardinality").notNull(),
  onDelete: deleteActionEnum("on_delete").default('no_action').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_data_relationships_org").on(table.organizationId),
  index("idx_data_relationships_from").on(table.fromTable, table.fromField),
  index("idx_data_relationships_to").on(table.toTable, table.toField),
]);

export const erdLayouts = pgTable("erd_layouts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  layoutData: jsonb("layout_data").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_erd_layouts_org_user").on(table.organizationId, table.userId),
]);

// ========================================
// ROLE MANAGEMENT SYSTEM
// ========================================
// [REMOVED: roles and userRoles tables - Role management handled directly in users table via role field]

// ========================================
// MENU MANAGEMENT SYSTEM
// ========================================

// Menu Sections - Top level categories in navigation
export const menuSections = pgTable("menu_sections", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // Lucide icon name, emoji, or filename
  iconType: varchar("icon_type", { length: 20 }).default("lucide"), // lucide, emoji, or image
  iconUrl: text("icon_url"), // Full URL for uploaded images
  orderIndex: integer("order_index").default(0),
  isVisible: boolean("is_visible").default(true),
  isCollapsible: boolean("is_collapsible").default(true),
  isDefaultExpanded: boolean("is_default_expanded").default(true),
  rolePermissions: jsonb("role_permissions").default([]), // Which roles can see this section
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_menu_sections_org").on(table.organizationId),
  index("idx_menu_sections_order").on(table.orderIndex),
]);

// Menu Items - Individual navigation items
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  sectionId: integer("section_id").references(() => menuSections.id, { onDelete: "cascade" }),
  pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // Self-reference for nested items - will be added after table definition
  
  title: varchar("title", { length: 255 }).notNull(),
  path: varchar("path", { length: 500 }).notNull(),
  icon: varchar("icon", { length: 100 }), // Lucide icon name, emoji, or filename
  iconType: varchar("icon_type", { length: 20 }).default("lucide"), // lucide, emoji, or image
  iconUrl: text("icon_url"), // Full URL for uploaded images
  description: text("description"),
  
  orderIndex: integer("order_index").default(0),
  isVisible: boolean("is_visible").default(true),
  isExternal: boolean("is_external").default(false), // External link
  openInNewTab: boolean("open_in_new_tab").default(false),
  
  // Badge and status
  badge: varchar("badge", { length: 50 }), // "NEW", "BETA", etc.
  badgeColor: varchar("badge_color", { length: 50 }), // CSS class or color
  status: varchar("status", { length: 50 }).default("active"), // active, disabled, coming_soon
  
  // Permissions and visibility
  rolePermissions: jsonb("role_permissions").default([]), // Which roles can see this item
  customPermissions: jsonb("custom_permissions").default({}), // Advanced permissions
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_menu_items_org").on(table.organizationId),
  index("idx_menu_items_section").on(table.sectionId),
  index("idx_menu_items_parent").on(table.parentId),
  index("idx_menu_items_page").on(table.pageId),
  index("idx_menu_items_order").on(table.orderIndex),
]);

// ========================================
// INTEGRATIONS & AGENT BUILDER MODULE
// ========================================

// Unified integrations table for all external platforms
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Integration details
  platformType: varchar("platform_type", { length: 50 }).notNull(), // 'splynx', 'xero', 'outlook', 'firebase', 'openai'
  name: varchar("name", { length: 255 }).notNull(),
  connectionConfig: jsonb("connection_config").default({}).notNull(), // Platform-specific config
  credentialsEncrypted: text("credentials_encrypted"), // Encrypted credentials
  
  // Connection status
  connectionStatus: varchar("connection_status", { length: 20 }).default("disconnected").notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  testResult: jsonb("test_result").default({}),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_integrations_org").on(table.organizationId),
  index("idx_integrations_platform").on(table.platformType),
]);

// SQL Direct audit logs for tracking query execution
export const sqlDirectAuditLogs = pgTable("sql_direct_audit_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  query: text("query").notNull(),
  parameters: text("parameters"),
  executionTime: integer("execution_time").notNull(),
  rowCount: integer("row_count").notNull(),
  success: boolean("success").notNull(),
  error: text("error"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_sql_audit_org").on(table.organizationId),
  index("idx_sql_audit_timestamp").on(table.timestamp),
  index("idx_sql_audit_success").on(table.success),
]);

// Database connections for multi-SQL database integrations
export const databaseConnections = pgTable("database_connections", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Database configuration
  databaseType: varchar("database_type", { length: 50 }).notNull(), // 'postgresql', 'mysql', 'sqlite', 'mssql', 'mariadb'
  displayName: varchar("display_name", { length: 255 }).notNull(),
  
  // Connection details (encrypted in production)
  host: varchar("host", { length: 255 }),
  port: integer("port"),
  database: varchar("database", { length: 255 }),
  username: varchar("username", { length: 255 }),
  passwordEncrypted: text("password_encrypted"),
  
  // Advanced configuration
  schema: varchar("schema", { length: 255 }), // PostgreSQL schema
  connectionString: text("connection_string"), // Full connection string if provided
  sslConfig: jsonb("ssl_config").default({}), // SSL/TLS configuration
  poolConfig: jsonb("pool_config").default({ min: 2, max: 10 }).notNull(), // Connection pool settings
  
  // Connection health
  connectionStatus: varchar("connection_status", { length: 20 }).default("untested").notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestError: text("last_test_error"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_db_connections_integration").on(table.integrationId),
  index("idx_db_connections_org").on(table.organizationId),
  index("idx_db_connections_type").on(table.databaseType),
]);

// ========================================
// CUSTOMER MAPPING TOOL TABLES
// ========================================

// Splynx locations/service areas - synchronized from Splynx for customer mapping
export const splynxLocations = pgTable("splynx_locations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Splynx location data
  splynxLocationId: varchar("splynx_location_id", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  locationType: varchar("location_type", { length: 100 }), // e.g., "tariff", "service_area", "region"
  
  // Default coordinates for this location (for customers without GPS)
  defaultLat: decimal("default_lat", { precision: 10, scale: 7 }),
  defaultLng: decimal("default_lng", { precision: 10, scale: 7 }),
  
  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at"),
  isActive: boolean("is_active").default(true),
  
  // Metadata from Splynx
  metadata: jsonb("metadata").default({}), // Additional location data from Splynx
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_splynx_locations_org").on(table.organizationId),
  index("idx_splynx_locations_splynx_id").on(table.splynxLocationId),
]);

// Customer geocoding cache - to avoid re-geocoding same addresses
export const customerGeocodingCache = pgTable("customer_geocoding_cache", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Customer reference
  splynxCustomerId: varchar("splynx_customer_id", { length: 50 }).notNull(),
  
  // Address used for geocoding
  addressHash: varchar("address_hash", { length: 64 }).notNull(), // MD5/SHA256 of full address
  fullAddress: text("full_address").notNull(),
  
  // Geocoded coordinates
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geocodeMethod: varchar("geocode_method", { length: 50 }), // 'gps', 'google_maps', 'location_fallback', 'unmappable'
  geocodeStatus: varchar("geocode_status", { length: 50 }), // 'success', 'failed', 'no_address'
  
  // Google Maps API response (for debugging)
  geocodeResponse: jsonb("geocode_response").default({}),
  
  // Audit
  geocodedAt: timestamp("geocoded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_geocoding_cache_org").on(table.organizationId),
  index("idx_geocoding_cache_customer").on(table.splynxCustomerId),
  index("idx_geocoding_cache_hash").on(table.addressHash),
]);

// ========================================
// OCR & DYNAMIC FIELD MANAGEMENT
// ========================================

// Custom field definitions - tracks dynamically created fields for OCR extraction
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Target table
  tableName: varchar("table_name", { length: 100 }).notNull(), // 'addresses', 'customers', 'tickets', etc.
  fieldName: varchar("field_name", { length: 100 }).notNull(), // 'router_serial_number', 'equipment_model', etc.
  
  // Field metadata
  displayLabel: varchar("display_label", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).default('text').notNull(), // 'text', 'number', 'date', 'json'
  description: text("description"),
  
  // OCR configuration
  extractionPrompt: text("extraction_prompt"), // If this field is populated via OCR
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_custom_fields_org").on(table.organizationId),
  index("idx_custom_fields_table").on(table.tableName),
]);

// Work item sources - explicit linkage between work items and their source records
export const workItemSources = pgTable("work_item_sources", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "cascade" }).notNull(),
  
  // Source record reference
  sourceTable: varchar("source_table", { length: 100 }).notNull(), // 'addresses', 'customers', 'tickets', etc.
  sourceId: integer("source_id").notNull(), // ID in the source table
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_work_item_sources_org").on(table.organizationId),
  index("idx_work_item_sources_work_item").on(table.workItemId),
  index("idx_work_item_sources_source").on(table.sourceTable, table.sourceId),
]);

// Workflow step extractions - tracks OCR extraction history and results
export const workflowStepExtractions = pgTable("workflow_step_extractions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "cascade" }).notNull(),
  stepId: integer("step_id").references(() => workItemWorkflowExecutionSteps.id, { onDelete: "cascade" }).notNull(),
  
  // Extraction results
  extractedData: jsonb("extracted_data").notNull().$type<Record<string, any>>(),
  confidence: integer("confidence"), // 0-100
  status: varchar("status", { length: 20 }).default('completed').notNull(), // 'completed', 'failed', 'low_confidence'
  
  // OCR metadata
  model: varchar("model", { length: 100 }), // e.g., 'gpt-4o'
  tokensUsed: integer("tokens_used"),
  processingTimeMs: integer("processing_time_ms"),
  errorMessage: text("error_message"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_step_extractions_org").on(table.organizationId),
  index("idx_step_extractions_work_item").on(table.workItemId),
  index("idx_step_extractions_step").on(table.stepId),
  index("idx_step_extractions_status").on(table.status),
]);

// Addresses table - for managing installation addresses with extracted data
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Address details
  streetAddress: varchar("street_address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 100 }).default('Australia'),
  
  // Geocoding
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  what3words: varchar("what3words", { length: 100 }),
  
  // Dynamic extracted fields (using JSONB for flexibility)
  extractedData: jsonb("extracted_data").default({}).$type<Record<string, any>>(),
  // Example: { router_serial_number: "ABC123", equipment_model: "TP-Link XYZ" }
  
  // External references
  splynxCustomerId: integer("splynx_customer_id"),
  externalId: varchar("external_id", { length: 100 }), // For linking to external systems
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_addresses_org").on(table.organizationId),
  index("idx_addresses_customer").on(table.splynxCustomerId),
  index("idx_addresses_postcode").on(table.postcode),
  index("idx_addresses_active").on(table.isActive),
]);

// ========================================
// AGENT WORKFLOWS FOR AUTOMATION
// ========================================

// Agent workflows for automation
export const agentWorkflows = pgTable("agent_workflows", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Workflow details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'schedule', 'webhook', 'integration_event', 'manual', 'workflow_step_photo_added'
  triggerConfig: jsonb("trigger_config").default({}).notNull(),
  workflowDefinition: jsonb("workflow_definition").default([]).notNull(), // Array of steps
  
  // Strategy relationships
  targetKeyResultId: integer("target_key_result_id").references(() => keyResults.id),
  targetObjectiveId: integer("target_objective_id").references(() => objectives.id),
  assignedTeamId: integer("assigned_team_id").references(() => teams.id),
  
  // Execution configuration
  retryConfig: jsonb("retry_config").default({maxRetries: 3, retryDelay: 60}),
  executionTimeout: integer("execution_timeout").default(300), // seconds
  webhookToken: varchar("webhook_token", { length: 255 }), // For webhook triggers
  
  // Status
  isEnabled: boolean("is_enabled").default(false).notNull(),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: varchar("last_run_status", { length: 50 }),
  lastSuccessfulRunAt: timestamp("last_successful_run_at"), // For incremental data fetching
  
  // Ownership
  createdBy: integer("created_by").references(() => users.id),
  assignedUserId: integer("assigned_user_id").references(() => users.id).notNull(), // Agent user that represents this workflow
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Folder organization
  folderId: integer("folder_id"),
}, (table) => [
  index("idx_agent_workflows_org").on(table.organizationId),
  index("idx_agent_workflows_enabled").on(table.isEnabled),
  index("idx_agent_workflows_webhook").on(table.webhookToken),
  index("idx_agent_workflows_assigned_user").on(table.assignedUserId),
  index("idx_agent_workflows_team").on(table.assignedTeamId),
  index("idx_agent_workflows_folder").on(table.folderId),
]);

// Process Folders - hierarchical folder system for agents and workflow templates
export const processFolders = pgTable("process_folders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  parentId: integer("parent_id"),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  folderType: processFolderTypeEnum("folder_type").default("shared"),
  teamId: integer("team_id").references(() => teams.id),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_process_folders_org").on(table.organizationId),
  index("idx_process_folders_parent").on(table.parentId),
  index("idx_process_folders_type").on(table.folderType),
  index("idx_process_folders_team").on(table.teamId),
  unique("unique_process_folder_slug_per_parent").on(table.organizationId, table.parentId, table.slug),
]);

// Agent workflow execution history
export const agentWorkflowRuns = pgTable("agent_workflow_runs", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").references(() => agentWorkflows.id, { onDelete: "cascade" }).notNull(),
  
  // Execution details
  status: varchar("status", { length: 50 }).notNull(), // 'running', 'completed', 'failed'
  triggerSource: varchar("trigger_source", { length: 255 }),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // Enhanced execution tracking
  executionDuration: integer("execution_duration"), // milliseconds
  stepsCompleted: integer("steps_completed").default(0),
  totalSteps: integer("total_steps"),
  retryCount: integer("retry_count").default(0),
  contextData: jsonb("context_data").default({}), // For passing data between steps
  
  // Execution data
  executionLog: jsonb("execution_log").default([]).notNull(),
  errorMessage: text("error_message"),
  resultData: jsonb("result_data").default({}),
}, (table) => [
  index("idx_workflow_runs_workflow").on(table.workflowId),
  index("idx_workflow_runs_status").on(table.status),
  index("idx_workflow_runs_started").on(table.startedAt.desc()),
]);

// AI Ticket Draft Responses - Stores AI-generated drafts for support tickets
export const ticketDraftResponses = pgTable("ticket_draft_responses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "cascade" }).notNull(),
  
  // Draft content
  originalDraft: text("original_draft").notNull(), // AI-generated draft
  finalResponse: text("final_response"), // Human-edited response (null until sent)
  
  // Generation metadata
  generationMetadata: jsonb("generation_metadata").default({}).notNull(), // { knowledgeDocIds, model, tokensUsed, temperature }
  
  // Edit tracking (calculated when response is sent)
  editPercentage: decimal("edit_percentage", { precision: 5, scale: 2 }), // % of text that was changed
  sectionsEdited: jsonb("sections_edited").default([]), // Which parts were edited
  
  // Status
  sentAt: timestamp("sent_at"),
  sentBy: integer("sent_by").references(() => users.id),
  regenerationCount: integer("regeneration_count").default(0), // How many times draft was regenerated
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ticket_drafts_org").on(table.organizationId),
  index("idx_ticket_drafts_work_item").on(table.workItemId),
  index("idx_ticket_drafts_sent_at").on(table.sentAt),
]);

// AI Agent Configurations - Links agent workflows to AI features
export const aiAgentConfigurations = pgTable("ai_agent_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  agentWorkflowId: integer("agent_workflow_id").references(() => agentWorkflows.id, { onDelete: "cascade" }),
  
  // Feature identification
  featureType: varchar("feature_type", { length: 50 }).notNull(), // 'ticket_drafting', future: 'email_drafting', etc.
  isEnabled: boolean("is_enabled").default(false).notNull(),
  
  // Knowledge base configuration
  systemPromptDocumentIds: jsonb("system_prompt_document_ids").default([]).$type<number[]>(), // KB docs to use as system prompt
  knowledgeDocumentIds: jsonb("knowledge_document_ids").default([]).$type<number[]>(), // Which KB docs to use for context
  
  // AI model configuration
  modelConfig: jsonb("model_config").default({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1000
  }).notNull(),
  
  // Feature-specific settings
  autoGenerateOnArrival: boolean("auto_generate_on_arrival").default(true), // Auto-generate vs manual
  
  // OKR tracking
  linkedObjectiveId: integer("linked_objective_id").references(() => objectives.id),
  linkedKeyResultIds: jsonb("linked_key_result_ids").default([]).$type<number[]>(),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ai_configs_org").on(table.organizationId),
  index("idx_ai_configs_workflow").on(table.agentWorkflowId),
  index("idx_ai_configs_objective").on(table.linkedObjectiveId),
]);

// Integration triggers available from each integration
export const integrationTriggers = pgTable("integration_triggers", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  
  // Trigger identification
  triggerKey: varchar("trigger_key", { length: 100 }).notNull(), // Unique identifier like 'ticket_created'
  name: varchar("name", { length: 255 }).notNull(), // Display name
  description: text("description"),
  category: varchar("category", { length: 50 }), // 'customer', 'ticket', 'billing', etc.
  
  // Trigger type and configuration
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'webhook', 'polling', 'api_call'
  webhookEndpoint: varchar("webhook_endpoint", { length: 500 }), // Generated webhook URL if applicable
  payloadSchema: jsonb("payload_schema").default({}), // JSON Schema of expected data
  availableFields: jsonb("available_fields").default([]), // List of fields available from this trigger
  configuration: jsonb("configuration").default({}), // Additional trigger-specific config
  
  // Rich metadata for agent building
  parameterSchema: jsonb("parameter_schema").default({}), // JSON Schema for trigger configuration parameters
  responseSchema: jsonb("response_schema").default({}), // JSON Schema for response format
  samplePayload: jsonb("sample_payload"), // Example payload for testing
  docsUrl: varchar("docs_url", { length: 500 }), // Link to API documentation
  authScope: varchar("auth_scope", { length: 255 }), // Required authentication scope
  resourceType: varchar("resource_type", { length: 100 }), // Resource type (customer, invoice, etc.)
  
  // Webhook management
  webhookUrl: varchar("webhook_url", { length: 500 }), // Generated webhook URL for this trigger
  webhookSecret: varchar("webhook_secret", { length: 100 }), // Secret for signature verification
  lastWebhookAt: timestamp("last_webhook_at"), // Last time a webhook was received
  webhookEventCount: integer("webhook_event_count").default(0), // Total webhooks received
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  isConfigured: boolean("is_configured").default(false).notNull(), // Whether webhook is registered with provider
  lastTriggeredAt: timestamp("last_triggered_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_integration_triggers_integration").on(table.integrationId),
  index("idx_integration_triggers_key").on(table.triggerKey),
]);

// Integration actions available from each integration
export const integrationActions = pgTable("integration_actions", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  
  // Action identification
  actionKey: varchar("action_key", { length: 100 }).notNull(), // Unique identifier like 'create_customer'
  name: varchar("name", { length: 255 }).notNull(), // Display name
  description: text("description"),
  category: varchar("category", { length: 50 }), // 'customer', 'ticket', 'billing', etc.
  
  // Action configuration
  httpMethod: varchar("http_method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE, PATCH
  endpoint: varchar("endpoint", { length: 500 }).notNull(), // API endpoint path
  
  // Rich metadata for agent building
  parameterSchema: jsonb("parameter_schema").default({}), // JSON Schema for action input parameters
  responseSchema: jsonb("response_schema").default({}), // JSON Schema for response format
  sampleRequest: jsonb("sample_request"), // Example request for testing
  sampleResponse: jsonb("sample_response"), // Example response
  docsUrl: varchar("docs_url", { length: 500 }), // Link to API documentation
  authScope: varchar("auth_scope", { length: 255 }), // Required authentication scope
  resourceType: varchar("resource_type", { length: 100 }), // Resource type (customer, invoice, etc.)
  
  // Action behavior
  idempotent: boolean("idempotent").default(false), // Whether action is idempotent
  sideEffects: jsonb("side_effects").default([]), // List of side effects
  requiredFields: jsonb("required_fields").default([]), // Required input fields
  optionalFields: jsonb("optional_fields").default([]), // Optional input fields
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  
  // Versioning
  version: varchar("version", { length: 20 }), // API version
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_integration_actions_integration").on(table.integrationId),
  index("idx_integration_actions_key").on(table.actionKey),
  index("idx_integration_actions_category").on(table.category),
]);

// Webhook events log for tracking incoming webhook calls
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  integrationId: integer("integration_id").references(() => integrations.id, { onDelete: "cascade" }).notNull(),
  triggerId: integer("trigger_id").references(() => integrationTriggers.id, { onDelete: "cascade" }),
  
  // Event identification
  triggerKey: varchar("trigger_key", { length: 100 }).notNull(), // For faster lookup
  eventId: varchar("event_id", { length: 255 }), // External event ID if provided
  
  // Request data
  payload: jsonb("payload").notNull(), // Full webhook payload
  headers: jsonb("headers"), // Request headers for debugging
  method: varchar("method", { length: 10 }).default("POST"), // HTTP method
  userAgent: varchar("user_agent", { length: 500 }), // User agent string
  sourceIp: varchar("source_ip", { length: 45 }), // IP address (supports IPv6)
  
  // Processing status
  verified: boolean("verified").default(false), // Signature verification passed
  processed: boolean("processed").default(false), // Event processed successfully
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"), // Error details if processing failed
  
  // Workflow integration
  workflowTriggered: boolean("workflow_triggered").default(false), // Whether this triggered a workflow
  workflowRunId: integer("workflow_run_id").references(() => agentWorkflowRuns.id), // Link to triggered workflow run
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_webhook_events_org").on(table.organizationId),
  index("idx_webhook_events_integration").on(table.integrationId),
  index("idx_webhook_events_trigger").on(table.triggerId),
  index("idx_webhook_events_trigger_key").on(table.triggerKey),
  index("idx_webhook_events_created").on(table.createdAt.desc()),
  index("idx_webhook_events_processed").on(table.processed),
]);

// Agent workflow schedules for cron-based triggers
export const agentWorkflowSchedules = pgTable("agent_workflow_schedules", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").references(() => agentWorkflows.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  
  // Schedule configuration
  cronExpression: varchar("cron_expression", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  isActive: boolean("is_active").default(true),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_workflow_schedules_workflow").on(table.workflowId),
  index("idx_workflow_schedules_organization").on(table.organizationId),
  index("idx_workflow_schedules_next_run").on(table.nextRunAt).where(sql`${table.isActive} = true`),
]);

// ========================================
// TYPE EXPORTS AND SCHEMAS
// ========================================

// Core Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type ThemeSettings = typeof themeSettings.$inferSelect;
export type InsertThemeSettings = typeof themeSettings.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// Feature Management Types
export type PlatformFeature = typeof platformFeatures.$inferSelect;
export type InsertPlatformFeature = typeof platformFeatures.$inferInsert;

export type FeatureComment = typeof featureComments.$inferSelect;
export type InsertFeatureComment = typeof featureComments.$inferInsert;

// Note: featureHierarchy table has been removed
export type FeatureHierarchy = any;
export type InsertFeatureHierarchy = any;

export type FeatureFeedback = typeof featureFeedback.$inferSelect;
export type InsertFeatureFeedback = typeof featureFeedback.$inferInsert;

// Strategy Management Types
export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = typeof objectives.$inferInsert;

export type KeyResult = typeof keyResults.$inferSelect;
export type InsertKeyResult = typeof keyResults.$inferInsert;

export type KeyResultTask = typeof keyResultTasks.$inferSelect;
export type InsertKeyResultTask = typeof keyResultTasks.$inferInsert;

export type KeyResultComment = typeof keyResultComments.$inferSelect;
export type InsertKeyResultComment = typeof keyResultComments.$inferInsert;

// Migration 004: Routines types

// Migration 005: Work Items types
export type WorkItem = typeof workItems.$inferSelect;
export type InsertWorkItem = typeof workItems.$inferInsert;

// Migration 006: Check-in Cycle Participants types
export type CheckInCycleParticipant = typeof checkInCycleParticipants.$inferSelect;
export type InsertCheckInCycleParticipant = typeof checkInCycleParticipants.$inferInsert;

// Migration 007: Objectives Snapshots types
export type ObjectivesSnapshot = typeof objectivesSnapshots.$inferSelect;
export type InsertObjectivesSnapshot = typeof objectivesSnapshots.$inferInsert;

// Migration 008: Work Items Snapshots types
export type WorkItemsSnapshot = typeof workItemsSnapshots.$inferSelect;
export type InsertWorkItemsSnapshot = typeof workItemsSnapshots.$inferInsert;

export type CheckInCycle = typeof checkInCycles.$inferSelect;
export type InsertCheckInCycle = typeof checkInCycles.$inferInsert;

// Knowledge Base Types
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type InsertKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;

export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
export type InsertKnowledgeCategory = typeof knowledgeCategories.$inferInsert;

export type KnowledgeDocumentVersion = typeof knowledgeDocumentVersions.$inferSelect;
export type InsertKnowledgeDocumentVersion = typeof knowledgeDocumentVersions.$inferInsert;

export type KnowledgeDocumentAttachment = typeof knowledgeDocumentAttachments.$inferSelect;
export type InsertKnowledgeDocumentAttachment = typeof knowledgeDocumentAttachments.$inferInsert;

export type KnowledgeDocumentActivity = typeof knowledgeDocumentActivity.$inferSelect;
export type InsertKnowledgeDocumentActivity = typeof knowledgeDocumentActivity.$inferInsert;

export type DocumentAssignment = typeof documentAssignments.$inferSelect;
export type InsertDocumentAssignment = typeof documentAssignments.$inferInsert;

export type OnboardingPlan = typeof onboardingPlans.$inferSelect;
export type InsertOnboardingPlan = typeof onboardingPlans.$inferInsert;

export type UserOnboardingProgress = typeof userOnboardingProgress.$inferSelect;
export type InsertUserOnboardingProgress = typeof userOnboardingProgress.$inferInsert;

// Multi-tenancy Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Strategy Settings Types
export type StrategySettings = typeof strategySettings.$inferSelect;
export type InsertStrategySettings = typeof strategySettings.$inferInsert;

// Page Management Types
export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;

// [REMOVED: PageVisibilityRule and PageDoc types - Tables removed]

export type NewPageRequest = typeof newPageRequests.$inferSelect;
export type InsertNewPageRequest = typeof newPageRequests.$inferInsert;

export type LayoutTemplate = typeof layoutTemplates.$inferSelect;
export type InsertLayoutTemplate = typeof layoutTemplates.$inferInsert;

// Database Explorer Types
export type DataTable = typeof dataTables.$inferSelect;
export type InsertDataTable = typeof dataTables.$inferInsert;

export type DataField = typeof dataFields.$inferSelect;
export type InsertDataField = typeof dataFields.$inferInsert;

export type DataRelationship = typeof dataRelationships.$inferSelect;
export type InsertDataRelationship = typeof dataRelationships.$inferInsert;

export type ErdLayout = typeof erdLayouts.$inferSelect;
export type InsertErdLayout = typeof erdLayouts.$inferInsert;

// Role Management Types
// [REMOVED: RoleRecord and UserRole types - Tables removed]

// Menu Management Types
export type MenuSection = typeof menuSections.$inferSelect;
export type InsertMenuSection = typeof menuSections.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

// Check-in Meeting Types (Phase-1)
export type CheckInMeeting = typeof checkInMeetings.$inferSelect;
export type InsertCheckInMeeting = typeof checkInMeetings.$inferInsert;

export type MeetingTopic = typeof meetingTopics.$inferSelect;
export type InsertMeetingTopic = typeof meetingTopics.$inferInsert;

export type MeetingAttendee = typeof meetingAttendees.$inferSelect;
export type InsertMeetingAttendee = typeof meetingAttendees.$inferInsert;

export type MeetingItemUpdate = typeof meetingItemUpdates.$inferSelect;
export type InsertMeetingItemUpdate = typeof meetingItemUpdates.$inferInsert;

// Team Feedback Types
export type TeamFeedback = typeof teamFeedback.$inferSelect;
export type InsertTeamFeedback = typeof teamFeedback.$inferInsert;

export type KeyResultSnapshot = typeof keyResultSnapshots.$inferSelect;
export type InsertKeyResultSnapshot = typeof keyResultSnapshots.$inferInsert;

// Integration & Agent Types
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertDatabaseConnection = typeof databaseConnections.$inferInsert;

export type AgentWorkflow = typeof agentWorkflows.$inferSelect;
export type InsertAgentWorkflow = typeof agentWorkflows.$inferInsert;

export type ProcessFolder = typeof processFolders.$inferSelect;
export type InsertProcessFolder = z.infer<typeof insertProcessFolderSchema>;

export type AgentWorkflowRun = typeof agentWorkflowRuns.$inferSelect;
export type InsertAgentWorkflowRun = typeof agentWorkflowRuns.$inferInsert;

export type AgentWorkflowSchedule = typeof agentWorkflowSchedules.$inferSelect;
export type InsertAgentWorkflowSchedule = typeof agentWorkflowSchedules.$inferInsert;

export type TicketDraftResponse = typeof ticketDraftResponses.$inferSelect;
export type InsertTicketDraftResponse = typeof ticketDraftResponses.$inferInsert;

export type AiAgentConfiguration = typeof aiAgentConfigurations.$inferSelect;
export type InsertAiAgentConfiguration = typeof aiAgentConfigurations.$inferInsert;

export type IntegrationTrigger = typeof integrationTriggers.$inferSelect;
export type InsertIntegrationTrigger = typeof integrationTriggers.$inferInsert;

export type IntegrationAction = typeof integrationActions.$inferSelect;
export type InsertIntegrationAction = typeof integrationActions.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// Insert Schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThemeSettingsSchema = createInsertSchema(themeSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformFeatureSchema = createInsertSchema(platformFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeatureCommentSchema = createInsertSchema(featureComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKeyResultSchema = createInsertSchema(keyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuSectionSchema = createInsertSchema(menuSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKeyResultTaskSchema = createInsertSchema(keyResultTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKeyResultCommentSchema = createInsertSchema(keyResultComments).omit({
  id: true,
  createdAt: true,
});

// Migration 005: Work Items validators

// Define workflowMetadata schema for type safety
export const workflowMetadataSchema = z.object({
  addressRecordId: z.number().optional(),
  addressData: z.object({
    name: z.string(),
    fields: z.record(z.any())
  }).optional(),
  airtableRecordId: z.string().optional(),
  templateName: z.string().optional(),
  templateCategory: z.string().optional()
}).passthrough(); // Allow additional fields

export const insertWorkItemSchema = createInsertSchema(workItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  workflowMetadata: workflowMetadataSchema.optional()
});

// Migration 006: Check-in Cycle Participants validators
export const insertCheckInCycleParticipantSchema = createInsertSchema(checkInCycleParticipants).omit({
  id: true,
  createdAt: true,
});

// Migration 007: Objectives Snapshots validators
export const insertObjectivesSnapshotSchema = createInsertSchema(objectivesSnapshots).omit({
  id: true,
  snapshotDate: true,
  createdAt: true,
});

// Migration 008: Work Items Snapshots validators
export const insertWorkItemsSnapshotSchema = createInsertSchema(workItemsSnapshots).omit({
  id: true,
  snapshotDate: true,
  createdAt: true,
});

export const insertCheckInCycleSchema = createInsertSchema(checkInCycles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Enhanced Zod schema for knowledge documents
export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  categories: z.array(z.string().min(1).max(50)).min(1).max(20), // 1-20 categories, each 1-50 chars
  tags: z.array(z.string().min(1).max(30)).max(30), // 0-30 tags, each 1-30 chars
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().optional(), // Made optional for external file links
  estimatedReadingTime: z.number().int().positive().max(240).optional(), // 1-240 minutes
  documentType: z.enum(['internal_kb', 'training_module', 'customer_kb', 'external_file_link', 'website_page', 'marketing_email', 'marketing_letter', 'attachment', 'contract', 'policy', 'public_report', 'quick_reference']).optional(),
  folderId: z.number().int().nullable().optional(),
  externalFileUrl: z.string().url().optional().nullable(),
  externalFileSource: z.string().max(50).optional().nullable(),
});

// Integration schema
export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  platformType: z.enum(['splynx', 'xero', 'outlook', 'firebase', 'openai', 'sql_database', 'google_maps']),
  name: z.string().min(1, "Name is required"),
  connectionConfig: z.record(z.any()).default({}),
  credentialsEncrypted: z.string().optional(),
});

// Customer mapping schemas
export const insertSplynxLocationSchema = createInsertSchema(splynxLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerGeocodingCacheSchema = createInsertSchema(customerGeocodingCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  geocodedAt: true,
});

// Database Connection schema
export const insertDatabaseConnectionSchema = createInsertSchema(databaseConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite', 'mssql', 'mariadb']),
  displayName: z.string().min(1, "Display name is required"),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  passwordEncrypted: z.string().optional(),
  schema: z.string().optional(),
  connectionString: z.string().optional(),
  sslConfig: z.record(z.any()).default({}),
  poolConfig: z.object({
    min: z.number().int().min(1).default(2),
    max: z.number().int().min(1).default(10),
  }).default({ min: 2, max: 10 }),
});

// Agent Workflow schema
export const insertAgentWorkflowSchema = createInsertSchema(agentWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.enum(['manual', 'schedule', 'webhook', 'integration_event']),
  triggerConfig: z.record(z.any()).default({}),
  workflowDefinition: z.array(z.any()).default([]),
  retryConfig: z.record(z.any()).default({maxRetries: 3, retryDelay: 60}),
  executionTimeout: z.number().int().positive().default(300),
  assignedUserId: z.number().int().positive(),
  folderId: z.number().int().positive().optional(),
});

// Process Folder schema
export const insertProcessFolderSchema = createInsertSchema(processFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  folderType: z.enum(['agents', 'templates', 'shared']).default('shared'),
  teamId: z.number().int().positive().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
});

// Agent Workflow Run schema
export const insertAgentWorkflowRunSchema = createInsertSchema(agentWorkflowRuns).omit({
  id: true,
  startedAt: true,
}).extend({
  status: z.enum(['running', 'completed', 'failed']),
  triggerSource: z.string().optional(),
  executionLog: z.array(z.any()).default([]),
  errorMessage: z.string().optional(),
  resultData: z.record(z.any()).default({}),
  contextData: z.record(z.any()).default({}),
});

// Agent Workflow Schedule schema  
export const insertAgentWorkflowScheduleSchema = createInsertSchema(agentWorkflowSchedules).omit({
  id: true,
  createdAt: true,
}).extend({
  workflowId: z.number().int().positive(),
  cronExpression: z.string().min(1, "Cron expression is required"),
  timezone: z.string().default("UTC"),
  isActive: z.boolean().default(true),
});

// Integration Trigger schema
export const insertIntegrationTriggerSchema = createInsertSchema(integrationTriggers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  integrationId: z.number().int().positive(),
  triggerKey: z.string().min(1, "Trigger key is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  eventType: z.enum(['webhook', 'polling', 'api_call']),
  webhookEndpoint: z.string().optional(),
  payloadSchema: z.record(z.any()).default({}),
  availableFields: z.array(z.string()).default([]),
  configuration: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
  isConfigured: z.boolean().default(false),
});

// Integration Action schema
export const insertIntegrationActionSchema = createInsertSchema(integrationActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
  lastUsedAt: true,
  lastSyncedAt: true,
}).extend({
  integrationId: z.number().int().positive(),
  actionKey: z.string().min(1, "Action key is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  endpoint: z.string().min(1, "Endpoint is required"),
  parameterSchema: z.record(z.any()).default({}),
  responseSchema: z.record(z.any()).default({}),
  sampleRequest: z.record(z.any()).optional(),
  sampleResponse: z.record(z.any()).optional(),
  docsUrl: z.string().optional(),
  authScope: z.string().optional(),
  resourceType: z.string().optional(),
  idempotent: z.boolean().default(false),
  sideEffects: z.array(z.string()).default([]),
  requiredFields: z.array(z.string()).default([]),
  optionalFields: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  version: z.string().optional(),
});

// Webhook Event schema
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
  processedAt: true,
}).extend({
  organizationId: z.number().int().positive(),
  integrationId: z.number().int().positive(),
  triggerId: z.number().int().positive().optional(),
  triggerKey: z.string().min(1, "Trigger key is required"),
  eventId: z.string().optional(),
  payload: z.record(z.any()),
  headers: z.record(z.any()).optional(),
  method: z.string().default("POST"),
  userAgent: z.string().optional(),
  sourceIp: z.string().optional(),
  verified: z.boolean().default(false),
  processed: z.boolean().default(false),
  errorMessage: z.string().optional(),
  workflowTriggered: z.boolean().default(false),
  workflowRunId: z.number().int().positive().optional(),
});

// Ticket Draft Response schema
export const insertTicketDraftResponseSchema = createInsertSchema(ticketDraftResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.number().int().positive(),
  workItemId: z.number().int().positive(),
  originalDraft: z.string().min(1, "Draft content is required"),
  finalResponse: z.string().optional(),
  generationMetadata: z.record(z.any()).default({}),
  editPercentage: z.number().optional(),
  sectionsEdited: z.array(z.string()).default([]),
  sentAt: z.date().optional(),
  sentBy: z.number().int().positive().optional(),
  regenerationCount: z.number().int().default(0),
});

// AI Agent Configuration schema
export const insertAiAgentConfigurationSchema = createInsertSchema(aiAgentConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.number().int().positive(),
  agentWorkflowId: z.number().int().positive().optional(),
  featureType: z.enum(['ticket_drafting']),
  isEnabled: z.boolean().default(false),
  knowledgeDocumentIds: z.array(z.number()).default([]),
  modelConfig: z.object({
    model: z.string().default('gpt-4'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().positive().default(500),
    systemPrompt: z.string().default('You are a helpful support agent assistant.'),
  }).default({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: 'You are a helpful support agent assistant.'
  }),
  autoGenerateOnArrival: z.boolean().default(true),
  linkedObjectiveId: z.number().int().positive().optional(),
  linkedKeyResultIds: z.array(z.number()).default([]),
  createdBy: z.number().int().positive().optional(),
});

// Select schema (what gets returned from database)
export const selectKnowledgeDocumentSchema = z.object({
  id: z.number(),
  organizationId: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  summary: z.string().nullable(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'internal', 'private']),
  unifiedStatus: z.enum(['draft', 'dev', 'live', 'archived']),
  authorId: z.number().nullable(),
  estimatedReadingTime: z.number().nullable(),
  metadata: z.any().nullable(),
  searchVector: z.string().nullable(),
  aiEmbedding: z.any().nullable(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Knowledge Document types (updated to use Zod schemas for consistency)
// Note: The main types are defined below with other table types

// ========================================
// STRATEGY MANAGEMENT TYPES
// ========================================

// Mission and Vision types
export type MissionVision = typeof missionVision.$inferSelect;
export type InsertMissionVision = z.infer<typeof insertMissionVisionSchema>;
export const insertMissionVisionSchema = createInsertSchema(missionVision).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  strategyStatementHtml: z.string().min(1, "Strategy statement is required").max(20000, "Strategy statement too long").optional(),
});

// Objective types - with new status enum and KPI fields
export type ObjectiveStatus = 'Draft' | 'Live' | 'Archived';
export type KpiType = 'Derived from Key Results' | 'Manual Input';

// Key Result types (migration 002)
export type KeyResultStatus = 'Not Started' | 'On Track' | 'Stuck' | 'Completed';
export type KeyResultType = 'Numeric Target' | 'Percentage KPI' | 'Milestone';

// Key Result Task types (migration 003)
export type KeyResultTaskStatus = 'Not Started' | 'On Track' | 'Stuck' | 'Completed';

export const insertKnowledgeCategorySchema = createInsertSchema(knowledgeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeDocumentVersionSchema = createInsertSchema(knowledgeDocumentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeDocumentAttachmentSchema = createInsertSchema(knowledgeDocumentAttachments).omit({
  id: true,
  attachedAt: true,
});

export const insertKnowledgeDocumentActivitySchema = createInsertSchema(knowledgeDocumentActivity).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentAssignmentSchema = createInsertSchema(documentAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnboardingPlanSchema = createInsertSchema(onboardingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserOnboardingProgressSchema = createInsertSchema(userOnboardingProgress).omit({
  id: true,
});

// ========================================
// TEAMS AND TEAM MEMBERS TYPES (Migration 007)
// ========================================

// Team types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Team Member types  
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// Team validation schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

// Check-in Meeting Schemas (Phase-1)
export const insertCheckInMeetingSchema = createInsertSchema(checkInMeetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTopicSchema = createInsertSchema(meetingTopics).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingAttendeeSchema = createInsertSchema(meetingAttendees).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingItemUpdateSchema = createInsertSchema(meetingItemUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertTeamFeedbackSchema = createInsertSchema(teamFeedback).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export const insertKeyResultSnapshotSchema = createInsertSchema(keyResultSnapshots).omit({
  id: true,
  snapshotDate: true,
  createdAt: true,
});

// Update meeting status schema
export const updateMeetingStatusSchema = z.object({
  status: z.enum(['Planning', 'Planned', 'In Progress', 'Completed', 'Skipped']),
  reason: z.string().optional() // Optional reason when marking as Skipped
});

// ========================================
// WEBSITE MANAGEMENT SYSTEM (SIMPLIFIED HTML-BASED)
// ========================================

// Website Pages - Simple HTML storage for migrated WordPress sites
export const websitePages = pgTable("website_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  metaDescription: text("meta_description"),
  htmlContent: text("html_content"),
  cssOverrides: text("css_overrides"),
  brandColors: jsonb("brand_colors").default({}),
  images: jsonb("images").default({}),
  status: varchar("status", { length: 20 }).default('draft'),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_website_pages_org").on(table.organizationId),
  index("idx_website_pages_slug").on(table.slug),
  index("idx_website_pages_status").on(table.status),
]);

// Content Types for CMS
export const contentTypes = pgTable("content_types", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  typeName: varchar("type_name", { length: 255 }).notNull(),
  typeSchema: jsonb("type_schema").notNull(), // Field definitions
  displayTemplate: text("display_template"), // How to render this type
  apiEndpoint: varchar("api_endpoint", { length: 255 }), // For headless access
  permissions: jsonb("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_content_types_org").on(table.organizationId),
]);

// Content Items
export const contentItems = pgTable("content_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentTypeId: integer("content_type_id").references(() => contentTypes.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  contentData: jsonb("content_data").notNull(), // Actual content fields
  status: varchar("status", { length: 20 }).default('draft'), // 'draft', 'published', 'archived'
  publishedAt: timestamp("published_at"),
  version: integer("version").default(1),
  authorId: integer("author_id").references(() => users.id),
  metadata: jsonb("metadata").default({}), // SEO, tags, categories
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_content_items_type").on(table.contentTypeId),
  index("idx_content_items_org").on(table.organizationId),
  index("idx_content_items_slug").on(table.slug),
  index("idx_content_items_status").on(table.status),
]);

// Content Revisions
export const contentRevisions = pgTable("content_revisions", {
  id: serial("id").primaryKey(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id, { onDelete: "cascade" }).notNull(),
  revisionNumber: integer("revision_number").notNull(),
  revisionData: jsonb("revision_data").notNull(),
  changedBy: integer("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
  changeNote: text("change_note"),
}, (table) => [
  index("idx_content_revisions_item").on(table.contentItemId),
  index("idx_content_revisions_changed").on(table.changedAt.desc()),
]);

// Media Library
export const mediaLibrary = pgTable("media_library", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  cdnUrl: text("cdn_url"), // For production delivery
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  dimensions: jsonb("dimensions"), // {width, height} for images
  altText: varchar("alt_text", { length: 500 }),
  metadata: jsonb("metadata").default({}),
  usageReferences: jsonb("usage_references").default([]), // Where media is used
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_media_library_org").on(table.organizationId),
  index("idx_media_library_type").on(table.fileType),
]);

// Insert schemas for website management tables
export const insertWebsitePageSchema = createInsertSchema(websitePages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentTypeSchema = createInsertSchema(contentTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentItemSchema = createInsertSchema(contentItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaLibrarySchema = createInsertSchema(mediaLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for website management
export type WebsitePage = typeof websitePages.$inferSelect;
export type InsertWebsitePage = z.infer<typeof insertWebsitePageSchema>;

export type ContentType = typeof contentTypes.$inferSelect;
export type InsertContentType = z.infer<typeof insertContentTypeSchema>;

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;

export type MediaLibraryItem = typeof mediaLibrary.$inferSelect;
export type InsertMediaLibraryItem = z.infer<typeof insertMediaLibrarySchema>;

// ========================================
// FIELD ENGINEERING MODULE
// ========================================

// Field Engineering Enums
export const fieldTaskStatusEnum = pgEnum('field_task_status', ['new', 'in_progress', 'done', 'cancelled']);
export const fieldTaskPriorityEnum = pgEnum('field_task_priority', ['low', 'medium', 'high']);
export const appTaskTypeEnum = pgEnum('app_task_type', ['installation', 'maintenance', 'repair', 'build', 'inspection', 'survey']);
export const syncStatusEnum = pgEnum('sync_status', ['synced', 'pending', 'conflict', 'error']);
export const syncQueueStatusEnum = pgEnum('sync_queue_status', ['pending', 'processing', 'completed', 'failed', 'conflict']);
export const syncOperationEnum = pgEnum('sync_operation', ['create', 'update', 'delete']);
export const syncEntityTypeEnum = pgEnum('sync_entity_type', ['task', 'checklist', 'workflow', 'worklog', 'comment', 'attachment']);
export const vehicleCheckStatusEnum = pgEnum('vehicle_check_status', ['pass', 'fail', 'incomplete']);
export const workflowStepTypeEnum = pgEnum('workflow_step_type', ['checklist', 'form', 'photo', 'signature', 'measurement', 'notes', 'geolocation']);
export const taskExecutionStatusEnum = pgEnum('task_execution_status', ['not_started', 'in_progress', 'completed', 'cancelled']);

// Fiber Network Enums
export const fiberNodeTypeEnum = pgEnum('fiber_node_type', ['chamber', 'cabinet', 'pole', 'splice_closure', 'customer_premise']);
export const fiberNodeStatusEnum = pgEnum('fiber_node_status', ['active', 'planned', 'decommissioned', 'awaiting_evidence', 'build_complete', 'action_required']);
export const fiberNetworkEnum = pgEnum('fiber_network', ['CCNet', 'FibreLtd', 'S&MFibre']);
export const fiberActivityTypeEnum = pgEnum('fiber_activity_type', ['create', 'update', 'delete', 'view', 'work_item_created', 'workflow_completed']);

// Splice Documentation Enums
export const spliceEnclosureTypeEnum = pgEnum('splice_enclosure_type', ['dome', 'inline', 'rack', 'wall_box']);
export const cableTypeEnum = pgEnum('cable_type', ['single_mode', 'multi_mode', 'hybrid']);
export const createdViaEnum = pgEnum('created_via', ['manual', 'workflow_step']);

// Zod schemas for JSONB validation (type-safe workflow definitions)
export const workflowStepSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['checklist', 'form', 'photo', 'signature', 'measurement', 'notes', 'checkbox', 'text_input', 'file_upload', 'approval', 'kb_link', 'comment', 'geolocation', 'fiber_network_node', 'splynx_ticket', 'audio_recording', 'splice_documentation']),
  required: z.boolean().default(false),
  order: z.number(),
  config: z.any().optional(),
  checklistItems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    checked: z.boolean().default(false)
  })).optional(),
  formFields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'select', 'textarea', 'date']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional()
  })).optional(),
  photoConfig: z.object({
    minPhotos: z.number().default(1),
    maxPhotos: z.number().default(10),
    required: z.boolean().default(false)
  }).optional(),
  photoAnalysisConfig: z.object({
    enabled: z.boolean().default(false),
    agentWorkflowId: z.number().optional(), // Optional specific agent workflow to trigger
    extractions: z.array(z.object({
      fieldId: z.number().optional(), // Link to customFieldDefinitions when pre-provisioned
      targetTable: z.string().optional(), // Fallback when fieldId absent: 'addresses', 'customers', etc.
      targetField: z.string().optional(), // Fallback when fieldId absent: field name to store value
      extractionPrompt: z.string(), // What to extract (e.g., "Extract the router serial number")
      autoCreateField: z.boolean().default(true), // Auto-create field if doesn't exist
      required: z.boolean().default(false), // Is this extraction required for workflow completion?
      postProcess: z.enum(['none', 'uppercase', 'lowercase', 'trim']).default('none').optional(), // Post-processing
    }).refine(
      (data) => data.fieldId !== undefined || (data.targetTable && data.targetField),
      { message: "Each extraction must have either a fieldId or both targetTable and targetField" }
    )).optional().default([]),
  }).optional().refine(
    (data) => !data || !data.enabled || (data.extractions && data.extractions.length > 0),
    { message: "At least one extraction must be defined when OCR is enabled" }
  ),
}).refine(
  (data) => data.title || data.label,
  { message: "Step must have either a title or label" }
);

export const photoSchema = z.object({
  id: z.string(),
  url: z.string(),
  caption: z.string().optional(),
  stepIndex: z.number().optional(),
  timestamp: z.string()
});

export const signatureSchema = z.object({
  id: z.string(),
  dataUrl: z.string(),
  signerName: z.string(),
  timestamp: z.string()
});

export const noteSchema = z.object({
  stepIndex: z.number().optional(),
  note: z.string(),
  timestamp: z.string(),
  userId: z.number().optional()
});

export const vehicleCheckItemSchema = z.object({
  id: z.string(),
  item: z.string(),
  status: z.enum(['pass', 'fail', 'na']),
  notes: z.string().optional(),
  photoUrl: z.string().optional()
});

// Data Source Query Schemas - for querying app data tables
export const dataSourceQueryFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_null', 'not_null', 'in', 'not_in', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal']),
  value: z.any().optional(),
});

export const dataSourceQueryConfigSchema = z.object({
  filters: z.array(dataSourceQueryFilterSchema).default([]),
  aggregation: z.literal('count').default('count'), // MVP: count only, sum/avg/min/max planned for future
  aggregationField: z.string().optional(),
  groupBy: z.array(z.string()).optional(),
  limit: z.number().max(10000).default(1000),
});

export const dataSourceQueryStepSchema = z.object({
  sourceTable: z.string().min(1),
  queryConfig: dataSourceQueryConfigSchema,
  resultVariable: z.string().min(1),
  updateKeyResult: z.object({
    keyResultId: z.number(),
    updateType: z.enum(['set_value', 'increment']),
    useResultAs: z.literal('value'),
  }).optional(),
});

// Type exports for data source queries
export type DataSourceQueryFilter = z.infer<typeof dataSourceQueryFilterSchema>;
export type DataSourceQueryConfig = z.infer<typeof dataSourceQueryConfigSchema>;
export type DataSourceQueryStep = z.infer<typeof dataSourceQueryStepSchema>;

// Task Type Configurations - Maps Splynx types to app workflows
export const taskTypeConfigurations = pgTable("task_type_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Splynx mapping
  splynxTypeId: varchar("splynx_type_id", { length: 100 }).notNull(),
  splynxTypeName: varchar("splynx_type_name", { length: 256 }),
  
  // App configuration
  appTaskType: appTaskTypeEnum("app_task_type").notNull(),
  workflowTemplateId: varchar("workflow_template_id", { length: 100 }),
  
  // UI configuration
  displayName: varchar("display_name", { length: 256 }),
  color: varchar("color", { length: 7 }).default('#3b82f6'),
  iconName: varchar("icon_name", { length: 50 }).default('FileText'),
  
  // Workflow settings
  estimatedDurationMinutes: integer("estimated_duration_minutes").default(60),
  requiresSignature: boolean("requires_signature").default(false),
  requiresPhotos: boolean("requires_photos").default(false),
  requiresCustomerPresent: boolean("requires_customer_present").default(false),
  
  // Filtering & visibility
  isActive: boolean("is_active").default(true),
  showInMobileApp: boolean("show_in_mobile_app").default(true),
  defaultPriority: fieldTaskPriorityEnum("default_priority").default('medium'),
  
  // Ordering
  sortOrder: integer("sort_order").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_task_type_org").on(table.organizationId),
  index("idx_task_type_active").on(table.isActive),
  index("idx_task_type_app_type").on(table.appTaskType),
]);

// Workflow Templates - Defines step-by-step workflows
export const workflowTemplates = pgTable("workflow_templates", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Template details
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  
  // Applicability - which work item types can use this template
  applicableTypes: text("applicable_types").array().default(['work_item']).notNull(),
  
  // Workflow definition (validated JSONB)
  steps: jsonb("steps").$type<z.infer<typeof workflowStepSchema>[]>().notNull(),
  
  // Template metadata
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  isSystemTemplate: boolean("is_system_template").default(false),
  estimatedMinutes: integer("estimated_minutes"),
  
  // UI Generation Metadata (NEW - for auto-generating views and menus)
  displayInMenu: boolean("display_in_menu").default(false),
  menuLabel: varchar("menu_label", { length: 100 }),
  menuIcon: varchar("menu_icon", { length: 50 }),
  menuOrder: integer("menu_order").default(999),
  
  // View Configuration (NEW - for filtered table views)
  defaultFilters: jsonb("default_filters").$type<{
    status?: string[];
    assignedTo?: 'current_user' | 'team' | 'all';
    dateRange?: 'today' | 'week' | 'month' | 'all';
  }>(),
  
  tableColumns: jsonb("table_columns").$type<{
    columnId: string;
    label: string;
    width?: string;
    sortable?: boolean;
    dataPath?: string;
  }[]>(),
  
  // Integration Callbacks (NEW - for completion hooks)
  completionCallbacks: jsonb("completion_callbacks").$type<{
    integrationName: string;
    action: string;
    fieldMappings?: {
      sourceStepId: string;
      sourceField: string;
      targetField: string;
    }[];
    webhookUrl?: string;
    webhookMethod?: string;
    webhookHeaders?: Record<string, string>;
  }[]>(),
  
  // Team and folder organization
  teamId: integer("team_id").references(() => teams.id),
  folderId: integer("folder_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_workflow_org").on(table.organizationId),
  index("idx_workflow_active").on(table.isActive),
  index("idx_workflow_menu").on(table.displayInMenu),
  index("idx_workflow_team").on(table.teamId),
  index("idx_workflow_folder").on(table.folderId),
]);

// Email Templates - Self-managed email templates for campaigns
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Template details
  title: varchar("title", { length: 256 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("html_body").notNull(),
  
  // Variables manifest - stores variable name-to-description mappings for documentation
  // Frontend sends actual variable values as Record<string, string> to preview endpoint
  variablesManifest: jsonb("variables_manifest").$type<Record<string, string> | null>(),
  
  // Status and visibility
  status: varchar("status", { length: 20 }).default('active').notNull(), // active, draft, archived
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_templates_org").on(table.organizationId),
  index("idx_email_templates_status").on(table.status),
]);

// Field Tasks - Main task entity synced from Splynx
export const fieldTasks = pgTable("field_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  splynxTaskId: integer("splynx_task_id"),
  
  // Task Details
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  
  // Task type mapping
  splynxTaskType: varchar("splynx_task_type", { length: 100 }),
  taskTypeConfigId: integer("task_type_config_id").references(() => taskTypeConfigurations.id),
  appTaskType: appTaskTypeEnum("app_task_type"),
  workflowTemplateId: varchar("workflow_template_id", { length: 100 }),
  
  status: fieldTaskStatusEnum("status").default('new').notNull(),
  priority: fieldTaskPriorityEnum("priority").default('medium').notNull(),
  
  // Assignment
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  assignedToSplynxId: integer("assigned_to_splynx_id"),
  teamId: integer("team_id"),
  projectId: integer("project_id"),
  
  // Location
  customerName: varchar("customer_name", { length: 256 }),
  customerId: integer("customer_id"),
  address: varchar("address", { length: 512 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Scheduling
  scheduledDate: timestamp("scheduled_date"),
  scheduledStartTime: time("scheduled_start_time"),
  scheduledEndTime: time("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  completedAt: timestamp("completed_at"),
  
  // Sync metadata
  syncStatus: syncStatusEnum("sync_status").default('synced'),
  lastSyncedAt: timestamp("last_synced_at"),
  splynxLastModified: timestamp("splynx_last_modified"),
  localLastModified: timestamp("local_last_modified").defaultNow(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_field_tasks_org_user").on(table.organizationId, table.assignedToUserId),
  index("idx_field_tasks_app_type").on(table.appTaskType),
  index("idx_field_tasks_status").on(table.status),
  index("idx_field_tasks_sync_status").on(table.syncStatus),
  index("idx_field_tasks_scheduled").on(table.scheduledDate),
  index("idx_field_tasks_splynx_id").on(table.splynxTaskId),
]);

// Field Task Executions - Track workflow execution progress
export const fieldTaskExecutions = pgTable("field_task_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  taskId: uuid("task_id").references(() => fieldTasks.id, { onDelete: 'cascade' }).notNull(),
  workflowTemplateId: varchar("workflow_template_id", { length: 100 }),
  
  // Execution status
  status: taskExecutionStatusEnum("status").default('not_started').notNull(),
  currentStepIndex: integer("current_step_index").default(0),
  
  // Step responses (JSONB keyed by step ID)
  stepResponses: jsonb("step_responses").$type<Record<string, any>>().default({}),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_task_execution_task").on(table.taskId),
  index("idx_task_execution_status").on(table.status),
  index("idx_task_execution_org").on(table.organizationId),
]);

// Task Checklists
export const taskChecklists = pgTable("task_checklists", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => fieldTasks.id, { onDelete: 'cascade' }).notNull(),
  splynxChecklistId: integer("splynx_checklist_id"),
  
  // Checklist data (validated JSONB)
  items: jsonb("items").$type<Array<{id: string, name: string, checked: boolean, order: number}>>().notNull(),
  completedCount: integer("completed_count").default(0),
  totalCount: integer("total_count").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_checklist_task").on(table.taskId),
]);

// Visit Workflows - Workflow execution data for tasks
export const visitWorkflows = pgTable("visit_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => fieldTasks.id, { onDelete: 'cascade' }).notNull(),
  workflowType: varchar("workflow_type", { length: 100 }),
  
  // Workflow steps (copy from template)
  steps: jsonb("steps").$type<z.infer<typeof workflowStepSchema>[]>().notNull(),
  currentStepIndex: integer("current_step_index").default(0),
  
  // Evidence collected (validated JSONB)
  photos: jsonb("photos").$type<z.infer<typeof photoSchema>[]>().default([]),
  signatures: jsonb("signatures").$type<z.infer<typeof signatureSchema>[]>().default([]),
  notes: jsonb("notes").$type<z.infer<typeof noteSchema>[]>().default([]),
  
  // Status
  completedAt: timestamp("completed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_visit_workflow_task").on(table.taskId),
]);

// Vehicle Checks
export const vehicleChecks = pgTable("vehicle_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Check data
  checkDate: date("check_date").notNull(),
  vehicleId: varchar("vehicle_id", { length: 100 }),
  
  // Checklist items (validated JSONB)
  items: jsonb("items").$type<z.infer<typeof vehicleCheckItemSchema>[]>().notNull(),
  overallStatus: vehicleCheckStatusEnum("overall_status").default('incomplete'),
  
  // Evidence
  photos: jsonb("photos").$type<z.infer<typeof photoSchema>[]>().default([]),
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vehicle_check_user_date").on(table.userId, table.checkDate.desc()),
  index("idx_vehicle_check_date").on(table.checkDate),
  index("idx_vehicle_check_org").on(table.organizationId),
]);

// Work Item Workflow Executions - general purpose workflow execution tracker (replaces fieldTaskExecutions)
export const workItemWorkflowExecutions = pgTable("work_item_workflow_executions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: 'cascade' }).notNull(),
  workflowTemplateId: varchar("workflow_template_id", { length: 100 }),
  
  status: taskExecutionStatusEnum("status").default('not_started').notNull(),
  currentStepId: varchar("current_step_id", { length: 100 }),
  executionData: jsonb("execution_data").$type<Record<string, any>>().default({}),
  
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_work_item_exec_work_item").on(table.workItemId),
  index("idx_work_item_exec_status").on(table.status),
  index("idx_work_item_exec_org").on(table.organizationId),
]);

// Work Item Workflow Execution Steps - step-level execution tracking
export const workItemWorkflowExecutionSteps = pgTable("work_item_workflow_execution_steps", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: 'cascade' }).notNull(),
  executionId: integer("execution_id").references(() => workItemWorkflowExecutions.id, { onDelete: 'cascade' }).notNull(),
  
  stepIndex: integer("step_index").notNull(),
  stepTitle: varchar("step_title", { length: 255 }).notNull(),
  stepDescription: text("step_description"),
  
  status: taskExecutionStatusEnum("status").default('not_started').notNull(),
  
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  
  notes: text("notes"),
  evidence: jsonb("evidence").$type<{
    photos?: Array<{ url: string; caption?: string; timestamp?: string }>;
    signatures?: Array<{ url: string; signedBy?: string; timestamp?: string }>;
    formData?: Record<string, any>;
  }>().default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_exec_steps_execution").on(table.executionId),
  index("idx_exec_steps_work_item").on(table.workItemId),
  index("idx_exec_steps_status").on(table.status),
  index("idx_exec_steps_org").on(table.organizationId),
]);

// Integration Workflow Mappings - maps external system task types to workflow templates (replaces taskTypeConfigurations)
export const integrationWorkflowMappings = pgTable("integration_workflow_mappings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  integrationName: varchar("integration_name", { length: 50 }).notNull(),
  externalTaskType: varchar("external_task_type", { length: 100 }).notNull(),
  workflowTemplateId: varchar("workflow_template_id", { length: 100 }),
  
  fieldMappings: jsonb("field_mappings"),
  autoSync: boolean("auto_sync").default(true),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_int_workflow_org").on(table.organizationId),
  index("idx_int_workflow_integration").on(table.integrationName),
  index("idx_int_workflow_template").on(table.workflowTemplateId),
]);

// Sync Queue - Offline sync queue management
export const syncQueue = pgTable("sync_queue", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Queue item details
  entityType: syncEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  operation: syncOperationEnum("operation").notNull(),
  payload: jsonb("payload").notNull(),
  
  // Sync tracking
  status: syncQueueStatusEnum("status").default('pending').notNull(),
  priority: integer("priority").default(5),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  
  // Error handling
  lastError: text("last_error"),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_sync_queue_status_priority").on(table.status, table.priority, table.nextRetryAt),
  index("idx_sync_queue_user").on(table.userId),
  index("idx_sync_queue_entity").on(table.entityType, table.entityId),
]);

// Splynx Administrators Cache
export const splynxAdministrators = pgTable("splynx_administrators", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  splynxAdminId: integer("splynx_admin_id").notNull(),
  
  // Admin details
  login: varchar("login", { length: 100 }),
  fullName: varchar("full_name", { length: 256 }),
  email: varchar("email", { length: 256 }),
  partnerId: integer("partner_id"),
  role: varchar("role", { length: 100 }),
  isActive: boolean("is_active").default(true),
  
  // Cache metadata
  lastFetchedAt: timestamp("last_fetched_at").defaultNow(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_splynx_admin_org").on(table.organizationId),
  index("idx_splynx_admin_id").on(table.splynxAdminId),
]);

// ========================================
// FIBER NETWORK MAPPING MODULE
// ========================================

// Fiber Network Nodes - Chambers, cabinets, poles, splice points, etc.
export const fiberNetworkNodes = pgTable("fiber_network_nodes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  tenantId: integer("tenant_id"),
  
  // Node details
  name: varchar("name", { length: 255 }).notNull(),
  nodeType: fiberNodeTypeEnum("node_type").default('chamber').notNull(),
  status: fiberNodeStatusEnum("status").default('active').notNull(),
  network: fiberNetworkEnum("network").default('FibreLtd').notNull(),
  
  // Location
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  what3words: varchar("what3words", { length: 100 }),
  address: text("address"),
  
  // Documentation
  notes: text("notes"),
  photos: jsonb("photos").$type<Array<{
    data: string;
    fileName: string;
    fileSize: number;
    uploadedBy: number;
    uploaderName: string;
    timestamp: string;
    category?: string;
    source?: string;
    workItemId?: number;
  }>>().default([]),
  
  // Fiber technical details (captured from workflow execution)
  fiberDetails: jsonb("fiber_details").$type<{
    splices?: Array<{
      workItemId: number;
      completedAt: string;
      completedBy: string;
      spliceType?: string;
      incomingCable?: string;
      outgoingCable?: string;
      fiberCount?: number;
      bufferTubeColors?: string[];
      lossDb?: number;
      testDate?: string;
    }>;
    cables?: Array<{
      id: string;
      connectedNodeId: number;
      connectedNodeName?: string;
      fiberCount: number;
      cableIdentifier: string;
      cableType?: string;
      installDate?: string;
      direction: 'incoming' | 'outgoing';
      routeGeometry?: Array<[number, number]>;
      notes?: string;
      createdBy: number;
      createdAt: string;
    }>;
    spliceConnections?: Array<{
      id: string;
      workItemId?: number;
      incomingCable: string;
      incomingFiber: number;
      incomingBufferTube?: string;
      outgoingCable: string;
      outgoingFiber: number;
      outgoingBufferTube?: string;
      verificationStatus: 'ai_generated' | 'manual' | 'verified';
      transcriptionText?: string;
      audioReference?: string;
      photoReference?: string;
      notes?: string;
      createdBy: number;
      createdAt: string;
      verifiedBy?: number;
      verifiedAt?: string;
    }>;
    installations?: Array<any>;
    inspections?: Array<any>;
  }>().default({}),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fiber_nodes_org").on(table.organizationId),
  index("idx_fiber_nodes_type").on(table.nodeType),
  index("idx_fiber_nodes_status").on(table.status),
  index("idx_fiber_nodes_location").on(table.latitude, table.longitude),
  index("idx_fiber_nodes_name").on(table.name),
]);

// Fiber Network Activity Logs - Audit trail for all fiber network changes
export const fiberNetworkActivityLogs = pgTable("fiber_network_activity_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  tenantId: integer("tenant_id"),
  
  // Activity details
  userId: integer("user_id").references(() => users.id).notNull(),
  userName: varchar("user_name", { length: 255 }),
  actionType: fiberActivityTypeEnum("action_type").notNull(),
  entityType: varchar("entity_type", { length: 50 }).default('fiber_node').notNull(),
  entityId: integer("entity_id").notNull(),
  
  // Change tracking
  changes: jsonb("changes").$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
    added?: Record<string, any>;
  }>(),
  
  // Work item reference (if action was triggered by workflow)
  workItemId: integer("work_item_id").references(() => workItems.id),
  
  // Request metadata
  ipAddress: varchar("ip_address", { length: 50 }),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("idx_fiber_activity_org").on(table.organizationId),
  index("idx_fiber_activity_entity").on(table.entityType, table.entityId),
  index("idx_fiber_activity_user").on(table.userId),
  index("idx_fiber_activity_work_item").on(table.workItemId),
  index("idx_fiber_activity_timestamp").on(table.timestamp),
]);

// Fiber Node Types - Configurable node types (chamber, cabinet, pole, etc.)
export const fiberNodeTypes = pgTable("fiber_node_types", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Node type details
  value: varchar("value", { length: 50 }).notNull(), // e.g., 'chamber', 'cabinet', 'pole'
  label: varchar("label", { length: 100 }).notNull(), // e.g., 'Chamber', 'Cabinet', 'Pole'
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  // Display order
  sortOrder: integer("sort_order").default(0),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fiber_node_types_org").on(table.organizationId),
]);

// Audio Recordings - Voice memos for splice documentation
export const audioRecordings = pgTable("audio_recordings", {
  id: varchar("id", { length: 100 }).primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id).notNull(),
  stepId: varchar("step_id", { length: 100 }),
  
  // File metadata
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  duration: integer("duration").notNull(),
  
  // AI Processing
  transcription: text("transcription"),
  extractedData: jsonb("extracted_data").$type<{
    connections: Array<{
      incomingCable: string;
      incomingFiber: number;
      incomingBufferTube?: string;
      outgoingCable: string;
      outgoingFiber: number;
      outgoingBufferTube?: string;
      notes?: string;
    }>;
  }>(),
  processingStatus: varchar("processing_status", { length: 20 }).default('pending').notNull(),
  processingError: text("processing_error"),
  processedAt: timestamp("processed_at"),
  
  // Upload tracking
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audio_org").on(table.organizationId),
  index("idx_audio_work_item").on(table.workItemId),
  index("idx_audio_status").on(table.processingStatus),
]);

// Fiber Splice Trays - Physical splice enclosures at nodes
export const fiberSpliceTrays = pgTable("fiber_splice_trays", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  nodeId: integer("node_id").references(() => fiberNetworkNodes.id, { onDelete: "cascade" }).notNull(),
  
  // Tray details
  trayNumber: integer("tray_number").notNull(),
  enclosureType: spliceEnclosureTypeEnum("enclosure_type").default('dome').notNull(),
  capacity: integer("capacity").default(12).notNull(),
  installDate: timestamp("install_date"),
  notes: text("notes"),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_splice_trays_org").on(table.organizationId),
  index("idx_splice_trays_node").on(table.nodeId),
]);

// Fiber Connections - Individual fiber-to-fiber splice mappings
export const fiberConnections = pgTable("fiber_connections", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  trayId: integer("tray_id").references(() => fiberSpliceTrays.id, { onDelete: "cascade" }).notNull(),
  nodeId: integer("node_id").references(() => fiberNetworkNodes.id, { onDelete: "cascade" }).notNull(),
  
  // Cable A (incoming)
  cableAId: varchar("cable_a_id", { length: 255 }).notNull(),
  cableAFiberNumber: integer("cable_a_fiber_number").notNull(),
  cableAFiberColor: varchar("cable_a_fiber_color", { length: 50 }).notNull(),
  cableABufferTube: integer("cable_a_buffer_tube"),
  
  // Cable B (outgoing)
  cableBId: varchar("cable_b_id", { length: 255 }).notNull(),
  cableBFiberNumber: integer("cable_b_fiber_number").notNull(),
  cableBFiberColor: varchar("cable_b_fiber_color", { length: 50 }).notNull(),
  cableBBufferTube: integer("cable_b_buffer_tube"),
  
  // Quality metrics (optional)
  spliceLossDb: decimal("splice_loss_db", { precision: 5, scale: 2 }),
  testPassed: boolean("test_passed"),
  
  // Integration with work items system
  workItemId: integer("work_item_id").references(() => workItems.id),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdVia: createdViaEnum("created_via").default('manual').notNull(),
  
  // Soft delete support
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedByUserId: integer("deleted_by_user_id").references(() => users.id),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fiber_conn_org").on(table.organizationId),
  index("idx_fiber_conn_tray").on(table.trayId),
  index("idx_fiber_conn_node").on(table.nodeId),
  index("idx_fiber_conn_work_item").on(table.workItemId),
  index("idx_fiber_conn_cable_a").on(table.cableAId),
  index("idx_fiber_conn_cable_b").on(table.cableBId),
  index("idx_fiber_conn_deleted").on(table.isDeleted),
]);

// Cable Fiber Definitions - Metadata about each cable's fiber composition
export const cableFiberDefinitions = pgTable("cable_fiber_definitions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  cableId: varchar("cable_id", { length: 255 }).notNull(),
  nodeId: integer("node_id").references(() => fiberNetworkNodes.id, { onDelete: "cascade" }).notNull(),
  
  // Fiber composition
  fiberCount: integer("fiber_count").notNull(),
  cableType: cableTypeEnum("cable_type").default('single_mode').notNull(),
  bufferTubeCount: integer("buffer_tube_count"),
  fibersPerTube: integer("fibers_per_tube"),
  
  // Color scheme (TIA-598-C standard)
  colorScheme: jsonb("color_scheme").$type<Array<{
    fiberNumber: number;
    color: string;
    bufferTube?: number;
    tracerColor?: string;
  }>>().default([]),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cable_fiber_org").on(table.organizationId),
  index("idx_cable_fiber_cable").on(table.cableId),
  index("idx_cable_fiber_node").on(table.nodeId),
]);

// Fiber Terminations - Customer/endpoint connections (single-fiber drops)
export const fiberTerminations = pgTable("fiber_terminations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // The customer/endpoint node where the fiber terminates
  customerNodeId: integer("customer_node_id").references(() => fiberNetworkNodes.id, { onDelete: "cascade" }).notNull(),
  
  // The network node where the cable originates (for reference)
  sourceNodeId: integer("source_node_id").references(() => fiberNetworkNodes.id, { onDelete: "set null" }),
  
  // The cable carrying this fiber
  cableId: varchar("cable_id", { length: 255 }).notNull(),
  cableIdentifier: varchar("cable_identifier", { length: 255 }),
  
  // Which fiber from the cable
  fiberNumber: integer("fiber_number").notNull(),
  fiberColor: varchar("fiber_color", { length: 50 }),
  fiberColorHex: varchar("fiber_color_hex", { length: 20 }),
  
  // Termination details
  terminationType: varchar("termination_type", { length: 50 }).default('ont'), // ont, wall_outlet, patch_panel, splitter
  terminationIdentifier: varchar("termination_identifier", { length: 255 }), // ONT serial, outlet ID, etc.
  
  // Service linkage
  serviceId: varchar("service_id", { length: 255 }), // External service reference
  serviceName: varchar("service_name", { length: 255 }), // Human-readable service name
  isLive: boolean("is_live").default(false),
  
  // Work item integration
  workItemId: integer("work_item_id").references(() => workItems.id),
  
  // Status
  status: varchar("status", { length: 50 }).default('active'), // active, reserved, decommissioned
  notes: text("notes"),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fiber_term_org").on(table.organizationId),
  index("idx_fiber_term_customer").on(table.customerNodeId),
  index("idx_fiber_term_source").on(table.sourceNodeId),
  index("idx_fiber_term_cable").on(table.cableId),
]);

// ========================================
// AIRTABLE INTEGRATION MODULE
// ========================================

// Airtable Connections - Store connections to Airtable bases and tables
export const airtableConnections = pgTable("airtable_connections", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Airtable base details
  baseId: varchar("base_id", { length: 100 }).notNull(),
  baseName: varchar("base_name", { length: 255 }).notNull(),
  
  // Airtable table details
  tableId: varchar("table_id", { length: 100 }).notNull(),
  tableName: varchar("table_name", { length: 255 }).notNull(),
  
  // Menu integration
  menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  
  // Connection settings
  isActive: boolean("is_active").default(true),
  syncEnabled: boolean("sync_enabled").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Metadata
  tableSchema: jsonb("table_schema"), // Cache of table field definitions
  settings: jsonb("settings").default({}), // Custom settings for this connection
  
  // Audit
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_airtable_conn_org").on(table.organizationId),
  index("idx_airtable_conn_base").on(table.baseId),
  index("idx_airtable_conn_table").on(table.tableId),
  index("idx_airtable_conn_menu").on(table.menuItemId),
]);

// Airtable Workflow Templates - Templates for creating work items from Airtable records
export const airtableWorkflowTemplates = pgTable("airtable_workflow_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  connectionId: integer("connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  
  // Template details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Field mappings from Airtable to work items
  fieldMappings: jsonb("field_mappings").notNull(), // Maps Airtable fields to work item fields
  
  // Default values for created work items
  defaultAssigneeId: integer("default_assignee_id").references(() => users.id),
  defaultStatus: workItemStatusEnum("default_status").default("Planning"),
  workItemType: varchar("work_item_type", { length: 100 }),
  
  // Workflow steps (using existing workflow system)
  workflowSteps: jsonb("workflow_steps"), // Optional workflow steps to add
  
  // Audit
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_airtable_wf_org").on(table.organizationId),
  index("idx_airtable_wf_conn").on(table.connectionId),
]);

// Airtable Record Links - Links Airtable records to work items
export const airtableRecordLinks = pgTable("airtable_record_links", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  workItemId: integer("work_item_id").references(() => workItems.id, { onDelete: "cascade" }).notNull(),
  
  // Airtable record details
  airtableRecordId: varchar("airtable_record_id", { length: 100 }).notNull(),
  airtableRecordData: jsonb("airtable_record_data"), // Snapshot of record data at time of link
  
  // Link metadata
  linkedBy: integer("linked_by").references(() => users.id).notNull(),
  linkedAt: timestamp("linked_at").defaultNow(),
  
  // Sync status
  isSynced: boolean("is_synced").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
}, (table) => [
  index("idx_airtable_link_conn").on(table.connectionId),
  index("idx_airtable_link_work").on(table.workItemId),
  index("idx_airtable_link_record").on(table.airtableRecordId),
]);

// Airtable Address Snapshots - Raw Airtable sync data (backend only, never shown in UI)
export const airtableAddressSnapshots = pgTable("airtable_address_snapshots", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  airtableConnectionId: integer("airtable_connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  airtableRecordId: varchar("airtable_record_id", { length: 100 }).notNull(),
  
  // Complete Airtable payload (raw JSON from Airtable API)
  snapshotData: jsonb("snapshot_data").notNull().$type<Record<string, any>>(),
  
  // Sync metadata
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_snapshot_org").on(table.organizationId),
  index("idx_snapshot_airtable_record").on(table.airtableRecordId),
  index("idx_snapshot_connection").on(table.airtableConnectionId),
]);

// Address Records - Operational address data with searchable columns (what users query)
export const addressRecords = pgTable("address_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Airtable linkage (reference to snapshot)
  airtableRecordId: varchar("airtable_record_id", { length: 100 }).notNull(),
  airtableConnectionId: integer("airtable_connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  
  // Complete Airtable record data (includes resolved status/tariff names)
  airtableFields: jsonb("airtable_fields").default({}).$type<Record<string, any>>(),
  
  // Searchable Airtable fields (copied from snapshots for query performance)
  postcode: varchar("postcode", { length: 20 }),
  summary: text("summary"),
  address: text("address"),
  premise: text("premise"),
  network: varchar("network", { length: 50 }),
  udprn: varchar("udprn", { length: 50 }),
  statusId: varchar("status_id", { length: 50 }),
  tariffIds: jsonb("tariff_ids").$type<string[]>(),
  
  // OCR extracted fields (auto-created from workflow templates)
  routerSerial: varchar("router_serial", { length: 100 }),
  routerMac: varchar("router_mac", { length: 50 }),
  routerModel: varchar("router_model", { length: 100 }),
  onuSerial: varchar("onu_serial", { length: 100 }),
  onuMac: varchar("onu_mac", { length: 50 }),
  onuModel: varchar("onu_model", { length: 100 }),
  
  // Non-critical extracted data (JSONB for flexibility)
  extractedDataExtras: jsonb("extracted_data_extras").default({}).$type<Record<string, any>>(),
  
  // Local-only fields for workflow management (never synced to Airtable)
  localStatus: varchar("local_status", { length: 50 }),
  localNotes: text("local_notes"),
  workItemCount: integer("work_item_count").default(0),
  lastWorkItemDate: timestamp("last_work_item_date"),
  
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_address_org").on(table.organizationId),
  index("idx_address_airtable_record").on(table.airtableRecordId),
  index("idx_address_connection").on(table.airtableConnectionId),
  index("idx_address_postcode").on(table.postcode),
  index("idx_address_network").on(table.network),
]);

// RAG Status Records - Local storage of Airtable RAG status lookup data
export const ragStatusRecords = pgTable("rag_status_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Airtable linkage
  airtableRecordId: varchar("airtable_record_id", { length: 100 }).notNull(),
  airtableConnectionId: integer("airtable_connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  
  // Complete Airtable record data (exact schema match, dynamic)
  airtableFields: jsonb("airtable_fields").notNull().$type<Record<string, any>>(),
  
  // Local-only fields
  localStatus: varchar("local_status", { length: 50 }),
  localNotes: text("local_notes"),
  
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rag_status_org").on(table.organizationId),
  index("idx_rag_status_airtable_record").on(table.airtableRecordId),
  index("idx_rag_status_connection").on(table.airtableConnectionId),
]);

// Tariff Records - Local storage of Airtable tariff lookup data
export const tariffRecords = pgTable("tariff_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Airtable linkage
  airtableRecordId: varchar("airtable_record_id", { length: 100 }).notNull(),
  airtableConnectionId: integer("airtable_connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  
  // Complete Airtable record data (exact schema match, dynamic)
  airtableFields: jsonb("airtable_fields").notNull().$type<Record<string, any>>(),
  
  // Local-only fields
  localStatus: varchar("local_status", { length: 50 }),
  localNotes: text("local_notes"),
  
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tariff_org").on(table.organizationId),
  index("idx_tariff_airtable_record").on(table.airtableRecordId),
  index("idx_tariff_connection").on(table.airtableConnectionId),
]);

// Address Sync Logs - Track synchronization history
export const addressSyncLogs = pgTable("address_sync_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  airtableConnectionId: integer("airtable_connection_id").references(() => airtableConnections.id, { onDelete: "cascade" }).notNull(),
  
  // Sync metadata
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
  
  // Sync statistics
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsSkipped: integer("records_skipped").default(0),
  recordsTotal: integer("records_total").default(0),
  
  // Status and error tracking
  status: varchar("status", { length: 20 }).notNull(), // 'in_progress', 'completed', 'failed', 'cancelled'
  errorMessage: text("error_message"),
  
  // User tracking
  initiatedBy: integer("initiated_by").references(() => users.id),
}, (table) => [
  index("idx_sync_log_org").on(table.organizationId),
  index("idx_sync_log_connection").on(table.airtableConnectionId),
  index("idx_sync_log_started").on(table.startedAt),
]);

// Insert schemas for field engineering tables
export const insertTaskTypeConfigurationSchema = createInsertSchema(taskTypeConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates, {
  steps: z.array(workflowStepSchema)
}).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFieldTaskSchema = createInsertSchema(fieldTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  localLastModified: true,
});

export const insertFieldTaskExecutionSchema = createInsertSchema(fieldTaskExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskChecklistSchema = createInsertSchema(taskChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVisitWorkflowSchema = createInsertSchema(visitWorkflows, {
  steps: z.array(workflowStepSchema),
  photos: z.array(photoSchema),
  signatures: z.array(signatureSchema),
  notes: z.array(noteSchema),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleCheckSchema = createInsertSchema(vehicleChecks, {
  items: z.array(vehicleCheckItemSchema),
  photos: z.array(photoSchema),
}).omit({
  id: true,
  createdAt: true,
});

export const insertSyncQueueSchema = createInsertSchema(syncQueue).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSplynxAdministratorSchema = createInsertSchema(splynxAdministrators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastFetchedAt: true,
});

export const insertWorkItemWorkflowExecutionSchema = createInsertSchema(workItemWorkflowExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkItemWorkflowExecutionStepSchema = createInsertSchema(workItemWorkflowExecutionSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for field engineering
export type TaskTypeConfiguration = typeof taskTypeConfigurations.$inferSelect;
export type InsertTaskTypeConfiguration = z.infer<typeof insertTaskTypeConfigurationSchema>;

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type FieldTask = typeof fieldTasks.$inferSelect;
export type InsertFieldTask = z.infer<typeof insertFieldTaskSchema>;

export type FieldTaskExecution = typeof fieldTaskExecutions.$inferSelect;
export type InsertFieldTaskExecution = z.infer<typeof insertFieldTaskExecutionSchema>;

export type TaskChecklist = typeof taskChecklists.$inferSelect;
export type InsertTaskChecklist = z.infer<typeof insertTaskChecklistSchema>;

export type VisitWorkflow = typeof visitWorkflows.$inferSelect;
export type InsertVisitWorkflow = z.infer<typeof insertVisitWorkflowSchema>;

export type VehicleCheck = typeof vehicleChecks.$inferSelect;
export type InsertVehicleCheck = z.infer<typeof insertVehicleCheckSchema>;

export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type InsertSyncQueueItem = z.infer<typeof insertSyncQueueSchema>;

export type SplynxAdministrator = typeof splynxAdministrators.$inferSelect;
export type InsertSplynxAdministrator = z.infer<typeof insertSplynxAdministratorSchema>;

export type WorkItemWorkflowExecution = typeof workItemWorkflowExecutions.$inferSelect;
export type InsertWorkItemWorkflowExecution = z.infer<typeof insertWorkItemWorkflowExecutionSchema>;

export type WorkItemWorkflowExecutionStep = typeof workItemWorkflowExecutionSteps.$inferSelect;
export type InsertWorkItemWorkflowExecutionStep = z.infer<typeof insertWorkItemWorkflowExecutionStepSchema>;

// Validated Zod schemas for JSONB types (export for use in services)
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type Signature = z.infer<typeof signatureSchema>;
export type Note = z.infer<typeof noteSchema>;
export type VehicleCheckItem = z.infer<typeof vehicleCheckItemSchema>;

// Insert schemas for Fiber Network
export const insertFiberNetworkNodeSchema = createInsertSchema(fiberNetworkNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFiberNetworkActivityLogSchema = createInsertSchema(fiberNetworkActivityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertFiberNodeTypeSchema = createInsertSchema(fiberNodeTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for Fiber Network
export type FiberNetworkNode = typeof fiberNetworkNodes.$inferSelect;
export type InsertFiberNetworkNode = z.infer<typeof insertFiberNetworkNodeSchema>;

export type FiberNetworkActivityLog = typeof fiberNetworkActivityLogs.$inferSelect;
export type InsertFiberNetworkActivityLog = z.infer<typeof insertFiberNetworkActivityLogSchema>;

export type FiberNodeType = typeof fiberNodeTypes.$inferSelect;
export type InsertFiberNodeType = z.infer<typeof insertFiberNodeTypeSchema>;

// Insert schema for Audio Recordings
export const insertAudioRecordingSchema = createInsertSchema(audioRecordings).omit({
  createdAt: true,
});

export type AudioRecording = typeof audioRecordings.$inferSelect;
export type InsertAudioRecording = z.infer<typeof insertAudioRecordingSchema>;

// Insert schemas for Fiber Splice Documentation
export const insertFiberSpliceTraySchema = createInsertSchema(fiberSpliceTrays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFiberConnectionSchema = createInsertSchema(fiberConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCableFiberDefinitionSchema = createInsertSchema(cableFiberDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for Fiber Splice Documentation
export type FiberSpliceTray = typeof fiberSpliceTrays.$inferSelect;
export type InsertFiberSpliceTray = z.infer<typeof insertFiberSpliceTraySchema>;

export type FiberConnection = typeof fiberConnections.$inferSelect;
export type InsertFiberConnection = z.infer<typeof insertFiberConnectionSchema>;

export type CableFiberDefinition = typeof cableFiberDefinitions.$inferSelect;
export type InsertCableFiberDefinition = z.infer<typeof insertCableFiberDefinitionSchema>;

// Insert schema for Fiber Terminations
export const insertFiberTerminationSchema = createInsertSchema(fiberTerminations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FiberTermination = typeof fiberTerminations.$inferSelect;
export type InsertFiberTermination = z.infer<typeof insertFiberTerminationSchema>;

// Insert schemas for Airtable integration
export const insertAirtableConnectionSchema = createInsertSchema(airtableConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirtableWorkflowTemplateSchema = createInsertSchema(airtableWorkflowTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirtableRecordLinkSchema = createInsertSchema(airtableRecordLinks).omit({
  id: true,
  linkedAt: true,
});

export const insertAddressRecordSchema = createInsertSchema(addressRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRagStatusRecordSchema = createInsertSchema(ragStatusRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTariffRecordSchema = createInsertSchema(tariffRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAddressSyncLogSchema = createInsertSchema(addressSyncLogs).omit({
  id: true,
});

// Types for Airtable integration
export type AirtableConnection = typeof airtableConnections.$inferSelect;
export type InsertAirtableConnection = z.infer<typeof insertAirtableConnectionSchema>;

export type AirtableWorkflowTemplate = typeof airtableWorkflowTemplates.$inferSelect;
export type InsertAirtableWorkflowTemplate = z.infer<typeof insertAirtableWorkflowTemplateSchema>;

export type AirtableRecordLink = typeof airtableRecordLinks.$inferSelect;
export type InsertAirtableRecordLink = z.infer<typeof insertAirtableRecordLinkSchema>;

export type AddressRecord = typeof addressRecords.$inferSelect;
export type InsertAddressRecord = z.infer<typeof insertAddressRecordSchema>;

export type RagStatusRecord = typeof ragStatusRecords.$inferSelect;
export type InsertRagStatusRecord = z.infer<typeof insertRagStatusRecordSchema>;

export type TariffRecord = typeof tariffRecords.$inferSelect;
export type InsertTariffRecord = z.infer<typeof insertTariffRecordSchema>;

export type AddressSyncLog = typeof addressSyncLogs.$inferSelect;
export type InsertAddressSyncLog = z.infer<typeof insertAddressSyncLogSchema>;

// ========================================
// AI ASSISTANT TABLES
// ========================================

// AI Chat Sessions
export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  title: varchar('title', { length: 255 }),
  pageContext: varchar('page_context', { length: 500 }),
  pageData: jsonb('page_data'),
  
  modelUsed: varchar('model_used', { length: 100 }).default('gpt-4'),
  totalMessages: integer('total_messages').default(0),
  totalTokensUsed: integer('total_tokens_used').default(0),
  estimatedCost: numeric('estimated_cost', { precision: 10, scale: 6 }).default('0'),
  
  personalityConfig: jsonb('personality_config'),
  
  status: varchar('status', { length: 50 }).default('active'),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgIdx: index('ai_chat_sessions_org_idx').on(table.organizationId),
  userIdx: index('ai_chat_sessions_user_idx').on(table.userId),
  statusIdx: index('ai_chat_sessions_status_idx').on(table.status),
}));

// AI Chat Messages
export const aiChatMessages = pgTable('ai_chat_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }).notNull(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  
  role: varchar('role', { length: 50 }).notNull(),
  content: text('content').notNull(),
  
  functionCall: jsonb('function_call'),
  functionResponse: jsonb('function_response'),
  
  modelUsed: varchar('model_used', { length: 100 }),
  tokensUsed: integer('tokens_used').default(0),
  executionTime: integer('execution_time'),
  
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('ai_chat_messages_session_idx').on(table.sessionId),
  roleIdx: index('ai_chat_messages_role_idx').on(table.role),
}));

// AI Chat Attachments
export const aiChatAttachments = pgTable('ai_chat_attachments', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => aiChatMessages.id, { onDelete: 'cascade' }).notNull(),
  sessionId: integer('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }).notNull(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  filePath: text('file_path'),
  fileUrl: text('file_url'),
  
  processedData: jsonb('processed_data'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  messageIdx: index('ai_chat_attachments_message_idx').on(table.messageId),
  sessionIdx: index('ai_chat_attachments_session_idx').on(table.sessionId),
}));

// AI Proposed Actions (for approval workflow)
export const aiProposedActions = pgTable('ai_proposed_actions', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }).notNull(),
  messageId: integer('message_id').references(() => aiChatMessages.id, { onDelete: 'cascade' }),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  actionType: varchar('action_type', { length: 100 }).notNull(),
  actionPayload: jsonb('action_payload').notNull(),
  reasoning: text('reasoning'),
  
  estimatedImpact: jsonb('estimated_impact'),
  
  status: varchar('status', { length: 50 }).default('pending'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectedBy: integer('rejected_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  
  executedAt: timestamp('executed_at'),
  executionResult: jsonb('execution_result'),
  executionError: text('execution_error'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('ai_proposed_actions_session_idx').on(table.sessionId),
  statusIdx: index('ai_proposed_actions_status_idx').on(table.status),
  userIdx: index('ai_proposed_actions_user_idx').on(table.userId),
}));

// AI Assistant Configuration
export const aiAssistantConfig = pgTable('ai_assistant_config', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull().unique(),
  
  isEnabled: boolean('is_enabled').default(true),
  
  defaultModel: varchar('default_model', { length: 100 }).default('gpt-5-mini'),
  simpleQAModel: varchar('simple_qa_model', { length: 100 }).default('gpt-5-nano'),
  strategyModel: varchar('strategy_model', { length: 100 }).default('gpt-5'),
  kbRetrievalModel: varchar('kb_retrieval_model', { length: 100 }).default('gpt-5-mini'),
  dataAnalysisModel: varchar('data_analysis_model', { length: 100 }).default('gpt-4.1'),
  
  temperature: numeric('temperature', { precision: 3, scale: 2 }).default('0.7'),
  maxTokens: integer('max_tokens').default(2000),
  topP: numeric('top_p', { precision: 3, scale: 2 }).default('0.95'),
  presencePenalty: numeric('presence_penalty', { precision: 3, scale: 2 }).default('0'),
  frequencyPenalty: numeric('frequency_penalty', { precision: 3, scale: 2 }).default('0'),
  
  instructionDocumentId: integer('instruction_document_id').references(() => knowledgeDocuments.id),
  customInstructions: text('custom_instructions'),
  
  personalityName: varchar('personality_name', { length: 100 }).default('Aimee'),
  personalityTraits: jsonb('personality_traits'),
  
  enableSemanticSearch: boolean('enable_semantic_search').default(true),
  maxKBDocsPerQuery: integer('max_kb_docs_per_query').default(5),
  similarityThreshold: numeric('similarity_threshold', { precision: 3, scale: 2 }).default('0.75'),
  
  monthlyBudget: numeric('monthly_budget', { precision: 10, scale: 2 }),
  currentMonthUsage: numeric('current_month_usage', { precision: 10, scale: 6 }).default('0'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgIdx: index('ai_assistant_config_org_idx').on(table.organizationId),
}));

// AI Assistant Functions (Function Registry)
export const aiAssistantFunctions = pgTable('ai_assistant_functions', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id),
  
  functionName: varchar('function_name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  
  integrationType: varchar('integration_type', { length: 50 }),
  integrationId: integer('integration_id').references(() => integrations.id),
  apiEndpoint: varchar('api_endpoint', { length: 500 }),
  httpMethod: varchar('http_method', { length: 10 }),
  
  functionSchema: jsonb('function_schema').notNull(),
  parameterSchema: jsonb('parameter_schema'),
  responseSchema: jsonb('response_schema'),
  
  requiredDatasets: jsonb('required_datasets'),
  dataScope: varchar('data_scope', { length: 50 }).default('organization'),
  sensitiveData: boolean('sensitive_data').default(false),
  
  minimumRole: varchar('minimum_role', { length: 50 }).default('team_member'),
  requiredPermissions: jsonb('required_permissions'),
  requiresApproval: boolean('requires_approval').default(true),
  
  isEnabled: boolean('is_enabled').default(true),
  isSystemFunction: boolean('is_system_function').default(false),
  isDeprecated: boolean('is_deprecated').default(false),
  
  totalCalls: integer('total_calls').default(0),
  successfulCalls: integer('successful_calls').default(0),
  failedCalls: integer('failed_calls').default(0),
  lastCalledAt: timestamp('last_called_at'),
  averageExecutionTime: integer('average_execution_time'),
  
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgFuncIdx: index('ai_assistant_functions_org_func_idx').on(table.organizationId, table.functionName),
  categoryIdx: index('ai_assistant_functions_category_idx').on(table.category),
  enabledIdx: index('ai_assistant_functions_enabled_idx').on(table.isEnabled),
}));

// AI Function Permissions
export const aiFunctionPermissions = pgTable('ai_function_permissions', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  functionId: integer('function_id').references(() => aiAssistantFunctions.id, { onDelete: 'cascade' }).notNull(),
  
  roleType: varchar('role_type', { length: 50 }),
  userId: integer('user_id').references(() => users.id),
  teamId: integer('team_id').references(() => teams.id),
  
  canExecute: boolean('can_execute').default(true),
  requiresApproval: boolean('requires_approval').default(true),
  
  allowedDatasets: jsonb('allowed_datasets'),
  dataFilters: jsonb('data_filters'),
  
  maxCallsPerHour: integer('max_calls_per_hour').default(100),
  maxCallsPerDay: integer('max_calls_per_day').default(1000),
  
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  funcIdx: index('ai_function_permissions_func_idx').on(table.functionId),
  roleIdx: index('ai_function_permissions_role_idx').on(table.roleType),
  userIdx: index('ai_function_permissions_user_idx').on(table.userId),
}));

// AI Function Usage Logs
export const aiFunctionUsageLogs = pgTable('ai_function_usage_logs', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  functionId: integer('function_id').references(() => aiAssistantFunctions.id).notNull(),
  sessionId: integer('session_id').references(() => aiChatSessions.id),
  messageId: integer('message_id').references(() => aiChatMessages.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  functionName: varchar('function_name', { length: 100 }).notNull(),
  requestPayload: jsonb('request_payload'),
  responseData: jsonb('response_data'),
  
  status: varchar('status', { length: 50 }).notNull(),
  executionTime: integer('execution_time'),
  errorMessage: text('error_message'),
  
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  funcIdx: index('ai_function_usage_logs_func_idx').on(table.functionId),
  userIdx: index('ai_function_usage_logs_user_idx').on(table.userId),
  statusIdx: index('ai_function_usage_logs_status_idx').on(table.status),
  createdIdx: index('ai_function_usage_logs_created_idx').on(table.createdAt),
}));

// AI Document Embeddings (for semantic search - requires pgvector extension)
export const aiDocumentEmbeddings = pgTable('ai_document_embeddings', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  sourceId: integer('source_id').notNull(),
  documentText: text('document_text').notNull(),
  chunkIndex: integer('chunk_index').default(0),
  
  embedding: text('embedding'),
  embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-ada-002'),
  
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sourceIdx: index('ai_document_embeddings_source_idx').on(table.sourceType, table.sourceId),
  orgIdx: index('ai_document_embeddings_org_idx').on(table.organizationId),
}));

// AI Chat Performance Metrics
export const aiChatPerformance = pgTable('ai_chat_performance', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }).notNull(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  
  totalResponseTime: integer('total_response_time'),
  averageResponseTime: integer('average_response_time'),
  modelSwitches: integer('model_switches').default(0),
  
  functionsProposed: integer('functions_proposed').default(0),
  functionsApproved: integer('functions_approved').default(0),
  functionsRejected: integer('functions_rejected').default(0),
  functionsExecuted: integer('functions_executed').default(0),
  
  kbDocumentsRetrieved: integer('kb_documents_retrieved').default(0),
  integrationsCalled: jsonb('integrations_called'),
  
  userSatisfactionRating: integer('user_satisfaction_rating'),
  userFeedback: text('user_feedback'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('ai_chat_performance_session_idx').on(table.sessionId),
  orgIdx: index('ai_chat_performance_org_idx').on(table.organizationId),
}));

// Insert schemas for AI Assistant
export const insertAIChatSessionSchema = createInsertSchema(aiChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
});

export const insertAIChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAIChatAttachmentSchema = createInsertSchema(aiChatAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertAIProposedActionSchema = createInsertSchema(aiProposedActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIAssistantConfigSchema = createInsertSchema(aiAssistantConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIAssistantFunctionSchema = createInsertSchema(aiAssistantFunctions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalledAt: true,
});

export const insertAIFunctionPermissionSchema = createInsertSchema(aiFunctionPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIFunctionUsageLogSchema = createInsertSchema(aiFunctionUsageLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAIDocumentEmbeddingSchema = createInsertSchema(aiDocumentEmbeddings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIChatPerformanceSchema = createInsertSchema(aiChatPerformance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for AI Assistant
export type AIChatSession = typeof aiChatSessions.$inferSelect;
export type InsertAIChatSession = z.infer<typeof insertAIChatSessionSchema>;

export type AIChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAIChatMessage = z.infer<typeof insertAIChatMessageSchema>;

export type AIChatAttachment = typeof aiChatAttachments.$inferSelect;
export type InsertAIChatAttachment = z.infer<typeof insertAIChatAttachmentSchema>;

export type AIProposedAction = typeof aiProposedActions.$inferSelect;
export type InsertAIProposedAction = z.infer<typeof insertAIProposedActionSchema>;

export type AIAssistantConfig = typeof aiAssistantConfig.$inferSelect;
export type InsertAIAssistantConfig = z.infer<typeof insertAIAssistantConfigSchema>;

export type AIAssistantFunction = typeof aiAssistantFunctions.$inferSelect;
export type InsertAIAssistantFunction = z.infer<typeof insertAIAssistantFunctionSchema>;

export type AIFunctionPermission = typeof aiFunctionPermissions.$inferSelect;
export type InsertAIFunctionPermission = z.infer<typeof insertAIFunctionPermissionSchema>;

export type AIFunctionUsageLog = typeof aiFunctionUsageLogs.$inferSelect;
export type InsertAIFunctionUsageLog = z.infer<typeof insertAIFunctionUsageLogSchema>;

export type AIDocumentEmbedding = typeof aiDocumentEmbeddings.$inferSelect;
export type InsertAIDocumentEmbedding = z.infer<typeof insertAIDocumentEmbeddingSchema>;

export type AIChatPerformance = typeof aiChatPerformance.$inferSelect;
export type InsertAIChatPerformance = z.infer<typeof insertAIChatPerformanceSchema>;

// ========================================
// OCR & DYNAMIC FIELD TYPES
// ========================================

// Insert schemas
export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkItemSourceSchema = createInsertSchema(workItemSources).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowStepExtractionSchema = createInsertSchema(workflowStepExtractions).omit({
  id: true,
  createdAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;

export type WorkItemSource = typeof workItemSources.$inferSelect;
export type InsertWorkItemSource = z.infer<typeof insertWorkItemSourceSchema>;

export type WorkflowStepExtraction = typeof workflowStepExtractions.$inferSelect;
export type InsertWorkflowStepExtraction = z.infer<typeof insertWorkflowStepExtractionSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

// ========================================
// CHAT ACTIVITY LOG TYPES
// ========================================

// Structured metadata for chat activity logs
export const chatActivityMetadataSchema = z.object({
  sessionId: z.number(),
  sessionTitle: z.string().optional(),
  turnIndex: z.number(), // Conversation turn number (user/assistant pair)
  userMessage: z.string(),
  userMessageId: z.number(),
  assistantMessage: z.string(),
  assistantMessageId: z.number(),
  functionsCalled: z.array(z.object({
    name: z.string(),
    parameters: z.any(),
    result: z.any().optional(),
    approved: z.boolean().optional(),
  })).optional(),
  tokensUsed: z.number().optional(),
  executionTime: z.number().optional(), // in ms
  modelUsed: z.string().optional(),
});

export type ChatActivityMetadata = z.infer<typeof chatActivityMetadataSchema>;

// View model for grouped chat session activities
export interface ChatSessionActivityView {
  sessionId: number;
  sessionTitle: string;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  totalTokensUsed: number;
  estimatedCost: number;
  userId: number;
  userName?: string;
  turns: ChatConversationTurn[];
}

export interface ChatConversationTurn {
  turnIndex: number;
  timestamp: Date;
  userMessage: string;
  assistantMessage: string;
  functionsCalled?: {
    name: string;
    parameters: any;
    result?: any;
    approved?: boolean;
  }[];
  tokensUsed?: number;
  executionTime?: number;
  modelUsed?: string;
}

// ========================================
// FINANCIAL MANAGEMENT SYSTEM
// ========================================

// Enums for financial management
export const transactionTypeEnum = pgEnum('transaction_type', ['bank_transaction', 'invoice', 'payment', 'credit_note', 'bill', 'journal']);
export const categorizationStatusEnum = pgEnum('categorization_status', ['uncategorized', 'ai_suggested', 'manually_categorized', 'approved']);
export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['matched', 'unmatched', 'needs_review', 'reconciled']);
export const profitCenterTypeEnum = pgEnum('profit_center_type', ['geographic', 'service', 'customer_segment', 'custom']);
export const okrLinkTypeEnum = pgEnum('okr_link_type', ['objective', 'key_result', 'key_result_task']);

// Financial Transactions - Central warehouse for all financial data from Xero
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Xero reference
  xeroTransactionId: varchar("xero_transaction_id", { length: 255 }).notNull(),
  xeroTransactionType: transactionTypeEnum("xero_transaction_type").notNull(),
  
  // Transaction details
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description"),
  contactName: varchar("contact_name", { length: 255 }),
  xeroContactId: varchar("xero_contact_id", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // Categorization (KEY REQUIREMENT)
  primaryCategory: varchar("primary_category", { length: 255 }), // Xero account code
  primaryCategoryName: varchar("primary_category_name", { length: 255 }),
  profitCenterTags: jsonb("profit_center_tags").default([]).$type<number[]>(), // Array of profit_center IDs
  categorizationStatus: categorizationStatusEnum("categorization_status").default("uncategorized").notNull(),
  categorizedBy: integer("categorized_by").references(() => users.id),
  categorizedAt: timestamp("categorized_at"),
  aiSuggestedCategory: varchar("ai_suggested_category", { length: 255 }),
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 2 }),
  
  // Splynx mapping for customer/invoice matching
  splynxCustomerId: varchar("splynx_customer_id", { length: 50 }),
  splynxInvoiceId: varchar("splynx_invoice_id", { length: 50 }),
  
  // Reconciliation
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status").default("unmatched").notNull(),
  reconciledBy: integer("reconciled_by").references(() => users.id),
  reconciledAt: timestamp("reconciled_at"),
  
  // Additional metadata
  notes: text("notes"),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  metadata: jsonb("metadata"), // Additional Xero data
  
  // Chart of Accounts fields (extracted from metadata for filtering)
  xeroAccountCode: varchar("xero_account_code", { length: 50 }),
  xeroAccountName: varchar("xero_account_name", { length: 255 }),
  xeroAccountType: varchar("xero_account_type", { length: 50 }), // REVENUE, EXPENSE, ASSET, LIABILITY, EQUITY
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_financial_transactions_org").on(table.organizationId),
  index("idx_financial_transactions_xero_id").on(table.xeroTransactionId),
  index("idx_financial_transactions_date").on(table.transactionDate.desc()),
  index("idx_financial_transactions_status").on(table.categorizationStatus),
  index("idx_financial_transactions_splynx_customer").on(table.splynxCustomerId),
  index("idx_financial_transactions_account").on(table.xeroAccountCode),
]);

// Xero Chart of Accounts - Imported from Xero for mapping to profit centers
export const xeroChartOfAccounts = pgTable("xero_chart_of_accounts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Xero account identifiers
  xeroAccountId: varchar("xero_account_id", { length: 255 }).notNull(),
  accountCode: varchar("account_code", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  
  // Account classification
  accountType: varchar("account_type", { length: 50 }).notNull(), // REVENUE, EXPENSE, ASSET, LIABILITY, EQUITY
  accountClass: varchar("account_class", { length: 50 }), // REVENUE, EXPENSE, etc.
  taxType: varchar("tax_type", { length: 100 }),
  
  // Account properties
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  description: text("description"),
  systemAccount: varchar("system_account", { length: 100 }), // Xero returns string like "DEBTORS", "CREDITORS"
  enablePaymentsToAccount: boolean("enable_payments_to_account").default(false),
  showInExpenseClaims: boolean("show_in_expense_claims").default(false),
  
  // Banking
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  currencyCode: varchar("currency_code", { length: 3 }).default("GBP"),
  
  // Reporting
  reportingCode: varchar("reporting_code", { length: 50 }),
  reportingCodeName: varchar("reporting_code_name", { length: 255 }),
  
  // Full Xero data
  metadata: jsonb("metadata"),
  
  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_xero_coa_org").on(table.organizationId),
  index("idx_xero_coa_type").on(table.accountType),
  index("idx_xero_coa_code").on(table.accountCode),
  index("idx_xero_coa_status").on(table.status),
]);

// Profit Centers - Business segments for financial analysis
export const profitCenters: any = pgTable("profit_centers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Profit center details
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }), // Short code for reporting
  type: profitCenterTypeEnum("type").notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  color: varchar("color", { length: 20 }), // For UI visualization
  
  // Xero tracking category mapping
  xeroTrackingCategoryId: varchar("xero_tracking_category_id", { length: 255 }),
  xeroTrackingOptionId: varchar("xero_tracking_option_id", { length: 255 }),
  xeroTrackingName: varchar("xero_tracking_name", { length: 255 }),
  
  // Mappings to other systems
  splynxLocationIds: jsonb("splynx_location_ids").default([]).$type<string[]>(), // Geographic zones
  serviceTypes: jsonb("service_types").default([]).$type<string[]>(), // Service classifications
  customerSegments: jsonb("customer_segments").default([]).$type<string[]>(), // Customer types
  
  // Budget allocation
  monthlyBudget: decimal("monthly_budget", { precision: 12, scale: 2 }),
  
  // Chart of Accounts linkage
  xeroAccountId: varchar("xero_account_id", { length: 255 }),
  xeroAccountCode: varchar("xero_account_code", { length: 50 }), // Denormalized for performance
  xeroAccountName: varchar("xero_account_name", { length: 255 }), // Denormalized for display
  
  // OKR linkage - EXACTLY ONE required (unless parent container)
  linkedOkrType: okrLinkTypeEnum("linked_okr_type"), // 'objective', 'key_result', 'key_result_task'
  objectiveId: integer("objective_id").references(() => objectives.id),
  keyResultId: integer("key_result_id").references(() => keyResults.id),
  keyResultTaskId: integer("key_result_task_id").references(() => keyResultTasks.id),
  
  // Validation flags
  requiresXeroAccount: boolean("requires_xero_account").default(true),
  
  // Hierarchy support
  parentProfitCenterId: integer("parent_profit_center_id").references((): any => profitCenters.id),
  displayOrder: integer("display_order").default(0),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Audit
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_profit_centers_org").on(table.organizationId),
  index("idx_profit_centers_type").on(table.type),
  index("idx_profit_centers_active").on(table.isActive),
  index("idx_profit_centers_xero_account").on(table.xeroAccountId),
  index("idx_profit_centers_objective").on(table.objectiveId),
  index("idx_profit_centers_key_result").on(table.keyResultId),
  index("idx_profit_centers_task").on(table.keyResultTaskId),
]);

// Financial Metrics Cache - Pre-calculated metrics for dashboard performance
export const financialMetricsCache = pgTable("financial_metrics_cache", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Metric identification
  metricType: varchar("metric_type", { length: 100 }).notNull(), // 'cash_position', 'monthly_revenue', 'ar_aging', 'margin', 'arpu'
  period: varchar("period", { length: 50 }).notNull(), // 'current_month', 'last_month', 'ytd', '2025-01', etc.
  profitCenterId: integer("profit_center_id").references(() => profitCenters.id), // Nullable for org-wide metrics
  
  // Metric value and details
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  previousValue: decimal("previous_value", { precision: 15, scale: 2 }), // For trend calculation
  percentageChange: decimal("percentage_change", { precision: 5, scale: 2 }),
  
  // Breakdown and metadata
  breakdown: jsonb("breakdown"), // Detailed breakdown for charts/tables
  metadata: jsonb("metadata"), // Additional context (customer count, transaction count, etc.)
  
  // Cache management
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_financial_metrics_org").on(table.organizationId),
  index("idx_financial_metrics_type").on(table.metricType),
  index("idx_financial_metrics_period").on(table.period),
  index("idx_financial_metrics_profit_center").on(table.profitCenterId),
  index("idx_financial_metrics_expires").on(table.expiresAt),
]);

// Xero sync status tracking (current status only - gets UPDATE'd)
export const xeroSyncStatus = pgTable("xero_sync_status", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Sync details
  syncType: varchar("sync_type", { length: 50 }).notNull(), // 'transactions', 'contacts', 'invoices', 'accounts'
  lastSyncAt: timestamp("last_sync_at"),
  lastSuccessfulSyncAt: timestamp("last_successful_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  
  // Sync results
  recordsSynced: integer("records_synced").default(0),
  recordsFailed: integer("records_failed").default(0),
  totalRecordsToSync: integer("total_records_to_sync").default(0), // Total records to process in this sync
  errors: jsonb("errors").default([]),
  
  // Progress tracking (for UI display and hang detection)
  lastProgressAt: timestamp("last_progress_at").defaultNow(), // Last time progress was made (for timeout detection)
  
  // Status
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'in_progress', 'completed', 'failed'
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_xero_sync_org").on(table.organizationId),
  index("idx_xero_sync_type").on(table.syncType),
]);

// Xero sync logs - Historical record of all syncs (new row INSERT'd each sync)
export const xeroSyncLogs = pgTable("xero_sync_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Sync details
  syncType: varchar("sync_type", { length: 50 }).notNull(), // 'transactions', 'contacts', 'invoices', 'accounts'
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"), // Duration in milliseconds
  
  // Sync results
  recordsSynced: integer("records_synced").default(0),
  recordsFailed: integer("records_failed").default(0),
  totalRecordsToSync: integer("total_records_to_sync").default(0),
  errors: jsonb("errors").default([]),
  
  // Status
  status: varchar("status", { length: 50 }).notNull(), // 'completed', 'failed', 'partial'
  
  // Triggered by
  triggeredBy: integer("triggered_by").references(() => users.id), // User who triggered manual sync
  triggerType: varchar("trigger_type", { length: 50 }).default("manual"), // 'manual', 'scheduled', 'webhook'
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_xero_sync_logs_org").on(table.organizationId),
  index("idx_xero_sync_logs_type").on(table.syncType),
  index("idx_xero_sync_logs_started").on(table.startedAt.desc()),
]);

// Insert schemas for financial tables
export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertXeroChartOfAccountsSchema = createInsertSchema(xeroChartOfAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfitCenterSchema = createInsertSchema(profitCenters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialMetricsCacheSchema = createInsertSchema(financialMetricsCache).omit({
  id: true,
  createdAt: true,
});

export const insertXeroSyncStatusSchema = createInsertSchema(xeroSyncStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertXeroSyncLogSchema = createInsertSchema(xeroSyncLogs).omit({
  id: true,
  createdAt: true,
});

// Types for financial tables
export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;

export type XeroChartOfAccount = typeof xeroChartOfAccounts.$inferSelect;
export type InsertXeroChartOfAccount = z.infer<typeof insertXeroChartOfAccountsSchema>;

export type ProfitCenter = typeof profitCenters.$inferSelect;
export type InsertProfitCenter = z.infer<typeof insertProfitCenterSchema>;

export type FinancialMetricsCache = typeof financialMetricsCache.$inferSelect;
export type InsertFinancialMetricsCache = z.infer<typeof insertFinancialMetricsCacheSchema>;

export type XeroSyncStatus = typeof xeroSyncStatus.$inferSelect;
export type InsertXeroSyncStatus = z.infer<typeof insertXeroSyncStatusSchema>;

export type XeroSyncLog = typeof xeroSyncLogs.$inferSelect;
export type InsertXeroSyncLog = z.infer<typeof insertXeroSyncLogSchema>;

// ========================================
// VAPI VOICE AI INTEGRATION
// ========================================

// Vapi Call Status Enum
export const vapiCallStatusEnum = pgEnum('vapi_call_status', ['queued', 'ringing', 'in_progress', 'forwarding', 'ended']);

// Vapi Call End Reason Enum
export const vapiEndReasonEnum = pgEnum('vapi_end_reason', ['assistant_ended', 'assistant_forwarded', 'customer_ended', 'customer_did_not_answer', 'error', 'exceeded_max_duration', 'silence_timeout']);

// Vapi Calls - Track all voice AI interactions
export const vapiCalls = pgTable("vapi_calls", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Vapi identifiers
  vapiCallId: varchar("vapi_call_id", { length: 255 }).notNull().unique(),
  assistantId: varchar("assistant_id", { length: 255 }),
  phoneNumberId: varchar("phone_number_id", { length: 255 }),
  
  // Call details
  customerPhoneNumber: varchar("customer_phone_number", { length: 50 }),
  customerName: varchar("customer_name", { length: 255 }),
  customerId: integer("customer_id"), // Link to Splynx customer if identified
  
  // Call status and timeline
  status: vapiCallStatusEnum("status").default("queued").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),
  
  // Call outcome
  endReason: vapiEndReasonEnum("end_reason"),
  wasAutonomous: boolean("was_autonomous").default(false), // True if no human intervention needed
  wasForwarded: boolean("was_forwarded").default(false),
  forwardedTo: varchar("forwarded_to", { length: 100 }), // 'business_team', 'technical_support', etc.
  
  // Call analysis
  transcript: text("transcript"),
  summary: text("summary"),
  customerIntent: varchar("customer_intent", { length: 100 }), // 'sales', 'support', 'billing', 'transfer'
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }), // -1.00 to 1.00
  
  // SMS verification tracking (for support calls)
  smsCodeSent: boolean("sms_code_sent").default(false),
  smsCodeVerified: boolean("sms_code_verified").default(false),
  smsVerificationAttempts: integer("sms_verification_attempts").default(0),
  
  // Actions taken
  ticketCreated: boolean("ticket_created").default(false),
  ticketId: varchar("ticket_id", { length: 100 }), // Splynx ticket ID
  demoScheduled: boolean("demo_scheduled").default(false),
  demoScheduledFor: timestamp("demo_scheduled_for"),
  callbackScheduled: boolean("callback_scheduled").default(false),
  callbackScheduledFor: timestamp("callback_scheduled_for"),
  
  // Work items created
  workItemIds: jsonb("work_item_ids").default([]).$type<number[]>(),
  
  // Knowledge base usage
  knowledgeFilesUsed: jsonb("knowledge_files_used").default([]).$type<string[]>(),
  knowledgeGaps: jsonb("knowledge_gaps").default([]).$type<string[]>(), // Questions assistant couldn't answer
  
  // Metrics for KR tracking
  costCents: integer("cost_cents"), // Cost in cents (Vapi billing)
  
  // Raw Vapi data
  rawCallData: jsonb("raw_call_data"), // Full Vapi webhook payload
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vapi_calls_org").on(table.organizationId),
  index("idx_vapi_calls_vapi_id").on(table.vapiCallId),
  index("idx_vapi_calls_status").on(table.status),
  index("idx_vapi_calls_customer").on(table.customerId),
  index("idx_vapi_calls_started").on(table.startedAt.desc()),
  index("idx_vapi_calls_intent").on(table.customerIntent),
  index("idx_vapi_calls_autonomous").on(table.wasAutonomous),
]);

// Vapi Assistants - Configuration for each AI assistant
export const vapiAssistants = pgTable("vapi_assistants", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Vapi identifiers
  vapiAssistantId: varchar("vapi_assistant_id", { length: 255 }).unique(),
  
  // Assistant details
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }), // 'triage', 'sales', 'support'
  description: text("description"),
  
  // LLM Configuration
  systemPrompt: text("system_prompt"),
  modelProvider: varchar("model_provider", { length: 50 }).default("openai"),
  modelName: varchar("model_name", { length: 100 }).default("gpt-4"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  
  // Voice Configuration
  voiceProvider: varchar("voice_provider", { length: 50 }),
  voiceId: varchar("voice_id", { length: 255 }),
  firstMessage: text("first_message"),
  
  // Tools and capabilities
  toolsConfig: jsonb("tools_config").default([]), // Array of tool configurations
  knowledgeBaseIds: jsonb("knowledge_base_ids").default([]).$type<string[]>(), // Vapi file IDs
  
  // Duration limits
  maxDurationSeconds: integer("max_duration_seconds").default(300),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vapi_assistants_org").on(table.organizationId),
  index("idx_vapi_assistants_role").on(table.role),
  index("idx_vapi_assistants_active").on(table.isActive),
]);

// Vapi Knowledge Files - Track knowledge base files uploaded to Vapi
export const vapiKnowledgeFiles = pgTable("vapi_knowledge_files", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  
  // Vapi identifiers
  vapiFileId: varchar("vapi_file_id", { length: 255 }).notNull().unique(),
  
  // File details
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }), // 'pdf', 'txt', 'docx'
  fileSize: integer("file_size"), // Bytes
  
  // Content tracking
  category: varchar("category", { length: 100 }), // 'packages', 'troubleshooting', 'billing', 'policies'
  description: text("description"),
  
  // Usage metrics
  timesUsed: integer("times_used").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  // Link to internal KB
  knowledgeDocumentId: integer("knowledge_document_id").references(() => knowledgeDocuments.id),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Audit
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vapi_knowledge_org").on(table.organizationId),
  index("idx_vapi_knowledge_category").on(table.category),
  index("idx_vapi_knowledge_active").on(table.isActive),
]);

// Insert schemas
export const insertVapiCallSchema = createInsertSchema(vapiCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVapiAssistantSchema = createInsertSchema(vapiAssistants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVapiKnowledgeFileSchema = createInsertSchema(vapiKnowledgeFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type VapiCall = typeof vapiCalls.$inferSelect;
export type InsertVapiCall = z.infer<typeof insertVapiCallSchema>;

export type VapiAssistant = typeof vapiAssistants.$inferSelect;
export type InsertVapiAssistant = z.infer<typeof insertVapiAssistantSchema>;

export type VapiKnowledgeFile = typeof vapiKnowledgeFiles.$inferSelect;
export type InsertVapiKnowledgeFile = z.infer<typeof insertVapiKnowledgeFileSchema>;