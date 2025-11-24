import { db } from '../db';
import { audioRecordings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import OpenAIService from './integrations/openaiService';

class AudioProcessingService {
  async processAudioRecording(audioRecordingId: string, organizationId: number) {
    try {
      console.log(`[AudioProcessing] Starting processing for ${audioRecordingId}`);
      
      const [audioRec] = await db
        .select()
        .from(audioRecordings)
        .where(eq(audioRecordings.id, audioRecordingId))
        .limit(1);

      if (!audioRec) {
        throw new Error(`Audio recording ${audioRecordingId} not found`);
      }

      await db
        .update(audioRecordings)
        .set({ processingStatus: 'processing' })
        .where(eq(audioRecordings.id, audioRecordingId));

      const openaiService = new OpenAIService(organizationId);
      const transcription = await this.transcribeAudio(audioRec.filePath, openaiService);
      console.log(`[AudioProcessing] Transcription complete: ${transcription.substring(0, 100)}...`);

      const extractedData = await this.extractSpliceData(transcription, openaiService);
      console.log(`[AudioProcessing] Extracted ${extractedData.connections?.length || 0} splice connections`);

      await db
        .update(audioRecordings)
        .set({
          transcription,
          extractedData,
          processingStatus: 'completed',
          processedAt: new Date(),
          processingError: null
        })
        .where(eq(audioRecordings.id, audioRecordingId));

      console.log(`[AudioProcessing] Successfully processed ${audioRecordingId}`);
      
      return { success: true, transcription, extractedData };
    } catch (error: any) {
      console.error(`[AudioProcessing] Error processing ${audioRecordingId}:`, error);
      
      await db
        .update(audioRecordings)
        .set({
          processingStatus: 'failed',
          processingError: error.message
        })
        .where(eq(audioRecordings.id, audioRecordingId));

      throw error;
    }
  }

  async transcribeAudio(filePath: string, openaiService: OpenAIService): Promise<string> {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Audio file not found: ${fullPath}`);
    }

    // Use fs.createReadStream for Node.js - OpenAI SDK accepts ReadStream
    const audioStream = fs.createReadStream(fullPath) as any;
    audioStream.path = path.basename(fullPath); // Add filename for OpenAI

    const response = await openaiService.createTranscription(audioStream);
    return response.text || '';
  }

  async extractSpliceData(transcription: string, openaiService: OpenAIService) {
    const systemPrompt = `You are an AI assistant that extracts fiber optic splice connection data from voice transcriptions.

The user will describe fiber-to-fiber splice connections in a voice memo. Your task is to extract structured data about each connection.

Return a JSON object with this exact structure:
{
  "connections": [
    {
      "incomingCable": "cable identifier",
      "incomingFiber": fiber number (integer),
      "incomingBufferTube": "color or identifier",
      "outgoingCable": "cable identifier",
      "outgoingFiber": fiber number (integer),
      "outgoingBufferTube": "color or identifier",
      "notes": "any additional notes"
    }
  ]
}

IMPORTANT:
- Extract all connections mentioned
- Use exact cable names/identifiers from the transcription
- Fiber numbers must be integers
- If a field is not mentioned, omit it or set to null
- Buffer tube colors: common colors are blue, orange, green, brown, slate, white, red, black, yellow, violet, rose, aqua
- If the transcription is unclear or doesn't describe connections, return an empty connections array`;

    const userPrompt = `Extract fiber splice connections from this transcription:\n\n${transcription}`;

    try {
      const response = await openaiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'gpt-4',
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[AudioProcessing] No JSON found in response, returning empty');
        return { connections: [] };
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      if (!extractedData.connections || !Array.isArray(extractedData.connections)) {
        return { connections: [] };
      }

      const validatedConnections = extractedData.connections.map((conn: any) => ({
        incomingCable: conn.incomingCable || '',
        incomingFiber: parseInt(conn.incomingFiber) || 0,
        incomingBufferTube: conn.incomingBufferTube || undefined,
        outgoingCable: conn.outgoingCable || '',
        outgoingFiber: parseInt(conn.outgoingFiber) || 0,
        outgoingBufferTube: conn.outgoingBufferTube || undefined,
        notes: conn.notes || undefined
      }));

      return { connections: validatedConnections };
    } catch (error: any) {
      console.error('[AudioProcessing] Error extracting splice data:', error);
      return { connections: [] };
    }
  }
}

export const audioProcessingService = new AudioProcessingService();
