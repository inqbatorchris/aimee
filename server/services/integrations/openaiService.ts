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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  functions?: any[];
  function_call?: any;
}

export class OpenAIService {
  private client: AxiosInstance | null = null;
  private organizationId: number;
  private apiKey: string | null = null;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  async initialize(): Promise<void> {
    const integration = await storage.getIntegration(this.organizationId, 'openai');
    
    if (!integration) {
      throw new Error('OpenAI integration not configured');
    }

    if (!integration.credentialsEncrypted) {
      throw new Error('OpenAI credentials not configured');
    }

    // Decrypt credentials
    const decryptedData = decrypt(integration.credentialsEncrypted);
    const credentials = JSON.parse(decryptedData);
    
    this.apiKey = credentials.apiKey;

    if (!this.apiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Create Axios client for OpenAI API
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error('OpenAI service not initialized. Call initialize() first.');
    }
  }

  // Chat Completions (GPT-4, GPT-3.5, etc.)
  async createChatCompletion(messages: ChatMessage[], options: CompletionOptions = {}) {
    this.ensureInitialized();
    
    const response = await this.client!.post('/chat/completions', {
      model: options.model || 'gpt-4',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      stream: options.stream || false,
      functions: options.functions,
      function_call: options.function_call,
    });
    
    return response.data;
  }

  // Completions (Legacy, for older models)
  async createCompletion(prompt: string, options: CompletionOptions = {}) {
    this.ensureInitialized();
    
    const response = await this.client!.post('/completions', {
      model: options.model || 'text-davinci-003',
      prompt,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 150,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
    });
    
    return response.data;
  }

  // Embeddings
  async createEmbedding(input: string | string[], model: string = 'text-embedding-ada-002') {
    this.ensureInitialized();
    
    const response = await this.client!.post('/embeddings', {
      model,
      input,
    });
    
    return response.data;
  }

  // Images
  async createImage(prompt: string, options: { n?: number; size?: string; response_format?: string } = {}) {
    this.ensureInitialized();
    
    const response = await this.client!.post('/images/generations', {
      prompt,
      n: options.n || 1,
      size: options.size || '1024x1024',
      response_format: options.response_format || 'url',
    });
    
    return response.data;
  }

  async createImageEdit(
    image: string,
    mask: string,
    prompt: string,
    options: { n?: number; size?: string; response_format?: string } = {}
  ) {
    this.ensureInitialized();
    
    const formData = new FormData();
    formData.append('image', image);
    formData.append('mask', mask);
    formData.append('prompt', prompt);
    formData.append('n', String(options.n || 1));
    formData.append('size', options.size || '1024x1024');
    formData.append('response_format', options.response_format || 'url');
    
    const response = await this.client!.post('/images/edits', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async createImageVariation(
    image: string,
    options: { n?: number; size?: string; response_format?: string } = {}
  ) {
    this.ensureInitialized();
    
    const formData = new FormData();
    formData.append('image', image);
    formData.append('n', String(options.n || 1));
    formData.append('size', options.size || '1024x1024');
    formData.append('response_format', options.response_format || 'url');
    
    const response = await this.client!.post('/images/variations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Audio
  async createTranscription(file: any, model: string = 'whisper-1', options: any = {}) {
    this.ensureInitialized();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.temperature) formData.append('temperature', String(options.temperature));
    if (options.language) formData.append('language', options.language);
    
    const response = await this.client!.post('/audio/transcriptions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async createTranslation(file: any, model: string = 'whisper-1', options: any = {}) {
    this.ensureInitialized();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.temperature) formData.append('temperature', String(options.temperature));
    
    const response = await this.client!.post('/audio/translations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Models
  async listModels() {
    this.ensureInitialized();
    const response = await this.client!.get('/models');
    return response.data;
  }

  async getModel(modelId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/models/${modelId}`);
    return response.data;
  }

  // Fine-tuning
  async createFineTune(training_file: string, options: any = {}) {
    this.ensureInitialized();
    
    const response = await this.client!.post('/fine-tunes', {
      training_file,
      ...options,
    });
    
    return response.data;
  }

  async listFineTunes() {
    this.ensureInitialized();
    const response = await this.client!.get('/fine-tunes');
    return response.data;
  }

  async getFineTune(fineTuneId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/fine-tunes/${fineTuneId}`);
    return response.data;
  }

  async cancelFineTune(fineTuneId: string) {
    this.ensureInitialized();
    const response = await this.client!.post(`/fine-tunes/${fineTuneId}/cancel`);
    return response.data;
  }

  // Files
  async uploadFile(file: any, purpose: string) {
    this.ensureInitialized();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);
    
    const response = await this.client!.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async listFiles() {
    this.ensureInitialized();
    const response = await this.client!.get('/files');
    return response.data;
  }

  async deleteFile(fileId: string) {
    this.ensureInitialized();
    const response = await this.client!.delete(`/files/${fileId}`);
    return response.data;
  }

  async getFile(fileId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/files/${fileId}`);
    return response.data;
  }

  async getFileContent(fileId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/files/${fileId}/content`);
    return response.data;
  }

  // Moderation
  async createModeration(input: string | string[]) {
    this.ensureInitialized();
    
    const response = await this.client!.post('/moderations', {
      input,
    });
    
    return response.data;
  }

  // Fiber Network Specific Methods
  
  /**
   * Transcribe audio from base64 string (for field app voice memos)
   * @param audioBase64 Base64 encoded audio file
   * @param options Transcription options (language, prompt, etc.)
   * @returns Transcription text
   */
  async transcribeAudioFromBase64(
    audioBase64: string, 
    options: { language?: string; prompt?: string } = {}
  ): Promise<string> {
    this.ensureInitialized();
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
    
    // Create a blob-like object for the API
    const formData = new FormData();
    formData.append('file', audioBuffer, 'voice_memo.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    const response = await this.client!.post('/audio/transcriptions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.text || response.data;
  }

  /**
   * Extract structured splice connection data from transcription text using GPT-4
   * @param transcription Voice memo transcription
   * @param context Additional context (node name, cables present, etc.)
   * @returns Array of splice connections
   */
  async extractSpliceConnections(
    transcription: string,
    context?: {
      nodeName?: string;
      availableCables?: string[];
      photoDescription?: string;
    }
  ): Promise<Array<{
    incomingCable: string;
    incomingFiber: number;
    incomingBufferTube?: string;
    outgoingCable: string;
    outgoingFiber: number;
    outgoingBufferTube?: string;
    confidence?: 'high' | 'medium' | 'low';
    notes?: string;
  }>> {
    this.ensureInitialized();
    
    const systemPrompt = `You are a fiber optic network engineer assistant specializing in splice documentation.
Your task is to extract structured splice connection data from voice transcriptions made by field engineers.

Engineers typically describe splices in formats like:
- "Cable A blue tube fiber 1 to Cable B orange tube fiber 3"
- "A1 to B3, A2 to B4, A3 to B5"
- "Blue one goes to orange three"

Extract each connection and return as JSON array. If you're uncertain about any detail, mark confidence as 'medium' or 'low'.

Return ONLY valid JSON array, no markdown or explanation.`;

    let userPrompt = `Extract splice connections from this transcription:\n\n"${transcription}"`;
    
    if (context) {
      if (context.nodeName) {
        userPrompt += `\n\nSplice point: ${context.nodeName}`;
      }
      if (context.availableCables && context.availableCables.length > 0) {
        userPrompt += `\n\nCables at this location: ${context.availableCables.join(', ')}`;
      }
      if (context.photoDescription) {
        userPrompt += `\n\nPhoto shows: ${context.photoDescription}`;
      }
    }
    
    userPrompt += `\n\nReturn JSON array with this structure:
[
  {
    "incomingCable": "Cable identifier",
    "incomingFiber": fiber_number,
    "incomingBufferTube": "color (optional)",
    "outgoingCable": "Cable identifier", 
    "outgoingFiber": fiber_number,
    "outgoingBufferTube": "color (optional)",
    "confidence": "high|medium|low",
    "notes": "any additional info (optional)"
  }
]`;

    const response = await this.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 2000,
      }
    );
    
    const content = response.choices[0]?.message?.content || '[]';
    
    // Parse JSON response, handling markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    try {
      const connections = JSON.parse(jsonStr);
      return Array.isArray(connections) ? connections : [];
    } catch (error) {
      console.error('Failed to parse GPT-4 response:', content);
      throw new Error('Invalid JSON response from GPT-4');
    }
  }
}

export default OpenAIService;