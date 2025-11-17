import { db } from '../../db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { keyResults, workItems, objectives } from '@shared/schema';
import { SplynxService } from '../integrations/splynxService';
import { PXCService } from '../integrations/pxcService';

export class ActionHandlers {
  /**
   * Execute an integration-specific action
   */
  async executeIntegrationAction(
    integrationType: string,
    action: string,
    parameters: any,
    credentials: any,
    context: any
  ): Promise<any> {
    switch (integrationType) {
      case 'splynx':
        return await this.handleSplynxAction(action, parameters, credentials, context);
      
      case 'pxc':
        return await this.handlePXCAction(action, parameters, credentials, context);
      
      case 'xero':
        return await this.handleXeroAction(action, parameters, credentials);
      
      case 'outlook':
        return await this.handleOutlookAction(action, parameters, credentials);
      
      case 'firebase':
        return await this.handleFirebaseAction(action, parameters, credentials);
      
      case 'openai':
        return await this.handleOpenAIAction(action, parameters, credentials, context);
      
      default:
        throw new Error(`Unsupported integration type: ${integrationType}`);
    }
  }

  /**
   * Handle Splynx API actions
   */
  private async handleSplynxAction(action: string, parameters: any, credentials: any, context: any): Promise<any> {
    const { baseUrl, authHeader } = credentials || {};
    
    console.log(`[ActionHandlers] 🔧 Splynx Action: ${action}`);
    console.log(`[ActionHandlers]   Credentials: ✓ Loaded`);
    
    if (!baseUrl || !authHeader) {
      throw new Error('Splynx credentials not configured');
    }

    // Use the new SplynxService to execute actions
    const splynxService = new SplynxService({
      baseUrl: baseUrl,
      authHeader,
    });

    // Add lastSuccessfulRunAt to parameters for incremental fetching
    const enrichedParameters = {
      ...parameters,
      sinceDate: context?.lastSuccessfulRunAt
    };

    if (context?.lastSuccessfulRunAt) {
      console.log(`[ActionHandlers]   🔄 Using incremental mode since: ${new Date(context.lastSuccessfulRunAt).toISOString()}`);
    } else {
      console.log(`[ActionHandlers]   ⚠️ No lastSuccessfulRunAt - fetching all data`);
    }

    console.log(`[ActionHandlers]   📡 Calling Splynx service...`);
    
    const result = await splynxService.executeAction(action, enrichedParameters);
    
    console.log(`[ActionHandlers]   ✓ Splynx returned:`, JSON.stringify(result, null, 2));
    
    // Return result directly - the WorkflowExecutor will handle storing it in context
    return result;
  }

  /**
   * Handle PXC (TalkTalk Wholesale) API actions
   */
  private async handlePXCAction(action: string, parameters: any, credentials: any, context: any): Promise<any> {
    console.log(`[ActionHandlers] 🔧 PXC Action: ${action}`);
    
    // Redact sensitive data from logs
    const safeParameters = { ...parameters };
    if (safeParameters.token) {
      safeParameters.token = '[REDACTED]';
    }
    console.log(`[ActionHandlers]   Parameters:`, JSON.stringify(safeParameters, null, 2));
    
    const { client_id, client_secret, billing_account_id } = credentials || {};
    
    if (!client_id || !client_secret || !billing_account_id) {
      throw new Error('PXC credentials not configured (missing client_id, client_secret, or billing_account_id)');
    }

    const pxcService = new PXCService();

    switch (action) {
      case 'authenticate_pxc': {
        console.log(`[ActionHandlers]   📡 Authenticating with PXC...`);
        const token = await pxcService.authenticate({ client_id, client_secret, billing_account_id });
        console.log(`[ActionHandlers]   ✓ PXC authentication successful`);
        return { partnerJWT: token };
      }
      
      case 'fetch_orders': {
        const token = parameters.token || context.partnerJWT;
        if (!token) {
          throw new Error('JWT token required for fetch_orders action');
        }
        
        console.log(`[ActionHandlers]   📡 Fetching PXC orders...`);
        
        // Support incremental fetching using lastSuccessfulRunAt
        const lastUpdateSince = context?.lastSuccessfulRunAt 
          ? new Date(context.lastSuccessfulRunAt).toISOString()
          : undefined;
        
        if (lastUpdateSince) {
          console.log(`[ActionHandlers]   🔄 Using incremental mode since: ${lastUpdateSince}`);
        } else {
          console.log(`[ActionHandlers]   ⚠️ No lastSuccessfulRunAt - fetching all orders`);
        }
        
        const orders = await pxcService.fetchOrders(
          token,
          billing_account_id,
          {
            ...parameters,
            lastUpdateSince
          }
        );
        
        // Filter to today's orders
        const todayOrders = pxcService.filterTodayOrders(orders);
        
        // Categorize by state
        const categorized = pxcService.categorizeOrdersByState(todayOrders);
        
        console.log(`[ActionHandlers]   ✓ PXC orders fetched and filtered`);
        
        return {
          totalOrders: orders.length,
          todayOrders: todayOrders.length,
          orders: todayOrders,
          orderIds: todayOrders.map(o => o.id),
          categorized: {
            held: categorized.held.length,
            inProgress: categorized.inProgress.length,
            failed: categorized.failed.length,
            rejected: categorized.rejected.length,
            other: categorized.other.length
          },
          heldOrders: categorized.held,
          inProgressOrders: categorized.inProgress,
          failedOrders: categorized.failed,
          rejectedOrders: categorized.rejected
        };
      }
      
      case 'get_order_details': {
        const token = parameters.token || context.partnerJWT;
        if (!token) {
          throw new Error('JWT token required for get_order_details action');
        }
        
        if (!parameters.orderId) {
          throw new Error('orderId parameter required for get_order_details action');
        }
        
        console.log(`[ActionHandlers]   📡 Fetching order details for: ${parameters.orderId}`);
        
        const orderDetails = await pxcService.getOrderDetails(token, parameters.orderId);
        
        console.log(`[ActionHandlers]   ✓ Order details retrieved`);
        
        return orderDetails;
      }
      
      default:
        throw new Error(`Unsupported PXC action: ${action}`);
    }
  }

  /**
   * Handle Xero accounting actions
   */
  private async handleXeroAction(action: string, parameters: any, credentials: any): Promise<any> {
    const { clientId, clientSecret, tenantId } = credentials || {};
    
    if (!clientId || !clientSecret) {
      throw new Error('Xero credentials not configured');
    }

    // TODO: Implement OAuth token refresh logic
    
    switch (action) {
      case 'getInvoices':
        // TODO: Implement Xero API call
        return { invoices: [], message: 'Xero integration pending implementation' };
      
      case 'getCustomers':
        // TODO: Implement Xero API call
        return { customers: [], message: 'Xero integration pending implementation' };
      
      case 'createInvoice':
        // TODO: Implement Xero API call
        return { success: false, message: 'Xero integration pending implementation' };
      
      default:
        throw new Error(`Unsupported Xero action: ${action}`);
    }
  }

  /**
   * Handle Outlook/Microsoft Graph actions
   */
  private async handleOutlookAction(action: string, parameters: any, credentials: any): Promise<any> {
    const { clientId, clientSecret, tenantId } = credentials || {};
    
    if (!clientId || !clientSecret) {
      throw new Error('Outlook credentials not configured');
    }

    // TODO: Implement OAuth token management
    
    switch (action) {
      case 'sendEmail':
        // TODO: Implement Microsoft Graph API call
        return { sent: false, message: 'Outlook integration pending implementation' };
      
      case 'getEmails':
        // TODO: Implement Microsoft Graph API call
        return { emails: [], message: 'Outlook integration pending implementation' };
      
      case 'createCalendarEvent':
        // TODO: Implement Microsoft Graph API call
        return { created: false, message: 'Outlook integration pending implementation' };
      
      default:
        throw new Error(`Unsupported Outlook action: ${action}`);
    }
  }

  /**
   * Handle Firebase actions
   */
  private async handleFirebaseAction(action: string, parameters: any, credentials: any): Promise<any> {
    const { projectId, apiKey, serviceAccount } = credentials || {};
    
    if (!projectId || !apiKey) {
      throw new Error('Firebase credentials not configured');
    }

    switch (action) {
      case 'sendPushNotification':
        // TODO: Implement Firebase Cloud Messaging
        return { sent: false, message: 'Firebase integration pending implementation' };
      
      case 'readDatabase':
        // TODO: Implement Firebase Realtime Database read
        return { data: null, message: 'Firebase integration pending implementation' };
      
      case 'writeDatabase':
        // TODO: Implement Firebase Realtime Database write
        return { success: false, message: 'Firebase integration pending implementation' };
      
      default:
        throw new Error(`Unsupported Firebase action: ${action}`);
    }
  }

  /**
   * Handle OpenAI API actions
   */
  private async handleOpenAIAction(action: string, parameters: any, credentials: any, context: any): Promise<any> {
    const { apiKey, organizationId } = credentials || {};
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    switch (action) {
      case 'generateText':
        return await this.callOpenAI('completions', {
          model: parameters.model || 'gpt-3.5-turbo',
          messages: parameters.messages || [
            { role: 'user', content: parameters.prompt }
          ],
          temperature: parameters.temperature || 0.7,
          max_tokens: parameters.maxTokens || 500,
        }, apiKey);
      
      case 'analyzeData':
        const analysisPrompt = this.buildAnalysisPrompt(parameters.data, parameters.analysisType);
        return await this.callOpenAI('completions', {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a data analyst. Provide clear, actionable insights.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
        }, apiKey);
      
      case 'generateSummary':
        return await this.callOpenAI('completions', {
          model: parameters.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Summarize the following content clearly and concisely.' },
            { role: 'user', content: parameters.content }
          ],
          temperature: 0.5,
          max_tokens: parameters.maxTokens || 200,
        }, apiKey);
      
      default:
        throw new Error(`Unsupported OpenAI action: ${action}`);
    }
  }

  /**
   * Make a Splynx API call
   */
  private async splynxApiCall(
    endpoint: string,
    method: string,
    params: any,
    apiUrl: string,
    authKey: string
  ): Promise<any> {
    const url = `${apiUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Splynx-EA (auth_key=${authKey})`,
        'Content-Type': 'application/json',
      },
    };

    if (method === 'GET' && params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams(params).toString();
      endpoint += `?${queryParams}`;
    } else if (method !== 'GET' && params) {
      options.body = JSON.stringify(params);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Splynx API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Splynx API call failed:', error);
      throw error;
    }
  }

  /**
   * Make an OpenAI API call
   */
  private async callOpenAI(endpoint: string, params: any, apiKey: string): Promise<any> {
    const url = endpoint === 'completions' 
      ? 'https://api.openai.com/v1/chat/completions'
      : `https://api.openai.com/v1/${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        response: data.choices?.[0]?.message?.content || data,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Build analysis prompt for OpenAI
   */
  private buildAnalysisPrompt(data: any, analysisType: string): string {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    
    switch (analysisType) {
      case 'trend':
        return `Analyze the following data for trends and patterns:\n\n${dataStr}\n\nProvide insights on key trends, anomalies, and recommendations.`;
      
      case 'performance':
        return `Analyze the following performance data:\n\n${dataStr}\n\nIdentify strengths, weaknesses, and areas for improvement.`;
      
      case 'customer':
        return `Analyze the following customer data:\n\n${dataStr}\n\nProvide insights on customer behavior, satisfaction, and opportunities.`;
      
      default:
        return `Analyze the following data:\n\n${dataStr}\n\nProvide clear, actionable insights.`;
    }
  }

  /**
   * Handle database operations for strategy updates
   */
  async updateStrategyMetrics(type: string, id: number, updates: any): Promise<any> {
    switch (type) {
      case 'keyResult':
        const [updatedKR] = await db
          .update(keyResults)
          .set({
            currentValue: updates.value,
            updatedAt: new Date(),
          })
          .where(eq(keyResults.id, id))
          .returning();
        return updatedKR;
      
      case 'workItem':
        const [updatedWI] = await db
          .update(workItems)
          .set({
            status: updates.status,
            updatedAt: new Date(),
          })
          .where(eq(workItems.id, id))
          .returning();
        return updatedWI;
      
      case 'objective':
        const [updatedObj] = await db
          .update(objectives)
          .set({
            status: updates.status,
            updatedAt: new Date(),
          })
          .where(eq(objectives.id, id))
          .returning();
        return updatedObj;
      
      default:
        throw new Error(`Unsupported strategy type: ${type}`);
    }
  }
}