import { apiRequest } from '@/lib/queryClient';

// Types for work items
export interface WorkItem {
  id: number;
  organizationId: number;
  title: string;
  description?: string;
  status: 'Planning' | 'Ready' | 'In Progress' | 'Stuck' | 'Completed' | 'Archived';
  dueDate?: string;
  ownerId?: number;
  assignedTo?: number;
  attachments: any[];
  checkInCycleId?: number | null;
  keyResultTaskId?: number | null;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  // Workflow fields
  workflowTemplateId?: string | null;
  workflowSource?: string | null;
  workflowMetadata?: Record<string, any> | null;
  workItemType?: string | null;
  // Related data
  assignee?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  keyResultTask?: {
    id: number;
    title: string;
    keyResultId?: number;
  } | null;
  checkInCycle?: {
    id: number;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
  targetMeetingId?: number | null;
  targetMeeting?: {
    id: number;
    scheduledDate: string;
    status: string;
    teamId: number;
  } | null;
  teamId?: number | null;
  team?: {
    id: number;
    name: string;
  } | null;
}

export interface CheckInCycle {
  id: number;
  organizationId: number;
  objectiveId?: number;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'In Progress' | 'Review' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  fullName?: string;
  email: string;
  role: string;
}

export interface WorkItemFilters {
  status?: string[];
  origin?: 'All' | 'Ad-hoc' | 'KR Task';
  assigneeId?: number;
  ownerId?: number;
  dueFrom?: string;
  dueTo?: string;
  inCycle?: boolean;
  teamId?: number;
  workItemType?: string;
  workflowTemplateId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateWorkItemData {
  title: string;
  description?: string;
  status?: 'Planning' | 'Ready' | 'In Progress' | 'Stuck' | 'Completed' | 'Archived';
  dueDate?: string;
  assignedTo?: number;
  attachments?: any[];
  checkInCycleId?: number | null;
  keyResultTaskId?: number | null;
  teamId?: number | null;
  workflowTemplateId?: string | null;
  workflowSource?: string | null;
  workflowMetadata?: Record<string, any> | null;
  workItemType?: string | null;
}

export interface UpdateWorkItemData extends Partial<CreateWorkItemData> {}

export interface BulkUpdateData {
  ids: number[];
  set: {
    checkInCycleId?: number | null;
    status?: 'Planning' | 'Ready' | 'In Progress' | 'Stuck' | 'Completed' | 'Archived';
    assignedTo?: number | null;
    dueDate?: string | null;
    teamId?: number | null;
    workflowTemplateId?: string | null;
    workflowSource?: string | null;
    workflowMetadata?: Record<string, any> | null;
    workItemType?: string | null;
  };
}

// API functions
export async function fetchWorkItems(filters: WorkItemFilters = {}): Promise<WorkItem[]> {
  const token = localStorage.getItem('authToken');
  const params = new URLSearchParams();
  
  if (filters.status && filters.status.length > 0) {
    params.append('status', filters.status.join(','));
  }
  if (filters.origin && filters.origin !== 'All') {
    params.append('origin', filters.origin);
  }
  if (filters.assigneeId) {
    params.append('assigneeId', filters.assigneeId.toString());
  }
  if (filters.ownerId) {
    params.append('ownerId', filters.ownerId.toString());
  }
  if (filters.dueFrom) {
    params.append('dueFrom', filters.dueFrom);
  }
  if (filters.dueTo) {
    params.append('dueTo', filters.dueTo);
  }
  if (filters.inCycle !== undefined) {
    params.append('inCycle', filters.inCycle.toString());
  }
  if (filters.teamId) {
    params.append('teamId', filters.teamId.toString());
  }
  if (filters.workItemType) {
    params.append('workItemType', filters.workItemType);
  }
  if (filters.workflowTemplateId) {
    params.append('workflowTemplateId', filters.workflowTemplateId);
  }
  if (filters.page) {
    params.append('page', filters.page.toString());
  }
  if (filters.pageSize) {
    params.append('pageSize', filters.pageSize.toString());
  }
  
  const queryString = params.toString();
  const url = `/api/work-items${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch work items');
  }
  
  return response.json();
}

export async function createWorkItem(data: CreateWorkItemData): Promise<WorkItem> {
  console.log('[createWorkItem] Starting with data:', data);
  const token = localStorage.getItem('authToken');
  console.log('[createWorkItem] Auth token:', token ? 'present' : 'missing');
  
  const response = await fetch('/api/work-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  console.log('[createWorkItem] Response status:', response.status);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[createWorkItem] Error response:', errorData);
    throw new Error(errorData.error || 'Failed to create work item');
  }
  
  const result = await response.json();
  console.log('[createWorkItem] Success:', result);
  return result;
}

export async function updateWorkItem(id: number, data: UpdateWorkItemData): Promise<WorkItem> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/work-items/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Update work item error:', errorData);
    throw new Error(errorData.error || 'Failed to update work item');
  }
  
  return response.json();
}

export async function bulkUpdateWorkItems(data: BulkUpdateData): Promise<{ success: boolean; updated: number; items: WorkItem[] }> {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/work-items/bulk', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to bulk update work items');
  }
  
  return response.json();
}

export async function fetchCheckInCycles(status?: string[]): Promise<CheckInCycle[]> {
  const token = localStorage.getItem('authToken');
  const params = new URLSearchParams();
  if (status && status.length > 0) {
    params.append('status', status.join(','));
  }
  
  const queryString = params.toString();
  const url = `/api/work-items/check-in-cycles${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch check-in cycles');
  }
  
  return response.json();
}

export async function fetchActiveUsers(): Promise<User[]> {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/work-items/users?active=true', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
}

// Search functions for linking
export async function searchKeyResultTasks(query: string): Promise<{ id: number; title: string; keyResultId: number }[]> {
  // This would need a backend endpoint to search KR tasks
  // For now, return empty array
  return [];
}

// Delete a work item
export async function deleteWorkItem(id: number): Promise<void> {
  const response = await apiRequest(`/api/work-items/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete work item');
  }
  
  return response.json();
}