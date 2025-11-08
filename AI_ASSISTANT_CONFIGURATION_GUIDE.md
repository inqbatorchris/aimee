# AI Assistant Configuration Guide

## Overview
The AI Assistant in aimee.works Strategy OS is now fully configurable through a combination of Knowledge Base documents and custom instructions. This guide explains how to configure the AI's behavior, personality, and capabilities.

## Configuration Options

### 1. Model Selection
Navigate to **AI Assistant → Settings → Model** tab to configure:

- **AI Model**: Choose from the latest OpenAI models
  - **GPT-5 Mini** (Recommended) - Best balance of speed, accuracy, and cost ($0.25 per 1M tokens)
  - **GPT-5** - Most capable, highest quality ($1.25 per 1M tokens)
  - **GPT-5 Nano** - Fastest, most cost-effective ($0.05 per 1M tokens)
  - **o3** - Advanced reasoning model ($5.00 per 1M tokens)
  - **o3 Mini** - Reasoning-optimized, cost-effective ($1.00 per 1M tokens)
  - **o4 Mini** - Latest small model ($1.00 per 1M tokens)
  - Legacy models: GPT-4.1, GPT-4o, GPT-4, GPT-3.5

- **Temperature**: Control response creativity (0.0 = focused, 2.0 = creative)
- **Enable/Disable**: Toggle AI assistant for your organization

### 2. Personality Configuration
Navigate to **AI Assistant → Settings → Personality** tab:

#### Instruction Document (Knowledge Base)
Link a Knowledge Base document to provide detailed instructions, guidelines, or context for the AI assistant. This is the **recommended approach** for complex configurations.

**Benefits:**
- Version control through KB document history
- Easy sharing across teams
- Rich formatting support (markdown)
- Centralized management
- Can be updated without code changes

**To Use:**
1. Create a Knowledge Base document with your instructions
2. Go to AI Assistant Settings → Personality tab
3. Select your document from the "Instruction Document" dropdown
4. Instructions will be automatically loaded into the AI's system prompt

#### Custom Instructions (Textarea)
For quick, simple instructions, you can use the custom instructions field:
- Lightweight option for basic customization
- Suitable for short guidelines (1-2 paragraphs)
- No version control or formatting support

**Priority:** When both are set, the system loads:
1. Core behavior rules (hardcoded)
2. Page context (if available)
3. Instruction Document content (if selected)
4. Custom Instructions (if provided)

### 3. Function Management
Navigate to **AI Assistant → Settings → Functions** tab:

Configure which functions the AI can call:
- Enable/disable specific functions
- Set approval requirements
- View function call statistics
- Test functions individually

## Core Behavior Rules

The AI Assistant follows these core principles (always enforced):

### 1. Wait for Requests
The AI only responds when asked - it never proactively suggests actions unprompted.

### 2. Step-by-Step Execution
Functions are executed one at a time, not as compound operations. When creating complex structures (e.g., objective + key results):
1. First, create the objective
2. After approval, create first key result
3. After approval, create next key result
4. Continue until complete

### 3. Strict Validation
All inputs are validated. If validation fails, the AI explains the error clearly and suggests how to fix it.

### 4. Conversational Responses
The AI provides direct answers with actual data, using natural language with:
- Bullet points for clarity
- Emojis for visual cues (📊 ✅ ⚠️ 🚫)
- Clear structure and formatting
- Actual numbers, progress, and metrics

### 5. Function Approval Workflow

**Read Functions** (auto-execute):
- `list_objectives` - View all objectives with progress
- `list_key_results` - View key results for objectives
- `list_key_result_tasks` - View tasks for key result

**Write Functions** (require approval):
- `create_objective` - Create new objective
- `update_objective` - Update objective details
- `create_key_result` - Add key result to objective
- `update_key_result` - Update key result progress
- `create_task` - Add task to key result
- `update_task` - Update task details
- `complete_task` - Mark task as completed
- `draft_objective_with_krs` - Create complete OKR structure

## Example Knowledge Base Instructions

### Example 1: Custom Tone and Style
```markdown
# AI Assistant Instructions for Acme Corp

## Communication Style
- Use professional but friendly tone
- Address users by first name when known
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for lists of 3+ items

## Domain-Specific Context
- Our fiscal year runs April 1 - March 31
- All revenue targets should reference our $10M ARR goal
- When discussing OKRs, emphasize alignment with company vision

## Response Preferences
- Always include next steps when completing tasks
- Suggest relevant Knowledge Base articles when applicable
- Flag risks immediately when progress is behind schedule
```

### Example 2: Industry-Specific Guidance
```markdown
# Healthcare AI Assistant Instructions

## Compliance Awareness
- Never provide medical advice or diagnoses
- Remind users about HIPAA compliance when discussing patient data
- Flag any mention of PHI (Protected Health Information)

## Terminology
- Use standard medical terminology where appropriate
- Define acronyms on first use
- Reference our internal glossary for consistency

## Workflow Considerations
- Prioritize patient safety in all recommendations
- Consider regulatory requirements (FDA, state boards)
- Emphasize documentation and audit trails
```

### Example 3: Technical Team Configuration
```markdown
# Engineering Team AI Assistant

## Engineering Context
- Our sprint cycles are 2 weeks
- Code freeze happens every Friday 5pm
- All features require PR review + QA signoff

## Response Style
- Be direct and technical with engineering team
- Include relevant Jira ticket links when available
- Reference our architecture docs for system design questions

## Priority Framework
When multiple tasks compete:
1. P0: Production incidents
2. P1: Customer-blocking issues
3. P2: Sprint commitments
4. P3: Nice-to-have improvements
```

## Testing Your Configuration

After configuring the AI assistant:

1. **Test Basic Queries**
   - "What are my current objectives?"
   - "Show me tasks due this week"

2. **Test Function Calls**
   - "Create a new objective for Q1 revenue growth"
   - "Update the progress on key result #5"

3. **Verify Custom Instructions**
   - Check if AI follows your tone and style
   - Verify domain-specific context is applied
   - Confirm terminology usage is correct

## Troubleshooting

### AI Not Following Instructions
- Check if Instruction Document is properly selected
- Verify document has published status
- Review document content for clarity
- Ensure no conflicting instructions in Custom Instructions field

### Functions Not Working
- Verify function is enabled in Functions tab
- Check OpenAI integration is configured
- Review function permissions and approval settings
- Check logs for detailed error messages

### Approval Flow Issues
- Ensure write functions have `requiresApproval: true`
- Check user has permission to approve actions
- Verify frontend ActionApprovalCard is rendering

## Best Practices

1. **Start Simple**: Begin with custom instructions, upgrade to KB document as needs grow
2. **Be Specific**: Provide concrete examples in your instructions
3. **Test Regularly**: Verify AI behavior after configuration changes
4. **Version Control**: Use KB documents for important configurations
5. **Team Input**: Involve team members in defining AI behavior
6. **Iterate**: Refine instructions based on actual usage patterns

## Advanced: System Prompt Structure

The complete system prompt is built in this order:

```
1. Core Behavior Rules (hardcoded)
   ↓
2. Current Context (user, org, page, date)
   ↓
3. Available Functions List
   ↓
4. Page Data (if viewing specific page)
   ↓
5. Instruction Document (if configured)
   ↓
6. Custom Instructions (if provided)
```

This structure ensures core safety rules are always enforced while allowing customization through documents and instructions.

## Logging and Monitoring

All AI interactions are logged for debugging and analysis:

- **OpenAI Request/Response**: Full API interactions
- **Function Calls**: All proposed and executed functions
- **Approval Actions**: User approvals/rejections
- **Activity Logs**: Chat sessions and message history
- **Usage Metrics**: Token usage, costs, and function statistics

Access logs through:
- Activity Logs page (user-facing)
- Browser console (development)
- Server logs (backend debugging)

## Support

For issues or questions:
1. Check this documentation first
2. Review Activity Logs for recent interactions
3. Test with simple queries to isolate issues
4. Contact your system administrator
