import {
  sessions,
  organizations,
  users,
  themeSettings,
  platformFeatures,
  featureComments,
  featureFeedback,
  activityLogs,
  knowledgeDocuments,
  knowledgeCategories,
  knowledgeDocumentVersions,
  knowledgeDocumentAttachments,
  knowledgeDocumentActivity,
  documentAssignments,
  onboardingPlans,
  userOnboardingProgress,
  objectives,
  keyResults,
  keyResultTasks,
  workItems,
  pages,
  knowledgeFolders,
  trainingModuleSteps,
  trainingQuizQuestions,
  trainingProgress,
  userPoints,
  pointTransactions,
  activityFeed,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type ThemeSettings,
  type InsertThemeSettings,
  type PlatformFeature,
  type InsertPlatformFeature,
  type FeatureComment,
  type InsertFeatureComment,
  type FeatureFeedback,
  type InsertFeatureFeedback,
  type FeatureHierarchy,
  type InsertFeatureHierarchy,
  type Page,
  type ActivityLog,
  type InsertActivityLog,
  type KnowledgeDocument,
  type InsertKnowledgeDocument,
  type KnowledgeCategory,
  type InsertKnowledgeCategory,
  type DocumentAssignment,
  type InsertDocumentAssignment,
  type OnboardingPlan,
  type InsertOnboardingPlan,
  type UserOnboardingProgress,
  type InsertUserOnboardingProgress,
  type KnowledgeFolder,
  type InsertKnowledgeFolder,
  type TrainingModuleStep,
  type InsertTrainingModuleStep,
  type TrainingQuizQuestion,
  type InsertTrainingQuizQuestion,
  type TrainingProgress,
  type InsertTrainingProgress,
  type UserPoints,
  type InsertUserPoints,
  type PointTransaction,
  type InsertPointTransaction,
  type ActivityFeed,
  type InsertActivityFeed,
} from '../shared/schema';
import { db } from './db';
import { eq, desc, like, ilike, and, asc, isNull, gte, lte, not, inArray, isNotNull, count, sql, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export interface ICoreStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  getUsers(organizationId?: number): Promise<User[]>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  changeUserPassword(id: number, newPassword: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizations(): Promise<Organization[]>;
  createOrganization(insertOrg: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined>;

  // Theme Settings operations
  getThemeSettings(organizationId: number): Promise<ThemeSettings | undefined>;
  createThemeSettings(settings: InsertThemeSettings): Promise<ThemeSettings>;
  updateThemeSettings(organizationId: number, settings: Partial<ThemeSettings>): Promise<ThemeSettings | undefined>;

  // Platform Features operations
  getPlatformFeatures(organizationId: number, filters?: { visibilityStatus?: string; isEnabled?: boolean }): Promise<PlatformFeature[]>;
  getPlatformFeature(id: number): Promise<PlatformFeature | undefined>;
  createPlatformFeature(feature: InsertPlatformFeature): Promise<PlatformFeature>;
  updatePlatformFeature(id: number, data: Partial<PlatformFeature>): Promise<PlatformFeature | undefined>;
  deletePlatformFeature(id: number): Promise<boolean>;
  toggleFeature(id: number, isEnabled: boolean): Promise<PlatformFeature | undefined>;

  // Feature Comments operations
  getFeatureComments(featureId: number): Promise<FeatureComment[]>;
  createFeatureComment(comment: InsertFeatureComment): Promise<FeatureComment>;
  deleteFeatureComment(id: number): Promise<boolean>;
  
  // Feature Hierarchy Management
  getFeatureHierarchy(featureId: number): Promise<any[]>;
  getChildFeatures(parentFeatureId: number): Promise<PlatformFeature[]>;
  createFeatureHierarchy(hierarchy: InsertFeatureHierarchy): Promise<FeatureHierarchy>;
  deleteFeatureHierarchy(parentId: number, childId: number): Promise<boolean>;
  
  // Feature Feedback
  getFeatureFeedback(featureId: number): Promise<FeatureFeedback[]>;
  createFeatureFeedback(feedback: InsertFeatureFeedback): Promise<FeatureFeedback>;
  updateFeatureFeedbackStatus(id: number, status: string): Promise<FeatureFeedback | undefined>;
  
  // Feature-Page Linking (JSON field approach)
  getFeatureLinkedPages(featureId: number): Promise<Page[]>;
  linkPageToFeature(featureId: number, pageId: string): Promise<PlatformFeature | undefined>;
  unlinkPageFromFeature(featureId: number, pageId: string): Promise<PlatformFeature | undefined>;
  searchPagesForLinking(organizationId: number, searchTerm: string, excludeIds?: string[]): Promise<Page[]>;
  
  // Enhanced Feature Management
  getFeatureWithDetails(featureId: number): Promise<any>;
  linkPageToFeature(featureId: number, pageId: string, role?: string, isPrimary?: boolean): Promise<any>;
  unlinkPageFromFeature(featureId: number, pageId: string): Promise<any>;
  updateFeatureField(featureId: number, field: string, value: any, userId: number): Promise<any>;

  // Activity Logs operations
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(organizationId: number, filters?: { userId?: number; entityType?: string; limit?: number }): Promise<ActivityLog[]>;

  // Knowledge Base operations - updated for multi-select categories
  getKnowledgeDocuments(organizationId: number, filters?: { categories?: string[]; status?: string; search?: string }): Promise<KnowledgeDocument[]>;
  getKnowledgeDocument(id: number): Promise<KnowledgeDocument | undefined>;
  createKnowledgeDocument(document: InsertKnowledgeDocument): Promise<KnowledgeDocument>;
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
  
  // Document User Assignments
  getDocumentAssignments(documentId: number): Promise<any[]>;
  getAllDocumentAssignments(organizationId: number): Promise<any[]>;
  getUserDocumentAssignments(userId: number): Promise<any[]>;
  createDocumentAssignment(assignment: { documentId: number; userId: number; assignerId: number; dueDate?: Date | null; status: string; assignedAt: Date }): Promise<any>;
  updateDocumentAssignment(assignmentId: number, updates: any): Promise<any>;
  deleteDocumentAssignment(assignmentId: number): Promise<boolean>;
  
  // Onboarding Plans
  getOnboardingPlans(organizationId: number): Promise<OnboardingPlan[]>;
  getOnboardingPlan(id: number): Promise<OnboardingPlan | undefined>;
  createOnboardingPlan(plan: InsertOnboardingPlan): Promise<OnboardingPlan>;
  updateOnboardingPlan(id: number, data: Partial<OnboardingPlan>): Promise<OnboardingPlan | undefined>;
  deleteOnboardingPlan(id: number): Promise<boolean>;
  assignOnboardingPlan(planId: number, userIds: number[]): Promise<any[]>;
  
  // User Onboarding Progress
  getUserOnboardingProgress(userId: number): Promise<any[]>;
  getOnboardingPlanProgress(planId: number): Promise<any[]>;
  startOnboardingPlan(userId: number, planId: number): Promise<UserOnboardingProgress>;
  updateOnboardingProgress(progressId: number, updates: any): Promise<UserOnboardingProgress | undefined>;
  
  getKnowledgeCategories(organizationId: number): Promise<KnowledgeCategory[]>;
  createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory>;
  updateKnowledgeCategory(id: number, data: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined>;
  deleteKnowledgeCategory(id: number): Promise<boolean>;

  // Knowledge Hub v3 - Folders
  getKnowledgeFolders(organizationId: number, parentId?: number | null): Promise<KnowledgeFolder[]>;
  getKnowledgeFolder(id: number): Promise<KnowledgeFolder | undefined>;
  createKnowledgeFolder(folder: InsertKnowledgeFolder): Promise<KnowledgeFolder>;
  updateKnowledgeFolder(id: number, data: Partial<KnowledgeFolder>): Promise<KnowledgeFolder | undefined>;
  deleteKnowledgeFolder(id: number): Promise<boolean>;
  getFolderWithDocuments(folderId: number): Promise<{ folder: KnowledgeFolder; documents: KnowledgeDocument[] } | undefined>;
  
  // Knowledge Hub v3 - Training Progress & Points
  getTrainingProgress(userId: number, documentId: number): Promise<TrainingProgress | undefined>;
  updateTrainingProgress(id: number, data: Partial<TrainingProgress>): Promise<TrainingProgress | undefined>;
  createTrainingProgress(progress: InsertTrainingProgress): Promise<TrainingProgress>;
  getUserPoints(userId: number): Promise<UserPoints | undefined>;
  addPoints(userId: number, organizationId: number, points: number, sourceType: string, sourceId?: number, description?: string): Promise<PointTransaction>;
  
  // Knowledge Hub v3 - Training Module Steps
  getTrainingModuleSteps(documentId: number): Promise<TrainingModuleStep[]>;
  getTrainingModuleStep(id: number): Promise<TrainingModuleStep | undefined>;
  createTrainingModuleStep(step: InsertTrainingModuleStep): Promise<TrainingModuleStep>;
  updateTrainingModuleStep(id: number, data: Partial<TrainingModuleStep>): Promise<TrainingModuleStep | undefined>;
  deleteTrainingModuleStep(id: number): Promise<boolean>;
  reorderTrainingModuleSteps(documentId: number, stepIds: number[]): Promise<boolean>;
  
  // Knowledge Hub v3 - Quiz Questions  
  getQuizQuestions(stepId: number): Promise<TrainingQuizQuestion[]>;
  createQuizQuestion(question: InsertTrainingQuizQuestion): Promise<TrainingQuizQuestion>;
  updateQuizQuestion(id: number, data: Partial<TrainingQuizQuestion>): Promise<TrainingQuizQuestion | undefined>;
  deleteQuizQuestion(id: number): Promise<boolean>;
  
  // Knowledge Hub v3 - Activity Feed
  createActivityFeedEntry(entry: InsertActivityFeed): Promise<ActivityFeed>;
  getActivityFeed(organizationId: number, limit?: number): Promise<ActivityFeed[]>;
}

export class CoreDatabaseStorage implements ICoreStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password if provided
    let userData = { ...insertUser };
    if (userData.passwordHash) {
      userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    }

    const [user] = await db.insert(users).values(userData).returning();
    
    // Log user creation
    await this.logActivity({
      organizationId: user.organizationId || 1,
      userId: user.id,
      actionType: 'creation',
      entityType: 'user',
      entityId: user.id,
      // title: 'User Created',
      description: `New user ${user.email} was created`,
      metadata: { email: user.email, role: user.role }
    });

    return user;
  }

  async getUsers(organizationId?: number): Promise<User[]> {
    if (organizationId) {
      return await db.select().from(users)
        .where(eq(users.organizationId, organizationId))
        .orderBy(asc(users.fullName));
    }
    return await db.select().from(users).orderBy(asc(users.fullName));
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
        actionType: 'status_change',
        entityType: 'user',
        entityId: id,
        description: `User ${updated.email} profile was updated`,
        // changes: userData,
      });
    }

    return updated;
  }

  async changeUserPassword(id: number, newPassword: string): Promise<User | undefined> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [updated] = await db.update(users)
      .set({ passwordHash: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId || 1,
        userId: id,
        actionType: 'status_change',
        entityType: 'user',
        entityId: id,
        description: 'User password was updated',
      });
    }

    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
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
    
    await this.logActivity({
      organizationId: org.id,
      userId: 1, // System user for organization creation
      actionType: 'creation',
      entityType: 'organization',
      entityId: org.id,
      description: `Organization ${org.name} was created`,
      metadata: { domain: org.domain, subscriptionTier: org.subscriptionTier }
    });

    return org;
  }

  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: id,
        userId: 1, // System user for organization update
        actionType: 'status_change',
        entityType: 'organization',
        entityId: id,
        description: `Organization ${updated.name} was updated`
      });
    }

    return updated;
  }

  // Theme Settings operations
  async getThemeSettings(organizationId: number): Promise<ThemeSettings | undefined> {
    const [settings] = await db.select().from(themeSettings)
      .where(eq(themeSettings.organizationId, organizationId))
      .limit(1);
    return settings;
  }

  async createThemeSettings(settings: InsertThemeSettings): Promise<ThemeSettings> {
    const [created] = await db.insert(themeSettings).values(settings).returning();
    
    await this.logActivity({
      organizationId: created.organizationId || 1,
      userId: 1, // System user for theme creation
      actionType: 'creation',
      entityType: 'theme',
      entityId: created.id,
      description: 'Organization theme settings were initialized'
    });

    return created;
  }

  async updateThemeSettings(organizationId: number, settings: Partial<ThemeSettings>): Promise<ThemeSettings | undefined> {
    const [updated] = await db.update(themeSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(themeSettings.organizationId, organizationId))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: organizationId,
        userId: 1, // System user for theme update
        actionType: 'status_change',
        entityType: 'theme',
        entityId: updated.id,
        description: 'Organization theme settings were modified'
      });
    }

    return updated;
  }

  // Platform Features operations
  async getPlatformFeatures(organizationId: number, filters?: { visibilityStatus?: string; isEnabled?: boolean }): Promise<PlatformFeature[]> {
    const conditions = [eq(platformFeatures.organizationId, organizationId)];

    if (filters?.visibilityStatus) {
      conditions.push(eq(platformFeatures.visibilityStatus, filters.visibilityStatus));
    }

    if (filters?.isEnabled !== undefined) {
      conditions.push(eq(platformFeatures.isEnabled, filters.isEnabled));
    }

    return await db.select().from(platformFeatures)
      .where(and(...conditions))
      .orderBy(asc(platformFeatures.name));
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
      actionType: 'creation',
      entityType: 'feature',
      entityId: created.id,
      // title: 'Feature Created',
      description: `Platform feature ${created.name} was created`
    });

    return created;
  }

  async updatePlatformFeature(id: number, data: Partial<PlatformFeature>): Promise<PlatformFeature | undefined> {
    const [updated] = await db.update(platformFeatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformFeatures.id, id))
      .returning();

    if (updated && data.updatedBy) {
      try {
        await this.logActivity({
          organizationId: updated.organizationId || 1,
          userId: data.updatedBy,
          actionType: 'status_change',
          entityType: 'feature',
          entityId: id,
          description: `Platform feature ${updated.name} was updated`,
          metadata: { changes: Object.keys(data) }
        });
      } catch (error) {
        console.error('Failed to log activity for feature update:', error);
        // Don't fail the update if activity logging fails
      }
    }

    return updated;
  }

  async deletePlatformFeature(id: number): Promise<boolean> {
    const result = await db.delete(platformFeatures).where(eq(platformFeatures.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async toggleFeature(id: number, isEnabled: boolean): Promise<PlatformFeature | undefined> {
    const [updated] = await db.update(platformFeatures)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(platformFeatures.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId || 1,
        userId: 1, // System user for feature toggle
        actionType: 'status_change',
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

  async getFeatureWithDetails(featureId: number) {
    const [feature] = await db.select().from(platformFeatures).where(eq(platformFeatures.id, featureId));
    if (!feature) return null;

    // Get child features if this is a parent
    const childFeatures = await db
      .select()
      .from(platformFeatures)
      .where(eq(platformFeatures.parentFeatureId, featureId));

    // Get parent feature if this is a child
    let parentFeature = null;
    if (feature.parentFeatureId) {
      const [parent] = await db
        .select()
        .from(platformFeatures)
        .where(eq(platformFeatures.id, feature.parentFeatureId));
      parentFeature = parent;
    }

    return {
      ...feature,
      childFeatures,
      parentFeature
    };
  }



  async updateFeatureField(featureId: number, field: string, value: any, userId: number) {
    const updateData: any = {
      [field]: value,
      updatedBy: userId,
      updatedAt: new Date()
    };

    const [updated] = await db
      .update(platformFeatures)
      .set(updateData)
      .where(eq(platformFeatures.id, featureId))
      .returning();

    return updated;
  }

  // Feature Hierarchy Management - implementing using existing parent-child relationships
  async getFeatureHierarchy(featureId: number): Promise<any[]> {
    // Get the feature and its hierarchy
    const feature = await this.getPlatformFeature(featureId);
    if (!feature) return [];

    // Get all child features recursively
    const getChildrenRecursively = async (parentId: number): Promise<any[]> => {
      const children = await db.select().from(platformFeatures)
        .where(eq(platformFeatures.parentFeatureId, parentId));
      
      const result = [];
      for (const child of children) {
        const childWithChildren = {
          ...child,
          children: await getChildrenRecursively(child.id)
        };
        result.push(childWithChildren);
      }
      return result;
    };

    return await getChildrenRecursively(featureId);
  }

  async getChildFeatures(parentFeatureId: number): Promise<PlatformFeature[]> {
    return await db.select().from(platformFeatures)
      .where(eq(platformFeatures.parentFeatureId, parentFeatureId))
      .orderBy(asc(platformFeatures.name));
  }

  async createFeatureHierarchy(hierarchy: InsertFeatureHierarchy): Promise<FeatureHierarchy> {
    // Since featureHierarchy table was removed, we'll update the parent-child relationship directly
    // Update the child feature to have the correct parent
    const [updated] = await db.update(platformFeatures)
      .set({ parentFeatureId: hierarchy.parentFeatureId, updatedAt: new Date() })
      .where(eq(platformFeatures.id, hierarchy.childFeatureId))
      .returning();

    // Return a hierarchy-like object
    return {
      id: updated.id,
      parentFeatureId: hierarchy.parentFeatureId,
      childFeatureId: hierarchy.childFeatureId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as FeatureHierarchy;
  }

  async deleteFeatureHierarchy(parentId: number, childId: number): Promise<boolean> {
    // Remove the parent-child relationship by setting parentFeatureId to null
    const result = await db.update(platformFeatures)
      .set({ parentFeatureId: null, updatedAt: new Date() })
      .where(and(
        eq(platformFeatures.id, childId),
        eq(platformFeatures.parentFeatureId, parentId)
      ));
    
    return result.rowCount !== null && result.rowCount > 0;
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
    return await db.select().from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Page operations
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

  // Knowledge Base operations
  async getKnowledgeDocuments(organizationId: number, filters?: { categories?: string[]; status?: string; search?: string }): Promise<KnowledgeDocument[]> {
    const conditions = [eq(knowledgeDocuments.organizationId, organizationId)];

    // Updated for multi-select categories using array overlap operator with safe parameter binding
    if (filters?.categories && filters.categories.length > 0) {
      conditions.push(sql`${knowledgeDocuments.categories} && ARRAY[${sql.join(filters.categories.map(cat => sql`${cat}`), sql`, `)}]`);
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
      .orderBy(desc(knowledgeDocuments.updatedAt));
  }

  async getKnowledgeDocument(id: number): Promise<KnowledgeDocument | undefined> {
    const [document] = await db.select().from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))
      .limit(1);
    return document;
  }

  async createKnowledgeDocument(document: InsertKnowledgeDocument): Promise<KnowledgeDocument> {
    const [created] = await db.insert(knowledgeDocuments).values(document).returning();
    
    await this.logDocumentActivity(created.id, created.authorId || 1, 'created', {
      title: created.title,
      categories: created.categories,
      status: created.status
    });

    return created;
  }

  async updateKnowledgeDocument(id: number, data: Partial<KnowledgeDocument>, userId?: number): Promise<KnowledgeDocument | undefined> {
    const [updated] = await db.update(knowledgeDocuments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, id))
      .returning();

    if (updated) {
      await this.logDocumentActivity(id, userId || updated.authorId || 1, 'edited', {
        title: updated.title,
        changes: Object.keys(data),
        status: updated.status
      });
    }

    return updated;
  }

  async deleteKnowledgeDocument(id: number, userId?: number): Promise<boolean> {
    // Get document title before deletion for logging
    const document = await this.getKnowledgeDocument(id);
    
    const result = await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    const success = result.rowCount !== null && result.rowCount > 0;
    
    if (success && document && userId) {
      await this.logDocumentActivity(id, userId, 'deleted', {
        title: document.title
      });
    }
    
    return success;
  }

  async getKnowledgeCategories(organizationId: number): Promise<KnowledgeCategory[]> {
    return await db.select().from(knowledgeCategories)
      .where(eq(knowledgeCategories.organizationId, organizationId))
      .orderBy(asc(knowledgeCategories.sortOrder), asc(knowledgeCategories.name));
  }

  async createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory> {
    const [created] = await db.insert(knowledgeCategories).values(category).returning();
    
    await this.logActivity({
      organizationId: created.organizationId || 1,
      userId: 1, // System user for category creation
      actionType: 'creation',
      entityType: 'knowledge_category',
      entityId: created.id,
      description: `Knowledge category "${created.name}" was created`
    });

    return created;
  }

  async updateKnowledgeCategory(id: number, data: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined> {
    const [updated] = await db.update(knowledgeCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeCategories.id, id))
      .returning();

    if (updated) {
      await this.logActivity({
        organizationId: updated.organizationId || 1,
        userId: 1, // System user for category update
        actionType: 'status_change',
        entityType: 'knowledge_category',
        entityId: id,
        description: `Knowledge category "${updated.name}" was updated`
      });
    }

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
  
  async restoreKnowledgeDocumentVersion(documentId: number, versionNumber: number, userId: number): Promise<any> {
    // Get the version to restore
    const version = await db.select()
      .from(knowledgeDocumentVersions)
      .where(
        and(
          eq(knowledgeDocumentVersions.documentId, documentId),
          eq(knowledgeDocumentVersions.versionNumber, versionNumber)
        )
      )
      .limit(1);
      
    if (version.length === 0) {
      throw new Error('Version not found');
    }
    
    const versionToRestore = version[0];
    
    // Update the main document with the version content
    const [updatedDocument] = await db.update(knowledgeDocuments)
      .set({
        title: versionToRestore.title,
        content: versionToRestore.content,
        updatedAt: new Date()
      })
      .where(eq(knowledgeDocuments.id, documentId))
      .returning();
    
    if (!updatedDocument) {
      throw new Error('Failed to restore document');
    }
    
    // Create a new version entry to record the restore action
    const currentVersions = await db.select()
      .from(knowledgeDocumentVersions)
      .where(eq(knowledgeDocumentVersions.documentId, documentId))
      .orderBy(desc(knowledgeDocumentVersions.versionNumber))
      .limit(1);
    
    const newVersionNumber = currentVersions.length > 0 ? currentVersions[0].versionNumber + 1 : 1;
    
    await db.insert(knowledgeDocumentVersions).values({
      documentId,
      versionNumber: newVersionNumber,
      title: versionToRestore.title,
      content: versionToRestore.content,
      summary: `Restored from version ${versionNumber}`,
      changedBy: userId,
      changeDescription: `Document restored from version ${versionNumber}`,
    });
    
    // Log activity
    await this.logDocumentActivity(documentId, userId, 'version_restored', {
      restoredFromVersion: versionNumber,
      newVersionNumber
    });
    
    return updatedDocument;
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
    
    // Get work item and document details for activity logging
    const [workItem] = await db.select().from(workItems).where(eq(workItems.id, workItemId)).limit(1);
    const [document] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, documentId)).limit(1);
    
    // Log to activity_logs table so it appears in work item Activity tab
    if (workItem && document) {
      await this.logActivity({
        organizationId: workItem.organizationId,
        userId: userId,
        actionType: 'file_upload',
        entityType: 'work_item',
        entityId: workItemId,
        description: `Attached document "${document.title}"`,
        metadata: { documentId, documentTitle: document.title, notes }
      });
    }
    
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
    
    // Get document details before deletion
    const [document] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, attachment.documentId)).limit(1);
    
    // Delete attachment
    const result = await db.delete(knowledgeDocumentAttachments)
      .where(eq(knowledgeDocumentAttachments.id, attachmentId));
    
    // Log activity if deletion was successful
    if (result.rowCount && result.rowCount > 0) {
      await this.logDocumentActivity(attachment.documentId, attachment.attachedBy, 'detached', {
        attachmentId,
        objectiveId: attachment.objectiveId,
        keyResultId: attachment.keyResultId,
        taskId: attachment.taskId,
        workItemId: attachment.workItemId
      });
      
      // If detached from work item, also log to activity_logs
      if (attachment.workItemId && document) {
        const [workItem] = await db.select().from(workItems).where(eq(workItems.id, attachment.workItemId)).limit(1);
        
        if (workItem) {
          await this.logActivity({
            organizationId: workItem.organizationId,
            userId: attachment.attachedBy,
            actionType: 'deletion',
            entityType: 'work_item',
            entityId: attachment.workItemId,
            description: `Detached document "${document.title}"`,
            metadata: { documentId: attachment.documentId, documentTitle: document.title }
          });
        }
      }
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

  // Document User Assignments - Using document_assignments table
  async getDocumentAssignments(documentId: number): Promise<any[]> {
    const assignments = await db.select()
      .from(documentAssignments)
      .leftJoin(users, eq(documentAssignments.userId, users.id))
      .where(eq(documentAssignments.documentId, documentId))
      .orderBy(desc(documentAssignments.assignedAt));
    
    return assignments.map(a => ({
      id: a.document_assignments.id,
      documentId: a.document_assignments.documentId,
      userId: a.document_assignments.userId,
      user: {
        id: a.users?.id,
        fullName: a.users?.fullName || 'Unknown User',
        email: a.users?.email || ''
      },
      status: a.document_assignments.status,
      priority: a.document_assignments.priority,
      dueDate: a.document_assignments.dueDate,
      assignedAt: a.document_assignments.assignedAt,
      completedAt: a.document_assignments.completedAt,
      assignerId: a.document_assignments.assignerId,
      completionNotes: a.document_assignments.completionNotes,
      timeSpentMinutes: a.document_assignments.timeSpentMinutes
    }));
  }

  async createDocumentAssignment(assignment: { documentId: number; userId: number; assignerId: number; dueDate?: Date | null; status: string; assignedAt: Date }): Promise<any> {
    const user = await this.getUser(assignment.userId);
    if (!user?.organizationId) {
      throw new Error('User not found or missing organization');
    }

    const [created] = await db.insert(documentAssignments).values({
      organizationId: user.organizationId,
      documentId: assignment.documentId,
      userId: assignment.userId,
      assignerId: assignment.assignerId,
      status: assignment.status,
      dueDate: assignment.dueDate,
      assignedAt: assignment.assignedAt
    }).returning();

    // Log activity
    await this.logDocumentActivity(assignment.documentId, assignment.assignerId, 'assigned', {
      userId: assignment.userId,
      dueDate: assignment.dueDate
    });

    return {
      ...created,
      user: {
        id: user.id,
        fullName: user.fullName || 'Unknown User',
        email: user.email || ''
      }
    };
  }

  async updateDocumentAssignment(assignmentId: number, updates: any): Promise<any> {
    const [updated] = await db.update(documentAssignments)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(documentAssignments.id, assignmentId))
      .returning();

    return updated;
  }

  async deleteDocumentAssignment(assignmentId: number): Promise<boolean> {
    const result = await db.delete(documentAssignments)
      .where(eq(documentAssignments.id, assignmentId));
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Get all document assignments for an organization (for Team Progress view)
  async getAllDocumentAssignments(organizationId: number): Promise<any[]> {
    const assignments = await db.select()
      .from(documentAssignments)
      .leftJoin(users, eq(documentAssignments.userId, users.id))
      .leftJoin(knowledgeDocuments, eq(documentAssignments.documentId, knowledgeDocuments.id))
      .where(eq(documentAssignments.organizationId, organizationId))
      .orderBy(desc(documentAssignments.assignedAt));
    
    return assignments.map(a => ({
      id: a.document_assignments.id,
      documentId: a.document_assignments.documentId,
      documentTitle: a.knowledge_documents?.title || 'Unknown Document',
      userId: a.document_assignments.userId,
      userName: a.users?.fullName || 'Unknown User',
      userEmail: a.users?.email || '',
      status: a.document_assignments.status,
      priority: a.document_assignments.priority,
      dueDate: a.document_assignments.dueDate,
      assignedAt: a.document_assignments.assignedAt,
      completedAt: a.document_assignments.completedAt,
      assignerId: a.document_assignments.assignerId
    }));
  }

  // Get document assignments for a specific user (for My Training view)
  async getUserDocumentAssignments(userId: number): Promise<any[]> {
    const assignments = await db.select()
      .from(documentAssignments)
      .leftJoin(knowledgeDocuments, eq(documentAssignments.documentId, knowledgeDocuments.id))
      .leftJoin(workItems, eq(documentAssignments.workItemId, workItems.id))
      .where(eq(documentAssignments.userId, userId))
      .orderBy(desc(documentAssignments.assignedAt));
    
    return assignments.map(a => {
      const content = a.knowledge_documents?.content || '';
      const summary = a.knowledge_documents?.summary;
      const documentDescription = summary || (content.length > 150 ? content.substring(0, 150) + '...' : content) || '';
      
      return {
        id: a.document_assignments.id,
        documentId: a.document_assignments.documentId,
        documentTitle: a.knowledge_documents?.title || 'Unknown Document',
        documentType: a.knowledge_documents?.documentType,
        documentDescription,
        status: a.document_assignments.status,
        priority: a.document_assignments.priority,
        dueDate: a.document_assignments.dueDate,
        assignedAt: a.document_assignments.assignedAt,
        completedAt: a.document_assignments.completedAt,
        acknowledgedUnderstanding: a.document_assignments.acknowledgedUnderstanding,
        completionNotes: a.document_assignments.completionNotes,
        timeSpentMinutes: a.document_assignments.timeSpentMinutes,
        workItemId: a.document_assignments.workItemId,
        workItem: a.work_items ? {
          id: a.work_items.id,
          title: a.work_items.title,
          status: a.work_items.status,
          workflowTemplateId: a.work_items.workflowTemplateId
        } : null
      };
    });
  }

  // Feature-Page Linking Methods (JSON field approach)
  async getFeatureLinkedPages(featureId: number): Promise<Page[]> {
    try {
      // Get the feature with linkedPageIds
      const [feature] = await db.select().from(platformFeatures)
        .where(eq(platformFeatures.id, featureId))
        .limit(1);
      
      if (!feature || !feature.linkedPageIds) {
        return [];
      }
      
      // The linkedPageIds is stored as JSONB in PostgreSQL
      // It should be an array of strings
      const pageIds = feature.linkedPageIds as string[];
      
      if (!Array.isArray(pageIds) || pageIds.length === 0) {
        return [];
      }
      
      // Filter out null/undefined values and ensure they're strings
      const validPageIds = pageIds
        .filter(id => id != null && id !== '' && typeof id === 'string')
        .map(id => String(id)); // Ensure all are strings
      
      if (validPageIds.length === 0) {
        return [];
      }
      
      // Get pages by their IDs - no organization filter needed, page IDs are unique
      const linkedPages = await db.select().from(pages)
        .where(inArray(pages.id, validPageIds));
      
      return linkedPages;
    } catch (error) {
      console.error('Error in getFeatureLinkedPages:', error);
      return [];
    }
  }

  async linkPageToFeature(featureId: number, pageId: string): Promise<PlatformFeature | undefined> {
    const feature = await this.getPlatformFeature(featureId);
    if (!feature) return undefined;
    
    // Get current IDs and ensure they're clean
    const currentIds = (feature.linkedPageIds || []) as any[];
    const cleanIds = currentIds
      .filter(id => id != null && id !== '' && typeof id === 'string')
      .map(id => String(id));
    
    // Check if already linked
    if (cleanIds.includes(pageId)) {
      return feature; // Already linked
    }
    
    // Add the new page ID
    const updatedIds = [...cleanIds, pageId];
    return await this.updatePlatformFeature(featureId, { linkedPageIds: updatedIds });
  }

  async unlinkPageFromFeature(featureId: number, pageId: string): Promise<PlatformFeature | undefined> {
    const feature = await this.getPlatformFeature(featureId);
    if (!feature) return undefined;
    
    // Get current IDs and filter out the one to unlink
    const currentIds = (feature.linkedPageIds || []) as any[];
    const updatedIds = currentIds
      .filter(id => id != null && id !== '' && typeof id === 'string')
      .map(id => String(id))
      .filter(id => id !== pageId);
    
    return await this.updatePlatformFeature(featureId, { linkedPageIds: updatedIds });
  }

  async searchPagesForLinking(organizationId: number, searchTerm: string, excludeIds?: string[]): Promise<Page[]> {
    let conditions: any[] = [
      eq(pages.organizationId, organizationId),
      or(
        sql`LOWER(${pages.title}) LIKE LOWER(${'%' + searchTerm + '%'})`,
        sql`LOWER(${pages.slug}) LIKE LOWER(${'%' + searchTerm + '%'})`
      )
    ];
    
    if (excludeIds && excludeIds.length > 0) {
      conditions.push(not(inArray(pages.id, excludeIds)));
    }
    
    const query = db.select().from(pages)
      .where(and(...conditions))
      .limit(10);
    
    return await query;
  }

  // Onboarding Plans
  async getOnboardingPlans(organizationId: number): Promise<OnboardingPlan[]> {
    return await db.select()
      .from(onboardingPlans)
      .where(eq(onboardingPlans.organizationId, organizationId))
      .orderBy(desc(onboardingPlans.createdAt));
  }

  async getOnboardingPlan(id: number): Promise<OnboardingPlan | undefined> {
    const [plan] = await db.select()
      .from(onboardingPlans)
      .where(eq(onboardingPlans.id, id))
      .limit(1);
    return plan;
  }

  async createOnboardingPlan(plan: InsertOnboardingPlan): Promise<OnboardingPlan> {
    const [created] = await db.insert(onboardingPlans)
      .values(plan)
      .returning();
    return created;
  }

  async updateOnboardingPlan(id: number, data: Partial<OnboardingPlan>): Promise<OnboardingPlan | undefined> {
    const [updated] = await db.update(onboardingPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(onboardingPlans.id, id))
      .returning();
    return updated;
  }

  async deleteOnboardingPlan(id: number): Promise<boolean> {
    const result = await db.delete(onboardingPlans)
      .where(eq(onboardingPlans.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async assignOnboardingPlan(planId: number, userIds: number[]): Promise<any[]> {
    const plan = await this.getOnboardingPlan(planId);
    if (!plan) throw new Error('Onboarding plan not found');

    const assignments = [];
    
    for (const userId of userIds) {
      // Start onboarding for each user
      const progress = await this.startOnboardingPlan(userId, planId);
      
      // Create document assignments based on plan's documentSequence
      const sequence = plan.documentSequence as any[];
      if (sequence && sequence.length > 0) {
        for (const item of sequence) {
          const dueDate = item.dayOffset > 0 
            ? new Date(Date.now() + item.dayOffset * 24 * 60 * 60 * 1000)
            : null;
            
          const assignment = await this.createDocumentAssignment({
            documentId: item.documentId,
            userId,
            assignerId: plan.createdBy || 1,
            dueDate,
            status: 'assigned',
            assignedAt: new Date()
          });
          
          assignments.push(assignment);
        }
      }
    }
    
    return assignments;
  }

  // User Onboarding Progress
  async getUserOnboardingProgress(userId: number): Promise<any[]> {
    const progress = await db.select()
      .from(userOnboardingProgress)
      .leftJoin(onboardingPlans, eq(userOnboardingProgress.planId, onboardingPlans.id))
      .where(eq(userOnboardingProgress.userId, userId))
      .orderBy(desc(userOnboardingProgress.startedAt));
    
    return progress.map(p => ({
      ...p.user_onboarding_progress,
      plan: p.onboarding_plans
    }));
  }

  async getOnboardingPlanProgress(planId: number): Promise<any[]> {
    const progress = await db.select()
      .from(userOnboardingProgress)
      .leftJoin(users, eq(userOnboardingProgress.userId, users.id))
      .where(eq(userOnboardingProgress.planId, planId))
      .orderBy(desc(userOnboardingProgress.startedAt));
    
    return progress.map(p => ({
      ...p.user_onboarding_progress,
      user: p.users
    }));
  }

  async startOnboardingPlan(userId: number, planId: number): Promise<UserOnboardingProgress> {
    const [progress] = await db.insert(userOnboardingProgress)
      .values({
        userId,
        planId,
        status: 'in_progress',
        startedAt: new Date(),
        progress: {}
      })
      .returning();
    
    return progress;
  }

  async updateOnboardingProgress(progressId: number, updates: any): Promise<UserOnboardingProgress | undefined> {
    const [updated] = await db.update(userOnboardingProgress)
      .set(updates)
      .where(eq(userOnboardingProgress.id, progressId))
      .returning();
    
    return updated;
  }

  // ========================================
  // KNOWLEDGE HUB V3 - FOLDERS
  // ========================================
  
  async getKnowledgeFolders(organizationId: number, parentId?: number | null): Promise<KnowledgeFolder[]> {
    const conditions = [eq(knowledgeFolders.organizationId, organizationId)];
    
    if (parentId === null) {
      conditions.push(isNull(knowledgeFolders.parentId));
    } else if (parentId !== undefined) {
      conditions.push(eq(knowledgeFolders.parentId, parentId));
    }
    
    return await db.select()
      .from(knowledgeFolders)
      .where(and(...conditions))
      .orderBy(asc(knowledgeFolders.sortOrder), asc(knowledgeFolders.name));
  }

  async getKnowledgeFolder(id: number, organizationId: number): Promise<KnowledgeFolder | undefined> {
    const [folder] = await db.select()
      .from(knowledgeFolders)
      .where(and(
        eq(knowledgeFolders.id, id),
        eq(knowledgeFolders.organizationId, organizationId)
      ))
      .limit(1);
    return folder;
  }

  async createKnowledgeFolder(folder: InsertKnowledgeFolder): Promise<KnowledgeFolder> {
    const [created] = await db.insert(knowledgeFolders)
      .values(folder)
      .returning();
    return created;
  }

  async updateKnowledgeFolder(id: number, organizationId: number, data: Partial<KnowledgeFolder>): Promise<KnowledgeFolder | undefined> {
    const [updated] = await db.update(knowledgeFolders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(knowledgeFolders.id, id),
        eq(knowledgeFolders.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteKnowledgeFolder(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(knowledgeFolders)
      .where(and(
        eq(knowledgeFolders.id, id),
        eq(knowledgeFolders.organizationId, organizationId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getFolderWithDocuments(folderId: number, organizationId: number): Promise<{ folder: KnowledgeFolder; documents: KnowledgeDocument[] } | undefined> {
    const folder = await this.getKnowledgeFolder(folderId, organizationId);
    if (!folder) return undefined;
    
    const documents = await db.select()
      .from(knowledgeDocuments)
      .where(and(
        eq(knowledgeDocuments.folderId, folderId),
        eq(knowledgeDocuments.organizationId, organizationId)
      ))
      .orderBy(asc(knowledgeDocuments.title));
    
    return { folder, documents };
  }

  // ========================================
  // KNOWLEDGE HUB V3 - TRAINING PROGRESS & POINTS
  // ========================================
  
  async getTrainingProgress(userId: number, documentId: number): Promise<TrainingProgress | undefined> {
    const [progress] = await db.select()
      .from(trainingProgress)
      .where(and(
        eq(trainingProgress.userId, userId),
        eq(trainingProgress.documentId, documentId)
      ))
      .limit(1);
    return progress;
  }

  async createTrainingProgress(progress: InsertTrainingProgress): Promise<TrainingProgress> {
    const [created] = await db.insert(trainingProgress)
      .values(progress)
      .returning();
    return created;
  }

  async updateTrainingProgress(id: number, data: Partial<TrainingProgress>): Promise<TrainingProgress | undefined> {
    const [updated] = await db.update(trainingProgress)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingProgress.id, id))
      .returning();
    return updated;
  }

  async getUserPoints(userId: number): Promise<UserPoints | undefined> {
    const [points] = await db.select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);
    return points;
  }

  async addPoints(userId: number, organizationId: number, points: number, sourceType: string, sourceId?: number, description?: string): Promise<PointTransaction> {
    const [transaction] = await db.insert(pointTransactions)
      .values({
        userId,
        organizationId,
        points,
        sourceType,
        sourceId,
        description
      })
      .returning();
    
    const existingPoints = await this.getUserPoints(userId);
    if (existingPoints) {
      await db.update(userPoints)
        .set({ 
          totalPoints: existingPoints.totalPoints! + points,
          updatedAt: new Date()
        })
        .where(eq(userPoints.userId, userId));
    } else {
      await db.insert(userPoints)
        .values({
          userId,
          organizationId,
          totalPoints: points
        });
    }
    
    return transaction;
  }

  // ========================================
  // KNOWLEDGE HUB V3 - TRAINING MODULE STEPS
  // ========================================
  
  async getTrainingModuleSteps(documentId: number): Promise<TrainingModuleStep[]> {
    return await db.select()
      .from(trainingModuleSteps)
      .where(eq(trainingModuleSteps.documentId, documentId))
      .orderBy(asc(trainingModuleSteps.stepOrder));
  }

  async getTrainingModuleStep(id: number): Promise<TrainingModuleStep | undefined> {
    const [step] = await db.select()
      .from(trainingModuleSteps)
      .where(eq(trainingModuleSteps.id, id))
      .limit(1);
    return step;
  }

  async createTrainingModuleStep(step: InsertTrainingModuleStep): Promise<TrainingModuleStep> {
    const [created] = await db.insert(trainingModuleSteps)
      .values(step)
      .returning();
    return created;
  }

  async updateTrainingModuleStep(id: number, data: Partial<TrainingModuleStep>): Promise<TrainingModuleStep | undefined> {
    const [updated] = await db.update(trainingModuleSteps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingModuleSteps.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingModuleStep(id: number): Promise<boolean> {
    const result = await db.delete(trainingModuleSteps)
      .where(eq(trainingModuleSteps.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async reorderTrainingModuleSteps(documentId: number, stepIds: number[]): Promise<boolean> {
    for (let i = 0; i < stepIds.length; i++) {
      await db.update(trainingModuleSteps)
        .set({ stepOrder: i + 1 })
        .where(and(
          eq(trainingModuleSteps.id, stepIds[i]),
          eq(trainingModuleSteps.documentId, documentId)
        ));
    }
    return true;
  }

  // ========================================
  // KNOWLEDGE HUB V3 - QUIZ QUESTIONS
  // ========================================
  
  async getQuizQuestions(stepId: number): Promise<TrainingQuizQuestion[]> {
    return await db.select()
      .from(trainingQuizQuestions)
      .where(eq(trainingQuizQuestions.stepId, stepId))
      .orderBy(asc(trainingQuizQuestions.questionOrder));
  }

  async createQuizQuestion(question: InsertTrainingQuizQuestion): Promise<TrainingQuizQuestion> {
    const [created] = await db.insert(trainingQuizQuestions)
      .values(question)
      .returning();
    return created;
  }

  async updateQuizQuestion(id: number, data: Partial<TrainingQuizQuestion>): Promise<TrainingQuizQuestion | undefined> {
    const [updated] = await db.update(trainingQuizQuestions)
      .set(data)
      .where(eq(trainingQuizQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteQuizQuestion(id: number): Promise<boolean> {
    const result = await db.delete(trainingQuizQuestions)
      .where(eq(trainingQuizQuestions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ========================================
  // KNOWLEDGE HUB V3 - ACTIVITY FEED
  // ========================================
  
  async createActivityFeedEntry(entry: InsertActivityFeed): Promise<ActivityFeed> {
    const [created] = await db.insert(activityFeed)
      .values(entry)
      .returning();
    return created;
  }

  async getActivityFeed(organizationId: number, limit: number = 50): Promise<ActivityFeed[]> {
    return await db.select()
      .from(activityFeed)
      .where(eq(activityFeed.organizationId, organizationId))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit);
  }
}

export const coreStorage = new CoreDatabaseStorage();