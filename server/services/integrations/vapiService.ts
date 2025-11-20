import axios from 'axios';

interface VapiCredentials {
  apiKey: string;
  phoneNumberId?: string;
}

export interface VapiAssistantConfig {
  name: string;
  model: {
    provider: string;
    model: string;
    temperature?: number;
    messages?: Array<{ role: string; content: string }>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  functions?: Array<{
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  }>;
  knowledgeBase?: {
    provider: string;
    fileIds: string[];
  };
}

export interface VapiCallRequest {
  assistantId?: string;
  assistant?: VapiAssistantConfig;
  phoneNumberId?: string;
  customer?: {
    number: string;
    name?: string;
  };
}

export interface VapiCallResponse {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  phoneNumberId: string;
  customer: {
    number: string;
  };
  status: string;
  assistantId?: string;
}

export class VapiService {
  private credentials: VapiCredentials;
  private baseUrl = 'https://api.vapi.ai';

  constructor(credentials: VapiCredentials) {
    this.credentials = credentials;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createAssistant(config: VapiAssistantConfig): Promise<any> {
    try {
      console.log('[VAPI createAssistant] Creating assistant:', config.name);
      
      const response = await axios.post(
        `${this.baseUrl}/assistant`,
        config,
        { headers: this.getHeaders() }
      );

      console.log('[VAPI createAssistant] ✅ Assistant created:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('[VAPI createAssistant] ❌ ERROR:', error.message);
      console.error('[VAPI createAssistant]   Response:', error.response?.data);
      throw new Error(`Failed to create Vapi assistant: ${error.message}`);
    }
  }

  async updateAssistant(assistantId: string, config: Partial<VapiAssistantConfig>): Promise<any> {
    try {
      console.log('[VAPI updateAssistant] Updating assistant:', assistantId);
      
      const response = await axios.patch(
        `${this.baseUrl}/assistant/${assistantId}`,
        config,
        { headers: this.getHeaders() }
      );

      console.log('[VAPI updateAssistant] ✅ Assistant updated');
      return response.data;
    } catch (error: any) {
      console.error('[VAPI updateAssistant] ❌ ERROR:', error.message);
      throw new Error(`Failed to update Vapi assistant: ${error.message}`);
    }
  }

  async getAssistant(assistantId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/assistant/${assistantId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI getAssistant] ❌ ERROR:', error.message);
      throw new Error(`Failed to get Vapi assistant: ${error.message}`);
    }
  }

  async listAssistants(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/assistant`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI listAssistants] ❌ ERROR:', error.message);
      throw new Error(`Failed to list Vapi assistants: ${error.message}`);
    }
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/assistant/${assistantId}`,
        { headers: this.getHeaders() }
      );
      console.log('[VAPI deleteAssistant] ✅ Assistant deleted:', assistantId);
    } catch (error: any) {
      console.error('[VAPI deleteAssistant] ❌ ERROR:', error.message);
      throw new Error(`Failed to delete Vapi assistant: ${error.message}`);
    }
  }

  async createCall(callRequest: VapiCallRequest): Promise<VapiCallResponse> {
    try {
      console.log('[VAPI createCall] Creating outbound call to:', callRequest.customer?.number);
      
      const response = await axios.post(
        `${this.baseUrl}/call/phone`,
        callRequest,
        { headers: this.getHeaders() }
      );

      console.log('[VAPI createCall] ✅ Call created:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('[VAPI createCall] ❌ ERROR:', error.message);
      console.error('[VAPI createCall]   Response:', error.response?.data);
      throw new Error(`Failed to create Vapi call: ${error.message}`);
    }
  }

  async getCall(callId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/call/${callId}`,
        { 
          headers: this.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI getCall] ❌ ERROR:', error.message);
      throw new Error(`Failed to get Vapi call: ${error.message}`);
    }
  }

  async listCalls(filters?: {
    assistantId?: string;
    limit?: number;
    createdAtGt?: string;
    createdAtLt?: string;
  }): Promise<any[]> {
    try {
      const params: any = {};
      if (filters?.assistantId) params.assistantId = filters.assistantId;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.createdAtGt) params.createdAtGt = filters.createdAtGt;
      if (filters?.createdAtLt) params.createdAtLt = filters.createdAtLt;

      const response = await axios.get(
        `${this.baseUrl}/call`,
        { 
          headers: this.getHeaders(),
          params,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI listCalls] ❌ ERROR:', error.message);
      throw new Error(`Failed to list Vapi calls: ${error.message}`);
    }
  }

  async uploadFile(file: {
    fileName: string;
    fileContent: Buffer;
    purpose?: string;
  }): Promise<any> {
    try {
      console.log('[VAPI uploadFile] Uploading file:', file.fileName);
      
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', file.fileContent, file.fileName);
      if (file.purpose) formData.append('purpose', file.purpose);

      const response = await axios.post(
        `${this.baseUrl}/file`,
        formData,
        { 
          headers: {
            ...this.getHeaders(),
            ...formData.getHeaders()
          }
        }
      );

      console.log('[VAPI uploadFile] ✅ File uploaded:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('[VAPI uploadFile] ❌ ERROR:', error.message);
      throw new Error(`Failed to upload file to Vapi: ${error.message}`);
    }
  }

  async getFile(fileId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/file/${fileId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI getFile] ❌ ERROR:', error.message);
      throw new Error(`Failed to get Vapi file: ${error.message}`);
    }
  }

  async listFiles(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/file`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI listFiles] ❌ ERROR:', error.message);
      throw new Error(`Failed to list Vapi files: ${error.message}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/file/${fileId}`,
        { headers: this.getHeaders() }
      );
      console.log('[VAPI deleteFile] ✅ File deleted:', fileId);
    } catch (error: any) {
      console.error('[VAPI deleteFile] ❌ ERROR:', error.message);
      throw new Error(`Failed to delete Vapi file: ${error.message}`);
    }
  }

  async getPhoneNumber(phoneNumberId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/phone-number/${phoneNumberId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI getPhoneNumber] ❌ ERROR:', error.message);
      throw new Error(`Failed to get Vapi phone number: ${error.message}`);
    }
  }

  async listPhoneNumbers(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/phone-number`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('[VAPI listPhoneNumbers] ❌ ERROR:', error.message);
      throw new Error(`Failed to list Vapi phone numbers: ${error.message}`);
    }
  }
}
