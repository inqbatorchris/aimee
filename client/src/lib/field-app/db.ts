/**
 * IndexedDB wrapper for Field App
 * Stores work items, templates, and photos as blobs
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema definition
interface FieldAppDB extends DBSchema {
  session: {
    key: string;
    value: {
      token: string;
      userId: number;
      email: string;
      organizationId: number;
      downloadedAt: Date;
    };
  };
  
  settings: {
    key: string;
    value: {
      workMode: 'online' | 'offline';
      lastChanged: Date;
    };
  };
  
  workItems: {
    key: number;
    value: {
      id: number;
      title: string;
      description?: string;
      status: string;
      priority: string;
      location?: string;
      assigneeId: number;
      assigneeName?: string;
      dueDate?: string;
      notes?: string;
      workflowTemplateId?: string;
      organizationId: number;
      localEdits?: {
        notes?: string;
        status?: string;
        updatedAt: Date;
      };
    };
    indexes: {
      'by-status': string;
      'by-assignee': number;
      'by-template': string;
    };
  };
  
  workflowTemplates: {
    key: string;
    value: {
      id: string;
      name: string;
      category?: string;
      steps: Array<{
        id: string;
        title?: string;
        label?: string;
        description?: string;
        type: 'checklist' | 'form' | 'photo' | 'signature' | 'measurement' | 'notes' | 'text_input' | 'fiber_network_node';
        required: boolean;
        order: number;
        config?: any;
        checklistItems?: Array<{
          id: string;
          name: string;
          checked: boolean;
        }>;
        formFields?: Array<{
          id: string;
          label: string;
          type: 'text' | 'number' | 'select' | 'textarea' | 'date';
          required: boolean;
          options?: string[];
        }>;
        photoConfig?: {
          minPhotos: number;
          maxPhotos: number;
          required: boolean;
        };
      }>;
    };
  };
  
  workflowExecutions: {
    key: string; // workItemId-templateId
    value: {
      workItemId: number;
      templateId: string;
      currentStepId?: string;
      completedSteps: string[];
      stepData: Record<string, any>;
      startedAt: Date;
      completedAt?: Date;
    };
  };
  
  photos: {
    key: string; // uuid
    value: {
      id: string;
      workItemId: number;
      stepId?: string;
      arrayBuffer?: ArrayBuffer; // New: Store as ArrayBuffer for better iOS Safari compatibility
      blob?: Blob; // Legacy: Keep for backward compatibility with existing stored photos
      fileName: string;
      mimeType: string;
      size: number;
      capturedAt: Date;
      uploadedAt?: Date;
      uploadedBy?: number;
    };
    indexes: {
      'by-work-item': number;
    };
  };
  
  syncQueue: {
    key: number;
    value: {
      id?: number;
      type: 'workItem' | 'workflowStep' | 'photo' | 'fiberNetworkNode';
      action: 'update' | 'create';
      entityId: string | number;
      data: any;
      timestamp: Date;
      retryCount: number;
      syncStatus: 'pending' | 'syncing' | 'failed';
    };
    indexes: {
      'by-status': string;
      'by-timestamp': Date;
    };
  };

  fiberNetworkNodes: {
    key: string; // uuid for offline created nodes
    value: {
      id: string; // Temporary UUID for offline, becomes server ID after sync
      workItemId: number;
      name: string;
      nodeType: string;
      network: string;
      status: string;
      latitude: number;
      longitude: number;
      what3words?: string;
      address?: string;
      notes?: string;
      photos?: string[]; // Array of photo IDs
      createdAt: Date;
      syncedToServer: boolean;
      serverId?: number; // Set after successful sync
    };
    indexes: {
      'by-work-item': number;
      'by-sync-status': boolean;
    };
  };
}

const DB_NAME = 'FieldAppDB';
const DB_VERSION = 3; // Incremented for fiber network nodes store

class FieldDatabase {
  private db: IDBPDatabase<FieldAppDB> | null = null;
  
  async init(): Promise<void> {
    if (this.db) return;
    
    this.db = await openDB<FieldAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Session store (single record)
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session');
        }
        
        // Settings store (single record)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        
        // Work items store
        if (!db.objectStoreNames.contains('workItems')) {
          const workItemStore = db.createObjectStore('workItems', { keyPath: 'id' });
          workItemStore.createIndex('by-status', 'status');
          workItemStore.createIndex('by-assignee', 'assigneeId');
          workItemStore.createIndex('by-template', 'workflowTemplateId');
        }
        
        // Workflow templates store
        if (!db.objectStoreNames.contains('workflowTemplates')) {
          db.createObjectStore('workflowTemplates', { keyPath: 'id' });
        }
        
        // Workflow executions store
        if (!db.objectStoreNames.contains('workflowExecutions')) {
          db.createObjectStore('workflowExecutions', { 
            keyPath: ['workItemId', 'templateId'] 
          });
        }
        
        // Photos store (blobs)
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('by-work-item', 'workItemId');
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          syncStore.createIndex('by-status', 'syncStatus');
          syncStore.createIndex('by-timestamp', 'timestamp');
        }

        // Fiber network nodes store
        if (!db.objectStoreNames.contains('fiberNetworkNodes')) {
          const fiberNodeStore = db.createObjectStore('fiberNetworkNodes', { keyPath: 'id' });
          fiberNodeStore.createIndex('by-work-item', 'workItemId');
          fiberNodeStore.createIndex('by-sync-status', 'syncedToServer');
        }
      }
    });
  }
  
  private async ensureDB(): Promise<IDBPDatabase<FieldAppDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }
  
  // Session management
  async saveSession(session: FieldAppDB['session']['value']): Promise<void> {
    const db = await this.ensureDB();
    await db.put('session', session, 'current');
  }
  
  async getSession(): Promise<FieldAppDB['session']['value'] | undefined> {
    const db = await this.ensureDB();
    return db.get('session', 'current');
  }
  
  async clearSession(): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('session', 'current');
  }
  
  // Settings management
  async saveSettings(settings: FieldAppDB['settings']['value']): Promise<void> {
    const db = await this.ensureDB();
    await db.put('settings', settings, 'current');
  }
  
  async getSettings(): Promise<FieldAppDB['settings']['value'] | undefined> {
    const db = await this.ensureDB();
    return db.get('settings', 'current');
  }
  
  // Work items
  async saveWorkItems(items: FieldAppDB['workItems']['value'][]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('workItems', 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  }
  
  async getWorkItems(): Promise<FieldAppDB['workItems']['value'][]> {
    const db = await this.ensureDB();
    return db.getAll('workItems');
  }
  
  async getWorkItem(id: number): Promise<FieldAppDB['workItems']['value'] | undefined> {
    const db = await this.ensureDB();
    return db.get('workItems', id);
  }
  
  async updateWorkItem(id: number, updates: Partial<FieldAppDB['workItems']['value']>): Promise<void> {
    const db = await this.ensureDB();
    const item = await db.get('workItems', id);
    if (!item) throw new Error(`Work item ${id} not found`);
    
    // Track local edits
    const updatedItem = {
      ...item,
      ...updates,
      localEdits: {
        ...updates,
        updatedAt: new Date()
      }
    };
    
    await db.put('workItems', updatedItem);
    
    // Add to sync queue
    await this.addToSyncQueue('workItem', 'update', id, updatedItem);
  }
  
  // Workflow templates
  async saveTemplates(templates: FieldAppDB['workflowTemplates']['value'][]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('workflowTemplates', 'readwrite');
    await Promise.all(templates.map(template => tx.store.put(template)));
    await tx.done;
  }
  
  async getTemplate(id: string): Promise<FieldAppDB['workflowTemplates']['value'] | undefined> {
    const db = await this.ensureDB();
    return db.get('workflowTemplates', id);
  }
  
  // Workflow execution
  async saveWorkflowExecution(execution: FieldAppDB['workflowExecutions']['value']): Promise<void> {
    const db = await this.ensureDB();
    const key = `${execution.workItemId}-${execution.templateId}`;
    await db.put('workflowExecutions', execution);
  }
  
  async getWorkflowExecution(workItemId: number, templateId: string): Promise<FieldAppDB['workflowExecutions']['value'] | undefined> {
    const db = await this.ensureDB();
    const key = `${workItemId}-${templateId}`;
    return db.get('workflowExecutions', [workItemId, templateId] as any);
  }
  
  async updateWorkflowStep(
    workItemId: number, 
    templateId: string, 
    stepId: string, 
    data: any
  ): Promise<void> {
    const db = await this.ensureDB();
    
    let execution = await this.getWorkflowExecution(workItemId, templateId);
    
    if (!execution) {
      execution = {
        workItemId,
        templateId,
        currentStepId: stepId,
        completedSteps: [],
        stepData: {},
        startedAt: new Date()
      };
    }
    
    // Update step data
    execution.stepData[stepId] = data;
    execution.currentStepId = stepId;
    
    if (!execution.completedSteps.includes(stepId) && data.completed) {
      execution.completedSteps.push(stepId);
    }
    
    await this.saveWorkflowExecution(execution);
    
    // Get the template to find the step index
    const template = await this.getTemplate(templateId);
    const stepIndex = template?.steps?.findIndex((s: any) => s.id === stepId) ?? 0;
    
    // Convert photo IDs to base64 data for sync
    const photoData: any[] = [];
    if (data.photos && Array.isArray(data.photos)) {
      for (const photoId of data.photos) {
        const photo = await this.getPhoto(photoId);
        if (photo) {
          // Handle both new ArrayBuffer format and legacy Blob format
          let blob: Blob;
          if (photo.arrayBuffer) {
            blob = new Blob([photo.arrayBuffer], { type: photo.mimeType });
          } else if (photo.blob) {
            blob = photo.blob;
          } else {
            console.error('Photo has neither arrayBuffer nor blob:', photo.id);
            continue;
          }
          
          const base64 = await this.blobToBase64(blob);
          photoData.push({
            data: base64,
            fileName: photo.fileName,
            timestamp: photo.capturedAt.toISOString(),
            uploadedBy: photo.uploadedBy,
            fileSize: photo.size
          });
        }
      }
    }
    
    // Add to sync queue with all needed data for server
    await this.addToSyncQueue('workflowStep', 'update', `${workItemId}-${stepId}`, {
      workItemId,
      stepIndex, // Server needs this!
      stepId,
      status: data.completed ? 'completed' : 'in_progress',
      notes: data.notes,
      evidence: {
        checklistState: data.checklist || {},
        photos: photoData,
        formData: data.form || {},
        ...data.evidence
      }
    });
  }
  
  // Helper: Convert blob to base64
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Photos (stored as ArrayBuffer for iOS Safari compatibility)
  async savePhoto(
    workItemId: number,
    blob: Blob,
    fileName: string,
    stepId?: string,
    uploadedAt?: Date,
    uploadedBy?: number,
    skipSyncQueue: boolean = false  // Don't queue already-synced photos from server
  ): Promise<string> {
    const db = await this.ensureDB();
    
    // Generate unique ID
    const id = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert Blob to ArrayBuffer for reliable IndexedDB storage (iOS Safari fix)
    const arrayBuffer = await blob.arrayBuffer();
    
    const photo: FieldAppDB['photos']['value'] = {
      id,
      workItemId,
      stepId,
      arrayBuffer,
      fileName,
      mimeType: blob.type,
      size: blob.size,
      capturedAt: new Date(),
      uploadedAt,
      uploadedBy
    };
    
    await db.put('photos', photo);
    
    // Only add to sync queue if this is a newly captured photo (not downloaded from server)
    if (!skipSyncQueue) {
      await this.addToSyncQueue('photo', 'create', id, {
        workItemId,
        stepId,
        fileName,
        mimeType: blob.type,
        size: blob.size
      });
    }
    
    return id;
  }
  
  async getPhotos(workItemId: number): Promise<FieldAppDB['photos']['value'][]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('photos', 'by-work-item', workItemId);
  }
  
  async getPhoto(id: string): Promise<FieldAppDB['photos']['value'] | undefined> {
    const db = await this.ensureDB();
    return db.get('photos', id);
  }
  
  // Sync queue management
  async addToSyncQueue(
    type: FieldAppDB['syncQueue']['value']['type'],
    action: FieldAppDB['syncQueue']['value']['action'],
    entityId: string | number,
    data: any
  ): Promise<void> {
    const db = await this.ensureDB();
    
    await db.add('syncQueue', {
      type,
      action,
      entityId,
      data,
      timestamp: new Date(),
      retryCount: 0,
      syncStatus: 'pending'
    });
  }
  
  async getSyncQueue(): Promise<FieldAppDB['syncQueue']['value'][]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('syncQueue', 'by-status', 'pending');
  }
  
  async markSynced(queueIds: number[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    await Promise.all(queueIds.map(id => tx.store.delete(id)));
    await tx.done;
  }
  
  // Fiber network nodes management
  async saveFiberNetworkNode(node: FieldAppDB['fiberNetworkNodes']['value']): Promise<void> {
    const db = await this.ensureDB();
    await db.put('fiberNetworkNodes', node);
  }

  async getFiberNetworkNodes(workItemId: number): Promise<FieldAppDB['fiberNetworkNodes']['value'][]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('fiberNetworkNodes', 'by-work-item', workItemId);
  }

  async getAllUnsyncedFiberNodes(): Promise<FieldAppDB['fiberNetworkNodes']['value'][]> {
    const db = await this.ensureDB();
    // Return ALL fiber nodes created locally (both synced and unsynced)
    // This allows users to see their locally-created nodes even after sync
    return db.getAll('fiberNetworkNodes');
  }

  async markFiberNodeAsSynced(localId: string, serverId: number): Promise<void> {
    const db = await this.ensureDB();
    const node = await db.get('fiberNetworkNodes', localId);
    
    if (node) {
      await db.put('fiberNetworkNodes', {
        ...node,
        syncedToServer: true,
        serverId
      });
    }
  }

  async deleteFiberNetworkNode(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('fiberNetworkNodes', id);
  }

  // Database statistics
  async getStats(): Promise<{
    workItems: number;
    templates: number;
    photos: number;
    fiberNodes: number;
    pendingSync: number;
    storageUsed?: number;
  }> {
    const db = await this.ensureDB();
    
    const [workItems, templates, photos, fiberNodes, pendingSync] = await Promise.all([
      db.count('workItems'),
      db.count('workflowTemplates'),
      db.count('photos'),
      db.count('fiberNetworkNodes'),
      db.count('syncQueue')
    ]);
    
    // Try to estimate storage if available
    let storageUsed: number | undefined;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      storageUsed = estimate.usage;
    }
    
    return { workItems, templates, photos, fiberNodes, pendingSync, storageUsed };
  }
  
  // Clear cache (manual only, as requested)
  // Improved version with better error handling and batched operations
  async clearCache(): Promise<{
    cleared: string[];
    failed: string[];
    errors: Record<string, string>;
  }> {
    const db = await this.ensureDB();
    
    const storesToClear = [
      'workItems', 
      'workflowTemplates', 
      'workflowExecutions', 
      'photos', 
      'syncQueue',
      'fiberNetworkNodes'
    ] as const;
    
    const cleared: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};
    
    // Clear each store individually for precise error reporting
    // This ensures we know exactly which stores failed
    for (const store of storesToClear) {
      try {
        const tx = db.transaction([store as any], 'readwrite');
        await tx.objectStore(store as any).clear();
        await tx.done;
        cleared.push(store);
        console.log(`[FieldDB] Cleared store: ${store}`);
      } catch (error: any) {
        failed.push(store);
        errors[store] = error.message || 'Unknown error';
        console.error(`[FieldDB] Failed to clear ${store}:`, error);
      }
    }
    
    console.log('[FieldDB] Cache cleared:', { cleared, failed, errors });
    
    return { cleared, failed, errors };
  }
}

// Export singleton instance
export const fieldDB = new FieldDatabase();