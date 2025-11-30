# Support Ticket Work Item - Original UI Design

## Overview
Support ticket work items were designed with a specialized, chat-like interface optimized for responding to customer support tickets, NOT the generic workflow steps UI.

## Original Designed Layout (UNIFIED MODE)

### 1. **Minimal Header**
- Ticket subject with icon
- Priority badge (Low/Medium/High/Critical) with color coding
- External link to open ticket in Splynx

### 2. **Scrollable Messages Area**
- Full conversation history
- Color-coded messages:
  - **Customer messages**: Blue background
  - **Agent messages**: Gray background
  - **Private/Internal notes**: Amber background with "Private" badge
- Each message shows:
  - Author type (Customer/Agent)
  - Timestamp
  - Message content (rendered HTML)

### 3. **Quick Reply Section** (Fixed at bottom)
- "Reply" label with AI Draft badge (when available)
- **Public/Private toggle** - Select message visibility
- **Status update dropdown** - Change ticket status
- **Large textarea** for composing response
- **Restore Draft button** - Restore AI-generated draft if modified
- **Send Reply button** - Post message to ticket
- **Update Status button** - Change ticket status
- AI edit percentage indicator (when sent)

## Component Architecture

### Primary Components
1. **SplynxTicketViewer** (Unified Mode)
   - Location: `client/src/components/workflow/SplynxTicketViewer.tsx`
   - Lines: 309-482
   - Purpose: Chat-like interface for viewing and responding to tickets

2. **DraftResponsePanel**
   - Location: `client/src/components/work-items/DraftResponsePanel.tsx`
   - Purpose: Display AI-generated draft responses with edit/send/regenerate actions
   - Shows in separate "Draft Response" tab when `workItemType === 'support_ticket'`

### When Components Display

**SplynxTicketViewer displays when:**
- Step evidence contains `stepType: 'splynx_ticket'`
- Work item has `workflowMetadata.splynx_ticket_id`
- Mode is set to 'unified' (for mobile/field use)

**DraftResponsePanel displays when:**
- `formData.workItemType === 'support_ticket'`
- Work item has AI drafting configured
- Accessed via "Draft Response" tab in WorkItemPanel

## Current Issue

**Problem**: Work items created with support ticket template are showing the **generic workflow steps UI** instead of the specialized support ticket interface.

**Symptoms**:
- Seeing "Workflow Progress" section with step checkboxes
- Generic step names like "Process Support Ticket" and "Internal Notes"
- Missing the chat-like message interface
- Missing AI draft integration
- No quick reply functionality

**Root Cause**: The workflow template step is not configured with the correct step type and metadata:
- Missing `stepType: 'splynx_ticket'` in step evidence
- OR Missing `splynx_ticket_id` in work item metadata
- OR `workItemType` is not set to 'support_ticket'

## How to Fix

### Option 1: Ensure Workflow Template is Configured Correctly
The workflow template for support tickets needs:
1. Step with `stepType: 'splynx_ticket'` in config
2. Work item must be created with `workItemType: 'support_ticket'`
3. Work item must have `workflowMetadata.splynx_ticket_id` set

### Option 2: Use Dedicated Support Ticket Creation Flow
Support tickets should be created through a specialized flow that:
1. Sets `workItemType: 'support_ticket'`
2. Populates `workflowMetadata.splynx_ticket_id`
3. Creates workflow steps with proper `stepType: 'splynx_ticket'` configuration
4. Triggers AI draft generation

## Reference Files

- **SplynxTicketViewer**: `client/src/components/workflow/SplynxTicketViewer.tsx`
- **DraftResponsePanel**: `client/src/components/work-items/DraftResponsePanel.tsx`
- **WorkflowExecutionPanel**: `client/src/components/work-items/WorkflowExecutionPanel.tsx` (lines 983-994)
- **WorkItemPanel**: `client/src/components/work-items/WorkItemPanel.tsx` (lines 858-865, 901-906, 1318-1324)

## Visual Design Features

### Color Coding
- **Customer messages**: `bg-blue-50 dark:bg-blue-950/30 border-blue-200`
- **Agent messages**: `bg-muted/50 border`
- **Private notes**: `bg-amber-50 dark:bg-amber-950/30 border-amber-200`

### Priority Badges
- **Low**: Blue
- **Medium**: Yellow
- **High**: Orange
- **Critical**: Red

### Layout Optimization
- Designed for **mobile-first** field use
- Minimal header to maximize message viewing area
- Fixed reply section at bottom for easy access
- Scrollable message history
- Compact controls (small selectors, icons)
