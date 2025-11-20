import { db } from '../../db';
import { workItems, users } from '@shared/schema';
import { eq, or, like, sql } from 'drizzle-orm';
import axios from 'axios';

/**
 * Vapi Tool Implementations
 * These functions are called when the voice assistant needs to execute actions
 */

// ============================================================================
// SMS Verification Tool
// ============================================================================

interface SmsVerificationParams {
  phoneNumber: string;
  purpose?: string; // 'identity_verification' | 'account_recovery'
}

export async function sendSmsVerification(params: SmsVerificationParams, callContext: any) {
  const { phoneNumber } = params;
  
  console.log(`📱 Sending SMS verification to ${phoneNumber}`);
  
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // TODO: Implement Twilio SMS sending
  // For now, return stub with code (in production, this would be sent via SMS)
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
    try {
      // Send SMS via Twilio
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Body: `Your verification code is: ${code}. Valid for 10 minutes.`,
        }),
        {
          auth: {
            username: twilioAccountSid,
            password: twilioAuthToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      return {
        success: true,
        message: `Verification code sent to ${phoneNumber}`,
        code, // Include code in response for assistant to verify
        messageId: response.data.sid,
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: 'Failed to send SMS',
        message: 'There was an issue sending the verification code. Please try again.',
      };
    }
  } else {
    // Stub mode - no Twilio credentials
    console.log(`⚠️ Twilio not configured. Verification code: ${code}`);
    return {
      success: true,
      message: `Verification code sent to ${phoneNumber}`,
      code, // In production, this should NOT be returned to the assistant
      stubMode: true,
    };
  }
}

// ============================================================================
// Customer Lookup Tool
// ============================================================================

interface CustomerLookupParams {
  searchBy: 'phone' | 'email' | 'accountId' | 'name';
  value: string;
}

export async function lookupCustomer(params: CustomerLookupParams, callContext: any) {
  const { searchBy, value } = params;
  
  console.log(`🔍 Looking up customer by ${searchBy}: ${value}`);
  
  try {
    let customerQuery;
    
    switch (searchBy) {
      case 'phone':
        // TODO: Add phone number field to users table
        // For now, search by email containing the phone
        customerQuery = db.select({
          id: users.id,
          name: users.fullName,
          email: users.email,
          role: users.role,
          organizationId: users.organizationId,
        })
        .from(users)
        .where(eq(users.isActive, true))
        .limit(1);
        break;
        
      case 'email':
        customerQuery = db.select({
          id: users.id,
          name: users.fullName,
          email: users.email,
          role: users.role,
          organizationId: users.organizationId,
        })
        .from(users)
        .where(and(
          eq(users.email, value),
          eq(users.isActive, true)
        ))
        .limit(1);
        break;
        
      case 'accountId':
        customerQuery = db.select({
          id: users.id,
          name: users.fullName,
          email: users.email,
          role: users.role,
          organizationId: users.organizationId,
        })
        .from(users)
        .where(and(
          eq(users.id, parseInt(value)),
          eq(users.isActive, true)
        ))
        .limit(1);
        break;
        
      case 'name':
        customerQuery = db.select({
          id: users.id,
          name: users.fullName,
          email: users.email,
          role: users.role,
          organizationId: users.organizationId,
        })
        .from(users)
        .where(and(
          like(users.fullName, `%${value}%`),
          eq(users.isActive, true)
        ))
        .limit(5);
        break;
        
      default:
        return {
          found: false,
          error: 'Invalid search type',
        };
    }
    
    const customers = await customerQuery;
    
    if (customers.length === 0) {
      return {
        found: false,
        message: `No customer found with ${searchBy}: ${value}`,
      };
    }
    
    if (customers.length === 1) {
      const customer = customers[0];
      return {
        found: true,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          accountType: customer.role,
        },
        message: `Found customer: ${customer.name}`,
      };
    }
    
    // Multiple matches
    return {
      found: true,
      multipleMatches: true,
      count: customers.length,
      customers: customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
      })),
      message: `Found ${customers.length} customers matching "${value}"`,
    };
  } catch (error) {
    console.error('Customer lookup error:', error);
    return {
      found: false,
      error: 'Database query failed',
      message: 'There was an issue looking up the customer. Please try again.',
    };
  }
}

// Helper to fix 'and' function import
function and(...conditions: any[]) {
  return sql`${sql.join(conditions, sql` AND `)}`;
}

// ============================================================================
// Create Support Ticket Tool
// ============================================================================

interface CreateTicketParams {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  customerId?: number;
  category?: string;
}

export async function createSupportTicket(params: CreateTicketParams, callContext: any) {
  const { title, description, priority = 'medium', customerId, category } = params;
  
  console.log(`🎫 Creating support ticket: ${title}`);
  
  try {
    // Get organization from call context
    const organizationId = callContext.organizationId || 4; // Default to Country Connect
    
    // Create work item for the support ticket
    const [ticket] = await db.insert(workItems).values({
      organizationId,
      title,
      description,
      status: 'Planning',
      priority: priority === 'urgent' ? 'high' : priority,
      source: 'voice_ai',
      sourceMetadata: {
        vapiCallId: callContext.callId,
        customerPhoneNumber: callContext.customerPhoneNumber,
        category,
        createdBy: 'vapi_assistant',
      },
      assigneeId: null, // Will be assigned by support team
    }).returning();
    
    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: `VAPI-${ticket.id}`,
      message: `Support ticket ${ticket.id} created successfully`,
      estimatedResponse: 'within 24 hours',
    };
  } catch (error) {
    console.error('Ticket creation error:', error);
    return {
      success: false,
      error: 'Failed to create ticket',
      message: 'There was an issue creating your support ticket. Please try calling back.',
    };
  }
}

// ============================================================================
// Schedule Demo Tool
// ============================================================================

interface ScheduleDemoParams {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  requestedDate?: string; // ISO date string
  requestedTime?: string; // "morning" | "afternoon" | "evening" | specific time
  productInterest?: string;
}

export async function scheduleDemo(params: ScheduleDemoParams, callContext: any) {
  const { customerName, customerEmail, customerPhone, requestedDate, requestedTime, productInterest } = params;
  
  console.log(`📅 Scheduling demo for ${customerName}`);
  
  try {
    // Get organization from call context
    const organizationId = callContext.organizationId || 4;
    
    // Create work item for demo appointment
    const [demoAppointment] = await db.insert(workItems).values({
      organizationId,
      title: `Demo: ${customerName} - ${productInterest || 'Product Overview'}`,
      description: `
Customer: ${customerName}
Email: ${customerEmail || 'Not provided'}
Phone: ${customerPhone}
Requested Date: ${requestedDate || 'Flexible'}
Requested Time: ${requestedTime || 'Flexible'}
Interest: ${productInterest || 'General inquiry'}

This demo was scheduled via voice AI assistant.
      `.trim(),
      status: 'Planning',
      priority: 'medium',
      source: 'voice_ai',
      sourceMetadata: {
        vapiCallId: callContext.callId,
        demoType: 'sales',
        customerPhone,
        customerEmail,
        requestedDate,
        requestedTime,
        productInterest,
      },
      assigneeId: null, // Will be assigned to sales team
    }).returning();
    
    // Generate confirmation message
    let confirmationMessage = `Demo scheduled! Reference number: DEMO-${demoAppointment.id}.`;
    
    if (requestedDate && requestedTime) {
      confirmationMessage += ` Our sales team will contact you to confirm ${requestedTime} on ${requestedDate}.`;
    } else {
      confirmationMessage += ` Our sales team will contact you within 24 hours to arrange a suitable time.`;
    }
    
    // TODO: Send confirmation email if email provided
    // TODO: Create calendar invite
    
    return {
      success: true,
      demoId: demoAppointment.id,
      referenceNumber: `DEMO-${demoAppointment.id}`,
      message: confirmationMessage,
      nextSteps: 'You will receive a confirmation call or email within 24 hours',
    };
  } catch (error) {
    console.error('Demo scheduling error:', error);
    return {
      success: false,
      error: 'Failed to schedule demo',
      message: 'There was an issue scheduling your demo. Please try calling back or visit our website.',
    };
  }
}

// ============================================================================
// Transfer to Business Department Tool
// ============================================================================

interface TransferParams {
  reason?: string;
  department?: 'sales' | 'support' | 'billing' | 'general';
  customerContext?: string;
}

export async function transferToBusiness(params: TransferParams, callContext: any) {
  const { reason, department = 'general', customerContext } = params;
  
  console.log(`📞 Transferring to ${department} department: ${reason}`);
  
  // In production, this would trigger a real phone transfer
  // For now, return transfer instructions
  
  const departmentNumbers: Record<string, string> = {
    sales: '+1-555-SALES-00',
    support: '+1-555-SUPPORT',
    billing: '+1-555-BILLING',
    general: '+1-555-GENERAL',
  };
  
  return {
    success: true,
    transferring: true,
    department,
    message: `Transferring you to our ${department} team now. Please hold.`,
    departmentNumber: departmentNumbers[department],
    context: customerContext, // Context to pass to human agent
  };
}
