import { Router } from "express";
import { eq, desc, and, or, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { coreStorage } from "../core-storage";
import { authenticateToken, requireRole } from "../auth";
import { z } from "zod";
import { insertKnowledgeDocumentSchema, insertKnowledgeCategorySchema, User, teamMembers, workItems, documentAssignments, trainingQuizQuestions } from "../../shared/schema";

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

// ========================================
// KNOWLEDGE HUB V3 - FOLDERS
// ========================================

// Get all folders (optionally filtered by parent)
router.get("/folders", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { parentId } = req.query;
    
    let parent: number | null | undefined = undefined;
    if (parentId === 'null' || parentId === 'root') {
      parent = null;
    } else if (parentId) {
      parent = parseInt(parentId as string);
    }
    
    const folders = await coreStorage.getKnowledgeFolders(organizationId, parent);
    res.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

// Get single folder with its documents
router.get("/folders/:id", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const folderId = parseInt(req.params.id);
    if (isNaN(folderId)) {
      return res.status(400).json({ error: "Invalid folder ID" });
    }

    const result = await coreStorage.getFolderWithDocuments(folderId, organizationId);
    if (!result) {
      return res.status(404).json({ error: "Folder not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).json({ error: "Failed to fetch folder" });
  }
});

// Create folder
router.post("/folders", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { name, description, parentId, folderType, icon, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const folder = await coreStorage.createKnowledgeFolder({
      organizationId,
      name,
      slug,
      description,
      parentId: parentId || null,
      folderType: folderType || 'general',
      icon,
      color,
      createdBy: req.user!.id
    });
    
    res.status(201).json(folder);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// Update folder
router.put("/folders/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const folderId = parseInt(req.params.id);
    if (isNaN(folderId)) {
      return res.status(400).json({ error: "Invalid folder ID" });
    }

    const updates = req.body;
    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    
    const folder = await coreStorage.updateKnowledgeFolder(folderId, organizationId, updates);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    res.json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// Delete folder
router.delete("/folders/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const folderId = parseInt(req.params.id);
    if (isNaN(folderId)) {
      return res.status(400).json({ error: "Invalid folder ID" });
    }

    const success = await coreStorage.deleteKnowledgeFolder(folderId, organizationId);
    if (!success) {
      return res.status(404).json({ error: "Folder not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

// ========================================
// KNOWLEDGE HUB V3 - DOCUMENT MANAGEMENT
// ========================================

// Bulk move documents to folder
router.patch("/documents/bulk-move", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { documentIds, folderId } = req.body;
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: "documentIds must be a non-empty array" });
    }
    
    // Validate all documents belong to this organization
    const results = await Promise.all(
      documentIds.map(async (docId: number) => {
        const doc = await coreStorage.getKnowledgeDocument(docId);
        if (!doc || doc.organizationId !== organizationId) {
          return { id: docId, success: false, error: "Document not found" };
        }
        
        const updated = await coreStorage.updateKnowledgeDocument(docId, { 
          folderId: folderId || null 
        }, req.user!.id);
        
        return { id: docId, success: !!updated };
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      moved: successCount, 
      total: documentIds.length,
      results 
    });
  } catch (error) {
    console.error("Error bulk moving documents:", error);
    res.status(500).json({ error: "Failed to move documents" });
  }
});

// Move single document to folder
router.patch("/documents/:id/move", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }
    
    const { folderId } = req.body;
    
    // Verify document ownership
    const doc = await coreStorage.getKnowledgeDocument(documentId);
    if (!doc || doc.organizationId !== organizationId) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // If folderId provided, verify folder exists and belongs to org
    if (folderId) {
      const folders = await coreStorage.getKnowledgeFolders(organizationId);
      const folder = folders.find(f => f.id === folderId);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }
    }
    
    const updated = await coreStorage.updateKnowledgeDocument(documentId, { 
      folderId: folderId || null 
    }, req.user!.id);
    
    if (!updated) {
      return res.status(500).json({ error: "Failed to move document" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error moving document:", error);
    res.status(500).json({ error: "Failed to move document" });
  }
});

// ========================================
// KNOWLEDGE HUB V3 - TRAINING MODULE STEPS
// ========================================

// Helper function to verify document ownership
async function verifyDocumentOwnership(documentId: number, organizationId: number): Promise<boolean> {
  const document = await coreStorage.getKnowledgeDocument(documentId);
  return document?.organizationId === organizationId;
}

// Helper function to verify step ownership via its document
async function verifyStepOwnership(stepId: number, organizationId: number): Promise<boolean> {
  const step = await coreStorage.getTrainingModuleStep(stepId);
  if (!step) return false;
  return verifyDocumentOwnership(step.documentId, organizationId);
}

// Get training steps for a document
router.get("/documents/:id/training-steps", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!await verifyDocumentOwnership(documentId, organizationId)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const steps = await coreStorage.getTrainingModuleSteps(documentId);
    res.json(steps);
  } catch (error) {
    console.error("Error fetching training steps:", error);
    res.status(500).json({ error: "Failed to fetch training steps" });
  }
});

// Create training step
router.post("/documents/:id/training-steps", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!await verifyDocumentOwnership(documentId, organizationId)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const existingSteps = await coreStorage.getTrainingModuleSteps(documentId);
    const stepOrder = existingSteps.length + 1;
    
    const step = await coreStorage.createTrainingModuleStep({
      documentId,
      stepOrder,
      ...req.body
    });
    
    res.status(201).json(step);
  } catch (error) {
    console.error("Error creating training step:", error);
    res.status(500).json({ error: "Failed to create training step" });
  }
});

// Update training step
router.put("/training-steps/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const stepId = parseInt(req.params.id);
    if (isNaN(stepId)) {
      return res.status(400).json({ error: "Invalid step ID" });
    }

    if (!await verifyStepOwnership(stepId, organizationId)) {
      return res.status(404).json({ error: "Step not found" });
    }

    const step = await coreStorage.updateTrainingModuleStep(stepId, req.body);
    if (!step) {
      return res.status(404).json({ error: "Step not found" });
    }

    res.json(step);
  } catch (error) {
    console.error("Error updating training step:", error);
    res.status(500).json({ error: "Failed to update training step" });
  }
});

// Delete training step
router.delete("/training-steps/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const stepId = parseInt(req.params.id);
    if (isNaN(stepId)) {
      return res.status(400).json({ error: "Invalid step ID" });
    }

    if (!await verifyStepOwnership(stepId, organizationId)) {
      return res.status(404).json({ error: "Step not found" });
    }

    const success = await coreStorage.deleteTrainingModuleStep(stepId);
    if (!success) {
      return res.status(404).json({ error: "Step not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting training step:", error);
    res.status(500).json({ error: "Failed to delete training step" });
  }
});

// Reorder training steps
router.put("/documents/:id/training-steps/reorder", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!await verifyDocumentOwnership(documentId, organizationId)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const { stepIds } = req.body;
    if (!stepIds || !Array.isArray(stepIds)) {
      return res.status(400).json({ error: "stepIds array is required" });
    }

    await coreStorage.reorderTrainingModuleSteps(documentId, stepIds);
    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering training steps:", error);
    res.status(500).json({ error: "Failed to reorder training steps" });
  }
});

// ========================================
// KNOWLEDGE HUB V3 - QUIZ QUESTIONS
// ========================================

// Get quiz questions for a step
router.get("/training-steps/:id/questions", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const stepId = parseInt(req.params.id);
    if (isNaN(stepId)) {
      return res.status(400).json({ error: "Invalid step ID" });
    }

    if (!await verifyStepOwnership(stepId, organizationId)) {
      return res.status(404).json({ error: "Step not found" });
    }

    const questions = await coreStorage.getQuizQuestions(stepId);
    res.json(questions);
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    res.status(500).json({ error: "Failed to fetch quiz questions" });
  }
});

// Create quiz question
router.post("/training-steps/:id/questions", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const stepId = parseInt(req.params.id);
    if (isNaN(stepId)) {
      return res.status(400).json({ error: "Invalid step ID" });
    }

    if (!await verifyStepOwnership(stepId, organizationId)) {
      return res.status(404).json({ error: "Step not found" });
    }

    const existingQuestions = await coreStorage.getQuizQuestions(stepId);
    const questionOrder = existingQuestions.length + 1;
    
    const question = await coreStorage.createQuizQuestion({
      stepId,
      questionOrder,
      ...req.body
    });
    
    res.status(201).json(question);
  } catch (error) {
    console.error("Error creating quiz question:", error);
    res.status(500).json({ error: "Failed to create quiz question" });
  }
});

// Helper function to verify quiz question ownership via step -> document chain
async function verifyQuestionOwnership(questionId: number, organizationId: number): Promise<boolean> {
  const questions = await db.select()
    .from(trainingQuizQuestions)
    .where(eq(trainingQuizQuestions.id, questionId))
    .limit(1);
  
  if (questions.length === 0) return false;
  return verifyStepOwnership(questions[0].stepId, organizationId);
}

// Update quiz question
router.put("/quiz-questions/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const questionId = parseInt(req.params.id);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question ID" });
    }

    if (!await verifyQuestionOwnership(questionId, organizationId)) {
      return res.status(404).json({ error: "Question not found" });
    }

    const question = await coreStorage.updateQuizQuestion(questionId, req.body);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    console.error("Error updating quiz question:", error);
    res.status(500).json({ error: "Failed to update quiz question" });
  }
});

// Delete quiz question
router.delete("/quiz-questions/:id", authenticateToken, requireRole(["admin", "super_admin", "manager"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const questionId = parseInt(req.params.id);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question ID" });
    }

    if (!await verifyQuestionOwnership(questionId, organizationId)) {
      return res.status(404).json({ error: "Question not found" });
    }

    const success = await coreStorage.deleteQuizQuestion(questionId);
    if (!success) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting quiz question:", error);
    res.status(500).json({ error: "Failed to delete quiz question" });
  }
});

// ========================================
// KNOWLEDGE HUB V3 - USER TRAINING PROGRESS
// ========================================

// Get user's training progress for a document
router.get("/documents/:id/my-progress", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!await verifyDocumentOwnership(documentId, organizationId)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const progress = await coreStorage.getTrainingProgress(req.user!.id, documentId);
    res.json(progress || { status: 'not_started' });
  } catch (error) {
    console.error("Error fetching training progress:", error);
    res.status(500).json({ error: "Failed to fetch training progress" });
  }
});

// Start or update training progress
router.post("/documents/:id/progress", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!await verifyDocumentOwnership(documentId, organizationId)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const existingProgress = await coreStorage.getTrainingProgress(req.user!.id, documentId);
    
    if (existingProgress) {
      const updated = await coreStorage.updateTrainingProgress(existingProgress.id, req.body);
      res.json(updated);
    } else {
      const created = await coreStorage.createTrainingProgress({
        documentId,
        userId: req.user!.id,
        status: 'in_progress',
        startedAt: new Date(),
        ...req.body
      });
      res.status(201).json(created);
    }
  } catch (error) {
    console.error("Error updating training progress:", error);
    res.status(500).json({ error: "Failed to update training progress" });
  }
});

// Get user's total points
router.get("/my-points", authenticateToken, async (req, res) => {
  try {
    const points = await coreStorage.getUserPoints(req.user!.id);
    res.json(points || { totalPoints: 0 });
  } catch (error) {
    console.error("Error fetching user points:", error);
    res.status(500).json({ error: "Failed to fetch user points" });
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

// Get current user's document assignments (My Training view)
router.get('/my-assignments', authenticateToken, async (req, res) => {
  try {
    const user = req.user as User;
    if (!user?.id) {
      return res.status(400).json({ error: 'User not found' });
    }

    const assignments = await coreStorage.getUserDocumentAssignments(user.id);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching user document assignments:', error);
    res.status(500).json({ error: 'Failed to fetch your assignments' });
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

// ========================================
// AI COMPOSE ENDPOINTS
// ========================================

import { OpenAIService } from '../services/integrations/openaiService';

// Generate document outline
router.post("/documents/ai/generate-outline", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { topic, documentType, audience } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const openai = new OpenAIService(organizationId);
    await openai.initialize();

    const systemPrompt = `You are a professional technical writer helping create knowledge base documentation. Generate a structured outline for the given topic. The outline should be practical, actionable, and appropriate for the specified audience.

Format your response as a clean HTML structure that can be directly used in a rich text editor. Use proper heading hierarchy (h2, h3) and bullet points (ul, li).`;

    const userPrompt = `Create a detailed outline for a ${documentType || 'knowledge article'} about: "${topic}"
${audience ? `Target audience: ${audience}` : ''}

The outline should include:
- A clear introduction section
- 3-5 main sections with subsections
- Practical tips or best practices
- A conclusion or summary section`;

    const response = await openai.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1500
    });

    const outline = response.choices[0]?.message?.content || '';

    res.json({ 
      success: true, 
      outline,
      topic 
    });
  } catch (error: any) {
    console.error("Error generating outline:", error);
    if (error.message?.includes('integration not configured') || error.message?.includes('credentials not configured')) {
      return res.status(400).json({ error: "OpenAI integration not configured. Please set up OpenAI in Integrations." });
    }
    res.status(500).json({ error: "Failed to generate outline" });
  }
});

// Expand section with AI
router.post("/documents/ai/expand-section", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { section, context, tone } = req.body;

    if (!section) {
      return res.status(400).json({ error: "Section content is required" });
    }

    const openai = new OpenAIService(organizationId);
    await openai.initialize();

    const systemPrompt = `You are a professional technical writer. Expand the given section heading or brief content into detailed, well-written documentation. Write in a ${tone || 'professional'} tone. Format your response as clean HTML suitable for a rich text editor.`;

    const userPrompt = `Expand this section into detailed content:
"${section}"

${context ? `Additional context: ${context}` : ''}

Write 2-4 paragraphs with practical, actionable information. Include examples where relevant.`;

    const response = await openai.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content || '';

    res.json({ 
      success: true, 
      content 
    });
  } catch (error: any) {
    console.error("Error expanding section:", error);
    if (error.message?.includes('integration not configured') || error.message?.includes('credentials not configured')) {
      return res.status(400).json({ error: "OpenAI integration not configured. Please set up OpenAI in Integrations." });
    }
    res.status(500).json({ error: "Failed to expand section" });
  }
});

// Improve writing
router.post("/documents/ai/improve-writing", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { content, instruction } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const openai = new OpenAIService(organizationId);
    await openai.initialize();

    const systemPrompt = `You are an expert editor helping improve documentation quality. Apply the requested improvements while preserving the original meaning and key information. Return clean HTML suitable for a rich text editor.`;

    const userPrompt = `${instruction || 'Improve the clarity and readability of this content'}:

${content}`;

    const response = await openai.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-4',
      temperature: 0.5,
      max_tokens: 2000
    });

    const improved = response.choices[0]?.message?.content || '';

    res.json({ 
      success: true, 
      content: improved 
    });
  } catch (error: any) {
    console.error("Error improving writing:", error);
    if (error.message?.includes('integration not configured') || error.message?.includes('credentials not configured')) {
      return res.status(400).json({ error: "OpenAI integration not configured. Please set up OpenAI in Integrations." });
    }
    res.status(500).json({ error: "Failed to improve writing" });
  }
});

export default router;