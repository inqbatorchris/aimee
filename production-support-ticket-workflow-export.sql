-- ============================================================================
-- AIMEE.WORKS PRODUCTION DEPLOYMENT SQL EXPORT
-- Support Ticket Workflow System - Complete Configuration
-- Generated: 2025-12-03
-- Organization ID: 4 (Country Connect)
-- ============================================================================
--
-- IMPORTANT: This export includes all records needed for the intelligent
-- 3-path support ticket routing workflow to function in production.
--
-- DEPLOYMENT ORDER:
-- 1. Organization must exist (ID: 4)
-- 2. Users must be created/exist
-- 3. Teams must be created/exist
-- 4. Integration must be configured (Splynx)
-- 5. Run these INSERT statements in order
--
-- NOTE: IDs may need adjustment based on your production database state.
-- Consider using explicit ID assignment or letting sequences generate new IDs.
-- ============================================================================

-- ============================================================================
-- SECTION 1: TEAM CONFIGURATION (Service Desk)
-- ============================================================================
-- Team ID 15: Service Desk team that handles support tickets

INSERT INTO teams (
    id, organization_id, name, default_cadence, timezone, cadence, 
    meeting_time, weekly_weekday, monthly_rule_type, monthly_nth, 
    monthly_weekday, monthly_day_of_month, period_rule_type, period_nth,
    period_weekday, default_meeting_length_minutes
) VALUES (
    15,  -- You may need to adjust this ID or use nextval('teams_id_seq')
    4,   -- organization_id - adjust if different in production
    'Service desk',
    'daily',
    'UTC',
    'daily',
    '09:00:00',
    'mon',
    'nth_weekday',
    1,
    'mon',
    1,
    'nth_weekday',
    1,
    'mon',
    15
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    default_cadence = EXCLUDED.default_cadence,
    timezone = EXCLUDED.timezone,
    cadence = EXCLUDED.cadence;

-- ============================================================================
-- SECTION 2: WORKFLOW TEMPLATE (Splynx Support Ticket)
-- ============================================================================
-- Template used by work items created from support tickets

INSERT INTO workflow_templates (
    id, organization_id, name, description, category, steps, version,
    is_active, is_system_template, applicable_types, estimated_minutes,
    display_in_menu, menu_order, completion_callbacks, team_id
) VALUES (
    'splynx-support-ticket',
    4,  -- organization_id
    'Splynx Support Ticket',
    'Unified workflow for quickly processing Splynx support tickets with all actions in one view',
    'support',
    '[{"id": "step-1", "type": "splynx_ticket", "label": "Process Support Ticket", "order": 1, "required": true, "description": "View ticket details, read messages, respond to customer, and update status - all in one streamlined interface"}]'::jsonb,
    1,
    true,
    true,
    ARRAY['work_item'],
    30,
    false,
    999,
    '[{"action": "addTicketMessage", "fieldMappings": [{"sourceField": "message", "targetField": "message", "sourceStepId": "step-2"}, {"sourceField": "isInternal", "targetField": "isInternal", "sourceStepId": "step-2"}], "integrationName": "splynx"}, {"action": "updateTicketStatus", "fieldMappings": [{"sourceField": "statusId", "targetField": "statusId", "sourceStepId": "step-3"}], "integrationName": "splynx"}]'::jsonb,
    15  -- team_id (Service desk)
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    is_active = EXCLUDED.is_active,
    completion_callbacks = EXCLUDED.completion_callbacks,
    team_id = EXCLUDED.team_id;

-- ============================================================================
-- SECTION 3: KNOWLEDGE BASE DOCUMENTS (AI Instructions)
-- ============================================================================
-- These documents provide instructions for AI draft generation

-- Document 29: Service Down Response Instructions
INSERT INTO knowledge_documents (
    id, organization_id, title, content, summary, status, visibility,
    author_id, unified_status, categories, tags, document_type
) VALUES (
    29,  -- You may need to adjust this ID
    4,   -- organization_id
    '[AI Instructions] Service Down Response',
    E'# AI Draft Instructions for Service Down Response\n\n## Context\nThis document provides instructions for generating AI draft responses when the customer''s service status shows as NOT ACTIVE, BLOCKED, or DISABLED.\n\n## CRITICAL FORMATTING RULES\n- **DO NOT include a subject line** - The system adds this automatically\n- **DO NOT include email signatures or footers** - The system adds these automatically\n- Just write the body of the response\n\n## Response Guidelines\n\n### Tone & Approach\n- Be direct and empathetic - acknowledge frustration briefly\n- Be factual about what you can see in the system\n- Give a clear assessment of the cause\n- Provide specific next steps\n\n### Response Structure\n1. **Empathetic opening** (1 sentence) - Acknowledge the issue briefly\n2. **Service check statement** - Say you performed a service check and state what it shows\n3. **Explain the cause** - Based on the data, explain clearly why (blocked due to payment, technical issue, etc.)\n4. **Resolution path** - Provide specific steps to resolve\n5. **Clear next action** - What they need to do next\n\n### Handling Blocked Accounts\nIf account is blocked due to payment:\n- State clearly: "I can see your service has been suspended due to an outstanding balance of £X"\n- Explain how to restore service (payment methods, contact finance)\n- Be matter-of-fact, not judgmental\n\nIf account shows pending block:\n- State: "I can see your account is scheduled for service suspension due to billing"\n- Provide opportunity to resolve before block takes effect\n\n### DO NOT:\n- Start with "Thank you for reaching out" or formal openings\n- Include "I''m here to help" or "Rest assured" phrases  \n- Make promises about timeframes you cannot guarantee\n- Include subject lines or email footers/signatures\n\n## Sample Response Framework\n\nHi [Customer Name],\n\n[Brief empathetic acknowledgment].\n\nI have performed a service check and I can see that your service is currently [status/blocked/suspended]. [Explain the reason if known from the data].\n\nTo restore your service:\n1. [Specific action step]\n2. [Follow-up action if needed]\n\n[Clear next action - what to do to resolve this].',
    'AI draft instructions for generating responses when customer service is down or inactive. Includes guidelines for tone, structure, and available template variables.',
    'published',
    'internal',
    14,  -- author_id (Chris Gibbons) - adjust if different
    'live',
    ARRAY['AI', 'Support', 'Drafting'],
    ARRAY['ai-instructions', 'service-down', 'draft-response'],
    'internal_kb'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    unified_status = EXCLUDED.unified_status,
    categories = EXCLUDED.categories,
    tags = EXCLUDED.tags;

-- Document 30: Service Active Response Instructions
INSERT INTO knowledge_documents (
    id, organization_id, title, content, summary, status, visibility,
    author_id, unified_status, categories, tags, document_type
) VALUES (
    30,  -- You may need to adjust this ID
    4,   -- organization_id
    '[AI Instructions] Service Active Response',
    E'# AI Draft Instructions for Service Active Response\n\n## Context\nThis document provides instructions for generating AI draft responses when the customer''s service status shows as ACTIVE and was recently online.\n\n## CRITICAL FORMATTING RULES\n- **DO NOT include a subject line** - The system adds this automatically\n- **DO NOT include email signatures or footers** - The system adds these automatically\n- Just write the body of the response\n\n## Response Guidelines\n\n### Tone & Approach\n- Be direct and empathetic - acknowledge frustration briefly\n- Be confident and reassuring - "I am sure its something we can fix"\n- State clearly what you checked and what the data shows\n- Give a clear assessment based on the evidence\n- Keep it concise - no unnecessary filler phrases\n\n### Response Structure\n1. **Empathetic opening** (1 sentence) - Acknowledge the frustration briefly\n2. **Service check statement** - Say you performed a service check and state what it shows\n3. **Assessment** - Based on the data, give your assessment (e.g., "this looks like an internal network or device issue rather than a network issue")\n4. **Troubleshooting steps** - Provide relevant steps with clear formatting\n5. **Clear next action** - Tell them exactly what to do if issues persist (e.g., send photos)\n\n### DO NOT:\n- Start with "Thank you for reaching out" or similar formal openings\n- Include phrases like "I''m here to help" or "Rest assured"\n- Write lengthy reassurances or closings\n- Include subject lines or email footers/signatures\n- Dismiss their concerns - acknowledge and investigate\n\n### Key Information to Use\n- Customer name from context\n- Last online time (indicates connection is/was working)\n- Account status (active/blocked)\n- Any blocking warnings that might affect service\n\n## Sample Response Framework\n\nHi [Customer Name],\n\n[Brief empathetic acknowledgment - 1 sentence].\n\nI have performed a service check and I can see that your service is currently [status], and your last online status was [last online time], which indicates that your connection [is/was functioning].\n\n[Assessment based on the evidence - what does this suggest?]\n\n[Troubleshooting steps with bold headers and clear formatting]\n\nIf you still notice service issues please respond to this ticket with [specific request - e.g., photos of router lights and cables, ONT/ONU photos].',
    'AI draft instructions for generating responses when customer service is active. Focuses on troubleshooting and addressing specific customer concerns.',
    'published',
    'internal',
    14,  -- author_id - adjust if different
    'live',
    ARRAY['AI', 'Support', 'Drafting'],
    ARRAY['ai-instructions', 'service-active', 'draft-response'],
    'internal_kb'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    unified_status = EXCLUDED.unified_status,
    categories = EXCLUDED.categories,
    tags = EXCLUDED.tags;

-- Document 39: General Support Ticket System Prompt
INSERT INTO knowledge_documents (
    id, organization_id, title, content, summary, status, visibility,
    author_id, unified_status, categories, tags, document_type
) VALUES (
    39,  -- You may need to adjust this ID
    4,   -- organization_id
    'Support Ticket AI System Prompt - ISP/MSP',
    E'# AI Support Ticket Response System Prompt - ISP/MSP\n\n## Your Role\nYou are a support agent for a full fiber ISP. Write responses that are direct, helpful, and technically competent.\n\n## CRITICAL FORMATTING RULES\n- **DO NOT include a subject line** - The system adds this automatically\n- **DO NOT include email signatures or footers** - The system adds these automatically\n- **DO NOT include "Best regards" or similar closings** - The system handles this\n- Just write the body of the response\n\n## Communication Style\n\n### Tone & Voice\n- **Direct and confident**: Get to the point quickly, be decisive\n- **Briefly empathetic**: One sentence max acknowledging the issue\n- **Clear assessments**: Based on the data, give your professional assessment\n- **Action-oriented**: Focus on what needs to happen next\n\n### AVOID These Phrases\n- "Thank you for reaching out"\n- "I understand how frustrating..."\n- "Rest assured"\n- "I''m here to help"\n- "Please don''t hesitate to contact us"\n- Lengthy reassurances or formal closings\n\n### USE This Style Instead\n- Start with brief empathy: "No connection can be frustrating" or "I can see the issue"\n- State what you checked: "I have performed a service check and can see..."\n- Give assessment: "This looks like..." or "Based on the data..."\n- Clear action: "Please [do X] and let me know"\n\n## Response Structure\n\n1. **Brief empathy** (1 sentence max)\n2. **What you checked** - State you performed a service/account check\n3. **What the data shows** - Account status, last online, any warnings\n4. **Your assessment** - What does the evidence suggest?\n5. **Troubleshooting/Next steps** - Clear, numbered if needed\n6. **Clear call to action** - What should they do next?\n\n## Technical Context\n\n### Our Services\n- Full Fiber Broadband (FTTP)\n- ONTs (Optical Network Terminal) on the wall\n- Customer routers behind the ONT\n- Business and residential services\n\n### Key Data Points to Reference\n- Last online time (indicates connection was/is working)\n- Account status (active/blocked/suspended)\n- Blocking status (scheduled for block, already blocked)\n- Account balance (credit or amount owed)\n\n### Common Scenarios\n\n**Service Active, Customer Reports Issue:**\n- If last online is recent → likely internal network/device issue\n- Ask for photos of router lights and ONT lights\n- Suggest power cycling equipment\n\n**Service Blocked/Suspended:**\n- State clearly the account status\n- Explain reason if data shows it (payment, etc.)\n- Provide resolution path\n\n**Connectivity Troubleshooting:**\n1. Power cycle router and ONT (30 seconds)\n2. Check ONT lights - power and PON should be solid\n3. Check cables and connections\n4. Request photos if issues persist\n\n## Quality Standards\n\nYour responses should:\n- Be concise (no unnecessary filler)\n- Include your professional assessment\n- Provide actionable next steps\n- End with a clear request (send photos, call us, etc.)\n\n## Example Response\n\nHi Chris,\n\nNo connection can be frustrating, I am sure its something we can fix.\n\nI have performed a service check and I can see that your service is currently active, and your last online status was just a short while ago at 03:23 AM today, which indicates that your connection is functioning.\n\nFrom what I can see, this looks like an internal network or device issue, rather than a network issue.\n\n1. **Restart Your Equipment**: Power cycle your router and any connected devices for about 30 seconds.\n2. **Check ONT Lights**: The power and internet lights should be solid. If any are flashing or off, let me know.\n3. **Cables and Connections**: Ensure all cables are securely connected.\n\nIf you still notice service issues please respond to this ticket with photos of your router (the lights on the top and cables at the back) and the ONU (the device on the wall showing the lights).',
    NULL,
    'draft',
    'internal',
    14,  -- author_id - adjust if different
    NULL,
    ARRAY['Support', 'AI'],
    ARRAY['system-prompt', 'support-tickets', 'ISP', 'MSP'],
    'internal_kb'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    status = EXCLUDED.status,
    categories = EXCLUDED.categories,
    tags = EXCLUDED.tags;

-- ============================================================================
-- SECTION 4: INTEGRATION TRIGGER (Splynx Ticket Created)
-- ============================================================================
-- NOTE: The integration itself must be configured separately with credentials
-- This trigger links the Splynx webhook to the workflow

INSERT INTO integration_triggers (
    id, integration_id, trigger_key, name, description, category,
    event_type, is_active, is_configured
) VALUES (
    45,  -- You may need to adjust this ID
    2,   -- integration_id - this must match your Splynx integration ID in production
    'ticket_created',
    'Ticket Created',
    'Triggered when a new support ticket is created',
    'Support',
    'webhook',
    true,
    false
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- SECTION 5: AGENT WORKFLOW (Support Ticket Auto Work Item)
-- ============================================================================
-- The main intelligent 3-path routing workflow

INSERT INTO agent_workflows (
    id, organization_id, name, description, trigger_type, trigger_config,
    workflow_definition, is_enabled, assigned_team_id, retry_config,
    execution_timeout, webhook_token, assigned_user_id, created_by
) VALUES (
    11,  -- You may need to adjust this ID
    4,   -- organization_id
    'Support Ticket Auto Work Item',
    E'INTELLIGENT SUPPORT TICKET ROUTING WORKFLOW\n\nTRIGGER: Splynx Ticket Created (webhook)\nDATA: trigger.id, trigger.customer_id, trigger.category, trigger.type_id, trigger.subject\n\nSTEP 1: GET TICKET CONTEXT\n- Fetch customer data from Splynx (if customer_id present)\n- Context: Name, status, plan, contact, balance, connection status, last 4 tickets\n\nSTEP 2: CONDITIONAL PATHS\n\nPATH A: NO CUSTOMER ID (trigger.customer_id is empty)\n- Create Work Item (support-ticket template, status: Pending Customer ID)\n- UI prompts agent to add customer ID before processing\n- STOP - No AI draft until customer ID is provided\n\nPATH B: CONNECTIVITY ISSUE (Residential Customer)\nCondition: trigger.category = "person" AND trigger.type_id IN [2, 12, 13]\n  (2) Major Service Outage\n  (12) Isolated Internet Fault\n  (13) Wi-Fi Issue\n- Create Work Item (connectivity-issue template)\n- Splynx Service Status Lookup\n- SUB-BRANCH:\n  B3a: SERVICE DOWN (status ≠ "active")\n    - AI Draft: Router not responding, power cycling instructions, request photos, ENGINEER VISIT booking link\n  B3b: SERVICE ACTIVE (status = "active")\n    - AI Draft: Service active, likely local network issue, SUPPORT CALL booking link\n\nPATH C: DEFAULT (Has Customer ID, Not Connectivity Issue)\n- Create Work Item (support-ticket template with full context)\n- AI Draft Response (standard support with KB guidance)\n\nBOOKING URLS:\n- Engineer Visit: /public/bookings/engineer/:token\n- Support Call: /public/bookings/support-call/:token',
    'webhook',
    '{"triggerId": 45}'::jsonb,
    '[{"id": "step-customer-lookup", "name": "Fetch Customer Details", "type": "splynx_query", "config": {"action": "getCustomerById", "customerId": "{{trigger.customer_id}}"}}, {"id": "step-billing-lookup", "name": "Fetch Customer Billing", "type": "splynx_query", "config": {"action": "getCustomerBilling", "customerId": "{{trigger.customer_id}}"}}, {"id": "step-routing", "name": "Route by Customer ID & Ticket Type", "type": "conditional_paths", "config": {"conditions": [{"id": "path-a-no-customer", "pathSteps": [{"id": "path-a-create-workitem", "name": "Create Work Item (Pending Customer ID)", "type": "create_work_item", "config": {"title": "Support Ticket: {{trigger.subject}}", "status": "Stuck", "teamId": 15, "templateId": "splynx-support-ticket", "description": "**Ticket Details**\n\nTicket ID: {{trigger.id}}\nCustomer ID: MISSING - Please add customer ID\nPriority: {{trigger.priority}}\nStatus: {{trigger.status_id}}\nCreated: {{trigger.created_at}}\n\n⚠️ Customer ID required before processing.", "splynxTicketId": "{{trigger.id}}"}}, {"id": "path-a-audit-message", "name": "Send Audit Note (No Customer ID)", "type": "splynx_ticket_message", "config": {"message": "🤖 [AI Workflow Audit]\n\nStatus: Ticket processed without customer ID\nAction: Work item created with status \"Stuck\"\nWork Item ID: {{pathResults[0].workItemId}}\nReason: Customer ID required for AI draft generation\n\nPlease add customer ID to enable AI assistance.", "isHidden": true, "ticketId": "{{trigger.id}}"}}], "conditions": [{"field": "trigger.customer_id", "value": "", "operator": "is_empty"}]}, {"id": "path-b-connectivity", "pathSteps": [{"id": "path-b-create-workitem", "name": "Create Connectivity Issue Work Item", "type": "create_work_item", "config": {"title": "Connectivity Issue: {{trigger.subject}}", "status": "Planning", "teamId": 15, "templateId": "splynx-support-ticket", "description": "**Connectivity Issue Ticket**\n\nTicket ID: {{trigger.id}}\nCustomer ID: {{trigger.customer_id}}\nCustomer: {{step1Output.name}}\nCategory: {{step1Output.category}}\nType: {{trigger.type_id}} (Connectivity)\nPriority: {{trigger.priority}}\nStatus: {{trigger.status_id}}\nCreated: {{trigger.created_at}}", "splynxTicketId": "{{trigger.id}}", "splynxCustomerId": "{{trigger.customer_id}}"}}, {"id": "path-b-service-check", "name": "Check Customer Service Status", "type": "splynx_query", "config": {"action": "getCustomerServices", "customerId": "{{trigger.customer_id}}"}}, {"id": "path-b-service-branch", "name": "Branch on Service Status", "type": "conditional_paths", "config": {"conditions": [{"id": "service-down", "pathSteps": [{"id": "path-b-down-draft", "name": "Generate Service Down Response", "type": "ai_draft_response", "config": {"useKnowledgeBase": true, "instructionDocIds": [29]}}, {"id": "path-b-down-audit", "name": "Send AI Draft Audit (Service Down)", "type": "splynx_ticket_message", "config": {"message": "🤖 [AI Workflow Audit]\n\nStatus: AI Draft Generated\nPath: Connectivity Issue → Service Down\nWork Item: {{pathResults[0].workItemId}}\nDraft ID: {{lastOutput.draftId}}\n\n📊 Customer Context:\nCustomer: {{step1Output.name}} (ID: {{trigger.customer_id}})\nCategory: {{step1Output.category}}\n\n💰 Billing & Account Status:\nAccount Balance: £{{step2Output.deposit}}\nAccount Status: {{step2Output.accountStatus}}\nLast Online: {{step2Output.lastOnline}}\nLast Payment: {{step2Output.lastPaymentDate}} (£{{step2Output.lastPaymentAmount}})\n\n⚠️ Blocking Status:\nBlocking Enabled: {{step2Output.blockingEnabled}}\nBlock Next Cycle: {{step2Output.blockInNextBillingCycle}}\nBlocking Date: {{step2Output.blockingDate}}\nAlready Blocked: {{step2Output.isAlreadyBlocked}}\nAlready Disabled: {{step2Output.isAlreadyDisabled}}\nLow Balance Warning: {{step2Output.lowBalance}}\n\n🔌 Service Status:\nStatus: {{pathResults[1].status}}\nServices Found: {{pathResults[1].serviceCount}}\nHas Active Service: {{pathResults[1].hasActiveService}}", "isHidden": true, "ticketId": "{{trigger.id}}"}}], "conditions": [{"field": "lastOutput.status", "value": "active", "operator": "not_equals"}]}], "defaultPath": {"steps": [{"id": "path-b-active-draft", "name": "Generate Service Active Response", "type": "ai_draft_response", "config": {"useKnowledgeBase": true, "instructionDocIds": [30]}}, {"id": "path-b-active-audit", "name": "Send AI Draft Audit (Service Active)", "type": "splynx_ticket_message", "config": {"message": "🤖 [AI Workflow Audit]\n\nStatus: AI Draft Generated\nPath: Connectivity Issue → Service Active\nWork Item: {{pathResults[0].workItemId}}\nDraft ID: {{lastOutput.draftId}}\n\n📊 Customer Context:\nCustomer: {{step1Output.name}} (ID: {{trigger.customer_id}})\nCategory: {{step1Output.category}}\n\n💰 Billing & Account Status:\nAccount Balance: £{{step2Output.deposit}}\nAccount Status: {{step2Output.accountStatus}}\nLast Online: {{step2Output.lastOnline}}\nLast Payment: {{step2Output.lastPaymentDate}} (£{{step2Output.lastPaymentAmount}})\n\n⚠️ Blocking Status:\nBlocking Enabled: {{step2Output.blockingEnabled}}\nBlock Next Cycle: {{step2Output.blockInNextBillingCycle}}\nBlocking Date: {{step2Output.blockingDate}}\nAlready Blocked: {{step2Output.isAlreadyBlocked}}\nAlready Disabled: {{step2Output.isAlreadyDisabled}}\nLow Balance Warning: {{step2Output.lowBalance}}\n\n🔌 Service Status:\nStatus: Active ✓\nServices Found: {{pathResults[1].serviceCount}}\nHas Active Service: {{pathResults[1].hasActiveService}}", "isHidden": true, "ticketId": "{{trigger.id}}"}}]}}}], "conditions": [{"field": "step1Output.category", "value": "person", "operator": "equals"}, {"field": "trigger.type_id", "value": "2,12,13", "operator": "in"}]}], "defaultPath": {"steps": [{"id": "path-c-create-workitem", "name": "Create Support Work Item", "type": "create_work_item", "config": {"title": "Support Ticket: {{trigger.subject}}", "status": "Planning", "teamId": 15, "templateId": "splynx-support-ticket", "description": "**Ticket Details**\n\nTicket ID: {{trigger.id}}\nCustomer ID: {{trigger.customer_id}}\nCustomer: {{step1Output.name}}\nCategory: {{step1Output.category}}\nType: {{trigger.type_id}}\nPriority: {{trigger.priority}}\nStatus: {{trigger.status_id}}\nCreated: {{trigger.created_at}}\nAssigned To: {{trigger.assign_to}}", "splynxTicketId": "{{trigger.id}}", "splynxCustomerId": "{{trigger.customer_id}}"}}, {"id": "path-c-service-check", "name": "Check Customer Service Status", "type": "splynx_query", "config": {"action": "getCustomerServices", "customerId": "{{trigger.customer_id}}"}}, {"id": "path-c-ai-draft", "name": "Generate Standard Support Response", "type": "ai_draft_response", "config": {"useKnowledgeBase": true, "instructionDocIds": [39]}}, {"id": "path-c-audit", "name": "Send AI Draft Audit (Standard Support)", "type": "splynx_ticket_message", "config": {"message": "🤖 [AI Workflow Audit]\n\nStatus: AI Draft Generated\nPath: Standard Support (Business/Other)\nWork Item: {{pathResults[0].workItemId}}\nDraft ID: {{lastOutput.draftId}}\n\n📊 Customer Context:\nCustomer: {{step1Output.name}} (ID: {{trigger.customer_id}})\nCategory: {{step1Output.category}}\n\n💰 Billing & Account Status:\nAccount Balance: £{{step2Output.deposit}}\nAccount Status: {{step2Output.accountStatus}}\nLast Online: {{step2Output.lastOnline}}\nLast Payment: {{step2Output.lastPaymentDate}} (£{{step2Output.lastPaymentAmount}})\n\n⚠️ Blocking Status:\nBlocking Enabled: {{step2Output.blockingEnabled}}\nBlock Next Cycle: {{step2Output.blockInNextBillingCycle}}\nBlocking Date: {{step2Output.blockingDate}}\nAlready Blocked: {{step2Output.isAlreadyBlocked}}\nAlready Disabled: {{step2Output.isAlreadyDisabled}}\nLow Balance Warning: {{step2Output.lowBalance}}\n\n🔌 Service Status:\nStatus: {{pathResults[1].status}}\nServices Found: {{pathResults[1].serviceCount}}\nHas Active Service: {{pathResults[1].hasActiveService}}", "isHidden": true, "ticketId": "{{trigger.id}}"}}]}}}]'::jsonb,
    true,
    15,  -- assigned_team_id (Service desk)
    '{"maxRetries": 3, "retryDelay": 60}'::jsonb,
    300,
    '0321fa68d7451b9212e564bd2cec5aa5620a80a731509cbb06cdb7996f3f2f11',  -- webhook_token - REGENERATE FOR PRODUCTION
    27,  -- assigned_user_id - adjust to your agent user ID
    14   -- created_by - adjust to your admin user ID
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    trigger_config = EXCLUDED.trigger_config,
    workflow_definition = EXCLUDED.workflow_definition,
    is_enabled = EXCLUDED.is_enabled,
    assigned_team_id = EXCLUDED.assigned_team_id;

-- ============================================================================
-- SECTION 6: BOOKABLE TASK TYPES (Customer Appointment Booking)
-- ============================================================================
-- Task types for booking engineer visits and support calls

INSERT INTO bookable_task_types (
    id, organization_id, name, description, task_category,
    splynx_project_id, splynx_workflow_status_id, default_duration,
    default_travel_time_to, default_travel_time_from, buffer_time_minutes,
    trigger_conditions, button_label, button_color, confirmation_message,
    is_active, display_order
) VALUES (
    4,  -- Adjust ID as needed
    4,  -- organization_id
    'Field Engineering Visit',
    NULL,
    'field_visit',
    1,  -- splynx_project_id - adjust for your Splynx setup
    1,  -- splynx_workflow_status_id - adjust for your Splynx setup
    '2h 30m',
    15,
    15,
    30,
    '{}',
    'Book Engineer Visit',
    'primary',
    'Your engineer visit has been scheduled.',
    true,
    1
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    default_duration = EXCLUDED.default_duration,
    is_active = EXCLUDED.is_active;

INSERT INTO bookable_task_types (
    id, organization_id, name, description, task_category,
    splynx_project_id, splynx_workflow_status_id, default_duration,
    default_travel_time_to, default_travel_time_from, buffer_time_minutes,
    trigger_conditions, button_label, button_color, confirmation_message,
    is_active, display_order
) VALUES (
    5,  -- Adjust ID as needed
    4,  -- organization_id
    'Remote Support Session',
    NULL,
    'support_session',
    1,  -- splynx_project_id - adjust for your Splynx setup
    1,  -- splynx_workflow_status_id - adjust for your Splynx setup
    '30m',
    15,
    15,
    30,
    '{}',
    'Book Support Call',
    'primary',
    'Your support call has been scheduled.',
    true,
    2
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    default_duration = EXCLUDED.default_duration,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- SECTION 7: AI ASSISTANT CONFIGURATION
-- ============================================================================
-- AI configuration for the organization

INSERT INTO ai_assistant_config (
    id, organization_id, is_enabled, default_model, simple_qa_model,
    strategy_model, kb_retrieval_model, data_analysis_model, temperature,
    max_tokens, top_p, presence_penalty, frequency_penalty,
    instruction_document_id, enable_semantic_search, max_kb_docs_per_query,
    similarity_threshold
) VALUES (
    3,  -- Adjust ID as needed
    4,  -- organization_id
    true,
    'gpt-4o',
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4',
    'gpt-4-turbo-preview',
    0.30,
    2000,
    0.95,
    0.00,
    0.00,
    18,  -- instruction_document_id - adjust if you have a different doc
    true,
    5,
    0.75
) ON CONFLICT (id) DO UPDATE SET
    default_model = EXCLUDED.default_model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    enable_semantic_search = EXCLUDED.enable_semantic_search;

-- ============================================================================
-- SECTION 8: USER SPLYNX ADMIN ID MAPPING
-- ============================================================================
-- IMPORTANT: Update users with their Splynx admin IDs for message attribution
-- Replace the user ID and splynx_admin_id values as needed

UPDATE users SET splynx_admin_id = 42 WHERE id = 14 AND organization_id = 4;
-- Add more user mappings as needed:
-- UPDATE users SET splynx_admin_id = XX WHERE id = YY AND organization_id = 4;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after insertion to verify everything is in place:

-- SELECT id, name FROM teams WHERE organization_id = 4 AND name = 'Service desk';
-- SELECT id, name FROM workflow_templates WHERE id = 'splynx-support-ticket';
-- SELECT id, title FROM knowledge_documents WHERE id IN (29, 30, 39);
-- SELECT id, name, is_enabled FROM agent_workflows WHERE id = 11;
-- SELECT id, trigger_key FROM integration_triggers WHERE id = 45;
-- SELECT id, name FROM bookable_task_types WHERE organization_id = 4;

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================================================
-- 
-- 1. ORGANIZATION: Ensure organization ID 4 exists, or update all references
--    to match your production organization ID.
--
-- 2. SPLYNX INTEGRATION: The integration record (ID: 2) must be created 
--    separately with valid credentials. This SQL does not include the 
--    encrypted credentials for security reasons.
--
-- 3. USERS: Ensure the referenced users exist:
--    - User 14 (Chris Gibbons - admin, created_by)
--    - User 27 (Arun Mitra - assigned_user for workflow agent)
--    Or update the user IDs to match your production users.
--
-- 4. WEBHOOK TOKEN: The webhook_token in the agent_workflow should be
--    regenerated for production security. Update the Splynx webhook
--    configuration to use the new token.
--
-- 5. SEQUENCE VALUES: After inserting with explicit IDs, update sequences:
--    SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));
--    SELECT setval('knowledge_documents_id_seq', (SELECT MAX(id) FROM knowledge_documents));
--    SELECT setval('integration_triggers_id_seq', (SELECT MAX(id) FROM integration_triggers));
--    SELECT setval('agent_workflows_id_seq', (SELECT MAX(id) FROM agent_workflows));
--    SELECT setval('bookable_task_types_id_seq', (SELECT MAX(id) FROM bookable_task_types));
--    SELECT setval('ai_assistant_config_id_seq', (SELECT MAX(id) FROM ai_assistant_config));
--
-- 6. SPLYNX WEBHOOK: Configure Splynx to send ticket_created webhooks to:
--    https://your-production-domain/api/webhooks/workflow/{webhook_token}
--
-- ============================================================================
