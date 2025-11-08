import axios, { AxiosInstance } from 'axios';
import { storage } from '../../storage';
import crypto from 'crypto';

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-do-not-use-in-production';
const IV_LENGTH = 16;

function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    console.error('Decryption failed:', error?.message || 'Unknown error');
    throw new Error('Token decryption failed');
  }
}

export class OutlookService {
  private client: AxiosInstance | null = null;
  private organizationId: number;
  private accessToken: string | null = null;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  async initialize(): Promise<void> {
    const integration = await storage.getIntegration(this.organizationId, 'outlook');
    
    if (!integration) {
      throw new Error('Outlook integration not configured');
    }

    if (!integration.credentialsEncrypted) {
      throw new Error('Outlook credentials not configured');
    }

    // Decrypt credentials
    const decryptedData = decrypt(integration.credentialsEncrypted);
    const credentials = JSON.parse(decryptedData);
    
    this.accessToken = credentials.accessToken;

    // Create Axios client for Microsoft Graph API
    this.client = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error('Outlook service not initialized. Call initialize() first.');
    }
  }

  // User methods
  async getMe() {
    this.ensureInitialized();
    const response = await this.client!.get('/me');
    return response.data;
  }

  // Mail methods
  async getMessages(params?: any) {
    this.ensureInitialized();
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.client!.get(`/me/messages${queryString}`);
    return response.data;
  }

  async getMessage(messageId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/me/messages/${messageId}`);
    return response.data;
  }

  async sendMail(mailData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/me/sendMail', mailData);
    return response.data;
  }

  async createDraft(draftData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/me/messages', draftData);
    return response.data;
  }

  async updateMessage(messageId: string, updateData: any) {
    this.ensureInitialized();
    const response = await this.client!.patch(`/me/messages/${messageId}`, updateData);
    return response.data;
  }

  async deleteMessage(messageId: string) {
    this.ensureInitialized();
    await this.client!.delete(`/me/messages/${messageId}`);
    return { success: true };
  }

  // Folder methods
  async getMailFolders() {
    this.ensureInitialized();
    const response = await this.client!.get('/me/mailFolders');
    return response.data;
  }

  async getMailFolder(folderId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/me/mailFolders/${folderId}`);
    return response.data;
  }

  async getFolderMessages(folderId: string, params?: any) {
    this.ensureInitialized();
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.client!.get(`/me/mailFolders/${folderId}/messages${queryString}`);
    return response.data;
  }

  // Calendar methods
  async getEvents(params?: any) {
    this.ensureInitialized();
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.client!.get(`/me/events${queryString}`);
    return response.data;
  }

  async getEvent(eventId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/me/events/${eventId}`);
    return response.data;
  }

  async createEvent(eventData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/me/events', eventData);
    return response.data;
  }

  async updateEvent(eventId: string, eventData: any) {
    this.ensureInitialized();
    const response = await this.client!.patch(`/me/events/${eventId}`, eventData);
    return response.data;
  }

  async deleteEvent(eventId: string) {
    this.ensureInitialized();
    await this.client!.delete(`/me/events/${eventId}`);
    return { success: true };
  }

  // Contact methods
  async getContacts(params?: any) {
    this.ensureInitialized();
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.client!.get(`/me/contacts${queryString}`);
    return response.data;
  }

  async getContact(contactId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/me/contacts/${contactId}`);
    return response.data;
  }

  async createContact(contactData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/me/contacts', contactData);
    return response.data;
  }

  async updateContact(contactId: string, contactData: any) {
    this.ensureInitialized();
    const response = await this.client!.patch(`/me/contacts/${contactId}`, contactData);
    return response.data;
  }

  async deleteContact(contactId: string) {
    this.ensureInitialized();
    await this.client!.delete(`/me/contacts/${contactId}`);
    return { success: true };
  }

  // Attachment methods
  async getAttachments(messageId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/me/messages/${messageId}/attachments`);
    return response.data;
  }

  async getAttachment(messageId: string, attachmentId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/me/messages/${messageId}/attachments/${attachmentId}`);
    return response.data;
  }

  async addAttachment(messageId: string, attachmentData: any) {
    this.ensureInitialized();
    const response = await this.client!.post(`/me/messages/${messageId}/attachments`, attachmentData);
    return response.data;
  }
}

export default OutlookService;