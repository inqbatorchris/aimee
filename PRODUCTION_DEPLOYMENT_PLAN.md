# Production Deployment Synchronization Plan
## Aimee.works Platform - Complete Data Migration Guide

---

## 🎯 Executive Summary

This document details **all critical database tables, configuration records, and security credentials** required to successfully deploy the Aimee.works platform to production. Following this plan ensures complete functionality of agent workflows, integrations, and all platform features.

---

## 📋 Pre-Deployment Checklist

### ✅ Critical Requirements
- [ ] Database schema synchronized (automatic via Replit publish)
- [ ] All critical data tables populated
- [ ] Environment variables configured
- [ ] Integration credentials migrated
- [ ] Agent workflows tested
- [ ] Menu and navigation verified
- [ ] Knowledge base documentation migrated

---

## 🗄️ CRITICAL DATABASE TABLES TO SYNCHRONIZE

### 1. **Organizations & Multi-Tenancy** (MUST MIGRATE FIRST)

#### `organizations`
**Purpose**: Core tenant data - all other records reference this
**Critical Fields**:
- `id`, `name`, `domain`, `contactEmail`
- `isActive`, `subscriptionTier`

**Action Required**:
```sql
-- Export from development
SELECT * FROM organizations WHERE id = YOUR_ORG_ID;

-- Verify production organization exists with same ID
-- Or update all foreign keys if ID differs
```

---

### 2. **Users & Authentication** (MIGRATE SECOND)

#### `users`
**Purpose**: All platform users including human users and AI agent users
**Critical Fields**:
- `id`, `email`, `organizationId`, `role`, `userType`
- `fullName`, `isActive`, `passwordHash`

**⚠️ CRITICAL**: Agent users (userType='agent') must be migrated because:
- Agent workflows reference `assignedUserId` from this table
- Each workflow is represented by an agent user

**Action Required**:
```sql
-- Export ALL users for your organization
SELECT * FROM users 
WHERE organizationId = YOUR_ORG_ID 
  AND userType = 'agent'; -- AI agent users for workflows

SELECT * FROM users 
WHERE organizationId = YOUR_ORG_ID 
  AND userType = 'human'; -- Real platform users
```

---

### 3. **Integrations** (CRITICAL - CONTAINS ENCRYPTED CREDENTIALS)

#### `integrations`
**Purpose**: External platform connections (Splynx, Xero, OpenAI, etc.)
**Critical Fields**:
- `id`, `organizationId`, `platformType`, `name`
- `credentialsEncrypted` ⚠️ **ENCRYPTED WITH ENCRYPTION_KEY**
- `connectionConfig`, `isEnabled`

**🔐 SECURITY CRITICAL**:
The `credentialsEncrypted` field contains encrypted API keys, auth tokens, and secrets.
These are encrypted using the `ENCRYPTION_KEY` environment variable.

**Action Required**:
1. **Export integration records** (the encrypted credentials travel with the record):
```sql
SELECT id, organizationId, platformType, name, 
       credentialsEncrypted, connectionConfig, isEnabled
FROM integrations 
WHERE organizationId = YOUR_ORG_ID;
```

2. **CRITICAL**: Ensure production environment has the **SAME `ENCRYPTION_KEY`** as development
   - If keys differ, credentials cannot be decrypted!
   - Add to production secrets: `ENCRYPTION_KEY=a3f2d8e1b4c7f9a2d5e8b1c4f7a2d5e8`

3. Verify each integration after migration:
   - Splynx Integration (platformType='splynx')
   - Xero Integration (platformType='xero')
   - OpenAI Integration (platformType='openai')
   - Any other custom integrations

---

### 4. **Agent Workflows** (CONTAINS ALL AUTOMATION LOGIC)

#### `agent_workflows`
**Purpose**: Stores workflow definitions, steps, triggers, and configuration
**Critical Fields**:
- `id`, `organizationId`, `name`, `description`
- `triggerType`, `triggerConfig`
- `workflowDefinition` ⚠️ **JSONB - Contains all workflow steps**
- `assignedUserId` (references agent users from `users` table)
- `isEnabled`, `lastSuccessfulRunAt`
- `webhookToken` (for webhook-triggered workflows)

**Action Required**:
```sql
-- Export all workflows for your organization
SELECT * FROM agent_workflows 
WHERE organizationId = YOUR_ORG_ID;

-- Verify workflow structure
SELECT id, name, triggerType, isEnabled, 
       assigned_user_id, workflow_definition
FROM agent_workflows;
```

**Key Workflows to Verify**:
- ✅ Splynx customer query → task creation workflows
- ✅ Scheduled data sync workflows
- ✅ Integration-triggered automations
- ✅ Work item generation workflows

#### `agent_workflow_schedules`
**Purpose**: Cron schedules for scheduled workflows
**Critical Fields**:
- `workflowId`, `cronExpression`, `timezone`, `isActive`

**Action Required**:
```sql
SELECT * FROM agent_workflow_schedules 
WHERE workflow_id IN (
  SELECT id FROM agent_workflows WHERE organization_id = YOUR_ORG_ID
);
```

---

### 5. **Menu & Navigation System**

#### `menu_sections`
**Purpose**: Top-level navigation sections
**Critical Fields**:
- `id`, `organizationId`, `name`, `icon`, `orderIndex`
- `isVisible`, `rolePermissions`

#### `menu_items`
**Purpose**: Individual navigation menu items
**Critical Fields**:
- `id`, `organizationId`, `sectionId`, `title`, `path`
- `icon`, `orderIndex`, `isVisible`
- `rolePermissions`, `status`

**Action Required**:
```sql
-- Export menu structure
SELECT * FROM menu_sections WHERE organization_id = YOUR_ORG_ID;
SELECT * FROM menu_items WHERE organization_id = YOUR_ORG_ID;
```

---

### 6. **Pages & Dynamic Content**

#### `pages`
**Purpose**: Dynamic page definitions
**Critical Fields**:
- `id` (UUID), `organizationId`, `slug`, `title`
- `unifiedStatus`, `pageConfig` (JSONB)
- `isPublished`

**Action Required**:
```sql
SELECT * FROM pages 
WHERE organization_id = YOUR_ORG_ID 
  AND unified_status IN ('live', 'dev');
```

---

### 7. **Knowledge Base Documentation**

#### `knowledge_documents`
**Purpose**: Platform help documentation and guides
**Critical Fields**:
- `id`, `organizationId`, `title`, `content`, `summary`
- `categories`, `tags`, `status`, `unifiedStatus`
- `authorId`, `publishedAt`

#### `knowledge_categories`
**Purpose**: Documentation organization
**Critical Fields**:
- `id`, `organizationId`, `name`, `parentId`, `sortOrder`

**Action Required**:
```sql
-- Export published knowledge base
SELECT * FROM knowledge_documents 
WHERE organization_id = YOUR_ORG_ID 
  AND status = 'published';

SELECT * FROM knowledge_categories 
WHERE organization_id = YOUR_ORG_ID;
```

---

### 8. **Platform Features**

#### `platform_features`
**Purpose**: Feature flags and platform capabilities
**Critical Fields**:
- `id`, `name`, `description`, `categoryId`
- `unifiedStatus`, `isEnabled`
- `relatedPageId`

**Action Required**:
```sql
SELECT * FROM platform_features 
WHERE unified_status = 'live';
```

---

### 9. **AI Assistant Configuration**

#### `ai_assistant_config`
**Purpose**: AI assistant system configuration
**Critical Fields**:
- `organizationId`, `apiKey`, `model`, `systemPrompt`
- `maxTokens`, `temperature`, `isEnabled`

#### `ai_assistant_functions`
**Purpose**: Available AI assistant functions
**Critical Fields**:
- `organizationId`, `functionName`, `functionDefinition`
- `isEnabled`, `requiresApproval`

**Action Required**:
```sql
SELECT * FROM ai_assistant_config 
WHERE organization_id = YOUR_ORG_ID;

SELECT * FROM ai_assistant_functions 
WHERE organization_id = YOUR_ORG_ID 
  AND is_enabled = true;
```

---

### 10. **Strategy & OKR Data** (If Using in Production)

#### Key Tables:
- `objectives`
- `key_results`
- `work_items`
- `teams`
- `team_members`

**Action Required**:
Only migrate if you want existing development data in production.
Otherwise, these will be created fresh by users.

---

## 🔐 ENVIRONMENT VARIABLES & SECRETS

### Required in Production `.env` or Replit Secrets:

```bash
# === CRITICAL SECURITY KEYS ===
ENCRYPTION_KEY=a3f2d8e1b4c7f9a2d5e8b1c4f7a2d5e8
# ⚠️ MUST be IDENTICAL to development or credentials won't decrypt!

# === Database (Handled by Replit Automatically) ===
DATABASE_URL=postgresql://...
# Replit automatically provisions production database

# === JWT Authentication ===
JWT_SECRET=your_production_jwt_secret_here
SESSION_SECRET=your_production_session_secret_here

# === External Services (If Used Directly) ===
# Note: Most are stored encrypted in integrations table
OPENAI_API_KEY=sk-...  # If using platform-wide OpenAI
GOOGLE_MAPS_API_KEY=AIza...  # For geocoding

# === Application Settings ===
NODE_ENV=production
PORT=5000
```

---

## 📝 MIGRATION EXECUTION PLAN

### Phase 1: Schema Migration (Automatic)
**Action**: Replit automatically applies schema changes during publish
**What Happens**: 
- Development database schema is applied to production
- Drizzle migrations run automatically
- Tables, columns, indexes created

**Validation**:
```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

### Phase 2: Data Migration (Manual)

#### Option A: Database Pane (Recommended for Small Datasets)
1. Use Replit Database pane to view production database
2. Manually insert critical records via SQL editor
3. Copy data from development queries

#### Option B: Migration Script (Recommended for Large Datasets)
Create a migration script to export/import:

```typescript
// server/scripts/export-production-data.ts
import { db } from './db';
import * as schema from '../shared/schema';

async function exportCriticalData() {
  const orgId = 4; // Your organization ID
  
  // Export organizations
  const orgs = await db.select().from(schema.organizations).where(...);
  
  // Export users (including agent users)
  const users = await db.select().from(schema.users).where(...);
  
  // Export integrations (with encrypted credentials)
  const integrations = await db.select().from(schema.integrations).where(...);
  
  // Export workflows
  const workflows = await db.select().from(schema.agentWorkflows).where(...);
  
  // ... export other critical tables
  
  return {
    organizations: orgs,
    users,
    integrations,
    workflows,
    // ...
  };
}
```

---

### Phase 3: Integration Verification

**After migration, test each integration**:

1. **Splynx Integration**:
   - Test connection from production UI
   - Run a test workflow query
   - Verify task creation works

2. **Xero Integration** (if applicable):
   - Test OAuth connection
   - Verify transaction sync

3. **OpenAI Integration**:
   - Test AI chat
   - Verify function calling works

---

### Phase 4: Workflow Testing

**For each agent workflow**:
1. Navigate to Agents Hub in production
2. Verify workflow appears with correct configuration
3. Test manual execution
4. Verify scheduled workflows are enabled
5. Check webhook URLs if using webhook triggers

---

## 🚨 CRITICAL POST-MIGRATION CHECKS

### 1. Verify Encryption Key
```sql
-- Test credential decryption by running a workflow
-- If you see [object Object] or decryption errors:
-- ❌ ENCRYPTION_KEY mismatch detected!
```

### 2. Verify Agent Users Exist
```sql
SELECT id, email, full_name, user_type, is_active 
FROM users 
WHERE user_type = 'agent' 
  AND organization_id = YOUR_ORG_ID;
```

### 3. Verify Workflow Integration IDs
```sql
-- Check that workflow steps reference correct integration IDs
SELECT id, name, workflow_definition 
FROM agent_workflows 
WHERE organization_id = YOUR_ORG_ID;

-- Look for integrationId fields in workflow_definition JSONB
```

### 4. Test End-to-End Workflow
- Create a test customer query workflow
- Execute manually
- Verify Splynx task created
- Check logs for errors

---

## 📊 DATA TABLES SUMMARY

| Priority | Table Name | Purpose | Records to Migrate |
|----------|-----------|---------|-------------------|
| 🔴 CRITICAL | `organizations` | Tenant data | Your organization record |
| 🔴 CRITICAL | `users` | Users + agent users | All users (especially agent users) |
| 🔴 CRITICAL | `integrations` | API credentials | All enabled integrations |
| 🔴 CRITICAL | `agent_workflows` | Automation logic | All workflows |
| 🟡 HIGH | `agent_workflow_schedules` | Cron schedules | All active schedules |
| 🟡 HIGH | `menu_sections` | Navigation | Your menu structure |
| 🟡 HIGH | `menu_items` | Navigation | Your menu items |
| 🟡 HIGH | `pages` | Dynamic pages | Published pages |
| 🟡 HIGH | `knowledge_documents` | Help docs | Published documentation |
| 🟡 HIGH | `knowledge_categories` | Help categories | All categories |
| 🟡 HIGH | `ai_assistant_config` | AI settings | Your org config |
| 🟡 HIGH | `ai_assistant_functions` | AI functions | Enabled functions |
| 🟢 MEDIUM | `platform_features` | Feature flags | Live features |
| 🟢 MEDIUM | `theme_settings` | UI customization | Your theme |

---

## 🛡️ SECURITY CONSIDERATIONS

### Credentials Storage
- **Development**: Encrypted with ENCRYPTION_KEY
- **Production**: Same ENCRYPTION_KEY required
- **Never**: Store plaintext credentials in code

### Database Access
- Development database: Full access via Replit Agent
- Production database: Manual access only via Database Pane
- Never expose production credentials in logs

### API Keys
- Stored encrypted in `integrations.credentialsEncrypted`
- Decrypt using `WorkflowExecutor.decryptCredentials()`
- Never log decrypted credentials

---

## 🔧 TROUBLESHOOTING

### Issue: Workflows fail with "Integration not found"
**Solution**: Verify `integrations` table populated with correct `organizationId`

### Issue: "[object Object]" in Splynx task fields
**Solution**: This issue has been fixed! Variables now flatten correctly.

### Issue: Credentials decrypt to undefined
**Solution**: `ENCRYPTION_KEY` mismatch. Use identical key in production.

### Issue: Agent user not found
**Solution**: Migrate all users with `userType='agent'` from development

### Issue: Menu items don't appear
**Solution**: Check `menu_items` have correct `organizationId` and `isVisible=true`

---

## ✅ FINAL VALIDATION CHECKLIST

Before going live:
- [ ] All integrations showing "Connected" status
- [ ] Test workflow executes successfully
- [ ] Agent users exist and are active
- [ ] Menu navigation loads correctly
- [ ] Knowledge base articles visible
- [ ] AI assistant responds correctly
- [ ] Splynx task creation works end-to-end
- [ ] No console errors in browser
- [ ] Workflow logs show successful execution
- [ ] All encrypted credentials decrypt properly

---

## 📞 DEPLOYMENT SUPPORT

If issues arise during migration:
1. Check Replit deployment logs
2. Verify environment variables in Secrets
3. Test integration connections individually
4. Review workflow execution logs
5. Validate database foreign key relationships

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-18  
**Platform**: Aimee.works Strategy OS  
**Database**: PostgreSQL (Neon via Replit)
