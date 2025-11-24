import OpenAI from 'openai';

interface OCRExtractionResult {
  success: boolean;
  extractedText?: string;
  extractedData?: Record<string, any>;
  confidence?: number;
  error?: string;
  model?: string;
  tokensUsed?: number;
}

interface OCRServiceConfig {
  apiKey?: string;
  model?: string;
}

export class OCRService {
  private openai: OpenAI;
  private model: string;

  constructor(config: OCRServiceConfig = {}) {
    // Use AI Integrations key if available (from Replit AI Integrations)
    const apiKey = config.apiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    // Allow initialization without API key if in mock mode
    if (!apiKey && process.env.MOCK_OCR !== 'true') {
      throw new Error('OpenAI API key not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY environment variable, or set MOCK_OCR=true for testing.');
    }

    // Initialize OpenAI client only if we have an API key (not needed in mock mode)
    if (apiKey) {
      this.openai = new OpenAI({ 
        apiKey,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_API_KEY 
          ? 'https://api.replit.com/v1' 
          : undefined 
      });
    } else {
      // Mock mode - no OpenAI client needed
      this.openai = null as any;
    }
    this.model = config.model || 'gpt-4o'; // gpt-4o supports vision
  }

  /**
   * Extract text from an image using OpenAI Vision API
   * @param imageData Base64 encoded image data or URL
   * @param extractionPrompt Instructions for what to extract from the image
   * @param options Additional extraction options
   */
  async extractFromImage(
    imageData: string,
    extractionPrompt: string,
    options: {
      structuredOutput?: boolean;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<OCRExtractionResult> {
    try {
      const {
        structuredOutput = true,
        maxTokens = 500,
        temperature = 0.1, // Low temperature for consistent extraction
      } = options;

      // Mock mode for testing without API calls
      if (process.env.MOCK_OCR === 'true') {
        console.log('[OCRService] MOCK MODE: Returning simulated OCR result');
        console.log(`  Prompt: ${extractionPrompt}`);
        console.log(`  Image: ${imageData.substring(0, 50)}...`);
        
        // Generate a mock serial number or value based on the prompt
        const mockValue = extractionPrompt.toLowerCase().includes('serial') 
          ? 'MOCK-SERIAL-' + Math.random().toString(36).substring(2, 8).toUpperCase()
          : 'MOCK-VALUE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        return {
          success: true,
          extractedText: mockValue,
          confidence: 95, // High confidence for mock data
          model: 'gpt-4o-mock',
          tokensUsed: 0,
        };
      }

      // Construct the system prompt
      const systemPrompt = structuredOutput
        ? `You are a precise OCR extraction assistant. Extract the requested information from images and return it as valid JSON. 
           If you cannot find the requested information, return an empty object. 
           Be accurate and only extract what is clearly visible in the image.`
        : `You are a precise OCR extraction assistant. Extract the requested information from images accurately.`;

      // Prepare the image content
      let imageContent: any;
      if (imageData.startsWith('http')) {
        // URL to image
        imageContent = {
          type: 'image_url',
          image_url: { url: imageData }
        };
      } else {
        // Base64 encoded image
        // Ensure proper data URI format
        const base64Data = imageData.includes('base64,') 
          ? imageData 
          : `data:image/jpeg;base64,${imageData}`;
        
        imageContent = {
          type: 'image_url',
          image_url: { url: base64Data }
        };
      }

      // Call OpenAI Vision API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: structuredOutput 
                  ? `${extractionPrompt}\n\nReturn the result as JSON with appropriate field names.`
                  : extractionPrompt,
              },
              imageContent,
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        return {
          success: false,
          error: 'No response from OCR service',
        };
      }

      // Calculate confidence based on response characteristics
      const confidence = this.calculateConfidence(content, response);

      // Parse structured output if requested
      if (structuredOutput) {
        try {
          // Try to extract JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            return {
              success: true,
              extractedData,
              extractedText: content,
              confidence,
              model: this.model,
              tokensUsed: response.usage?.total_tokens,
            };
          }
        } catch (parseError) {
          console.warn('[OCRService] Failed to parse structured output, returning as text:', parseError);
        }
      }

      // Return as plain text
      return {
        success: true,
        extractedText: content.trim(),
        confidence,
        model: this.model,
        tokensUsed: response.usage?.total_tokens,
      };

    } catch (error) {
      console.error('[OCRService] Extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during OCR extraction',
      };
    }
  }

  /**
   * Calculate confidence score based on response characteristics
   * This is a heuristic - GPT-4 doesn't provide explicit confidence scores
   */
  private calculateConfidence(content: string, response: any): number {
    let confidence = 85; // Base confidence for GPT-4o vision

    // Reduce confidence if response is very short (likely uncertain)
    if (content.length < 10) {
      confidence -= 20;
    }

    // Increase confidence if response contains specific patterns indicating certainty
    const certaintyIndicators = ['clearly', 'visible', 'shown', 'displays', 'reads'];
    const uncertaintyIndicators = ['unclear', 'cannot', 'unable', 'possibly', 'might'];

    const lowerContent = content.toLowerCase();
    
    if (certaintyIndicators.some(indicator => lowerContent.includes(indicator))) {
      confidence += 5;
    }

    if (uncertaintyIndicators.some(indicator => lowerContent.includes(indicator))) {
      confidence -= 15;
    }

    // Cap confidence between 0-100
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Batch extract from multiple images
   */
  async extractFromImages(
    images: Array<{ imageData: string; extractionPrompt: string }>,
    options?: { structuredOutput?: boolean; maxTokens?: number; temperature?: number }
  ): Promise<OCRExtractionResult[]> {
    const results = await Promise.all(
      images.map(({ imageData, extractionPrompt }) =>
        this.extractFromImage(imageData, extractionPrompt, options)
      )
    );

    return results;
  }

  /**
   * Extract a specific field from photos (workflow integration)
   * Processes multiple photos with the same prompt and returns the first successful extraction
   */
  async extractFieldFromPhotos({
    photos,
    fieldPrompt,
    organizationId,
  }: {
    photos: Array<{ url: string; fileName?: string; timestamp?: string }>;
    fieldPrompt: string;
    organizationId: number;
  }): Promise<string | null> {
    try {
      console.log(`[OCRService] Extracting field from ${photos.length} photos`);
      console.log(`[OCRService] Field prompt: ${fieldPrompt}`);

      // Process each photo
      for (const photo of photos) {
        try {
          console.log(`[OCRService] Processing photo: ${photo.fileName || photo.url.substring(0, 50)}`);
          
          // Extract from this photo
          const result = await this.extractFromImage(
            photo.url,
            fieldPrompt,
            {
              structuredOutput: false, // Return plain text for field values
              maxTokens: 100, // Short responses for field extraction
              temperature: 0.1, // Very deterministic
            }
          );

          if (result.success && result.extractedText) {
            const extractedValue = result.extractedText.trim();
            console.log(`[OCRService] Successfully extracted: ${extractedValue} (confidence: ${result.confidence}%)`);
            
            // Return the first successful extraction
            // In future, could aggregate multiple photos or use confidence thresholds
            return extractedValue;
          } else {
            console.log(`[OCRService] No value extracted from photo: ${result.error || 'empty result'}`);
          }
        } catch (photoError) {
          console.error(`[OCRService] Error processing photo:`, photoError);
          // Continue to next photo
        }
      }

      console.log(`[OCRService] No value extracted from any of the ${photos.length} photos`);
      return null;
    } catch (error) {
      console.error('[OCRService] extractFieldFromPhotos failed:', error);
      return null;
    }
  }
}
