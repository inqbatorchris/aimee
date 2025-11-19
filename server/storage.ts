import { eq, desc, and, asc, isNull, sql, inArray, or, ilike, lte, gte } from "drizzle-orm";
import { db, withDatabaseRetry } from "./db";
import {
  users,
  organizations,
  themeSettings,
  activityLogs,
  platformFeatures,
  featureComments,
  featureFeedback,
  missionVision,
  objectives,
  keyResults,
  keyResultTasks,
  keyResultComments,
  workItems,
  checkInCycles,
  checkInCycleParticipants,
  objectivesSnapshots,
  workItemsSnapshots,
  keyResultSnapshots,
  checkInMeetings,
  meetingTopics,
  meetingAttendees,
  meetingItemUpdates,
  teamFeedback,
  knowledgeDocuments,
  knowledgeCategories,
  knowledgeDocumentVersions,
  knowledgeDocumentAttachments,
  knowledgeDocumentActivity,
  teams,
  teamMembers,
  tenants,
  plans,
  subscriptions,
  pages,
  newPageRequests,
  dataTables,
  dataFields,
  dataRelationships,
  erdLayouts,
  layoutTemplates,
  menuSections,
  menuItems,
  integrations,
  integrationTriggers,
  integrationActions,
  agentWorkflows,
  agentWorkflowRuns,
  agentWorkflowSchedules,
  databaseConnections,
  sqlDirectAuditLogs,
  splynxLocations,
  customerGeocodingCache,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type ThemeSettings,
  type InsertThemeSettings,
  type ActivityLog,
  type InsertActivityLog,
  type PlatformFeature,
  type InsertPlatformFeature,
  type FeatureComment,
  type InsertFeatureComment,
  type FeatureHierarchy,
  type InsertFeatureHierarchy,
  type FeatureFeedback,
  type InsertFeatureFeedback,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type MissionVision,
  type InsertMissionVision,
  type Objective,
  type InsertObjective,
  type KeyResult,
  type InsertKeyResult,
  type KeyResultTask,
  type InsertKeyResultTask,
  type KeyResultComment,
  type InsertKeyResultComment,
  type WorkItem,
  type InsertWorkItem,
  type CheckInCycle,
  type InsertCheckInCycle,
  type CheckInCycleParticipant,
  type InsertCheckInCycleParticipant,
  type TeamFeedback,
  type InsertTeamFeedback,
  type ObjectivesSnapshot,
  type InsertObjectivesSnapshot,
  type WorkItemsSnapshot,
  type InsertWorkItemsSnapshot,
  type KeyResultSnapshot,
  type InsertKeyResultSnapshot,
  type CheckInMeeting,
  type InsertCheckInMeeting,
  type MeetingTopic,
  type InsertMeetingTopic,
  type MeetingAttendee,
  type InsertMeetingAttendee,
  type MeetingItemUpdate,
  type InsertMeetingItemUpdate,
  type KnowledgeDocument,
  type InsertKnowledgeDocument,
  type KnowledgeCategory,
  type InsertKnowledgeCategory,
  type Tenant,
  type InsertTenant,
  type Plan,
  type InsertPlan,
  type Subscription,
  type InsertSubscription,
  type Page,
  type InsertPage,
  type NewPageRequest,
  type InsertNewPageRequest,
  type DataTable,
  type InsertDataTable,
  type DataField,
  type InsertDataField,
  type DataRelationship,
  type InsertDataRelationship,
  type ErdLayout,
  type InsertErdLayout,
  type LayoutTemplate,
  type InsertLayoutTemplate,
  type StrategySettings,
  type InsertStrategySettings,
  type MenuSection,
  type InsertMenuSection,
  type MenuItem,
  type InsertMenuItem,
  type Integration,
  type InsertIntegration,
  type DatabaseConnection,
  type InsertDatabaseConnection,
  type IntegrationTrigger,
  type InsertIntegrationTrigger,
  type IntegrationAction,
  type InsertIntegrationAction,
  type AgentWorkflow,
  type InsertAgentWorkflow,
  type AgentWorkflowRun,
  type InsertAgentWorkflowRun,
  webhookEvents,
  type WebhookEvent,
  type InsertWebhookEvent,
  strategySettings,
  taskTypeConfigurations,
  workflowTemplates,
  emailTemplates,
  workItemWorkflowExecutions,
  fieldTasks,
  fieldTaskExecutions,
  taskChecklists,
  visitWorkflows,
  vehicleChecks,
  syncQueue,
  splynxAdministrators,
  type TaskTypeConfiguration,
  type InsertTaskTypeConfiguration,
  type WorkflowTemplate,
  type InsertWorkflowTemplate,
  type EmailTemplate,
  type InsertEmailTemplate,
  type FieldTask,
  type InsertFieldTask,
  type FieldTaskExecution,
  type InsertFieldTaskExecution,
  type TaskChecklist,
  type InsertTaskChecklist,
  type VisitWorkflow,
  type InsertVisitWorkflow,
  type VehicleCheck,
  type InsertVehicleCheck,
  type SyncQueueItem,
  type InsertSyncQueueItem,
  type SplynxAdministrator,
  type InsertSplynxAdministrator,
  airtableConnections,
  airtableWorkflowTemplates,
  airtableRecordLinks,
  addressRecords,
  ragStatusRecords,
  tariffRecords,
  addressSyncLogs,
  type AirtableConnection,
  type InsertAirtableConnection,
  type AirtableWorkflowTemplate,
  type InsertAirtableWorkflowTemplate,
  type AirtableRecordLink,
  type InsertAirtableRecordLink,
  type AddressRecord,
  type InsertAddressRecord,
  type RagStatusRecord,
  type InsertRagStatusRecord,
  type TariffRecord,
  type InsertTariffRecord,
  type AddressSyncLog,
  type InsertAddressSyncLog,
  vapiCalls,
  vapiAssistants,
  vapiKnowledgeFiles,
  type VapiCall,
  type InsertVapiCall,
  type VapiAssistant,
  type InsertVapiAssistant,
  type VapiKnowledgeFile,
  type InsertVapiKnowledgeFile,
} from "../shared/schema";

export interface ICleanStorage {
  // Core User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(organizationId?: number): Promise<User[]>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Agent User Management
  getAgentUsers(organizationId: number): Promise<User[]>;
  createAgentUser(data: any): Promise<User>;
  
  // Organization Management
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizations(): Promise<Organization[]>;
  createOrganization(insertOrg: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined>;
  
  // Theme Settings
  getThemeSettings(organizationId: number): Promise<ThemeSettings | undefined>;
  createThemeSettings(settings: InsertThemeSettings): Promise<ThemeSettings>;
  updateThemeSettings(organizationId: number, data: Partial<ThemeSettings>): Promise<ThemeSettings | undefined>;
  
  // Activity Logs
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(organizationId: number, filters?: { userId?: number; entityType?: string; limit?: number }): Promise<ActivityLog[]>;
  
  // Platform Features Management
  getPlatformFeatures(organizationId?: number, filters?: { isEnabled?: boolean }): Promise<PlatformFeature[]>;
  getPlatformFeature(id: number): Promise<PlatformFeature | undefined>;
  createPlatformFeature(feature: InsertPlatformFeature): Promise<PlatformFeature>;
  updatePlatformFeature(id: number, data: Partial<PlatformFeature>): Promise<PlatformFeature | undefined>;
  toggleFeature(id: number, isEnabled: boolean): Promise<PlatformFeature | undefined>;
  
  // Feature Comments
  getFeatureComments(featureId: number): Promise<FeatureComment[]>;
  createFeatureComment(comment: InsertFeatureComment): Promise<FeatureComment>;
  deleteFeatureComment(id: number): Promise<boolean>;
  
  // Feature Hierarchy Management
  getFeatureHierarchy(featureId: number): Promise<any[]>;
  getChildFeatures(parentFeatureId: number): Promise<PlatformFeature[]>;
  createFeatureHierarchy(hierarchy: any): Promise<any>;
  deleteFeatureHierarchy(parentId: number, childId: number): Promise<boolean>;
  
  // Feature Feedback
  getFeatureFeedback(featureId: number): Promise<any[]>;
  createFeatureFeedback(feedback: any): Promise<any>;
  updateFeatureFeedbackStatus(id: number, status: string): Promise<any>;
  
  // Mission and Vision
  getMissionVision(organizationId: number): Promise<MissionVision | undefined>;
  createMissionVision(data: InsertMissionVision): Promise<MissionVision>;
  updateMissionVision(organizationId: number, data: Partial<InsertMissionVision>): Promise<MissionVision | undefined>;
  
  // Strategy Management (OKRs)
  getObjectives(organizationId: number): Promise<Objective[]>;
  getObjective(id: number): Promise<Objective | undefined>;
  createObjective(objective: InsertObjective): Promise<Objective>;
  updateObjective(id: number, data: Partial<Objective>): Promise<Objective | undefined>;
  deleteObjective(id: number): Promise<boolean>;
  
  // Key Results
  getKeyResults(objectiveId: number): Promise<KeyResult[]>;
  getKeyResultsByObjective(objectiveId: number): Promise<KeyResult[]>;
  getKeyResult(id: number): Promise<KeyResult | undefined>;
  createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult>;
  updateKeyResult(id: number, data: Partial<KeyResult>): Promise<KeyResult | undefined>;
  deleteKeyResult(id: number): Promise<boolean>;
  
  // Key Result Tasks
  getKeyResultTasks(keyResultId: number): Promise<KeyResultTask[]>;
  getKeyResultTask(id: number): Promise<KeyResultTask | undefined>;
  createKeyResultTask(task: InsertKeyResultTask): Promise<KeyResultTask>;
  updateKeyResultTask(id: number, data: Partial<KeyResultTask>): Promise<KeyResultTask | undefined>;
  deleteKeyResultTask(id: number): Promise<boolean>;
  getRecurringTasksWithMetadata(organizationId: number): Promise<any[]>;
  
  // Routines removed - functionality moved to keyResultTasks
  
  // Work Items (Migration 005)
  getWorkItems(organizationId: number): Promise<WorkItem[]>;
  getWorkItemsByCycle(checkInCycleId: number): Promise<WorkItem[]>;
  getWorkItem(id: number): Promise<WorkItem | undefined>;
  createWorkItem(workItem: InsertWorkItem): Promise<WorkItem>;
  updateWorkItem(id: number, data: Partial<WorkItem>): Promise<WorkItem | undefined>;
  deleteWorkItem(id: number): Promise<boolean>;
  
  // Check-in Cycles
  getCheckInCycles(organizationId: number): Promise<CheckInCycle[]>;
  getCheckInCyclesByOverlap(organizationId: number, startDate: string, endDate: string, teamId?: number): Promise<CheckInCycle[]>;
  getCurrentCheckInCycle(objectiveId: number): Promise<CheckInCycle | undefined>;
  createCheckInCycle(cycle: InsertCheckInCycle): Promise<CheckInCycle>;
  updateCheckInCycle(id: number, data: Partial<InsertCheckInCycle>): Promise<CheckInCycle>;
  updateCheckInCycleStatus(id: number, status: string): Promise<CheckInCycle>;
  
  // Check-in Cycle Participants (Migration 006)
  getCycleParticipants(checkInCycleId: number): Promise<CheckInCycleParticipant[]>;
  addCycleParticipant(participant: InsertCheckInCycleParticipant): Promise<CheckInCycleParticipant>;
  removeCycleParticipant(checkInCycleId: number, userId: number): Promise<boolean>;
  bulkUpsertCycleParticipants(participants: InsertCheckInCycleParticipant[]): Promise<{ inserted: number; updated: number }>;
  
  // Strategy Settings
  getStrategySettings(organizationId: number): Promise<StrategySettings | null>;
  updateStrategySettings(organizationId: number, updates: Partial<StrategySettings>): Promise<StrategySettings>;
  
  // Teams
  getTeams(organizationId: number): Promise<any[]>;
  updateTeam(id: number, data: Partial<Team>): Promise<Team | undefined>;
  generateMeetingsForTeam(teamId: number, cadenceSettings: any): Promise<any[]>;
  
  // Team Feedback for Meetings
  createTeamFeedback(feedback: InsertTeamFeedback): Promise<TeamFeedback>;
  getTeamFeedback(meetingId: number): Promise<TeamFeedback[]>;
  getUserFeedback(meetingId: number, userId: number): Promise<TeamFeedback | undefined>;
  updateMeetingRichNotes(meetingId: number, richNotes: any): Promise<CheckInMeeting | undefined>;
  getWorkItemComments(workItemId: number): Promise<ActivityLog[]>;
  
  // Objectives Snapshots (Migration 007)
  createObjectiveSnapshot(snapshot: InsertObjectivesSnapshot): Promise<ObjectivesSnapshot>;
  getObjectiveSnapshots(checkInCycleId: number): Promise<ObjectivesSnapshot[]>;
  
  // Work Items Snapshots (Migration 008)
  createWorkItemSnapshot(snapshot: InsertWorkItemsSnapshot): Promise<WorkItemsSnapshot>;
  getWorkItemSnapshots(checkInCycleId: number): Promise<WorkItemsSnapshot[]>;
  
  // Key Result Snapshots
  createKeyResultSnapshot(snapshot: InsertKeyResultSnapshot): Promise<KeyResultSnapshot>;
  getKeyResultSnapshots(keyResultId: number): Promise<KeyResultSnapshot[]>;
  getLatestKeyResultSnapshot(keyResultId: number, beforeMeetingId: number): Promise<KeyResultSnapshot | undefined>;
  
  // Key Result Comments
  createKeyResultComment(comment: InsertKeyResultComment): Promise<KeyResultComment>;
  getKeyResultComments(keyResultId: number): Promise<KeyResultComment[]>;
  getKeyResultCommentsByMeeting(meetingId: number): Promise<KeyResultComment[]>;
  
  // Knowledge Base
  getKnowledgeDocuments(organizationId: number, filters?: { category?: string; status?: string; search?: string }): Promise<KnowledgeDocument[]>;
  getKnowledgeDocument(id: number): Promise<KnowledgeDocument | undefined>;
  createKnowledgeDocument(doc: InsertKnowledgeDocument): Promise<KnowledgeDocument>;
  updateKnowledgeDocument(id: number, data: Partial<KnowledgeDocument>): Promise<KnowledgeDocument | undefined>;
  deleteKnowledgeDocument(id: number): Promise<boolean>;
  
  // Knowledge Document Versions
  createKnowledgeDocumentVersion(documentId: number, versionData: { title: string; content: string; summary?: string; changeDescription?: string; changedBy: number }): Promise<any>;
  getKnowledgeDocumentVersions(documentId: number): Promise<any[]>;
  
  // Knowledge Document Attachments
  attachKnowledgeDocumentToObjective(documentId: number, objectiveId: number, userId: number, notes?: string): Promise<any>;
  attachKnowledgeDocumentToKeyResult(documentId: number, keyResultId: number, userId: number, notes?: string): Promise<any>;
  attachKnowledgeDocumentToTask(documentId: number, taskId: number, userId: number, notes?: string): Promise<any>;
  attachKnowledgeDocumentToWorkItem(documentId: number, workItemId: number, userId: number, notes?: string): Promise<any>;
  getAttachedDocuments(type: 'objective' | 'keyResult' | 'task' | 'workItem', id: number): Promise<any[]>;
  detachKnowledgeDocument(attachmentId: number): Promise<boolean>;
  
  // Knowledge Document Activity
  logDocumentActivity(documentId: number, userId: number, action: string, details?: any): Promise<any>;
  getDocumentActivity(documentId: number): Promise<any[]>;
  
  // Knowledge Categories
  getKnowledgeCategories(organizationId: number): Promise<KnowledgeCategory[]>;
  createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory>;
  updateKnowledgeCategory(id: number, data: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined>;
  deleteKnowledgeCategory(id: number): Promise<boolean>;
  
  // Legacy Data (for migration)
  
  // Multi-tenancy operations
  getTenant(organizationId: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  
  // Plan operations
  getPlans(): Promise<Plan[]>;
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  
  // Subscription operations
  getSubscription(organizationId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined>;
  
  // Page management operations
  getPages(organizationId: number, filters?: { 
    status?: string; 
    buildStatus?: string; 
    isCore?: boolean;
    includeDeleted?: boolean;
  }): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  getPageBySlug(organizationId: number, slug: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, data: Partial<Page>): Promise<Page | undefined>;
  deletePage(id: string, hard?: boolean): Promise<boolean>;
  
  // [REMOVED: Page visibility and documentation operations - Tables removed]
  
  // Page request operations
  getPageRequests(organizationId: number, filters?: { status?: string }): Promise<NewPageRequest[]>;
  getPageRequest(id: number): Promise<NewPageRequest | undefined>;
  createPageRequest(request: InsertNewPageRequest): Promise<NewPageRequest>;
  updatePageRequest(id: number, data: Partial<NewPageRequest>): Promise<NewPageRequest | undefined>;
  
  // Database explorer operations
  getDataTables(organizationId: number): Promise<DataTable[]>;
  ensureDataTablesSeeded(organizationId: number): Promise<DataTable[]>;
  getDataTableByName(organizationId: number, tableName: string): Promise<DataTable | undefined>;
  refreshDataTables(organizationId: number): Promise<DataTable[]>;
  getDataFields(tableId: number): Promise<DataField[]>;
  getDataFieldsByTableName(organizationId: number, tableName: string): Promise<DataField[]>;
  getDataRelationships(organizationId: number): Promise<DataRelationship[]>;
  createDataRelationship(relationship: InsertDataRelationship): Promise<DataRelationship>;
  
  // ERD layout operations
  getErdLayouts(organizationId: number, userId: number): Promise<ErdLayout[]>;
  createErdLayout(layout: InsertErdLayout): Promise<ErdLayout>;
  updateErdLayout(id: number, data: Partial<ErdLayout>): Promise<ErdLayout | undefined>;
  
  // Integration operations
  getIntegrations(organizationId: number): Promise<Integration[]>;
  getIntegration(organizationId: number, platformType: string): Promise<Integration | undefined>;
  getIntegrationById(id: number): Promise<Integration | undefined>;
  createIntegration(data: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, data: Partial<Integration>): Promise<Integration | undefined>;
  deleteIntegration(id: number): Promise<boolean>;
  
  // Database Connection operations
  getDatabaseConnections(integrationId: number): Promise<DatabaseConnection[]>;
  getDatabaseConnection(id: number): Promise<DatabaseConnection | undefined>;
  createDatabaseConnection(data: InsertDatabaseConnection): Promise<DatabaseConnection>;
  updateDatabaseConnection(id: number, data: Partial<DatabaseConnection>): Promise<DatabaseConnection>;
  deleteDatabaseConnection(id: number): Promise<boolean>;
  logSqlAudit(data: { organizationId: number; query: string; parameters: string | null; executionTime: number; rowCount: number; success: boolean; error: string | null }): Promise<void>;
  
  // Integration Trigger operations
  getIntegrationTriggers(integrationId: number): Promise<IntegrationTrigger[]>;
  getIntegrationTrigger(id: number): Promise<IntegrationTrigger | undefined>;
  getIntegrationTriggerByKey(integrationId: number, triggerKey: string): Promise<IntegrationTrigger | undefined>;
  getAllTriggersForOrganization(organizationId: number): Promise<IntegrationTrigger[]>;
  createIntegrationTrigger(data: InsertIntegrationTrigger): Promise<IntegrationTrigger>;
  updateIntegrationTrigger(id: number, data: Partial<IntegrationTrigger>): Promise<IntegrationTrigger | undefined>;
  deleteIntegrationTrigger(id: number): Promise<boolean>;
  upsertIntegrationTriggers(integrationId: number, triggers: InsertIntegrationTrigger[]): Promise<IntegrationTrigger[]>;
  
  // Integration Action operations
  getIntegrationActions(integrationId: number): Promise<IntegrationAction[]>;
  getIntegrationAction(id: number): Promise<IntegrationAction | undefined>;
  getAllActionsForOrganization(organizationId: number): Promise<IntegrationAction[]>;
  createIntegrationAction(data: InsertIntegrationAction): Promise<IntegrationAction>;
  updateIntegrationAction(id: number, data: Partial<IntegrationAction>): Promise<IntegrationAction | undefined>;
  deleteIntegrationAction(id: number): Promise<boolean>;
  upsertIntegrationActions(integrationId: number, actions: InsertIntegrationAction[]): Promise<IntegrationAction[]>;
  
  // Webhook Event operations
  getWebhookEvents(organizationId: number, limit?: number, offset?: number): Promise<WebhookEvent[]>;
  getWebhookEvent(id: number): Promise<WebhookEvent | undefined>;
  createWebhookEvent(data: InsertWebhookEvent): Promise<WebhookEvent>;
  updateWebhookEvent(id: number, data: Partial<WebhookEvent>): Promise<WebhookEvent | undefined>;
  updateTriggerWebhookStats(triggerId: number): Promise<IntegrationTrigger | undefined>;
  
  // Agent Workflow operations
  getAgentWorkflows(organizationId: number): Promise<AgentWorkflow[]>;
  getAgentWorkflow(id: number): Promise<AgentWorkflow | undefined>;
  createAgentWorkflow(data: InsertAgentWorkflow): Promise<AgentWorkflow>;
  updateAgentWorkflow(id: number, data: Partial<AgentWorkflow>): Promise<AgentWorkflow | undefined>;
  deleteAgentWorkflow(id: number): Promise<boolean>;
  
  // Agent Workflow Run operations
  getAllWorkflowRuns(organizationId: number): Promise<any[]>;
  getWorkflowRuns(workflowId: number): Promise<AgentWorkflowRun[]>;
  getWorkflowRun(id: number): Promise<AgentWorkflowRun | undefined>;
  createWorkflowRun(data: InsertAgentWorkflowRun): Promise<AgentWorkflowRun>;
  updateWorkflowRun(id: number, data: Partial<AgentWorkflowRun>): Promise<AgentWorkflowRun | undefined>;
  
  // Agent Workflow Schedule operations
  getWorkflowSchedules(organizationId: string): Promise<any[]>;
  getWorkflowSchedule(id: number): Promise<any | undefined>;
  createWorkflowSchedule(data: any): Promise<any>;
  updateWorkflowSchedule(id: number, data: Partial<any>): Promise<any | undefined>;
  deleteWorkflowSchedule(id: number): Promise<boolean>;
  
  // Menu operations
  getMenuSections(organizationId: number): Promise<MenuSection[]>;
  createMenuSection(section: InsertMenuSection): Promise<MenuSection>;
  updateMenuSection(id: number, data: Partial<MenuSection>): Promise<MenuSection | undefined>;
  getMenuItems(organizationId: number, sectionId?: number): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, data: Partial<MenuItem>): Promise<MenuItem | undefined>;
  
  // Field Engineering - Splynx Administrators (for user mapping)
  getSplynxAdministrators(organizationId: number): Promise<SplynxAdministrator[]>;
  getSplynxAdministrator(id: number): Promise<SplynxAdministrator | undefined>;
  getSplynxAdministratorBySplynxId(organizationId: number, splynxAdminId: number): Promise<SplynxAdministrator | undefined>;
  createSplynxAdministrator(admin: InsertSplynxAdministrator): Promise<SplynxAdministrator>;
  updateSplynxAdministrator(id: number, data: Partial<SplynxAdministrator>): Promise<SplynxAdministrator | undefined>;
  upsertSplynxAdministrators(organizationId: number, admins: InsertSplynxAdministrator[]): Promise<SplynxAdministrator[]>;
  
  // Field Engineering - Task Type Configurations
  getTaskTypeConfigurations(organizationId: number): Promise<TaskTypeConfiguration[]>;
  getTaskTypeConfiguration(id: number): Promise<TaskTypeConfiguration | undefined>;
  getTaskTypeConfigurationBySplynxType(organizationId: number, splynxTypeId: string): Promise<TaskTypeConfiguration | undefined>;
  createTaskTypeConfiguration(config: InsertTaskTypeConfiguration): Promise<TaskTypeConfiguration>;
  updateTaskTypeConfiguration(id: number, data: Partial<TaskTypeConfiguration>): Promise<TaskTypeConfiguration | undefined>;
  deleteTaskTypeConfiguration(id: number): Promise<boolean>;
  
  // Field Engineering - Workflow Templates
  getWorkflowTemplates(organizationId: number): Promise<WorkflowTemplate[]>;
  getWorkflowTemplate(organizationId: number, id: string): Promise<WorkflowTemplate | undefined>;
  createWorkflowTemplate(template: InsertWorkflowTemplate): Promise<WorkflowTemplate>;
  updateWorkflowTemplate(organizationId: number, id: string, data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | undefined>;
  deleteWorkflowTemplate(organizationId: number, id: string): Promise<boolean>;
  
  // Email Templates
  getEmailTemplates(organizationId: number): Promise<EmailTemplate[]>;
  getEmailTemplate(organizationId: number, id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(organizationId: number, id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(organizationId: number, id: number): Promise<boolean>;
  
  // Workflow Assignment & Execution
  assignWorkflowToWorkItem(organizationId: number, workItemId: number, templateId: string): Promise<{ workItem: any, execution: any }>;
  getWorkItemWorkflow(organizationId: number, workItemId: number): Promise<{ template: WorkflowTemplate | null, execution: any | null, progress: number }>;
  updateWorkflowStepCompletion(organizationId: number, executionId: number, stepId: string, data: any): Promise<any>;
  
  // Field Engineering - Field Tasks
  getFieldTasks(organizationId: number, filters?: { userId?: number; status?: string; appTaskType?: string }): Promise<FieldTask[]>;
  getFieldTask(id: string): Promise<FieldTask | undefined>;
  getFieldTaskBySplynxId(organizationId: number, splynxTaskId: number): Promise<FieldTask | undefined>;
  createFieldTask(task: InsertFieldTask): Promise<FieldTask>;
  updateFieldTask(id: string, data: Partial<FieldTask>): Promise<FieldTask | undefined>;
  deleteFieldTask(id: string): Promise<boolean>;
  
  // Field Engineering - Task Executions
  getFieldTaskExecutions(taskId: string): Promise<FieldTaskExecution[]>;
  getFieldTaskExecution(id: string): Promise<FieldTaskExecution | undefined>;
  createFieldTaskExecution(execution: InsertFieldTaskExecution): Promise<FieldTaskExecution>;
  updateFieldTaskExecution(id: string, data: Partial<FieldTaskExecution>): Promise<FieldTaskExecution | undefined>;
  deleteFieldTaskExecution(id: string): Promise<boolean>;
  
  // Field Engineering - Task Checklists
  getTaskChecklists(taskId: string): Promise<TaskChecklist[]>;
  getTaskChecklist(id: string): Promise<TaskChecklist | undefined>;
  createTaskChecklist(checklist: InsertTaskChecklist): Promise<TaskChecklist>;
  updateTaskChecklist(id: string, data: Partial<TaskChecklist>): Promise<TaskChecklist | undefined>;
  
  // Field Engineering - Visit Workflows
  getVisitWorkflows(taskId: string): Promise<VisitWorkflow[]>;
  getVisitWorkflow(id: string): Promise<VisitWorkflow | undefined>;
  createVisitWorkflow(workflow: InsertVisitWorkflow): Promise<VisitWorkflow>;
  updateVisitWorkflow(id: string, data: Partial<VisitWorkflow>): Promise<VisitWorkflow | undefined>;
  
  // Field Engineering - Vehicle Checks
  getVehicleChecks(organizationId: number, userId?: number): Promise<VehicleCheck[]>;
  getVehicleCheck(id: string): Promise<VehicleCheck | undefined>;
  createVehicleCheck(check: InsertVehicleCheck): Promise<VehicleCheck>;
  updateVehicleCheck(id: string, data: Partial<VehicleCheck>): Promise<VehicleCheck | undefined>;
  
  // Field Engineering - Sync Queue
  getSyncQueue(organizationId: number, userId?: number): Promise<SyncQueueItem[]>;
  getPendingSyncItems(organizationId: number, userId?: number): Promise<SyncQueueItem[]>;
  getSyncQueueItem(id: number): Promise<SyncQueueItem | undefined>;
  createSyncQueueItem(item: InsertSyncQueueItem): Promise<SyncQueueItem>;
  updateSyncQueueItem(id: number, data: Partial<SyncQueueItem>): Promise<SyncQueueItem | undefined>;
  deleteSyncQueueItem(id: number): Promise<boolean>;
  
  // Airtable Integration
  getAirtableConnections(organizationId: number): Promise<AirtableConnection[]>;
  getAirtableConnection(id: number, organizationId: number): Promise<AirtableConnection | undefined>;
  getAirtableConnectionByTableName(organizationId: number, tableName: string): Promise<AirtableConnection | undefined>;
  createAirtableConnection(data: InsertAirtableConnection): Promise<AirtableConnection>;
  updateAirtableConnection(id: number, organizationId: number, data: Partial<AirtableConnection>): Promise<AirtableConnection | undefined>;
  deleteAirtableConnection(id: number, organizationId: number): Promise<boolean>;
  
  getAirtableWorkflowTemplates(connectionId: number, organizationId: number): Promise<AirtableWorkflowTemplate[]>;
  getAirtableWorkflowTemplate(id: number, organizationId: number): Promise<AirtableWorkflowTemplate | undefined>;
  createAirtableWorkflowTemplate(data: InsertAirtableWorkflowTemplate): Promise<AirtableWorkflowTemplate>;
  
  createAirtableRecordLink(data: InsertAirtableRecordLink): Promise<AirtableRecordLink>;
  
  // Address Records Management
  getAddressRecords(organizationId: number, connectionId?: number): Promise<AddressRecord[]>;
  getAddressRecord(id: number, organizationId: number): Promise<AddressRecord | undefined>;
  updateAddressRecord(id: number, organizationId: number, data: Partial<AddressRecord>): Promise<AddressRecord | undefined>;
  deleteAddressRecord(id: number, organizationId: number): Promise<boolean>;
  upsertAddressFromAirtable(organizationId: number, connectionId: number, airtableRecordId: string, fields: any, existingLocalFields?: Partial<AddressRecord>): Promise<AddressRecord>;
  
  // RAG Status Records Management
  getRagStatusRecords(organizationId: number, connectionId?: number): Promise<RagStatusRecord[]>;
  getRagStatusRecord(id: number, organizationId: number): Promise<RagStatusRecord | undefined>;
  upsertRagStatusFromAirtable(organizationId: number, connectionId: number, airtableRecordId: string, fields: any): Promise<RagStatusRecord>;
  
  // Tariff Records Management
  getTariffRecords(organizationId: number, connectionId?: number): Promise<TariffRecord[]>;
  getTariffRecord(id: number, organizationId: number): Promise<TariffRecord | undefined>;
  upsertTariffFromAirtable(organizationId: number, connectionId: number, airtableRecordId: string, fields: any): Promise<TariffRecord>;
  
  // Address Sync Logs
  createAddressSyncLog(data: InsertAddressSyncLog): Promise<AddressSyncLog>;
  updateAddressSyncLog(id: number, data: Partial<AddressSyncLog>): Promise<AddressSyncLog | undefined>;
  getAddressSyncLogs(organizationId: number, connectionId?: number, limit?: number): Promise<AddressSyncLog[]>;
  getAddressSyncLog(id: number, organizationId: number): Promise<AddressSyncLog | undefined>;
  
  // [REMOVED: Role operations - Handled directly in users table]
}

export class CleanDatabaseStorage implements ICleanStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUsers(organizationId?: number): Promise<any[]> {
    // Select columns including organization name
    let query = db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      username: users.username,
      role: users.role,
      userType: users.userType,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      isActive: users.isActive,
      canAssignTickets: users.canAssignTickets,
      splynxAdminId: users.splynxAdminId,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      isEmailVerified: users.isEmailVerified,
    }).from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id));
    
    // Build WHERE conditions
    const conditions = [eq(users.isActive, true)];
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }
    
    // Apply filters and order by fullName
    const result = await query
      .where(and(...conditions))
      .orderBy(users.fullName);
    
    console.log('💾 getUsers result sample:', JSON.stringify(result.slice(0, 2), null, 2));
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Log user creation
    await this.logActivity({
      organizationId: user.organizationId || 1,
      userId: user.id,
      actionType: 'creation' as const,
      entityType: 'user',
      entityId: user.id,
      description: `New user ${user.email} was created`,
      metadata: { email: user.email, role: user.role }
    });

    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId || 1,
        userId: id,
        actionType: 'status_change' as const,
        entityType: 'user',
        entityId: id,
        description: `User ${updated.email} profile was updated`,
        metadata: userData,
      });
    }

    return updated;
  }

  // Agent User Management
  async getAgentUsers(organizationId: number): Promise<User[]> {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.userType, 'agent')
        )
      )
      .orderBy(users.fullName);
    
    return result;
  }

  async createAgentUser(data: any): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    
    // Log agent user creation
    await this.logActivity({
      organizationId: user.organizationId || 1,
      userId: user.id,
      actionType: 'creation' as const,
      entityType: 'user',
      entityId: user.id,
      description: `Agent user ${user.fullName || user.username} was created`,
      metadata: { email: user.email, userType: user.userType, role: user.role }
    });

    return user;
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return org;
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(asc(organizations.name));
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(insertOrg).returning();
    return org;
  }

  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  // Theme Settings operations
  async getThemeSettings(organizationId: number): Promise<any> {
    try {
      const [settings] = await db.select().from(themeSettings)
        .where(eq(themeSettings.organizationId, organizationId))
        .limit(1);
      
      if (settings) {
        // Return the settings in the structure that ThemeStore expects
        return {
          organizationId,
          activeTheme: settings.activeTheme || 'light',
          lightTheme: settings.lightTheme as any || {},
          darkTheme: settings.darkTheme as any || {},
          brandSettings: settings.brandSettings as any || {},
          layoutSettings: settings.layoutSettings as any || {},
          customCSS: '',
          updatedAt: settings.updatedAt?.toISOString()
        };
      }
    } catch (error) {
      console.error('Error fetching theme settings:', error);
    }
    
    // Return default theme as fallback with proper structure
    return {
      organizationId,
      activeTheme: 'light',
      lightTheme: {
        primary: '#00BFA6',
        secondary: '#1a1a1a',
        accent: '#f3f4f6',
        background: '#ffffff',
        foreground: '#020817',
        muted: '#f9fafb',
        border: '#e5e7eb',
        card: '#ffffff',
        destructive: '#ef4444',
        sidebar: '#f9fafb',
        sidebarForeground: '#020817',
        notificationBg: '#00BFA6',
        notificationFg: '#ffffff',
        radius: '0.5'
      },
      darkTheme: {
        primary: '#00BFA6',
        secondary: '#f3f4f6',
        accent: '#374151',
        background: '#0a0a0a',
        foreground: '#f9fafb',
        muted: '#1f2937',
        border: '#374151',
        card: '#111827',
        destructive: '#991b1b',
        sidebar: '#111827',
        sidebarForeground: '#f9fafb',
        notificationBg: '#00BFA6',
        notificationFg: '#ffffff',
        radius: '0.5'
      },
      brandSettings: {
        companyName: 'aimee.works',
        tagline: 'Unify Your Business Management',
        logoUrl: '',
        favicon: '',
        primaryFont: 'Inter',
        headingFont: 'Inter'
      },
      layoutSettings: {
        fontSize: '16',
        fontScale: '1',
        spacing: '1',
        verticalSpacing: '1',
        contentWidth: '1200',
        sidebarWidth: '250',
        h1Size: '18',
        h2Size: '14',
        h3Size: '13',
        h4Size: '12',
        h5Size: '11',
        h6Size: '10',
        smallSize: '10',
        tinySize: '9',
        buttonSmallSize: '8',
        buttonDefaultSize: '10',
        buttonLargeSize: '12',
        buttonRadius: '4',
        buttonPrimaryBg: '#00BFA6',
        buttonSecondaryBg: '#666666',
        buttonDestructiveBg: '#EF4444',
        labelRadius: '999',
        labelPadding: '4',
        buttonTextSize: '9',
        menuTextSize: '9'
      },
      customCSS: ''
    };
  }

  async createThemeSettings(settings: InsertThemeSettings): Promise<ThemeSettings> {
    const [created] = await db.insert(themeSettings).values(settings).returning();
    return created;
  }

  async updateThemeSettings(organizationId: number, data: Partial<ThemeSettings>): Promise<ThemeSettings | undefined> {
    const [updated] = await db.update(themeSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(themeSettings.organizationId, organizationId))
      .returning();
    return updated;
  }

  // Activity Logs operations
  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(activity).returning();
    return created;
  }

  async getActivityLogs(organizationId: number, filters?: { userId?: number; entityType?: string; limit?: number }): Promise<ActivityLog[]> {
    const conditions = [eq(activityLogs.organizationId, organizationId)];

    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }

    if (filters?.entityType) {
      conditions.push(eq(activityLogs.entityType, filters.entityType));
    }

    const limit = filters?.limit || 100;
    
    // Simple query without custom select
    const logs = await db
      .select()
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
    
    // Map the results to include userName
    return logs.map(log => ({
      ...log.activity_logs,
      userName: log.users?.fullName || 'Unknown User'
    })) as any;
  }

  // Platform Features operations
  async getPlatformFeatures(organizationId?: number, filters?: { isEnabled?: boolean }): Promise<PlatformFeature[]> {
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(platformFeatures.organizationId, organizationId));
    }

    if (filters?.isEnabled !== undefined) {
      conditions.push(eq(platformFeatures.isEnabled, filters.isEnabled));
    }

    const query = db.select().from(platformFeatures);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(asc(platformFeatures.name));
    }
    
    return await query.orderBy(asc(platformFeatures.name));
  }

  async getPlatformFeature(id: number): Promise<PlatformFeature | undefined> {
    const [feature] = await db.select().from(platformFeatures)
      .where(eq(platformFeatures.id, id))
      .limit(1);
    return feature;
  }


  async createPlatformFeature(feature: InsertPlatformFeature): Promise<PlatformFeature> {
    const [created] = await db.insert(platformFeatures).values(feature).returning();
    
    await this.logActivity({
      organizationId: created.organizationId || 1,
      userId: created.createdBy || 1,
      actionType: 'creation' as const,
      entityType: 'feature',
      entityId: created.id,
      description: `Platform feature ${created.name} was created`,
      metadata: {}
    });

    return created;
  }

  async updatePlatformFeature(id: number, data: Partial<PlatformFeature>): Promise<PlatformFeature | undefined> {
    const [updated] = await db.update(platformFeatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformFeatures.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId || 1,
        userId: updated.updatedBy || 1,
        actionType: 'status_change' as const,
        entityType: 'feature',
        entityId: id,
        description: `Platform feature ${updated.name} was updated`,
        metadata: data,
      });
    }

    return updated;
  }

  async toggleFeature(id: number, isEnabled: boolean): Promise<PlatformFeature | undefined> {
    const [updated] = await db.update(platformFeatures)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(platformFeatures.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId || 1,
        userId: 1, // System user for now
        actionType: 'status_change' as const,
        entityType: 'feature',
        entityId: id,
        description: `Platform feature ${updated.name} was ${isEnabled ? 'enabled' : 'disabled'}`,
        metadata: { featureName: updated.name, isEnabled }
      });
    }

    return updated;
  }

  // Feature Comments operations
  async getFeatureComments(featureId: number): Promise<FeatureComment[]> {
    return await db.select().from(featureComments)
      .where(eq(featureComments.featureId, featureId))
      .orderBy(desc(featureComments.createdAt));
  }

  async createFeatureComment(comment: InsertFeatureComment): Promise<FeatureComment> {
    const [created] = await db.insert(featureComments).values(comment).returning();
    return created;
  }

  async deleteFeatureComment(id: number): Promise<boolean> {
    const result = await db.delete(featureComments).where(eq(featureComments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Feature Hierarchy Management
  async getFeatureHierarchy(featureId: number): Promise<any[]> {
    // Note: Feature hierarchy table has been removed.
    // Return empty array for now - hierarchy will be managed differently
    return [];
  }

  async getChildFeatures(parentFeatureId: number): Promise<PlatformFeature[]> {
    // Note: Feature hierarchy table has been removed.
    // Return empty array for now - hierarchy will be managed differently
    return [];
  }

  async createFeatureHierarchy(hierarchy: InsertFeatureHierarchy): Promise<FeatureHierarchy> {
    // Note: Feature hierarchy table has been removed.
    // This method is a no-op for now
    throw new Error('Feature hierarchy functionality has been removed');
  }

  async deleteFeatureHierarchy(parentId: number, childId: number): Promise<boolean> {
    // Note: Feature hierarchy table has been removed.
    // This method is a no-op for now
    return false;
  }

  // Feature Feedback
  async getFeatureFeedback(featureId: number): Promise<FeatureFeedback[]> {
    return await db.select().from(featureFeedback)
      .where(eq(featureFeedback.featureId, featureId))
      .orderBy(desc(featureFeedback.createdAt));
  }

  async createFeatureFeedback(feedback: InsertFeatureFeedback): Promise<FeatureFeedback> {
    const [created] = await db.insert(featureFeedback).values(feedback).returning();
    return created;
  }

  async updateFeatureFeedbackStatus(id: number, status: string): Promise<FeatureFeedback | undefined> {
    const [updated] = await db.update(featureFeedback)
      .set({ status, updatedAt: new Date() })
      .where(eq(featureFeedback.id, id))
      .returning();
    return updated;
  }

  // Mission and Vision implementation
  async getMissionVision(organizationId: number): Promise<MissionVision | undefined> {
    const [result] = await db.select()
      .from(missionVision)
      .where(eq(missionVision.organizationId, organizationId))
      .limit(1);
    
    if (result) {
      // Generate HTML from mission/vision fields if strategyStatementHtml is missing
      if (!result.strategyStatementHtml && (result.mission || result.vision)) {
        let generatedHtml = '';
        if (result.mission) {
          generatedHtml += `<h2>Mission</h2><p>${result.mission}</p>`;
        }
        if (result.vision) {
          generatedHtml += `<h2>Vision</h2><p>${result.vision}</p>`;
        }
        
        return {
          ...result,
          strategyStatementHtml: generatedHtml
        };
      }
    }
    
    return result;
  }

  async createMissionVision(data: InsertMissionVision): Promise<MissionVision> {
    const [created] = await db.insert(missionVision).values(data).returning();
    return created;
  }

  async updateMissionVision(organizationId: number, data: Partial<InsertMissionVision>): Promise<MissionVision | undefined> {
    const [updated] = await db.update(missionVision)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(missionVision.organizationId, organizationId))
      .returning();
    return updated;
  }

  // Strategy Management - Objectives (using existing database structure)
  async getObjectives(organizationId?: number): Promise<any[]> {
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(objectives.organizationId, organizationId));
    }
    
    let objectiveList;
    if (conditions.length > 0) {
      objectiveList = await db.select({
        objective: objectives,
        team: teams,
      }).from(objectives)
        .leftJoin(teams, eq(objectives.teamId, teams.id))
        .where(and(...conditions))
        .orderBy(asc(objectives.displayOrder), desc(objectives.createdAt));
    } else {
      objectiveList = await db.select({
        objective: objectives,
        team: teams,
      }).from(objectives)
        .leftJoin(teams, eq(objectives.teamId, teams.id))
        .orderBy(asc(objectives.displayOrder), desc(objectives.createdAt));
    }
    
    // Fetch key results and tasks for each objective
    const objectivesWithKeyResults = await Promise.all(
      objectiveList.map(async (row) => {
        const objective = row.objective;
        const team = row.team;
        
        const keyResultsList = await db.select().from(keyResults)
          .where(eq(keyResults.objectiveId, objective.id))
          .orderBy(asc(keyResults.title));
        
        const keyResultsWithTasks = await Promise.all(
          keyResultsList.map(async (keyResult) => {
            const tasks = await db.select().from(keyResultTasks)
              .where(eq(keyResultTasks.keyResultId, keyResult.id))
              .orderBy(asc(keyResultTasks.title));
            
            return {
              ...keyResult,
              tasks: tasks
            };
          })
        );
        
        return {
          ...objective,
          team: team,
          keyResults: keyResultsWithTasks
        };
      })
    );
    
    return objectivesWithKeyResults;
  }

  async getObjective(id: number): Promise<Objective | undefined> {
    const [objective] = await db.select().from(objectives)
      .where(eq(objectives.id, id))
      .limit(1);
    return objective;
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const [created] = await db.insert(objectives).values(objective).returning();
    return created;
  }

  async updateObjective(id: number, data: Partial<Objective>): Promise<Objective | undefined> {
    const [updated] = await db.update(objectives)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(objectives.id, id))
      .returning();
    return updated;
  }

  async deleteObjective(id: number): Promise<boolean> {
    const result = await db.delete(objectives).where(eq(objectives.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateObjectivesOrder(updates: { id: number; displayOrder: number }[]): Promise<void> {
    // Use a transaction to update all objectives atomically
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx.update(objectives)
          .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
          .where(eq(objectives.id, update.id));
      }
    });
  }

  // Key Results
  async getKeyResults(objectiveId: number): Promise<KeyResult[]> {
    return await db.select().from(keyResults)
      .where(eq(keyResults.objectiveId, objectiveId))
      .orderBy(asc(keyResults.title));
  }

  async getKeyResultsByObjective(objectiveId: number): Promise<KeyResult[]> {
    return this.getKeyResults(objectiveId);
  }

  async getKeyResult(id: number): Promise<KeyResult | undefined> {
    const [keyResult] = await db.select().from(keyResults)
      .where(eq(keyResults.id, id))
      .limit(1);
    return keyResult;
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    const [created] = await db.insert(keyResults).values(keyResult).returning();
    return created;
  }

  async updateKeyResult(id: number, data: Partial<KeyResult>): Promise<KeyResult | undefined> {
    const [updated] = await db.update(keyResults)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(keyResults.id, id))
      .returning();
    return updated;
  }

  async deleteKeyResult(id: number): Promise<boolean> {
    const result = await db.delete(keyResults).where(eq(keyResults.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllKeyResults(organizationId: number): Promise<KeyResult[]> {
    return await db.select().from(keyResults)
      .where(eq(keyResults.organizationId, organizationId))
      .orderBy(asc(keyResults.title));
  }

  // Key Result Tasks - Enhanced for work item generation
  async getKeyResultTasks(keyResultId: number): Promise<KeyResultTask[]> {
    return await db.select().from(keyResultTasks)
      .where(eq(keyResultTasks.keyResultId, keyResultId))
      .orderBy(asc(keyResultTasks.title));
  }

  async getKeyResultTask(id: number): Promise<KeyResultTask | undefined> {
    const [task] = await db.select().from(keyResultTasks)
      .where(eq(keyResultTasks.id, id))
      .limit(1);
    return task;
  }

  async createKeyResultTask(task: InsertKeyResultTask): Promise<KeyResultTask> {
    const [created] = await db.insert(keyResultTasks).values(task).returning();
    return created;
  }

  async updateKeyResultTask(id: number, data: Partial<KeyResultTask>): Promise<KeyResultTask | undefined> {
    const [updated] = await db.update(keyResultTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(keyResultTasks.id, id))
      .returning();
    return updated;
  }

  async deleteKeyResultTask(id: number): Promise<boolean> {
    const result = await db.delete(keyResultTasks).where(eq(keyResultTasks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Get dependencies for a key result task (work items and snapshots)
  async getKeyResultTaskDependencies(taskId: number): Promise<{
    workItems: WorkItem[];
    snapshots: WorkItemsSnapshot[];
    totalCount: number;
  }> {
    // Get work items linked to this task
    const taskWorkItems = await db.select().from(workItems)
      .where(eq(workItems.keyResultTaskId, taskId));
    
    // Get work item snapshots linked to this task
    const taskSnapshots = await db.select().from(workItemsSnapshots)
      .where(eq(workItemsSnapshots.keyResultTaskId, taskId));
    
    return {
      workItems: taskWorkItems,
      snapshots: taskSnapshots,
      totalCount: taskWorkItems.length + taskSnapshots.length
    };
  }

  // Cascade delete for key result task with all dependencies
  async cascadeDeleteKeyResultTask(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // First, delete work item snapshots
      await tx.delete(workItemsSnapshots)
        .where(eq(workItemsSnapshots.keyResultTaskId, id));
      
      // Then, delete work items
      await tx.delete(workItems)
        .where(eq(workItems.keyResultTaskId, id));
      
      // Finally, delete the task itself
      const result = await tx.delete(keyResultTasks)
        .where(eq(keyResultTasks.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  async getAllTasks(organizationId: number): Promise<KeyResultTask[]> {
    return await db.select().from(keyResultTasks)
      .where(eq(keyResultTasks.organizationId, organizationId))
      .orderBy(asc(keyResultTasks.title));
  }

  // Get active recurring tasks that need work items generated
  async getActiveRecurringTasks(organizationId: number): Promise<KeyResultTask[]> {
    return await db.select().from(keyResultTasks)
      .where(and(
        eq(keyResultTasks.organizationId, organizationId),
        eq(keyResultTasks.isRecurring, true),
        eq(keyResultTasks.generationStatus, 'active')
      ))
      .orderBy(asc(keyResultTasks.nextDueDate));
  }

  // Get recurring tasks with metadata for manual generation
  async getRecurringTasksWithMetadata(organizationId: number): Promise<any[]> {
    const { startOfDay } = await import('date-fns');
    
    // Get all active recurring tasks with their key results
    const tasks = await db.select({
      task: keyResultTasks,
      keyResult: keyResults
    })
      .from(keyResultTasks)
      .leftJoin(keyResults, eq(keyResultTasks.keyResultId, keyResults.id))
      .where(and(
        eq(keyResultTasks.organizationId, organizationId),
        eq(keyResultTasks.isRecurring, true),
        eq(keyResultTasks.generationStatus, 'active')
      ))
      .orderBy(asc(keyResultTasks.nextDueDate));

    // For each task, check if work item exists for nextDueDate
    const enrichedTasks = await Promise.all(tasks.map(async ({ task, keyResult }) => {
      let canGenerate = true;
      let warningMessage: string | undefined;
      
      if (task.nextDueDate) {
        const dueDate = startOfDay(new Date(task.nextDueDate));
        const existingItems = await this.getWorkItemsByTaskAndDate(
          task.id, 
          dueDate.toISOString()
        );
        
        if (existingItems.length > 0) {
          canGenerate = false;
          warningMessage = 'Work item already exists for next due date';
        }
      } else {
        canGenerate = false;
        warningMessage = 'No next due date set';
      }
      
      return {
        id: task.id,
        title: task.title,
        keyResultId: task.keyResultId,
        keyResultTitle: keyResult?.title || 'No Key Result',
        frequency: task.frequency,
        nextDueDate: task.nextDueDate,
        completedCount: task.completedCount || 0,
        totalOccurrences: task.totalOccurrences,
        generationStatus: task.generationStatus,
        canGenerate,
        warningMessage
      };
    }));

    return enrichedTasks;
  }

  // Create work item from key result task
  async createWorkItemFromTask(task: KeyResultTask, overrides?: Partial<InsertWorkItem>): Promise<WorkItem> {
    // Get the key result for inheritance
    const keyResult = task.keyResultId ? await this.getKeyResult(task.keyResultId) : undefined;
    
    // Resolve team and assignee through inheritance
    const teamId = task.teamId || keyResult?.teamId || undefined;
    const assignedTo = task.assignedTo || keyResult?.assignedTo || keyResult?.ownerId || undefined;
    
    const workItemData: InsertWorkItem = {
      organizationId: task.organizationId,
      title: task.title,
      description: task.description || undefined,
      keyResultTaskId: task.id,
      teamId,
      assignedTo,
      status: 'Planning',
      createdBy: task.createdBy || undefined,
      ...overrides
    };
    
    const [created] = await db.insert(workItems).values(workItemData).returning();
    return created;
  }

  // Get dependencies for a key result (tasks and work items through tasks)
  async getKeyResultDependencies(keyResultId: number): Promise<{
    tasks: KeyResultTask[];
    workItems: WorkItem[];
    totalCount: number;
  }> {
    // Get all tasks linked to this key result
    const keyResultTaskList = await db.select().from(keyResultTasks)
      .where(eq(keyResultTasks.keyResultId, keyResultId));
    
    // Get all work items linked to these tasks
    const taskIds = keyResultTaskList.map(t => t.id);
    const keyResultWorkItems = taskIds.length > 0 
      ? await db.select().from(workItems)
          .where(inArray(workItems.keyResultTaskId, taskIds))
      : [];
    
    return {
      tasks: keyResultTaskList,
      workItems: keyResultWorkItems,
      totalCount: keyResultTaskList.length + keyResultWorkItems.length
    };
  }

  // Cascade delete for key result with all dependencies
  async cascadeDeleteKeyResult(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Get all tasks for this key result
      const tasks = await tx.select().from(keyResultTasks)
        .where(eq(keyResultTasks.keyResultId, id));
      const taskIds = tasks.map(t => t.id);
      
      if (taskIds.length > 0) {
        // Delete work item snapshots linked to tasks
        await tx.delete(workItemsSnapshots)
          .where(inArray(workItemsSnapshots.keyResultTaskId, taskIds));
        
        // Delete work items linked to tasks
        await tx.delete(workItems)
          .where(inArray(workItems.keyResultTaskId, taskIds));
        
        // Delete all tasks
        await tx.delete(keyResultTasks)
          .where(eq(keyResultTasks.keyResultId, id));
      }
      
      // Delete activity logs for this key result
      await tx.delete(activityLogs)
        .where(and(
          eq(activityLogs.entityType, 'key_result'),
          eq(activityLogs.entityId, id)
        ));
      
      // Finally, delete the key result itself
      const result = await tx.delete(keyResults)
        .where(eq(keyResults.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Get dependencies for an objective (key results, tasks, work items)
  async getObjectiveDependencies(objectiveId: number): Promise<{
    keyResults: KeyResult[];
    tasks: KeyResultTask[];
    workItems: WorkItem[];
    totalCount: number;
  }> {
    // Get all key results for this objective
    const objKeyResults = await db.select().from(keyResults)
      .where(eq(keyResults.objectiveId, objectiveId));
    
    // Get all tasks for these key results
    const keyResultIds = objKeyResults.map(kr => kr.id);
    const objTasks = keyResultIds.length > 0
      ? await db.select().from(keyResultTasks)
          .where(inArray(keyResultTasks.keyResultId, keyResultIds))
      : [];
    
    // Get all work items for these tasks
    const taskIds = objTasks.map(t => t.id);
    const objWorkItems = taskIds.length > 0
      ? await db.select().from(workItems)
          .where(inArray(workItems.keyResultTaskId, taskIds))
      : [];
    
    return {
      keyResults: objKeyResults,
      tasks: objTasks,
      workItems: objWorkItems,
      totalCount: objKeyResults.length + objTasks.length + objWorkItems.length
    };
  }

  // Cascade delete for objective with all dependencies
  async cascadeDeleteObjective(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // First get check_in_cycles that reference this objective
      const checkInCyclesList = await tx.execute(sql`SELECT id FROM check_in_cycles WHERE objective_id = ${id}`);
      const checkInCycleIds = checkInCyclesList.rows.map((row: any) => row.id);
      
      // Delete work items that reference these check-in cycles FIRST
      if (checkInCycleIds.length > 0) {
        for (const cycleId of checkInCycleIds) {
          await tx.execute(sql`DELETE FROM work_items WHERE check_in_cycle_id = ${cycleId}`);
        }
      }
      
      // Get all key results for this objective
      const keyResultList = await tx.select().from(keyResults)
        .where(eq(keyResults.objectiveId, id));
      const keyResultIds = keyResultList.map(kr => kr.id);
      
      if (keyResultIds.length > 0) {
        // Get all tasks for these key results
        const tasks = await tx.select().from(keyResultTasks)
          .where(inArray(keyResultTasks.keyResultId, keyResultIds));
        const taskIds = tasks.map(t => t.id);
        
        if (taskIds.length > 0) {
          // Delete work item snapshots
          await tx.delete(workItemsSnapshots)
            .where(inArray(workItemsSnapshots.keyResultTaskId, taskIds));
          
          // Delete work items related to tasks
          await tx.delete(workItems)
            .where(inArray(workItems.keyResultTaskId, taskIds));
          
          // Delete tasks
          await tx.delete(keyResultTasks)
            .where(inArray(keyResultTasks.keyResultId, keyResultIds));
        }
        
        // Delete key results
        await tx.delete(keyResults)
          .where(eq(keyResults.objectiveId, id));
      }
      
      // NOW we can delete check_in_cycles (after work_items are gone)
      await tx.execute(sql`DELETE FROM check_in_cycles WHERE objective_id = ${id}`);
      
      // Delete objectives_snapshots for this objective
      await tx.delete(objectivesSnapshots)
        .where(eq(objectivesSnapshots.objectiveId, id));
      
      // Delete activity logs for this objective
      // The actual database has objective_id column not in schema, so use raw SQL
      await tx.execute(sql`DELETE FROM activity_logs WHERE objective_id = ${id}`);
      
      // Also delete by entityType/entityId pattern for any that use that
      await tx.delete(activityLogs)
        .where(and(
          eq(activityLogs.entityType, 'objective'),
          eq(activityLogs.entityId, id)
        ));
      
      // Finally, delete the objective itself
      const result = await tx.delete(objectives)
        .where(eq(objectives.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Update task completion metrics
  async updateTaskCompletionMetrics(taskId: number, completed: boolean): Promise<void> {
    const task = await this.getKeyResultTask(taskId);
    if (!task) return;
    
    const updates: Partial<KeyResultTask> = {
      lastCompletedDate: completed ? new Date() : task.lastCompletedDate || undefined
    };
    
    if (completed) {
      updates.completedCount = (task.completedCount || 0) + 1;
      updates.currentStreak = (task.currentStreak || 0) + 1;
      updates.longestStreak = Math.max(task.longestStreak || 0, updates.currentStreak || 0);
    } else {
      updates.missedCount = (task.missedCount || 0) + 1;
      updates.currentStreak = 0;
    }
    
    // Add to activity log
    const activityLog = (task.activityLog as any[]) || [];
    activityLog.push({
      date: new Date().toISOString(),
      type: completed ? 'completed' : 'missed',
      workItemId: null // Will be updated by caller
    });
    updates.activityLog = activityLog;
    
    await this.updateKeyResultTask(taskId, updates);
    
    // Update key result progress if task is completed
    if (completed && task.keyResultId) {
      const keyResult = await this.getKeyResult(task.keyResultId);
      if (keyResult && task.totalOccurrences) {
        // Calculate progress based on completion rate
        const progressPercentage = (updates.completedCount || 0) / task.totalOccurrences;
        const newCurrentValue = Math.round((parseFloat(keyResult.targetValue || '0') * progressPercentage));
        await this.updateKeyResult(task.keyResultId, {
          currentValue: newCurrentValue.toString()
        });
      }
    }
  }

  // Routines removed - functionality moved to keyResultTasks

  // Work Items (Migration 005)
  async getWorkItems(organizationId: number): Promise<WorkItem[]> {
    return await db.select().from(workItems)
      .where(eq(workItems.organizationId, organizationId))
      .orderBy(asc(workItems.dueDate));
  }

  async getWorkItemsByCycle(checkInCycleId: number): Promise<WorkItem[]> {
    return await db.select().from(workItems)
      .where(eq(workItems.checkInCycleId, checkInCycleId))
      .orderBy(asc(workItems.dueDate));
  }

  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    const [workItem] = await db.select().from(workItems)
      .where(eq(workItems.id, id))
      .limit(1);
    return workItem;
  }

  async createWorkItem(workItem: InsertWorkItem): Promise<WorkItem> {
    const [created] = await db.insert(workItems).values(workItem).returning();
    return created;
  }

  async updateWorkItem(id: number, data: Partial<WorkItem>): Promise<WorkItem | undefined> {
    const [updated] = await db.update(workItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workItems.id, id))
      .returning();
    return updated;
  }

  async deleteWorkItem(id: number): Promise<boolean> {
    const result = await db.delete(workItems).where(eq(workItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Get work items by task and date (for duplicate prevention)
  async getWorkItemsByTaskAndDate(
    taskId: number, 
    startDate: string,
    endDate?: string
  ): Promise<WorkItem[]> {
    const dateOnly = startDate.split('T')[0];
    
    // If endDate provided, check range, otherwise exact match
    const dateCondition = endDate 
      ? and(
          gte(workItems.dueDate, dateOnly),
          lte(workItems.dueDate, endDate.split('T')[0])
        )
      : eq(workItems.dueDate, dateOnly);
    
    return await db.select().from(workItems)
      .where(and(
        eq(workItems.keyResultTaskId, taskId),
        dateCondition
      ))
      .orderBy(asc(workItems.createdAt));
  }

  // Get count of work items for a task (for sequence numbering)
  async getWorkItemCountByTask(taskId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(workItems)
      .where(eq(workItems.keyResultTaskId, taskId));
    return result[0]?.count || 0;
  }

  // Validate recurring task configuration
  async validateRecurringTaskConfig(task: Partial<KeyResultTask>): Promise<string[]> {
    const errors: string[] = [];
    
    if (task.isRecurring && !task.frequency) {
      errors.push('Recurring tasks must have a frequency');
    }
    
    if (task.isRecurring && !task.nextDueDate) {
      errors.push('Recurring tasks must have a next due date');
    }
    
    // Check end date vs next due date
    if (task.endDate && task.nextDueDate) {
      const endDate = new Date(task.endDate);
      const nextDue = new Date(task.nextDueDate);
      if (endDate < nextDue) {
        errors.push('End date cannot be before next due date');
      }
    }
    
    // Check next due date is not too far in future
    if (task.organizationId && task.nextDueDate) {
      const settings = await this.getStrategySettings(task.organizationId);
      const maxDays = (settings?.lookaheadDays || 7) * 2;
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + maxDays);
      
      if (new Date(task.nextDueDate) > maxDate) {
        errors.push(`Next due date should be within ${maxDays} days for optimal generation`);
      }
    }
    
    return errors;
  }

  // Check-in Cycles
  async getCheckInCycles(organizationId: number): Promise<CheckInCycle[]> {
    // Note: check_in_cycles table has organizationId field (added in earlier migration)
    return await db.select().from(checkInCycles)
      .where(eq(checkInCycles.organizationId, organizationId))
      .orderBy(desc(checkInCycles.startDate));
  }
  
  async getCheckInCyclesByOverlap(organizationId: number, startDate: string, endDate: string, teamId?: number): Promise<CheckInCycle[]> {
    const conditions = [
      eq(checkInCycles.organizationId, organizationId),
      and(
        lte(checkInCycles.startDate, endDate),
        gte(checkInCycles.endDate, startDate)
      )
    ];
    
    if (teamId !== undefined) {
      conditions.push(eq(checkInCycles.teamId, teamId));
    }
    
    return await db.select().from(checkInCycles)
      .where(and(...conditions))
      .orderBy(desc(checkInCycles.startDate));
  }

  async getCurrentCheckInCycle(objectiveId: number): Promise<CheckInCycle | undefined> {
    const [cycle] = await db.select().from(checkInCycles)
      .where(and(
        eq(checkInCycles.objectiveId, objectiveId),
        eq(checkInCycles.status, 'In Progress')
      ))
      .limit(1);
    return cycle;
  }

  async createCheckInCycle(cycle: InsertCheckInCycle): Promise<CheckInCycle> {
    // Strip out legacy fields if present
    const { objectiveId, frequency, ...cleanCycle } = cycle as any;
    if (objectiveId || frequency) {
      console.warn('Legacy fields detected in createCheckInCycle:', { objectiveId, frequency });
    }
    const [created] = await db.insert(checkInCycles).values(cleanCycle).returning();
    return created;
  }
  
  async updateCheckInCycle(id: number, data: Partial<InsertCheckInCycle>): Promise<CheckInCycle> {
    const [updated] = await db.update(checkInCycles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(checkInCycles.id, id))
      .returning();
    return updated;
  }
  
  async updateCheckInCycleStatus(id: number, status: string): Promise<CheckInCycle> {
    const [updated] = await db.update(checkInCycles)
      .set({ status: status as 'Planning' | 'In Progress' | 'Review' | 'Completed', updatedAt: new Date() })
      .where(eq(checkInCycles.id, id))
      .returning();
    return updated;
  }

  // Check-in Cycle Participants (Migration 006)
  async getCycleParticipants(checkInCycleId: number): Promise<CheckInCycleParticipant[]> {
    return await db.select().from(checkInCycleParticipants)
      .where(eq(checkInCycleParticipants.checkInCycleId, checkInCycleId))
      .orderBy(checkInCycleParticipants.role);
  }

  async addCycleParticipant(participant: InsertCheckInCycleParticipant): Promise<CheckInCycleParticipant> {
    const [created] = await db.insert(checkInCycleParticipants).values(participant).returning();
    return created;
  }

  async removeCycleParticipant(checkInCycleId: number, userId: number): Promise<boolean> {
    const result = await db.delete(checkInCycleParticipants)
      .where(and(
        eq(checkInCycleParticipants.checkInCycleId, checkInCycleId),
        eq(checkInCycleParticipants.userId, userId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async bulkUpsertCycleParticipants(participants: InsertCheckInCycleParticipant[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;
    
    for (const participant of participants) {
      const existing = await db.select().from(checkInCycleParticipants)
        .where(and(
          eq(checkInCycleParticipants.checkInCycleId, participant.checkInCycleId),
          eq(checkInCycleParticipants.userId, participant.userId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(checkInCycleParticipants)
          .set({ role: participant.role })
          .where(eq(checkInCycleParticipants.id, existing[0].id));
        updated++;
      } else {
        await db.insert(checkInCycleParticipants).values(participant);
        inserted++;
      }
    }
    
    return { inserted, updated };
  }
  
  // Teams
  async getTeams(organizationId: number): Promise<Team[]> {
    return await db.select().from(teams)
      .where(eq(teams.organizationId, organizationId))
      .orderBy(teams.name);
  }
  
  // Get a single team by ID with organization name
  async getTeam(teamId: number): Promise<any | undefined> {
    const [team] = await db.select({
      id: teams.id,
      name: teams.name,
      cadence: teams.cadence,
      timezone: teams.timezone,
      organizationId: teams.organizationId,
      organizationName: organizations.name,
      meetingTime: teams.meeting_time,
      weeklyWeekday: teams.weeklyWeekday,
      monthlyRuleType: teams.monthlyRuleType,
      monthlyNth: teams.monthlyNth,
      monthlyWeekday: teams.monthlyWeekday,
      monthlyDayOfMonth: teams.monthlyDayOfMonth,
      periodRuleType: teams.periodRuleType,
      periodNth: teams.periodNth,
      periodWeekday: teams.periodWeekday,
      defaultMeetingLengthMinutes: teams.defaultMeetingLengthMinutes,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt
    })
    .from(teams)
    .leftJoin(organizations, eq(teams.organizationId, organizations.id))
    .where(eq(teams.id, teamId));
    
    return team;
  }
  
  // Get all teams across all organizations (for super admins)
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams)
      .orderBy(teams.name);
  }
  
  // Get teams with organization names
  async getTeamsWithOrganizations(organizationId?: number): Promise<any[]> {
    const query = db.select({
      id: teams.id,
      name: teams.name,
      cadence: teams.cadence,
      timezone: teams.timezone,
      organizationId: teams.organizationId,
      organizationName: organizations.name,
      meetingTime: teams.meeting_time,
      weeklyWeekday: teams.weeklyWeekday,
      monthlyRuleType: teams.monthlyRuleType,
      monthlyNth: teams.monthlyNth,
      monthlyWeekday: teams.monthlyWeekday,
      monthlyDayOfMonth: teams.monthlyDayOfMonth,
      periodRuleType: teams.periodRuleType,
      periodNth: teams.periodNth,
      periodWeekday: teams.periodWeekday,
      defaultMeetingLengthMinutes: teams.defaultMeetingLengthMinutes,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt
    })
    .from(teams)
    .leftJoin(organizations, eq(teams.organizationId, organizations.id));
    
    if (organizationId) {
      return await query.where(eq(teams.organizationId, organizationId)).orderBy(teams.name);
    }
    
    return await query.orderBy(teams.name);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(insertTeam).returning();
    return team;
  }

  async updateTeam(id: number, data: Partial<Team>): Promise<Team | undefined> {
    const [updated] = await db.update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return updated;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async generateMeetingsForTeam(teamId: number, cadenceSettings: any): Promise<any[]> {
    // Import the meeting generator
    const { ensureTeamMeetings } = await import('./utils/meetingGenerator.js');
    
    // Get team
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) throw new Error('Team not found');
    
    // Generate meetings for the next 90 days
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    
    // ensureTeamMeetings returns count of created meetings, not the meetings themselves
    const count = await ensureTeamMeetings(
      teamId,
      new Date(),
      endDate
    );
    
    return [{ created: count }];
  }

  // Team Feedback for Meetings
  async createTeamFeedback(feedback: InsertTeamFeedback): Promise<TeamFeedback> {
    const [result] = await db.insert(teamFeedback).values(feedback).returning();
    return result;
  }

  async getTeamFeedback(meetingId: number): Promise<TeamFeedback[]> {
    return await db.select().from(teamFeedback)
      .where(eq(teamFeedback.meetingId, meetingId))
      .orderBy(desc(teamFeedback.createdAt));
  }

  async getUserFeedback(meetingId: number, userId: number): Promise<TeamFeedback | undefined> {
    const [result] = await db.select().from(teamFeedback)
      .where(and(
        eq(teamFeedback.meetingId, meetingId),
        eq(teamFeedback.userId, userId)
      ))
      .limit(1);
    return result;
  }

  async updateMeetingRichNotes(meetingId: number, richNotes: any): Promise<CheckInMeeting | undefined> {
    const [result] = await db.update(checkInMeetings)
      .set({ richNotes, updatedAt: new Date() })
      .where(eq(checkInMeetings.id, meetingId))
      .returning();
    return result;
  }

  async getWorkItemComments(workItemId: number): Promise<ActivityLog[]> {
    return await db.select({
      id: activityLogs.id,
      organizationId: activityLogs.organizationId,
      userId: activityLogs.userId,
      actionType: activityLogs.actionType,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      description: activityLogs.description,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      // Join with users to get user details
      userName: users.fullName,
      userEmail: users.email,
      userAvatar: users.avatarUrl
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(and(
      eq(activityLogs.entityType, 'work_item'),
      eq(activityLogs.entityId, workItemId),
      eq(activityLogs.actionType, 'comment')
    ))
    .orderBy(desc(activityLogs.createdAt));
  }

  // Team Members
  async getTeamMembers(teamId: number): Promise<any[]> {
    return await db.select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      createdAt: teamMembers.createdAt,
      user: {
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role
      }
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(users.fullName);
  }

  async addTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(insertTeamMember).returning();
    return member;
  }

  async updateTeamMember(teamId: number, userId: number, data: { role: 'Leader' | 'Member' | 'Watcher' }): Promise<TeamMember | undefined> {
    const [updated] = await db.update(teamMembers)
      .set(data)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    return updated;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const result = await db.delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getUserTeams(userId: number): Promise<any[]> {
    return await db.select({
      id: teams.id,
      name: teams.name,
      cadence: teams.cadence,
      role: teamMembers.role,
      createdAt: teamMembers.createdAt
    })
    .from(teamMembers)
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .orderBy(teams.name);
  }

  // Objectives Snapshots (Migration 007)
  async createObjectiveSnapshot(snapshot: InsertObjectivesSnapshot): Promise<ObjectivesSnapshot> {
    const [created] = await db.insert(objectivesSnapshots).values(snapshot).returning();
    return created;
  }

  async getObjectiveSnapshots(checkInCycleId: number): Promise<ObjectivesSnapshot[]> {
    return await db.select().from(objectivesSnapshots)
      .where(eq(objectivesSnapshots.checkInCycleId, checkInCycleId))
      .orderBy(objectivesSnapshots.objectiveId);
  }

  // Work Items Snapshots (Migration 008)
  async createWorkItemSnapshot(snapshot: InsertWorkItemsSnapshot): Promise<WorkItemsSnapshot> {
    const [created] = await db.insert(workItemsSnapshots).values(snapshot).returning();
    return created;
  }

  async getWorkItemSnapshots(checkInCycleId: number): Promise<WorkItemsSnapshot[]> {
    return await db.select().from(workItemsSnapshots)
      .where(eq(workItemsSnapshots.checkInCycleId, checkInCycleId))
      .orderBy(workItemsSnapshots.workItemId);
  }
  
  // Key Result Snapshots
  async createKeyResultSnapshot(snapshot: InsertKeyResultSnapshot): Promise<KeyResultSnapshot> {
    const [created] = await db.insert(keyResultSnapshots).values(snapshot).returning();
    return created;
  }
  
  async getKeyResultSnapshots(keyResultId: number): Promise<KeyResultSnapshot[]> {
    return await db.select().from(keyResultSnapshots)
      .where(eq(keyResultSnapshots.keyResultId, keyResultId))
      .orderBy(desc(keyResultSnapshots.snapshotDate));
  }
  
  async getLatestKeyResultSnapshot(keyResultId: number, beforeMeetingId: number): Promise<KeyResultSnapshot | undefined> {
    const [latest] = await db.select().from(keyResultSnapshots)
      .where(and(
        eq(keyResultSnapshots.keyResultId, keyResultId),
        sql`${keyResultSnapshots.checkInMeetingId} < ${beforeMeetingId}`
      ))
      .orderBy(desc(keyResultSnapshots.snapshotDate))
      .limit(1);
    return latest;
  }
  
  // Key Result Comments
  async createKeyResultComment(comment: InsertKeyResultComment): Promise<KeyResultComment> {
    const [created] = await db.insert(keyResultComments).values(comment).returning();
    return created;
  }
  
  async getKeyResultComments(keyResultId: number): Promise<KeyResultComment[]> {
    return await db.select({
      comment: keyResultComments,
      user: users
    })
    .from(keyResultComments)
    .leftJoin(users, eq(keyResultComments.userId, users.id))
    .where(eq(keyResultComments.keyResultId, keyResultId))
    .orderBy(desc(keyResultComments.createdAt))
    .then(results => results.map(r => ({
      ...r.comment,
      userName: r.user?.fullName || r.user?.username || 'Unknown'
    }) as any));
  }
  
  async getKeyResultCommentsByMeeting(meetingId: number): Promise<KeyResultComment[]> {
    return await db.select({
      comment: keyResultComments,
      user: users
    })
    .from(keyResultComments)
    .leftJoin(users, eq(keyResultComments.userId, users.id))
    .where(eq(keyResultComments.meetingId, meetingId))
    .orderBy(desc(keyResultComments.createdAt))
    .then(results => results.map(r => ({
      ...r.comment,
      userName: r.user?.fullName || r.user?.username || 'Unknown'
    }) as any));
  }

  // Knowledge Base - Documents
  async getKnowledgeDocuments(organizationId: number, filters?: { category?: string; status?: string; search?: string }): Promise<KnowledgeDocument[]> {
    const conditions = [eq(knowledgeDocuments.organizationId, organizationId)];

    if (filters?.category) {
      // Filter by categories array field
      conditions.push(sql`${knowledgeDocuments.categories} @> ARRAY[${filters.category}]`);
    }

    if (filters?.status) {
      conditions.push(eq(knowledgeDocuments.status, filters.status as any));
    }

    if (filters?.search) {
      const searchCondition = or(
        ilike(knowledgeDocuments.title, `%${filters.search}%`),
        ilike(knowledgeDocuments.content, `%${filters.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    return await db.select().from(knowledgeDocuments)
      .where(and(...conditions))
      .orderBy(desc(knowledgeDocuments.createdAt));
  }

  async getKnowledgeDocument(id: number): Promise<KnowledgeDocument | undefined> {
    const [doc] = await db.select().from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))
      .limit(1);
    return doc;
  }

  async createKnowledgeDocument(doc: InsertKnowledgeDocument): Promise<KnowledgeDocument> {
    const [created] = await db.insert(knowledgeDocuments).values(doc).returning();
    return created;
  }

  async updateKnowledgeDocument(id: number, data: Partial<KnowledgeDocument>): Promise<KnowledgeDocument | undefined> {
    const [updated] = await db.update(knowledgeDocuments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeDocument(id: number): Promise<boolean> {
    const result = await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Knowledge Categories
  async getKnowledgeCategories(organizationId: number): Promise<KnowledgeCategory[]> {
    return await db.select().from(knowledgeCategories)
      .where(eq(knowledgeCategories.organizationId, organizationId))
      .orderBy(asc(knowledgeCategories.sortOrder), asc(knowledgeCategories.name));
  }

  async createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory> {
    const result = await db.insert(knowledgeCategories).values(category).returning() as KnowledgeCategory[];
    return result[0];
  }

  async updateKnowledgeCategory(id: number, data: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined> {
    const [updated] = await db.update(knowledgeCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeCategories.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeCategory(id: number): Promise<boolean> {
    const result = await db.delete(knowledgeCategories).where(eq(knowledgeCategories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Knowledge Document Versions
  async createKnowledgeDocumentVersion(documentId: number, versionData: { title: string; content: string; summary?: string; changeDescription?: string; changedBy: number }): Promise<any> {
    // Get current document
    const document = await this.getKnowledgeDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get current version number
    const lastVersion = await db.select()
      .from(knowledgeDocumentVersions)
      .where(eq(knowledgeDocumentVersions.documentId, documentId))
      .orderBy(desc(knowledgeDocumentVersions.versionNumber))
      .limit(1);
    
    const versionNumber = lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;
    
    // Create new version
    const [created] = await db.insert(knowledgeDocumentVersions).values({
      documentId,
      versionNumber,
      title: versionData.title,
      content: versionData.content || '',
      summary: versionData.summary || '',
      changedBy: versionData.changedBy,
      changeDescription: versionData.changeDescription || '',
    }).returning();
    
    // Log activity
    await this.logDocumentActivity(documentId, versionData.changedBy, 'version_created', {
      versionNumber,
      changeDescription: versionData.changeDescription
    });
    
    return created;
  }
  
  async getKnowledgeDocumentVersions(documentId: number): Promise<any[]> {
    const versions = await db.select()
      .from(knowledgeDocumentVersions)
      .leftJoin(users, eq(knowledgeDocumentVersions.changedBy, users.id))
      .where(eq(knowledgeDocumentVersions.documentId, documentId))
      .orderBy(desc(knowledgeDocumentVersions.versionNumber));
      
    return versions.map(v => ({
      ...v.knowledge_document_versions,
      changedByName: v.users?.fullName || 'Unknown User'
    }));
  }
  
  // Knowledge Document Attachments
  async attachKnowledgeDocumentToObjective(documentId: number, objectiveId: number, userId: number, notes?: string): Promise<any> {
    const [attachment] = await db.insert(knowledgeDocumentAttachments).values({
      documentId,
      objectiveId,
      attachedBy: userId,
      notes
    }).returning();
    
    await this.logDocumentActivity(documentId, userId, 'attached', {
      attachedTo: 'objective',
      objectiveId,
      notes
    });
    
    return attachment;
  }
  
  async attachKnowledgeDocumentToKeyResult(documentId: number, keyResultId: number, userId: number, notes?: string): Promise<any> {
    const [attachment] = await db.insert(knowledgeDocumentAttachments).values({
      documentId,
      keyResultId,
      attachedBy: userId,
      notes
    }).returning();
    
    await this.logDocumentActivity(documentId, userId, 'attached', {
      attachedTo: 'keyResult',
      keyResultId,
      notes
    });
    
    return attachment;
  }
  
  async attachKnowledgeDocumentToTask(documentId: number, taskId: number, userId: number, notes?: string): Promise<any> {
    const [attachment] = await db.insert(knowledgeDocumentAttachments).values({
      documentId,
      taskId,
      attachedBy: userId,
      notes
    }).returning();
    
    await this.logDocumentActivity(documentId, userId, 'attached', {
      attachedTo: 'task',
      taskId,
      notes
    });
    
    return attachment;
  }

  async attachKnowledgeDocumentToWorkItem(documentId: number, workItemId: number, userId: number, notes?: string): Promise<any> {
    const [attachment] = await db.insert(knowledgeDocumentAttachments).values({
      documentId,
      workItemId,
      attachedBy: userId,
      notes
    }).returning();
    
    await this.logDocumentActivity(documentId, userId, 'attached', {
      attachedTo: 'workItem',
      workItemId,
      notes
    });
    
    return attachment;
  }
  
  async getAttachedDocuments(type: 'objective' | 'keyResult' | 'task' | 'workItem', id: number): Promise<any[]> {
    let conditions;
    
    switch (type) {
      case 'objective':
        conditions = eq(knowledgeDocumentAttachments.objectiveId, id);
        break;
      case 'keyResult':
        conditions = eq(knowledgeDocumentAttachments.keyResultId, id);
        break;
      case 'task':
        conditions = eq(knowledgeDocumentAttachments.taskId, id);
        break;
      case 'workItem':
        conditions = eq(knowledgeDocumentAttachments.workItemId, id);
        break;
    }
    
    const attachments = await db.select()
      .from(knowledgeDocumentAttachments)
      .leftJoin(knowledgeDocuments, eq(knowledgeDocumentAttachments.documentId, knowledgeDocuments.id))
      .leftJoin(users, eq(knowledgeDocumentAttachments.attachedBy, users.id))
      .where(conditions)
      .orderBy(desc(knowledgeDocumentAttachments.attachedAt));
      
    return attachments.map(a => ({
      attachmentId: a.knowledge_document_attachments.id,
      documentId: a.knowledge_document_attachments.documentId,
      notes: a.knowledge_document_attachments.notes,
      attachedAt: a.knowledge_document_attachments.attachedAt,
      attachedBy: a.knowledge_document_attachments.attachedBy,
      attachedByName: a.users?.fullName || 'Unknown User',
      document: a.knowledge_documents
    }));
  }
  
  async detachKnowledgeDocument(attachmentId: number): Promise<boolean> {
    // Get attachment details for logging
    const [attachment] = await db.select()
      .from(knowledgeDocumentAttachments)
      .where(eq(knowledgeDocumentAttachments.id, attachmentId))
      .limit(1);
    
    if (!attachment) {
      return false;
    }
    
    // Delete attachment
    const result = await db.delete(knowledgeDocumentAttachments)
      .where(eq(knowledgeDocumentAttachments.id, attachmentId));
    
    // Log activity if deletion was successful
    if (result.rowCount && result.rowCount > 0) {
      await this.logDocumentActivity(attachment.documentId, attachment.attachedBy, 'detached', {
        attachmentId,
        objectiveId: attachment.objectiveId,
        keyResultId: attachment.keyResultId,
        taskId: attachment.taskId
      });
    }
    
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Knowledge Document Activity
  async logDocumentActivity(documentId: number, userId: number, action: string, details?: any): Promise<any> {
    const [activity] = await db.insert(knowledgeDocumentActivity).values({
      documentId,
      userId,
      action,
      details: details || {}
    }).returning();
    
    return activity;
  }
  
  async getDocumentActivity(documentId: number): Promise<any[]> {
    const activities = await db.select()
      .from(knowledgeDocumentActivity)
      .leftJoin(users, eq(knowledgeDocumentActivity.userId, users.id))
      .where(eq(knowledgeDocumentActivity.documentId, documentId))
      .orderBy(desc(knowledgeDocumentActivity.createdAt));
      
    return activities.map(a => ({
      ...a.knowledge_document_activity,
      userName: a.users?.fullName || 'Unknown User'
    }));
  }

  // Legacy Data has been migrated and removed

  // Multi-tenancy operations
  async getTenant(organizationId: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.organizationId, organizationId))
      .limit(1);
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);
    return tenant;
  }

  // Plan operations
  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(asc(plans.priceMonthly));
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return plan;
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(plan).returning();
    return created;
  }

  // Subscription operations
  async getSubscription(organizationId: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  // Page management operations
  async getPages(organizationId: number, filters?: { 
    status?: string; 
    buildStatus?: string; 
    isCore?: boolean;
    includeDeleted?: boolean;
  }): Promise<Page[]> {
    let query = db.select().from(pages).$dynamic();
    
    const conditions = [];
    conditions.push(eq(pages.organizationId, organizationId));
    
    if (filters?.status) {
      conditions.push(eq(pages.status, filters.status as any));
    }
    if (filters?.buildStatus) {
      conditions.push(eq(pages.buildStatus, filters.buildStatus as any));
    }
    if (filters?.isCore !== undefined) {
      conditions.push(eq(pages.isCorePage, filters.isCore));
    }
    if (!filters?.includeDeleted) {
      conditions.push(isNull(pages.deletedAt));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(pages.createdAt));
  }

  async getPage(id: string): Promise<Page | undefined> {
    const [page] = await db.select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);
    return page;
  }

  async getPageBySlug(organizationId: number, slug: string): Promise<Page | undefined> {
    const [page] = await db.select()
      .from(pages)
      .where(and(
        eq(pages.organizationId, organizationId),
        eq(pages.slug, slug)
      ))
      .limit(1);
    return page;
  }

  async getPageByPath(organizationId: number, path: string): Promise<Page | undefined> {
    const [page] = await db.select()
      .from(pages)
      .where(and(
        eq(pages.organizationId, organizationId),
        eq(pages.path, path)
      ))
      .limit(1);
    return page;
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [created] = await db.insert(pages).values(page).returning();
    
    // Page documentation functionality has been removed
    
    return created;
  }

  async updatePage(id: string, data: Partial<Page>): Promise<Page | undefined> {
    const [updated] = await db.update(pages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    return updated;
  }

  async deletePage(id: string, hard: boolean = false): Promise<boolean> {
    if (hard) {
      const result = await db.delete(pages).where(eq(pages.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } else {
      const result = await db.update(pages)
        .set({ deletedAt: new Date() })
        .where(eq(pages.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    }
  }

  // [REMOVED: Page visibility and documentation operations - Tables removed]

  // Page request operations
  async getPageRequests(organizationId: number, filters?: { status?: string }): Promise<NewPageRequest[]> {
    let query = db.select().from(newPageRequests).where(eq(newPageRequests.organizationId, organizationId)).$dynamic();
    
    if (filters?.status) {
      query = query.where(eq(newPageRequests.status, filters.status as any));
    }
    
    return await query.orderBy(desc(newPageRequests.createdAt));
  }

  async getPageRequest(id: number): Promise<NewPageRequest | undefined> {
    const [request] = await db.select()
      .from(newPageRequests)
      .where(eq(newPageRequests.id, id))
      .limit(1);
    return request;
  }

  async createPageRequest(request: InsertNewPageRequest): Promise<NewPageRequest> {
    const [created] = await db.insert(newPageRequests).values(request).returning();
    return created;
  }

  async updatePageRequest(id: number, data: Partial<NewPageRequest>): Promise<NewPageRequest | undefined> {
    const [updated] = await db.update(newPageRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newPageRequests.id, id))
      .returning();
    return updated;
  }

  // Database explorer operations
  async getDataTables(organizationId: number): Promise<DataTable[]> {
    return await db.select()
      .from(dataTables)
      .where(eq(dataTables.organizationId, organizationId))
      .orderBy(asc(dataTables.tableName));
  }

  async ensureDataTablesSeeded(organizationId: number): Promise<DataTable[]> {
    // Define the table registry - these are the tables available for data source queries
    const tableRegistry = [
      { tableName: 'address_records', label: 'Address Records', description: 'Customer addresses and network locations' },
      { tableName: 'work_items', label: 'Work Items', description: 'Tasks and work items from strategy execution' },
      { tableName: 'field_tasks', label: 'Field Tasks', description: 'Field engineering tasks and assignments' },
      { tableName: 'rag_status_records', label: 'RAG Status Records', description: 'Red/Amber/Green status tracking' },
      { tableName: 'tariff_records', label: 'Tariff Records', description: 'Service tariff and pricing data' },
      { tableName: 'financial_transactions', label: 'Financial Transactions', description: 'Xero financial transactions with profit center categorization' },
      { tableName: 'objectives', label: 'Objectives', description: 'Strategic objectives and company goals' },
      { tableName: 'key_results', label: 'Key Results', description: 'Measurable key results tracking objective progress' },
      { tableName: 'key_result_tasks', label: 'Key Result Tasks', description: 'Actionable tasks supporting key results' },
      { tableName: 'profit_centers', label: 'Profit Centers', description: 'Business segments for financial tracking' },
    ];

    console.log(`[Storage] Seeding data tables for organization ${organizationId}...`);

    for (const tableConfig of tableRegistry) {
      // Check if table already exists
      const existing = await this.getDataTableByName(organizationId, tableConfig.tableName);
      
      if (!existing) {
        console.log(`[Storage]   Creating table registration: ${tableConfig.tableName}`);
        
        await db.insert(dataTables).values({
          organizationId,
          tableName: tableConfig.tableName,
          label: tableConfig.label,
          description: tableConfig.description,
          docUrl: null,
          rowCount: null,
          sizeBytes: null,
          lastAnalyzed: null,
        });
      } else {
        console.log(`[Storage]   Table already registered: ${tableConfig.tableName}`);
      }
    }

    console.log(`[Storage] Data table seeding complete for organization ${organizationId}`);
    return await this.getDataTables(organizationId);
  }

  async getDataTableByName(organizationId: number, tableName: string): Promise<DataTable | undefined> {
    const [table] = await db.select()
      .from(dataTables)
      .where(and(
        eq(dataTables.organizationId, organizationId),
        eq(dataTables.tableName, tableName)
      ))
      .limit(1);
    return table;
  }

  async refreshDataTables(organizationId: number): Promise<DataTable[]> {
    // Get list of actual database tables
    const tableQuery = `
      SELECT table_name, pg_total_relation_size(quote_ident(table_name))::integer as size_bytes
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const { rows: actualTables } = await db.execute(tableQuery as any);
    
    // Update or insert table metadata
    for (const table of actualTables as any[]) {
      const existing = await db.select()
        .from(dataTables)
        .where(and(
          eq(dataTables.organizationId, organizationId),
          eq(dataTables.tableName, table.table_name)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(dataTables)
          .set({
            sizeBytes: table.size_bytes,
            lastAnalyzed: new Date(),
            updatedAt: new Date()
          })
          .where(eq(dataTables.id, existing[0].id));
      } else {
        await db.insert(dataTables).values({
          organizationId,
          tableName: table.table_name,
          sizeBytes: table.size_bytes,
          lastAnalyzed: new Date()
        });
      }
    }
    
    return await this.getDataTables(organizationId);
  }

  async getDataFields(tableId: number): Promise<DataField[]> {
    return await db.select()
      .from(dataFields)
      .where(eq(dataFields.tableId, tableId))
      .orderBy(asc(dataFields.fieldName));
  }

  async getDataFieldsByTableName(organizationId: number, tableName: string): Promise<DataField[]> {
    const table = await this.getDataTableByName(organizationId, tableName);
    if (!table) {
      return [];
    }
    
    let fields = await this.getDataFields(table.id);
    
    // Auto-seed fields if empty (first-time access)
    if (fields.length === 0) {
      console.log(`[Storage] No fields found for table ${tableName}, auto-seeding...`);
      fields = await this.ensureDataFieldsSeeded(table.id, tableName);
    }
    
    return fields;
  }

  async ensureDataFieldsSeeded(tableId: number, tableName: string): Promise<DataField[]> {
    // Define field registry for each table - matching actual database schema
    const fieldRegistry: Record<string, Array<{ fieldName: string; fieldType: string; description?: string }>> = {
      address_records: [
        { fieldName: 'id', fieldType: 'number', description: 'Primary key' },
        { fieldName: 'organizationId', fieldType: 'number', description: 'Organization ID' },
        { fieldName: 'airtableRecordId', fieldType: 'text', description: 'Airtable record ID' },
        { fieldName: 'airtableConnectionId', fieldType: 'number', description: 'Airtable connection ID' },
        { fieldName: 'airtableFields', fieldType: 'jsonb', description: 'All Airtable data (use dotted notation: airtableFields.Address, airtableFields.City, etc.)' },
        { fieldName: 'localStatus', fieldType: 'text', description: 'Local workflow status' },
        { fieldName: 'localNotes', fieldType: 'text', description: 'Local notes' },
        { fieldName: 'workItemCount', fieldType: 'number', description: 'Number of related work items' },
        { fieldName: 'lastWorkItemDate', fieldType: 'timestamp', description: 'Last work item date' },
        { fieldName: 'lastSyncedAt', fieldType: 'timestamp', description: 'Last Airtable sync time' },
        { fieldName: 'createdAt', fieldType: 'timestamp', description: 'Record creation time' },
        { fieldName: 'updatedAt', fieldType: 'timestamp', description: 'Last update time' },
      ],
      work_items: [
        { fieldName: 'id', fieldType: 'number', description: 'Primary key' },
        { fieldName: 'organizationId', fieldType: 'number', description: 'Organization ID' },
        { fieldName: 'teamId', fieldType: 'number', description: 'Team ID' },
        { fieldName: 'keyResultTaskId', fieldType: 'number', description: 'Key result task ID' },
        { fieldName: 'checkInCycleId', fieldType: 'number', description: 'Check-in cycle ID' },
        { fieldName: 'targetMeetingId', fieldType: 'number', description: 'Target meeting ID' },
        { fieldName: 'status', fieldType: 'text', description: 'Work item status' },
        { fieldName: 'title', fieldType: 'text', description: 'Work item title' },
        { fieldName: 'description', fieldType: 'text', description: 'Description' },
        { fieldName: 'notes', fieldType: 'text', description: 'Notes' },
        { fieldName: 'dueDate', fieldType: 'date', description: 'Due date' },
        { fieldName: 'ownerId', fieldType: 'number', description: 'Owner user ID' },
        { fieldName: 'assignedTo', fieldType: 'number', description: 'Assigned user ID' },
        { fieldName: 'attachments', fieldType: 'jsonb', description: 'Attachments array' },
        { fieldName: 'createdBy', fieldType: 'number', description: 'Creator user ID' },
        { fieldName: 'workflowTemplateId', fieldType: 'text', description: 'Workflow template ID' },
        { fieldName: 'workflowSource', fieldType: 'text', description: 'Workflow source' },
        { fieldName: 'workflowMetadata', fieldType: 'jsonb', description: 'Workflow metadata' },
        { fieldName: 'workItemType', fieldType: 'text', description: 'Work item type' },
        { fieldName: 'createdAt', fieldType: 'timestamp', description: 'Creation time' },
        { fieldName: 'updatedAt', fieldType: 'timestamp', description: 'Last update time' },
      ],
      field_tasks: [
        { fieldName: 'id', fieldType: 'text', description: 'Primary key (UUID)' },
        { fieldName: 'organizationId', fieldType: 'number', description: 'Organization ID' },
        { fieldName: 'splynxTaskId', fieldType: 'number', description: 'Splynx task ID' },
        { fieldName: 'title', fieldType: 'text', description: 'Task title' },
        { fieldName: 'description', fieldType: 'text', description: 'Task description' },
        { fieldName: 'splynxTaskType', fieldType: 'text', description: 'Splynx task type' },
        { fieldName: 'taskTypeConfigId', fieldType: 'number', description: 'Task type config ID' },
        { fieldName: 'appTaskType', fieldType: 'text', description: 'App task type' },
        { fieldName: 'workflowTemplateId', fieldType: 'text', description: 'Workflow template ID' },
        { fieldName: 'status', fieldType: 'text', description: 'Task status' },
        { fieldName: 'priority', fieldType: 'text', description: 'Priority' },
        { fieldName: 'assignedToUserId', fieldType: 'number', description: 'Assigned user ID' },
        { fieldName: 'assignedToSplynxId', fieldType: 'number', description: 'Assigned Splynx ID' },
        { fieldName: 'teamId', fieldType: 'number', description: 'Team ID' },
        { fieldName: 'projectId', fieldType: 'number', description: 'Project ID' },
        { fieldName: 'customerName', fieldType: 'text', description: 'Customer name' },
        { fieldName: 'customerId', fieldType: 'number', description: 'Customer ID' },
        { fieldName: 'address', fieldType: 'text', description: 'Address' },
        { fieldName: 'latitude', fieldType: 'number', description: 'Latitude' },
        { fieldName: 'longitude', fieldType: 'number', description: 'Longitude' },
        { fieldName: 'scheduledDate', fieldType: 'timestamp', description: 'Scheduled date' },
        { fieldName: 'scheduledStartTime', fieldType: 'time', description: 'Scheduled start time' },
        { fieldName: 'scheduledEndTime', fieldType: 'time', description: 'Scheduled end time' },
        { fieldName: 'actualStartTime', fieldType: 'timestamp', description: 'Actual start time' },
        { fieldName: 'actualEndTime', fieldType: 'timestamp', description: 'Actual end time' },
        { fieldName: 'completedAt', fieldType: 'timestamp', description: 'Completion time' },
        { fieldName: 'syncStatus', fieldType: 'text', description: 'Sync status' },
        { fieldName: 'lastSyncedAt', fieldType: 'timestamp', description: 'Last sync time' },
        { fieldName: 'splynxLastModified', fieldType: 'timestamp', description: 'Splynx last modified' },
        { fieldName: 'localLastModified', fieldType: 'timestamp', description: 'Local last modified' },
        { fieldName: 'createdAt', fieldType: 'timestamp', description: 'Creation time' },
        { fieldName: 'updatedAt', fieldType: 'timestamp', description: 'Last update time' },
      ],
      rag_status_records: [
        { fieldName: 'id', fieldType: 'number', description: 'Primary key' },
        { fieldName: 'organizationId', fieldType: 'number', description: 'Organization ID' },
        { fieldName: 'airtableRecordId', fieldType: 'text', description: 'Airtable record ID' },
        { fieldName: 'airtableConnectionId', fieldType: 'number', description: 'Airtable connection ID' },
        { fieldName: 'airtableFields', fieldType: 'jsonb', description: 'All Airtable data (use dotted notation: airtableFields.Status, etc.)' },
        { fieldName: 'localStatus', fieldType: 'text', description: 'Local status' },
        { fieldName: 'localNotes', fieldType: 'text', description: 'Local notes' },
        { fieldName: 'lastSyncedAt', fieldType: 'timestamp', description: 'Last sync time' },
        { fieldName: 'createdAt', fieldType: 'timestamp', description: 'Creation time' },
        { fieldName: 'updatedAt', fieldType: 'timestamp', description: 'Last update time' },
      ],
      tariff_records: [
        { fieldName: 'id', fieldType: 'number', description: 'Primary key' },
        { fieldName: 'organizationId', fieldType: 'number', description: 'Organization ID' },
        { fieldName: 'airtableRecordId', fieldType: 'text', description: 'Airtable record ID' },
        { fieldName: 'airtableConnectionId', fieldType: 'number', description: 'Airtable connection ID' },
        { fieldName: 'airtableFields', fieldType: 'jsonb', description: 'All Airtable data (use dotted notation: airtableFields.TariffName, airtableFields.Price, etc.)' },
        { fieldName: 'localStatus', fieldType: 'text', description: 'Local status' },
        { fieldName: 'localNotes', fieldType: 'text', description: 'Local notes' },
        { fieldName: 'lastSyncedAt', fieldType: 'timestamp', description: 'Last sync time' },
        { fieldName: 'createdAt', fieldType: 'timestamp', description: 'Creation time' },
        { fieldName: 'updatedAt', fieldType: 'timestamp', description: 'Last update time' },
      ],
      financial_transactions: [
        { fieldName: 'id', fieldType: 'number', description: 'Primary key' },
        { fieldName: 'organizationId', fieldType: 'number', description: 'Organization ID' },
        { fieldName: 'xeroTransactionId', fieldType: 'text', description: 'Xero transaction ID' },
        { fieldName: 'transactionDate', fieldType: 'timestamp', description: 'Transaction date' },
        { fieldName: 'amount', fieldType: 'number', description: 'Transaction amount (GBP)' },
        { fieldName: 'description', fieldType: 'text', description: 'Transaction description' },
        { fieldName: 'contactName', fieldType: 'text', description: 'Contact/customer name' },
        { fieldName: 'xeroAccountCode', fieldType: 'text', description: 'Xero account code' },
        { fieldName: 'xeroAccountName', fieldType: 'text', description: 'Xero account name' },
        { fieldName: 'xeroAccountType', fieldType: 'text', description: 'Xero account type' },
        { fieldName: 'xeroTransactionType', fieldType: 'text', description: 'Transaction type (e.g., SPEND, RECEIVE)' },
        { fieldName: 'categorizationStatus', fieldType: 'text', description: 'Categorization status (uncategorized, ai_categorized, manually_categorized)' },
        { fieldName: 'profitCenterId', fieldType: 'number', description: 'Assigned profit center ID' },
        { fieldName: 'aiCategorizationConfidence', fieldType: 'number', description: 'AI confidence score (0-100)' },
        { fieldName: 'reconciliationStatus', fieldType: 'text', description: 'Reconciliation status (unmatched, matched, reconciled)' },
        { fieldName: 'splynxCustomerId', fieldType: 'text', description: 'Linked Splynx customer ID' },
        { fieldName: 'splynxInvoiceId', fieldType: 'text', description: 'Linked Splynx invoice ID' },
        { fieldName: 'currency', fieldType: 'text', description: 'Currency code (GBP)' },
        { fieldName: 'notes', fieldType: 'text', description: 'Additional notes' },
        { fieldName: 'createdAt', fieldType: 'timestamp', description: 'Record creation time' },
        { fieldName: 'updatedAt', fieldType: 'timestamp', description: 'Last update time' },
      ],
    };

    const fieldsToSeed = fieldRegistry[tableName] || [];

    console.log(`[Storage] Seeding ${fieldsToSeed.length} fields for table ${tableName}...`);

    // Get existing field names in single query for efficiency
    const existingFields = await db.select()
      .from(dataFields)
      .where(eq(dataFields.tableId, tableId));
    
    const existingFieldNames = new Set(existingFields.map(f => f.fieldName));
    
    // Prepare bulk insert for missing fields only
    const fieldsToInsert = fieldsToSeed
      .filter(fieldConfig => !existingFieldNames.has(fieldConfig.fieldName))
      .map(fieldConfig => ({
        tableId,
        fieldName: fieldConfig.fieldName,
        fieldType: fieldConfig.fieldType,
        nullable: true,
        isPk: fieldConfig.fieldName === 'id',
      }));
    
    if (fieldsToInsert.length > 0) {
      await db.insert(dataFields).values(fieldsToInsert).onConflictDoNothing();
      console.log(`[Storage]   ✓ Inserted ${fieldsToInsert.length} new fields`);
    } else {
      console.log(`[Storage]   ⊘ All fields already exist, skipping inserts`);
    }

    console.log(`[Storage] Field seeding complete for table ${tableName}`);
    return await this.getDataFields(tableId);
  }

  async getDataRelationships(organizationId: number): Promise<DataRelationship[]> {
    return await db.select()
      .from(dataRelationships)
      .where(eq(dataRelationships.organizationId, organizationId));
  }

  async createDataRelationship(relationship: InsertDataRelationship): Promise<DataRelationship> {
    const [created] = await db.insert(dataRelationships).values(relationship).returning();
    return created;
  }

  // ERD layout operations
  async getErdLayouts(organizationId: number, userId: number): Promise<ErdLayout[]> {
    return await db.select()
      .from(erdLayouts)
      .where(and(
        eq(erdLayouts.organizationId, organizationId),
        eq(erdLayouts.userId, userId)
      ))
      .orderBy(desc(erdLayouts.updatedAt));
  }

  async createErdLayout(layout: InsertErdLayout): Promise<ErdLayout> {
    const [created] = await db.insert(erdLayouts).values(layout).returning();
    return created;
  }

  async updateErdLayout(id: number, data: Partial<ErdLayout>): Promise<ErdLayout | undefined> {
    const [updated] = await db.update(erdLayouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(erdLayouts.id, id))
      .returning();
    return updated;
  }

  // Integration operations
  async getIntegrations(organizationId: number): Promise<Integration[]> {
    return db.select().from(integrations)
      .where(eq(integrations.organizationId, organizationId));
  }

  async getIntegration(organizationId: number, platformType: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations)
      .where(and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.platformType, platformType)
      ))
      .limit(1);
    return integration;
  }

  async getIntegrationById(id: number): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);
    return integration;
  }

  async createIntegration(data: InsertIntegration): Promise<Integration> {
    const [created] = await db.insert(integrations).values(data).returning();
    return created;
  }

  async updateIntegration(id: number, data: Partial<Integration>): Promise<Integration | undefined> {
    const [updated] = await db.update(integrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrations.id, id))
      .returning();
    return updated;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    const result = await db.delete(integrations)
      .where(eq(integrations.id, id));
    return true;
  }

  // Database Connection operations
  async getDatabaseConnections(integrationId: number): Promise<DatabaseConnection[]> {
    return db.select().from(databaseConnections)
      .where(eq(databaseConnections.integrationId, integrationId))
      .orderBy(asc(databaseConnections.displayName));
  }

  async getDatabaseConnection(id: number): Promise<DatabaseConnection | undefined> {
    const [connection] = await db.select().from(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .limit(1);
    return connection;
  }

  async createDatabaseConnection(data: InsertDatabaseConnection): Promise<DatabaseConnection> {
    const [created] = await db.insert(databaseConnections).values(data).returning();
    return created;
  }

  async updateDatabaseConnection(id: number, data: Partial<DatabaseConnection>): Promise<DatabaseConnection> {
    const [updated] = await db.update(databaseConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    return updated;
  }

  async deleteDatabaseConnection(id: number): Promise<boolean> {
    const result = await db.delete(databaseConnections)
      .where(eq(databaseConnections.id, id));
    return true;
  }

  async logSqlAudit(data: { organizationId: number; query: string; parameters: string | null; executionTime: number; rowCount: number; success: boolean; error: string | null }): Promise<void> {
    await db.insert(sqlDirectAuditLogs).values(data);
  }

  // Integration Trigger operations
  async getIntegrationTriggers(integrationId: number): Promise<IntegrationTrigger[]> {
    return db.select().from(integrationTriggers)
      .where(eq(integrationTriggers.integrationId, integrationId))
      .orderBy(asc(integrationTriggers.category), asc(integrationTriggers.name));
  }

  async getIntegrationTrigger(id: number): Promise<IntegrationTrigger | undefined> {
    const [trigger] = await db.select().from(integrationTriggers)
      .where(eq(integrationTriggers.id, id))
      .limit(1);
    return trigger;
  }

  async getIntegrationTriggerByKey(integrationId: number, triggerKey: string): Promise<IntegrationTrigger | undefined> {
    const [trigger] = await db.select().from(integrationTriggers)
      .where(and(
        eq(integrationTriggers.integrationId, integrationId),
        eq(integrationTriggers.triggerKey, triggerKey)
      ))
      .limit(1);
    return trigger;
  }

  async getAllTriggersForOrganization(organizationId: number): Promise<IntegrationTrigger[]> {
    // Get all triggers for the organization with a simple query
    return db.select()
      .from(integrationTriggers)
      .innerJoin(integrations, eq(integrationTriggers.integrationId, integrations.id))
      .where(eq(integrations.organizationId, organizationId))
      .orderBy(asc(integrationTriggers.name))
      .then(rows => rows.map(row => row.integration_triggers));
  }

  async createIntegrationTrigger(data: InsertIntegrationTrigger): Promise<IntegrationTrigger> {
    const [created] = await db.insert(integrationTriggers).values(data).returning();
    return created;
  }

  async updateIntegrationTrigger(id: number, data: Partial<IntegrationTrigger>): Promise<IntegrationTrigger | undefined> {
    const [updated] = await db.update(integrationTriggers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrationTriggers.id, id))
      .returning();
    return updated;
  }

  async deleteIntegrationTrigger(id: number): Promise<boolean> {
    const result = await db.delete(integrationTriggers)
      .where(eq(integrationTriggers.id, id));
    return true;
  }

  async upsertIntegrationTriggers(integrationId: number, triggers: InsertIntegrationTrigger[]): Promise<IntegrationTrigger[]> {
    // Delete existing triggers for this integration
    await db.delete(integrationTriggers)
      .where(eq(integrationTriggers.integrationId, integrationId));
    
    // Insert new triggers
    if (triggers.length > 0) {
      const created = await db.insert(integrationTriggers).values(triggers).returning();
      return created;
    }
    return [];
  }

  // Integration Action operations
  async getIntegrationActions(integrationId: number): Promise<IntegrationAction[]> {
    return db.select().from(integrationActions)
      .where(eq(integrationActions.integrationId, integrationId))
      .orderBy(asc(integrationActions.category), asc(integrationActions.name));
  }

  async getIntegrationAction(id: number): Promise<IntegrationAction | undefined> {
    const [action] = await db.select().from(integrationActions)
      .where(eq(integrationActions.id, id))
      .limit(1);
    return action;
  }

  async getAllActionsForOrganization(organizationId: number): Promise<IntegrationAction[]> {
    const result = await db.select({
      id: integrationActions.id,
      integrationId: integrationActions.integrationId,
      name: integrationActions.name,
      description: integrationActions.description,
      category: integrationActions.category,
      actionKey: integrationActions.actionKey,
      configSchema: integrationActions.configSchema,
      configData: integrationActions.configData,
      isActive: integrationActions.isActive,
      usageCount: integrationActions.usageCount,
      lastUsedAt: integrationActions.lastUsedAt,
      lastTestedAt: integrationActions.lastTestedAt,
      testResult: integrationActions.testResult,
      errorCount: integrationActions.errorCount,
      lastError: integrationActions.lastError,
      lastSyncedAt: integrationActions.lastSyncedAt,
      metadata: integrationActions.metadata,
      createdAt: integrationActions.createdAt,
      updatedAt: integrationActions.updatedAt
    })
      .from(integrationActions)
      .innerJoin(integrations, eq(integrationActions.integrationId, integrations.id))
      .where(eq(integrations.organizationId, organizationId))
      .orderBy(asc(integrationActions.category), asc(integrationActions.name));
    return result;
  }

  async createIntegrationAction(data: InsertIntegrationAction): Promise<IntegrationAction> {
    const [created] = await db.insert(integrationActions).values(data).returning();
    return created;
  }

  async updateIntegrationAction(id: number, data: Partial<IntegrationAction>): Promise<IntegrationAction | undefined> {
    const [updated] = await db.update(integrationActions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrationActions.id, id))
      .returning();
    return updated;
  }

  async deleteIntegrationAction(id: number): Promise<boolean> {
    const result = await db.delete(integrationActions)
      .where(eq(integrationActions.id, id));
    return true;
  }

  async upsertIntegrationActions(integrationId: number, actions: InsertIntegrationAction[]): Promise<IntegrationAction[]> {
    // Delete existing actions for this integration
    await db.delete(integrationActions)
      .where(eq(integrationActions.integrationId, integrationId));
    
    // Insert new actions
    if (actions.length > 0) {
      const created = await db.insert(integrationActions).values(actions).returning();
      return created;
    }
    return [];
  }

  // Webhook Event operations
  async getWebhookEvents(organizationId: number, limit = 50, offset = 0): Promise<WebhookEvent[]> {
    return db.select().from(webhookEvents)
      .where(eq(webhookEvents.organizationId, organizationId))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getWebhookEvent(id: number): Promise<WebhookEvent | undefined> {
    const [event] = await db.select().from(webhookEvents)
      .where(eq(webhookEvents.id, id))
      .limit(1);
    return event;
  }

  async createWebhookEvent(data: InsertWebhookEvent): Promise<WebhookEvent> {
    const [created] = await db.insert(webhookEvents).values(data).returning();
    return created;
  }

  async updateWebhookEvent(id: number, data: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    const [updated] = await db.update(webhookEvents)
      .set({ ...data })
      .where(eq(webhookEvents.id, id))
      .returning();
    return updated;
  }

  async updateTriggerWebhookStats(triggerId: number): Promise<IntegrationTrigger | undefined> {
    const [updated] = await db.update(integrationTriggers)
      .set({ 
        lastWebhookAt: new Date(),
        webhookEventCount: sql`webhook_event_count + 1`
      })
      .where(eq(integrationTriggers.id, triggerId))
      .returning();
    return updated;
  }

  // ========================================
  // CUSTOMER MAPPING OPERATIONS
  // ========================================

  // Splynx Locations
  async getSplynxLocations(organizationId: number): Promise<any[]> {
    return db.select().from(splynxLocations)
      .where(and(
        eq(splynxLocations.organizationId, organizationId),
        eq(splynxLocations.isActive, true)
      ))
      .orderBy(asc(splynxLocations.name));
  }

  async getSplynxLocation(organizationId: number, splynxLocationId: string): Promise<any | undefined> {
    const [location] = await db.select().from(splynxLocations)
      .where(and(
        eq(splynxLocations.organizationId, organizationId),
        eq(splynxLocations.splynxLocationId, splynxLocationId)
      ))
      .limit(1);
    return location;
  }

  async upsertSplynxLocation(data: any): Promise<any> {
    const existing = await this.getSplynxLocation(data.organizationId, data.splynxLocationId);
    
    if (existing) {
      const [updated] = await db.update(splynxLocations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(splynxLocations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(splynxLocations).values(data).returning();
      return created;
    }
  }

  // Geocoding Cache
  async getGeocodingCacheByCustomerAndHash(
    organizationId: number, 
    customerId: string, 
    addressHash: string
  ): Promise<any | undefined> {
    const [cached] = await db.select().from(customerGeocodingCache)
      .where(and(
        eq(customerGeocodingCache.organizationId, organizationId),
        eq(customerGeocodingCache.splynxCustomerId, customerId),
        eq(customerGeocodingCache.addressHash, addressHash)
      ))
      .limit(1);
    return cached;
  }

  async upsertGeocodingCache(data: any): Promise<any> {
    // Use PostgreSQL's ON CONFLICT to handle race conditions during parallel processing
    const [result] = await db.insert(customerGeocodingCache)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [
          customerGeocodingCache.organizationId,
          customerGeocodingCache.splynxCustomerId,
          customerGeocodingCache.addressHash
        ],
        set: { ...data, updatedAt: new Date() }
      })
      .returning();
    return result;
  }

  async getGeocodingCacheByCustomer(organizationId: number, customerId: string): Promise<any[]> {
    return db.select().from(customerGeocodingCache)
      .where(and(
        eq(customerGeocodingCache.organizationId, organizationId),
        eq(customerGeocodingCache.splynxCustomerId, customerId)
      ))
      .orderBy(desc(customerGeocodingCache.geocodedAt));
  }

  // Agent Workflow operations
  async getAgentWorkflows(organizationId: number): Promise<AgentWorkflow[]> {
    return db.select().from(agentWorkflows)
      .where(eq(agentWorkflows.organizationId, organizationId));
  }

  async getAgentWorkflow(id: number): Promise<AgentWorkflow | undefined> {
    const [workflow] = await db.select().from(agentWorkflows)
      .where(eq(agentWorkflows.id, id))
      .limit(1);
    return workflow;
  }

  async createAgentWorkflow(data: InsertAgentWorkflow): Promise<AgentWorkflow> {
    const [created] = await db.insert(agentWorkflows).values(data).returning();
    return created;
  }

  async updateAgentWorkflow(id: number, data: Partial<AgentWorkflow>): Promise<AgentWorkflow | undefined> {
    const [updated] = await db.update(agentWorkflows)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentWorkflows.id, id))
      .returning();
    return updated;
  }

  async deleteAgentWorkflow(id: number): Promise<boolean> {
    const result = await db.delete(agentWorkflows)
      .where(eq(agentWorkflows.id, id));
    return true;
  }

  // Agent Workflow Run operations
  async getAllWorkflowRuns(organizationId: number): Promise<any[]> {
    const runs = await db
      .select({
        id: agentWorkflowRuns.id,
        workflowId: agentWorkflowRuns.workflowId,
        workflowName: agentWorkflows.name,
        status: agentWorkflowRuns.status,
        triggerSource: agentWorkflowRuns.triggerSource,
        startedAt: agentWorkflowRuns.startedAt,
        completedAt: agentWorkflowRuns.completedAt,
        executionDuration: agentWorkflowRuns.executionDuration,
        stepsCompleted: agentWorkflowRuns.stepsCompleted,
        totalSteps: agentWorkflowRuns.totalSteps,
        executionLog: agentWorkflowRuns.executionLog,
        errorMessage: agentWorkflowRuns.errorMessage,
        resultData: agentWorkflowRuns.resultData,
      })
      .from(agentWorkflowRuns)
      .innerJoin(agentWorkflows, eq(agentWorkflowRuns.workflowId, agentWorkflows.id))
      .where(eq(agentWorkflows.organizationId, organizationId))
      .orderBy(desc(agentWorkflowRuns.startedAt));
    
    return runs;
  }

  async getWorkflowRuns(workflowId: number): Promise<AgentWorkflowRun[]> {
    return db.select().from(agentWorkflowRuns)
      .where(eq(agentWorkflowRuns.workflowId, workflowId))
      .orderBy(desc(agentWorkflowRuns.startedAt));
  }

  async getWorkflowRun(id: number): Promise<AgentWorkflowRun | undefined> {
    const [run] = await db.select().from(agentWorkflowRuns)
      .where(eq(agentWorkflowRuns.id, id))
      .limit(1);
    return run;
  }

  async createWorkflowRun(data: InsertAgentWorkflowRun): Promise<AgentWorkflowRun> {
    const [created] = await db.insert(agentWorkflowRuns).values(data).returning();
    return created;
  }

  async updateWorkflowRun(id: number, data: Partial<AgentWorkflowRun>): Promise<AgentWorkflowRun | undefined> {
    const [updated] = await db.update(agentWorkflowRuns)
      .set({ ...data })
      .where(eq(agentWorkflowRuns.id, id))
      .returning();
    return updated;
  }

  // Agent Workflow Schedule operations
  async getWorkflowSchedules(organizationId: string): Promise<any[]> {
    return db.select().from(agentWorkflowSchedules)
      .where(eq(agentWorkflowSchedules.organizationId, organizationId));
  }

  async getWorkflowSchedule(id: number): Promise<any | undefined> {
    const [schedule] = await db.select().from(agentWorkflowSchedules)
      .where(eq(agentWorkflowSchedules.id, id))
      .limit(1);
    return schedule;
  }

  async createWorkflowSchedule(data: any): Promise<any> {
    const [created] = await db.insert(agentWorkflowSchedules).values(data).returning();
    return created;
  }

  async updateWorkflowSchedule(id: number, data: Partial<any>): Promise<any | undefined> {
    const [updated] = await db.update(agentWorkflowSchedules)
      .set({ ...data })
      .where(eq(agentWorkflowSchedules.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflowSchedule(id: number): Promise<boolean> {
    await db.delete(agentWorkflowSchedules).where(eq(agentWorkflowSchedules.id, id));
    return true;
  }

  // Menu operations
  async getMenuSections(organizationId: number): Promise<MenuSection[]> {
    return await db.select().from(menuSections)
      .where(eq(menuSections.organizationId, organizationId))
      .orderBy(menuSections.orderIndex);
  }

  async createMenuSection(section: InsertMenuSection): Promise<MenuSection> {
    const [created] = await db.insert(menuSections).values(section).returning();
    return created;
  }

  async updateMenuSection(id: number, data: Partial<MenuSection>): Promise<MenuSection | undefined> {
    const [updated] = await db.update(menuSections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuSections.id, id))
      .returning();
    return updated;
  }

  async getMenuItems(organizationId: number, sectionId?: number): Promise<MenuItem[]> {
    const conditions = [eq(menuItems.organizationId, organizationId)];
    if (sectionId) {
      conditions.push(eq(menuItems.sectionId, sectionId));
    }
    return await db.select().from(menuItems)
      .where(and(...conditions))
      .orderBy(menuItems.orderIndex);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: number, data: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  // [REMOVED: Role operations - Handled directly in users table]

  // Layout template operations
  async getLayoutTemplates(organizationId?: number, category?: string, isGlobal?: boolean): Promise<LayoutTemplate[]> {
    let query = db.select().from(layoutTemplates).$dynamic();
    
    const conditions = [];
    if (organizationId) {
      conditions.push(eq(layoutTemplates.organizationId, organizationId));
    }
    if (category) {
      conditions.push(eq(layoutTemplates.category, category));
    }
    if (isGlobal !== undefined) {
      conditions.push(eq(layoutTemplates.isGlobal, isGlobal));
    }
    
    conditions.push(eq(layoutTemplates.isActive, true));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(layoutTemplates.updatedAt));
  }

  async getLayoutTemplate(id: number): Promise<LayoutTemplate | undefined> {
    const [template] = await db.select()
      .from(layoutTemplates)
      .where(eq(layoutTemplates.id, id))
      .limit(1);
    return template;
  }

  async createLayoutTemplate(template: InsertLayoutTemplate): Promise<LayoutTemplate> {
    const [created] = await db.insert(layoutTemplates).values(template).returning();
    return created;
  }

  async updateLayoutTemplate(id: number, data: Partial<LayoutTemplate>): Promise<LayoutTemplate | undefined> {
    const [updated] = await db.update(layoutTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(layoutTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteLayoutTemplate(id: number): Promise<boolean> {
    // Check if any pages are using this template
    const pagesUsingTemplate = await db.select()
      .from(pages)
      .where(eq(pages.layoutTemplateId, id))
      .limit(1);
    
    if (pagesUsingTemplate.length > 0) {
      throw new Error('Cannot delete layout template: it is being used by one or more pages');
    }
    
    const result = await db.delete(layoutTemplates).where(eq(layoutTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async applyLayoutToPages(templateId: number, pageIds: string[]): Promise<number> {
    const result = await db.update(pages)
      .set({ 
        layoutTemplateId: templateId,
        updatedAt: new Date()
      })
      .where(inArray(pages.id, pageIds));
    
    // Update usage count
    await db.update(layoutTemplates)
      .set({ 
        usageCount: sql`usage_count + ${pageIds.length}`,
        updatedAt: new Date()
      })
      .where(eq(layoutTemplates.id, templateId));
    
    return result.rowCount || 0;
  }

  // Strategy Settings operations
  async getStrategySettings(organizationId: number): Promise<StrategySettings | null> {
    const [settings] = await db.select()
      .from(strategySettings)
      .where(eq(strategySettings.organizationId, organizationId))
      .limit(1);
      
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(strategySettings)
        .values({
          organizationId,
          cronEnabled: true,
          cronSchedule: "0 2 * * *",
          lookaheadDays: 7,
          autoGenerateWorkItems: true,
          generateOnTaskCreation: true,
          notifyOnGeneration: false,
        })
        .returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateStrategySettings(
    organizationId: number, 
    updates: Partial<StrategySettings>
  ): Promise<StrategySettings> {
    // Convert string dates to Date objects if present
    const processedUpdates = { ...updates };
    if (typeof processedUpdates.lastCronExecution === 'string') {
      processedUpdates.lastCronExecution = new Date(processedUpdates.lastCronExecution);
    }
    
    const [updated] = await db.update(strategySettings)
      .set({
        ...processedUpdates,
        updatedAt: new Date(),
      })
      .where(eq(strategySettings.organizationId, organizationId))
      .returning();
      
    // Log the change only if we have a valid user
    if (processedUpdates.updatedBy && processedUpdates.updatedBy > 0) {
      await this.logActivity({
        organizationId,
        userId: processedUpdates.updatedBy,
        actionType: 'status_change',
        entityType: 'strategy_settings',
        entityId: updated.id,
        description: 'Updated strategy automation settings',
        metadata: processedUpdates,
      });
    }
    
    return updated;
  }

  // ========================================
  // FIELD ENGINEERING STORAGE OPERATIONS
  // ========================================

  // Splynx Administrators operations
  async getSplynxAdministrators(organizationId: number): Promise<SplynxAdministrator[]> {
    return await db.select()
      .from(splynxAdministrators)
      .where(eq(splynxAdministrators.organizationId, organizationId))
      .orderBy(splynxAdministrators.fullName);
  }

  async getSplynxAdministrator(id: number): Promise<SplynxAdministrator | undefined> {
    const [admin] = await db.select()
      .from(splynxAdministrators)
      .where(eq(splynxAdministrators.id, id))
      .limit(1);
    return admin;
  }

  async getSplynxAdministratorBySplynxId(organizationId: number, splynxAdminId: number): Promise<SplynxAdministrator | undefined> {
    const [admin] = await db.select()
      .from(splynxAdministrators)
      .where(
        and(
          eq(splynxAdministrators.organizationId, organizationId),
          eq(splynxAdministrators.splynxAdminId, splynxAdminId)
        )
      )
      .limit(1);
    return admin;
  }

  async createSplynxAdministrator(admin: InsertSplynxAdministrator): Promise<SplynxAdministrator> {
    const [created] = await db.insert(splynxAdministrators).values(admin).returning();
    return created;
  }

  async updateSplynxAdministrator(id: number, data: Partial<SplynxAdministrator>): Promise<SplynxAdministrator | undefined> {
    const [updated] = await db.update(splynxAdministrators)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(splynxAdministrators.id, id))
      .returning();
    return updated;
  }

  async upsertSplynxAdministrators(organizationId: number, admins: InsertSplynxAdministrator[]): Promise<SplynxAdministrator[]> {
    const results: SplynxAdministrator[] = [];
    
    for (const admin of admins) {
      const existing = await this.getSplynxAdministratorBySplynxId(organizationId, admin.splynxAdminId);
      
      if (existing) {
        const updated = await this.updateSplynxAdministrator(existing.id, {
          ...admin,
          lastFetchedAt: new Date()
        });
        if (updated) results.push(updated);
      } else {
        const created = await this.createSplynxAdministrator({
          ...admin,
          organizationId
        });
        results.push(created);
      }
    }
    
    return results;
  }

  // Task Type Configurations operations
  async getTaskTypeConfigurations(organizationId: number): Promise<TaskTypeConfiguration[]> {
    return await db.select()
      .from(taskTypeConfigurations)
      .where(eq(taskTypeConfigurations.organizationId, organizationId))
      .orderBy(taskTypeConfigurations.sortOrder, taskTypeConfigurations.displayName);
  }

  async getTaskTypeConfiguration(id: number): Promise<TaskTypeConfiguration | undefined> {
    const [config] = await db.select()
      .from(taskTypeConfigurations)
      .where(eq(taskTypeConfigurations.id, id))
      .limit(1);
    return config;
  }

  async getTaskTypeConfigurationBySplynxType(organizationId: number, splynxTypeId: string): Promise<TaskTypeConfiguration | undefined> {
    const [config] = await db.select()
      .from(taskTypeConfigurations)
      .where(
        and(
          eq(taskTypeConfigurations.organizationId, organizationId),
          eq(taskTypeConfigurations.splynxTypeId, splynxTypeId)
        )
      )
      .limit(1);
    return config;
  }

  async createTaskTypeConfiguration(config: InsertTaskTypeConfiguration): Promise<TaskTypeConfiguration> {
    const [created] = await db.insert(taskTypeConfigurations).values(config).returning();
    
    await this.logActivity({
      organizationId: created.organizationId,
      userId: 1,
      actionType: 'creation',
      entityType: 'task_type_configuration',
      entityId: created.id,
      description: `Task type configuration "${created.displayName}" created`,
      metadata: { splynxTypeId: created.splynxTypeId, appTaskType: created.appTaskType }
    });
    
    return created;
  }

  async updateTaskTypeConfiguration(id: number, data: Partial<TaskTypeConfiguration>): Promise<TaskTypeConfiguration | undefined> {
    const [updated] = await db.update(taskTypeConfigurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(taskTypeConfigurations.id, id))
      .returning();
    
    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId,
        userId: 1,
        actionType: 'status_change',
        entityType: 'task_type_configuration',
        entityId: updated.id,
        description: `Task type configuration "${updated.displayName}" updated`,
        metadata: data
      });
    }
    
    return updated;
  }

  async deleteTaskTypeConfiguration(id: number): Promise<boolean> {
    const result = await db.delete(taskTypeConfigurations).where(eq(taskTypeConfigurations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Workflow Templates operations
  async getWorkflowTemplates(organizationId: number): Promise<WorkflowTemplate[]> {
    return await db.select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.organizationId, organizationId),
          eq(workflowTemplates.isActive, true)
        )
      )
      .orderBy(workflowTemplates.name);
  }

  async getWorkflowTemplate(organizationId: number, id: string): Promise<WorkflowTemplate | undefined> {
    const [template] = await db.select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.organizationId, organizationId),
          eq(workflowTemplates.id, id)
        )
      )
      .limit(1);
    return template;
  }

  async createWorkflowTemplate(template: InsertWorkflowTemplate): Promise<WorkflowTemplate> {
    const [created] = await db.insert(workflowTemplates).values(template).returning();
    
    await this.logActivity({
      organizationId: created.organizationId,
      userId: 1,
      actionType: 'creation',
      entityType: 'workflow_template',
      entityId: 1,
      description: `Workflow template "${created.name}" created`,
      metadata: { workflowId: created.id, category: created.category, version: created.version }
    });
    
    return created;
  }

  async updateWorkflowTemplate(organizationId: number, id: string, data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | undefined> {
    const [updated] = await db.update(workflowTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(workflowTemplates.organizationId, organizationId),
          eq(workflowTemplates.id, id)
        )
      )
      .returning();
    
    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId,
        userId: 1,
        actionType: 'status_change',
        entityType: 'workflow_template',
        entityId: 1,
        description: `Workflow template "${updated.name}" updated`,
        metadata: { workflowId: updated.id, ...data }
      });
    }
    
    return updated;
  }

  async deleteWorkflowTemplate(organizationId: number, id: string): Promise<boolean> {
    const result = await db.delete(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.organizationId, organizationId),
          eq(workflowTemplates.id, id)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Email Templates operations
  async getEmailTemplates(organizationId: number): Promise<EmailTemplate[]> {
    return await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.organizationId, organizationId),
          eq(emailTemplates.status, 'active')
        )
      )
      .orderBy(emailTemplates.title);
  }

  async getEmailTemplate(organizationId: number, id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.organizationId, organizationId),
          eq(emailTemplates.id, id)
        )
      )
      .limit(1);
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [created] = await db.insert(emailTemplates).values(template).returning();
    
    await this.logActivity({
      organizationId: created.organizationId,
      userId: 1,
      actionType: 'creation',
      entityType: 'email_template',
      entityId: created.id,
      description: `Email template "${created.title}" created`,
      metadata: { templateId: created.id }
    });
    
    return created;
  }

  async updateEmailTemplate(organizationId: number, id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(emailTemplates.organizationId, organizationId),
          eq(emailTemplates.id, id)
        )
      )
      .returning();
    
    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId,
        userId: 1,
        actionType: 'status_change',
        entityType: 'email_template',
        entityId: updated.id,
        description: `Email template "${updated.title}" updated`,
        metadata: { templateId: updated.id, ...data }
      });
    }
    
    return updated;
  }

  async deleteEmailTemplate(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(emailTemplates)
      .where(
        and(
          eq(emailTemplates.organizationId, organizationId),
          eq(emailTemplates.id, id)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Workflow Assignment & Execution operations
  async assignWorkflowToWorkItem(organizationId: number, workItemId: number, templateId: string): Promise<{ workItem: any, execution: any }> {
    // Update work item with workflow template ID
    const [updatedWorkItem] = await db.update(workItems)
      .set({ 
        workflowTemplateId: templateId,
        workflowSource: 'manual',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, organizationId)
        )
      )
      .returning();

    // Create workflow execution record
    const [execution] = await db.insert(workItemWorkflowExecutions)
      .values({
        organizationId,
        workItemId,
        workflowTemplateId: templateId,
        status: 'not_started',
        executionData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return { workItem: updatedWorkItem, execution };
  }

  async getWorkItemWorkflow(organizationId: number, workItemId: number): Promise<{ template: WorkflowTemplate | null, execution: any | null, progress: number }> {
    // Get work item with workflow
    const [workItem] = await db.select()
      .from(workItems)
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!workItem || !workItem.workflowTemplateId) {
      return { template: null, execution: null, progress: 0 };
    }

    // Get template
    const template = await this.getWorkflowTemplate(organizationId, workItem.workflowTemplateId);

    // Get execution
    const [execution] = await db.select()
      .from(workItemWorkflowExecutions)
      .where(
        and(
          eq(workItemWorkflowExecutions.workItemId, workItemId),
          eq(workItemWorkflowExecutions.organizationId, organizationId)
        )
      )
      .orderBy(desc(workItemWorkflowExecutions.createdAt))
      .limit(1);

    // Calculate progress
    let progress = 0;
    if (template && execution && execution.executionData) {
      const totalSteps = template.steps.length;
      const completedSteps = Object.values(execution.executionData as Record<string, any>)
        .filter((step: any) => step.completed === true).length;
      progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    }

    return { template: template || null, execution: execution || null, progress };
  }

  async updateWorkflowStepCompletion(organizationId: number, executionId: number, stepId: string, data: any): Promise<any> {
    // Get current execution
    const [execution] = await db.select()
      .from(workItemWorkflowExecutions)
      .where(
        and(
          eq(workItemWorkflowExecutions.id, executionId),
          eq(workItemWorkflowExecutions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    // Update execution data with step completion
    const updatedExecutionData = {
      ...(execution.executionData as Record<string, any> || {}),
      [stepId]: {
        ...data,
        completedAt: data.completed ? new Date().toISOString() : null
      }
    };

    // Determine status
    const template = await this.getWorkflowTemplate(organizationId, execution.workflowTemplateId || '');
    let status = execution.status;
    if (template) {
      const completedSteps = Object.values(updatedExecutionData).filter((s: any) => s.completed === true).length;
      const totalSteps = template.steps.length;
      
      if (completedSteps === 0) {
        status = 'not_started';
      } else if (completedSteps === totalSteps) {
        status = 'completed';
      } else {
        status = 'in_progress';
      }
    }

    // Update execution
    const [updated] = await db.update(workItemWorkflowExecutions)
      .set({
        executionData: updatedExecutionData,
        status,
        currentStepId: stepId,
        startedAt: execution.startedAt || new Date(),
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(workItemWorkflowExecutions.id, executionId))
      .returning();

    // Update work item status when workflow is completed
    if (status === 'completed' && execution.workItemId) {
      await db.update(workItems)
        .set({
          status: 'Completed',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(workItems.id, execution.workItemId),
            eq(workItems.organizationId, organizationId)
          )
        );
    }

    return updated;
  }

  // Field Tasks operations
  async getFieldTasks(organizationId: number, filters?: { userId?: number; status?: string; appTaskType?: string }): Promise<FieldTask[]> {
    const conditions = [eq(fieldTasks.organizationId, organizationId)];
    
    if (filters?.userId) {
      conditions.push(eq(fieldTasks.assignedToUserId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(sql`${fieldTasks.status} = ${filters.status}`);
    }
    if (filters?.appTaskType) {
      conditions.push(sql`${fieldTasks.appTaskType} = ${filters.appTaskType}`);
    }
    
    return await db.select()
      .from(fieldTasks)
      .where(and(...conditions))
      .orderBy(desc(fieldTasks.scheduledDate));
  }

  async getFieldTask(id: string): Promise<FieldTask | undefined> {
    const [task] = await db.select()
      .from(fieldTasks)
      .where(eq(fieldTasks.id, id))
      .limit(1);
    return task;
  }

  async getFieldTaskBySplynxId(organizationId: number, splynxTaskId: number): Promise<FieldTask | undefined> {
    const [task] = await db.select()
      .from(fieldTasks)
      .where(
        and(
          eq(fieldTasks.organizationId, organizationId),
          eq(fieldTasks.splynxTaskId, splynxTaskId)
        )
      )
      .limit(1);
    return task;
  }

  async createFieldTask(task: InsertFieldTask): Promise<FieldTask> {
    const [created] = await db.insert(fieldTasks).values(task).returning();
    
    if (created.assignedToUserId) {
      await this.logActivity({
        organizationId: created.organizationId,
        userId: created.assignedToUserId,
        actionType: 'creation',
        entityType: 'field_task',
        entityId: 1,
        description: `Task "${created.title}" created`,
        metadata: { taskId: created.id, status: created.status, priority: created.priority }
      });
    }
    
    return created;
  }

  async updateFieldTask(id: string, data: Partial<FieldTask>): Promise<FieldTask | undefined> {
    const [updated] = await db.update(fieldTasks)
      .set({ ...data, localLastModified: new Date(), updatedAt: new Date() })
      .where(eq(fieldTasks.id, id))
      .returning();
    
    if (updated && updated.assignedToUserId) {
      await this.logActivity({
        organizationId: updated.organizationId,
        userId: updated.assignedToUserId,
        actionType: 'status_change',
        entityType: 'field_task',
        entityId: 1,
        description: `Task "${updated.title}" updated`,
        metadata: { taskId: updated.id, ...data }
      });
    }
    
    return updated;
  }

  async deleteFieldTask(id: string): Promise<boolean> {
    const result = await db.delete(fieldTasks).where(eq(fieldTasks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Task Executions operations
  async getFieldTaskExecutions(taskId: string): Promise<FieldTaskExecution[]> {
    return await db.select()
      .from(fieldTaskExecutions)
      .where(eq(fieldTaskExecutions.taskId, taskId))
      .orderBy(desc(fieldTaskExecutions.createdAt));
  }

  async getFieldTaskExecution(id: string): Promise<FieldTaskExecution | undefined> {
    const [execution] = await db.select()
      .from(fieldTaskExecutions)
      .where(eq(fieldTaskExecutions.id, id))
      .limit(1);
    return execution;
  }

  async createFieldTaskExecution(execution: InsertFieldTaskExecution): Promise<FieldTaskExecution> {
    const [created] = await db.insert(fieldTaskExecutions).values(execution).returning();
    return created;
  }

  async updateFieldTaskExecution(id: string, data: Partial<FieldTaskExecution>): Promise<FieldTaskExecution | undefined> {
    const [updated] = await db.update(fieldTaskExecutions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fieldTaskExecutions.id, id))
      .returning();
    return updated;
  }

  async deleteFieldTaskExecution(id: string): Promise<boolean> {
    const result = await db.delete(fieldTaskExecutions).where(eq(fieldTaskExecutions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Task Checklists operations
  async getTaskChecklists(taskId: string): Promise<TaskChecklist[]> {
    return await db.select()
      .from(taskChecklists)
      .where(eq(taskChecklists.taskId, taskId));
  }

  async getTaskChecklist(id: string): Promise<TaskChecklist | undefined> {
    const [checklist] = await db.select()
      .from(taskChecklists)
      .where(eq(taskChecklists.id, id))
      .limit(1);
    return checklist;
  }

  async createTaskChecklist(checklist: InsertTaskChecklist): Promise<TaskChecklist> {
    const [created] = await db.insert(taskChecklists).values(checklist).returning();
    return created;
  }

  async updateTaskChecklist(id: string, data: Partial<TaskChecklist>): Promise<TaskChecklist | undefined> {
    const [updated] = await db.update(taskChecklists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(taskChecklists.id, id))
      .returning();
    return updated;
  }

  // Visit Workflows operations
  async getVisitWorkflows(taskId: string): Promise<VisitWorkflow[]> {
    return await db.select()
      .from(visitWorkflows)
      .where(eq(visitWorkflows.taskId, taskId));
  }

  async getVisitWorkflow(id: string): Promise<VisitWorkflow | undefined> {
    const [workflow] = await db.select()
      .from(visitWorkflows)
      .where(eq(visitWorkflows.id, id))
      .limit(1);
    return workflow;
  }

  async createVisitWorkflow(workflow: InsertVisitWorkflow): Promise<VisitWorkflow> {
    const [created] = await db.insert(visitWorkflows).values(workflow).returning();
    return created;
  }

  async updateVisitWorkflow(id: string, data: Partial<VisitWorkflow>): Promise<VisitWorkflow | undefined> {
    const [updated] = await db.update(visitWorkflows)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(visitWorkflows.id, id))
      .returning();
    return updated;
  }

  // Vehicle Checks operations
  async getVehicleChecks(organizationId: number, userId?: number): Promise<VehicleCheck[]> {
    const conditions = [eq(vehicleChecks.organizationId, organizationId)];
    if (userId) {
      conditions.push(eq(vehicleChecks.userId, userId));
    }
    
    return await db.select()
      .from(vehicleChecks)
      .where(and(...conditions))
      .orderBy(desc(vehicleChecks.checkDate));
  }

  async getVehicleCheck(id: string): Promise<VehicleCheck | undefined> {
    const [check] = await db.select()
      .from(vehicleChecks)
      .where(eq(vehicleChecks.id, id))
      .limit(1);
    return check;
  }

  async createVehicleCheck(check: InsertVehicleCheck): Promise<VehicleCheck> {
    const [created] = await db.insert(vehicleChecks).values(check).returning();
    return created;
  }

  async updateVehicleCheck(id: string, data: Partial<VehicleCheck>): Promise<VehicleCheck | undefined> {
    const [updated] = await db.update(vehicleChecks)
      .set(data)
      .where(eq(vehicleChecks.id, id))
      .returning();
    return updated;
  }

  // Sync Queue operations
  async getSyncQueue(organizationId: number, userId?: number): Promise<SyncQueueItem[]> {
    const conditions = [eq(syncQueue.organizationId, organizationId)];
    if (userId) {
      conditions.push(eq(syncQueue.userId, userId));
    }
    
    return await db.select()
      .from(syncQueue)
      .where(and(...conditions))
      .orderBy(syncQueue.priority, syncQueue.createdAt);
  }

  async getPendingSyncItems(organizationId: number, userId?: number): Promise<SyncQueueItem[]> {
    const conditions = [
      eq(syncQueue.organizationId, organizationId),
      sql`${syncQueue.status} = 'pending'`
    ];
    if (userId) {
      conditions.push(eq(syncQueue.userId, userId));
    }
    
    return await db.select()
      .from(syncQueue)
      .where(and(...conditions))
      .orderBy(syncQueue.priority, syncQueue.nextRetryAt);
  }

  async getSyncQueueItem(id: number): Promise<SyncQueueItem | undefined> {
    const [item] = await db.select()
      .from(syncQueue)
      .where(eq(syncQueue.id, id))
      .limit(1);
    return item;
  }

  async createSyncQueueItem(item: InsertSyncQueueItem): Promise<SyncQueueItem> {
    const [created] = await db.insert(syncQueue).values(item).returning();
    return created;
  }

  async updateSyncQueueItem(id: number, data: Partial<SyncQueueItem>): Promise<SyncQueueItem | undefined> {
    const [updated] = await db.update(syncQueue)
      .set(data)
      .where(eq(syncQueue.id, id))
      .returning();
    return updated;
  }

  async deleteSyncQueueItem(id: number): Promise<boolean> {
    const result = await db.delete(syncQueue).where(eq(syncQueue.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Airtable Integration Methods
  async getAirtableConnections(organizationId: number): Promise<AirtableConnection[]> {
    return await db.select()
      .from(airtableConnections)
      .where(eq(airtableConnections.organizationId, organizationId))
      .orderBy(desc(airtableConnections.createdAt));
  }

  async getAirtableConnection(id: number, organizationId: number): Promise<AirtableConnection | undefined> {
    const [connection] = await db.select()
      .from(airtableConnections)
      .where(and(
        eq(airtableConnections.id, id),
        eq(airtableConnections.organizationId, organizationId)
      ))
      .limit(1);
    return connection;
  }

  async getAirtableConnectionByTableName(organizationId: number, tableName: string): Promise<AirtableConnection | undefined> {
    const [connection] = await db.select()
      .from(airtableConnections)
      .where(and(
        eq(airtableConnections.organizationId, organizationId),
        eq(airtableConnections.tableName, tableName)
      ))
      .limit(1);
    return connection;
  }

  async createAirtableConnection(data: InsertAirtableConnection): Promise<AirtableConnection> {
    const [created] = await db.insert(airtableConnections).values(data).returning();
    return created;
  }

  async updateAirtableConnection(id: number, organizationId: number, data: Partial<AirtableConnection>): Promise<AirtableConnection | undefined> {
    const [updated] = await db.update(airtableConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(airtableConnections.id, id),
        eq(airtableConnections.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteAirtableConnection(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(airtableConnections)
      .where(and(
        eq(airtableConnections.id, id),
        eq(airtableConnections.organizationId, organizationId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAirtableWorkflowTemplates(connectionId: number, organizationId: number): Promise<AirtableWorkflowTemplate[]> {
    return await db.select()
      .from(airtableWorkflowTemplates)
      .where(and(
        eq(airtableWorkflowTemplates.connectionId, connectionId),
        eq(airtableWorkflowTemplates.organizationId, organizationId)
      ))
      .orderBy(desc(airtableWorkflowTemplates.createdAt));
  }

  async getAirtableWorkflowTemplate(id: number, organizationId: number): Promise<AirtableWorkflowTemplate | undefined> {
    const [template] = await db.select()
      .from(airtableWorkflowTemplates)
      .where(and(
        eq(airtableWorkflowTemplates.id, id),
        eq(airtableWorkflowTemplates.organizationId, organizationId)
      ))
      .limit(1);
    return template;
  }

  async createAirtableWorkflowTemplate(data: InsertAirtableWorkflowTemplate): Promise<AirtableWorkflowTemplate> {
    const [created] = await db.insert(airtableWorkflowTemplates).values(data).returning();
    return created;
  }

  async createAirtableRecordLink(data: InsertAirtableRecordLink): Promise<AirtableRecordLink> {
    // Try to insert, but if a link already exists for this connection+record, return the existing one
    const [created] = await db.insert(airtableRecordLinks)
      .values(data)
      .onConflictDoNothing({ target: [airtableRecordLinks.connectionId, airtableRecordLinks.airtableRecordId] })
      .returning();
    
    // If insert was skipped due to conflict, fetch the existing record
    if (!created) {
      const [existing] = await db.select()
        .from(airtableRecordLinks)
        .where(and(
          eq(airtableRecordLinks.connectionId, data.connectionId),
          eq(airtableRecordLinks.airtableRecordId, data.airtableRecordId)
        ))
        .limit(1);
      return existing;
    }
    
    return created;
  }

  // Address Records Management Methods
  async getAddressRecords(organizationId: number, connectionId?: number): Promise<AddressRecord[]> {
    const conditions = [eq(addressRecords.organizationId, organizationId)];
    if (connectionId) {
      conditions.push(eq(addressRecords.airtableConnectionId, connectionId));
    }
    
    return await db.select()
      .from(addressRecords)
      .where(and(...conditions))
      .orderBy(desc(addressRecords.createdAt));
  }

  async getAddressRecord(id: number, organizationId: number): Promise<AddressRecord | undefined> {
    const [address] = await db.select()
      .from(addressRecords)
      .where(and(
        eq(addressRecords.id, id),
        eq(addressRecords.organizationId, organizationId)
      ))
      .limit(1);
    return address;
  }

  async updateAddressRecord(id: number, organizationId: number, data: Partial<AddressRecord>): Promise<AddressRecord | undefined> {
    const [updated] = await db.update(addressRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(addressRecords.id, id),
        eq(addressRecords.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteAddressRecord(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(addressRecords)
      .where(and(
        eq(addressRecords.id, id),
        eq(addressRecords.organizationId, organizationId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertAddressFromAirtable(
    organizationId: number,
    connectionId: number,
    airtableRecordId: string,
    fields: any,
    existingLocalFields?: Partial<AddressRecord>
  ): Promise<AddressRecord> {
    // Check if record exists
    const [existing] = await db.select()
      .from(addressRecords)
      .where(and(
        eq(addressRecords.organizationId, organizationId),
        eq(addressRecords.airtableConnectionId, connectionId),
        eq(addressRecords.airtableRecordId, airtableRecordId)
      ))
      .limit(1);

    if (existing) {
      // Update: Merge new Airtable fields with existing (never remove old fields)
      const mergedFields = {
        ...existing.airtableFields,
        ...fields,
      };

      const [updated] = await db.update(addressRecords)
        .set({
          airtableFields: mergedFields,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
          // Preserve local-only fields
          localStatus: existingLocalFields?.localStatus ?? existing.localStatus,
          localNotes: existingLocalFields?.localNotes ?? existing.localNotes,
          workItemCount: existingLocalFields?.workItemCount ?? existing.workItemCount,
          lastWorkItemDate: existingLocalFields?.lastWorkItemDate ?? existing.lastWorkItemDate,
        })
        .where(eq(addressRecords.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db.insert(addressRecords)
        .values({
          organizationId,
          airtableConnectionId: connectionId,
          airtableRecordId,
          airtableFields: fields,
          lastSyncedAt: new Date(),
          ...existingLocalFields,
        })
        .returning();
      return created;
    }
  }

  // Address Sync Logs
  async createAddressSyncLog(data: InsertAddressSyncLog): Promise<AddressSyncLog> {
    const [log] = await db.insert(addressSyncLogs)
      .values(data)
      .returning();
    return log;
  }

  async updateAddressSyncLog(id: number, data: Partial<AddressSyncLog>): Promise<AddressSyncLog | undefined> {
    const [updated] = await db.update(addressSyncLogs)
      .set(data)
      .where(eq(addressSyncLogs.id, id))
      .returning();
    return updated;
  }

  async getAddressSyncLogs(organizationId: number, connectionId?: number, limit: number = 50): Promise<AddressSyncLog[]> {
    const conditions = [eq(addressSyncLogs.organizationId, organizationId)];
    if (connectionId) {
      conditions.push(eq(addressSyncLogs.airtableConnectionId, connectionId));
    }
    
    return await db.select()
      .from(addressSyncLogs)
      .where(and(...conditions))
      .orderBy(desc(addressSyncLogs.startedAt))
      .limit(limit);
  }

  async getAddressSyncLog(id: number, organizationId: number): Promise<AddressSyncLog | undefined> {
    const [log] = await db.select()
      .from(addressSyncLogs)
      .where(and(
        eq(addressSyncLogs.id, id),
        eq(addressSyncLogs.organizationId, organizationId)
      ))
      .limit(1);
    return log;
  }

  // RAG Status Records Management Methods
  async getRagStatusRecords(organizationId: number, connectionId?: number): Promise<RagStatusRecord[]> {
    const conditions = [eq(ragStatusRecords.organizationId, organizationId)];
    if (connectionId) {
      conditions.push(eq(ragStatusRecords.airtableConnectionId, connectionId));
    }
    
    return await db.select()
      .from(ragStatusRecords)
      .where(and(...conditions))
      .orderBy(desc(ragStatusRecords.createdAt));
  }

  async getRagStatusRecord(id: number, organizationId: number): Promise<RagStatusRecord | undefined> {
    const [record] = await db.select()
      .from(ragStatusRecords)
      .where(and(
        eq(ragStatusRecords.id, id),
        eq(ragStatusRecords.organizationId, organizationId)
      ))
      .limit(1);
    return record;
  }

  async upsertRagStatusFromAirtable(
    organizationId: number,
    connectionId: number,
    airtableRecordId: string,
    fields: any
  ): Promise<RagStatusRecord> {
    // Check if record exists
    const [existing] = await db.select()
      .from(ragStatusRecords)
      .where(and(
        eq(ragStatusRecords.organizationId, organizationId),
        eq(ragStatusRecords.airtableConnectionId, connectionId),
        eq(ragStatusRecords.airtableRecordId, airtableRecordId)
      ))
      .limit(1);

    if (existing) {
      // Update: Merge new Airtable fields with existing
      const mergedFields = {
        ...existing.airtableFields,
        ...fields,
      };

      const [updated] = await db.update(ragStatusRecords)
        .set({
          airtableFields: mergedFields,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ragStatusRecords.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db.insert(ragStatusRecords)
        .values({
          organizationId,
          airtableConnectionId: connectionId,
          airtableRecordId,
          airtableFields: fields,
          lastSyncedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  // Tariff Records Management Methods
  async getTariffRecords(organizationId: number, connectionId?: number): Promise<TariffRecord[]> {
    const conditions = [eq(tariffRecords.organizationId, organizationId)];
    if (connectionId) {
      conditions.push(eq(tariffRecords.airtableConnectionId, connectionId));
    }
    
    return await db.select()
      .from(tariffRecords)
      .where(and(...conditions))
      .orderBy(desc(tariffRecords.createdAt));
  }

  async getTariffRecord(id: number, organizationId: number): Promise<TariffRecord | undefined> {
    const [record] = await db.select()
      .from(tariffRecords)
      .where(and(
        eq(tariffRecords.id, id),
        eq(tariffRecords.organizationId, organizationId)
      ))
      .limit(1);
    return record;
  }

  async upsertTariffFromAirtable(
    organizationId: number,
    connectionId: number,
    airtableRecordId: string,
    fields: any
  ): Promise<TariffRecord> {
    // Check if record exists
    const [existing] = await db.select()
      .from(tariffRecords)
      .where(and(
        eq(tariffRecords.organizationId, organizationId),
        eq(tariffRecords.airtableConnectionId, connectionId),
        eq(tariffRecords.airtableRecordId, airtableRecordId)
      ))
      .limit(1);

    if (existing) {
      // Update: Merge new Airtable fields with existing
      const mergedFields = {
        ...existing.airtableFields,
        ...fields,
      };

      const [updated] = await db.update(tariffRecords)
        .set({
          airtableFields: mergedFields,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tariffRecords.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db.insert(tariffRecords)
        .values({
          organizationId,
          airtableConnectionId: connectionId,
          airtableRecordId,
          airtableFields: fields,
          lastSyncedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  // ==========================================
  // VAPI VOICE AI METHODS
  // ==========================================

  async createVapiCall(call: InsertVapiCall): Promise<VapiCall> {
    const [created] = await db.insert(vapiCalls)
      .values(call)
      .returning();
    return created;
  }

  async getVapiCall(id: number, organizationId: number): Promise<VapiCall | undefined> {
    const [call] = await db.select()
      .from(vapiCalls)
      .where(and(
        eq(vapiCalls.id, id),
        eq(vapiCalls.organizationId, organizationId)
      ))
      .limit(1);
    return call;
  }

  async getVapiCallByVapiId(vapiCallId: string, organizationId: number): Promise<VapiCall | undefined> {
    const [call] = await db.select()
      .from(vapiCalls)
      .where(and(
        eq(vapiCalls.vapiCallId, vapiCallId),
        eq(vapiCalls.organizationId, organizationId)
      ))
      .limit(1);
    return call;
  }

  async updateVapiCall(id: number, data: Partial<VapiCall>): Promise<VapiCall | undefined> {
    const [updated] = await db.update(vapiCalls)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vapiCalls.id, id))
      .returning();
    return updated;
  }

  async getVapiCalls(organizationId: number, filters?: {
    status?: string;
    customerIntent?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<VapiCall[]> {
    const conditions = [eq(vapiCalls.organizationId, organizationId)];
    
    if (filters?.status) {
      conditions.push(eq(vapiCalls.status, filters.status as any));
    }
    if (filters?.customerIntent) {
      conditions.push(eq(vapiCalls.customerIntent, filters.customerIntent));
    }
    if (filters?.startDate) {
      conditions.push(gte(vapiCalls.startedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(vapiCalls.startedAt, filters.endDate));
    }

    return await db.select()
      .from(vapiCalls)
      .where(and(...conditions))
      .orderBy(desc(vapiCalls.startedAt))
      .limit(filters?.limit || 100);
  }

  async createVapiAssistant(assistant: InsertVapiAssistant): Promise<VapiAssistant> {
    const [created] = await db.insert(vapiAssistants)
      .values(assistant)
      .returning();
    return created;
  }

  async getVapiAssistant(id: number, organizationId: number): Promise<VapiAssistant | undefined> {
    const [assistant] = await db.select()
      .from(vapiAssistants)
      .where(and(
        eq(vapiAssistants.id, id),
        eq(vapiAssistants.organizationId, organizationId)
      ))
      .limit(1);
    return assistant;
  }

  async updateVapiAssistant(id: number, data: Partial<VapiAssistant>): Promise<VapiAssistant | undefined> {
    const [updated] = await db.update(vapiAssistants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vapiAssistants.id, id))
      .returning();
    return updated;
  }

  async getVapiAssistants(organizationId: number, role?: string): Promise<VapiAssistant[]> {
    const conditions = [eq(vapiAssistants.organizationId, organizationId)];
    if (role) {
      conditions.push(eq(vapiAssistants.role, role));
    }

    return await db.select()
      .from(vapiAssistants)
      .where(and(...conditions))
      .orderBy(asc(vapiAssistants.name));
  }

  async createVapiKnowledgeFile(file: InsertVapiKnowledgeFile): Promise<VapiKnowledgeFile> {
    const [created] = await db.insert(vapiKnowledgeFiles)
      .values(file)
      .returning();
    return created;
  }

  async getVapiKnowledgeFile(id: number, organizationId: number): Promise<VapiKnowledgeFile | undefined> {
    const [file] = await db.select()
      .from(vapiKnowledgeFiles)
      .where(and(
        eq(vapiKnowledgeFiles.id, id),
        eq(vapiKnowledgeFiles.organizationId, organizationId)
      ))
      .limit(1);
    return file;
  }

  async updateVapiKnowledgeFile(id: number, data: Partial<VapiKnowledgeFile>): Promise<VapiKnowledgeFile | undefined> {
    const [updated] = await db.update(vapiKnowledgeFiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vapiKnowledgeFiles.id, id))
      .returning();
    return updated;
  }

  async getVapiKnowledgeFiles(organizationId: number, category?: string): Promise<VapiKnowledgeFile[]> {
    const conditions = [
      eq(vapiKnowledgeFiles.organizationId, organizationId),
      eq(vapiKnowledgeFiles.isActive, true)
    ];
    if (category) {
      conditions.push(eq(vapiKnowledgeFiles.category, category));
    }

    return await db.select()
      .from(vapiKnowledgeFiles)
      .where(and(...conditions))
      .orderBy(desc(vapiKnowledgeFiles.createdAt));
  }
}

// Create the clean storage instance
export const cleanStorage = new CleanDatabaseStorage();
export const storage = cleanStorage; // Legacy compatibility
export default cleanStorage;