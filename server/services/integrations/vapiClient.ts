import axios, { AxiosInstance } from 'axios';

// Vapi API Types
export interface VapiAssistant {
  id?: string;
  name: string;
  model: {
    provider: string;
    model: string;
    messages?: Array<{ role: string; content: string }>;
    temperature?: number;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  endCallFunctionEnabled?: boolean;
  endCallMessage?: string;
  recordingEnabled?: boolean;
  transcriber?: {
    provider: string;
    model?: string;
    language?: string;
  };
}

export interface VapiCall {
  id: string;
  assistantId?: string;
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  phoneNumberId?: string;
  customer?: {
    number?: string;
    name?: string;
  };
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  costBreakdown?: {
    transport?: number;
    stt?: number;
    llm?: number;
    tts?: number;
    vapi?: number;
    total?: number;
  };
  messages?: Array<{
    role: 'assistant' | 'user' | 'system' | 'tool_calls' | 'tool_call_result';
    message?: string;
    time?: number;
    endTime?: number;
    secondsFromStart?: number;
  }>;
  transcript?: string;
  recordingUrl?: string;
  analysis?: {
    summary?: string;
    successEvaluation?: string;
  };
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  provider: string;
  assistantId?: string;
  name?: string;
}

export interface VapiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Vapi API Client
 * Handles all communication with Vapi.ai platform
 */
export class VapiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Vapi API key is required');
    }
    
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.vapi.ai',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // ============================================================================
  // Assistant Management
  // ============================================================================

  /**
   * Create a new assistant on Vapi platform
   */
  async createAssistant(assistant: VapiAssistant): Promise<VapiAssistant> {
    const response = await this.client.post('/assistant', assistant);
    return response.data;
  }

  /**
   * Update an existing assistant
   */
  async updateAssistant(assistantId: string, updates: Partial<VapiAssistant>): Promise<VapiAssistant> {
    const response = await this.client.patch(`/assistant/${assistantId}`, updates);
    return response.data;
  }

  /**
   * Get assistant details
   */
  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    const response = await this.client.get(`/assistant/${assistantId}`);
    return response.data;
  }

  /**
   * List all assistants
   */
  async listAssistants(): Promise<VapiAssistant[]> {
    const response = await this.client.get('/assistant');
    return response.data;
  }

  /**
   * Delete an assistant
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    await this.client.delete(`/assistant/${assistantId}`);
  }

  // ============================================================================
  // Call Management
  // ============================================================================

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<VapiCall> {
    const response = await this.client.get(`/call/${callId}`);
    return response.data;
  }

  /**
   * List all calls with optional filtering
   */
  async listCalls(params?: {
    assistantId?: string;
    limit?: number;
    createdAtGt?: string;
    createdAtLt?: string;
  }): Promise<VapiCall[]> {
    const response = await this.client.get('/call', { params });
    return response.data;
  }

  /**
   * Create an outbound call
   */
  async createCall(params: {
    assistantId?: string;
    assistant?: VapiAssistant;
    phoneNumberId?: string;
    customer: {
      number: string;
      name?: string;
    };
  }): Promise<VapiCall> {
    const response = await this.client.post('/call/phone', params);
    return response.data;
  }

  // ============================================================================
  // Phone Number Management
  // ============================================================================

  /**
   * List phone numbers
   */
  async listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    const response = await this.client.get('/phone-number');
    return response.data;
  }

  /**
   * Update phone number configuration
   */
  async updatePhoneNumber(phoneNumberId: string, updates: {
    assistantId?: string;
    name?: string;
  }): Promise<VapiPhoneNumber> {
    const response = await this.client.patch(`/phone-number/${phoneNumberId}`, updates);
    return response.data;
  }

  // ============================================================================
  // Knowledge Base / Files
  // ============================================================================

  /**
   * Upload a file to Vapi for knowledge base
   */
  async uploadFile(file: Buffer, filename: string): Promise<{ id: string; name: string }> {
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);

    const response = await this.client.post('/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * List uploaded files
   */
  async listFiles(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get('/file');
    return response.data;
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.client.delete(`/file/${fileId}`);
  }
}

// Singleton instance
let vapiClientInstance: VapiClient | null = null;

/**
 * Get or create Vapi client instance
 */
export function getVapiClient(): VapiClient {
  if (!vapiClientInstance) {
    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) {
      throw new Error('VAPI_API_KEY environment variable is not set');
    }
    vapiClientInstance = new VapiClient(apiKey);
  }
  return vapiClientInstance;
}

/**
 * Reset client instance (for testing)
 */
export function resetVapiClient(): void {
  vapiClientInstance = null;
}
