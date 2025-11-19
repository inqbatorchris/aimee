/**
 * Seed script: Vapi Voice AI Knowledge Base Documents
 * Creates 6 comprehensive KB articles documenting the Vapi integration
 * Run: tsx server/seeds/vapiKnowledgeBase.ts
 */

import { db } from '../db';
import { knowledgeDocuments, knowledgeCategories } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const ORGANIZATION_ID = 3; // Default organization

async function seedVapiKnowledgeBase() {
  console.log('🚀 Starting Vapi Knowledge Base seed...');

  try {
    // Create Vapi category
    const [vapiCategory] = await db.insert(knowledgeCategories).values({
      organizationId: ORGANIZATION_ID,
      name: 'Voice AI',
      slug: 'voice-ai',
      description: 'Vapi voice AI integration documentation',
      icon: '📞',
      sortOrder: 100,
      isActive: true,
    }).returning();

    console.log('✅ Created Voice AI category:', vapiCategory.id);

    // Article 1: System Overview
    const [overview] = await db.insert(knowledgeDocuments).values({
      organizationId: ORGANIZATION_ID,
      title: 'Vapi Voice AI System Overview',
      slug: 'vapi-voice-ai-system-overview',
      content: `# Vapi Voice AI System Overview

## Introduction

The Vapi Voice AI System is a comprehensive autonomous support desk solution that achieves 95% hands-free call resolution. It integrates seamlessly with your OKR/strategy management infrastructure, automatically updating Key Results from call metrics and creating work items for human actions.

## Architecture

### Three-Tier Assistant Structure

1. **Triage Assistant** - Main entry point
   - Routes all inbound calls based on customer intent
   - Classifies intent in under 10 seconds
   - Escalates frustrated customers immediately

2. **Residential Sales Assistant** - Sales conversion
   - Handles sales inquiries
   - Presents service packages with benefits
   - Schedules demos (target: 40% conversion rate)

3. **Residential Support Assistant** - Technical support
   - SMS-based identity verification
   - Autonomous troubleshooting
   - Creates tickets when needed (target: 95% autonomous resolution)

### Integration Points

- **Strategic Objectives**: Links to "Autonomous Voice Support System" OKR
- **Metrics Calculator**: Automatically calculates 6 Key Result values
- **Workflow Engine**: Daily automation to update KRs from call data
- **Work Items**: Automatic ticket creation for human escalations
- **Knowledge Base**: Voice assistants query KB for answers

### Data Flow

1. Inbound call → Triage Assistant routes to appropriate department
2. Specialized assistant handles inquiry using tools and KB
3. Call completes → Webhook sends data to platform
4. Metrics calculated → Work items created if needed
5. Daily workflow → Updates all 6 Key Results

## Key Features

### Autonomous Resolution
- 95% of calls resolved without human intervention
- Smart routing based on customer intent
- Proactive troubleshooting guidance

### Identity Verification
- SMS-based verification for security
- 6-digit code validation
- Automatic escalation after failed attempts

### Knowledge Integration
- Real-time KB querying during calls
- Knowledge gap detection
- Automatic documentation improvement suggestions

### Performance Tracking
- 6 Key Results tracking all critical metrics
- Real-time dashboard with trends
- Automatic daily updates via workflows

## Getting Started

1. Review the three customer journey documents
2. Configure assistants in Vapi dashboard
3. Set up webhook to receive call events
4. Create workflows to auto-update Key Results
5. Monitor performance on dashboard

## Learn More

- Customer Journey - Business Transfer
- Customer Journey - Residential Sales & Demo Scheduling
- Customer Journey - Residential Support with SMS Verification
- Managing Vapi Assistants
- Vapi OKR Metrics & Performance Tracking`,
      excerpt: 'Comprehensive overview of the Vapi Voice AI system architecture, integration points, and key features for autonomous support desk management.',
      status: 'published',
      visibility: 'internal',
      categories: ['voice-ai'],
      tags: ['vapi', 'voice-ai', 'automation', 'support', 'okr', 'integration'],
      authorId: 1,
      viewCount: 0,
      isPublic: false,
      isFeatured: true,
    }).returning();

    console.log('✅ Created KB article:', overview.title);

    // Article 2: Business Transfer Journey
    const [businessTransfer] = await db.insert(knowledgeDocuments).values({
      organizationId: ORGANIZATION_ID,
      title: 'Customer Journey - Business Transfer',
      slug: 'customer-journey-business-transfer',
      content: `# Customer Journey: Business Transfer

## Overview

The Business Transfer journey handles inbound calls from existing or prospective business customers who need to speak with the business team. The Triage Assistant identifies the intent and seamlessly forwards the call to the appropriate department.

## Journey Steps

### Step 1: Triage Assistant Greeting (0-10 seconds)

**Script:**
> "Thank you for calling. I'm the automated assistant. Are you calling about business services, residential services, or technical support?"

**Intent Detection:**
- Customer says "business" or "business account"
- Customer mentions company name or business services
- Customer asks to be transferred to business team

### Step 2: Information Collection (10-20 seconds)

**Triage asks:**
> "Perfect! Can I get your company name and a brief reason for your call so I can route you to the right person?"

**Collected Information:**
- Company name
- Brief reason for call
- Caller's name (if provided)

### Step 3: Lookup & Route (20-30 seconds)

**Actions:**
1. Uses `lookup_customer` tool to find business account
2. Uses `check_queue` tool to verify business team availability
3. Confirms routing to customer

**Script:**
> "Thank you, [Name]. I'm transferring you to our business services team now. They'll be with you shortly."

### Step 4: Create Work Item

**Automatic Actions:**
- Creates work item with type: \`vapi_business_transfer\`
- Includes: caller info, company name, reason for call, call ID
- Assigns to: Business Services Team
- Priority: Normal (or High if urgent keywords detected)

### Step 5: Transfer Call

**Handoff:**
- Call forwarded to business team extension
- Work item appears in team's queue
- Call transcript attached to work item

## Success Criteria

- ✅ Intent identified in under 10 seconds
- ✅ Relevant information collected
- ✅ Work item created with complete details
- ✅ Call forwarded successfully
- ✅ No customer frustration detected

## Metrics Tracked

This journey impacts:
- **Autonomous Resolution Rate**: Marked as NOT autonomous (requires human)
- **Average Call Duration**: Should be under 60 seconds
- **Tickets Created**: Creates 1 work item per call

## Common Edge Cases

### Frustrated Customer
If customer sounds angry or frustrated:
- Immediately transfer to human
- Flag work item as urgent
- No additional questions asked

### Unclear Intent
If intent unclear after one question:
- Ask one clarifying question
- Default to business transfer if still unclear

### Queue Full
If business team unavailable:
- Offer callback scheduling
- Create high-priority work item
- Set customer expectations (callback within 2 hours)

## Example Conversation

**Triage:** "Thank you for calling. I'm the automated assistant. How can I help you today?"

**Customer:** "I need to speak to someone about upgrading our business internet."

**Triage:** "Perfect! Can I get your company name and the specific service you're interested in?"

**Customer:** "We're Acme Corp, looking to upgrade from 100 meg to 1 gig fiber."

**Triage:** "Thank you. I'm transferring you to our business services team who can help with that upgrade. One moment please."

[Creates work item: "Acme Corp - Fiber upgrade inquiry (100M → 1G)"]
[Transfers call]

## Monitoring & Optimization

- Review transfer success rate weekly
- Track time-to-transfer metric
- Monitor work item quality (complete information)
- Identify patterns in transfer reasons`,
      excerpt: 'Complete workflow for handling business customer calls from initial triage through transfer to the business services team.',
      status: 'published',
      visibility: 'internal',
      categories: ['voice-ai'],
      tags: ['vapi', 'customer-journey', 'business', 'triage', 'transfer'],
      authorId: 1,
      viewCount: 0,
      isPublic: false,
      isFeatured: false,
    }).returning();

    console.log('✅ Created KB article:', businessTransfer.title);

    // Article 3: Residential Sales Journey
    const [residentialSales] = await db.insert(knowledgeDocuments).values({
      organizationId: ORGANIZATION_ID,
      title: 'Customer Journey - Residential Sales & Demo Scheduling',
      slug: 'customer-journey-residential-sales-demo-scheduling',
      content: `# Customer Journey: Residential Sales & Demo Scheduling

## Overview

The Residential Sales journey converts prospective customers into demo appointments. The Sales Assistant checks service availability, presents packages with benefits (not features), and schedules personalized demos. **Target: 40% demo conversion rate.**

## Journey Steps

### Step 1: Warm Greeting & Context (0-15 seconds)

**Script:**
> "Hi! I'm excited to help you find the perfect internet plan. Where are you located?"

**Actions:**
- Collect address/postcode
- Check service availability via Knowledge Base
- Set enthusiastic, helpful tone

### Step 2: Service Availability Check (15-30 seconds)

**If Available:**
> "Great news! We have service in your area. What are you mainly using internet for - working from home, streaming, gaming, or a mix?"

**If NOT Available:**
> "I'm checking our coverage... Unfortunately, we're not in your area yet, but we're expanding. Can I schedule a callback when we launch there?"

### Step 3: Needs Assessment (30-60 seconds)

**Questions to ask:**
- What do you currently have? (competitor, speed, price)
- What problems are you experiencing?
- How many devices/people in household?
- What's most important to you? (speed, reliability, price)

**Active Listening:**
- Acknowledge pain points
- Show empathy for current issues
- Build rapport

### Step 4: Package Presentation (60-120 seconds)

**Our Packages:**

1. **Basic**: 30 Mbps, £25/mo
   - Perfect for: Light browsing, email, streaming SD
   
2. **Standard**: 100 Mbps, £35/mo
   - Perfect for: Multiple devices, HD streaming, light gaming
   
3. **Premium**: 300 Mbps, £45/mo
   - Perfect for: Heavy streaming, serious gaming, working from home
   
4. **Ultra**: 1 Gbps, £60/mo
   - Perfect for: Large households, 4K streaming, professional use

**Presentation Strategy:**
- Start with package matching their needs
- Present BENEFITS, not features
- Paint picture of their life with service
- Handle price objections with value story

**Example:**
> "Based on what you've told me - working from home with 2 kids streaming - I'd recommend our Premium plan. With 300 megs, you'll never fight for bandwidth again. Your Zoom calls will be crystal clear while the kids stream in 4K. It's only £45 a month, and we include free installation."

### Step 5: Demo Scheduling (120-180 seconds)

**Transition:**
> "I'd love to set up a quick 30-minute video call where we can show you our network, answer detailed questions, and get you set up if you're ready. What works better for you - mornings or afternoons?"

**Schedule Options:**
- Next available slots (usually within 48 hours)
- Morning: 9 AM, 10 AM, 11 AM
- Afternoon: 2 PM, 3 PM, 4 PM
- Preference: Same-day or next-day

**Uses:** \`schedule_demo\` tool
- Collects: Name, email, phone, preferred time
- Creates: Calendar event + work item
- Sends: Confirmation email with video link

### Step 6: Confirmation & Wrap-up (180-210 seconds)

**Script:**
> "Perfect! I've scheduled your demo for [DATE] at [TIME]. You'll receive a confirmation email with the video link. Our specialist will show you our network, answer questions, and can get you connected the same day if you'd like. Is there anything else I can help with?"

**Creates:**
- Work item type: \`vapi_demo_scheduled\`
- Priority: High
- Assigned to: Sales Team
- Details: Customer info, package interest, notes from conversation

## Success Criteria

- ✅ Service availability confirmed
- ✅ Needs properly assessed
- ✅ Appropriate package recommended
- ✅ Demo scheduled (40% conversion target)
- ✅ Customer excited and informed

## Objection Handling

### "That's too expensive"
> "I understand price is important. Can I show you what you're getting? [List benefits]. Many customers find they actually save money because [reliability, no hidden fees, includes equipment]. Plus, we have a 30-day guarantee - if you're not happy, full refund."

### "I need to think about it"
> "Absolutely! That's why the demo is perfect - no commitment, just information. It's only 30 minutes, and you'll get all your questions answered. What concerns can I address right now?"

### "I'm locked in a contract"
> "No problem! When does your contract end? Let me schedule the demo for right before then, so you're ready to switch seamlessly. We can even help with any early termination fees depending on the package you choose."

### "I'll call back"
> "I'd hate for you to lose this time slot! The demo is free, no obligation, and takes just 30 minutes. Worst case, you learn more about your options. Best case, you get amazing internet. What's holding you back?"

## Metrics Tracked

This journey impacts:
- **Demo Conversion Rate**: % of calls that schedule demo (target: 40%)
- **Average Call Duration**: Should be 2-4 minutes
- **Autonomous Resolution Rate**: Marked as autonomous if demo scheduled
- **Tickets Created**: Creates 1 work item per demo

## Example Conversation (Successful Demo Booking)

**Sales:** "Hi! I'm excited to help you find the perfect internet plan. Where are you located?"

**Customer:** "I'm in North London, N1 area."

**Sales:** "Great news! We have service in your area. What are you mainly using internet for?"

**Customer:** "I work from home and my partner streams a lot. Our current provider keeps dropping out during my video calls."

**Sales:** "That must be so frustrating, especially during important work calls. What speed are you getting now?"

**Customer:** "We have 50 meg with BT, paying about £40 a month."

**Sales:** "I have a solution that will transform your experience. Our Premium plan gives you 300 megs of rock-solid fiber - that's 6 times faster than what you have. Your video calls will be flawless, even while streaming 4K. It's £45 a month with free installation. I'd love to set up a quick 30-minute demo where we can show you our network. Does tomorrow at 2 PM work?"

**Customer:** "Actually, yes! That sounds good."

**Sales:** "Perfect! I'll just need your email address..."

[Demo scheduled successfully - 40% conversion target met]

## Monitoring & Optimization

- Track demo conversion rate daily
- Review recordings for improvement opportunities
- A/B test different package presentations
- Monitor demo show-up rate
- Track demo-to-sale conversion
- Identify best-performing time slots`,
      excerpt: 'Step-by-step sales journey from greeting through demo scheduling with objection handling strategies and conversion optimization.',
      status: 'published',
      visibility: 'internal',
      categories: ['voice-ai'],
      tags: ['vapi', 'customer-journey', 'sales', 'demo', 'conversion', 'residential'],
      authorId: 1,
      viewCount: 0,
      isPublic: false,
      isFeatured: false,
    }).returning();

    console.log('✅ Created KB article:', residentialSales.title);

    // Article 4: Residential Support Journey
    const [residentialSupport] = await db.insert(knowledgeDocuments).values({
      organizationId: ORGANIZATION_ID,
      title: 'Customer Journey - Residential Support with SMS Verification',
      slug: 'customer-journey-residential-support-sms-verification',
      content: `# Customer Journey: Residential Support with SMS Verification

## Overview

The Residential Support journey provides technical support and billing assistance with **95% autonomous resolution target**. All support interactions require SMS-based identity verification before proceeding.

## Journey Steps

### Step 1: Greeting & Issue Identification (0-20 seconds)

**Script:**
> "Hi, I'm here to help with technical support or billing questions. First, I'll need to verify your identity. What's the phone number on your account?"

**Collect:**
- Phone number for account lookup
- Brief description of issue

### Step 2: SMS Identity Verification (20-60 seconds)

**Process:**

1. **Lookup Customer** (uses \`lookup_customer\` tool)
   - Searches Splynx by phone number
   - Verifies account exists and is active

2. **Send SMS Code** (uses \`send_sms_code\` tool)
   - Generates 6-digit verification code
   - Sends via SMS to phone number on file
   - Sets 5-minute expiration

3. **Verify Code** (uses \`verify_sms_code\` tool)
   - Customer reads back 6-digit code
   - System validates code
   - Max 2 attempts allowed

**Script:**
> "Perfect! I've sent a 6-digit verification code to your phone ending in [LAST 4]. Please read that code back to me when you receive it."

**If Verification Fails:**
- After 2 failed attempts → Escalate to human
- If SMS not received → Offer alternative verification
- If wrong phone number → Transfer to billing team

### Step 3: Issue Troubleshooting (60-180 seconds)

Once verified, handle common issues autonomously:

#### Slow Speeds

**Diagnostic Questions:**
- What speed are you seeing?
- Wired or WiFi connection?
- What device are you testing on?
- Have you restarted your router recently?

**Autonomous Solutions:**
1. Guide router restart (power cycle 30 seconds)
2. Check for WiFi interference
3. Recommend wired test for comparison
4. Explain bandwidth distribution among devices
5. Suggest speed test at [speedtest link]

**Script:**
> "Let's start by restarting your router. Unplug the power cable, wait 30 seconds, then plug it back in. This clears the router's memory and often fixes speed issues. While it's restarting, are you testing on WiFi or wired?"

#### Connection Drops

**Diagnostic Questions:**
- How often does it happen?
- Whole house or specific location?
- What lights are showing on router?
- Any recent changes to setup?

**Autonomous Solutions:**
1. Check cable connections
2. Verify router firmware is updated
3. Test different cable/port
4. Check for local interference
5. Verify signal strength

#### WiFi Coverage

**Diagnostic Questions:**
- Where is router located?
- How many rooms/floors?
- Dead spots in specific areas?

**Autonomous Solutions:**
1. Router placement optimization
2. Explain WiFi range limitations
3. Suggest WiFi extender options
4. Recommend mesh system upgrade

**Script:**
> "WiFi typically covers about 1,500 square feet from your router. For better coverage in [area], you have two options: relocate the router to a more central spot, or add a WiFi extender for about £30. Would you like me to create a ticket for our team to discuss extender options?"

#### Billing Questions

**Can Handle Autonomously:**
- Explain charges on bill
- Confirm payment due date
- Describe service plan details
- Guide to online bill portal

**Must Escalate:**
- Refund requests
- Credit requests
- Payment disputes
- Service changes

### Step 4: Resolution or Ticket Creation (180-240 seconds)

**If Resolved Autonomously:**
> "Great! Is there anything else I can help you with today? If the issue comes back, just give us a call."

**Mark:** \`wasAutonomous = true\`

**If Ticket Needed:**
Uses \`create_ticket\` tool to create Splynx ticket:

**Ticket Types:**
- Engineer visit required
- Complex technical issue
- Billing dispute
- Service change request
- Equipment replacement

**Ticket Contents:**
- Customer details (auto-filled from verification)
- Issue description
- Troubleshooting steps already attempted
- Preferred callback time
- Priority level

**Script:**
> "I've created a support ticket for [ISSUE]. Our technical team will call you within [TIMEFRAME] at [PHONE]. Your ticket number is [NUMBER]. Is there anything else?"

**Mark:** \`wasAutonomous = false\`, \`ticketCreated = true\`

### Step 5: Callback Scheduling (if needed)

If customer prefers callback:
- Uses \`schedule_callback\` tool
- Collects preferred date/time
- Creates work item assigned to support team
- Sends confirmation SMS

## Success Criteria

- ✅ Identity verified via SMS (95% success rate)
- ✅ Issue resolved autonomously (95% target)
- ✅ Customer satisfied with resolution
- ✅ Ticket created if escalation needed
- ✅ No repeated calls for same issue

## SMS Verification Flow

\`\`\`
Customer calls → Provide phone number
    ↓
Lookup account in Splynx
    ↓
Send 6-digit SMS code
    ↓
Customer reads code → Verify
    ↓
✅ Verified (proceed)
    OR
❌ Failed (1 retry)
    ↓
❌ Failed again → Escalate to human
\`\`\`

## Autonomous Troubleshooting Decision Tree

\`\`\`
Issue reported
    ↓
Simple diagnostic? (Yes → Guide customer)
    ↓
Resolved? (Yes → End call, mark autonomous)
    ↓
(No → More complex)
    ↓
Within KB guidance? (Yes → Continue troubleshooting)
    ↓
Still not resolved?
    ↓
Create ticket → Escalate
    Mark: NOT autonomous
\`\`\`

## Metrics Tracked

This journey impacts:
- **Autonomous Resolution Rate**: % resolved without human (target: 95%)
- **SMS Verification Success**: % successfully verified (target: 95%)
- **Average Call Duration**: Should be 2-4 minutes
- **Tickets Created**: Count of escalations to human agents

## Example Conversation (Autonomous Resolution)

**Support:** "Hi, I'm here to help with technical support. First, what's the phone number on your account?"

**Customer:** "It's 020-555-1234."

**Support:** "Thank you. I've sent a 6-digit code to your phone ending in 1234. Please read that code back when you receive it."

**Customer:** "I got it - 847392."

**Support:** "Perfect, verified! How can I help you today?"

**Customer:** "My internet has been really slow the past two days."

**Support:** "I can help with that. What speed are you seeing, and are you on WiFi or a wired connection?"

**Customer:** "WiFi, and it's showing about 10 megs when I'm supposed to have 100."

**Support:** "Let's fix that. First, let's restart your router - unplug the power, wait 30 seconds, then plug it back in. While it restarts, how many devices are connected right now?"

**Customer:** "Okay, restarting... probably 8 or 9 devices."

**Support:** "That can definitely impact speed. Each device shares the bandwidth. After the router restarts, try the speed test again with only your device connected. If it's still slow after the restart and disconnecting other devices, call us back and I'll escalate to a technician."

**Customer:** "The router's back up... wow, much faster now! Showing 95 megs."

**Support:** "Excellent! The router restart cleared up the congestion. Is there anything else I can help with?"

[Call ends - Autonomous resolution achieved]

## Common Edge Cases

### SMS Not Received
- Verify phone number is correct
- Resend code (1 retry allowed)
- If still not received → Escalate to human for alternative verification

### Customer Doesn't Know Phone Number
- Ask for account email instead
- Look up by address if needed
- Transfer to billing if cannot verify

### Angry/Frustrated Customer
- Acknowledge frustration immediately
- Don't force through verification if very upset
- Offer immediate human escalation

### Repeat Caller (Same Issue)
- Previous ticket created? → Check status and update
- Previous autonomous fix failed? → Immediate escalation
- Pattern of same issue? → Flag for investigation

## Monitoring & Optimization

- Track autonomous resolution rate daily (target: 95%)
- Review escalation reasons weekly
- Identify knowledge gaps for KB improvement
- Monitor SMS verification success rate
- Track average resolution time
- Analyze repeat call patterns`,
      excerpt: 'Complete technical support journey with SMS verification, autonomous troubleshooting steps, and ticket creation for complex issues.',
      status: 'published',
      visibility: 'internal',
      categories: ['voice-ai'],
      tags: ['vapi', 'customer-journey', 'support', 'sms', 'verification', 'troubleshooting', 'residential'],
      authorId: 1,
      viewCount: 0,
      isPublic: false,
      isFeatured: false,
    }).returning();

    console.log('✅ Created KB article:', residentialSupport.title);

    // Article 5: Managing Vapi Assistants
    const [managingAssistants] = await db.insert(knowledgeDocuments).values({
      organizationId: ORGANIZATION_ID,
      title: 'Managing Vapi Assistants',
      slug: 'managing-vapi-assistants',
      content: `# Managing Vapi Assistants

## Overview

Vapi assistants are configured through the Vapi dashboard and managed via the platform's backend API. This guide covers creating, configuring, and optimizing voice AI assistants.

## Assistant Types

### 1. Triage Assistant (Entry Point)

**Purpose:** Route all inbound calls to appropriate department

**Configuration:**
- **Model:** GPT-4 (for best intent classification)
- **Voice:** Professional, neutral tone
- **First Message:** "Thank you for calling. I'm the automated assistant. How can I help you today?"
- **Temperature:** 0.3 (consistent routing)
- **Max Duration:** 60 seconds

**Tools Enabled:**
- \`lookup_customer\` - Find customer by phone
- \`check_queue\` - Check human agent availability

**System Prompt:**
\`\`\`
You are the first point of contact for all customer calls. Your ONLY job is to:

1. Quickly identify customer intent (business transfer, residential sales, residential support, other)
2. Ask ONE clarifying question if intent is unclear
3. Route to the appropriate assistant or human team

Rules:
- Keep greeting under 10 seconds
- If customer sounds angry/frustrated, immediately escalate to human
- Never try to solve problems yourself - just route correctly
- Be professional, warm, and efficient
\`\`\`

### 2. Residential Sales Assistant

**Purpose:** Convert prospects into demo appointments

**Configuration:**
- **Model:** GPT-4 (for persuasive conversations)
- **Voice:** Enthusiastic, helpful
- **First Message:** "Hi! I'm excited to help you find the perfect internet plan. Where are you located?"
- **Temperature:** 0.7 (more creative, personable)
- **Max Duration:** 300 seconds (5 minutes)

**Tools Enabled:**
- \`schedule_demo\` - Book video demo appointment
- \`schedule_callback\` - Schedule callback if not ready

**Knowledge Base:**
- Package details (speeds, pricing, features)
- Coverage areas
- Competitor comparison
- Installation process
- Promotion details

### 3. Residential Support Assistant

**Purpose:** Provide technical support and billing help

**Configuration:**
- **Model:** GPT-4 (for complex troubleshooting)
- **Voice:** Patient, empathetic
- **First Message:** "Hi, I'm here to help with technical support or billing questions. First, I'll need to verify your identity..."
- **Temperature:** 0.4 (consistent, methodical)
- **Max Duration:** 300 seconds (5 minutes)

**Tools Enabled:**
- \`lookup_customer\` - Find account by phone
- \`send_sms_code\` - Send verification code
- \`verify_sms_code\` - Verify SMS code
- \`create_ticket\` - Create support ticket in Splynx
- \`schedule_callback\` - Schedule technical callback

**Knowledge Base:**
- Troubleshooting guides (speed, connectivity, WiFi)
- Billing information
- Service plans
- Equipment specifications
- Common issues and solutions

## Creating a New Assistant

### Via API

\`\`\`typescript
POST /api/vapi/assistants

{
  "organizationId": 3,
  "name": "Residential Support Assistant",
  "role": "support",
  "description": "Handles residential technical support with SMS verification",
  "systemPrompt": "You are a patient, empathetic technical support assistant...",
  "modelProvider": "openai",
  "modelName": "gpt-4",
  "temperature": 0.4,
  "voiceProvider": "11labs",
  "voiceId": "professional_male_voice",
  "firstMessage": "Hi, I'm here to help with technical support...",
  "enabledTools": ["lookup_customer", "send_sms_code", "verify_sms_code", "create_ticket"],
  "knowledgeFileIds": ["kb_file_1", "kb_file_2"],
  "maxDurationSeconds": 300,
  "isActive": true
}
\`\`\`

### Via Seed Script

See \`server/seeds/vapiAssistants.ts\` for complete example.

## Configuring Tools

Tools are functions the assistant can call during conversations.

### Tool Configuration Format

\`\`\`typescript
{
  "name": "lookup_customer",
  "description": "Find customer account by phone number",
  "parameters": {
    "type": "object",
    "properties": {
      "phoneNumber": {
        "type": "string",
        "description": "Customer's phone number"
      }
    },
    "required": ["phoneNumber"]
  },
  "endpoint": "/api/vapi/tools/lookup_customer",
  "method": "POST"
}
\`\`\`

### Available Tools

1. **lookup_customer** - Finds customer in Splynx
2. **send_sms_code** - Sends SMS verification code
3. **verify_sms_code** - Validates SMS code
4. **create_ticket** - Creates Splynx support ticket
5. **schedule_demo** - Books demo appointment
6. **schedule_callback** - Schedules callback
7. **check_queue** - Checks human agent availability

## Uploading Knowledge Base Files

### Supported Formats
- PDF documents
- Text files (.txt)
- Markdown (.md)
- Word documents (.docx)

### Upload Process

1. **Prepare Content**
   - Clear, concise information
   - Q&A format works best
   - Include examples
   - Use bullet points

2. **Upload via API**
\`\`\`typescript
POST /api/vapi/knowledge-files

FormData:
- file: [your-file.pdf]
- category: "troubleshooting"
- description: "Common WiFi issues and solutions"
\`\`\`

3. **Link to Assistant**
\`\`\`typescript
PATCH /api/vapi/assistants/{assistantId}

{
  "knowledgeFileIds": ["kb_file_1", "kb_file_2", "kb_file_3"]
}
\`\`\`

### Knowledge Base Best Practices

- **Specificity:** Include exact steps, not general guidance
- **Examples:** Show real conversations, not just rules
- **Updates:** Keep information current
- **Testing:** Verify assistant can find answers
- **Gaps:** Monitor knowledge gap reports

## System Prompt Writing

### Effective System Prompts

**DO:**
- ✅ Be specific about goals and constraints
- ✅ Include example responses
- ✅ Define when to escalate
- ✅ List available tools
- ✅ Set tone and personality
- ✅ Specify conversation limits (time, questions)

**DON'T:**
- ❌ Make prompts too long (under 500 words ideal)
- ❌ Be vague or generic
- ❌ Forget edge cases
- ❌ Ignore escalation scenarios
- ❌ Over-complicate

### Example Structure

\`\`\`
[Role Definition]
You are a [ROLE] assistant for [COMPANY].

[Primary Goal]
Your goal is to [PRIMARY GOAL] while [CONSTRAINTS].

[Available Tools]
You have access to:
- Tool 1: [description]
- Tool 2: [description]

[Conversation Flow]
1. [Step 1]
2. [Step 2]
3. [Step 3]

[Rules]
- Rule 1
- Rule 2
- Rule 3

[Escalation]
Transfer to human if:
- Scenario 1
- Scenario 2

[Tone]
Be [ADJECTIVE], [ADJECTIVE], and [ADJECTIVE].
\`\`\`

## Testing Assistants

### Test Checklist

- [ ] Happy path conversation works correctly
- [ ] Tools are called with proper parameters
- [ ] Knowledge base queries return relevant answers
- [ ] Escalation scenarios trigger correctly
- [ ] Tone and personality match intent
- [ ] Call duration stays within limits
- [ ] Edge cases handled gracefully

### Testing Tools

1. **Vapi Dashboard** - Test via web interface
2. **Test Phone Number** - Call from development number
3. **Webhook Logs** - Review call data in platform
4. **Transcript Review** - Read conversation transcripts

## Monitoring Performance

### Key Metrics

1. **Autonomous Resolution Rate**
   - Target: 95% for support
   - Measure: % calls resolved without human

2. **Average Call Duration**
   - Target: Under 180 seconds
   - Measure: Mean duration across all calls

3. **Tool Success Rate**
   - Target: 100%
   - Measure: % tool calls that succeed

4. **Knowledge Base Hit Rate**
   - Target: 85%
   - Measure: % queries that find answers

5. **Customer Satisfaction**
   - Target: 4.5/5
   - Measure: Post-call surveys

### Optimization Loop

1. **Review Metrics** (daily)
2. **Listen to Calls** (sample 10-20/day)
3. **Identify Patterns** (common issues)
4. **Update Prompts/KB** (fix identified issues)
5. **A/B Test** (try improvements)
6. **Measure Results** (compare before/after)
7. **Iterate** (continuous improvement)

## Troubleshooting

### Assistant Not Responding

**Possible Causes:**
- API key invalid or expired
- Assistant marked as inactive
- Webhook endpoint unreachable
- Model provider down

**Solutions:**
- Verify API credentials in .env
- Check \`isActive\` flag in database
- Test webhook endpoint manually
- Check Vapi status page

### Tools Not Working

**Possible Causes:**
- Incorrect endpoint URL
- Missing parameters in tool definition
- Tool endpoint returning errors
- Authentication failure

**Solutions:**
- Verify tool endpoints in code
- Check parameter schemas match
- Review backend logs for errors
- Confirm organizationId validation

### Poor Response Quality

**Possible Causes:**
- System prompt too vague
- Wrong temperature setting
- Knowledge base outdated
- Model selection suboptimal

**Solutions:**
- Refine system prompt with examples
- Adjust temperature (lower = consistent, higher = creative)
- Update knowledge base documents
- Try GPT-4 instead of GPT-3.5

## Advanced Configuration

### Multi-Assistant Routing

Create workflow where assistants can transfer to each other:

\`\`\`typescript
{
  "canHandoffTo": ["sales_assistant_id", "support_assistant_id"],
  "handoffTriggers": ["I need to speak to sales", "transfer me"]
}
\`\`\`

### Dynamic Context Injection

Pass custom context to assistants based on caller:

\`\`\`typescript
{
  "metadata": {
    "customerTier": "premium",
    "accountBalance": "current",
    "recentTickets": 0
  }
}
\`\`\`

### Call Recording & Compliance

Enable call recording for quality and compliance:

\`\`\`typescript
{
  "recordingEnabled": true,
  "recordingChannels": "separate", // caller and assistant on separate tracks
  "transcriptionProvider": "deepgram"
}
\`\`\`

## Security & Compliance

### Data Protection
- SMS verification codes expire in 5 minutes
- Call recordings encrypted at rest
- PII scrubbed from logs after 90 days
- GDPR-compliant data handling

### Access Control
- API keys rotated every 90 days
- Webhook signatures verified
- Organization-level data isolation
- Role-based access for assistant management

## Learn More

- Customer Journey - Business Transfer
- Customer Journey - Residential Sales & Demo Scheduling
- Customer Journey - Residential Support with SMS Verification
- Vapi OKR Metrics & Performance Tracking`,
      excerpt: 'Comprehensive guide to creating, configuring, and optimizing Vapi voice AI assistants including system prompts, tools, and knowledge base management.',
      status: 'published',
      visibility: 'internal',
      categories: ['voice-ai'],
      tags: ['vapi', 'configuration', 'assistants', 'tools', 'knowledge-base', 'system-prompts'],
      authorId: 1,
      viewCount: 0,
      isPublic: false,
      isFeatured: false,
    }).returning();

    console.log('✅ Created KB article:', managingAssistants.title);

    // Article 6: OKR Metrics & Performance Tracking
    const [okrMetrics] = await db.insert(knowledgeDocuments).values({
      organizationId: ORGANIZATION_ID,
      title: 'Vapi OKR Metrics & Performance Tracking',
      slug: 'vapi-okr-metrics-performance-tracking',
      content: `# Vapi OKR Metrics & Performance Tracking

## Strategic Objective

**Title:** Autonomous Voice Support System

**Description:** Achieve 95% hands-free call resolution through intelligent voice AI that autonomously handles customer inquiries, verifies identities, creates support tickets, schedules demos, and seamlessly escalates complex issues to human agents when needed.

**Timeline:** January 1, 2025 - December 31, 2025

**Owner:** Organization Admin

## Key Results (6 Metrics)

### KR 1: Autonomous Resolution Rate ≥ 95%

**What It Measures:**
Percentage of calls resolved without human intervention.

**Why It Matters:**
This is the primary measure of AI effectiveness. Higher autonomy means lower support costs and faster resolutions for customers.

**How It's Calculated:**
\`\`\`sql
SELECT 
  ROUND(
    (SUM(CASE WHEN was_autonomous = true THEN 1 ELSE 0 END)::float / 
     COUNT(*)::float) * 100, 
    2
  ) as autonomous_rate
FROM vapi_calls
WHERE organization_id = {orgId}
  AND ended_at >= {startDate}
  AND ended_at <= {endDate}
  AND status = 'ended';
\`\`\`

**Target:** ≥95%

**Current Calculation:**
- Calls marked \`wasAutonomous = true\`: No human intervention required
- Calls marked \`wasAutonomous = false\`: Escalated to human, ticket created, or transferred

**Automated Update:**
Daily workflow runs at 9 AM using \`data_source_query\` step on \`vapiCalls\` table.

**Dashboard Display:**
- Progress bar (green if ≥95%, yellow if 85-94%, red if <85%)
- Current value vs target
- 30-day trend chart

---

### KR 2: Average Call Duration ≤ 180 seconds (3 minutes)

**What It Measures:**
Mean duration of all voice AI calls in seconds.

**Why It Matters:**
Shorter calls mean efficient problem-solving. If calls are too long, it indicates confusion or process inefficiency.

**How It's Calculated:**
\`\`\`sql
SELECT 
  ROUND(AVG(duration_seconds), 0) as avg_duration
FROM vapi_calls
WHERE organization_id = {orgId}
  AND ended_at >= {startDate}
  AND ended_at <= {endDate}
  AND status = 'ended';
\`\`\`

**Target:** ≤180 seconds

**Benchmarks:**
- Triage calls: <60 seconds
- Sales calls: 120-240 seconds
- Support calls: 90-180 seconds

**Automated Update:**
Daily workflow at 9 AM.

**Dashboard Display:**
- Current average in seconds
- Converted to minutes for readability
- 7-day bar chart showing daily averages
- Trend indicator (↑ or ↓)

---

### KR 3: SMS Verification Success Rate ≥ 95%

**What It Measures:**
Percentage of SMS verification attempts that succeed.

**Why It Matters:**
Critical for security and customer trust. Low verification rates indicate UX issues or technical problems.

**How It's Calculated:**
\`\`\`sql
SELECT 
  ROUND(
    (SUM(CASE WHEN sms_code_verified = true THEN 1 ELSE 0 END)::float / 
     SUM(CASE WHEN sms_code_sent = true THEN 1 ELSE 0 END)::float) * 100, 
    2
  ) as verification_rate
FROM vapi_calls
WHERE organization_id = {orgId}
  AND ended_at >= {startDate}
  AND ended_at <= {endDate}
  AND sms_code_sent = true;
\`\`\`

**Target:** ≥95%

**Failure Scenarios:**
- Wrong phone number provided
- Code not received (SMS delivery issue)
- Customer unable to read code correctly
- Code expired (5-minute timeout)

**Automated Update:**
Daily workflow at 9 AM.

**Dashboard Display:**
- Success rate percentage
- Total SMS attempts vs successful verifications
- Failure reason breakdown (if available)

---

### KR 4: Demo Conversion Rate ≥ 40%

**What It Measures:**
Percentage of sales calls that result in a scheduled demo.

**Why It Matters:**
Directly impacts revenue pipeline. This measures sales assistant effectiveness at converting interested prospects.

**How It's Calculated:**
\`\`\`sql
SELECT 
  ROUND(
    (SUM(CASE WHEN demo_scheduled = true THEN 1 ELSE 0 END)::float / 
     COUNT(*)::float) * 100, 
    2
  ) as demo_conversion_rate
FROM vapi_calls
WHERE organization_id = {orgId}
  AND ended_at >= {startDate}
  AND ended_at <= {endDate}
  AND customer_intent = 'sales';
\`\`\`

**Target:** ≥40%

**Industry Benchmarks:**
- Cold calls: 2-5% conversion
- Warm leads: 20-30% conversion
- **Inbound sales calls: 40-60% conversion** ← Our target

**Optimization Factors:**
- System prompt quality (benefits vs features)
- Objection handling effectiveness
- Demo availability/scheduling flexibility
- Assistant tone and enthusiasm

**Automated Update:**
Daily workflow at 9 AM.

**Dashboard Display:**
- Conversion rate percentage
- Total sales calls vs demos scheduled
- 30-day trend chart
- Month-over-month comparison

---

### KR 5: Knowledge Base Coverage ≥ 85%

**What It Measures:**
Percentage of calls where the assistant successfully found answers in the knowledge base (no knowledge gaps reported).

**Why It Matters:**
Indicates KB completeness. High coverage means fewer escalations and more autonomous resolutions.

**How It's Calculated:**
\`\`\`sql
SELECT 
  ROUND(
    (SUM(CASE WHEN knowledge_gaps IS NULL OR jsonb_array_length(knowledge_gaps) = 0 
          THEN 1 ELSE 0 END)::float / 
     COUNT(*)::float) * 100, 
    2
  ) as kb_coverage_rate
FROM vapi_calls
WHERE organization_id = {orgId}
  AND ended_at >= {startDate}
  AND ended_at <= {endDate}
  AND status = 'ended';
\`\`\`

**Target:** ≥85%

**Knowledge Gaps:**
When assistant can't find an answer, it logs the question in \`knowledgeGaps\` field.

**Gap Examples:**
- "What is the cancellation policy for business accounts?"
- "Do you offer static IP addresses?"
- "What's the installation process for apartments?"

**Automated Update:**
Daily workflow at 9 AM.

**Dashboard Display:**
- Coverage rate percentage
- Total calls vs calls with gaps
- Top 10 knowledge gaps (for documentation prioritization)
- Trend over time

**Action Items:**
Weekly review of knowledge gaps → Create KB articles → Update assistant KB → Re-measure

---

### KR 6: Support Tickets Created ≥ 300/month

**What It Measures:**
Total number of support tickets created autonomously by voice AI per month.

**Why It Matters:**
Demonstrates value delivered. More tickets = more customer issues handled without staff intervention.

**How It's Calculated:**
\`\`\`sql
SELECT 
  COUNT(*) as tickets_created
FROM vapi_calls
WHERE organization_id = {orgId}
  AND ended_at >= {startDate}
  AND ended_at <= {endDate}
  AND ticket_created = true;
\`\`\`

**Target:** ≥300 tickets per month (≈10-15 per day)

**What This Includes:**
- Support requests escalated to human agents
- Technical issues requiring engineer visits
- Billing inquiries requiring manual review
- Service change requests
- Callback requests

**Automated Update:**
Daily workflow at 9 AM.

**Dashboard Display:**
- Monthly ticket count
- Daily average
- 7-day bar chart
- Month-to-date progress vs target (300)

---

## Dashboard Views

### Main Performance Dashboard (/vapi/performance)

**Header:**
- Objective title and status
- Timeline (Jan 1 - Dec 31, 2025)
- Overall progress indicator

**Key Results Section:**
6 cards showing:
- Current value
- Target value
- Progress bar with color coding
- Status badge (On Track / At Risk / Off Track)
- Trend indicator (↑ improving, → stable, ↓ declining)
- Last updated timestamp

**Tabs:**

1. **Performance Trends**
   - 30-day line chart (autonomous rate, demo conversion, KB coverage)
   - 7-day bar charts (call duration, tickets created)
   - Date range selector

2. **Recent Calls**
   - Last 100 calls
   - Columns: Timestamp, Intent, Duration, Status, Autonomous (Yes/No)
   - Click to view transcript
   - Filter by status/intent

3. **Insights**
   - Key insights (3 auto-generated observations)
   - Next actions (3 recommended improvements)
   - Knowledge gaps list
   - Performance alerts

---

## Automated Workflows

### Daily Metrics Sync Workflow

**Trigger:** Schedule (daily at 9:00 AM)

**Steps:**

1. **Query Autonomous Resolution Rate**
   \`\`\`typescript
   {
     stepType: 'data_source_query',
     config: {
       sourceTable: 'vapiCalls',
       queryConfig: {
         aggregation: 'custom_sql',
         customAggregation: 'ROUND((SUM(CASE WHEN was_autonomous THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100, 2)',
         filters: [
           { field: 'startedAt', operator: 'gte', value: '{last30Days}' },
           { field: 'status', operator: 'equals', value: 'ended' }
         ]
       },
       resultVariable: 'autonomousRate',
       updateKeyResult: {
         keyResultId: 1,
         updateType: 'set_value'
       }
     }
   }
   \`\`\`

2. **Query Average Call Duration**
3. **Query SMS Verification Success**
4. **Query Demo Conversion Rate**
5. **Query KB Coverage**
6. **Count Tickets Created**

**Result:**
All 6 KRs updated daily with latest data.

---

### Escalation Spike Alert Workflow

**Trigger:** Webhook (on \`call_ended\` event)

**Purpose:** Alert team when escalations spike

**Steps:**

1. **Count Recent Escalations**
   \`\`\`typescript
   {
     stepType: 'data_source_query',
     config: {
       sourceTable: 'vapiCalls',
       queryConfig: {
         aggregation: 'count',
         filters: [
           { field: 'endedAt', operator: 'gte', value: '{lastHour}' },
           { field: 'wasAutonomous', operator: 'equals', value: false }
         ]
       },
       resultVariable: 'recentEscalations'
     }
   }
   \`\`\`

2. **Conditional Check**
   \`\`\`typescript
   {
     stepType: 'conditional',
     config: {
       condition: '{recentEscalations} > 5',
       ifTrue: 'create_alert',
       ifFalse: 'end'
     }
   }
   \`\`\`

3. **Create Work Item**
   \`\`\`typescript
   {
     stepType: 'create_work_item',
     config: {
       title: 'ALERT: Vapi Escalation Spike Detected',
       description: '{recentEscalations} calls escalated in the last hour. Investigate assistant performance.',
       workItemType: 'vapi_alert',
       priority: 'high',
       assigneeId: '{support_manager_id}'
     }
   }
   \`\`\`

---

### Knowledge Gap Detection Workflow

**Trigger:** Schedule (weekly on Mondays at 10:00 AM)

**Purpose:** Identify KB improvement opportunities

**Steps:**

1. **Query Knowledge Gaps**
   \`\`\`typescript
   {
     stepType: 'data_source_query',
     config: {
       sourceTable: 'vapiCalls',
       queryConfig: {
         aggregation: 'custom',
         customQuery: \`
           SELECT jsonb_array_elements_text(knowledge_gaps) as gap
           FROM vapi_calls
           WHERE organization_id = {orgId}
             AND knowledge_gaps IS NOT NULL
             AND ended_at >= NOW() - INTERVAL '7 days'
           GROUP BY gap
           ORDER BY COUNT(*) DESC
           LIMIT 10
         \`,
         resultVariable: 'topGaps'
       }
     }
   }
   \`\`\`

2. **Check If Gaps Exist**
3. **Create Work Item**
   \`\`\`typescript
   {
     stepType: 'create_work_item',
     config: {
       title: 'Expand Vapi Knowledge Base - {count} gaps detected',
       description: 'Top knowledge gaps:\n{topGaps}',
       workItemType: 'vapi_kb_improvement',
       priority: 'medium',
       assigneeId: '{content_manager_id}'
     }
   }
   \`\`\`

---

## Monitoring Best Practices

### Daily Review (5 minutes)

1. Check dashboard for red/yellow KR status
2. Review "Insights" tab for alerts
3. Scan recent call log for anomalies

### Weekly Deep Dive (30 minutes)

1. Review all 6 KR trends
2. Listen to 10-20 call recordings
3. Analyze knowledge gaps list
4. Update KB articles if needed
5. Adjust system prompts if patterns emerge

### Monthly Performance Review (60 minutes)

1. Full KR analysis vs targets
2. Month-over-month comparison
3. A/B test new assistant configurations
4. Stakeholder report generation
5. Strategic adjustments for next month

---

## Troubleshooting Metrics

### Autonomous Rate Dropping

**Possible Causes:**
- New issue types not in KB
- System prompt needs updating
- Tools failing/broken
- Increased customer complexity

**Solutions:**
- Add new KB articles
- Refine system prompts
- Fix broken tools
- Review call transcripts for patterns

### Call Duration Increasing

**Possible Causes:**
- Verbose system prompts
- Too many questions asked
- Slow tool responses
- Confused customers

**Solutions:**
- Simplify prompts
- Optimize question flow
- Cache frequently-accessed data
- Improve first message clarity

### Demo Conversion Dropping

**Possible Causes:**
- Poor objection handling
- Scheduling friction
- Weak value proposition
- Competition offering better deals

**Solutions:**
- Update objection scripts
- More flexible demo times
- Emphasize unique benefits
- Review competitive landscape

### KB Coverage Declining

**Possible Causes:**
- New product features launched
- Seasonal questions (holidays, etc.)
- Policy changes not documented
- Regional/specific questions

**Solutions:**
- Document new features immediately
- Prepare seasonal KB updates
- Update KB when policies change
- Create region-specific guides

---

## Reporting & Stakeholders

### Weekly Report (Auto-generated)

**Recipients:** Support Manager, Sales Manager

**Contents:**
- All 6 KRs with status
- Week-over-week changes
- Top knowledge gaps
- Action items

### Monthly Executive Summary

**Recipients:** C-level, Board

**Contents:**
- Strategic objective progress
- ROI analysis (calls handled vs staff cost)
- Customer satisfaction trends
- Roadmap for next month

---

## Integration with Other Systems

### Splynx Integration
- Customer lookups for verification
- Ticket creation for escalations
- Account status checks

### Work Items
- Escalations create work items automatically
- Priority based on issue type
- Assignment based on customer intent

### AI Assistant
- Can query Vapi call history
- Provides context for human agents
- Suggests KB improvements based on gaps

---

## Success Metrics Summary

| Key Result | Target | Current | Status |
|------------|--------|---------|--------|
| Autonomous Resolution | ≥95% | TBD | 🟡 |
| Avg Call Duration | ≤180s | TBD | 🟡 |
| SMS Verification | ≥95% | TBD | 🟡 |
| Demo Conversion | ≥40% | TBD | 🟡 |
| KB Coverage | ≥85% | TBD | 🟡 |
| Tickets Created | ≥300/mo | TBD | 🟡 |

*TBD values will populate once seed scripts run and calls begin.*

---

## Learn More

- Vapi Voice AI System Overview
- Customer Journey - Business Transfer
- Customer Journey - Residential Sales & Demo Scheduling
- Customer Journey - Residential Support with SMS Verification
- Managing Vapi Assistants`,
      excerpt: 'Complete guide to the 6 OKR metrics tracking Vapi performance including calculation methods, automated workflows, and optimization strategies.',
      status: 'published',
      visibility: 'internal',
      categories: ['voice-ai'],
      tags: ['vapi', 'okr', 'metrics', 'kpi', 'performance', 'tracking', 'dashboards'],
      authorId: 1,
      viewCount: 0,
      isPublic: false,
      isFeatured: true,
    }).returning();

    console.log('✅ Created KB article:', okrMetrics.title);

    console.log('\n🎉 Successfully created all 6 Vapi KB articles!');
    console.log('\n📚 Articles created:');
    console.log('1. Vapi Voice AI System Overview');
    console.log('2. Customer Journey - Business Transfer');
    console.log('3. Customer Journey - Residential Sales & Demo Scheduling');
    console.log('4. Customer Journey - Residential Support with SMS Verification');
    console.log('5. Managing Vapi Assistants');
    console.log('6. Vapi OKR Metrics & Performance Tracking');

  } catch (error) {
    console.error('❌ Error seeding Vapi Knowledge Base:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedVapiKnowledgeBase()
    .then(() => {
      console.log('\n✅ Vapi Knowledge Base seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Vapi Knowledge Base seed failed:', error);
      process.exit(1);
    });
}

export { seedVapiKnowledgeBase };
