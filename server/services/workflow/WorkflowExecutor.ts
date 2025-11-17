import { db } from '../../db';
import { eq, and, or, sql, count, sum, avg, min, max, ilike, isNull, isNotNull, gt, lt, gte, lte, inArray, notInArray, ne } from 'drizzle-orm';
import { agentWorkflows, agentWorkflowRuns, integrations, keyResults, objectives, activityLogs, users, addressRecords, workItems, fieldTasks, ragStatusRecords, tariffRecords } from '@shared/schema';
import { ActionHandlers } from './ActionHandlers';
import { CleanDatabaseStorage } from '../../storage';
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
        
        case 'integration_action':
          return await this.executeIntegrationAction(step, context);
        
        case 'database_query':
          return await this.executeDatabaseQuery(step, context);
        
        case 'strategy_update':
          return await this.executeStrategyUpdate(step, context);
        
        case 'data_source_query':
          return await this.executeDataSourceQuery(step, context);
        
        case 'wait':
          return await this.executeWait(step, context);
        
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
      console.log(`[WorkflowExecutor]   📝 Parameters:`, JSON.stringify(parameters, null, 2));
      
      // Execute integration-specific action
      const result = await this.actionHandlers.executeIntegrationAction(
        integration.platformType,
        action,
        parameters,
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
        
        if (!isNaN(orgId)) {
          try {
            // Create description in format: "AgentName performed WorkflowName"
            const agentName = context.assignedUserName || 'Unknown Agent';
            const workflowName = context.workflowName || 'Workflow';
            const description = `${agentName} performed ${workflowName}`;
            
            await db.insert(activityLogs).values({
              organizationId: orgId,
              userId: userId,
              actionType: 'agent_action',
              entityType: 'key_result',
              entityId: targetId,
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
              }
            });
            console.log(`[WorkflowExecutor] ✓ Activity log created: "${description}"`);
          } catch (error) {
            console.error('[WorkflowExecutor] Failed to log activity:', error);
            // Don't throw - activity log failure shouldn't break the workflow
          }
        }
      } else if (type === 'objective') {
        // Get the objective details before updating (for activity log)
        const [obj] = await db
          .select()
          .from(objectives)
          .where(eq(objectives.id, targetId))
          .limit(1);
        
        if (!obj) {
          throw new Error(`Objective ${targetId} not found`);
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
            .where(eq(objectives.id, targetId));
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
            .where(eq(objectives.id, targetId));
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
              .where(eq(objectives.id, targetId));
          }
        }
        
        // Create activity log for agent-generated objective update
        const userId = context.assignedUserId || null;
        const orgId = parseInt(context.organizationId);
        
        if (!isNaN(orgId)) {
          try {
            const agentName = context.assignedUserName || 'Unknown Agent';
            const workflowName = context.workflowName || 'Workflow';
            const description = `${agentName} performed ${workflowName}`;
            
            await db.insert(activityLogs).values({
              organizationId: orgId,
              userId: userId,
              actionType: 'agent_action',
              entityType: 'objective',
              entityId: targetId,
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
              }
            });
            console.log(`[WorkflowExecutor] ✓ Activity log created for objective: "${description}"`);
          } catch (error) {
            console.error('[WorkflowExecutor] Failed to log objective activity:', error);
            // Don't throw - activity log failure shouldn't break the workflow
          }
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
      const storage = new CleanDatabaseStorage();
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
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getNestedValue(context, path) || match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
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