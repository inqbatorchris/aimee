import { Router } from "express";
import { eq, desc, and, or, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { coreStorage } from "../core-storage";
import { authenticateToken, requireRole } from "../auth";
import { z } from "zod";
import { insertKnowledgeDocumentSchema, insertKnowledgeCategorySchema, User, teamMembers, workItems, documentAssignments } from "../../shared/schema";

const router = Router();

// Get all knowledge documents
router.get("/documents", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { categories, status, search } = req.query;

    const filters: any = {};
    // Support both single category (legacy) and categories array (new)
    if (categories) {
      if (Array.isArray(categories)) {
        filters.categories = categories.filter(c => c !== 'All');
      } else if (categories !== 'All') {
        filters.categories = [categories as string];
      }
    }
    // Handle status filter case-insensitively - 'all' or 'All' means no status filtering
    if (status && (status as string).toLowerCase() !== 'all') {
      filters.status = status as string;
    }
    if (search) filters.search = search as string;

    const documents = await coreStorage.getKnowledgeDocuments(organizationId, filters);
    console.log(`📚 KB Documents for org ${organizationId}:`, documents.length, 'documents');
    console.log('📄 Document IDs:', documents.map(d => ({ id: d.id, title: d.title })));
    res.json(documents);
  } catch (error) {
    console.error("Error fetching knowledge documents:", error);
    res.status(500).json({ error: "Failed to fetch knowledge documents" });
  }
});

// Get single knowledge document
router.get("/documents/:id", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const document = await coreStorage.getKnowledgeDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching knowledge document:", error);
    res.status(500).json({ error: "Failed to fetch knowledge document" });
  }
});

// Create new knowledge document
router.post("/documents", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const validatedData = insertKnowledgeDocumentSchema.parse({
      ...req.body,
      organizationId,
      authorId: req.user!.id,
    });

    const document = await coreStorage.createKnowledgeDocument(validatedData);
    res.status(201).json(document);
  } catch (error) {
    console.error("Error creating knowledge document:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid document data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create knowledge document" });
  }
});

// Update knowledge document
router.put("/documents/:id", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const updates = req.body;
    const document = await coreStorage.updateKnowledgeDocument(documentId, updates, req.user!.id);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error updating knowledge document:", error);
    res.status(500).json({ error: "Failed to update knowledge document" });
  }
});

// Delete knowledge document
router.delete("/documents/:id", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const success = await coreStorage.deleteKnowledgeDocument(documentId, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting knowledge document:", error);
    res.status(500).json({ error: "Failed to delete knowledge document" });
  }
});

// Get knowledge categories
router.get("/categories", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const categories = await coreStorage.getKnowledgeCategories(organizationId);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching knowledge categories:", error);
    res.status(500).json({ error: "Failed to fetch knowledge categories" });
  }
});

// Create knowledge category
router.post("/categories", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const validatedData = insertKnowledgeCategorySchema.parse({
      ...req.body,
      organizationId,
    });

    const category = await coreStorage.createKnowledgeCategory(validatedData);
    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating knowledge category:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid category data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create knowledge category" });
  }
});

// Update knowledge category
router.put("/categories/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const updates = req.body;
    const category = await coreStorage.updateKnowledgeCategory(categoryId, updates);
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error updating knowledge category:", error);
    res.status(500).json({ error: "Failed to update knowledge category" });
  }
});

// Delete knowledge category
router.delete("/categories/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const success = await coreStorage.deleteKnowledgeCategory(categoryId);
    if (!success) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting knowledge category:", error);
    res.status(500).json({ error: "Failed to delete knowledge category" });
  }
});

// Search knowledge base (simple text search for now)
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Search query is required" });
    }

    const documents = await coreStorage.getKnowledgeDocuments(organizationId, { search: query });
    
    // Simple relevance scoring based on title vs content matches
    const results = documents.map(doc => {
      const titleMatch = doc.title.toLowerCase().includes(query.toLowerCase());
      const contentMatch = doc.content?.toLowerCase().includes(query.toLowerCase());
      
      return {
        ...doc,
        relevanceScore: titleMatch ? 1.0 : (contentMatch ? 0.5 : 0.1),
        matchType: titleMatch ? 'title' : (contentMatch ? 'content' : 'tags')
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json(results);
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    res.status(500).json({ error: "Failed to search knowledge base" });
  }
});

// Create new document version
router.post("/documents/:id/versions", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const versionData = {
      ...req.body,
      changedBy: req.user!.id
    };

    const version = await coreStorage.createKnowledgeDocumentVersion(documentId, versionData);
    res.status(201).json(version);
  } catch (error) {
    console.error("Error creating document version:", error);
    res.status(500).json({ error: "Failed to create document version" });
  }
});

// Get document versions
router.get("/documents/:id/versions", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const versions = await coreStorage.getKnowledgeDocumentVersions(documentId);
    res.json(versions);
  } catch (error) {
    console.error("Error fetching document versions:", error);
    res.status(500).json({ error: "Failed to fetch document versions" });
  }
});

// Restore document version
router.post("/documents/:id/versions/:versionNumber/restore", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const versionNumber = parseInt(req.params.versionNumber);
    
    if (isNaN(documentId) || isNaN(versionNumber)) {
      return res.status(400).json({ error: "Invalid document ID or version number" });
    }

    const userId = req.user!.id;
    const restoredDocument = await coreStorage.restoreKnowledgeDocumentVersion(documentId, versionNumber, userId);
    
    res.json({
      success: true,
      message: `Document restored to version ${versionNumber}`,
      document: restoredDocument
    });
  } catch (error) {
    console.error("Error restoring document version:", error);
    if (error instanceof Error && error.message === 'Version not found') {
      return res.status(404).json({ error: "Version not found" });
    }
    res.status(500).json({ error: "Failed to restore document version" });
  }
});

// Attach document to objective/keyResult/task
router.post("/documents/:id/attach", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const { attachTo, targetId, entityType, entityId, notes } = req.body;
    const userId = req.user!.id;

    // Support both old (attachTo/targetId) and new (entityType/entityId) parameter formats
    const type = entityType || attachTo;
    const id = entityId || targetId;

    if (!type || !id) {
      return res.status(400).json({ error: "entityType and entityId are required" });
    }

    let attachment;
    switch (type) {
      case 'objective':
        attachment = await coreStorage.attachKnowledgeDocumentToObjective(documentId, id, userId, notes);
        break;
      case 'keyResult':
        attachment = await coreStorage.attachKnowledgeDocumentToKeyResult(documentId, id, userId, notes);
        break;
      case 'task':
        attachment = await coreStorage.attachKnowledgeDocumentToTask(documentId, id, userId, notes);
        break;
      case 'workItem':
        attachment = await coreStorage.attachKnowledgeDocumentToWorkItem(documentId, id, userId, notes);
        break;
      default:
        return res.status(400).json({ error: "Invalid entityType value. Must be 'objective', 'keyResult', 'task', or 'workItem'" });
    }

    res.status(201).json(attachment);
  } catch (error) {
    console.error("Error attaching document:", error);
    res.status(500).json({ error: "Failed to attach document" });
  }
});

// Detach document
router.delete("/documents/:id/attach/:attachmentId", authenticateToken, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: "Invalid attachment ID" });
    }

    const success = await coreStorage.detachKnowledgeDocument(attachmentId);
    if (!success) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error detaching document:", error);
    res.status(500).json({ error: "Failed to detach document" });
  }
});

// Get documents attached to an entity
router.get("/attachments/:type/:id", authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const targetId = parseInt(req.params.id);
    
    if (isNaN(targetId)) {
      return res.status(400).json({ error: "Invalid target ID" });
    }

    if (!['objective', 'keyResult', 'task', 'workItem'].includes(type)) {
      return res.status(400).json({ error: "Invalid type. Must be 'objective', 'keyResult', 'task', or 'workItem'" });
    }

    const attachedDocuments = await coreStorage.getAttachedDocuments(type as 'objective' | 'keyResult' | 'task' | 'workItem', targetId);
    res.json(attachedDocuments);
  } catch (error) {
    console.error("Error fetching attached documents:", error);
    res.status(500).json({ error: "Failed to fetch attached documents" });
  }
});

// Get document activity log
router.get("/documents/:id/activity", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const activity = await coreStorage.getDocumentActivity(documentId);
    res.json(activity);
  } catch (error) {
    console.error("Error fetching document activity:", error);
    res.status(500).json({ error: "Failed to fetch document activity" });
  }
});

// Document assignment endpoints

// Get document assignments (users assigned to a document)
router.get("/documents/:id/assignments", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const assignments = await coreStorage.getDocumentAssignments(documentId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching document assignments:", error);
    res.status(500).json({ error: "Failed to fetch document assignments" });
  }
});

// Create document assignment
router.post("/documents/:id/assignments", authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const { userId, dueDate } = req.body;
    const assignerId = req.user!.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const assignment = await coreStorage.createDocumentAssignment({
      documentId,
      userId,
      assignerId,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'assigned',
      assignedAt: new Date()
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating document assignment:", error);
    res.status(500).json({ error: "Failed to create document assignment" });
  }
});

// Delete document assignment
router.delete("/documents/:id/assignments/:assignmentId", authenticateToken, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const success = await coreStorage.deleteDocumentAssignment(assignmentId);
    if (!success) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting document assignment:", error);
    res.status(500).json({ error: "Failed to delete document assignment" });
  }
});

// Update assignment (status, assignee, due date, priority, etc.)
router.patch("/documents/:id/assignments/:assignmentId", authenticateToken, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const { status, completedAt, userId, dueDate, priority } = req.body;
    
    // Build updates object with only provided fields
    const updates: any = {};
    
    if (status !== undefined) {
      updates.status = status;
      if (status === 'completed' && !completedAt) {
        updates.completedAt = new Date();
      }
    }
    
    if (completedAt !== undefined) {
      updates.completedAt = completedAt;
    }
    
    if (userId !== undefined) {
      updates.userId = userId;
    }
    
    if (dueDate !== undefined) {
      updates.dueDate = dueDate;
    }
    
    if (priority !== undefined) {
      updates.priority = priority;
    }

    const assignment = await coreStorage.updateDocumentAssignment(assignmentId, updates);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json(assignment);
  } catch (error) {
    console.error("Error updating document assignment:", error);
    res.status(500).json({ error: "Failed to update document assignment" });
  }
});

// Get all document assignments for the organization (Team Progress view)
router.get('/assignments', authenticateToken, async (req, res) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'User organization not found' });
    }

    const assignments = await coreStorage.getAllDocumentAssignments(user.organizationId);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching all document assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Create document assignment (supports both users and teams)
router.post('/assignments', authenticateToken, async (req, res) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'User organization not found' });
    }

    const { userId, teamId, documentId, dueDate, priority } = req.body;
    const assignerId = user.id;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    if (!userId && !teamId) {
      return res.status(400).json({ error: 'Either userId or teamId is required' });
    }

    // Get document details for work item creation
    const document = await coreStorage.getKnowledgeDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If assigning to a team, create assignments for all team members
    if (teamId) {
      const members = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
      
      if (!members || members.length === 0) {
        return res.status(400).json({ error: 'Team has no members' });
      }

      const assignments = [];
      for (const member of members) {
        // Create document assignment
        const assignment = await coreStorage.createDocumentAssignment({
          documentId,
          userId: member.userId,
          assignerId,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: 'assigned',
          assignedAt: new Date()
        });

        // Create work item with training workflow
        const [workItem] = await db.insert(workItems).values({
          organizationId: user.organizationId,
          title: `Training: ${document.title}`,
          description: document.summary || `Complete training document: ${document.title}`,
          assignedTo: member.userId,
          dueDate: dueDate || null,
          workflowTemplateId: 'training-document-completion',
          workItemType: 'training',
          workflowSource: 'system',
          workflowMetadata: {
            documentId: documentId,
            assignmentId: assignment.id,
            priority: priority || 'medium',
            estimatedReadingTime: document.estimatedReadingTime,
            documentCategories: document.categories || [],
            documentMetadata: document.metadata
          },
          status: 'Ready',
          createdBy: assignerId
        }).returning();

        // Link work item back to assignment
        await db.update(documentAssignments)
          .set({ workItemId: workItem.id })
          .where(eq(documentAssignments.id, assignment.id));

        assignments.push({ ...assignment, workItemId: workItem.id });
      }

      return res.status(201).json({ 
        success: true, 
        count: assignments.length,
        assignments,
        message: `Training assigned to ${assignments.length} team member(s). They can complete it from their Work Items list.`
      });
    }

    // Assign to individual user
    const assignment = await coreStorage.createDocumentAssignment({
      documentId,
      userId,
      assignerId,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'assigned',
      assignedAt: new Date()
    });

    // Create work item with training workflow
    const [workItem] = await db.insert(workItems).values({
      organizationId: user.organizationId,
      title: `Training: ${document.title}`,
      description: document.summary || `Complete training document: ${document.title}`,
      assignedTo: userId,
      dueDate: dueDate || null,
      workflowTemplateId: 'training-document-completion',
      workItemType: 'training',
      workflowSource: 'system',
      workflowMetadata: {
        documentId: documentId,
        assignmentId: assignment.id,
        priority: priority || 'medium',
        estimatedReadingTime: document.estimatedReadingTime,
        documentCategories: document.categories || [],
        documentMetadata: document.metadata
      },
      status: 'Ready',
      createdBy: assignerId
    }).returning();

    // Link work item back to assignment
    await db.update(documentAssignments)
      .set({ workItemId: workItem.id })
      .where(eq(documentAssignments.id, assignment.id));

    res.status(201).json({ 
      ...assignment, 
      workItemId: workItem.id,
      message: 'Training assigned successfully. It can be completed from the Work Items list.'
    });
  } catch (error) {
    console.error('Error creating document assignment:', error);
    res.status(500).json({ error: 'Failed to create document assignment' });
  }
});

// Get team progress data (basic implementation)
router.get('/team-progress', authenticateToken, async (req, res) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'User organization not found' });
    }

    // For now, return basic progress data based on assignments
    // This can be enhanced later with completion tracking
    const assignments = await coreStorage.getAllDocumentAssignments(user.organizationId);
    
    // Group assignments by user to create progress data
    const progressByUser = assignments.reduce((acc: any, assignment: any) => {
      const userId = assignment.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId: userId,
          user: assignment.user,
          totalAssigned: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          assignments: []
        };
      }
      
      acc[userId].totalAssigned++;
      acc[userId].assignments.push(assignment);
      
      // Basic status tracking (can be enhanced)
      if (assignment.status === 'completed') {
        acc[userId].completed++;
      } else {
        acc[userId].inProgress++;
      }
      
      // Check if overdue
      if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
        acc[userId].overdue++;
      }
      
      return acc;
    }, {});

    const progressData = Object.values(progressByUser);
    res.json(progressData);
  } catch (error) {
    console.error('Error fetching team progress:', error);
    res.status(500).json({ error: 'Failed to fetch team progress' });
  }
});

// Alternative routes for compatibility with DocumentView component
// These routes serve the same data but with different URL structure for frontend compatibility

// Get single document for DocumentView component (mounted at /api/knowledge-base/documents/:id)
router.get('/documents/:id', authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const document = await coreStorage.getKnowledgeDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// Completion webhook for training workflow callbacks
// Called automatically when a training workflow is completed
// Uses internal webhook header verification instead of JWT auth
router.post('/assignments/complete-from-workflow', async (req, res) => {
  // Verify internal webhook header for security
  if (req.headers['x-internal-webhook'] !== 'true') {
    console.error('🎓 [Training Webhook] ❌ Unauthorized: Missing internal webhook header');
    return res.status(401).json({ error: 'Unauthorized: Internal webhooks only' });
  }
  
  try {
    console.log('🎓 [Training Webhook] Received completion callback');
    console.log('🎓 [Training Webhook] Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      organizationId,
      workItemId,
      acknowledgedUnderstanding,
      completionNotes,
      documentViewed
    } = req.body;

    console.log('🎓 [Training Webhook] Parsed fields:', {
      organizationId,
      workItemId,
      acknowledgedUnderstanding,
      completionNotes,
      documentViewed
    });

    if (!organizationId || !workItemId) {
      console.error('🎓 [Training Webhook] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: organizationId, workItemId' });
    }

    console.log(`🎓 [Training Webhook] Looking for assignment with workItemId: ${workItemId}, orgId: ${organizationId}`);

    // Find assignment by workItemId
    const [assignment] = await db
      .select()
      .from(documentAssignments)
      .where(
        and(
          eq(documentAssignments.organizationId, organizationId),
          eq(documentAssignments.workItemId, workItemId)
        )
      )
      .limit(1);

    if (!assignment) {
      console.error(`🎓 [Training Webhook] ❌ Assignment not found for workItemId: ${workItemId}, orgId: ${organizationId}`);
      
      // Debug: Check if assignment exists with different criteria
      const allAssignments = await db
        .select()
        .from(documentAssignments)
        .where(eq(documentAssignments.organizationId, organizationId))
        .limit(10);
      
      console.error(`🎓 [Training Webhook] Found ${allAssignments.length} assignments in org. Sample:`, 
        allAssignments.map(a => ({ id: a.id, workItemId: a.workItemId, status: a.status })));
      
      return res.status(404).json({ error: 'Training assignment not found' });
    }

    console.log(`🎓 [Training Webhook] ✅ Found assignment:`, {
      id: assignment.id,
      documentId: assignment.documentId,
      userId: assignment.userId,
      currentStatus: assignment.status,
      workItemId: assignment.workItemId
    });

    // Update assignment to completed
    console.log(`🎓 [Training Webhook] Updating assignment ${assignment.id} to completed...`);
    
    const [updatedAssignment] = await db
      .update(documentAssignments)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completionNotes: completionNotes || null,
        acknowledgedUnderstanding: acknowledgedUnderstanding || false,
        metadata: {
          completedViaWorkflow: true,
          completedIp: req.ip || req.socket.remoteAddress,
          completedTimestamp: new Date().toISOString()
        },
        updatedAt: new Date()
      })
      .where(eq(documentAssignments.id, assignment.id))
      .returning();

    console.log(`🎓 [Training Webhook] ✅ Successfully updated assignment ${assignment.id}:`, {
      oldStatus: assignment.status,
      newStatus: updatedAssignment.status,
      completedAt: updatedAssignment.completedAt,
      acknowledgedUnderstanding: updatedAssignment.acknowledgedUnderstanding
    });

    res.json({ 
      success: true, 
      assignment: updatedAssignment,
      message: 'Training marked as complete'
    });
  } catch (error) {
    console.error('🎓 [Training Webhook] ❌ Error completing training via workflow:', error);
    res.status(500).json({ error: 'Failed to complete training assignment' });
  }
});

export default router;