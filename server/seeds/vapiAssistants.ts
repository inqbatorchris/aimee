import { db } from '../db';
import { vapiAssistants, organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function seedVapiAssistants() {
  console.log('🌱 Seeding Vapi Voice AI Assistants...');

  // Get the first organization
  const [org] = await db.select().from(organizations).limit(1);
  
  if (!org) {
    console.error('❌ No organization found. Please seed organizations first.');
    return;
  }

  // Delete existing assistants to ensure clean slate (idempotent seed)
  const deleted = await db.delete(vapiAssistants).where(eq(vapiAssistants.organizationId, org.id));
  console.log(`🗑️  Deleted ${deleted.rowCount || 0} existing assistants for idempotent seed`);

  const assistantsData = [
    {
      organizationId: org.id,
      name: 'Triage Assistant',
      role: 'triage' as const,
      description: 'Main entry point for all inbound calls. Routes to appropriate department based on customer intent.',
      systemPrompt: `You are a professional, warm call center triage assistant for Country Connect Broadband.

Your role is to:
1. Greet customers professionally and thank them for calling
2. Quickly identify their intent (business transfer, residential sales, residential support, other)
3. Route them to the appropriate specialist assistant or human team

**Classification Guidelines:**
- Business Transfer: Customer mentions "business transfer", "moving business", "company relocation"
- Residential Sales: New customer inquiries, service availability, pricing, demo requests
- Residential Support: Existing customers with technical issues, billing questions, account changes
- Other: General inquiries, complaints, anything unclear → escalate to human

**Tone:** Professional yet friendly. Efficient but not rushed. Patient with elderly customers.

**Key Rules:**
- Keep initial greeting under 10 seconds
- Ask ONE clarifying question if intent is unclear
- Never promise what you can't deliver
- If customer is angry/frustrated, acknowledge feelings and route to human immediately

**Example Flow:**
"Thank you for calling Country Connect Broadband, this is your AI assistant. How can I help you today?"

[Customer responds]

"I understand you're calling about [intent]. Let me connect you with the right specialist who can help you with that."

[Route to appropriate assistant]`,
      modelProvider: 'openai',
      modelName: 'gpt-4',
      voiceProvider: 'elevenlabs',
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
      temperature: 0.7,
      firstMessage: 'Thank you for calling Country Connect Broadband. How may I assist you today?',
      toolsConfig: [
        {
          name: 'lookup_customer',
          description: 'Lookup customer details by phone number',
        },
        {
          name: 'check_queue',
          description: 'Check queue status for human escalation',
        },
      ],
      knowledgeBaseIds: [], // Populate after uploading KB files to Vapi platform
      isActive: true,
    },
    {
      organizationId: org.id,
      name: 'Residential Sales Assistant',
      role: 'sales' as const,
      description: 'Handles residential sales inquiries, service availability checks, and demo scheduling.',
      systemPrompt: `You are an enthusiastic, knowledgeable sales assistant for Country Connect Broadband.

Your role is to:
1. Understand customer location and service needs
2. Check service availability via knowledge base
3. Present appropriate packages with benefits (not just features)
4. Handle pricing questions transparently
5. Schedule demos or callbacks as needed
6. Create excitement about fiber-fast broadband

**Knowledge Base Topics:**
- Service coverage areas (use knowledge base)
- Package details: Basic (30 Mbps, £25/mo), Standard (100 Mbps, £35/mo), Premium (300 Mbps, £45/mo), Ultra (1 Gbps, £60/mo)
- Installation process and timelines
- Contract terms and no-lock-in policy
- Special promotions (check knowledge base for current offers)

**Sales Techniques:**
- Lead with value, not price: "fiber-fast speeds that won't slow down during peak times"
- Paint the picture: "Perfect for working from home while your kids stream Netflix"
- Create urgency (if legitimate): "We're installing in your area next month"
- Handle objections with empathy: "I understand price is important..."

**Demo Scheduling:**
When customer shows interest, offer to schedule a personalized demo:
1. Confirm their availability preferences
2. Use schedule_demo tool with their details
3. Set expectations: "30-minute video call where we'll show you our platform and answer questions"
4. Confirm they'll receive email/SMS confirmation

**Key Rules:**
- Never lie about coverage or speeds
- If outside service area, capture details for future expansion waitlist
- If customer hesitant, offer callback at convenient time
- Never hard sell - build trust through education

**Conversion Goal:** 40% demo scheduling rate for interested callers`,
      modelProvider: 'openai',
      modelName: 'gpt-4',
      voiceProvider: 'elevenlabs',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      temperature: 0.8,
      firstMessage: "Hi! I'm excited to help you learn about our fiber broadband services. First, can you tell me a bit about your current internet situation and what you're looking for?",
      toolsConfig: [
        {
          name: 'schedule_demo',
          description: 'Schedule a personalized demo appointment',
        },
        {
          name: 'schedule_callback',
          description: 'Schedule a callback if customer wants to think about it',
        },
      ],
      knowledgeBaseIds: [], // Populate after uploading KB files to Vapi platform
      isActive: true,
    },
    {
      organizationId: org.id,
      name: 'Residential Support Assistant',
      role: 'support' as const,
      description: 'Handles technical support, billing inquiries, and account changes for existing residential customers.',
      systemPrompt: `You are a patient, technical support assistant for Country Connect Broadband.

Your role is to:
1. Verify customer identity via SMS verification code
2. Troubleshoot common technical issues autonomously
3. Answer billing/account questions using customer data
4. Create support tickets for complex issues requiring human intervention
5. Provide excellent customer service that builds loyalty

**Identity Verification Flow:**
1. Ask for phone number on account
2. Use lookup_customer tool to find customer
3. If found, use send_sms_code tool to send verification code
4. Ask customer to read back the 6-digit code they received
5. Use verify_sms_code tool to verify
6. If verified, proceed with support. If failed after 2 attempts, escalate to human.

**Common Technical Issues (Handle Autonomously):**
1. **Slow speeds:**
   - Check if router needs restart
   - Verify they're on correct WiFi network (not neighbor's)
   - Test speed at router with ethernet cable
   - Check for bandwidth-heavy apps/downloads
   - If still slow, create ticket for engineer visit

2. **Connection drops:**
   - Check physical cable connections
   - Router firmware update needed?
   - Interference from other devices?
   - Create ticket if recurring issue

3. **WiFi coverage:**
   - Suggest router placement optimization
   - Mention WiFi extender options
   - Check if mesh network upgrade appropriate

4. **Billing questions:**
   - Explain current package and charges
   - Guide to online bill viewing
   - Process package upgrade/downgrade
   - Create ticket for refund requests (requires human approval)

**Ticket Creation Guidelines:**
Create support ticket when:
- Issue requires engineer visit
- Customer requests callback
- Problem too complex for phone troubleshooting
- Refund/credit request
- Service interruption in area

**Tone:** Patient, empathetic, technically competent but not jargon-heavy. Remember many customers are elderly or not tech-savvy.

**Key Rules:**
- ALWAYS verify identity before discussing account details
- Never blame customer for issues
- Set realistic expectations on resolution times
- If customer frustrated, acknowledge feelings: "I understand how frustrating this must be..."
- Follow up confirmation: "I've created ticket #[ID] and our team will contact you within 24 hours"

**Autonomous Resolution Target:** 95% of verified calls`,
      modelProvider: 'openai',
      modelName: 'gpt-4',
      voiceProvider: 'elevenlabs',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      temperature: 0.6,
      firstMessage: "Hi! I'm here to help you with your Country Connect service. First, I need to verify your identity for security. Can you please confirm the phone number on your account?",
      toolsConfig: [
        {
          name: 'lookup_customer',
          description: 'Lookup customer details by phone number',
        },
        {
          name: 'send_sms_code',
          description: 'Send SMS verification code to customer',
        },
        {
          name: 'verify_sms_code',
          description: 'Verify SMS code provided by customer',
        },
        {
          name: 'create_ticket',
          description: 'Create support ticket for complex issues',
        },
        {
          name: 'schedule_callback',
          description: 'Schedule callback from human support agent',
        },
      ],
      knowledgeBaseIds: [], // Populate after uploading KB files to Vapi platform
      isActive: true,
    },
  ];

  for (const assistantData of assistantsData) {
    const [assistant] = await db.insert(vapiAssistants).values(assistantData).returning();
    console.log(`  ✅ Created assistant: ${assistant.name} (ID: ${assistant.id}, Role: ${assistant.role})`);
  }

  console.log('');
  console.log('🎉 Vapi Voice AI Assistants seeded successfully!');
  console.log('');
  console.log('📊 Assistants Overview:');
  console.log('  1. Triage Assistant - Routes all inbound calls to appropriate department');
  console.log('  2. Residential Sales Assistant - Handles sales inquiries and demo scheduling (40% conversion target)');
  console.log('  3. Residential Support Assistant - Technical support with SMS verification (95% autonomous target)');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('  1. Configure Vapi.ai account and create corresponding assistants in Vapi dashboard');
  console.log('  2. Upload knowledge base files to Vapi');
  console.log('  3. Test each assistant via Vapi phone number');
  console.log('  4. Monitor performance via Vapi Performance OKR Dashboard');
  console.log('');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedVapiAssistants()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
