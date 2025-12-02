import { db } from '../../db';
import { eq, and, or, sql, count, sum, avg, min, max, ilike, isNull, isNotNull, gt, lt, gte, lte, inArray, notInArray, ne } from 'drizzle-orm';
import { agentWorkflows, agentWorkflowRuns, integrations, keyResults, objectives, activityLogs, users, addressRecords, workItems, fieldTasks, ragStatusRecords, tariffRecords, aiAgentConfigurations, knowledgeDocuments, ticketDraftResponses } from '@shared/schema';
import { ActionHandlers } from './ActionHandlers';
import { storage } from '../../storage';
import { SplynxService } from '../integrations/splynxService';
import { contextEnrichmentService, type ContextSource } from '../ai/ContextEnrichmentService';
import { WorkItemWorkflowService } from '../WorkItemWorkflowService';
import crypto from 'crypto';

// Table registry for data source queries
// Maps table names to their Drizzle schema objects
import { TABLE_REGISTRY } from './tableRegistry.js';

// Use the same encryption key from environment (set in Replit Secrets)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

interface ExecutionContext {
  triggerSource?: string;
  scheduleId?: number;
  organizationId: string;
  userId?: number;
  webhookData?: any;
  manualData?: any;
  trigger?: any;  // Flattened webhook payload for easy variable access
}

interface StepExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  stack?: string;
}

export class WorkflowExecutor {
  private actionHandlers: ActionHandlers;
  
  constructor() {
    this.actionHandlers = new ActionHandlers();
  }

  async executeWorkflow(workflow: any, context: ExecutionContext): Promise<number> {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[WorkflowExecutor] ▶ WORKFLOW EXECUTION STARTED`);
    console.log(`  Workflow ID: ${workflow.id}`);
    console.log(`  Workflow Name: ${workflow.name}`);
    console.log(`  Organization ID: ${context.organizationId}`);
    console.log(`  Trigger Source: ${context.triggerSource || 'manual'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const startTime = new Date();
    
    console.log(`[WorkflowExecutor] 📝 Creating workflow run record...`);
    
    // Create a new workflow run
    const [run] = await db
      .insert(agentWorkflowRuns)
      .values({
        workflowId: workflow.id,
        status: 'running',
        triggerSource: context.triggerSource || 'manual',
        executionLog: [],
        resultData: {},
        startedAt: startTime,
        contextData: context,
        totalSteps: workflow.configuration?.steps?.length || 0,
        stepsCompleted: 0,
        retryCount: 0,
      })
      .returning();
    
    console.log(`[WorkflowExecutor] ✅ Workflow run created: ID ${run.id}`);

    try {
      // Parse workflow configuration
      const config = typeof workflow.configuration === 'string' 
        ? JSON.parse(workflow.configuration) 
        : workflow.configuration;
      
      if (!config?.steps || !Array.isArray(config.steps)) {
        throw new Error('Invalid workflow configuration: missing steps');
      }

      console.log(`[WorkflowExecutor] 📋 Configuration parsed. Total steps: ${config.steps.length}`);
      
      // Fetch the assigned agent user for activity logging
      let agentUser = null;
      if (workflow.assignedUserId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, workflow.assignedUserId))
          .limit(1);
        agentUser = user;
        console.log(`[WorkflowExecutor] 👤 Assigned agent user: ${agentUser?.fullName || agentUser?.username || 'Unknown'}`);
      }
      
      // Execute each step in sequence
      // Add workflow info to context for activity logging
      let stepContext = { 
        ...context, 
        workflowId: workflow.id, 
        workflowName: workflow.name,
        runId: run.id,
        assignedUserId: workflow.assignedUserId,
        assignedUserName: agentUser?.fullName || agentUser?.username || 'Unknown Agent',
        lastSuccessfulRunAt: workflow.lastSuccessfulRunAt // For incremental data fetching
      };
      const executionLog: any[] = [];
      
      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i];
        const stepStartTime = Date.now();
        
        console.log(`\n[WorkflowExecutor] ═══ STEP ${i + 1}/${config.steps.length} ═══`);
        console.log(`[WorkflowExecutor]   Name: ${step.name || 'Unnamed'}`);
        console.log(`[WorkflowExecutor]   Type: ${step.type}`);
        console.log(`[WorkflowExecutor]   Config:`, JSON.stringify(step.config || {}, null, 2));
        
        // Execute the step with retry logic
        const result = await this.executeStepWithRetry(
          step,
          stepContext,
          workflow.retryConfig || { maxRetries: 3, retryDelay: 60 }
        );
        
        const stepEndTime = Date.now();
        const stepDuration = stepEndTime - stepStartTime;
        
        console.log(`[WorkflowExecutor]   ⏱️ Duration: ${stepDuration}ms`);
        console.log(`[WorkflowExecutor]   ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (result.output) {
          console.log(`[WorkflowExecutor]   📤 Output:`, JSON.stringify(result.output, null, 2));
        }
        if (result.error) {
          console.log(`[WorkflowExecutor]   ⚠️ Error: ${result.error}`);
        }
        
        // Log step execution
        executionLog.push({
          step: i + 1,
          type: step.type,
          name: step.name || step.type,
          startTime: new Date(stepStartTime),
          endTime: new Date(stepEndTime),
          duration: stepDuration,
          success: result.success,
          output: result.output,
          error: result.error,
          stack: result.stack,
        });
        
        // Update run progress
        await db
          .update(agentWorkflowRuns)
          .set({
            stepsCompleted: i + 1,
            executionLog,
            contextData: stepContext,
          })
          .where(eq(agentWorkflowRuns.id, run.id));
        
        if (!result.success) {
          throw new Error(`Step ${i + 1} failed: ${result.error}`);
        }
        
        // Pass step output to next step context
        if (result.output) {
          stepContext = { ...stepContext, [`step${i + 1}Output`]: result.output };
        }
      }
      
      // Calculate total execution duration
      const executionDuration = Date.now() - startTime.getTime();
      
      // Mark workflow as completed
      await db
        .update(agentWorkflowRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          executionDuration,
          executionLog,
          resultData: stepContext,
        })
        .where(eq(agentWorkflowRuns.id, run.id));
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[WorkflowExecutor] ✅ WORKFLOW COMPLETED SUCCESSFULLY`);
      console.log(`  Workflow ID: ${workflow.id}`);
      console.log(`  Run ID: ${run.id}`);
      console.log(`  Duration: ${executionDuration}ms`);
      console.log(`  Steps Completed: ${config.steps.length}/${config.steps.length}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      // Update workflow's lastSuccessfulRunAt for incremental data fetching
      await db
        .update(agentWorkflows)
        .set({ 
          lastSuccessfulRunAt: new Date(),
          lastRunAt: new Date(),
          lastRunStatus: 'completed'
        })
        .where(eq(agentWorkflows.id, workflow.id));
      
      console.log(`[WorkflowExecutor] 📅 Updated lastSuccessfulRunAt for incremental fetching`);
      
      // Execute post-completion actions if configured
      await this.handlePostCompletion(workflow, stepContext);
      
      return run.id;
      
    } catch (error: any) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.error(`[WorkflowExecutor] ❌ WORKFLOW FAILED`);
      console.error(`  Workflow ID: ${workflow.id}`);
      console.error(`  Run ID: ${run.id}`);
      console.error(`  Error: ${error.message}`);
      console.error(`  Stack:`, error.stack);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      // Mark workflow as failed
      await db
        .update(agentWorkflowRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          executionDuration: Date.now() - startTime.getTime(),
          errorMessage: error.message,
        })
        .where(eq(agentWorkflowRuns.id, run.id));
      
      throw error;
    }
  }

  private async executeStepWithRetry(
    step: any,
    context: any,
    retryConfig: { maxRetries: number; retryDelay: number }
  ): Promise<StepExecutionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.executeStep(step, context);
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[WorkflowExecutor]   ⚠️ Step failed (attempt ${attempt}/${retryConfig.maxRetries})`);
        console.warn(`[WorkflowExecutor]   Error: ${error.message}`);
        if (error.stack) {
          console.warn(`[WorkflowExecutor]   Stack:`, error.stack);
        }
        
        if (attempt < retryConfig.maxRetries) {
          // Wait before retry
          console.log(`[WorkflowExecutor]   ⏳ Waiting ${retryConfig.retryDelay}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * 1000));
        }
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Step execution failed after retries',
      stack: lastError?.stack,
    };
  }

  private async executeStep(step: any, context: any): Promise<StepExecutionResult> {
    try {
      switch (step.type) {
        case 'log_event':
          return await this.executeLogEvent(step, context);
        
        case 'notification':
          return await this.executeNotification(step, context);
        
        case 'api_call':
          return await this.executeApiCall(step, context);
        
        case 'data_transformation':
          return await this.executeDataTransformation(step, context);
        
        case 'condition':
          return await this.executeCondition(step, context);
        
        case 'conditional':
        case 'conditional_paths':
          return await this.executeConditional(step, context);
        
        case 'integration_action':
          return await this.executeIntegrationAction(step, context);
        
        case 'database_query':
          return await this.executeDatabaseQuery(step, context);
        
        case 'strategy_update':
          return await this.executeStrategyUpdate(step, context);
        
        case 'data_source_query':
          return await this.executeDataSourceQuery(step, context);
        
        case 'splynx_query':
          return await this.executeSplynxQuery(step, context);
        
        case 'wait':
          return await this.executeWait(step, context);
        
        case 'for_each':
          return await this.executeForEach(step, context);
        
        case 'create_work_item':
          return await this.executeCreateWorkItem(step, context);
        
        case 'ai_draft_response':
          return await this.executeAIDraftResponse(step, context);
        
        case 'splynx_ticket_message':
          return await this.executeSplynxTicketMessage(step, context);
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeLogEvent(step: any, context: any): Promise<StepExecutionResult> {
    try {
      console.log(`[WorkflowExecutor] Logging event data for step: ${step.name || 'Log Event'}`);
      
      // Extract webhook data from context
      const webhookData = context.webhookData || {};
      const timestamp = new Date();
      
      // Log the event details
      const logEntry = {
        timestamp,
        stepName: step.name || 'Log Event',
        eventType: webhookData.event || 'unknown',
        integration: webhookData.integration || 'unknown',
        eventData: webhookData.data || {},
        eventId: webhookData.eventId,
        context: {
          organizationId: context.organizationId,
          triggerSource: context.triggerSource,
        }
      };
      
      console.log(`[WorkflowExecutor] Event logged:`, JSON.stringify(logEntry, null, 2));
      
      return {
        success: true,
        output: logEntry,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeApiCall(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { url, method = 'GET', headers = {}, body } = step.config || {};
      
      // Replace variables in URL
      const processedUrl = this.processTemplate(url, context);
      
      // Make the API call
      const response = await fetch(processedUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(this.processTemplate(body, context)) : undefined,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      
      return {
        success: true,
        output: data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeDataTransformation(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { transformation, formula, resultVariable } = step.config || {};
      
      // Formula-based calculation (e.g., "{revenue} / {customers}")
      if (formula) {
        console.log(`[WorkflowExecutor] 🧮 Evaluating formula: ${formula}`);
        
        // Replace variables in formula with their values from context
        let processedFormula = formula;
        const variablePattern = /\{(\w+)\}/g;
        let match;
        const variables: Record<string, any> = {};
        
        while ((match = variablePattern.exec(formula)) !== null) {
          const varName = match[1];
          const varValue = context[varName];
          
          if (varValue === undefined || varValue === null) {
            throw new Error(`Variable '${varName}' not found in context for formula evaluation`);
          }
          
          variables[varName] = varValue;
          console.log(`[WorkflowExecutor]   Variable ${varName} = ${varValue}`);
        }
        
        // Replace variables with their numeric values
        processedFormula = formula.replace(/\{(\w+)\}/g, (_: string, varName: string) => {
          const value = variables[varName];
          // Convert string to number for calculation
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return String(numValue);
        });
        
        console.log(`[WorkflowExecutor]   Processed formula: ${processedFormula}`);
        
        // Evaluate the formula (simple arithmetic only - safe eval)
        const result = this.evaluateArithmeticFormula(processedFormula);
        console.log(`[WorkflowExecutor]   ✅ Result: ${result}`);
        
        // Store result in context if resultVariable is specified
        if (resultVariable) {
          context[resultVariable] = result;
        }
        
        return {
          success: true,
          output: result,
        };
      }
      
      // Original transformation logic for backward compatibility
      let result = context;
      
      if (transformation?.type === 'json_path') {
        result = this.extractJsonPath(context, transformation.path);
      } else if (transformation?.type === 'mapping') {
        result = this.mapData(context, transformation.mapping);
      }
      
      return {
        success: true,
        output: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  private evaluateArithmeticFormula(formula: string): number {
    // Remove all whitespace
    const cleanFormula = formula.replace(/\s/g, '');
    
    // Validate formula contains only numbers and arithmetic operators
    if (!/^[\d.+\-*/()]+$/.test(cleanFormula)) {
      throw new Error(`Invalid formula: ${formula}. Only arithmetic operators (+, -, *, /, parentheses) and numbers are allowed.`);
    }
    
    // Use Function constructor for safe evaluation (no access to scope)
    try {
      const result = new Function(`return ${cleanFormula}`)();
      
      // Check for division by zero or invalid results
      if (typeof result !== 'number') {
        throw new Error(`Formula evaluation resulted in non-number: ${result}`);
      }
      
      if (!isFinite(result)) {
        // Handle division by zero or infinity
        console.warn(`[WorkflowExecutor] Formula resulted in non-finite value (likely division by zero): ${formula}`);
        return 0; // Return 0 for division by zero instead of throwing
      }
      
      // Round to 2 decimal places for currency/ARPU calculations
      return Math.round(result * 100) / 100;
    } catch (error: any) {
      throw new Error(`Failed to evaluate formula '${formula}': ${error.message}`);
    }
  }

  private async executeCondition(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { condition, ifTrue, ifFalse } = step.config || {};
      
      // Evaluate condition
      const conditionMet = this.evaluateCondition(condition, context);
      
      // Execute appropriate branch
      if (conditionMet && ifTrue) {
        return await this.executeStep(ifTrue, context);
      } else if (!conditionMet && ifFalse) {
        return await this.executeStep(ifFalse, context);
      }
      
      return {
        success: true,
        output: { conditionMet },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeConditional(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { conditions, defaultPath } = step.config || {};
      
      console.log(`[WorkflowExecutor] 🔀 Evaluating conditional step: ${step.name}`);
      
      // Evaluate each path condition in order (first match wins)
      for (const pathCondition of conditions || []) {
        const { pathSteps } = pathCondition;
        
        // Check if this path uses compound conditions (AND logic)
        // Compound: { conditions: [{field, operator, value}, ...], pathSteps }
        // Simple: { field, operator, value, pathSteps }
        const conditionsToCheck = pathCondition.conditions || [pathCondition];
        
        let allMatch = true;
        const matchDetails: any[] = [];
        
        for (const cond of conditionsToCheck) {
          const { field, operator, value } = cond;
          if (!field) continue; // Skip if no field defined
          
          const fieldValue = this.getNestedValue(context, field);
          
          console.log(`[WorkflowExecutor]   Checking: ${field} ${operator} ${value}`);
          console.log(`[WorkflowExecutor]   Field value: ${JSON.stringify(fieldValue)}`);
          
          const matches = this.evaluateConditionOperator(fieldValue, operator, value);
          matchDetails.push({ field, operator, value, fieldValue, matches });
          
          if (!matches) {
            allMatch = false;
            break; // No need to check remaining conditions for this path
          }
        }
        
        if (allMatch && conditionsToCheck.length > 0) {
          console.log(`[WorkflowExecutor]   ✅ All conditions matched! Executing path steps...`);
          
          // Execute steps for this path
          let pathContext = { ...context };
          // Inherit parent pathResults if they exist (for nested conditionals)
          const pathResults: any[] = [...(context.pathResults || [])];
          
          for (const pathStep of pathSteps || []) {
            // Pass pathResults to nested steps so they can access work item IDs
            const result = await this.executeStep(pathStep, { ...pathContext, pathResults });
            if (!result.success) {
              return result;
            }
            if (result.output) {
              pathResults.push(result.output);
              pathContext = { ...pathContext, lastOutput: result.output };
            }
          }
          
          // Remove pathResults from pathContext to avoid circular reference when serializing
          const { pathResults: _, ...cleanPathContext } = pathContext;
          return {
            success: true,
            output: {
              matchedCondition: matchDetails,
              pathExecuted: true,
              pathResults,
              pathContext: cleanPathContext
            }
          };
        } else {
          console.log(`[WorkflowExecutor]   ❌ Condition(s) not matched, trying next path...`);
        }
      }
      
      // No conditions matched - execute default path
      console.log(`[WorkflowExecutor]   No conditions matched, executing default path...`);
      if (defaultPath?.steps) {
        let pathContext = { ...context };
        // Inherit parent pathResults if they exist (for nested conditionals)
        const pathResults: any[] = [...(context.pathResults || [])];
        
        for (const pathStep of defaultPath.steps) {
          // Pass pathResults to nested steps so they can access work item IDs
          const result = await this.executeStep(pathStep, { ...pathContext, pathResults });
          if (!result.success) {
            return result;
          }
          if (result.output) {
            pathResults.push(result.output);
            pathContext = { ...pathContext, lastOutput: result.output };
          }
        }
        
        // Remove pathResults from pathContext to avoid circular reference when serializing
        const { pathResults: _, ...cleanPathContext } = pathContext;
        return {
          success: true,
          output: { matchedCondition: null, defaultPathExecuted: true, pathResults, pathContext: cleanPathContext }
        };
      }
      
      return {
        success: true,
        output: { matchedCondition: null, noPathExecuted: true }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private evaluateConditionOperator(fieldValue: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case 'equals':
        return String(fieldValue) === String(compareValue);
      case 'not_equals':
        return String(fieldValue) !== String(compareValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'in':
        const values = String(compareValue).split(',').map(v => v.trim());
        return values.includes(String(fieldValue));
      case 'not_in':
        const notInValues = String(compareValue).split(',').map(v => v.trim());
        return !notInValues.includes(String(fieldValue));
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(compareValue);
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(compareValue);
      case 'starts_with':
        return String(fieldValue).startsWith(String(compareValue));
      case 'ends_with':
        return String(fieldValue).endsWith(String(compareValue));
      case 'is_empty':
        return !fieldValue || String(fieldValue).trim() === '';
      case 'is_not_empty':
        return fieldValue && String(fieldValue).trim() !== '';
      default:
        console.warn(`[WorkflowExecutor] Unknown operator: ${operator}, defaulting to false`);
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    // Support dot notation and array bracket notation for nested fields
    // e.g., "trigger.ticket.type_id" or "pathResults[0].workItemId"
    
    // First, normalize bracket notation to dot notation for easier processing
    // Convert pathResults[0].workItemId to pathResults.0.workItemId
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    
    return normalizedPath.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  }

  private async executeIntegrationAction(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { integrationId, action, parameters } = step.config || {};
      
      console.log(`[WorkflowExecutor]   🔌 Fetching integration ID: ${integrationId}`);
      
      // Get integration configuration
      const [integration] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);
      
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`);
      }
      
      console.log(`[WorkflowExecutor]   ✓ Integration found: ${integration.name} (${integration.platformType})`);
      
      // Decrypt credentials
      const credentials = this.decryptCredentials(integration.credentialsEncrypted || '');
      
      console.log(`[WorkflowExecutor]   🔐 Credentials decrypted`);
      console.log(`[WorkflowExecutor]   🎬 Executing action: ${action}`);
      console.log(`[WorkflowExecutor]   📝 Original parameters:`, JSON.stringify(parameters, null, 2));
      
      // Process template variables in parameters recursively
      const processedParameters = this.processParametersRecursively(parameters, context);
      
      console.log(`[WorkflowExecutor]   ✨ Processed parameters:`, JSON.stringify(processedParameters, null, 2));
      
      // Execute integration-specific action with processed parameters
      const result = await this.actionHandlers.executeIntegrationAction(
        integration.platformType,
        action,
        processedParameters,
        credentials,
        context
      );
      
      console.log(`[WorkflowExecutor]   ✓ Action completed successfully`);
      
      // Store the result in context if a result variable is specified
      if (step.config?.resultVariable) {
        context[step.config.resultVariable] = result;
        console.log(`[WorkflowExecutor]   💾 Result stored in context as: ${step.config.resultVariable}`);
      }
      
      return {
        success: true,
        output: result,
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor]   ❌ Integration action failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeNotification(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { type, recipient, message, template } = step.config || {};
      
      // Process message template
      const processedMessage = template 
        ? this.processTemplate(template, context)
        : message;
      
      // Send notification based on type
      if (type === 'email') {
        // TODO: Implement email sending
        console.log(`[WorkflowExecutor] Would send email to ${recipient}: ${processedMessage}`);
      } else if (type === 'webhook') {
        await fetch(recipient, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: processedMessage, context }),
        });
      }
      
      return {
        success: true,
        output: { sent: true, message: processedMessage },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeDatabaseQuery(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { query, parameters } = step.config || {};
      
      // For now, we'll limit to safe read queries
      if (!query.toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed in workflows');
      }
      
      // Execute query with parameters
      const result = await db.execute(query);
      
      return {
        success: true,
        output: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeStrategyUpdate(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { type, targetId, targetIdVariable, updateType = 'set_value', value } = step.config || {};
      
      if (!type) {
        throw new Error('Strategy update requires type');
      }
      
      // Process targetId - it might be a variable reference or a hard-coded value
      let processedTargetId = targetId;
      if (targetIdVariable && context[targetIdVariable]) {
        processedTargetId = context[targetIdVariable];
        console.log(`[WorkflowExecutor]   🔄 Target ID from variable: ${targetIdVariable} → ${processedTargetId}`);
      } else if (typeof targetId === 'string' && targetId.match(/^\{(\w+)\}$/)) {
        const varName = targetId.replace(/[{}]/g, '');
        processedTargetId = context[varName];
        console.log(`[WorkflowExecutor]   🔄 Target ID from variable: {${varName}} → ${processedTargetId}`);
      }
      
      if (!processedTargetId) {
        throw new Error(`Strategy update requires targetId or targetIdVariable. Available context: ${Object.keys(context).join(', ')}`);
      }
      
      // Process value - it might be a variable reference
      let processedValue = value;
      if (typeof value === 'string' && value.match(/\{(\w+)\}/)) {
        const varName = value.replace(/[{}]/g, '');
        // Check both context[varName] and context[value] for flexibility
        processedValue = context[varName] || context[value] || value;
        
        console.log(`[WorkflowExecutor]   🔄 Value variable substitution: ${value} → ${JSON.stringify(processedValue)}`);
      }
      
      console.log(`[WorkflowExecutor] Updating ${type} ${processedTargetId} with value:`, processedValue, `(updateType: ${updateType})`);
      
      if (type === 'key_result') {
        // Get the key result details before updating (for activity log)
        const [kr] = await db
          .select()
          .from(keyResults)
          .where(eq(keyResults.id, parseInt(processedTargetId)))
          .limit(1);
        
        if (!kr) {
          throw new Error(`Key Result ${processedTargetId} not found`);
        }
        
        const oldValue = kr.currentValue;
        let newValue = processedValue;
        
        // Update Key Result
        if (updateType === 'set_value') {
          await db
            .update(keyResults)
            .set({ 
              currentValue: String(processedValue),
              updatedAt: new Date()
            })
            .where(eq(keyResults.id, parseInt(processedTargetId)));
        } else if (updateType === 'increment') {
          const currentVal = parseFloat(kr.currentValue || '0');
          const incrementBy = parseFloat(processedValue || '0');
          newValue = currentVal + incrementBy;
          await db
            .update(keyResults)
            .set({ 
              currentValue: String(newValue),
              updatedAt: new Date()
            })
            .where(eq(keyResults.id, parseInt(processedTargetId)));
        } else if (updateType === 'percentage') {
          if (kr.targetValue) {
            const targetVal = parseFloat(kr.targetValue || '100');
            const percentage = parseFloat(processedValue || '0');
            newValue = (targetVal * percentage) / 100;
            await db
              .update(keyResults)
              .set({ 
                currentValue: String(newValue),
                updatedAt: new Date()
              })
              .where(eq(keyResults.id, parseInt(processedTargetId)));
          }
        }
        
        // Create activity log for agent-generated update
        // Use the assigned agent user for all workflow executions
        const userId = context.assignedUserId || null;
        const orgId = parseInt(context.organizationId);
        
        console.log(`[WorkflowExecutor] 📝 Preparing activity log: orgId=${orgId}, userId=${userId}, organizationId raw=${context.organizationId}`);
        
        if (!isNaN(orgId) && orgId > 0) {
          try {
            // Create description in format: "AgentName performed WorkflowName"
            const agentName = context.assignedUserName || 'Unknown Agent';
            const workflowName = context.workflowName || 'Workflow';
            const description = `${agentName} performed ${workflowName}`;
            
            console.log(`[WorkflowExecutor] 📝 Creating activity log: description="${description}", entityId=${processedTargetId}`);
            
            await db.insert(activityLogs).values({
              organizationId: orgId,
              userId: userId,
              actionType: 'agent_action',
              entityType: 'key_result',
              entityId: parseInt(processedTargetId),
              description: description,
              metadata: {
                title: kr.title,
                newValue: String(newValue),
                oldValue: String(oldValue),
                updateType: updateType,
                triggerSource: context.triggerSource || 'workflow',
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                runId: context.runId
              },
              createdAt: new Date()
            });
            console.log(`[WorkflowExecutor] ✅ Activity log created successfully for key result ${processedTargetId}: "${description}"`);
          } catch (error: any) {
            console.error('[WorkflowExecutor] ❌ Failed to create activity log:', {
              error: error.message,
              stack: error.stack,
              orgId,
              userId,
              targetId: processedTargetId,
              workflowName: context.workflowName
            });
            // Don't throw - activity log failure shouldn't break the workflow
          }
        } else {
          console.warn(`[WorkflowExecutor] ⚠️ Skipping activity log creation: Invalid organizationId (orgId=${orgId}, raw=${context.organizationId})`);
        }
      } else if (type === 'objective') {
        // Get the objective details before updating (for activity log)
        const [obj] = await db
          .select()
          .from(objectives)
          .where(eq(objectives.id, parseInt(processedTargetId)))
          .limit(1);
        
        if (!obj) {
          throw new Error(`Objective ${processedTargetId} not found`);
        }
        
        const oldValue = obj.currentValue;
        let newValue = processedValue;
        
        // Update Objective
        if (updateType === 'set_value') {
          await db
            .update(objectives)
            .set({ 
              currentValue: String(processedValue),
              lastCalculatedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(objectives.id, parseInt(processedTargetId)));
        } else if (updateType === 'increment') {
          const currentVal = parseFloat(obj.currentValue || '0');
          const incrementBy = parseFloat(processedValue || '0');
          newValue = currentVal + incrementBy;
          await db
            .update(objectives)
            .set({ 
              currentValue: String(newValue),
              lastCalculatedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(objectives.id, parseInt(processedTargetId)));
        } else if (updateType === 'percentage') {
          if (obj.targetValue) {
            const targetVal = parseFloat(obj.targetValue || '100');
            const percentage = parseFloat(processedValue || '0');
            newValue = (targetVal * percentage) / 100;
            await db
              .update(objectives)
              .set({ 
                currentValue: String(newValue),
                lastCalculatedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(objectives.id, parseInt(processedTargetId)));
          }
        }
        
        // Create activity log for agent-generated objective update
        const userId = context.assignedUserId || null;
        const orgId = parseInt(context.organizationId);
        
        console.log(`[WorkflowExecutor] 📝 Preparing activity log for objective: orgId=${orgId}, userId=${userId}, organizationId raw=${context.organizationId}`);
        
        if (!isNaN(orgId) && orgId > 0) {
          try {
            const agentName = context.assignedUserName || 'Unknown Agent';
            const workflowName = context.workflowName || 'Workflow';
            const description = `${agentName} performed ${workflowName}`;
            
            console.log(`[WorkflowExecutor] 📝 Creating activity log for objective: description="${description}", entityId=${processedTargetId}`);
            
            await db.insert(activityLogs).values({
              organizationId: orgId,
              userId: userId,
              actionType: 'agent_action',
              entityType: 'objective',
              entityId: parseInt(processedTargetId),
              description: description,
              metadata: {
                title: obj.title,
                newValue: String(newValue),
                oldValue: String(oldValue),
                updateType: updateType,
                triggerSource: context.triggerSource || 'workflow',
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                runId: context.runId
              },
              createdAt: new Date()
            });
            console.log(`[WorkflowExecutor] ✅ Activity log created successfully for objective ${processedTargetId}: "${description}"`);
          } catch (error: any) {
            console.error('[WorkflowExecutor] ❌ Failed to create objective activity log:', {
              error: error.message,
              stack: error.stack,
              orgId,
              userId,
              targetId: processedTargetId,
              workflowName: context.workflowName
            });
            // Don't throw - activity log failure shouldn't break the workflow
          }
        } else {
          console.warn(`[WorkflowExecutor] ⚠️ Skipping objective activity log creation: Invalid organizationId (orgId=${orgId}, raw=${context.organizationId})`);
        }
      }
      
      return {
        success: true,
        output: { 
          updated: true, 
          type, 
          targetId, 
          updateType,
          newValue: processedValue 
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeWait(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { duration = 1000 } = step.config || {};
      
      await new Promise(resolve => setTimeout(resolve, duration));
      
      return {
        success: true,
        output: { waited: duration },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeDataSourceQuery(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { sourceTable, queryConfig, resultVariable, updateKeyResult } = step.config || {};
      
      if (!sourceTable || !queryConfig) {
        throw new Error('Data source query requires sourceTable and queryConfig');
      }
      
      console.log(`[WorkflowExecutor] 📊 Executing data source query`);
      console.log(`[WorkflowExecutor]   Table: ${sourceTable}`);
      console.log(`[WorkflowExecutor]   Query Config:`, JSON.stringify(queryConfig, null, 2));
      
      // Validate table access (organization isolation)
      const orgId = parseInt(context.organizationId);
      const dataTable = await storage.getDataTableByName(orgId, sourceTable);
      
      if (!dataTable) {
        throw new Error(`Table '${sourceTable}' not found or not accessible for this organization`);
      }
      
      console.log(`[WorkflowExecutor]   ✓ Table validated: ${dataTable.tableName} (ID: ${dataTable.id})`);
      
      // Get table schema from registry
      const tableSchema = TABLE_REGISTRY[sourceTable];
      if (!tableSchema) {
        throw new Error(`Table '${sourceTable}' is not registered for data source queries. Registered tables: ${Object.keys(TABLE_REGISTRY).join(', ')}`);
      }
      
      console.log(`[WorkflowExecutor]   ✓ Table schema found in registry`);
      
      // Execute generic query using the table schema (pass context for variable interpolation)
      const result = await this.executeGenericQuery(tableSchema, orgId, queryConfig, context);
      
      console.log(`[WorkflowExecutor]   📈 Query result: ${result}`);
      
      // Store result in context
      if (resultVariable) {
        context[resultVariable] = result;
        console.log(`[WorkflowExecutor]   💾 Result stored in context as: ${resultVariable}`);
      }
      
      // Optionally update key result directly
      if (updateKeyResult) {
        const { keyResultId, updateType = 'set_value' } = updateKeyResult;
        
        console.log(`[WorkflowExecutor]   🎯 Updating Key Result ${keyResultId} with value: ${result}`);
        
        // Call executeStrategyUpdate to handle the KR update
        await this.executeStrategyUpdate({
          config: {
            type: 'key_result',
            targetId: keyResultId,
            updateType: updateType,
            value: result,
          }
        }, context);
      }
      
      return {
        success: true,
        output: { 
          result,
          table: sourceTable,
          aggregation: queryConfig.aggregation || 'count',
          filterCount: queryConfig.filters?.length || 0,
        },
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor] ❌ Data source query failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async executeSplynxQuery(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { action, entity, mode = 'count', filters = [], dateRange, limit, resultVariable, updateKeyResult, customerId } = step.config || {};
      
      // Support action-based queries (e.g., getCustomerServices)
      if (action) {
        console.log(`[WorkflowExecutor] 🔍 Executing Splynx action: ${action}`);
        return await this.executeSplynxAction(step, context);
      }
      
      if (!entity) {
        throw new Error('Splynx query requires entity type or action');
      }
      
      console.log(`[WorkflowExecutor] 🔍 Executing Splynx query`);
      console.log(`[WorkflowExecutor]   Entity: ${entity}`);
      console.log(`[WorkflowExecutor]   Mode: ${mode}`);
      console.log(`[WorkflowExecutor]   Filters: ${filters.length}`);
      
      // Get Splynx integration credentials
      const orgId = parseInt(context.organizationId);
      const [splynxIntegration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.organizationId, orgId),
            eq(integrations.platformType, 'splynx')
          )
        )
        .limit(1);
      
      if (!splynxIntegration || !splynxIntegration.credentialsEncrypted) {
        throw new Error('Splynx integration not configured for this organization');
      }
      
      // Decrypt credentials
      const credentials = this.decryptCredentials(splynxIntegration.credentialsEncrypted);
      const { baseUrl, authHeader } = credentials;
      
      if (!baseUrl || !authHeader) {
        throw new Error('Splynx credentials incomplete');
      }
      
      console.log(`[WorkflowExecutor]   ✓ Splynx credentials loaded and validated`);
      
      // Process filters to replace context variables
      const processedFilters = filters.map((filter: any) => ({
        ...filter,
        value: this.processDynamicValue(filter.value, context),
      }));
      
      // Create Splynx service and execute query
      const splynxService = new SplynxService({ baseUrl, authHeader });
      
      // Only use incremental mode (sinceDate) for scheduled runs, not manual executions
      const isScheduledRun = context.triggerSource && context.triggerSource.toLowerCase().includes('schedule');
      const useSinceDate = isScheduledRun && context.lastSuccessfulRunAt 
        ? new Date(context.lastSuccessfulRunAt) 
        : undefined;
      
      if (useSinceDate) {
        console.log(`[WorkflowExecutor]   📅 Incremental mode enabled (scheduled run since ${useSinceDate.toISOString()})`);
      } else {
        console.log(`[WorkflowExecutor]   📋 Full query mode (manual run or first execution)`);
      }
      
      const queryResult = await splynxService.queryEntities({
        entity,
        mode,
        filters: processedFilters,
        dateRange,
        limit,
        sinceDate: useSinceDate,
      });
      
      console.log(`[WorkflowExecutor]   📊 Query result:`, JSON.stringify(queryResult, null, 2));
      
      // Extract the appropriate value based on mode
      const resultValue = mode === 'count' ? queryResult.count : queryResult.records;
      
      // Store result in context
      if (resultVariable) {
        context[resultVariable] = resultValue;
        console.log(`[WorkflowExecutor]   💾 Result stored in context as: ${resultVariable}`);
      }
      
      // Optionally update key result
      if (updateKeyResult && mode === 'count') {
        const { keyResultId, updateType = 'set_value' } = updateKeyResult;
        
        console.log(`[WorkflowExecutor]   🎯 Updating Key Result ${keyResultId} with value: ${queryResult.count}`);
        
        await this.executeStrategyUpdate({
          config: {
            type: 'key_result',
            targetId: keyResultId,
            updateType: updateType,
            value: queryResult.count,
          }
        }, context);
      }
      
      return {
        success: true,
        output: {
          entity,
          mode,
          count: queryResult.count,
          records: mode === 'list' ? queryResult.records?.length || 0 : undefined,
          filterCount: filters.length,
        },
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor] ❌ Splynx query failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async executeSplynxAction(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { action, customerId } = step.config || {};
      
      console.log(`[WorkflowExecutor] 🔧 Executing Splynx action: ${action}`);
      
      // Get Splynx integration credentials
      const orgId = parseInt(context.organizationId);
      const [splynxIntegration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.organizationId, orgId),
            eq(integrations.platformType, 'splynx')
          )
        )
        .limit(1);
      
      if (!splynxIntegration || !splynxIntegration.credentialsEncrypted) {
        throw new Error('Splynx integration not configured for this organization');
      }
      
      // Decrypt credentials
      const credentials = this.decryptCredentials(splynxIntegration.credentialsEncrypted);
      const { baseUrl, authHeader } = credentials;
      
      if (!baseUrl || !authHeader) {
        throw new Error('Splynx credentials incomplete');
      }
      
      console.log(`[WorkflowExecutor]   ✓ Splynx credentials loaded and validated`);
      
      // Create Splynx service
      const splynxService = new SplynxService({ baseUrl, authHeader });
      
      // Process customerId from context if template variable (handles {{...}} syntax)
      const processedCustomerId = typeof customerId === 'string' 
        ? this.processTemplate(customerId, context)
        : customerId;
      const numericCustomerId = parseInt(String(processedCustomerId));
      
      // Handle empty/invalid customer ID gracefully for getCustomerById
      // This allows the routing logic to work correctly (Path A for missing customer ID)
      if (isNaN(numericCustomerId) || !processedCustomerId || processedCustomerId === '0') {
        console.log(`[WorkflowExecutor]   ⚠️ No valid customer ID provided: "${processedCustomerId}"`);
        
        // Return success with null customer data to allow routing to proceed
        return {
          success: true,
          output: {
            action: action,
            customerId: null,
            found: false,
            customer: null,
            category: null,
            name: null,
            status: null,
            noCustomerId: true,
          },
        };
      }
      
      switch (action) {
        case 'getCustomerServices': {
          console.log(`[WorkflowExecutor]   📡 Fetching services for customer ${numericCustomerId}`);
          
          const services = await splynxService.getCustomerServices(numericCustomerId);
          
          console.log(`[WorkflowExecutor]   📊 Retrieved ${services.length} services`);
          
          // Determine overall service status
          // Service is considered "active" if ANY service is active
          const hasActiveService = services.some(s => s.status === 'active');
          const hasSuspendedService = services.some(s => s.status === 'suspended');
          
          let overallStatus: 'active' | 'inactive' | 'suspended' | 'unknown' = 'unknown';
          if (hasActiveService) {
            overallStatus = 'active';
          } else if (hasSuspendedService) {
            overallStatus = 'suspended';
          } else if (services.length > 0) {
            overallStatus = 'inactive';
          }
          
          console.log(`[WorkflowExecutor]   📌 Overall status: ${overallStatus}`);
          
          return {
            success: true,
            output: {
              action: 'getCustomerServices',
              customerId: numericCustomerId,
              services,
              serviceCount: services.length,
              status: overallStatus,
              hasActiveService,
              hasSuspendedService,
            },
          };
        }
        
        case 'getCustomerById': {
          console.log(`[WorkflowExecutor]   👤 Fetching customer details for ID ${numericCustomerId}`);
          
          const customer = await splynxService.getCustomerById(numericCustomerId);
          
          if (!customer) {
            console.log(`[WorkflowExecutor]   ⚠️ Customer ${numericCustomerId} not found`);
            return {
              success: true,
              output: {
                action: 'getCustomerById',
                customerId: numericCustomerId,
                found: false,
                customer: null,
                category: null,
                name: null,
                status: null,
              },
            };
          }
          
          console.log(`[WorkflowExecutor]   ✅ Customer found: ${customer.name}`);
          console.log(`[WorkflowExecutor]   📌 Category: ${customer.raw?.category || 'unknown'}`);
          
          return {
            success: true,
            output: {
              action: 'getCustomerById',
              customerId: numericCustomerId,
              found: true,
              customer: customer,
              category: customer.raw?.category || null,
              name: customer.name,
              status: customer.status,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              raw: customer.raw,
            },
          };
        }
        
        default:
          throw new Error(`Unknown Splynx action: ${action}`);
      }
    } catch (error: any) {
      console.error(`[WorkflowExecutor] ❌ Splynx action failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async executeGenericQuery(tableSchema: any, organizationId: number, queryConfig: any, context: any = {}): Promise<string | number | null> {
    const { filters = [], aggregation = 'count', aggregationField, limit = 1000 } = queryConfig;
    
    console.log(`[WorkflowExecutor]   🔍 Building generic query with ${filters.length} filters`);
    
    // Build WHERE conditions
    const conditions: any[] = [];
    
    // Add organization isolation if the table has an organizationId column
    if (tableSchema.organizationId) {
      conditions.push(eq(tableSchema.organizationId, organizationId));
      console.log(`[WorkflowExecutor]   🔒 Added organization isolation filter`);
    }
    
    for (const filter of filters) {
      const { field, operator, value } = filter;
      
      // Process dynamic date placeholders AND context variables
      const processedValue = this.processDynamicValue(value, context);
      
      console.log(`[WorkflowExecutor]     Filter: ${field} ${operator} ${JSON.stringify(value)}${value !== processedValue ? ` → ${JSON.stringify(processedValue)}` : ''}`);
      
      // Handle JSONB fields (e.g., airtableFields.FieldName)
      if (field.includes('.')) {
        const parts = field.split('.');
        const jsonColumn = parts[0];
        const jsonField = parts.slice(1).join('.');
        
        // Get the JSONB column from the table schema
        const column = (tableSchema as any)[jsonColumn];
        if (!column) {
          throw new Error(`JSONB column '${jsonColumn}' not found in table`);
        }
        
        const jsonPath = sql`${column}->>${jsonField}`;
        conditions.push(this.buildJsonbCondition(jsonPath, operator, processedValue));
      } else {
        // Handle regular columns
        const column = (tableSchema as any)[field];
        if (!column) {
          throw new Error(`Field '${field}' not found in table. Available fields should be validated by the frontend.`);
        }
        
        conditions.push(this.buildCondition(column, operator, processedValue));
      }
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Execute aggregation
    let queryResult: any;
    
    if (aggregation === 'count') {
      queryResult = await db
        .select({ value: count() })
        .from(tableSchema)
        .where(whereClause)
        .limit(limit);
      
      return queryResult[0]?.value || 0;
    } else if (aggregation === 'sum' || aggregation === 'avg' || aggregation === 'min' || aggregation === 'max') {
      if (!aggregationField) {
        throw new Error(`Aggregation '${aggregation}' requires aggregationField`);
      }
      
      // Get the field to aggregate
      const column = (tableSchema as any)[aggregationField];
      if (!column) {
        throw new Error(`Field '${aggregationField}' not found in table for aggregation`);
      }
      
      console.log(`[WorkflowExecutor]   📊 Performing ${aggregation} on field: ${aggregationField}`);
      
      // Select the appropriate aggregation function
      let aggregationFn;
      switch (aggregation) {
        case 'sum':
          aggregationFn = sum(column);
          break;
        case 'avg':
          aggregationFn = avg(column);
          break;
        case 'min':
          aggregationFn = min(column);
          break;
        case 'max':
          aggregationFn = max(column);
          break;
        default:
          throw new Error(`Unsupported aggregation: ${aggregation}`);
      }
      
      try {
        queryResult = await db
          .select({ value: aggregationFn })
          .from(tableSchema)
          .where(whereClause);
      } catch (dbError: any) {
        // Catch PostgreSQL errors for invalid aggregations (e.g., sum on text fields)
        if (dbError.message?.includes('invalid input syntax') || 
            dbError.message?.includes('function') || 
            dbError.code === '42883') {
          throw new Error(`Cannot perform ${aggregation} on field '${aggregationField}'. Ensure the field contains ${aggregation === 'sum' || aggregation === 'avg' ? 'numeric' : 'appropriate'} data. Database error: ${dbError.message}`);
        }
        throw dbError;
      }
      
      const result = queryResult[0]?.value;
      
      // Handle result based on aggregation type
      if (aggregation === 'sum' || aggregation === 'avg') {
        // For numeric aggregations, preserve precision by returning the raw value
        // PostgreSQL returns DECIMAL/NUMERIC as strings to avoid floating-point errors
        if (result === null || result === undefined) {
          return '0';
        }
        
        // Validate it's numeric without converting to Number (which loses precision)
        const strValue = String(result);
        if (!/^-?\d+(\.\d+)?$/.test(strValue)) {
          throw new Error(`Field '${aggregationField}' produced non-numeric result '${strValue}' for ${aggregation} aggregation. Ensure the field contains numeric data.`);
        }
        
        // Return the raw string to preserve precision for currency calculations
        // Consuming steps can use parseFloat() for display or keep as string for exact math
        return strValue;
      } else {
        // For MIN/MAX, return the raw value (could be date, string, number, etc.)
        return result !== null && result !== undefined ? result : null;
      }
    }
    
    return 0;
  }

  private processDynamicValue(value: any, context: any = {}): any {
    // Process dynamic date placeholders AND context variables
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      const placeholder = value.slice(1, -1); // Remove { }
      
      const now = new Date();
      
      // First check if it's a date placeholder
      switch (placeholder) {
        case 'currentMonthStart': {
          // First day of current month at midnight
          const date = new Date(now.getFullYear(), now.getMonth(), 1);
          const isoDate = date.toISOString().split('T')[0];
          console.log(`[WorkflowExecutor]   🔄 Dynamic value: {currentMonthStart} → ${isoDate}`);
          return isoDate;
        }
        case 'currentMonthEnd': {
          // Last day of current month at 23:59:59
          const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const isoDate = date.toISOString().split('T')[0];
          console.log(`[WorkflowExecutor]   🔄 Dynamic value: {currentMonthEnd} → ${isoDate}`);
          return isoDate;
        }
        case 'today': {
          const isoDate = now.toISOString().split('T')[0];
          console.log(`[WorkflowExecutor]   🔄 Dynamic value: {today} → ${isoDate}`);
          return isoDate;
        }
        case 'yesterday': {
          const date = new Date(now);
          date.setDate(date.getDate() - 1);
          const isoDate = date.toISOString().split('T')[0];
          console.log(`[WorkflowExecutor]   🔄 Dynamic value: {yesterday} → ${isoDate}`);
          return isoDate;
        }
        default:
          // Check if it's a context variable
          if (context.hasOwnProperty(placeholder)) {
            console.log(`[WorkflowExecutor]   🔄 Context variable: {${placeholder}} → ${JSON.stringify(context[placeholder])}`);
            return context[placeholder];
          }
          // Check for nested properties (e.g., {webhookData.objectiveId})
          if (placeholder.includes('.')) {
            const parts = placeholder.split('.');
            let nestedValue = context;
            for (const part of parts) {
              if (nestedValue && typeof nestedValue === 'object' && part in nestedValue) {
                nestedValue = nestedValue[part];
              } else {
                console.log(`[WorkflowExecutor]   ⚠️  Context variable not found: {${placeholder}}`);
                return value; // Return original if not found
              }
            }
            console.log(`[WorkflowExecutor]   🔄 Context variable: {${placeholder}} → ${JSON.stringify(nestedValue)}`);
            return nestedValue;
          }
          // Unknown placeholder and not in context, return as-is
          console.log(`[WorkflowExecutor]   ⚠️  Unknown placeholder: {${placeholder}}`);
          return value;
      }
    }
    
    return value;
  }

  private parseFilterValue(value: any, column: any): any {
    // If value is null or undefined, return as-is
    if (value === null || value === undefined) {
      return value;
    }
    
    // If already a native type (not a string), return as-is
    if (typeof value !== 'string') {
      return value;
    }
    
    // Detect and parse date strings (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    if (isoDatePattern.test(value)) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        console.log(`[WorkflowExecutor]     ✓ Parsed date: "${value}" → ${parsed.toISOString()}`);
        return parsed;
      }
    }
    
    // Detect and parse numeric strings for comparison operators
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        console.log(`[WorkflowExecutor]     ✓ Parsed number: "${value}" → ${num}`);
        return num;
      }
    }
    
    // Parse boolean strings
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Return string as-is for text comparisons
    return value;
  }

  private buildCondition(column: any, operator: string, value: any): any {
    // Parse value to native JS type for Drizzle
    const parsedValue = this.parseFilterValue(value, column);
    
    switch (operator) {
      case 'equals':
        return eq(column, parsedValue);
      case 'not_equals':
        return ne(column, parsedValue);
      case 'contains':
        return ilike(column, `%${parsedValue}%`);
      case 'not_contains':
        return sql`NOT ${ilike(column, `%${parsedValue}%`)}`;
      case 'starts_with':
        return ilike(column, `${parsedValue}%`);
      case 'ends_with':
        return ilike(column, `%${parsedValue}`);
      case 'is_null':
        return isNull(column);
      case 'not_null':
        return isNotNull(column);
      case 'in':
        return inArray(column, Array.isArray(value) ? value : [value]);
      case 'not_in':
        return notInArray(column, Array.isArray(value) ? value : [value]);
      case 'greater_than':
        return gt(column, parsedValue);
      case 'less_than':
        return lt(column, parsedValue);
      case 'greater_than_or_equal':
        return gte(column, parsedValue);
      case 'less_than_or_equal':
        return lte(column, parsedValue);
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private buildJsonbCondition(jsonPath: any, operator: string, value: any): any {
    switch (operator) {
      case 'equals':
        return sql`${jsonPath} = ${value}`;
      case 'not_equals':
        return sql`${jsonPath} != ${value}`;
      case 'contains':
        return sql`${jsonPath} ILIKE ${'%' + value + '%'}`;
      case 'not_contains':
        return sql`${jsonPath} NOT ILIKE ${'%' + value + '%'}`;
      case 'starts_with':
        return sql`${jsonPath} ILIKE ${value + '%'}`;
      case 'ends_with':
        return sql`${jsonPath} ILIKE ${'%' + value}`;
      case 'is_null':
        return sql`${jsonPath} IS NULL`;
      case 'not_null':
        return sql`${jsonPath} IS NOT NULL`;
      default:
        throw new Error(`Operator '${operator}' not supported for JSONB fields`);
    }
  }

  private async handlePostCompletion(workflow: any, context: any) {
    // Handle post-completion actions like updating related records
    if (workflow.targetKeyResultId) {
      console.log(`[WorkflowExecutor] Would update Key Result ${workflow.targetKeyResultId}`);
    }
    
    if (workflow.targetObjectiveId) {
      console.log(`[WorkflowExecutor] Would update Objective ${workflow.targetObjectiveId}`);
    }
    
    if (workflow.assignedTeamId) {
      console.log(`[WorkflowExecutor] Would notify Team ${workflow.assignedTeamId}`);
    }
  }

  private processTemplate(template: string, context: any): any {
    if (typeof template !== 'string') return template;
    
    // Replace {{variable}} with context values
    // Supports: {{trigger.id}}, {{step1Output.name}}, {{pathResults[0].workItemId}}
    return template.replace(/\{\{([\w\[\]]+(?:\.[\w\[\]]+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      if (value === undefined || value === null) {
        console.warn(`[WorkflowExecutor] Template variable ${match} not found in context. Available keys:`, Object.keys(context));
        return match;
      }
      return value;
    });
  }

  private processParametersRecursively(params: any, context: any): any {
    // Handle null/undefined
    if (params === null || params === undefined) {
      return params;
    }
    
    // Handle strings - apply template substitution
    if (typeof params === 'string') {
      return this.processTemplate(params, context);
    }
    
    // Handle arrays - recursively process each element
    if (Array.isArray(params)) {
      return params.map(item => this.processParametersRecursively(item, context));
    }
    
    // Handle objects - recursively process each property
    if (typeof params === 'object') {
      const processed: any = {};
      for (const [key, value] of Object.entries(params)) {
        processed[key] = this.processParametersRecursively(value, context);
      }
      return processed;
    }
    
    // Return primitive values as-is (numbers, booleans, etc.)
    return params;
  }

  private extractJsonPath(data: any, path: string): any {
    return this.getNestedValue(data, path);
  }

  private mapData(data: any, mapping: Record<string, string>): any {
    const result: any = {};
    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      result[targetKey] = this.getNestedValue(data, sourcePath);
    }
    return result;
  }

  private evaluateCondition(condition: any, context: any): boolean {
    const { field, operator, value } = condition || {};
    const fieldValue = this.getNestedValue(context, field);
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'notEquals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(value);
      case 'greaterThan':
        return fieldValue > value;
      case 'lessThan':
        return fieldValue < value;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  private async executeForEach(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { sourceVariable, childSteps = [] } = step.config || {};
      
      if (!sourceVariable) {
        throw new Error('sourceVariable is required for for_each step');
      }
      
      console.log(`[WorkflowExecutor]   🔁 For Each: iterating over {${sourceVariable}}`);
      
      // Get the array from context
      const items = context[sourceVariable];
      
      if (!Array.isArray(items)) {
        throw new Error(`Variable {${sourceVariable}} is not an array. Found: ${typeof items}`);
      }
      
      console.log(`[WorkflowExecutor]   📊 Found ${items.length} items to process`);
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      // Execute child steps for each item
      for (let i = 0; i < items.length; i++) {
        const currentItem = items[i];
        console.log(`[WorkflowExecutor]   🔄 Processing item ${i + 1}/${items.length}`);
        
        // Create scoped context with currentItem
        const scopedContext = {
          ...context,
          currentItem,
          currentIndex: i,
        };
        
        // Execute all child steps for this item
        for (const childStep of childSteps) {
          try {
            const result = await this.executeStep(childStep, scopedContext);
            if (!result.success) {
              console.warn(`[WorkflowExecutor]   ⚠️ Child step failed for item ${i + 1}: ${result.error}`);
              errorCount++;
            } else {
              successCount++;
            }
            results.push({ itemIndex: i, step: childStep.name, result });
          } catch (error: any) {
            console.error(`[WorkflowExecutor]   ❌ Error executing child step for item ${i + 1}:`, error.message);
            errorCount++;
            results.push({ itemIndex: i, step: childStep.name, error: error.message });
          }
        }
      }
      
      console.log(`[WorkflowExecutor]   ✅ For Each complete: ${successCount} successful, ${errorCount} errors`);
      
      return {
        success: true,
        output: {
          itemsProcessed: items.length,
          successCount,
          errorCount,
          results,
        },
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor]   ❌ For Each failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async executeCreateWorkItem(step: any, context: any): Promise<StepExecutionResult> {
    try {
      const { 
        title, 
        description, 
        assigneeId, 
        dueDate, 
        status = 'Planning', 
        externalReference, 
        templateId, 
        splynxTicketId, 
        splynxTaskId,
        teamId,
        splynxAssignedTo 
      } = step.config || {};
      
      if (!title) {
        throw new Error('title is required for create_work_item step');
      }
      
      console.log(`[WorkflowExecutor]   📝 Creating work item: ${title}`);
      
      // Process template strings in title and description
      const processedTitle = this.processTemplate(title, context);
      const processedDescription = description ? this.processTemplate(description, context) : undefined;
      const processedExternalRef = externalReference ? this.processTemplate(externalReference, context) : undefined;
      
      // Process Splynx IDs from templates
      const processedSplynxTicketId = splynxTicketId ? this.processTemplate(splynxTicketId, context) : undefined;
      const processedSplynxTaskId = splynxTaskId ? this.processTemplate(splynxTaskId, context) : undefined;
      
      // Get organization ID from context
      const organizationId = context.organizationId;
      if (!organizationId) {
        throw new Error('organizationId not found in context');
      }
      
      // Check for existing work item if this is a Splynx ticket (duplicate prevention)
      let existingWorkItem: any = null;
      if (processedSplynxTicketId) {
        existingWorkItem = await storage.getWorkItemBySplynxTicketId(parseInt(organizationId), processedSplynxTicketId);
        if (existingWorkItem) {
          console.log(`[WorkflowExecutor]   🔄 Found existing work item for Splynx ticket ${processedSplynxTicketId}: ID ${existingWorkItem.id}`);
        }
      }
      
      // Process Splynx assigned_to ID and try to match with platform users
      let finalAssigneeId = assigneeId || null;
      if (splynxAssignedTo) {
        const processedSplynxAssignedTo = this.processTemplate(splynxAssignedTo, context);
        const splynxAdminId = parseInt(processedSplynxAssignedTo);
        if (!isNaN(splynxAdminId)) {
          // Query for user with matching splynxAdminId
          const matchingUser = await storage.getUserBySplynxAdminId(parseInt(organizationId), splynxAdminId);
          if (matchingUser) {
            finalAssigneeId = matchingUser.id;
            console.log(`[WorkflowExecutor]   👤 Matched Splynx admin ID ${splynxAdminId} to user: ${matchingUser.fullName || matchingUser.email}`);
          } else {
            console.log(`[WorkflowExecutor]   ⚠️ No user found with Splynx admin ID: ${splynxAdminId}`);
          }
        }
      }
      
      // Calculate due date - special handling for support tickets
      let processedDueDate = dueDate;
      const isSupportTicket = templateId === 'splynx-support-ticket';
      
      if (isSupportTicket && !dueDate) {
        // Support tickets default to same-day due date
        const today = new Date();
        processedDueDate = today.toISOString().split('T')[0];
        console.log(`[WorkflowExecutor]   📅 Support ticket - setting same-day due date: ${processedDueDate}`);
      } else if (dueDate && dueDate.startsWith('+')) {
        const days = parseInt(dueDate.replace('+', '').replace('days', '').trim());
        const date = new Date();
        date.setDate(date.getDate() + days);
        processedDueDate = date.toISOString().split('T')[0];
      } else if (dueDate) {
        processedDueDate = this.processTemplate(dueDate, context);
      }
      
      // Build workflowMetadata with Splynx linking
      const workflowMetadata: any = {};
      if (processedExternalRef) {
        workflowMetadata.externalReference = processedExternalRef;
      }
      if (processedSplynxTicketId) {
        workflowMetadata.splynx_ticket_id = processedSplynxTicketId;
        console.log(`[WorkflowExecutor]   🔗 Linking to Splynx ticket: ${processedSplynxTicketId}`);
      }
      if (processedSplynxTaskId) {
        workflowMetadata.splynx_task_id = processedSplynxTaskId;
        console.log(`[WorkflowExecutor]   🔗 Linking to Splynx task: ${processedSplynxTaskId}`);
      }
      
      let workItem: any;
      
      // If existing work item found, update it instead of creating a new one
      if (existingWorkItem) {
        console.log(`[WorkflowExecutor]   ✏️ Updating existing work item instead of creating duplicate`);
        workItem = await storage.updateWorkItem(existingWorkItem.id, {
          title: processedTitle,
          description: processedDescription || existingWorkItem.description,
          status: status as any,
          assignedTo: finalAssigneeId,
          teamId: teamId || existingWorkItem.teamId,
          dueDate: processedDueDate || existingWorkItem.dueDate,
          workflowMetadata: Object.keys(workflowMetadata).length > 0 ? workflowMetadata : existingWorkItem.workflowMetadata,
        });
        console.log(`[WorkflowExecutor]   ✅ Work item updated: ID ${workItem.id}`);
        
        // Log activity for work item update
        try {
          const agentName = context.assignedUserName || 'Automation Agent';
          const workflowName = context.workflowName || 'Workflow';
          await db.insert(activityLogs).values({
            organizationId: parseInt(organizationId),
            userId: context.assignedUserId || null,
            actionType: 'agent_action',
            entityType: 'work_item',
            entityId: workItem.id,
            description: `${agentName} updated work item via ${workflowName}`,
            metadata: {
              title: processedTitle,
              oldTitle: existingWorkItem.title,
              status: status,
              oldStatus: existingWorkItem.status,
              triggerSource: context.triggerSource || 'workflow',
              workflowId: context.workflowId,
              workflowName: context.workflowName,
              runId: context.runId
            }
          });
          console.log(`[WorkflowExecutor]   📝 Activity logged for work item update: ID ${workItem.id}`);
        } catch (logError: any) {
          console.error(`[WorkflowExecutor]   ⚠️ Failed to log activity for work item update:`, logError.message);
        }
      } else {
        // Create the work item
        workItem = await storage.createWorkItem({
          organizationId,
          title: processedTitle,
          description: processedDescription || '',
          status: status as any,
          assignedTo: finalAssigneeId,
          teamId: teamId || null,
          dueDate: processedDueDate || null,
          workflowMetadata: Object.keys(workflowMetadata).length > 0 ? workflowMetadata : null,
          workflowTemplateId: templateId || null,
          createdBy: context.userId || null,
        });
        
        if (templateId) {
          console.log(`[WorkflowExecutor]   📋 Attached workflow template: ${templateId}`);
        }
        console.log(`[WorkflowExecutor]   ✅ Work item created: ID ${workItem.id}`);
        
        // Log activity for work item creation
        try {
          const agentName = context.assignedUserName || 'Automation Agent';
          const workflowName = context.workflowName || 'Workflow';
          await db.insert(activityLogs).values({
            organizationId: parseInt(organizationId),
            userId: context.assignedUserId || null,
            actionType: 'creation',
            entityType: 'work_item',
            entityId: workItem.id,
            description: `${agentName} created work item via ${workflowName}`,
            metadata: {
              title: processedTitle,
              status: status,
              assignedTo: finalAssigneeId,
              templateId: templateId,
              splynxTicketId: processedSplynxTicketId,
              triggerSource: context.triggerSource || 'workflow',
              workflowId: context.workflowId,
              workflowName: context.workflowName,
              runId: context.runId
            }
          });
          console.log(`[WorkflowExecutor]   📝 Activity logged for work item creation: ID ${workItem.id}`);
        } catch (logError: any) {
          console.error(`[WorkflowExecutor]   ⚠️ Failed to log activity for work item creation:`, logError.message);
        }
        
        // Initialize workflow execution if template is attached
        if (templateId) {
          try {
            const workflowService = new WorkItemWorkflowService();
            await workflowService.startWorkflowExecution({
              workItemId: workItem.id,
              organizationId: parseInt(organizationId),
              userId: context.userId
            });
            console.log(`[WorkflowExecutor]   ✅ Workflow execution initialized for work item: ${workItem.id}`);
          } catch (workflowError: any) {
            console.error(`[WorkflowExecutor]   ⚠️ Failed to initialize workflow execution:`, workflowError.message);
            // Don't fail the work item creation if workflow initialization fails
          }
        }
      }
      
      return {
        success: true,
        output: {
          workItemId: workItem.id,
          title: processedTitle,
          updated: !!existingWorkItem,
        },
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor]   ❌ Create work item failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async executeAIDraftResponse(step: any, context: any): Promise<StepExecutionResult> {
    try {
      console.log(`[WorkflowExecutor] 🤖 Generating AI draft response for step: ${step.name || 'AI Draft Response'}`);
      
      // Safely get organization ID - it may already be numeric or string
      let organizationId: number;
      if (typeof context.organizationId === 'number') {
        organizationId = context.organizationId;
      } else if (typeof context.organizationId === 'string') {
        organizationId = parseInt(context.organizationId);
        if (isNaN(organizationId)) {
          throw new Error('Invalid organization ID format');
        }
      } else {
        throw new Error('Organization ID is required but not found in context');
      }
      
      // Resolve work item ID - check config first, then search previous step outputs
      let workItemId: number | undefined;
      
      // 1. Check explicit config
      if (step.config?.workItemId) {
        const configValue = step.config.workItemId;
        // Handle template strings like "{{step2Output.workItemId}}"
        if (typeof configValue === 'string' && configValue.includes('{{')) {
          const resolved = this.processTemplate(configValue, context);
          workItemId = parseInt(resolved);
        } else {
          workItemId = parseInt(configValue);
        }
      }
      
      // 2. If not in config, search through all previous step outputs for a create_work_item result
      if (!workItemId) {
        console.log(`[WorkflowExecutor]   🔍 No explicit work item ID - searching previous step outputs...`);
        
        // First check lastOutput (set by conditional/default path steps)
        if (context.lastOutput?.workItemId) {
          workItemId = context.lastOutput.workItemId;
          console.log(`[WorkflowExecutor]   ✓ Found work item ID from lastOutput: ${workItemId}`);
        }
        
        // If not found, search through pathResults array (nested path step outputs)
        if (!workItemId && Array.isArray(context.pathResults)) {
          for (const result of context.pathResults) {
            if (result?.workItemId) {
              workItemId = result.workItemId;
              console.log(`[WorkflowExecutor]   ✓ Found work item ID from pathResults: ${workItemId}`);
              break;
            }
          }
        }
        
        // If not found, search through numbered step outputs
        if (!workItemId) {
          for (let i = 1; i <= 20; i++) { // Check up to 20 previous steps
            const stepOutput = context[`step${i}Output`];
            if (stepOutput?.workItemId) {
              workItemId = stepOutput.workItemId;
              console.log(`[WorkflowExecutor]   ✓ Found work item ID from step ${i}: ${workItemId}`);
              break;
            }
          }
        }
      }
      
      if (!workItemId || isNaN(workItemId)) {
        throw new Error('Work item ID is required. Either specify it in config or create a work item in a previous step.');
      }
      
      console.log(`[WorkflowExecutor]   📋 Work Item ID: ${workItemId}`);
      
      // Check if draft already exists for this work item and run (idempotency)
      const existingDrafts = await db
        .select()
        .from(ticketDraftResponses)
        .where(
          and(
            eq(ticketDraftResponses.workItemId, workItemId),
            eq(ticketDraftResponses.organizationId, organizationId)
          )
        )
        .limit(1);
      
      if (existingDrafts.length > 0) {
        const existingDraft = existingDrafts[0];
        console.log(`[WorkflowExecutor]   ♻️ Draft already exists (ID ${existingDraft.id}) - returning existing draft`);
        const metadata = existingDraft.generationMetadata as any;
        return {
          success: true,
          output: {
            draftId: existingDraft.id,
            workItemId,
            draftContent: existingDraft.originalDraft,
            model: metadata?.model || 'unknown',
            status: 'pending_review',
            cached: true,
          },
        };
      }
      
      // Fetch the work item (with organization validation)
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(
          and(
            eq(workItems.id, workItemId),
            eq(workItems.organizationId, organizationId)
          )
        )
        .limit(1);
      
      if (!workItem) {
        throw new Error(`Work item ${workItemId} not found or does not belong to organization ${organizationId}`);
      }
      
      console.log(`[WorkflowExecutor]   ✓ Work item loaded: "${workItem.title}"`);
      
      // Fetch AI drafting configuration for this organization
      const [config] = await db
        .select()
        .from(aiAgentConfigurations)
        .where(eq(aiAgentConfigurations.organizationId, organizationId))
        .limit(1);
      
      if (!config) {
        throw new Error('AI drafting configuration not found. Please configure AI ticket drafting first.');
      }
      
      // Extract and validate model config
      const modelConfig = config.modelConfig as any;
      if (!modelConfig || typeof modelConfig !== 'object') {
        throw new Error('AI drafting configuration is malformed: modelConfig is missing or invalid. Please reconfigure AI ticket drafting.');
      }
      
      const modelType = modelConfig.model;
      if (!modelType) {
        throw new Error('AI drafting configuration is incomplete: model is not specified. Please reconfigure AI ticket drafting.');
      }
      
      const temperature = modelConfig.temperature ?? 0.7;
      const maxTokens = modelConfig.maxTokens ?? 1000;
      
      console.log(`[WorkflowExecutor]   ⚙️ Configuration loaded: ${modelType}`);
      
      // Load system prompt documents with security validation
      const systemPromptDocIds = config.systemPromptDocumentIds || [];
      const systemPromptDocs = await db
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.organizationId, organizationId),
            inArray(knowledgeDocuments.id, systemPromptDocIds.length > 0 ? systemPromptDocIds : [-1])
          )
        );
      
      // Validate all requested documents were found
      if (systemPromptDocIds.length > 0 && systemPromptDocs.length !== systemPromptDocIds.length) {
        throw new Error(`Security violation: Some system prompt documents do not belong to organization ${organizationId}`);
      }
      
      // Load reference knowledge base documents with security validation
      const knowledgeDocIds = config.knowledgeDocumentIds || [];
      const referenceKBDocs = await db
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.organizationId, organizationId),
            inArray(knowledgeDocuments.id, knowledgeDocIds.length > 0 ? knowledgeDocIds : [-1])
          )
        );
      
      // Validate all requested documents were found
      if (knowledgeDocIds.length > 0 && referenceKBDocs.length !== knowledgeDocIds.length) {
        throw new Error(`Security violation: Some knowledge base documents do not belong to organization ${organizationId}`);
      }
      
      console.log(`[WorkflowExecutor]   📚 Loaded ${systemPromptDocs.length} system prompt docs, ${referenceKBDocs.length} reference docs`);
      
      // Build system prompt
      const systemPrompt = systemPromptDocs.map(doc => doc.content).join('\n\n---\n\n');
      const referenceContext = referenceKBDocs.map(doc => `# ${doc.title}\n\n${doc.content}`).join('\n\n---\n\n');
      
      // Context enrichment: Fetch customer data from Splynx
      let customerContextStr = '';
      // Use step-level contextSources config if available, otherwise fall back to global config
      const contextSources = (step.config?.contextSources as string[]) 
        || (config.contextSources as string[]) 
        || ['customer_info', 'ticket_history', 'account_balance', 'connection_status'];
      
      // Extract customer ID from step config, work item metadata, or trigger
      const workflowMetadata = workItem.workflowMetadata as any;
      const splynxCustomerId = step.config?.splynxCustomerId
        || workflowMetadata?.splynx_customer_id 
        || workflowMetadata?.customerId 
        || context.trigger?.customer_id
        || context.webhookData?.data?.customer_id;
      
      if (splynxCustomerId && contextSources.length > 0) {
        console.log(`[WorkflowExecutor]   🔍 Fetching customer context for Splynx customer ${splynxCustomerId}`);
        console.log(`[WorkflowExecutor]   📊 Enabled context sources: ${contextSources.join(', ')}`);
        
        try {
          // Get Splynx integration credentials
          const [splynxIntegration] = await db
            .select()
            .from(integrations)
            .where(
              and(
                eq(integrations.organizationId, organizationId),
                eq(integrations.platformType, 'splynx')
              )
            )
            .limit(1);
          
          if (splynxIntegration?.credentialsEncrypted) {
            const creds = this.decryptCredentials(splynxIntegration.credentialsEncrypted);
            if (creds) {
              const splynxService = new SplynxService({
                baseUrl: creds.baseUrl || creds.apiUrl,
                authHeader: creds.authHeader,
              });
              
              // Enrich context with per-request SplynxService instance (thread-safe)
              const enrichedContext = await contextEnrichmentService.enrichTicketContext(
                splynxService,
                parseInt(String(splynxCustomerId)),
                contextSources as ContextSource[],
                {
                  id: workItem.id,
                  subject: workItem.title,
                  description: workItem.description || '',
                }
              );
              
              // Format context for prompt injection
              customerContextStr = contextEnrichmentService.formatContextForPrompt(enrichedContext);
              
              if (customerContextStr) {
                console.log(`[WorkflowExecutor]   ✅ Customer context enriched (${customerContextStr.length} chars)`);
              } else {
                console.log(`[WorkflowExecutor]   ⚠️ No customer context data retrieved`);
              }
            }
          } else {
            console.log(`[WorkflowExecutor]   ⚠️ Splynx integration not configured - skipping context enrichment`);
          }
        } catch (contextError: any) {
          console.error(`[WorkflowExecutor]   ⚠️ Context enrichment failed:`, contextError.message);
          // Continue without context - don't fail the whole draft
        }
      } else {
        console.log(`[WorkflowExecutor]   ℹ️ No customer ID found - skipping context enrichment`);
      }
      
      // Build user message with ticket context and enriched customer data
      // Use step-level system prompt if provided, otherwise use default
      const stepSystemPrompt = step.config?.systemPrompt;
      
      const userMessage = `Please draft a professional response for the following support ticket:

**Ticket Title:** ${workItem.title}

**Ticket Description:**
${workItem.description || 'No description provided'}

${customerContextStr ? `\n${customerContextStr}\n` : ''}
${referenceContext ? `\n**Reference Information:**\n${referenceContext}\n` : ''}
${stepSystemPrompt ? `\n**Special Instructions:**\n${stepSystemPrompt}\n` : ''}

Generate a draft response that addresses the customer's issue professionally and helpfully. Take into account any customer context provided (such as account status, recent tickets, and service information) to personalize your response.`;
      
      // Get OpenAI API key
      const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured. Please set up OpenAI integration.');
      }
      
      console.log(`[WorkflowExecutor]   🔑 OpenAI API key found`);
      console.log(`[WorkflowExecutor]   🎯 Calling OpenAI ${modelType}...`);
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: modelType,
          messages: [
            {
              role: 'system',
              content: systemPrompt || 'You are a helpful support agent. Provide professional, empathetic, and clear responses to customer support tickets.',
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          temperature: temperature,
          max_tokens: maxTokens,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const result = await response.json();
      const draftResponse = result.choices[0].message.content;
      
      console.log(`[WorkflowExecutor]   ✅ Draft generated (${draftResponse.length} characters)`);
      
      // Save draft to database
      const [savedDraft] = await db
        .insert(ticketDraftResponses)
        .values({
          organizationId,
          workItemId,
          originalDraft: draftResponse,
          generationMetadata: {
            model: modelType,
            temperature,
            maxTokens,
            systemPromptDocIds,
            knowledgeDocIds,
          },
        })
        .returning();
      
      console.log(`[WorkflowExecutor]   💾 Draft saved: ID ${savedDraft.id}`);
      
      // Return structured output for downstream steps
      return {
        success: true,
        output: {
          draftId: savedDraft.id,
          workItemId,
          draftContent: savedDraft.originalDraft,
          model: modelType,
          status: 'pending_review',
          cached: false,
        },
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor]   ❌ AI draft response failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async executeSplynxTicketMessage(step: any, context: any): Promise<StepExecutionResult> {
    try {
      console.log(`[WorkflowExecutor] 📨 Sending Splynx ticket message for step: ${step.name || 'Send Ticket Message'}`);
      
      // Get organization ID
      let organizationId: number;
      if (typeof context.organizationId === 'number') {
        organizationId = context.organizationId;
      } else if (typeof context.organizationId === 'string') {
        organizationId = parseInt(context.organizationId);
        if (isNaN(organizationId)) {
          throw new Error('Invalid organization ID format');
        }
      } else {
        throw new Error('Organization ID is required');
      }
      
      // Get ticket ID from config or context
      let ticketId = step.config?.ticketId;
      if (typeof ticketId === 'string' && ticketId.includes('{{')) {
        ticketId = this.processTemplate(ticketId, context);
      }
      
      // Fallback: search context for ticket ID
      if (!ticketId) {
        ticketId = context.trigger?.id 
          || context.webhookData?.data?.id
          || context.lastOutput?.splynx_ticket_id;
        
        // Search work item metadata if we have a work item ID
        if (!ticketId) {
          for (let i = 1; i <= 20; i++) {
            const stepOutput = context[`step${i}Output`];
            if (stepOutput?.workItemId) {
              const [workItem] = await db
                .select()
                .from(workItems)
                .where(eq(workItems.id, stepOutput.workItemId))
                .limit(1);
              
              if (workItem) {
                const metadata = workItem.workflowMetadata as any;
                ticketId = metadata?.splynx_ticket_id || metadata?.ticketId;
                if (ticketId) break;
              }
            }
          }
        }
      }
      
      if (!ticketId) {
        throw new Error('Ticket ID is required. Configure ticketId or ensure ticket data is in context.');
      }
      
      console.log(`[WorkflowExecutor]   🎫 Ticket ID: ${ticketId}`);
      
      // Get message content from config
      let message = step.config?.message || '';
      if (typeof message === 'string' && message.includes('{{')) {
        message = this.processTemplate(message, context);
      }
      
      if (!message.trim()) {
        throw new Error('Message content is required');
      }
      
      // Get visibility setting (default to private/hidden)
      const isHidden = step.config?.isHidden !== false; // Default true
      
      console.log(`[WorkflowExecutor]   📝 Message visibility: ${isHidden ? 'Private (hidden from customer)' : 'Public'}`);
      
      // Get Splynx integration
      const [splynxIntegration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.organizationId, organizationId),
            eq(integrations.platformType, 'splynx')
          )
        )
        .limit(1);
      
      if (!splynxIntegration?.credentialsEncrypted) {
        throw new Error('Splynx integration not configured');
      }
      
      const creds = this.decryptCredentials(splynxIntegration.credentialsEncrypted);
      if (!creds) {
        throw new Error('Failed to decrypt Splynx credentials');
      }
      
      const splynxService = new SplynxService({
        baseUrl: creds.baseUrl || creds.apiUrl,
        authHeader: creds.authHeader,
      });
      
      // Send the message
      const result = await splynxService.addTicketMessage(String(ticketId), message, isHidden);
      
      console.log(`[WorkflowExecutor]   ✅ Message sent to ticket ${ticketId}`);
      
      return {
        success: true,
        output: {
          ticketId,
          messageId: result?.id,
          isHidden,
          messageSent: true,
        },
      };
    } catch (error: any) {
      console.error(`[WorkflowExecutor]   ❌ Send ticket message failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private decryptCredentials(encryptedCreds: string): any {
    if (!encryptedCreds) return null;
    
    try {
      // Use module-level ENCRYPTION_KEY constant (captured at load time, same as integrations.ts)
      // This will be undefined, matching how the credentials were encrypted
      const IV_LENGTH = 16;
      
      // DEBUG: Log encryption key info
      console.log('[WorkflowExecutor] 🔐 DECRYPTION DEBUG:');
      console.log('  ENCRYPTION_KEY defined:', ENCRYPTION_KEY !== undefined);
      console.log('  ENCRYPTION_KEY value:', ENCRYPTION_KEY);
      console.log('  ENCRYPTION_KEY type:', typeof ENCRYPTION_KEY);
      console.log('  process.env.ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);
      console.log('  Encrypted creds preview:', encryptedCreds.substring(0, 50) + '...');
      console.log('  Encrypted creds length:', encryptedCreds.length);
      
      // Decrypt the credentials
      const parts = encryptedCreds.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted credentials format');
      }
      
      console.log('  IV (first part):', parts[0]);
      console.log('  Encrypted text preview:', parts[1].substring(0, 50) + '...');
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
      
      console.log('  Key hash (first 16 bytes):', key.toString('hex').substring(0, 32));
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('  ✓ Decryption successful!');
      
      // Parse and return the credentials object
      return JSON.parse(decrypted);
    } catch (error: any) {
      console.error('[WorkflowExecutor] ❌ Credential decryption failed:', error.message);
      console.error('[WorkflowExecutor] Stack:', error.stack);
      throw new Error('Failed to decrypt integration credentials');
    }
  }
}