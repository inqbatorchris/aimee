# Finance & OKR Analysis User Journeys

## Overview
This document maps out all user journeys for the Chart of Accounts and OKR Financial Analysis system, covering initial setup through daily operations and strategic analysis.

---

## JOURNEY 1: Initial Setup & Configuration

### 1.1 Xero Connection Setup
**Goal**: Connect the platform to Xero accounting system

**Steps**:
1. Navigate to `/integrations/xero`
2. Click "Connect to Xero" button
3. Complete OAuth authentication with Xero
4. Select organization from Xero
5. Verify connection status shows "Connected"

**Expected Outcome**: Green "Connected" badge with last sync timestamp

**Test Scenarios**:
- ✅ Fresh connection with no existing data
- ✅ Reconnection after token expiry
- ❌ OAuth failure (incorrect credentials)
- ❌ Network timeout during connection

---

### 1.2 Import Chart of Accounts
**Goal**: Sync all Xero accounts into the platform

**Steps**:
1. Navigate to `/finance/chart-of-accounts`
2. Click "Sync from Xero" button
3. Wait for sync completion (progress indicator)
4. Verify accounts appear in table

**Expected Outcome**: 
- All Xero accounts imported with code, name, type, class, status
- Toast notification: "Successfully synced X accounts from Xero"

**Test Scenarios**:
- ✅ Initial import with 0 existing accounts
- ✅ Re-sync with existing accounts (updates)
- ✅ Large account list (100+ accounts with pagination)
- ❌ Xero API unavailable
- ❌ No Xero connection established

---

## JOURNEY 2: Profit Center Management

### 2.1 Create Profit Center with Full Configuration
**Goal**: Set up a new profit center linked to OKR and Xero

**Steps**:
1. Navigate to `/finance/profit-centers`
2. Click "Create Profit Center" button
3. Enter profit center details:
   - **Name**: e.g., "South West Region"
   - **Type**: Select "Geographic Zone"
   - **Description**: e.g., "Covers Devon, Cornwall, Somerset"
4. **OKR Linkage** (MANDATORY):
   - Select Link Type: "Objective" / "Key Result" / "Task"
   - Select specific entity from dropdown
5. **Xero Integration** (OPTIONAL):
   - Select Xero account from Chart of Accounts
6. Click "Save"

**Expected Outcome**:
- Profit center appears in table
- Badge shows OKR linkage type and entity name
- Xero account displayed if mapped
- Toast: "Profit center created successfully"

**Test Scenarios**:
- ✅ Create with objective linkage only
- ✅ Create with key result linkage only
- ✅ Create with task linkage only
- ✅ Create with Xero account mapping
- ✅ Create without Xero account (optional field)
- ❌ Save without OKR linkage (validation error)
- ❌ Save without name (validation error)

---

### 2.2 Edit Existing Profit Center
**Goal**: Update profit center configuration

**Steps**:
1. Navigate to `/finance/profit-centers`
2. Find profit center in table
3. Click "Edit" button (pencil icon)
4. Modify any fields:
   - Change OKR linkage type/entity
   - Update Xero account mapping
   - Edit name or description
5. Click "Save"

**Expected Outcome**:
- Dialog pre-populates with existing values
- OKR selector shows correct current linkage
- Changes persist after save
- Toast: "Profit center updated successfully"

**Test Scenarios**:
- ✅ Change from objective to key result linkage
- ✅ Change from key result to task linkage
- ✅ Update Xero account mapping
- ✅ Remove Xero account mapping (set to empty)
- ✅ Edit task-linked center (verify 'task' ↔ 'key_result_task' mapping works)
- ❌ Remove OKR linkage entirely (should fail validation)

---

### 2.3 Delete Profit Center
**Goal**: Remove an unused profit center

**Steps**:
1. Navigate to `/finance/profit-centers`
2. Click "Delete" button (trash icon)
3. Confirm deletion in dialog
4. Verify removal from table

**Expected Outcome**:
- Confirmation dialog appears
- Profit center removed after confirmation
- Toast: "Profit center deleted successfully"

**Test Scenarios**:
- ✅ Delete profit center with no transactions
- ⚠️ Delete profit center with associated transactions (should warn or prevent)

---

## JOURNEY 3: Transaction Management & Categorization

### 3.1 View Transactions with Filters
**Goal**: Find specific transactions using various filters

**Steps**:
1. Navigate to `/finance/transactions`
2. Apply filters:
   - **Date Range**: From/To dates
   - **Account Code**: Filter by specific Xero account
   - **Account Type**: Revenue/Expense/Asset/Liability/Equity
   - **OKR Filters**:
     - By Objective
     - By Key Result
     - By Task
   - **Profit Center**: Select specific center
3. View filtered results

**Expected Outcome**:
- Table updates to show matching transactions
- Transaction count reflects filters
- All filters work independently and in combination

**Test Scenarios**:
- ✅ Filter by date range only
- ✅ Filter by account type (Revenue)
- ✅ Filter by specific objective
- ✅ Filter by key result
- ✅ Filter by task
- ✅ Combine multiple filters (date + OKR + account type)
- ✅ Clear all filters

---

### 3.2 Categorize Transactions to Profit Centers
**Goal**: Link transactions to profit centers for accurate tracking

**Steps**:
1. Navigate to `/finance/transactions`
2. Find uncategorized transaction
3. Click "Categorize" or edit button
4. Select profit center from dropdown
5. Save categorization

**Expected Outcome**:
- Transaction shows linked profit center
- Badge displays profit center name
- Financial metrics update in real-time

**Test Scenarios**:
- ✅ Categorize single transaction
- ✅ Bulk categorize multiple transactions
- ✅ Re-categorize (change profit center)
- ✅ Remove categorization

---

### 3.3 Backfill Historical Transaction Account Codes
**Goal**: Extract account codes from Xero metadata for old transactions

**Steps**:
1. Access backfill endpoint: `POST /api/finance/transactions/backfill`
2. System processes all transactions missing account codes
3. Extracts codes from `xeroMetadata.lineItems[].accountCode`
4. Updates transaction records

**Expected Outcome**:
- Response shows: `{updated: X, skipped: Y, errors: Z}`
- Historical transactions now filterable by account code

**Test Scenarios**:
- ✅ Backfill with 100+ historical transactions
- ✅ Backfill with no data to process (0 updated)
- ❌ Handle malformed metadata gracefully

---

## JOURNEY 4: OKR Financial Analysis

### 4.1 View Hierarchical Financial Metrics
**Goal**: Analyze financial performance across OKR hierarchy

**Steps**:
1. Navigate to `/finance/okr-analysis`
2. Set date range (From/To dates)
3. View summary cards:
   - Total Revenue
   - Total Expenses
   - Net Profit
   - Number of Objectives
4. Expand objectives to see:
   - Objective-level metrics
   - Key results under each objective
   - Tasks under each key result
5. Click expand icons to drill down

**Expected Outcome**:
- **Summary Cards**: Show aggregated totals across all objectives
- **Objective Row**: Shows rolled-up metrics from all child KRs/tasks
- **Key Result Row**: Shows rolled-up metrics from all child tasks
- **Task Row**: Shows actual transaction metrics
- All currency values in GBP (£)

**Test Scenarios**:
- ✅ View with no profit centers linked (shows £0.00)
- ✅ View with single objective linked
- ✅ View with full hierarchy (objectives → KRs → tasks)
- ✅ Verify roll-up calculations:
  - Task totals = sum of task transactions
  - KR totals = sum of child task totals
  - Objective totals = sum of child KR totals
- ✅ Filter by date range (verify metrics change)
- ✅ Expand/collapse hierarchy

---

### 4.2 Drill-Down Analysis
**Goal**: Investigate specific financial performance areas

**Steps**:
1. Start at `/finance/okr-analysis`
2. Identify objective with unexpected metrics
3. Expand to view key results
4. Expand specific key result to view tasks
5. Click on task to view associated transactions
6. Navigate to `/finance/transactions` filtered by that task

**Expected Outcome**:
- Seamless navigation from summary to detail
- Transaction-level visibility for investigation
- Ability to trace revenue/expense to source

**Test Scenarios**:
- ✅ Drill from objective → KR → task → transactions
- ✅ Verify transaction counts match across views
- ✅ Verify monetary values match across views

---

## JOURNEY 5: End-to-End Strategic Finance Workflow

### 5.1 Complete Finance Setup & Analysis
**Goal**: Full workflow from setup to strategic insights

**Steps**:
1. **Setup** (one-time):
   - Connect Xero (`/integrations/xero`)
   - Import Chart of Accounts (`/finance/chart-of-accounts`)
   
2. **Configuration**:
   - Create profit centers for business segments (`/finance/profit-centers`)
   - Link each to strategic OKRs (objectives/KRs/tasks)
   - Map to Xero accounts where applicable
   
3. **Operational**:
   - Transactions sync automatically from Xero
   - Review and categorize transactions (`/finance/transactions`)
   - Use filters to find uncategorized items
   
4. **Strategic Analysis**:
   - Review OKR financial performance (`/finance/okr-analysis`)
   - Identify high/low performing objectives
   - Drill down to task level for details
   
5. **Continuous Improvement**:
   - Adjust profit center OKR linkages based on strategy changes
   - Re-categorize transactions as needed
   - Monitor trends over time (date range filters)

**Expected Outcome**:
- Clear visibility: Strategy (OKRs) → Operations (Transactions) → Results (Metrics)
- No double-counting (each profit center links to exactly ONE OKR)
- Automated transaction categorization via Xero account mapping
- Real-time financial metrics per strategic initiative

---

## JOURNEY 6: Error Handling & Edge Cases

### 6.1 Handle Missing Prerequisites
**Scenarios to Test**:
- ❌ Access `/finance/profit-centers` before Xero connection
- ❌ Access `/finance/chart-of-accounts` before sync
- ❌ Create profit center with no OKRs in system
- ❌ Select Xero account that was deleted in Xero

**Expected Behavior**:
- Graceful error messages
- Clear guidance on required actions
- No data loss
- Recovery paths available

---

### 6.2 Handle API Failures
**Scenarios to Test**:
- ❌ Xero API rate limit exceeded
- ❌ Xero API timeout during sync
- ❌ Network interruption during save
- ❌ Invalid Xero token (expired)

**Expected Behavior**:
- User-friendly error messages (no technical jargon)
- Retry mechanisms for transient failures
- Clear instructions for resolution
- System state remains consistent

---

### 6.3 Handle Data Inconsistencies
**Scenarios to Test**:
- ⚠️ Profit center linked to deleted OKR
- ⚠️ Transaction references deleted profit center
- ⚠️ Xero account deleted but still mapped
- ⚠️ Duplicate Chart of Accounts entries

**Expected Behavior**:
- Validation prevents orphaned references
- Cascade delete or warning dialogs
- Data integrity maintained
- Audit trail of changes

---

## JOURNEY 7: Performance & Scalability

### 7.1 Large Dataset Handling
**Scenarios to Test**:
- ✅ Import 500+ Chart of Accounts entries
- ✅ 50+ profit centers with complex OKR links
- ✅ 10,000+ transactions with filters
- ✅ OKR hierarchy with 5+ levels deep

**Expected Behavior**:
- Pagination for large lists
- Efficient queries (no N+1 problems)
- Loading states for slow operations
- Responsive UI under load

---

## CRITICAL TEST CHECKLIST

### Before Production Release:
- [ ] **Journey 1**: Xero connection + Chart of Accounts import
- [ ] **Journey 2.1**: Create profit center with each OKR type (objective/KR/task)
- [ ] **Journey 2.2**: Edit profit center and verify task mapping works
- [ ] **Journey 3.1**: Apply all transaction filters
- [ ] **Journey 4.1**: Verify hierarchical roll-up calculations
- [ ] **Journey 5.1**: Complete end-to-end workflow
- [ ] **Journey 6**: Test error scenarios
- [ ] **Bug Fix Verification**: Create/edit profit center with task linkage (verify 'task' ↔ 'key_result_task' mapping)

### Regression Testing:
- [ ] Existing finance features (Dashboard, Transactions) still work
- [ ] Navigation menu shows all finance pages
- [ ] Role-based access control enforced
- [ ] Multi-tenant isolation verified
- [ ] Currency always displays as GBP (£)

---

## KNOWN ISSUES & FIXES

### ✅ Fixed: SelectItem Empty Value Bug
**Issue**: `<SelectItem value="">None</SelectItem>` caused runtime error  
**Fix**: Removed empty value option from Xero account selector  
**Status**: RESOLVED

### ✅ Fixed: Frontend-Backend OKR Type Mapping
**Issue**: Frontend used `'key_result_task'` but backend expected `'task'`  
**Fix**: Bidirectional mapping in save/edit flows  
**Status**: RESOLVED

---

## MANUAL TESTING GUIDE

Since automated testing is blocked by authentication, follow this manual test sequence:

1. **Login** as admin user
2. **Run Journey 1.1 & 1.2** (Xero setup + import)
3. **Run Journey 2.1** for each OKR type:
   - Create profit center linked to objective
   - Create profit center linked to key result  
   - Create profit center linked to task ⚠️ (test critical bug fix)
4. **Run Journey 2.2** (Edit task-linked profit center)
5. **Run Journey 4.1** (Verify hierarchical analysis)
6. **Verify** all calculations match expected values

---

## NEXT STEPS

1. **Navigation Menu**: Add menu items via Menu Builder:
   - Chart of Accounts → `/finance/chart-of-accounts`
   - OKR Analysis → `/finance/okr-analysis`

2. **Manual Testing**: Follow critical test checklist

3. **User Training**: Document operational workflows

4. **Monitoring**: Set up alerts for:
   - Xero sync failures
   - Uncategorized transaction threshold
   - OKR linkage gaps
