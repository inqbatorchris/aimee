# 🚀 AI Chat Implementation Plan - APPROVED SCOPE
**Date:** October 20, 2025  
**Status:** Ready for Implementation

---

## 🎯 CONFIRMED REQUIREMENTS

Based on project lead approval:

### AI Behavior Specifications
- ✅ **Wait for user requests** - No proactive suggestions
- ✅ **Step-by-step function chains** - Execute functions sequentially, not as compound actions
- ✅ **Show errors with suggested fixes** - Don't hide problems, help users recover
- ✅ **Strict validation** - Catch issues before database writes (safer approach)
- ✅ **Forever chat retention** - Never auto-delete conversation history

### Core Scope
1. Auto-execute read-only functions (list_objectives, list_key_results, list_key_result_tasks)
2. Require approval for write operations (create, update, complete)
3. Create complete OKR structures with all required database fields populated
4. Step-by-step execution with clear user feedback at each stage

---

## 🔴 WEEK 1: CRITICAL BUG FIXES (16 hours)

### Task 1.1: Fix Empty Response Bug (4 hours)
**File:** `server/routes/ai-chat.ts`
**Priority:** P0 - BLOCKING

**Problem:** When AI proposes write actions, response content is empty, blocking approval UI.

**Solution:**
```typescript
// Add after line 481 (after getting assistantMessage)
let messageContent = assistantMessage.content || '';

// If AI made a function call but provided no explanation, generate one
if (!messageContent && assistantMessage.function_call) {
  messageContent = generateActionPreview(
    assistantMessage.function_call.name,
    JSON.parse(assistantMessage.function_call.arguments)
  );
}

// Update line 572 to use messageContent instead
const aiMessageData: InsertAIChatMessage = {
  sessionId,
  organizationId: req.user.organizationId,
  role: 'assistant',
  content: messageContent,  // ✅ Never empty now
  functionCall: assistantMessage.function_call || null,
  modelUsed: config?.defaultModel || 'gpt-4',
  tokensUsed: completion.usage?.total_tokens || 0,
  executionTime,
};
```

**Implementation:**
```typescript
function generateActionPreview(functionName: string, args: any): string {
  switch (functionName) {
    case 'create_objective':
      return `📊 I'll create this objective:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
🎯 Target Date: ${new Date(args.targetDate).toLocaleDateString()}
👤 Owner: ${args.ownerId ? 'Assigned' : 'You'}

${args.keyResults?.length ? `This will include ${args.keyResults.length} key result(s).` : 'You can add key results after creation.'}`;

    case 'create_key_result':
      return `📈 I'll add this key result:

**${args.title}**
📊 Target: ${args.currentValue || 0} → ${args.targetValue} ${args.unit || ''}
📏 Measurement: ${args.kpiType || 'Manual tracking'}`;

    case 'create_task':
      return `✅ I'll create this task:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
${args.assignedTo ? '👤 Will be assigned\n' : ''}
${args.dueDate ? `📅 Due: ${new Date(args.dueDate).toLocaleDateString()}` : ''}`;

    case 'update_objective':
      return `🔄 I'll update the objective with these changes:
${Object.keys(args).filter(k => k !== 'id').map(k => `• ${k}: ${args[k]}`).join('\n')}`;

    case 'update_key_result':
      return `📊 I'll update the key result:
${Object.keys(args).filter(k => k !== 'id').map(k => `• ${k}: ${args[k]}`).join('\n')}`;

    case 'complete_task':
      return `✅ I'll mark task #${args.taskId} as completed.`;

    default:
      return `⚡ I'm proposing to execute: ${functionName}`;
  }
}
```

**Testing:**
```
✅ User: "create objective to improve customer satisfaction"
✅ AI response shows rich preview with title, date, owner
✅ Approval UI appears with [Approve] [Reject] buttons
✅ No empty messages in database
```

---

### Task 1.2: Add Input Validation (8 hours)
**File:** `server/routes/ai-chat.ts`
**Priority:** P0 - DATA INTEGRITY

**Problem:** Functions don't validate AI-generated parameters before database writes.

**Solution:** Add Zod schemas for every function payload.

**Implementation:**
```typescript
import { z } from 'zod';

// Add validation schemas
const CreateObjectiveSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().optional(),
  targetDate: z.string().datetime('Invalid date format'),
  ownerId: z.number().int().positive().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'cancelled']).optional(),
});

const CreateKeyResultSchema = z.object({
  objectiveId: z.number().int().positive('Invalid objective ID'),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  kpiType: z.string().min(1, 'KPI type required'),
  currentValue: z.number().optional(),
  targetValue: z.number('Target value required'),
  unit: z.string().optional(),
  deadline: z.string().datetime().optional(),
});

const CreateTaskSchema = z.object({
  keyResultId: z.number().int().positive('Invalid key result ID'),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const UpdateObjectiveSchema = z.object({
  id: z.number().int().positive('Invalid objective ID'),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'cancelled']).optional(),
  progress: z.number().min(0).max(100).optional(),
});

const CompleteTaskSchema = z.object({
  taskId: z.number().int().positive('Invalid task ID'),
});

// Update function implementations
async function createObjective(payload: any, user: any): Promise<any> {
  // ✅ Validate before execution
  const validated = CreateObjectiveSchema.parse(payload);
  
  const objective = await storage.createObjective({
    organizationId: user.organizationId,
    title: validated.title,
    description: validated.description || null,
    targetDate: new Date(validated.targetDate),
    ownerId: validated.ownerId || user.id,
    createdBy: user.id,
    status: validated.status || 'not_started',
    progress: 0,
  });

  return {
    success: true,
    objective,
    message: `Created objective: ${objective.title}`,
  };
}

async function createKeyResult(payload: any, user: any): Promise<any> {
  const validated = CreateKeyResultSchema.parse(payload);
  
  // Verify objective exists and user has access
  const objective = await storage.getObjective(validated.objectiveId);
  if (!objective || objective.organizationId !== user.organizationId) {
    throw new Error('Objective not found or access denied');
  }

  const keyResult = await storage.createKeyResult({
    organizationId: user.organizationId,
    objectiveId: validated.objectiveId,
    title: validated.title,
    description: validated.description || null,
    kpiType: validated.kpiType,
    currentValue: validated.currentValue || 0,
    targetValue: validated.targetValue,
    unit: validated.unit || '',
    deadline: validated.deadline ? new Date(validated.deadline) : null,
    createdBy: user.id,
  });

  return {
    success: true,
    keyResult,
    message: `Created key result: ${keyResult.title}`,
  };
}

async function createTask(payload: any, user: any): Promise<any> {
  const validated = CreateTaskSchema.parse(payload);
  
  const task = await storage.createTask({
    organizationId: user.organizationId,
    keyResultId: validated.keyResultId,
    title: validated.title,
    description: validated.description || null,
    assignedTo: validated.assignedTo || user.id,
    dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
    priority: validated.priority || 'medium',
    createdBy: user.id,
    status: 'pending',
  });

  return {
    success: true,
    task,
    message: `Created task: ${task.title}`,
  };
}

async function completeTask(payload: any, user: any): Promise<any> {
  const validated = CompleteTaskSchema.parse(payload);
  
  const task = await storage.updateTask(validated.taskId, {
    status: 'completed',
    completedAt: new Date(),
    completedBy: user.id,
  });

  return {
    success: true,
    task,
    message: `Completed task: ${task.title}`,
  };
}
```

**Error Handling Wrapper:**
```typescript
async function executeAction(action: any, user: any): Promise<any> {
  const { actionType, actionPayload } = action;

  try {
    switch (actionType) {
      case 'create_objective':
        return await createObjective(actionPayload, user);
      
      case 'create_key_result':
        return await createKeyResult(actionPayload, user);
      
      case 'create_task':
        return await createTask(actionPayload, user);
      
      case 'complete_task':
        return await completeTask(actionPayload, user);
      
      // ... other cases
      
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  } catch (error: any) {
    // ✅ Return structured error with fix suggestions
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${issues}. Please check the data and try again.`);
    }
    
    // Re-throw with user-friendly message
    throw new Error(`Action failed: ${error.message}. ${getSuggestionForError(error)}`);
  }
}

function getSuggestionForError(error: any): string {
  if (error.message.includes('not found')) {
    return 'Try listing the available items first to get valid IDs.';
  }
  if (error.message.includes('access denied')) {
    return 'You may not have permission for this action.';
  }
  if (error.message.includes('date')) {
    return 'Make sure dates are in YYYY-MM-DD format.';
  }
  return 'Please try rephrasing your request or contact support.';
}
```

**Testing:**
```
✅ Invalid title: AI proposes title with 1 char → Validation catches → User sees "Title must be at least 3 characters"
✅ Invalid date: AI proposes malformed date → Validation catches → Error with suggestion
✅ Missing required field: AI forgets targetValue → Validation catches → Clear error message
✅ Valid data: All fields correct → Passes validation → Creates successfully
```

---

### Task 1.3: Improve Error Handling for Auto-Execute (2 hours)
**File:** `server/routes/ai-chat.ts:561-564`
**Priority:** P1 - USER EXPERIENCE

**Problem:** When read-only functions fail, user sees nothing.

**Solution:**
```typescript
// Replace lines 561-564
} catch (error: any) {
  console.error('Error auto-executing function:', error);
  
  // ✅ Provide helpful error message to user
  assistantMessage = {
    role: 'assistant',
    content: `⚠️ I tried to fetch that information but encountered an error:

**Error:** ${error.message}

**What you can try:**
${error.message.includes('not found') ? '• Check if any objectives/key results exist\n• Try creating one first' : ''}
${error.message.includes('permission') ? '• You may need higher permissions for this action' : ''}
• Refresh the page and try again
• Let me know if you need help with something else

Would you like me to help you in a different way?`,
  };
  
  // Update stats to show failed attempt
  const functionRecord = await db.query.aiAssistantFunctions.findFirst({
    where: and(
      eq(aiAssistantFunctions.organizationId, req.user.organizationId),
      eq(aiAssistantFunctions.functionName, functionName)
    )
  });
  
  if (functionRecord) {
    await db.update(aiAssistantFunctions)
      .set({
        totalCalls: (functionRecord.totalCalls || 0) + 1,
        failedCalls: (functionRecord.failedCalls || 0) + 1,
        lastCalledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiAssistantFunctions.id, functionRecord.id));
  }
}
```

**Testing:**
```
✅ Database error during list_objectives → User sees friendly error message
✅ Permission denied → User sees "may need higher permissions" 
✅ Network timeout → User sees "try again" suggestion
✅ Error doesn't crash chat → User can continue conversation
```

---

### Task 1.4: Update System Prompt for Strict Behavior (2 hours)
**File:** `server/routes/ai-chat.ts:661-742`
**Priority:** P1 - BEHAVIOR ALIGNMENT

**Problem:** Current prompt encourages proactive behavior, doesn't enforce step-by-step chains.

**Solution:**
```typescript
async function buildSystemPrompt(user: any, session: any, config: any): Promise<string> {
  const personalityName = config?.personalityName || 'Aimee';

  let prompt = `You are ${personalityName}, an AI assistant for aimee.works Strategy OS.

🎯 CORE BEHAVIOR RULES:
1. **WAIT for user requests** - Never proactively suggest actions unless asked
2. **STEP-BY-STEP execution** - Execute one function at a time, wait for approval
3. **STRICT validation** - All data must be complete and correctly formatted
4. **SHOW errors clearly** - When something fails, explain what happened and how to fix it

📊 RESPONSE GUIDELINES:
- Answer questions directly with specific data
- Use natural language with structure (bullets, emojis: 📊 ✅ ⚠️)
- Show actual numbers and metrics when available
- Keep responses concise and actionable

🔧 FUNCTION EXECUTION:
**READ functions** (auto-execute, no approval needed):
• list_objectives - Fetch all objectives with progress
• list_key_results - Fetch key results for objective
• list_key_result_tasks - Fetch tasks for key result

**WRITE functions** (require user approval):
• create_objective - Create new objective
• create_key_result - Add key result to objective
• create_task - Add task to key result
• update_objective - Modify objective details
• update_key_result - Update KR progress
• update_task - Modify task
• complete_task - Mark task done

⚠️ IMPORTANT - Step-by-Step Approach:
When creating complex structures (e.g., "Create objective with 3 key results"):
1. FIRST: Propose creating the objective
2. WAIT for approval and execution
3. THEN: Propose creating first key result
4. WAIT for approval
5. Continue one at a time

❌ DON'T propose multiple actions at once
❌ DON'T be proactive with suggestions
❌ DON'T skip validation steps

✅ GOOD Example:
User: "Create objective to reach 100 customers with 3 KRs"
You: "I'll create the objective first:

📊 **Reach 100 Customers**
🎯 Target Date: [derive from context or ask]
👤 Owner: You

After this is created, I can add the 3 key results one by one."

❌ BAD Example:
User: "Create objective to reach 100 customers"
You: "Great goal! I also suggest adding key results for customer acquisition, retention, and satisfaction. Would you like me to propose those too?"

📋 DATA REQUIREMENTS:
When creating objectives/KRs/tasks, ALWAYS include:
- Objective: title, targetDate, ownerId (default to current user), status
- Key Result: title, objectiveId, kpiType, targetValue, unit
- Task: title, keyResultId, assignedTo (default to current user)

Current Context:
- User: ${user.fullName || user.email} (${user.role})
- Organization ID: ${user.organizationId}
- Page: ${session.pageContext || 'Unknown'}
- Date: ${new Date().toLocaleDateString()}`;

  if (session.pageData) {
    prompt += `\n\n📄 CURRENT PAGE DATA:
${JSON.stringify(session.pageData, null, 2)}

Reference this data when answering questions about what the user is viewing.`;
  }

  return prompt;
}
```

**Testing:**
```
✅ User: "review my objectives" → AI fetches data, no extra suggestions
✅ User: "create objective with 3 KRs" → AI proposes objective first, waits
✅ User approves → AI then proposes first KR, not all 3 at once
✅ Error occurs → AI explains error with fix suggestions
```

---

## 🧪 WEEK 2: COMPREHENSIVE TESTING (16 hours)

### Test Suite 1: Empty Response Fix (2 hours)

**Test 1.1: Create Objective**
```
INPUT: "create objective to improve customer NPS"
EXPECT:
  ✅ AI message not empty
  ✅ Preview shows objective title
  ✅ Preview shows target date
  ✅ Approval UI renders
  ✅ Database has non-empty content
```

**Test 1.2: Create Key Result**
```
INPUT: "add key result to objective #5"
EXPECT:
  ✅ AI message has content
  ✅ Preview shows KR details
  ✅ Shows target value and unit
  ✅ Approval buttons visible
```

**Test 1.3: Complete Task**
```
INPUT: "mark task 10 as done"
EXPECT:
  ✅ AI confirms action
  ✅ Preview shows task ID
  ✅ Approval UI present
```

---

### Test Suite 2: Validation (4 hours)

**Test 2.1: Invalid Title**
```
SETUP: AI proposes create_objective with title: "AB" (too short)
WHEN: User approves
EXPECT:
  ❌ Validation fails
  ✅ Error: "Title must be at least 3 characters"
  ✅ Action marked as failed
  ✅ User can retry
```

**Test 2.2: Invalid Date**
```
SETUP: AI proposes targetDate: "next week" (not ISO format)
WHEN: User approves
EXPECT:
  ❌ Validation fails
  ✅ Error: "Invalid date format"
  ✅ Suggestion: "Make sure dates are in YYYY-MM-DD format"
```

**Test 2.3: Missing Required Field**
```
SETUP: AI proposes create_key_result without targetValue
WHEN: User approves
EXPECT:
  ❌ Validation fails
  ✅ Error: "Target value required"
  ✅ Clear error message
```

**Test 2.4: Valid Data**
```
SETUP: AI proposes perfectly valid create_objective
WHEN: User approves
EXPECT:
  ✅ Validation passes
  ✅ Objective created in DB
  ✅ All fields populated correctly
  ✅ createdBy = current user
  ✅ organizationId correct
```

---

### Test Suite 3: Step-by-Step Execution (3 hours)

**Test 3.1: Complex OKR Creation**
```
INPUT: "create objective to launch mobile app with 3 key results"
STEP 1:
  ✅ AI proposes create_objective only
  ✅ Waits for approval
  ✅ Does NOT propose KRs yet

STEP 2: User approves
  ✅ Objective created
  ✅ AI confirms success

STEP 3:
  ✅ AI asks: "Would you like me to add the first key result?"
  ✅ Waits for user response

STEP 4: User says "yes"
  ✅ AI proposes first KR
  ✅ Waits for approval

Repeat for remaining KRs
```

**Test 3.2: Error in Middle of Chain**
```
SETUP: Creating objective + 3 KRs
STEP 1: Objective created successfully
STEP 2: First KR created successfully  
STEP 3: Second KR fails validation
EXPECT:
  ✅ Process stops at failure point
  ✅ User sees clear error
  ✅ Suggestion to fix and retry
  ✅ Already created items remain in DB
  ✅ User can continue or start over
```

---

### Test Suite 4: Read-Only Auto-Execute (3 hours)

**Test 4.1: List Objectives Success**
```
INPUT: "show me my active objectives"
EXPECT:
  ✅ list_objectives auto-executes
  ✅ No approval required
  ✅ Response includes actual data
  ✅ Formatted with progress percentages
  ✅ Response in <3 seconds
```

**Test 4.2: List Objectives with Error**
```
SETUP: Simulate database connection failure
INPUT: "review my objectives"
EXPECT:
  ✅ Error caught gracefully
  ✅ User sees: "⚠️ I tried to fetch that information but..."
  ✅ Helpful suggestions provided
  ✅ Chat doesn't crash
  ✅ User can continue conversation
```

**Test 4.3: Chained Read Operations**
```
INPUT: "show objective #5 with all its key results"
STEP 1:
  ✅ list_objectives auto-executes
  ✅ Finds objective #5
STEP 2:
  ✅ list_key_results auto-executes for objective #5
  ✅ Returns KRs with progress
EXPECT:
  ✅ Both execute without approval
  ✅ Combined response with full data
```

---

### Test Suite 5: Error Handling (2 hours)

**Test 5.1: Permission Denied**
```
SETUP: Team member tries to create objective (requires manager role)
INPUT: "create objective for Q4 revenue"
EXPECT:
  ❌ Function not available to team member
  OR:
  ✅ Action rejected with: "You may not have permission for this action"
  ✅ Suggestion to contact admin
```

**Test 5.2: Resource Not Found**
```
INPUT: "add key result to objective #999" (doesn't exist)
WHEN: User approves
EXPECT:
  ❌ Execution fails
  ✅ Error: "Objective not found or access denied"
  ✅ Suggestion: "Try listing available objectives first"
```

**Test 5.3: Database Constraint Violation**
```
SETUP: Attempt to create duplicate with unique constraint
EXPECT:
  ❌ DB throws error
  ✅ User sees: "This item already exists"
  ✅ Suggestion to update instead
```

---

### Test Suite 6: End-to-End Workflows (2 hours)

**Test 6.1: Complete OKR Creation**
```
WORKFLOW:
1. User: "create objective to reach 500 customers by Dec 31"
2. AI proposes objective → User approves → Created
3. User: "add key result to track new signups"
4. AI proposes KR → User approves → Created
5. User: "add task to optimize landing page"
6. AI proposes task → User approves → Created

VERIFY:
  ✅ Objective exists with correct title, date, owner
  ✅ KR linked to objective correctly
  ✅ Task linked to KR correctly
  ✅ All createdBy fields = current user
  ✅ All organizationId fields correct
  ✅ Progress calculations work
```

**Test 6.2: Update Workflow**
```
WORKFLOW:
1. User: "update objective #5 status to completed"
2. AI proposes update_objective → User approves
3. Objective status changed

VERIFY:
  ✅ Status = 'completed'
  ✅ updatedAt timestamp current
  ✅ Original fields unchanged
```

**Test 6.3: Complete Task Workflow**
```
WORKFLOW:
1. User: "mark task 10 as done"
2. AI proposes complete_task → User approves
3. Task marked complete

VERIFY:
  ✅ Task status = 'completed'
  ✅ completedAt timestamp set
  ✅ completedBy = current user
  ✅ Key result progress updates
  ✅ Objective progress recalculates
```

---

## 📊 SUCCESS CRITERIA

### Week 1 Completion Requirements
- ✅ 0% empty AI responses for write actions
- ✅ 100% of actions show approval UI
- ✅ 100% of approved actions have validation
- ✅ All test suite tests passing
- ✅ No critical bugs in error logs

### Week 2 Completion Requirements
- ✅ 95%+ test pass rate across all suites
- ✅ 100% of invalid data caught before DB write
- ✅ Average response time <3 seconds
- ✅ All error messages include fix suggestions
- ✅ Step-by-step workflow confirmed working

### Overall Success Metrics
- **Function execution success rate:** ≥95%
- **Empty response rate:** 0%
- **Validation catch rate:** 100%
- **User approval completion rate:** ≥80%
- **Average response time:** <3s
- **Error recovery with suggestions:** 100%

---

## 🚀 IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [x] Requirements confirmed with project lead
- [x] Test plan documented
- [ ] Development environment ready
- [ ] Backup of current code

### Week 1 Tasks
- [ ] Task 1.1: Fix empty response bug (4h)
  - [ ] Add generateActionPreview function
  - [ ] Update message save logic
  - [ ] Test with all write functions
  
- [ ] Task 1.2: Add input validation (8h)
  - [ ] Create Zod schemas for all functions
  - [ ] Update executeAction with try/catch
  - [ ] Add getSuggestionForError helper
  - [ ] Test validation with invalid data
  
- [ ] Task 1.3: Improve error handling (2h)
  - [ ] Update auto-execute catch block
  - [ ] Add error statistics tracking
  - [ ] Test with simulated failures
  
- [ ] Task 1.4: Update system prompt (2h)
  - [ ] Replace prompt with new version
  - [ ] Test AI behavior alignment
  - [ ] Verify step-by-step execution

### Week 2 Testing
- [ ] Test Suite 1: Empty Response (2h)
- [ ] Test Suite 2: Validation (4h)
- [ ] Test Suite 3: Step-by-Step (3h)
- [ ] Test Suite 4: Auto-Execute (3h)
- [ ] Test Suite 5: Error Handling (2h)
- [ ] Test Suite 6: End-to-End (2h)

### Sign-Off
- [ ] All critical bugs fixed
- [ ] All tests passing
- [ ] User acceptance testing complete
- [ ] Documentation updated
- [ ] Ready for production

---

## 📝 NOTES

### Design Decisions
- **Step-by-step over compound:** Chose sequential execution for transparency and better error handling
- **Strict validation:** Prevents bad data from entering database, even if it means more errors shown to user
- **Error suggestions:** Every error includes actionable recovery steps
- **Forever retention:** Chat history never auto-deleted (user can manually delete)

### Future Enhancements (Post-Week 2)
- Streaming responses (Week 3)
- Cost limits and monitoring (Week 3)  
- Conversation branching (Week 3+)
- Advanced context management (Week 3+)
- Retry logic for API failures (Week 3)

---

*Ready for implementation. Awaiting go-ahead to begin Week 1 fixes.*
