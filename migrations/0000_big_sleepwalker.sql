CREATE TYPE "public"."activity_event_type" AS ENUM('training_completed', 'document_published', 'sale_recorded', 'work_item_updated', 'whatsapp_message', 'custom');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('creation', 'status_change', 'assignment', 'comment', 'file_upload', 'kpi_update', 'agent_action', 'completion', 'deletion', 'generation', 'bulk_update', 'openai_test', 'openai_key_saved', 'ai_chat', 'field_app_sync_success', 'field_app_sync_partial', 'field_app_sync_failed', 'ocr_extraction', 'ocr_extraction_failed');--> statement-breakpoint
CREATE TYPE "public"."ai_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."app_task_type" AS ENUM('installation', 'maintenance', 'repair', 'build', 'inspection', 'survey');--> statement-breakpoint
CREATE TYPE "public"."booking_access_mode" AS ENUM('open', 'authenticated');--> statement-breakpoint
CREATE TYPE "public"."build_status" AS ENUM('not_started', 'building', 'testing', 'released', 'dynamic');--> statement-breakpoint
CREATE TYPE "public"."cable_type" AS ENUM('single_mode', 'multi_mode', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."cardinality" AS ENUM('one_to_one', 'one_to_many', 'many_to_many');--> statement-breakpoint
CREATE TYPE "public"."categorization_status" AS ENUM('uncategorized', 'ai_suggested', 'manually_categorized', 'approved');--> statement-breakpoint
CREATE TYPE "public"."check_in_cycle_status" AS ENUM('Planning', 'In Progress', 'Review', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."created_via" AS ENUM('manual', 'workflow_step');--> statement-breakpoint
CREATE TYPE "public"."default_cadence" AS ENUM('daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'half_yearly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."delete_action" AS ENUM('cascade', 'restrict', 'set_null', 'no_action');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_visibility" AS ENUM('public', 'internal', 'private');--> statement-breakpoint
CREATE TYPE "public"."fiber_activity_type" AS ENUM('create', 'update', 'delete', 'view', 'work_item_created', 'workflow_completed');--> statement-breakpoint
CREATE TYPE "public"."fiber_network" AS ENUM('CCNet', 'FibreLtd', 'S&MFibre');--> statement-breakpoint
CREATE TYPE "public"."fiber_node_status" AS ENUM('active', 'planned', 'decommissioned', 'awaiting_evidence', 'build_complete', 'action_required');--> statement-breakpoint
CREATE TYPE "public"."fiber_node_type" AS ENUM('chamber', 'cabinet', 'pole', 'splice_closure', 'customer_premise');--> statement-breakpoint
CREATE TYPE "public"."field_task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."field_task_status" AS ENUM('new', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."folder_type" AS ENUM('general', 'training', 'customer', 'content', 'internal');--> statement-breakpoint
CREATE TYPE "public"."key_result_status" AS ENUM('Not Started', 'On Track', 'At Risk', 'Stuck', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."key_result_task_status" AS ENUM('Not Started', 'On Track', 'Stuck', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."key_result_type" AS ENUM('Numeric Target', 'Percentage KPI', 'Milestone');--> statement-breakpoint
CREATE TYPE "public"."knowledge_completion_requirement" AS ENUM('all_steps', 'quiz', 'both');--> statement-breakpoint
CREATE TYPE "public"."knowledge_document_type" AS ENUM('internal_kb', 'website_page', 'customer_kb', 'marketing_email', 'marketing_letter', 'attachment', 'training_module', 'external_file_link', 'contract', 'policy', 'public_report', 'quick_reference');--> statement-breakpoint
CREATE TYPE "public"."kpi_type" AS ENUM('Derived from Key Results', 'Manual Input');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_status" AS ENUM('draft', 'pending_review', 'active', 'expiring', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."meeting_length" AS ENUM('15', '30', '45', '60');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('Planning', 'Planned', 'In Progress', 'Completed', 'Skipped');--> statement-breakpoint
CREATE TYPE "public"."monthly_rule_type" AS ENUM('nth_weekday', 'day_of_month');--> statement-breakpoint
CREATE TYPE "public"."nth" AS ENUM('1', '2', '3', '4', 'last');--> statement-breakpoint
CREATE TYPE "public"."objective_status" AS ENUM('Draft', 'Active', 'On Track', 'At Risk', 'Off Track', 'Completed', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."okr_link_type" AS ENUM('objective', 'key_result', 'key_result_task');--> statement-breakpoint
CREATE TYPE "public"."org_scope" AS ENUM('all', 'specific');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('draft', 'dev', 'live', 'archived');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('Leader', 'Member', 'Watcher');--> statement-breakpoint
CREATE TYPE "public"."period_rule_type" AS ENUM('nth_weekday');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'paid', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."process_folder_type" AS ENUM('agents', 'templates', 'shared', 'reports', 'files');--> statement-breakpoint
CREATE TYPE "public"."profit_center_type" AS ENUM('geographic', 'service', 'customer_segment', 'custom');--> statement-breakpoint
CREATE TYPE "public"."rag_status" AS ENUM('red', 'amber', 'green');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('matched', 'unmatched', 'needs_review', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."report_access_type" AS ENUM('public', 'role_based', 'user_based');--> statement-breakpoint
CREATE TYPE "public"."report_block_type" AS ENUM('rich_text', 'data_table', 'chart', 'doc_snippet');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'triage', 'approved', 'rejected', 'implemented');--> statement-breakpoint
CREATE TYPE "public"."routine_frequency" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'six-monthly', 'annually');--> statement-breakpoint
CREATE TYPE "public"."splice_enclosure_type" AS ENUM('dome', 'inline', 'rack', 'wall_box');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sync_entity_type" AS ENUM('task', 'checklist', 'workflow', 'worklog', 'comment', 'attachment');--> statement-breakpoint
CREATE TYPE "public"."sync_operation" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."sync_queue_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('synced', 'pending', 'conflict', 'error');--> statement-breakpoint
CREATE TYPE "public"."task_execution_status" AS ENUM('not_started', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('Leader', 'Member', 'Watcher');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('provisioning', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."training_step_type" AS ENUM('video', 'checklist', 'resource', 'quiz', 'practical_task');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('bank_transaction', 'invoice', 'payment', 'credit_note', 'bill', 'journal');--> statement-breakpoint
CREATE TYPE "public"."unified_status" AS ENUM('draft', 'dev', 'live', 'archived');--> statement-breakpoint
CREATE TYPE "public"."update_type" AS ENUM('progress', 'status_change', 'notes', 'completion');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'manager', 'team_member', 'customer', 'dev');--> statement-breakpoint
CREATE TYPE "public"."user_status_type" AS ENUM('active', 'away', 'in_meeting', 'offline');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('human', 'agent');--> statement-breakpoint
CREATE TYPE "public"."vapi_call_status" AS ENUM('queued', 'ringing', 'in_progress', 'forwarding', 'ended');--> statement-breakpoint
CREATE TYPE "public"."vapi_end_reason" AS ENUM('assistant_ended', 'assistant_forwarded', 'customer_ended', 'customer_did_not_answer', 'error', 'exceeded_max_duration', 'silence_timeout');--> statement-breakpoint
CREATE TYPE "public"."vehicle_check_status" AS ENUM('pass', 'fail', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."visibility_rule_type" AS ENUM('role', 'organization', 'build_status');--> statement-breakpoint
CREATE TYPE "public"."weekday" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
CREATE TYPE "public"."work_item_status" AS ENUM('Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_type" AS ENUM('checklist', 'form', 'photo', 'signature', 'measurement', 'notes', 'geolocation');--> statement-breakpoint
CREATE TABLE "activity_feed" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer,
	"event_type" "activity_event_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer,
	"action_type" "activity_type" NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "address_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"airtable_record_id" varchar(100) NOT NULL,
	"airtable_connection_id" integer NOT NULL,
	"airtable_fields" jsonb DEFAULT '{}'::jsonb,
	"postcode" varchar(20),
	"summary" text,
	"address" text,
	"premise" text,
	"network" varchar(50),
	"udprn" varchar(50),
	"status_id" varchar(50),
	"tariff_ids" jsonb,
	"router_serial" varchar(100),
	"router_mac" varchar(50),
	"router_model" varchar(100),
	"onu_serial" varchar(100),
	"onu_mac" varchar(50),
	"onu_model" varchar(100),
	"extracted_data_extras" jsonb DEFAULT '{}'::jsonb,
	"local_status" varchar(50),
	"local_notes" text,
	"work_item_count" integer DEFAULT 0,
	"last_work_item_date" timestamp,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "address_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"airtable_connection_id" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_skipped" integer DEFAULT 0,
	"records_total" integer DEFAULT 0,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"initiated_by" integer
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"street_address" varchar(500),
	"city" varchar(100),
	"state" varchar(100),
	"postcode" varchar(20),
	"country" varchar(100) DEFAULT 'Australia',
	"latitude" numeric(10, 7),
	"longitude" numeric(11, 8),
	"what3words" varchar(100),
	"extracted_data" jsonb DEFAULT '{}'::jsonb,
	"splynx_customer_id" integer,
	"external_id" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_workflow_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"trigger_source" varchar(255),
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"execution_duration" integer,
	"steps_completed" integer DEFAULT 0,
	"total_steps" integer,
	"retry_count" integer DEFAULT 0,
	"context_data" jsonb DEFAULT '{}'::jsonb,
	"execution_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"result_data" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_workflow_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"cron_expression" varchar(100) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC',
	"is_active" boolean DEFAULT true,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"workflow_definition" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_key_result_id" integer,
	"target_objective_id" integer,
	"assigned_team_id" integer,
	"retry_config" jsonb DEFAULT '{"maxRetries":3,"retryDelay":60}'::jsonb,
	"execution_timeout" integer DEFAULT 300,
	"webhook_token" varchar(255),
	"is_enabled" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp,
	"last_run_status" varchar(50),
	"last_successful_run_at" timestamp,
	"created_by" integer,
	"assigned_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"folder_id" integer
);
--> statement-breakpoint
CREATE TABLE "ai_agent_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"agent_workflow_id" integer,
	"feature_type" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"system_prompt_document_ids" jsonb DEFAULT '[]'::jsonb,
	"knowledge_document_ids" jsonb DEFAULT '[]'::jsonb,
	"model_config" jsonb DEFAULT '{"model":"gpt-4o-mini","temperature":0.7,"maxTokens":1000}'::jsonb NOT NULL,
	"auto_generate_on_arrival" boolean DEFAULT true,
	"context_sources" jsonb DEFAULT '["customer_info","ticket_history","account_balance","connection_status"]'::jsonb,
	"linked_objective_id" integer,
	"linked_key_result_ids" jsonb DEFAULT '[]'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"default_model" varchar(100) DEFAULT 'gpt-5-mini',
	"simple_qa_model" varchar(100) DEFAULT 'gpt-5-nano',
	"strategy_model" varchar(100) DEFAULT 'gpt-5',
	"kb_retrieval_model" varchar(100) DEFAULT 'gpt-5-mini',
	"data_analysis_model" varchar(100) DEFAULT 'gpt-4.1',
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"max_tokens" integer DEFAULT 2000,
	"top_p" numeric(3, 2) DEFAULT '0.95',
	"presence_penalty" numeric(3, 2) DEFAULT '0',
	"frequency_penalty" numeric(3, 2) DEFAULT '0',
	"instruction_document_id" integer,
	"custom_instructions" text,
	"personality_name" varchar(100) DEFAULT 'Aimee',
	"personality_traits" jsonb,
	"enable_semantic_search" boolean DEFAULT true,
	"max_kb_docs_per_query" integer DEFAULT 5,
	"similarity_threshold" numeric(3, 2) DEFAULT '0.75',
	"monthly_budget" numeric(10, 2),
	"current_month_usage" numeric(10, 6) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_assistant_config_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_functions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"function_name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"integration_type" varchar(50),
	"integration_id" integer,
	"api_endpoint" varchar(500),
	"http_method" varchar(10),
	"function_schema" jsonb NOT NULL,
	"parameter_schema" jsonb,
	"response_schema" jsonb,
	"required_datasets" jsonb,
	"data_scope" varchar(50) DEFAULT 'organization',
	"sensitive_data" boolean DEFAULT false,
	"minimum_role" varchar(50) DEFAULT 'team_member',
	"required_permissions" jsonb,
	"requires_approval" boolean DEFAULT true,
	"is_enabled" boolean DEFAULT true,
	"is_system_function" boolean DEFAULT false,
	"is_deprecated" boolean DEFAULT false,
	"total_calls" integer DEFAULT 0,
	"successful_calls" integer DEFAULT 0,
	"failed_calls" integer DEFAULT 0,
	"last_called_at" timestamp,
	"average_execution_time" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100),
	"file_size" integer,
	"file_path" text,
	"file_url" text,
	"processed_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"function_call" jsonb,
	"function_response" jsonb,
	"model_used" varchar(100),
	"tokens_used" integer DEFAULT 0,
	"execution_time" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"total_response_time" integer,
	"average_response_time" integer,
	"model_switches" integer DEFAULT 0,
	"functions_proposed" integer DEFAULT 0,
	"functions_approved" integer DEFAULT 0,
	"functions_rejected" integer DEFAULT 0,
	"functions_executed" integer DEFAULT 0,
	"kb_documents_retrieved" integer DEFAULT 0,
	"integrations_called" jsonb,
	"user_satisfaction_rating" integer,
	"user_feedback" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255),
	"page_context" varchar(500),
	"page_data" jsonb,
	"model_used" varchar(100) DEFAULT 'gpt-4',
	"total_messages" integer DEFAULT 0,
	"total_tokens_used" integer DEFAULT 0,
	"estimated_cost" numeric(10, 6) DEFAULT '0',
	"personality_config" jsonb,
	"status" varchar(50) DEFAULT 'active',
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_content_generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"document_id" integer,
	"mode" varchar(50) NOT NULL,
	"prompt" text NOT NULL,
	"context_documents" jsonb DEFAULT '[]'::jsonb,
	"original_text" text,
	"generated_content" text,
	"approval_status" "ai_approval_status" DEFAULT 'pending',
	"approved_at" timestamp,
	"approved_by" integer,
	"rejection_reason" text,
	"model_used" varchar(100),
	"tokens_used" integer,
	"applied" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_document_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" integer NOT NULL,
	"document_text" text NOT NULL,
	"chunk_index" integer DEFAULT 0,
	"embedding" text,
	"embedding_model" varchar(100) DEFAULT 'text-embedding-ada-002',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_function_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"function_id" integer NOT NULL,
	"role_type" varchar(50),
	"user_id" integer,
	"team_id" integer,
	"can_execute" boolean DEFAULT true,
	"requires_approval" boolean DEFAULT true,
	"allowed_datasets" jsonb,
	"data_filters" jsonb,
	"max_calls_per_hour" integer DEFAULT 100,
	"max_calls_per_day" integer DEFAULT 1000,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_function_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"function_id" integer NOT NULL,
	"session_id" integer,
	"message_id" integer,
	"user_id" integer NOT NULL,
	"function_name" varchar(100) NOT NULL,
	"request_payload" jsonb,
	"response_data" jsonb,
	"status" varchar(50) NOT NULL,
	"execution_time" integer,
	"error_message" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_proposed_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"message_id" integer,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"action_payload" jsonb NOT NULL,
	"reasoning" text,
	"estimated_impact" jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"approved_by" integer,
	"approved_at" timestamp,
	"rejected_by" integer,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"executed_at" timestamp,
	"execution_result" jsonb,
	"execution_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "airtable_address_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"airtable_connection_id" integer NOT NULL,
	"airtable_record_id" varchar(100) NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "airtable_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"base_id" varchar(100) NOT NULL,
	"base_name" varchar(255) NOT NULL,
	"table_id" varchar(100) NOT NULL,
	"table_name" varchar(255) NOT NULL,
	"menu_item_id" integer,
	"is_active" boolean DEFAULT true,
	"sync_enabled" boolean DEFAULT false,
	"last_synced_at" timestamp,
	"table_schema" jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "airtable_record_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"airtable_record_id" varchar(100) NOT NULL,
	"airtable_record_data" jsonb,
	"linked_by" integer NOT NULL,
	"linked_at" timestamp DEFAULT now(),
	"is_synced" boolean DEFAULT true,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "airtable_workflow_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"field_mappings" jsonb NOT NULL,
	"default_assignee_id" integer,
	"default_status" "work_item_status" DEFAULT 'Planning',
	"work_item_type" varchar(100),
	"workflow_steps" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audio_recordings" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"step_id" varchar(100),
	"file_path" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"duration" integer NOT NULL,
	"transcription" text,
	"extracted_data" jsonb,
	"processing_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"processed_at" timestamp,
	"uploaded_by" integer,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookable_task_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"task_category" varchar(50) NOT NULL,
	"access_mode" "booking_access_mode" DEFAULT 'open' NOT NULL,
	"require_customer_account" boolean DEFAULT false,
	"splynx_project_id" integer NOT NULL,
	"splynx_workflow_status_id" integer NOT NULL,
	"splynx_task_type_id" integer,
	"default_assignee_team_id" integer,
	"default_assignee_user_id" integer,
	"fallback_assignee_user_id" integer,
	"default_duration" varchar(50) DEFAULT '2h 30m',
	"default_travel_time_to" integer DEFAULT 15,
	"default_travel_time_from" integer DEFAULT 15,
	"buffer_time_minutes" integer DEFAULT 30,
	"trigger_conditions" jsonb DEFAULT '{}'::jsonb,
	"button_label" varchar(100) NOT NULL,
	"button_color" varchar(20),
	"confirmation_message" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"token" varchar(100) NOT NULL,
	"work_item_id" integer NOT NULL,
	"bookable_task_type_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"customer_email" varchar(255),
	"customer_name" varchar(255),
	"service_address" text,
	"status" varchar(50) DEFAULT 'pending',
	"selected_datetime" timestamp,
	"additional_notes" text,
	"contact_number" varchar(50),
	"splynx_task_id" integer,
	"expires_at" timestamp,
	"confirmed_at" timestamp,
	"redeemed_at" timestamp,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "booking_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"bookable_task_type_id" integer NOT NULL,
	"work_item_id" integer,
	"user_id" integer,
	"customer_id" integer,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(50),
	"service_address" text,
	"status" varchar(50) DEFAULT 'confirmed' NOT NULL,
	"selected_datetime" timestamp NOT NULL,
	"additional_notes" text,
	"splynx_task_id" integer,
	"confirmed_at" timestamp DEFAULT now(),
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cable_fiber_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"cable_id" varchar(255) NOT NULL,
	"node_id" integer NOT NULL,
	"fiber_count" integer NOT NULL,
	"cable_type" "cable_type" DEFAULT 'single_mode' NOT NULL,
	"buffer_tube_count" integer,
	"fibers_per_tube" integer,
	"color_scheme" jsonb DEFAULT '[]'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "check_in_cycle_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_in_cycle_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "participant_role" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "check_in_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"objective_id" integer,
	"team_id" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "check_in_cycle_status" DEFAULT 'Planning' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "check_in_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"scheduled_date" timestamp NOT NULL,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"status" "meeting_status" DEFAULT 'Planning' NOT NULL,
	"meeting_type" varchar(50) DEFAULT 'check_in',
	"agenda" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"rich_notes" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content_data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft',
	"published_at" timestamp,
	"version" integer DEFAULT 1,
	"author_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_item_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"revision_data" jsonb NOT NULL,
	"changed_by" integer,
	"changed_at" timestamp DEFAULT now(),
	"change_note" text
);
--> statement-breakpoint
CREATE TABLE "content_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"type_name" varchar(255) NOT NULL,
	"type_schema" jsonb NOT NULL,
	"display_template" text,
	"api_endpoint" varchar(255),
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"display_label" varchar(255) NOT NULL,
	"field_type" varchar(50) DEFAULT 'text' NOT NULL,
	"description" text,
	"extraction_prompt" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_geocoding_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"splynx_customer_id" varchar(50) NOT NULL,
	"address_hash" varchar(64) NOT NULL,
	"full_address" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"geocode_method" varchar(50),
	"geocode_status" varchar(50),
	"geocode_response" jsonb DEFAULT '{}'::jsonb,
	"geocoded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_id" integer NOT NULL,
	"field_name" varchar(255) NOT NULL,
	"field_type" varchar(100) NOT NULL,
	"nullable" boolean DEFAULT true,
	"default_value" varchar(500),
	"is_pk" boolean DEFAULT false,
	"is_fk" boolean DEFAULT false,
	"index_name" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"from_table" varchar(255) NOT NULL,
	"from_field" varchar(255) NOT NULL,
	"to_table" varchar(255) NOT NULL,
	"to_field" varchar(255) NOT NULL,
	"cardinality" "cardinality" NOT NULL,
	"on_delete" "delete_action" DEFAULT 'no_action' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"table_name" varchar(255) NOT NULL,
	"label" varchar(255),
	"description" text,
	"doc_url" varchar(500),
	"row_count" integer DEFAULT 0,
	"size_bytes" integer DEFAULT 0,
	"last_analyzed" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "database_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"database_type" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"host" varchar(255),
	"port" integer,
	"database" varchar(255),
	"username" varchar(255),
	"password_encrypted" text,
	"schema" varchar(255),
	"connection_string" text,
	"ssl_config" jsonb DEFAULT '{}'::jsonb,
	"pool_config" jsonb DEFAULT '{"min":2,"max":10}'::jsonb NOT NULL,
	"connection_status" varchar(20) DEFAULT 'untested' NOT NULL,
	"last_tested_at" timestamp,
	"last_test_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer,
	"team_id" integer,
	"assigner_id" integer NOT NULL,
	"work_item_id" integer,
	"status" varchar(20) DEFAULT 'assigned' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"due_date" timestamp,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"completion_notes" text,
	"time_spent_minutes" integer,
	"acknowledged_understanding" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_lifecycle" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"lifecycle_status" "lifecycle_status" DEFAULT 'draft',
	"effective_date" date,
	"expiration_date" date,
	"review_date" date,
	"review_cycle_days" integer,
	"last_reviewed_at" timestamp,
	"last_reviewed_by" integer,
	"requires_acknowledgment" boolean DEFAULT false,
	"acknowledgment_count" integer DEFAULT 0,
	"approval_required" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"renewal_work_item_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_doc_lifecycle" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"html_body" text NOT NULL,
	"variables_manifest" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erd_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"layout_data" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_id" integer,
	"author_id" integer,
	"message" text NOT NULL,
	"is_admin_message" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_id" integer,
	"user_id" integer,
	"feedback_type" varchar(50) DEFAULT 'comment',
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'new',
	"upvotes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiber_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"tray_id" integer NOT NULL,
	"node_id" integer NOT NULL,
	"cable_a_id" varchar(255) NOT NULL,
	"cable_a_fiber_number" integer NOT NULL,
	"cable_a_fiber_color" varchar(50) NOT NULL,
	"cable_a_buffer_tube" integer,
	"cable_b_id" varchar(255) NOT NULL,
	"cable_b_fiber_number" integer NOT NULL,
	"cable_b_fiber_color" varchar(50) NOT NULL,
	"cable_b_buffer_tube" integer,
	"splice_loss_db" numeric(5, 2),
	"test_passed" boolean,
	"work_item_id" integer,
	"created_by_user_id" integer NOT NULL,
	"created_via" "created_via" DEFAULT 'manual' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_user_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiber_network_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"tenant_id" integer,
	"user_id" integer NOT NULL,
	"user_name" varchar(255),
	"action_type" "fiber_activity_type" NOT NULL,
	"entity_type" varchar(50) DEFAULT 'fiber_node' NOT NULL,
	"entity_id" integer NOT NULL,
	"changes" jsonb,
	"work_item_id" integer,
	"ip_address" varchar(50),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiber_network_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"tenant_id" integer,
	"name" varchar(255) NOT NULL,
	"node_type" "fiber_node_type" DEFAULT 'chamber' NOT NULL,
	"status" "fiber_node_status" DEFAULT 'active' NOT NULL,
	"network" "fiber_network" DEFAULT 'FibreLtd' NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"what3words" varchar(100),
	"address" text,
	"notes" text,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"fiber_details" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiber_node_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"value" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiber_splice_trays" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"node_id" integer NOT NULL,
	"tray_number" integer NOT NULL,
	"enclosure_type" "splice_enclosure_type" DEFAULT 'dome' NOT NULL,
	"capacity" integer DEFAULT 12 NOT NULL,
	"install_date" timestamp,
	"notes" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiber_terminations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"customer_node_id" integer NOT NULL,
	"source_node_id" integer,
	"cable_id" varchar(255) NOT NULL,
	"cable_identifier" varchar(255),
	"fiber_number" integer NOT NULL,
	"fiber_color" varchar(50),
	"fiber_color_hex" varchar(20),
	"termination_type" varchar(50) DEFAULT 'ont',
	"termination_identifier" varchar(255),
	"service_id" varchar(255),
	"service_name" varchar(255),
	"is_live" boolean DEFAULT false,
	"work_item_id" integer,
	"status" varchar(50) DEFAULT 'active',
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "field_task_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer NOT NULL,
	"task_id" uuid NOT NULL,
	"workflow_template_id" varchar(100),
	"status" "task_execution_status" DEFAULT 'not_started' NOT NULL,
	"current_step_index" integer DEFAULT 0,
	"step_responses" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "field_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer NOT NULL,
	"splynx_task_id" integer,
	"title" varchar(256) NOT NULL,
	"description" text,
	"splynx_task_type" varchar(100),
	"task_type_config_id" integer,
	"app_task_type" "app_task_type",
	"workflow_template_id" varchar(100),
	"status" "field_task_status" DEFAULT 'new' NOT NULL,
	"priority" "field_task_priority" DEFAULT 'medium' NOT NULL,
	"assigned_to_user_id" integer,
	"assigned_to_splynx_id" integer,
	"team_id" integer,
	"project_id" integer,
	"customer_name" varchar(256),
	"customer_id" integer,
	"address" varchar(512),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"scheduled_date" timestamp,
	"scheduled_start_time" time,
	"scheduled_end_time" time,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"completed_at" timestamp,
	"sync_status" "sync_status" DEFAULT 'synced',
	"last_synced_at" timestamp,
	"splynx_last_modified" timestamp,
	"local_last_modified" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_metrics_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"metric_type" varchar(100) NOT NULL,
	"period" varchar(50) NOT NULL,
	"profit_center_id" integer,
	"value" numeric(15, 2) NOT NULL,
	"previous_value" numeric(15, 2),
	"percentage_change" numeric(5, 2),
	"breakdown" jsonb,
	"metadata" jsonb,
	"calculated_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"xero_transaction_id" varchar(255) NOT NULL,
	"xero_transaction_type" "transaction_type" NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"description" text,
	"contact_name" varchar(255),
	"xero_contact_id" varchar(255),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"primary_category" varchar(255),
	"primary_category_name" varchar(255),
	"profit_center_tags" jsonb DEFAULT '[]'::jsonb,
	"categorization_status" "categorization_status" DEFAULT 'uncategorized' NOT NULL,
	"categorized_by" integer,
	"categorized_at" timestamp,
	"ai_suggested_category" varchar(255),
	"ai_confidence_score" numeric(5, 2),
	"splynx_customer_id" varchar(50),
	"splynx_invoice_id" varchar(50),
	"reconciliation_status" "reconciliation_status" DEFAULT 'unmatched' NOT NULL,
	"reconciled_by" integer,
	"reconciled_at" timestamp,
	"notes" text,
	"attachment_url" varchar(500),
	"metadata" jsonb,
	"xero_account_code" varchar(50),
	"xero_account_name" varchar(255),
	"xero_account_type" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"action_key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"http_method" varchar(10) NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"parameter_schema" jsonb DEFAULT '{}'::jsonb,
	"response_schema" jsonb DEFAULT '{}'::jsonb,
	"sample_request" jsonb,
	"sample_response" jsonb,
	"docs_url" varchar(500),
	"auth_scope" varchar(255),
	"resource_type" varchar(100),
	"idempotent" boolean DEFAULT false,
	"side_effects" jsonb DEFAULT '[]'::jsonb,
	"required_fields" jsonb DEFAULT '[]'::jsonb,
	"optional_fields" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"version" varchar(20),
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"trigger_key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"event_type" varchar(50) NOT NULL,
	"webhook_endpoint" varchar(500),
	"payload_schema" jsonb DEFAULT '{}'::jsonb,
	"available_fields" jsonb DEFAULT '[]'::jsonb,
	"configuration" jsonb DEFAULT '{}'::jsonb,
	"parameter_schema" jsonb DEFAULT '{}'::jsonb,
	"response_schema" jsonb DEFAULT '{}'::jsonb,
	"sample_payload" jsonb,
	"docs_url" varchar(500),
	"auth_scope" varchar(255),
	"resource_type" varchar(100),
	"webhook_url" varchar(500),
	"webhook_secret" varchar(100),
	"last_webhook_at" timestamp,
	"webhook_event_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_configured" boolean DEFAULT false NOT NULL,
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_workflow_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"integration_name" varchar(50) NOT NULL,
	"external_task_type" varchar(100) NOT NULL,
	"workflow_template_id" varchar(100),
	"field_mappings" jsonb,
	"auto_sync" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"platform_type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"connection_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credentials_encrypted" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"connection_status" varchar(20) DEFAULT 'disconnected' NOT NULL,
	"last_tested_at" timestamp,
	"test_result" jsonb DEFAULT '{}'::jsonb,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "key_result_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_result_id" integer NOT NULL,
	"meeting_id" integer,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "key_result_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_in_meeting_id" integer NOT NULL,
	"key_result_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"target_value" numeric(12, 2),
	"current_value" numeric(12, 2),
	"status" "key_result_status" NOT NULL,
	"type" "key_result_type" NOT NULL,
	"snapshot_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "key_result_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"key_result_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "key_result_task_status" DEFAULT 'Not Started' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"frequency" varchar(50),
	"frequency_params" jsonb,
	"end_date" timestamp,
	"total_occurrences" integer,
	"team_id" integer,
	"assigned_to" integer,
	"next_due_date" timestamp,
	"last_generated_date" timestamp,
	"generation_status" varchar(20) DEFAULT 'active',
	"completed_count" integer DEFAULT 0 NOT NULL,
	"missed_count" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_completed_date" timestamp,
	"activity_log" jsonb DEFAULT '[]'::jsonb,
	"target_completion" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"objective_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"target_value" numeric(12, 2),
	"current_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"type" "key_result_type" DEFAULT 'Numeric Target' NOT NULL,
	"status" "key_result_status" DEFAULT 'Not Started' NOT NULL,
	"knowledge_document_id" integer,
	"team_id" integer,
	"assigned_to" integer,
	"owner_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(50),
	"icon" varchar(50),
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_document_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_document_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"objective_id" integer,
	"key_result_id" integer,
	"task_id" integer,
	"work_item_id" integer,
	"attached_by" integer NOT NULL,
	"attached_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "knowledge_document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"summary" text,
	"changed_by" integer NOT NULL,
	"change_description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"folder_id" integer,
	"document_type" "knowledge_document_type" DEFAULT 'internal_kb',
	"title" varchar(255) NOT NULL,
	"content" text,
	"summary" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"visibility" "document_visibility" DEFAULT 'internal' NOT NULL,
	"unified_status" "unified_status" DEFAULT 'draft',
	"author_id" integer,
	"estimated_reading_time" integer,
	"metadata" jsonb,
	"completion_points" integer DEFAULT 0,
	"completion_requirement" "knowledge_completion_requirement",
	"quiz_passing_score" integer DEFAULT 70,
	"external_file_url" text,
	"external_file_source" varchar(50),
	"external_file_id" varchar(255),
	"team_id" integer,
	"search_vector" text,
	"ai_embedding" jsonb,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"parent_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"folder_type" "folder_type" DEFAULT 'general',
	"icon" varchar(100),
	"color" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sort_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_folder_slug_per_parent" UNIQUE("organization_id","parent_id","slug")
);
--> statement-breakpoint
CREATE TABLE "layout_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"layout_rules" jsonb NOT NULL,
	"section_templates" jsonb DEFAULT '[]'::jsonb,
	"component_guidelines" jsonb DEFAULT '{}'::jsonb,
	"responsive_breakpoints" jsonb DEFAULT '{}'::jsonb,
	"design_principles" text,
	"code_patterns" jsonb DEFAULT '[]'::jsonb,
	"accessibility" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_global" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"cdn_url" text,
	"file_type" varchar(100),
	"file_size" integer,
	"dimensions" jsonb,
	"alt_text" varchar(500),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"usage_references" jsonb DEFAULT '[]'::jsonb,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'attendee',
	"attendance" varchar(50) DEFAULT 'pending',
	"join_time" timestamp,
	"leave_time" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_item_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"work_item_id" integer,
	"key_result_id" integer,
	"objective_id" integer,
	"update_type" "update_type" NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"notes" text,
	"updated_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0,
	"time_allocated" integer,
	"actual_time" integer,
	"status" varchar(50) DEFAULT 'pending',
	"outcomes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"section_id" integer,
	"page_id" uuid,
	"parent_id" integer,
	"title" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"icon" varchar(100),
	"icon_type" varchar(20) DEFAULT 'lucide',
	"icon_url" text,
	"description" text,
	"order_index" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"is_external" boolean DEFAULT false,
	"open_in_new_tab" boolean DEFAULT false,
	"badge" varchar(50),
	"badge_color" varchar(50),
	"status" varchar(50) DEFAULT 'active',
	"role_permissions" jsonb DEFAULT '[]'::jsonb,
	"custom_permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"icon_type" varchar(20) DEFAULT 'lucide',
	"icon_url" text,
	"order_index" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"is_collapsible" boolean DEFAULT true,
	"is_default_expanded" boolean DEFAULT true,
	"role_permissions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "microsoft_365_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"scopes" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_ms365_connection" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "mind_map_node_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"node_id" varchar(100) NOT NULL,
	"node_type" varchar(50) NOT NULL,
	"position_x" numeric(12, 2) NOT NULL,
	"position_y" numeric(12, 2) NOT NULL,
	"viewport_x" numeric(12, 2),
	"viewport_y" numeric(12, 2),
	"viewport_zoom" numeric(5, 3),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_mindmap_node_per_user" UNIQUE("organization_id","user_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "mission_vision" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"mission" text,
	"vision" text,
	"strategy_statement_html" text,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "mission_vision_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "new_page_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"use_case" text,
	"target_roles" jsonb DEFAULT '[]'::jsonb,
	"org_scope" "org_scope" DEFAULT 'all',
	"org_list" jsonb,
	"functions_expected" jsonb DEFAULT '[]'::jsonb,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"requested_by" integer NOT NULL,
	"approved_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"primary_kpi" varchar(255),
	"calculation_formula" text,
	"last_calculated_at" timestamp,
	"category" varchar(255) DEFAULT 'strategic',
	"priority" varchar(255) DEFAULT 'high',
	"status" "objective_status" DEFAULT 'Draft' NOT NULL,
	"target_value" numeric(12, 2),
	"current_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"kpi_type" "kpi_type" DEFAULT 'Derived from Key Results' NOT NULL,
	"target_date" timestamp,
	"owner_id" integer,
	"is_owner_only" boolean DEFAULT false,
	"team_id" integer,
	"display_order" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "objectives_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_in_cycle_id" integer NOT NULL,
	"objective_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"target_value" numeric,
	"current_value" numeric,
	"progress_percentage" numeric,
	"status" varchar(50),
	"key_results_count" integer DEFAULT 0,
	"key_results_completed" integer DEFAULT 0,
	"snapshot_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"target_roles" jsonb DEFAULT '[]'::jsonb,
	"document_sequence" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"auto_assign_new_users" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"subscription_tier" varchar(50) DEFAULT 'basic',
	"is_active" boolean DEFAULT true,
	"max_users" integer DEFAULT 50,
	"logo_url" varchar(500),
	"square_logo_url" varchar(500),
	"dark_logo_url" varchar(500),
	"dark_square_logo_url" varchar(500),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"address" jsonb,
	"industry" varchar(100),
	"company_size" varchar(50),
	"time_zone" varchar(100) DEFAULT 'UTC',
	"currency" varchar(10) DEFAULT 'USD',
	"subscription_start" timestamp DEFAULT now(),
	"subscription_end" timestamp,
	"billing_email" varchar(255),
	"settings" jsonb,
	"features" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer,
	"slug" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"unified_status" "unified_status" DEFAULT 'draft',
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"build_status" "build_status" DEFAULT 'not_started' NOT NULL,
	"functions" jsonb DEFAULT '[]'::jsonb,
	"is_core_page" boolean DEFAULT false NOT NULL,
	"owner_user_id" integer,
	"page_content" jsonb,
	"theme_overrides" jsonb,
	"layout_template_id" integer,
	"visibility_rules" jsonb DEFAULT '{}'::jsonb,
	"page_metadata" jsonb DEFAULT '{}'::jsonb,
	"component_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "plan_type" NOT NULL,
	"max_users" integer DEFAULT 5 NOT NULL,
	"max_storage_gb" integer DEFAULT 10 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_monthly" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"parent_feature_id" integer,
	"name" varchar(255) NOT NULL,
	"visibility_status" varchar(20) DEFAULT 'draft',
	"is_enabled" boolean DEFAULT false,
	"scope_definition" text,
	"icon" varchar(50),
	"route" varchar(255),
	"overview" text,
	"database_tables" jsonb DEFAULT '{}',
	"user_documentation" text,
	"implementation_details" jsonb DEFAULT '{}',
	"technical_specifications" jsonb DEFAULT '{}',
	"linked_page_ids" jsonb DEFAULT '[]'::jsonb,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"points" integer NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" integer,
	"description" varchar(500),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"parent_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"folder_type" "process_folder_type" DEFAULT 'shared',
	"team_id" integer,
	"icon" varchar(100),
	"color" varchar(50),
	"sort_order" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_process_folder_slug_per_parent" UNIQUE("organization_id","parent_id","slug")
);
--> statement-breakpoint
CREATE TABLE "profit_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"type" "profit_center_type" NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20),
	"xero_tracking_category_id" varchar(255),
	"xero_tracking_option_id" varchar(255),
	"xero_tracking_name" varchar(255),
	"splynx_location_ids" jsonb DEFAULT '[]'::jsonb,
	"service_types" jsonb DEFAULT '[]'::jsonb,
	"customer_segments" jsonb DEFAULT '[]'::jsonb,
	"monthly_budget" numeric(12, 2),
	"xero_account_id" varchar(255),
	"xero_account_code" varchar(50),
	"xero_account_name" varchar(255),
	"linked_okr_type" "okr_link_type",
	"objective_id" integer,
	"key_result_id" integer,
	"key_result_task_id" integer,
	"requires_xero_account" boolean DEFAULT true,
	"parent_profit_center_id" integer,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_report_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer,
	"access_type" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"section_viewed" varchar(255),
	"accessed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_report_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"block_type" "report_block_type" NOT NULL,
	"block_order" integer NOT NULL,
	"content" text,
	"query_config" jsonb DEFAULT '{}'::jsonb,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_report_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"section_order" integer NOT NULL,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_status_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"airtable_record_id" varchar(100) NOT NULL,
	"airtable_connection_id" integer NOT NULL,
	"airtable_fields" jsonb NOT NULL,
	"local_status" varchar(50),
	"local_notes" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splynx_administrators" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"splynx_admin_id" integer NOT NULL,
	"login" varchar(100),
	"full_name" varchar(256),
	"email" varchar(256),
	"partner_id" integer,
	"role" varchar(100),
	"is_active" boolean DEFAULT true,
	"last_fetched_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "splynx_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"splynx_location_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"location_type" varchar(100),
	"default_lat" numeric(10, 7),
	"default_lng" numeric(10, 7),
	"last_synced_at" timestamp,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sql_direct_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"query" text NOT NULL,
	"parameters" text,
	"execution_time" integer NOT NULL,
	"row_count" integer NOT NULL,
	"success" boolean NOT NULL,
	"error" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"cron_enabled" boolean DEFAULT true NOT NULL,
	"cron_schedule" varchar(255) DEFAULT '0 2 * * *',
	"lookahead_days" integer DEFAULT 7 NOT NULL,
	"last_cron_execution" timestamp,
	"auto_generate_work_items" boolean DEFAULT true NOT NULL,
	"generate_on_task_creation" boolean DEFAULT true NOT NULL,
	"notify_on_generation" boolean DEFAULT false NOT NULL,
	"notify_email_recipients" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp DEFAULT now(),
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"entity_type" "sync_entity_type" NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"operation" "sync_operation" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "sync_queue_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_error" text,
	"last_attempt_at" timestamp,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tariff_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"airtable_record_id" varchar(100) NOT NULL,
	"airtable_connection_id" integer NOT NULL,
	"airtable_fields" jsonb NOT NULL,
	"local_status" varchar(50),
	"local_notes" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"splynx_checklist_id" integer,
	"items" jsonb NOT NULL,
	"completed_count" integer DEFAULT 0,
	"total_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_type_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"splynx_type_id" varchar(100) NOT NULL,
	"splynx_type_name" varchar(256),
	"app_task_type" "app_task_type" NOT NULL,
	"workflow_template_id" varchar(100),
	"display_name" varchar(256),
	"color" varchar(7) DEFAULT '#3b82f6',
	"icon_name" varchar(50) DEFAULT 'FileText',
	"estimated_duration_minutes" integer DEFAULT 60,
	"requires_signature" boolean DEFAULT false,
	"requires_photos" boolean DEFAULT false,
	"requires_customer_present" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"show_in_mobile_app" boolean DEFAULT true,
	"default_priority" "field_task_priority" DEFAULT 'medium',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"meeting_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"overall_rating" varchar(10),
	"items_for_next_check_in" text,
	"completed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "team_role" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"default_cadence" "default_cadence" DEFAULT 'weekly' NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"cadence" "default_cadence" DEFAULT 'weekly' NOT NULL,
	"weekly_weekday" "weekday" DEFAULT 'mon',
	"monthly_rule_type" "monthly_rule_type" DEFAULT 'nth_weekday',
	"monthly_nth" "nth" DEFAULT '1',
	"monthly_weekday" "weekday" DEFAULT 'mon',
	"monthly_day_of_month" integer DEFAULT 1,
	"period_rule_type" "period_rule_type" DEFAULT 'nth_weekday',
	"period_nth" "nth" DEFAULT '1',
	"period_weekday" "weekday" DEFAULT 'mon',
	"default_meeting_length_minutes" "meeting_length" DEFAULT '15',
	"meeting_time" time DEFAULT '09:00' NOT NULL,
	"meeting_anchor_dow" smallint,
	"meeting_anchor_week_of_month" smallint,
	"meeting_anchor_day_of_month" smallint,
	"meeting_anchor_month" smallint,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer NOT NULL,
	"db_host" varchar(255) NOT NULL,
	"db_name" varchar(255) NOT NULL,
	"db_user" varchar(255) NOT NULL,
	"db_password_encrypted" varchar(500) NOT NULL,
	"db_port" integer DEFAULT 5432 NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"status" "tenant_status" DEFAULT 'provisioning' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "theme_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"light_theme" jsonb,
	"dark_theme" jsonb,
	"brand_settings" jsonb,
	"layout_settings" jsonb,
	"active_theme" varchar(10) DEFAULT 'light',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_draft_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"original_draft" text NOT NULL,
	"final_response" text,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edit_percentage" numeric(5, 2),
	"sections_edited" jsonb DEFAULT '[]'::jsonb,
	"sent_at" timestamp,
	"sent_by" integer,
	"regeneration_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_module_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"step_type" "training_step_type" NOT NULL,
	"content" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"required" boolean DEFAULT true,
	"estimated_minutes" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"assignment_id" integer,
	"current_step_id" integer,
	"status" varchar(50) DEFAULT 'not_started',
	"started_at" timestamp,
	"completed_at" timestamp,
	"total_time_seconds" integer DEFAULT 0,
	"quiz_score" numeric(5, 2),
	"quiz_points_earned" integer DEFAULT 0,
	"quiz_attempts" integer DEFAULT 0,
	"step_completions" jsonb DEFAULT '{}'::jsonb,
	"certificate_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_training_progress" UNIQUE("document_id","user_id","assignment_id")
);
--> statement-breakpoint
CREATE TABLE "training_quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"step_id" integer NOT NULL,
	"question_order" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_type" varchar(50) NOT NULL,
	"options" jsonb,
	"correct_answer" text,
	"explanation" text,
	"points" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_onboarding_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress',
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"progress" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"total_points" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_points" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" "user_status_type" DEFAULT 'offline',
	"status_message" varchar(255),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_status" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"username" varchar(255) NOT NULL,
	"passwordHash" varchar(255),
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'team_member',
	"user_type" "user_type" DEFAULT 'human' NOT NULL,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true,
	"is_email_verified" boolean DEFAULT false,
	"invitation_accepted" boolean DEFAULT false,
	"last_login_at" timestamp,
	"customer_id" integer,
	"splynx_admin_id" integer,
	"splynx_customer_id" integer,
	"full_name" varchar(255),
	"phone" varchar(50),
	"address" varchar(255),
	"city" varchar(100),
	"postcode" varchar(20),
	"can_assign_tickets" boolean DEFAULT false,
	"firebase_uid" varchar(255),
	"vapi_api_key" varchar(255),
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar(255),
	"avatar_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vapi_assistants" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"vapi_assistant_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"role" varchar(100),
	"description" text,
	"system_prompt" text,
	"model_provider" varchar(50) DEFAULT 'openai',
	"model_name" varchar(100) DEFAULT 'gpt-4',
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"voice_provider" varchar(50),
	"voice_id" varchar(255),
	"first_message" text,
	"tools_config" jsonb DEFAULT '[]'::jsonb,
	"knowledge_base_ids" jsonb DEFAULT '[]'::jsonb,
	"max_duration_seconds" integer DEFAULT 300,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vapi_assistants_vapi_assistant_id_unique" UNIQUE("vapi_assistant_id")
);
--> statement-breakpoint
CREATE TABLE "vapi_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"vapi_call_id" varchar(255) NOT NULL,
	"assistant_id" varchar(255),
	"phone_number_id" varchar(255),
	"customer_phone_number" varchar(50),
	"customer_name" varchar(255),
	"customer_id" integer,
	"status" "vapi_call_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_seconds" integer,
	"end_reason" "vapi_end_reason",
	"was_autonomous" boolean DEFAULT false,
	"was_forwarded" boolean DEFAULT false,
	"forwarded_to" varchar(100),
	"transcript" text,
	"summary" text,
	"customer_intent" varchar(100),
	"sentiment_score" numeric(3, 2),
	"sms_code_sent" boolean DEFAULT false,
	"sms_code_verified" boolean DEFAULT false,
	"sms_verification_attempts" integer DEFAULT 0,
	"ticket_created" boolean DEFAULT false,
	"ticket_id" varchar(100),
	"demo_scheduled" boolean DEFAULT false,
	"demo_scheduled_for" timestamp,
	"callback_scheduled" boolean DEFAULT false,
	"callback_scheduled_for" timestamp,
	"work_item_ids" jsonb DEFAULT '[]'::jsonb,
	"knowledge_files_used" jsonb DEFAULT '[]'::jsonb,
	"knowledge_gaps" jsonb DEFAULT '[]'::jsonb,
	"cost_cents" integer,
	"raw_call_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vapi_calls_vapi_call_id_unique" UNIQUE("vapi_call_id")
);
--> statement-breakpoint
CREATE TABLE "vapi_knowledge_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"vapi_file_id" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(50),
	"file_size" integer,
	"category" varchar(100),
	"description" text,
	"times_used" integer DEFAULT 0,
	"last_used_at" timestamp,
	"knowledge_document_id" integer,
	"is_active" boolean DEFAULT true,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vapi_knowledge_files_vapi_file_id_unique" UNIQUE("vapi_file_id")
);
--> statement-breakpoint
CREATE TABLE "vehicle_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"check_date" date NOT NULL,
	"vehicle_id" varchar(100),
	"items" jsonb NOT NULL,
	"overall_status" "vehicle_check_status" DEFAULT 'incomplete',
	"photos" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visit_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"workflow_type" varchar(100),
	"steps" jsonb NOT NULL,
	"current_step_index" integer DEFAULT 0,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"signatures" jsonb DEFAULT '[]'::jsonb,
	"notes" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"integration_id" integer NOT NULL,
	"trigger_id" integer,
	"trigger_key" varchar(100) NOT NULL,
	"event_id" varchar(255),
	"payload" jsonb NOT NULL,
	"headers" jsonb,
	"method" varchar(10) DEFAULT 'POST',
	"user_agent" varchar(500),
	"source_ip" varchar(45),
	"verified" boolean DEFAULT false,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"error_message" text,
	"workflow_triggered" boolean DEFAULT false,
	"workflow_run_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "website_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"meta_description" text,
	"html_content" text,
	"css_overrides" text,
	"brand_colors" jsonb DEFAULT '{}'::jsonb,
	"images" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'draft',
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"group_name" varchar(255),
	"sender_phone" varchar(50) NOT NULL,
	"sender_name" varchar(255),
	"matched_user_id" integer,
	"message_type" varchar(50) DEFAULT 'text',
	"text_content" text,
	"media_url" text,
	"whatsapp_timestamp" timestamp NOT NULL,
	"received_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_item_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"source_table" varchar(100) NOT NULL,
	"source_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_item_workflow_execution_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"execution_id" integer NOT NULL,
	"step_index" integer NOT NULL,
	"step_title" varchar(255) NOT NULL,
	"step_description" text,
	"status" "task_execution_status" DEFAULT 'not_started' NOT NULL,
	"completed_at" timestamp,
	"completed_by" integer,
	"notes" text,
	"evidence" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_item_workflow_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"workflow_template_id" varchar(100),
	"status" "task_execution_status" DEFAULT 'not_started' NOT NULL,
	"current_step_id" varchar(100),
	"execution_data" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"team_id" integer,
	"key_result_task_id" integer,
	"check_in_cycle_id" integer,
	"target_meeting_id" integer,
	"status" "work_item_status" DEFAULT 'Planning' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"notes" text,
	"due_date" date,
	"owner_id" integer,
	"assigned_to" integer,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"workflow_template_id" varchar(100),
	"workflow_source" varchar(50),
	"workflow_metadata" jsonb,
	"work_item_type" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "work_items_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_in_cycle_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "work_item_status" NOT NULL,
	"due_date" date,
	"owner_id" integer,
	"assigned_to" integer,
	"key_result_task_id" integer,
	"snapshot_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_step_extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"work_item_id" integer NOT NULL,
	"step_id" integer NOT NULL,
	"extracted_data" jsonb NOT NULL,
	"confidence" integer,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"model" varchar(100),
	"tokens_used" integer,
	"processing_time_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"category" varchar(100),
	"applicable_types" text[] DEFAULT '{"work_item"}' NOT NULL,
	"steps" jsonb NOT NULL,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"is_system_template" boolean DEFAULT false,
	"estimated_minutes" integer,
	"display_in_menu" boolean DEFAULT false,
	"menu_label" varchar(100),
	"menu_icon" varchar(50),
	"menu_order" integer DEFAULT 999,
	"default_filters" jsonb,
	"table_columns" jsonb,
	"completion_callbacks" jsonb,
	"team_id" integer,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "xero_chart_of_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"xero_account_id" varchar(255) NOT NULL,
	"account_code" varchar(50) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"account_class" varchar(50),
	"tax_type" varchar(100),
	"status" varchar(20) DEFAULT 'ACTIVE',
	"description" text,
	"system_account" varchar(100),
	"enable_payments_to_account" boolean DEFAULT false,
	"show_in_expense_claims" boolean DEFAULT false,
	"bank_account_number" varchar(50),
	"currency_code" varchar(3) DEFAULT 'GBP',
	"reporting_code" varchar(50),
	"reporting_code_name" varchar(255),
	"metadata" jsonb,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "xero_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"records_synced" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"total_records_to_sync" integer DEFAULT 0,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(50) NOT NULL,
	"triggered_by" integer,
	"trigger_type" varchar(50) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "xero_sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"last_sync_at" timestamp,
	"last_successful_sync_at" timestamp,
	"next_sync_at" timestamp,
	"records_synced" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"total_records_to_sync" integer DEFAULT 0,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"last_progress_at" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_records" ADD CONSTRAINT "address_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_records" ADD CONSTRAINT "address_records_airtable_connection_id_airtable_connections_id_fk" FOREIGN KEY ("airtable_connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_sync_logs" ADD CONSTRAINT "address_sync_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_sync_logs" ADD CONSTRAINT "address_sync_logs_airtable_connection_id_airtable_connections_id_fk" FOREIGN KEY ("airtable_connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_sync_logs" ADD CONSTRAINT "address_sync_logs_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_runs" ADD CONSTRAINT "agent_workflow_runs_workflow_id_agent_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_schedules" ADD CONSTRAINT "agent_workflow_schedules_workflow_id_agent_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_schedules" ADD CONSTRAINT "agent_workflow_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_target_key_result_id_key_results_id_fk" FOREIGN KEY ("target_key_result_id") REFERENCES "public"."key_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_target_objective_id_objectives_id_fk" FOREIGN KEY ("target_objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_configurations" ADD CONSTRAINT "ai_agent_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_configurations" ADD CONSTRAINT "ai_agent_configurations_agent_workflow_id_agent_workflows_id_fk" FOREIGN KEY ("agent_workflow_id") REFERENCES "public"."agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_configurations" ADD CONSTRAINT "ai_agent_configurations_linked_objective_id_objectives_id_fk" FOREIGN KEY ("linked_objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_configurations" ADD CONSTRAINT "ai_agent_configurations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_config" ADD CONSTRAINT "ai_assistant_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_config" ADD CONSTRAINT "ai_assistant_config_instruction_document_id_knowledge_documents_id_fk" FOREIGN KEY ("instruction_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_functions" ADD CONSTRAINT "ai_assistant_functions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_functions" ADD CONSTRAINT "ai_assistant_functions_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_functions" ADD CONSTRAINT "ai_assistant_functions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_attachments" ADD CONSTRAINT "ai_chat_attachments_message_id_ai_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_attachments" ADD CONSTRAINT "ai_chat_attachments_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_attachments" ADD CONSTRAINT "ai_chat_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_performance" ADD CONSTRAINT "ai_chat_performance_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_performance" ADD CONSTRAINT "ai_chat_performance_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_generations" ADD CONSTRAINT "ai_content_generations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_generations" ADD CONSTRAINT "ai_content_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_generations" ADD CONSTRAINT "ai_content_generations_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_generations" ADD CONSTRAINT "ai_content_generations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_document_embeddings" ADD CONSTRAINT "ai_document_embeddings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_permissions" ADD CONSTRAINT "ai_function_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_permissions" ADD CONSTRAINT "ai_function_permissions_function_id_ai_assistant_functions_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."ai_assistant_functions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_permissions" ADD CONSTRAINT "ai_function_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_permissions" ADD CONSTRAINT "ai_function_permissions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_permissions" ADD CONSTRAINT "ai_function_permissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_usage_logs" ADD CONSTRAINT "ai_function_usage_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_usage_logs" ADD CONSTRAINT "ai_function_usage_logs_function_id_ai_assistant_functions_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."ai_assistant_functions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_usage_logs" ADD CONSTRAINT "ai_function_usage_logs_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_usage_logs" ADD CONSTRAINT "ai_function_usage_logs_message_id_ai_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_chat_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_function_usage_logs" ADD CONSTRAINT "ai_function_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposed_actions" ADD CONSTRAINT "ai_proposed_actions_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposed_actions" ADD CONSTRAINT "ai_proposed_actions_message_id_ai_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposed_actions" ADD CONSTRAINT "ai_proposed_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposed_actions" ADD CONSTRAINT "ai_proposed_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposed_actions" ADD CONSTRAINT "ai_proposed_actions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposed_actions" ADD CONSTRAINT "ai_proposed_actions_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_address_snapshots" ADD CONSTRAINT "airtable_address_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_address_snapshots" ADD CONSTRAINT "airtable_address_snapshots_airtable_connection_id_airtable_connections_id_fk" FOREIGN KEY ("airtable_connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_connections" ADD CONSTRAINT "airtable_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_connections" ADD CONSTRAINT "airtable_connections_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_connections" ADD CONSTRAINT "airtable_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_record_links" ADD CONSTRAINT "airtable_record_links_connection_id_airtable_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_record_links" ADD CONSTRAINT "airtable_record_links_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_record_links" ADD CONSTRAINT "airtable_record_links_linked_by_users_id_fk" FOREIGN KEY ("linked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_workflow_templates" ADD CONSTRAINT "airtable_workflow_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_workflow_templates" ADD CONSTRAINT "airtable_workflow_templates_connection_id_airtable_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_workflow_templates" ADD CONSTRAINT "airtable_workflow_templates_default_assignee_id_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airtable_workflow_templates" ADD CONSTRAINT "airtable_workflow_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_recordings" ADD CONSTRAINT "audio_recordings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_recordings" ADD CONSTRAINT "audio_recordings_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_recordings" ADD CONSTRAINT "audio_recordings_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookable_task_types" ADD CONSTRAINT "bookable_task_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tokens" ADD CONSTRAINT "booking_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tokens" ADD CONSTRAINT "booking_tokens_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tokens" ADD CONSTRAINT "booking_tokens_bookable_task_type_id_bookable_task_types_id_fk" FOREIGN KEY ("bookable_task_type_id") REFERENCES "public"."bookable_task_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bookable_task_type_id_bookable_task_types_id_fk" FOREIGN KEY ("bookable_task_type_id") REFERENCES "public"."bookable_task_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cable_fiber_definitions" ADD CONSTRAINT "cable_fiber_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cable_fiber_definitions" ADD CONSTRAINT "cable_fiber_definitions_node_id_fiber_network_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."fiber_network_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cable_fiber_definitions" ADD CONSTRAINT "cable_fiber_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_cycle_participants" ADD CONSTRAINT "check_in_cycle_participants_check_in_cycle_id_check_in_cycles_id_fk" FOREIGN KEY ("check_in_cycle_id") REFERENCES "public"."check_in_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_cycle_participants" ADD CONSTRAINT "check_in_cycle_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_cycles" ADD CONSTRAINT "check_in_cycles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_cycles" ADD CONSTRAINT "check_in_cycles_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_cycles" ADD CONSTRAINT "check_in_cycles_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_meetings" ADD CONSTRAINT "check_in_meetings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_meetings" ADD CONSTRAINT "check_in_meetings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_meetings" ADD CONSTRAINT "check_in_meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_types" ADD CONSTRAINT "content_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_geocoding_cache" ADD CONSTRAINT "customer_geocoding_cache_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_fields" ADD CONSTRAINT "data_fields_table_id_data_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."data_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_relationships" ADD CONSTRAINT "data_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_connections" ADD CONSTRAINT "database_connections_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_connections" ADD CONSTRAINT "database_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_assignments" ADD CONSTRAINT "document_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_assignments" ADD CONSTRAINT "document_assignments_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_assignments" ADD CONSTRAINT "document_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_assignments" ADD CONSTRAINT "document_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_assignments" ADD CONSTRAINT "document_assignments_assigner_id_users_id_fk" FOREIGN KEY ("assigner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_assignments" ADD CONSTRAINT "document_assignments_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_lifecycle" ADD CONSTRAINT "document_lifecycle_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_lifecycle" ADD CONSTRAINT "document_lifecycle_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_lifecycle" ADD CONSTRAINT "document_lifecycle_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_lifecycle" ADD CONSTRAINT "document_lifecycle_renewal_work_item_id_work_items_id_fk" FOREIGN KEY ("renewal_work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erd_layouts" ADD CONSTRAINT "erd_layouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erd_layouts" ADD CONSTRAINT "erd_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_comments" ADD CONSTRAINT "feature_comments_feature_id_platform_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."platform_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_comments" ADD CONSTRAINT "feature_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_feedback" ADD CONSTRAINT "feature_feedback_feature_id_platform_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."platform_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_feedback" ADD CONSTRAINT "feature_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_connections" ADD CONSTRAINT "fiber_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_connections" ADD CONSTRAINT "fiber_connections_tray_id_fiber_splice_trays_id_fk" FOREIGN KEY ("tray_id") REFERENCES "public"."fiber_splice_trays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_connections" ADD CONSTRAINT "fiber_connections_node_id_fiber_network_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."fiber_network_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_connections" ADD CONSTRAINT "fiber_connections_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_connections" ADD CONSTRAINT "fiber_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_connections" ADD CONSTRAINT "fiber_connections_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_network_activity_logs" ADD CONSTRAINT "fiber_network_activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_network_activity_logs" ADD CONSTRAINT "fiber_network_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_network_activity_logs" ADD CONSTRAINT "fiber_network_activity_logs_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_network_nodes" ADD CONSTRAINT "fiber_network_nodes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_network_nodes" ADD CONSTRAINT "fiber_network_nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_network_nodes" ADD CONSTRAINT "fiber_network_nodes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_node_types" ADD CONSTRAINT "fiber_node_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_node_types" ADD CONSTRAINT "fiber_node_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_splice_trays" ADD CONSTRAINT "fiber_splice_trays_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_splice_trays" ADD CONSTRAINT "fiber_splice_trays_node_id_fiber_network_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."fiber_network_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_splice_trays" ADD CONSTRAINT "fiber_splice_trays_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_splice_trays" ADD CONSTRAINT "fiber_splice_trays_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_terminations" ADD CONSTRAINT "fiber_terminations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_terminations" ADD CONSTRAINT "fiber_terminations_customer_node_id_fiber_network_nodes_id_fk" FOREIGN KEY ("customer_node_id") REFERENCES "public"."fiber_network_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_terminations" ADD CONSTRAINT "fiber_terminations_source_node_id_fiber_network_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."fiber_network_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_terminations" ADD CONSTRAINT "fiber_terminations_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiber_terminations" ADD CONSTRAINT "fiber_terminations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_task_executions" ADD CONSTRAINT "field_task_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_task_executions" ADD CONSTRAINT "field_task_executions_task_id_field_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."field_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_task_type_config_id_task_type_configurations_id_fk" FOREIGN KEY ("task_type_config_id") REFERENCES "public"."task_type_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_metrics_cache" ADD CONSTRAINT "financial_metrics_cache_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_metrics_cache" ADD CONSTRAINT "financial_metrics_cache_profit_center_id_profit_centers_id_fk" FOREIGN KEY ("profit_center_id") REFERENCES "public"."profit_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_categorized_by_users_id_fk" FOREIGN KEY ("categorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_actions" ADD CONSTRAINT "integration_actions_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_triggers" ADD CONSTRAINT "integration_triggers_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_workflow_mappings" ADD CONSTRAINT "integration_workflow_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_comments" ADD CONSTRAINT "key_result_comments_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_comments" ADD CONSTRAINT "key_result_comments_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_comments" ADD CONSTRAINT "key_result_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_snapshots" ADD CONSTRAINT "key_result_snapshots_check_in_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("check_in_meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_snapshots" ADD CONSTRAINT "key_result_snapshots_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_knowledge_document_id_knowledge_documents_id_fk" FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_categories" ADD CONSTRAINT "knowledge_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_categories" ADD CONSTRAINT "knowledge_categories_parent_id_knowledge_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_activity" ADD CONSTRAINT "knowledge_document_activity_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_activity" ADD CONSTRAINT "knowledge_document_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_attachments" ADD CONSTRAINT "knowledge_document_attachments_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_attachments" ADD CONSTRAINT "knowledge_document_attachments_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_attachments" ADD CONSTRAINT "knowledge_document_attachments_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_attachments" ADD CONSTRAINT "knowledge_document_attachments_task_id_key_result_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."key_result_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_attachments" ADD CONSTRAINT "knowledge_document_attachments_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_attachments" ADD CONSTRAINT "knowledge_document_attachments_attached_by_users_id_fk" FOREIGN KEY ("attached_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "knowledge_document_versions_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "knowledge_document_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_folders" ADD CONSTRAINT "knowledge_folders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_folders" ADD CONSTRAINT "knowledge_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_templates" ADD CONSTRAINT "layout_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_templates" ADD CONSTRAINT "layout_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_templates" ADD CONSTRAINT "layout_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_library" ADD CONSTRAINT "media_library_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_library" ADD CONSTRAINT "media_library_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_item_updates" ADD CONSTRAINT "meeting_item_updates_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_item_updates" ADD CONSTRAINT "meeting_item_updates_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_item_updates" ADD CONSTRAINT "meeting_item_updates_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_item_updates" ADD CONSTRAINT "meeting_item_updates_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_item_updates" ADD CONSTRAINT "meeting_item_updates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_topics" ADD CONSTRAINT "meeting_topics_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_365_connections" ADD CONSTRAINT "microsoft_365_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_365_connections" ADD CONSTRAINT "microsoft_365_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mind_map_node_positions" ADD CONSTRAINT "mind_map_node_positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mind_map_node_positions" ADD CONSTRAINT "mind_map_node_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_vision" ADD CONSTRAINT "mission_vision_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_vision" ADD CONSTRAINT "mission_vision_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_page_requests" ADD CONSTRAINT "new_page_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_page_requests" ADD CONSTRAINT "new_page_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_page_requests" ADD CONSTRAINT "new_page_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives_snapshots" ADD CONSTRAINT "objectives_snapshots_check_in_cycle_id_check_in_cycles_id_fk" FOREIGN KEY ("check_in_cycle_id") REFERENCES "public"."check_in_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives_snapshots" ADD CONSTRAINT "objectives_snapshots_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_layout_template_id_layout_templates_id_fk" FOREIGN KEY ("layout_template_id") REFERENCES "public"."layout_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_features" ADD CONSTRAINT "platform_features_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_features" ADD CONSTRAINT "platform_features_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_features" ADD CONSTRAINT "platform_features_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_folders" ADD CONSTRAINT "process_folders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_folders" ADD CONSTRAINT "process_folders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_folders" ADD CONSTRAINT "process_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_centers" ADD CONSTRAINT "profit_centers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_centers" ADD CONSTRAINT "profit_centers_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_centers" ADD CONSTRAINT "profit_centers_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_centers" ADD CONSTRAINT "profit_centers_key_result_task_id_key_result_tasks_id_fk" FOREIGN KEY ("key_result_task_id") REFERENCES "public"."key_result_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_centers" ADD CONSTRAINT "profit_centers_parent_profit_center_id_profit_centers_id_fk" FOREIGN KEY ("parent_profit_center_id") REFERENCES "public"."profit_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_centers" ADD CONSTRAINT "profit_centers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_report_access_log" ADD CONSTRAINT "public_report_access_log_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_report_access_log" ADD CONSTRAINT "public_report_access_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_report_blocks" ADD CONSTRAINT "public_report_blocks_section_id_public_report_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."public_report_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_report_sections" ADD CONSTRAINT "public_report_sections_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_status_records" ADD CONSTRAINT "rag_status_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_status_records" ADD CONSTRAINT "rag_status_records_airtable_connection_id_airtable_connections_id_fk" FOREIGN KEY ("airtable_connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splynx_administrators" ADD CONSTRAINT "splynx_administrators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splynx_locations" ADD CONSTRAINT "splynx_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sql_direct_audit_logs" ADD CONSTRAINT "sql_direct_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_settings" ADD CONSTRAINT "strategy_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_settings" ADD CONSTRAINT "strategy_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_queue" ADD CONSTRAINT "sync_queue_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_queue" ADD CONSTRAINT "sync_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_records" ADD CONSTRAINT "tariff_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_records" ADD CONSTRAINT "tariff_records_airtable_connection_id_airtable_connections_id_fk" FOREIGN KEY ("airtable_connection_id") REFERENCES "public"."airtable_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_task_id_field_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."field_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_type_configurations" ADD CONSTRAINT "task_type_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_feedback" ADD CONSTRAINT "team_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_feedback" ADD CONSTRAINT "team_feedback_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_feedback" ADD CONSTRAINT "team_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_settings" ADD CONSTRAINT "theme_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_draft_responses" ADD CONSTRAINT "ticket_draft_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_draft_responses" ADD CONSTRAINT "ticket_draft_responses_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_draft_responses" ADD CONSTRAINT "ticket_draft_responses_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_module_steps" ADD CONSTRAINT "training_module_steps_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_assignment_id_document_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."document_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_current_step_id_training_module_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."training_module_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_quiz_questions" ADD CONSTRAINT "training_quiz_questions_step_id_training_module_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."training_module_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "user_onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "user_onboarding_progress_plan_id_onboarding_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."onboarding_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_status" ADD CONSTRAINT "user_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_assistants" ADD CONSTRAINT "vapi_assistants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_calls" ADD CONSTRAINT "vapi_calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_knowledge_files" ADD CONSTRAINT "vapi_knowledge_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_knowledge_files" ADD CONSTRAINT "vapi_knowledge_files_knowledge_document_id_knowledge_documents_id_fk" FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_knowledge_files" ADD CONSTRAINT "vapi_knowledge_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checks" ADD CONSTRAINT "vehicle_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checks" ADD CONSTRAINT "vehicle_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_workflows" ADD CONSTRAINT "visit_workflows_task_id_field_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."field_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_trigger_id_integration_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."integration_triggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_workflow_run_id_agent_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."agent_workflow_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_pages" ADD CONSTRAINT "website_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_matched_user_id_users_id_fk" FOREIGN KEY ("matched_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_sources" ADD CONSTRAINT "work_item_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_sources" ADD CONSTRAINT "work_item_sources_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_workflow_execution_steps" ADD CONSTRAINT "work_item_workflow_execution_steps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_workflow_execution_steps" ADD CONSTRAINT "work_item_workflow_execution_steps_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_workflow_execution_steps" ADD CONSTRAINT "work_item_workflow_execution_steps_execution_id_work_item_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."work_item_workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_workflow_execution_steps" ADD CONSTRAINT "work_item_workflow_execution_steps_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_workflow_executions" ADD CONSTRAINT "work_item_workflow_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_workflow_executions" ADD CONSTRAINT "work_item_workflow_executions_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_key_result_task_id_key_result_tasks_id_fk" FOREIGN KEY ("key_result_task_id") REFERENCES "public"."key_result_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_check_in_cycle_id_check_in_cycles_id_fk" FOREIGN KEY ("check_in_cycle_id") REFERENCES "public"."check_in_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_target_meeting_id_check_in_meetings_id_fk" FOREIGN KEY ("target_meeting_id") REFERENCES "public"."check_in_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items_snapshots" ADD CONSTRAINT "work_items_snapshots_check_in_cycle_id_check_in_cycles_id_fk" FOREIGN KEY ("check_in_cycle_id") REFERENCES "public"."check_in_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items_snapshots" ADD CONSTRAINT "work_items_snapshots_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items_snapshots" ADD CONSTRAINT "work_items_snapshots_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items_snapshots" ADD CONSTRAINT "work_items_snapshots_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items_snapshots" ADD CONSTRAINT "work_items_snapshots_key_result_task_id_key_result_tasks_id_fk" FOREIGN KEY ("key_result_task_id") REFERENCES "public"."key_result_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_extractions" ADD CONSTRAINT "workflow_step_extractions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_extractions" ADD CONSTRAINT "workflow_step_extractions_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_extractions" ADD CONSTRAINT "workflow_step_extractions_step_id_work_item_workflow_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."work_item_workflow_execution_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_chart_of_accounts" ADD CONSTRAINT "xero_chart_of_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_sync_logs" ADD CONSTRAINT "xero_sync_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_sync_logs" ADD CONSTRAINT "xero_sync_logs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_sync_status" ADD CONSTRAINT "xero_sync_status_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_feed_org" ON "activity_feed" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_activity_feed_created" ON "activity_feed" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activity_feed_type" ON "activity_feed" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_org" ON "activity_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_user" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_entity" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created" ON "activity_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_address_org" ON "address_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_address_airtable_record" ON "address_records" USING btree ("airtable_record_id");--> statement-breakpoint
CREATE INDEX "idx_address_connection" ON "address_records" USING btree ("airtable_connection_id");--> statement-breakpoint
CREATE INDEX "idx_address_postcode" ON "address_records" USING btree ("postcode");--> statement-breakpoint
CREATE INDEX "idx_address_network" ON "address_records" USING btree ("network");--> statement-breakpoint
CREATE INDEX "idx_sync_log_org" ON "address_sync_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sync_log_connection" ON "address_sync_logs" USING btree ("airtable_connection_id");--> statement-breakpoint
CREATE INDEX "idx_sync_log_started" ON "address_sync_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_addresses_org" ON "addresses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_customer" ON "addresses" USING btree ("splynx_customer_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_postcode" ON "addresses" USING btree ("postcode");--> statement-breakpoint
CREATE INDEX "idx_addresses_active" ON "addresses" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_workflow_runs_workflow" ON "agent_workflow_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_runs_status" ON "agent_workflow_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_runs_started" ON "agent_workflow_runs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_workflow_schedules_workflow" ON "agent_workflow_schedules" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_schedules_organization" ON "agent_workflow_schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_schedules_next_run" ON "agent_workflow_schedules" USING btree ("next_run_at") WHERE "agent_workflow_schedules"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_agent_workflows_org" ON "agent_workflows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_agent_workflows_enabled" ON "agent_workflows" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_agent_workflows_webhook" ON "agent_workflows" USING btree ("webhook_token");--> statement-breakpoint
CREATE INDEX "idx_agent_workflows_assigned_user" ON "agent_workflows" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_workflows_team" ON "agent_workflows" USING btree ("assigned_team_id");--> statement-breakpoint
CREATE INDEX "idx_agent_workflows_folder" ON "agent_workflows" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_ai_configs_org" ON "ai_agent_configurations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_configs_workflow" ON "ai_agent_configurations" USING btree ("agent_workflow_id");--> statement-breakpoint
CREATE INDEX "idx_ai_configs_objective" ON "ai_agent_configurations" USING btree ("linked_objective_id");--> statement-breakpoint
CREATE INDEX "ai_assistant_config_org_idx" ON "ai_assistant_config" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_assistant_functions_org_func_idx" ON "ai_assistant_functions" USING btree ("organization_id","function_name");--> statement-breakpoint
CREATE INDEX "ai_assistant_functions_category_idx" ON "ai_assistant_functions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_assistant_functions_enabled_idx" ON "ai_assistant_functions" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "ai_chat_attachments_message_idx" ON "ai_chat_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_chat_attachments_session_idx" ON "ai_chat_attachments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_chat_messages_session_idx" ON "ai_chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_chat_messages_role_idx" ON "ai_chat_messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "ai_chat_performance_session_idx" ON "ai_chat_performance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_chat_performance_org_idx" ON "ai_chat_performance" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_org_idx" ON "ai_chat_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_user_idx" ON "ai_chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_status_idx" ON "ai_chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_gen_org" ON "ai_content_generations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_gen_user" ON "ai_content_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_gen_doc" ON "ai_content_generations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_ai_gen_status" ON "ai_content_generations" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "ai_document_embeddings_source_idx" ON "ai_document_embeddings" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "ai_document_embeddings_org_idx" ON "ai_document_embeddings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_function_permissions_func_idx" ON "ai_function_permissions" USING btree ("function_id");--> statement-breakpoint
CREATE INDEX "ai_function_permissions_role_idx" ON "ai_function_permissions" USING btree ("role_type");--> statement-breakpoint
CREATE INDEX "ai_function_permissions_user_idx" ON "ai_function_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_function_usage_logs_func_idx" ON "ai_function_usage_logs" USING btree ("function_id");--> statement-breakpoint
CREATE INDEX "ai_function_usage_logs_user_idx" ON "ai_function_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_function_usage_logs_status_idx" ON "ai_function_usage_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_function_usage_logs_created_idx" ON "ai_function_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_proposed_actions_session_idx" ON "ai_proposed_actions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_proposed_actions_status_idx" ON "ai_proposed_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_proposed_actions_user_idx" ON "ai_proposed_actions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_snapshot_org" ON "airtable_address_snapshots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_snapshot_airtable_record" ON "airtable_address_snapshots" USING btree ("airtable_record_id");--> statement-breakpoint
CREATE INDEX "idx_snapshot_connection" ON "airtable_address_snapshots" USING btree ("airtable_connection_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_conn_org" ON "airtable_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_conn_base" ON "airtable_connections" USING btree ("base_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_conn_table" ON "airtable_connections" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_conn_menu" ON "airtable_connections" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_link_conn" ON "airtable_record_links" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_link_work" ON "airtable_record_links" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_link_record" ON "airtable_record_links" USING btree ("airtable_record_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_wf_org" ON "airtable_workflow_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_airtable_wf_conn" ON "airtable_workflow_templates" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_audio_org" ON "audio_recordings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audio_work_item" ON "audio_recordings" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_audio_status" ON "audio_recordings" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "idx_bookable_task_types_org" ON "bookable_task_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_bookable_task_types_active" ON "bookable_task_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_bookable_task_types_display" ON "bookable_task_types" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "idx_bookable_task_types_slug" ON "bookable_task_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_booking_tokens_org" ON "booking_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_booking_tokens_work_item" ON "booking_tokens" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_booking_tokens_status" ON "booking_tokens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_booking_tokens_customer" ON "booking_tokens" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_org" ON "bookings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_task_type" ON "bookings" USING btree ("bookable_task_type_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_work_item" ON "bookings" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_customer" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_datetime" ON "bookings" USING btree ("selected_datetime");--> statement-breakpoint
CREATE INDEX "idx_cable_fiber_org" ON "cable_fiber_definitions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_cable_fiber_cable" ON "cable_fiber_definitions" USING btree ("cable_id");--> statement-breakpoint
CREATE INDEX "idx_cable_fiber_node" ON "cable_fiber_definitions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "idx_participants_cycle_role" ON "check_in_cycle_participants" USING btree ("check_in_cycle_id","role");--> statement-breakpoint
CREATE INDEX "idx_check_in_cycles_org" ON "check_in_cycles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_check_in_cycles_objective" ON "check_in_cycles" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_check_in_cycles_dates" ON "check_in_cycles" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_cycles_team_period" ON "check_in_cycles" USING btree ("team_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_meetings_org_team" ON "check_in_meetings" USING btree ("organization_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_scheduled" ON "check_in_meetings" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_meetings_status" ON "check_in_meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_content_items_type" ON "content_items" USING btree ("content_type_id");--> statement-breakpoint
CREATE INDEX "idx_content_items_org" ON "content_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_content_items_slug" ON "content_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_content_items_status" ON "content_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_content_revisions_item" ON "content_revisions" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "idx_content_revisions_changed" ON "content_revisions" USING btree ("changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_content_types_org" ON "content_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_org" ON "custom_field_definitions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_table" ON "custom_field_definitions" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "idx_geocoding_cache_org" ON "customer_geocoding_cache" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_geocoding_cache_customer" ON "customer_geocoding_cache" USING btree ("splynx_customer_id");--> statement-breakpoint
CREATE INDEX "idx_geocoding_cache_hash" ON "customer_geocoding_cache" USING btree ("address_hash");--> statement-breakpoint
CREATE INDEX "idx_data_fields_table" ON "data_fields" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "idx_data_relationships_org" ON "data_relationships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_data_relationships_from" ON "data_relationships" USING btree ("from_table","from_field");--> statement-breakpoint
CREATE INDEX "idx_data_relationships_to" ON "data_relationships" USING btree ("to_table","to_field");--> statement-breakpoint
CREATE INDEX "idx_data_tables_org" ON "data_tables" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_db_connections_integration" ON "database_connections" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "idx_db_connections_org" ON "database_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_db_connections_type" ON "database_connections" USING btree ("database_type");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_org" ON "document_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_document" ON "document_assignments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_user" ON "document_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_team" ON "document_assignments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_assigner" ON "document_assignments" USING btree ("assigner_id");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_status" ON "document_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_due_date" ON "document_assignments" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_doc_assignments_work_item" ON "document_assignments" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_lifecycle_status" ON "document_lifecycle" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "idx_lifecycle_expiration" ON "document_lifecycle" USING btree ("expiration_date");--> statement-breakpoint
CREATE INDEX "idx_email_templates_org" ON "email_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_email_templates_status" ON "email_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_erd_layouts_org_user" ON "erd_layouts" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_feature_comments_feature" ON "feature_comments" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_feature_comments_author" ON "feature_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_feature_feedback_feature" ON "feature_feedback" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_feature_feedback_user" ON "feature_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feature_feedback_status" ON "feature_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_org" ON "fiber_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_tray" ON "fiber_connections" USING btree ("tray_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_node" ON "fiber_connections" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_work_item" ON "fiber_connections" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_cable_a" ON "fiber_connections" USING btree ("cable_a_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_cable_b" ON "fiber_connections" USING btree ("cable_b_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_conn_deleted" ON "fiber_connections" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "idx_fiber_activity_org" ON "fiber_network_activity_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_activity_entity" ON "fiber_network_activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_activity_user" ON "fiber_network_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_activity_work_item" ON "fiber_network_activity_logs" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_activity_timestamp" ON "fiber_network_activity_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_fiber_nodes_org" ON "fiber_network_nodes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_nodes_type" ON "fiber_network_nodes" USING btree ("node_type");--> statement-breakpoint
CREATE INDEX "idx_fiber_nodes_status" ON "fiber_network_nodes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fiber_nodes_location" ON "fiber_network_nodes" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_fiber_nodes_name" ON "fiber_network_nodes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_fiber_node_types_org" ON "fiber_node_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_splice_trays_org" ON "fiber_splice_trays" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_splice_trays_node" ON "fiber_splice_trays" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_term_org" ON "fiber_terminations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_term_customer" ON "fiber_terminations" USING btree ("customer_node_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_term_source" ON "fiber_terminations" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "idx_fiber_term_cable" ON "fiber_terminations" USING btree ("cable_id");--> statement-breakpoint
CREATE INDEX "idx_task_execution_task" ON "field_task_executions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_execution_status" ON "field_task_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_execution_org" ON "field_task_executions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_field_tasks_org_user" ON "field_tasks" USING btree ("organization_id","assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "idx_field_tasks_app_type" ON "field_tasks" USING btree ("app_task_type");--> statement-breakpoint
CREATE INDEX "idx_field_tasks_status" ON "field_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_field_tasks_sync_status" ON "field_tasks" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_field_tasks_scheduled" ON "field_tasks" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_field_tasks_splynx_id" ON "field_tasks" USING btree ("splynx_task_id");--> statement-breakpoint
CREATE INDEX "idx_financial_metrics_org" ON "financial_metrics_cache" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_financial_metrics_type" ON "financial_metrics_cache" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "idx_financial_metrics_period" ON "financial_metrics_cache" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_financial_metrics_profit_center" ON "financial_metrics_cache" USING btree ("profit_center_id");--> statement-breakpoint
CREATE INDEX "idx_financial_metrics_expires" ON "financial_metrics_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_org" ON "financial_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_xero_id" ON "financial_transactions" USING btree ("xero_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_date" ON "financial_transactions" USING btree ("transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_status" ON "financial_transactions" USING btree ("categorization_status");--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_splynx_customer" ON "financial_transactions" USING btree ("splynx_customer_id");--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_account" ON "financial_transactions" USING btree ("xero_account_code");--> statement-breakpoint
CREATE INDEX "idx_integration_actions_integration" ON "integration_actions" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "idx_integration_actions_key" ON "integration_actions" USING btree ("action_key");--> statement-breakpoint
CREATE INDEX "idx_integration_actions_category" ON "integration_actions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_integration_triggers_integration" ON "integration_triggers" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "idx_integration_triggers_key" ON "integration_triggers" USING btree ("trigger_key");--> statement-breakpoint
CREATE INDEX "idx_int_workflow_org" ON "integration_workflow_mappings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_int_workflow_integration" ON "integration_workflow_mappings" USING btree ("integration_name");--> statement-breakpoint
CREATE INDEX "idx_int_workflow_template" ON "integration_workflow_mappings" USING btree ("workflow_template_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_org" ON "integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_platform" ON "integrations" USING btree ("platform_type");--> statement-breakpoint
CREATE INDEX "idx_kr_comments_key_result" ON "key_result_comments" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_kr_comments_meeting" ON "key_result_comments" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_kr_comments_user" ON "key_result_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kr_snapshots_meeting" ON "key_result_snapshots" USING btree ("check_in_meeting_id");--> statement-breakpoint
CREATE INDEX "idx_kr_snapshots_kr" ON "key_result_snapshots" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_key_result_tasks_org" ON "key_result_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_key_result_tasks_key_result" ON "key_result_tasks" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_key_result_tasks_assigned" ON "key_result_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_key_result_tasks_status" ON "key_result_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_krt_keyresult_status" ON "key_result_tasks" USING btree ("key_result_id","status");--> statement-breakpoint
CREATE INDEX "idx_key_results_org" ON "key_results" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_key_results_objective" ON "key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_key_results_owner" ON "key_results" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_key_results_objective_status" ON "key_results" USING btree ("objective_id","status");--> statement-breakpoint
CREATE INDEX "idx_knowledge_categories_org" ON "knowledge_categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_categories_parent" ON "knowledge_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_doc_activity_document" ON "knowledge_document_activity" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_doc_activity_user" ON "knowledge_document_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_doc_activity_action" ON "knowledge_document_activity" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_doc_activity_created" ON "knowledge_document_activity" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_doc_attachments_document" ON "knowledge_document_attachments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_doc_attachments_objective" ON "knowledge_document_attachments" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_doc_attachments_key_result" ON "knowledge_document_attachments" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_doc_attachments_task" ON "knowledge_document_attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_doc_attachments_work_item" ON "knowledge_document_attachments" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_doc_attachments_attached_by" ON "knowledge_document_attachments" USING btree ("attached_by");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_document" ON "knowledge_document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_number" ON "knowledge_document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_changed_by" ON "knowledge_document_versions" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_created" ON "knowledge_document_versions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_org" ON "knowledge_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_author" ON "knowledge_documents" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_folder" ON "knowledge_documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_type" ON "knowledge_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_categories" ON "knowledge_documents" USING btree ("categories");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_tags" ON "knowledge_documents" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_status" ON "knowledge_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_knowledge_docs_team" ON "knowledge_documents" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_folders_org" ON "knowledge_folders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_folders_parent" ON "knowledge_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_folders_type" ON "knowledge_folders" USING btree ("folder_type");--> statement-breakpoint
CREATE INDEX "idx_layout_templates_org" ON "layout_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_layout_templates_category" ON "layout_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_layout_templates_active" ON "layout_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_media_library_org" ON "media_library" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_media_library_type" ON "media_library" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "idx_attendees_meeting" ON "meeting_attendees" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_attendees_user" ON "meeting_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_updates_meeting" ON "meeting_item_updates" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_updates_work_item" ON "meeting_item_updates" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_updates_key_result" ON "meeting_item_updates" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_updates_objective" ON "meeting_item_updates" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_topics_meeting" ON "meeting_topics" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_topics_priority" ON "meeting_topics" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_menu_items_org" ON "menu_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_section" ON "menu_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_parent" ON "menu_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_page" ON "menu_items" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_order" ON "menu_items" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "idx_menu_sections_org" ON "menu_sections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_menu_sections_order" ON "menu_sections" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "idx_mindmap_positions_org_user" ON "mind_map_node_positions" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_mindmap_positions_node" ON "mind_map_node_positions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "idx_mission_vision_org" ON "mission_vision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_page_requests_org" ON "new_page_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_page_requests_status" ON "new_page_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_page_requests_requester" ON "new_page_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "idx_objectives_org" ON "objectives" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_owner" ON "objectives" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_team" ON "objectives" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_status" ON "objectives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_objectives_display_order" ON "objectives" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "idx_objectives_status_live" ON "objectives" USING btree ("status") WHERE status = 'Live';--> statement-breakpoint
CREATE INDEX "idx_obj_snapshots_cycle" ON "objectives_snapshots" USING btree ("check_in_cycle_id");--> statement-breakpoint
CREATE INDEX "idx_obj_snapshots_objective" ON "objectives_snapshots" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_onboarding_plans_org" ON "onboarding_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_onboarding_plans_active" ON "onboarding_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_organizations_domain" ON "organizations" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_organizations_active" ON "organizations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_pages_org" ON "pages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_pages_slug" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_pages_status" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pages_layout" ON "pages" USING btree ("layout_template_id");--> statement-breakpoint
CREATE INDEX "idx_pages_deleted" ON "pages" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_platform_features_org" ON "platform_features" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_platform_features_parent" ON "platform_features" USING btree ("parent_feature_id");--> statement-breakpoint
CREATE INDEX "idx_point_transactions_user" ON "point_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_point_transactions_org" ON "point_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_point_transactions_created" ON "point_transactions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_process_folders_org" ON "process_folders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_process_folders_parent" ON "process_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_process_folders_type" ON "process_folders" USING btree ("folder_type");--> statement-breakpoint
CREATE INDEX "idx_process_folders_team" ON "process_folders" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_org" ON "profit_centers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_type" ON "profit_centers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_active" ON "profit_centers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_xero_account" ON "profit_centers" USING btree ("xero_account_id");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_objective" ON "profit_centers" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_key_result" ON "profit_centers" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_profit_centers_task" ON "profit_centers" USING btree ("key_result_task_id");--> statement-breakpoint
CREATE INDEX "idx_report_access_doc" ON "public_report_access_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_report_access_time" ON "public_report_access_log" USING btree ("accessed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_report_blocks_section" ON "public_report_blocks" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_report_blocks_order" ON "public_report_blocks" USING btree ("section_id","block_order");--> statement-breakpoint
CREATE INDEX "idx_report_sections_doc" ON "public_report_sections" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_report_sections_order" ON "public_report_sections" USING btree ("document_id","section_order");--> statement-breakpoint
CREATE INDEX "idx_rag_status_org" ON "rag_status_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_rag_status_airtable_record" ON "rag_status_records" USING btree ("airtable_record_id");--> statement-breakpoint
CREATE INDEX "idx_rag_status_connection" ON "rag_status_records" USING btree ("airtable_connection_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_splynx_admin_org" ON "splynx_administrators" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_splynx_admin_id" ON "splynx_administrators" USING btree ("splynx_admin_id");--> statement-breakpoint
CREATE INDEX "idx_splynx_locations_org" ON "splynx_locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_splynx_locations_splynx_id" ON "splynx_locations" USING btree ("splynx_location_id");--> statement-breakpoint
CREATE INDEX "idx_sql_audit_org" ON "sql_direct_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sql_audit_timestamp" ON "sql_direct_audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_sql_audit_success" ON "sql_direct_audit_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "idx_strategy_settings_org" ON "strategy_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_org" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sync_queue_status_priority" ON "sync_queue" USING btree ("status","priority","next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_sync_queue_user" ON "sync_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sync_queue_entity" ON "sync_queue" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_tariff_org" ON "tariff_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_tariff_airtable_record" ON "tariff_records" USING btree ("airtable_record_id");--> statement-breakpoint
CREATE INDEX "idx_tariff_connection" ON "tariff_records" USING btree ("airtable_connection_id");--> statement-breakpoint
CREATE INDEX "idx_checklist_task" ON "task_checklists" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_type_org" ON "task_type_configurations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_task_type_active" ON "task_type_configurations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_task_type_app_type" ON "task_type_configurations" USING btree ("app_task_type");--> statement-breakpoint
CREATE INDEX "idx_team_feedback_meeting" ON "team_feedback" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_team_feedback_user" ON "team_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_team_members_team" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_teams_org" ON "teams" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_teams_name" ON "teams" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_tenants_org" ON "tenants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_tenants_subdomain" ON "tenants" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "idx_theme_settings_org" ON "theme_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_drafts_org" ON "ticket_draft_responses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_drafts_work_item" ON "ticket_draft_responses" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_drafts_sent_at" ON "ticket_draft_responses" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_training_steps_doc" ON "training_module_steps" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_training_steps_order" ON "training_module_steps" USING btree ("document_id","step_order");--> statement-breakpoint
CREATE INDEX "idx_training_progress_user" ON "training_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_training_progress_doc" ON "training_progress" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_training_progress_status" ON "training_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quiz_questions_step" ON "training_quiz_questions" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_questions_order" ON "training_quiz_questions" USING btree ("step_id","question_order");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_user" ON "user_onboarding_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_plan" ON "user_onboarding_progress" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_status" ON "user_onboarding_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_points_org" ON "user_points" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_users_organization" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_vapi_assistants_org" ON "vapi_assistants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_vapi_assistants_role" ON "vapi_assistants" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_vapi_assistants_active" ON "vapi_assistants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_org" ON "vapi_calls" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_vapi_id" ON "vapi_calls" USING btree ("vapi_call_id");--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_status" ON "vapi_calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_customer" ON "vapi_calls" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_started" ON "vapi_calls" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_intent" ON "vapi_calls" USING btree ("customer_intent");--> statement-breakpoint
CREATE INDEX "idx_vapi_calls_autonomous" ON "vapi_calls" USING btree ("was_autonomous");--> statement-breakpoint
CREATE INDEX "idx_vapi_knowledge_org" ON "vapi_knowledge_files" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_vapi_knowledge_category" ON "vapi_knowledge_files" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_vapi_knowledge_active" ON "vapi_knowledge_files" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_vehicle_check_user_date" ON "vehicle_checks" USING btree ("user_id","check_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_vehicle_check_date" ON "vehicle_checks" USING btree ("check_date");--> statement-breakpoint
CREATE INDEX "idx_vehicle_check_org" ON "vehicle_checks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_visit_workflow_task" ON "visit_workflows" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_org" ON "webhook_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_integration" ON "webhook_events" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_trigger" ON "webhook_events" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_trigger_key" ON "webhook_events" USING btree ("trigger_key");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_created" ON "webhook_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_webhook_events_processed" ON "webhook_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_website_pages_org" ON "website_pages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_website_pages_slug" ON "website_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_website_pages_status" ON "website_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_org" ON "whatsapp_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_timestamp" ON "whatsapp_messages" USING btree ("whatsapp_timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_whatsapp_group" ON "whatsapp_messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_work_item_sources_org" ON "work_item_sources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_work_item_sources_work_item" ON "work_item_sources" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_work_item_sources_source" ON "work_item_sources" USING btree ("source_table","source_id");--> statement-breakpoint
CREATE INDEX "idx_exec_steps_execution" ON "work_item_workflow_execution_steps" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "idx_exec_steps_work_item" ON "work_item_workflow_execution_steps" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_exec_steps_status" ON "work_item_workflow_execution_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_exec_steps_org" ON "work_item_workflow_execution_steps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_work_item_exec_work_item" ON "work_item_workflow_executions" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_work_item_exec_status" ON "work_item_workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_work_item_exec_org" ON "work_item_workflow_executions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_work_items_cycle_status" ON "work_items" USING btree ("check_in_cycle_id","status");--> statement-breakpoint
CREATE INDEX "idx_work_items_org_due" ON "work_items" USING btree ("organization_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_work_items_meeting" ON "work_items" USING btree ("target_meeting_id");--> statement-breakpoint
CREATE INDEX "idx_work_items_key_result_task" ON "work_items" USING btree ("key_result_task_id");--> statement-breakpoint
CREATE INDEX "idx_work_items_workflow" ON "work_items" USING btree ("workflow_template_id");--> statement-breakpoint
CREATE INDEX "idx_work_items_type" ON "work_items" USING btree ("work_item_type");--> statement-breakpoint
CREATE INDEX "idx_work_snapshots_cycle" ON "work_items_snapshots" USING btree ("check_in_cycle_id");--> statement-breakpoint
CREATE INDEX "idx_work_snapshots_item" ON "work_items_snapshots" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_work_snapshots_status" ON "work_items_snapshots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_step_extractions_org" ON "workflow_step_extractions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_step_extractions_work_item" ON "workflow_step_extractions" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "idx_step_extractions_step" ON "workflow_step_extractions" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_step_extractions_status" ON "workflow_step_extractions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_org" ON "workflow_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_active" ON "workflow_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_workflow_menu" ON "workflow_templates" USING btree ("display_in_menu");--> statement-breakpoint
CREATE INDEX "idx_workflow_team" ON "workflow_templates" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_folder" ON "workflow_templates" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_xero_coa_org" ON "xero_chart_of_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_xero_coa_type" ON "xero_chart_of_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "idx_xero_coa_code" ON "xero_chart_of_accounts" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "idx_xero_coa_status" ON "xero_chart_of_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_xero_sync_logs_org" ON "xero_sync_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_xero_sync_logs_type" ON "xero_sync_logs" USING btree ("sync_type");--> statement-breakpoint
CREATE INDEX "idx_xero_sync_logs_started" ON "xero_sync_logs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_xero_sync_org" ON "xero_sync_status" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_xero_sync_type" ON "xero_sync_status" USING btree ("sync_type");