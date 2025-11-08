# PXC Order Polling Integration - Test Plan

## Test Overview

**Integration:** PXC (TalkTalk Wholesale) Order Polling System  
**Replaces:** Zapier "PXC Order Polling" Workflow  
**Test Environment:** Development (aimee.works platform)  
**Test Date:** October 2025  

## Test Credentials

### PXC API Credentials
**⚠️ IMPORTANT: Never commit real credentials to source control**

Use environment variables or secure secret management:
```
Client ID: [Set via REPLIT_SECRETS or environment variable]
Client Secret: [Set via REPLIT_SECRETS or environment variable]  
Billing Account ID: [Set via REPLIT_SECRETS or environment variable]
```

**For Testing:** Contact system administrator for test credentials

### API Endpoints
- **Auth URL:** https://api.wholesale.talktalk.co.uk/partners/security/v1/api/token
- **Orders URL:** https://api.wholesale.pxc.co.uk/partners/product-order/v3/api/productOrder

---

## Test Scenarios

### 1. Integration Setup Tests

#### Test 1.1: Create PXC Integration
**Objective:** Verify PXC integration can be created and credentials encrypted

**Steps:**
1. Navigate to `/integrations`
2. Click on "Available" tab
3. Find "PXC - TalkTalk Wholesale" card
4. Click on integration card
5. Enter credentials:
   - Client ID: `[YOUR_PXC_CLIENT_ID]`
   - Client Secret: `[YOUR_PXC_CLIENT_SECRET]`
   - Billing Account ID: `[YOUR_BILLING_ACCOUNT_ID]`
6. Click "Save Integration"

**Expected Results:**
- Integration created successfully
- Credentials encrypted and stored in database
- Integration appears in "Active" tab
- Status shows "Active" or "Connected"

**Test Data IDs:**
- Integration ID: [To be noted during test]

---

#### Test 1.2: Import PXC Action Catalog
**Objective:** Verify action catalog import populates integration_actions table

**Steps:**
1. Navigate to integration detail page
2. Click "Import Catalog" button
3. Verify import success message

**Expected Results:**
- Success message: "Imported 3 PXC actions"
- Database verification:
  ```sql
  SELECT * FROM integration_actions WHERE integration_id = <pxc_integration_id>;
  ```
- Should return 3 actions:
  - `authenticate_pxc`
  - `fetch_orders`
  - `get_order_details`

**Database Verification:**
```sql
SELECT action_key, name, category, is_active 
FROM integration_actions 
WHERE integration_id = <integration_id>
ORDER BY action_key;
```

---

### 2. API Authentication Tests

#### Test 2.1: Manual Authentication Test
**Objective:** Test PXC authentication endpoint directly

**Method:** Backend API test using cURL or REST client

**Request:**
```bash
POST https://api.wholesale.talktalk.co.uk/partners/security/v1/api/token
Headers:
  client_id: [YOUR_PXC_CLIENT_ID]
  client_secret: [YOUR_PXC_CLIENT_SECRET]
```

**Expected Response:**
```json
{
  "partnerJWT": "eyJ... [JWT token]",
  "expiresIn": 3600
}
```

**Success Criteria:**
- HTTP 200 OK
- Valid JWT token received
- Token is Bearer-compatible string

---

#### Test 2.2: Integration Action Test (authenticate_pxc)
**Objective:** Test authentication through workflow action handler

**Steps:**
1. Create test agent workflow with single step:
   ```json
   {
     "id": "step-1",
     "type": "integration_action",
     "name": "Test PXC Auth",
     "config": {
       "integrationId": <pxc_integration_id>,
       "action": "authenticate_pxc",
       "resultVariable": "authToken"
     }
   }
   ```
2. Execute workflow manually
3. Review workflow run logs

**Expected Results:**
- Step completes successfully
- Console logs show: `[PXCService] ✓ Authentication successful`
- Result contains `partnerJWT` key
- Token is valid Bearer token

**Log Verification:**
```
[WorkflowExecutor] ▶ WORKFLOW EXECUTION STARTED
[ActionHandlers] 🔧 PXC Action: authenticate_pxc
[PXCService] 🔐 Authenticating with PXC API...
[PXCService] ✓ Authentication successful
[WorkflowExecutor] ✅ SUCCESS
```

---

### 3. Order Fetching Tests

#### Test 3.1: Fetch All Orders (Manual API Call)
**Objective:** Test orders endpoint with authentication token

**Prerequisite:** Valid JWT token from Test 2.1

**Request:**
```bash
GET https://api.wholesale.pxc.co.uk/partners/product-order/v3/api/productOrder
Headers:
  Authorization: Bearer {partnerJWT}
Parameters:
  limit=1000
  fields=id,state,lastUpdate
  offset=0
  billingAccount.id=[YOUR_BILLING_ACCOUNT_ID]
  state=held,inProgress,failed,rejected
```

**Expected Response:**
```json
[
  {
    "id": "ORD123456",
    "state": "inProgress",
    "lastUpdate": "2025-10-09T14:30:00Z"
  },
  ...
]
```

**Success Criteria:**
- HTTP 200 OK
- Array of orders returned
- Each order has `id`, `state`, `lastUpdate` fields

---

#### Test 3.2: Fetch Orders via Workflow Action
**Objective:** Test fetch_orders action through workflow

**Steps:**
1. Create workflow with 2 steps:
   ```json
   [
     {
       "id": "step-1",
       "type": "integration_action",
       "name": "Authenticate",
       "config": {
         "integrationId": <pxc_integration_id>,
         "action": "authenticate_pxc",
         "resultVariable": "partnerJWT"
       }
     },
     {
       "id": "step-2",
       "type": "integration_action",
       "name": "Fetch Orders",
       "config": {
         "integrationId": <pxc_integration_id>,
         "action": "fetch_orders",
         "parameters": {
           "token": "{partnerJWT}",
           "limit": 1000,
           "state": "held,inProgress,failed,rejected"
         },
         "resultVariable": "ordersData"
       }
     }
   ]
   ```
2. Execute workflow
3. Review execution log

**Expected Results:**
- Both steps complete successfully
- Step 2 output contains:
  ```json
  {
    "totalOrders": <number>,
    "todayOrders": <number>,
    "orders": [...],
    "orderIds": [...],
    "categorized": {
      "held": <count>,
      "inProgress": <count>,
      "failed": <count>,
      "rejected": <count>
    }
  }
  ```

**Log Verification:**
```
[WorkflowExecutor] ═══ STEP 2/2 ═══
[ActionHandlers] 🔧 PXC Action: fetch_orders
[PXCService] 📥 Fetching orders with options: {...}
[PXCService] ✓ Fetched <n> orders
[PXCService] 📅 Filtered to <n> orders from today
[PXCService] 📊 Orders by state: {...}
[WorkflowExecutor] ✅ SUCCESS
```

---

### 4. Today's Orders Filtering Test

#### Test 4.1: Verify Today's Orders Filter
**Objective:** Ensure only today's orders are processed

**Steps:**
1. Run fetch_orders workflow
2. Inspect `ordersData.orders` array
3. Verify all orders have `lastUpdate` date = today's date

**Verification Query:**
```javascript
// Check all returned orders
ordersData.orders.forEach(order => {
  const orderDate = new Date(order.lastUpdate).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  console.assert(orderDate === today, `Order ${order.id} is not from today`);
});
```

**Expected Results:**
- All orders in `orders` array have today's date
- `todayOrders` count matches filtered array length
- Console logs show filter count: `Filtered to <n> orders from today (2025-10-09)`

---

### 5. Order Categorization Tests

#### Test 5.1: Verify State Categorization
**Objective:** Test order categorization by state

**Steps:**
1. Run fetch_orders workflow
2. Inspect `ordersData.categorized` object

**Expected Results:**
- Categorized object contains counts:
  ```json
  {
    "held": 5,
    "inProgress": 12,
    "failed": 2,
    "rejected": 1,
    "other": 0
  }
  ```
- Sum of categories = `todayOrders` count
- Separate arrays available:
  - `heldOrders`
  - `inProgressOrders`
  - `failedOrders`
  - `rejectedOrders`

---

### 6. Key Results Update Tests

#### Test 6.1: Create Test Key Results
**Prerequisite:** Setup test objective and key results

**Setup Steps:**
1. Create Objective: "PXC Order Management"
2. Create Key Results:
   - KR1: "PXC Orders Processed Today" (Numeric, target: 100)
   - KR2: "PXC Failed Orders" (Numeric, target: 0)

**Database Setup:**
```sql
INSERT INTO objectives (organization_id, title, description, status)
VALUES (<org_id>, 'PXC Order Management', 'Track PXC order processing', 'Active')
RETURNING id; -- Note this as <objective_id>

INSERT INTO key_results (objective_id, organization_id, title, type, target_value, current_value)
VALUES 
(<objective_id>, <org_id>, 'PXC Orders Processed Today', 'Numeric Target', '100', '0'),
(<objective_id>, <org_id>, 'PXC Failed Orders', 'Numeric Target', '0', '0')
RETURNING id; -- Note these as <kr1_id>, <kr2_id>
```

---

#### Test 6.2: Update Key Result via Workflow
**Objective:** Test strategy_update step updates Key Results

**Steps:**
1. Create 3-step workflow:
   ```json
   [
     {
       "id": "step-1",
       "type": "integration_action",
       "name": "Authenticate",
       "config": {
         "integrationId": <pxc_integration_id>,
         "action": "authenticate_pxc",
         "resultVariable": "partnerJWT"
       }
     },
     {
       "id": "step-2",
       "type": "integration_action",
       "name": "Fetch Orders",
       "config": {
         "integrationId": <pxc_integration_id>,
         "action": "fetch_orders",
         "parameters": { "token": "{partnerJWT}" },
         "resultVariable": "ordersData"
       }
     },
     {
       "id": "step-3",
       "type": "strategy_update",
       "name": "Update Orders Processed KR",
       "config": {
         "type": "key_result",
         "targetId": <kr1_id>,
         "updateType": "set_value",
         "value": "{ordersData.todayOrders}"
       }
     }
   ]
   ```
2. Execute workflow
3. Verify Key Result updated

**Expected Results:**
- Step 3 completes successfully
- Database verification:
  ```sql
  SELECT current_value FROM key_results WHERE id = <kr1_id>;
  ```
- `current_value` matches `todayOrders` from step 2
- Activity log created:
  ```sql
  SELECT * FROM activity_logs 
  WHERE entity_type = 'key_result' AND entity_id = <kr1_id>
  ORDER BY created_at DESC LIMIT 1;
  ```
- Log description: "{Agent Name} performed {Workflow Name}"

---

### 7. Scheduled Workflow Tests

#### Test 7.1: Create Scheduled Workflow
**Objective:** Test hourly schedule execution

**Steps:**
1. Create Agent User: "PXC Sync Agent"
2. Create workflow: "PXC Hourly Order Sync"
3. Configure trigger type: "schedule"
4. Set cron expression: `0 * * * *` (every hour on the hour)
5. Set timezone: UTC
6. Save workflow

**Database Verification:**
```sql
SELECT * FROM agent_workflows WHERE name = 'PXC Hourly Order Sync';
SELECT * FROM agent_workflow_schedules WHERE workflow_id = <workflow_id>;
```

**Expected Results:**
- Workflow created with `trigger_type = 'schedule'`
- Schedule entry created with `cron_expression = '0 * * * *'`
- `next_run_at` calculated correctly
- `is_active = true`

---

#### Test 7.2: Manual Schedule Trigger Test
**Objective:** Test workflow can be triggered manually before scheduled time

**Steps:**
1. Navigate to Agent Builder → Runs tab
2. Find "PXC Hourly Order Sync" workflow
3. Click "Run Now" button
4. Monitor execution

**Expected Results:**
- Workflow run created with `trigger_source = 'manual'`
- All steps execute successfully
- Key Results updated
- Activity log created

---

#### Test 7.3: Verify Schedule Execution (Wait Test)
**Objective:** Confirm workflow runs on schedule

**Note:** This requires waiting for next hour mark

**Steps:**
1. Note current `next_run_at` time from database
2. Wait until that time
3. Check workflow runs table

**Expected Results:**
- New run created at scheduled time
- `trigger_source = 'schedule'`
- `next_run_at` updated to next hour
- Workflow completes successfully

---

### 8. Incremental Fetching Tests

#### Test 8.1: Test Incremental Data Fetching
**Objective:** Verify `lastSuccessfulRunAt` enables incremental fetching

**Steps:**
1. Run workflow once (baseline)
2. Note `lastSuccessfulRunAt` timestamp
3. Wait 5 minutes
4. Run workflow again
5. Check logs for incremental mode

**Expected Logs:**
```
[ActionHandlers] 🔄 Using incremental mode since: 2025-10-09T14:00:00Z
[PXCService] Fetching orders with options: { lastUpdateSince: "2025-10-09T14:00:00Z" }
```

**Expected Results:**
- Second run uses `lastUpdateSince` parameter
- Only orders updated after first run are fetched
- More efficient API usage

---

### 9. Error Handling Tests

#### Test 9.1: Invalid Credentials Test
**Objective:** Verify error handling for invalid credentials

**Steps:**
1. Create test integration with invalid client_secret: `invalid_secret`
2. Try to run authentication workflow
3. Review error logs

**Expected Results:**
- Step fails with error
- Workflow status: "failed"
- Error message: `PXC authentication failed: ...`
- Console logs show retry attempts:
  ```
  [WorkflowExecutor] ⚠️ Step failed (attempt 1/3)
  [WorkflowExecutor] ⏳ Waiting 60s before retry...
  ```
- After 3 retries, workflow marked as failed

---

#### Test 9.2: Network Timeout Test
**Objective:** Test timeout handling

**Note:** Simulate by temporarily blocking network or using invalid URL

**Expected Results:**
- Request times out after 30s (auth) or 60s (orders)
- Error logged with timeout message
- Retry logic executes
- After retries exhausted, workflow fails gracefully

---

### 10. End-to-End Integration Test

#### Test 10.1: Complete PXC Workflow Test
**Objective:** Full end-to-end test of complete workflow

**Workflow Configuration:**
```json
{
  "name": "PXC Hourly Order Sync",
  "description": "Polls PXC API every hour for order updates",
  "triggerType": "schedule",
  "assignedUserId": <pxc_agent_user_id>,
  "triggerConfig": {
    "schedule": "0 * * * *",
    "frequency": "hourly"
  },
  "workflowDefinition": [
    {
      "id": "step-1",
      "type": "integration_action",
      "name": "Authenticate with PXC",
      "config": {
        "integrationId": <pxc_integration_id>,
        "action": "authenticate_pxc",
        "resultVariable": "partnerJWT"
      }
    },
    {
      "id": "step-2",
      "type": "integration_action",
      "name": "Fetch Today's Orders",
      "config": {
        "integrationId": <pxc_integration_id>,
        "action": "fetch_orders",
        "parameters": {
          "token": "{partnerJWT}",
          "limit": 1000,
          "state": "held,inProgress,failed,rejected"
        },
        "resultVariable": "ordersData"
      }
    },
    {
      "id": "step-3",
      "type": "strategy_update",
      "name": "Update Orders Processed KR",
      "config": {
        "type": "key_result",
        "targetId": <kr1_id>,
        "updateType": "set_value",
        "value": "{ordersData.todayOrders}"
      }
    },
    {
      "id": "step-4",
      "type": "strategy_update",
      "name": "Update Failed Orders KR",
      "config": {
        "type": "key_result",
        "targetId": <kr2_id>,
        "updateType": "set_value",
        "value": "{ordersData.categorized.failed}"
      }
    },
    {
      "id": "step-5",
      "type": "log_event",
      "name": "Log Completion",
      "config": {
        "message": "PXC sync completed. Processed {ordersData.todayOrders} orders."
      }
    }
  ]
}
```

**Execution Steps:**
1. Create workflow with above configuration
2. Execute manually
3. Verify each step completes
4. Check all outputs and updates

**Success Criteria:**
- All 5 steps complete successfully
- Authentication successful
- Orders fetched and filtered
- Both Key Results updated correctly
- Activity logs created for both KR updates
- Execution log shows complete flow
- Total duration < 10 seconds
- No errors or retries needed

**Database Verification:**
```sql
-- Check workflow run
SELECT * FROM agent_workflow_runs 
WHERE workflow_id = <workflow_id> 
ORDER BY started_at DESC LIMIT 1;

-- Check Key Results updated
SELECT id, title, current_value, updated_at 
FROM key_results 
WHERE id IN (<kr1_id>, <kr2_id>);

-- Check activity logs
SELECT * FROM activity_logs 
WHERE entity_type = 'key_result' 
AND entity_id IN (<kr1_id>, <kr2_id>)
ORDER BY created_at DESC;
```

---

## Test Results Template

### Test Execution Log

| Test ID | Test Name | Status | Duration | Notes |
|---------|-----------|--------|----------|-------|
| 1.1 | Create PXC Integration | ☐ Pass ☐ Fail | | |
| 1.2 | Import Action Catalog | ☐ Pass ☐ Fail | | |
| 2.1 | Manual Auth Test | ☐ Pass ☐ Fail | | |
| 2.2 | Workflow Auth Test | ☐ Pass ☐ Fail | | |
| 3.1 | Manual Fetch Orders | ☐ Pass ☐ Fail | | |
| 3.2 | Workflow Fetch Orders | ☐ Pass ☐ Fail | | |
| 4.1 | Today's Filter Test | ☐ Pass ☐ Fail | | |
| 5.1 | State Categorization | ☐ Pass ☐ Fail | | |
| 6.1 | Create Test KRs | ☐ Pass ☐ Fail | | |
| 6.2 | Update KR via Workflow | ☐ Pass ☐ Fail | | |
| 7.1 | Create Scheduled Workflow | ☐ Pass ☐ Fail | | |
| 7.2 | Manual Trigger Test | ☐ Pass ☐ Fail | | |
| 7.3 | Schedule Execution Test | ☐ Pass ☐ Fail | | |
| 8.1 | Incremental Fetch Test | ☐ Pass ☐ Fail | | |
| 9.1 | Invalid Credentials Test | ☐ Pass ☐ Fail | | |
| 9.2 | Network Timeout Test | ☐ Pass ☐ Fail | | |
| 10.1 | End-to-End Test | ☐ Pass ☐ Fail | | |

---

## Console Log Verification Checklist

### Expected Console Output Pattern

For successful workflow execution, verify these log patterns appear:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WorkflowExecutor] ▶ WORKFLOW EXECUTION STARTED
  Workflow ID: <id>
  Workflow Name: PXC Hourly Order Sync
  Organization ID: <org_id>
  Trigger Source: manual/schedule
  Agent User: PXC Sync Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[WorkflowExecutor] ═══ STEP 1/5 ═══
[WorkflowExecutor]   Name: Authenticate with PXC
[WorkflowExecutor]   Type: integration_action
[ActionHandlers] 🔧 PXC Action: authenticate_pxc
[PXCService] 🔐 Authenticating with PXC API...
[PXCService] ✓ Authentication successful
[WorkflowExecutor]   ⏱️ Duration: <ms>ms
[WorkflowExecutor]   ✅ SUCCESS

[WorkflowExecutor] ═══ STEP 2/5 ═══
[WorkflowExecutor]   Name: Fetch Today's Orders
[WorkflowExecutor]   Type: integration_action
[ActionHandlers] 🔧 PXC Action: fetch_orders
[PXCService] 📥 Fetching orders with options: {...}
[PXCService] ✓ Fetched <n> orders
[PXCService] 📅 Filtered to <n> orders from today (2025-10-09)
[PXCService] 📊 Orders by state: {...}
[WorkflowExecutor]   ⏱️ Duration: <ms>ms
[WorkflowExecutor]   ✅ SUCCESS

[WorkflowExecutor] ═══ STEP 3/5 ═══
[WorkflowExecutor]   Name: Update Orders Processed KR
[WorkflowExecutor]   Type: strategy_update
[WorkflowExecutor]   🔄 Variable substitution: {ordersData.todayOrders} → <value>
[WorkflowExecutor] Updating key_result <id> with value: <value>
[WorkflowExecutor] ✓ Activity log created: "PXC Sync Agent performed PXC Hourly Order Sync"
[WorkflowExecutor]   ⏱️ Duration: <ms>ms
[WorkflowExecutor]   ✅ SUCCESS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WorkflowExecutor] ✅ WORKFLOW COMPLETED SUCCESSFULLY
  Workflow ID: <id>
  Run ID: <run_id>
  Duration: <ms>ms
  Steps Completed: 5/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Performance Benchmarks

| Operation | Target Duration | Acceptable Range |
|-----------|----------------|------------------|
| Authentication | < 2s | 1-3s |
| Fetch Orders (100 orders) | < 5s | 3-8s |
| Fetch Orders (1000 orders) | < 10s | 8-15s |
| Update Single KR | < 200ms | 100-500ms |
| Complete 5-step Workflow | < 10s | 8-20s |

---

## Troubleshooting Guide

### Issue: Authentication Fails

**Error:** `PXC authentication failed: 401 Unauthorized`

**Solutions:**
1. Verify credentials are correct in database
2. Check credentials_encrypted field is properly decrypted
3. Verify PXC API endpoint is accessible
4. Check client_id and client_secret headers are sent correctly

**Debug Query:**
```sql
SELECT id, platform_type, credentials_encrypted 
FROM integrations 
WHERE platform_type = 'pxc';
```

---

### Issue: No Orders Returned

**Error:** `Fetched 0 orders`

**Solutions:**
1. Verify billing_account_id is correct
2. Check state filter includes expected states
3. Verify JWT token is valid and not expired
4. Check date filter (today's date in UTC)

**Debug Steps:**
- Try manual API call with token
- Check PXC API status
- Verify billing account has orders

---

### Issue: Key Result Not Updating

**Error:** `Key Result <id> not found` or value not changing

**Solutions:**
1. Verify Key Result ID exists:
   ```sql
   SELECT * FROM key_results WHERE id = <id>;
   ```
2. Check variable substitution in logs
3. Verify workflow has correct KR ID in config
4. Check user has permission to update KR

---

### Issue: Scheduled Workflow Not Running

**Symptoms:** No new runs appearing at scheduled time

**Solutions:**
1. Verify schedule is active:
   ```sql
   SELECT * FROM agent_workflow_schedules WHERE is_active = true;
   ```
2. Check `next_run_at` is in the future
3. Verify ScheduleManager is running
4. Check server logs for scheduler errors
5. Restart workflow: update `next_run_at` to now

---

## Sign-Off Checklist

- [ ] All test scenarios executed
- [ ] All tests passed
- [ ] Performance benchmarks met
- [ ] Error handling verified
- [ ] Scheduled execution confirmed
- [ ] Key Results updating correctly
- [ ] Activity logs capturing agent actions
- [ ] Console logs showing correct flow
- [ ] Database records verified
- [ ] No memory leaks observed
- [ ] Production credentials secured
- [ ] Documentation complete

---

## Test Conducted By

**Name:** _________________  
**Date:** _________________  
**Environment:** Development  
**Build Version:** _________________  

**Overall Result:** ☐ PASS ☐ FAIL

**Notes:**
