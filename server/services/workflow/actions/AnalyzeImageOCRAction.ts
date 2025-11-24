import { db } from '../../../db';
import { 
  workItemWorkflowExecutionSteps,
  workItemSources,
  workflowStepExtractions,
  customFieldDefinitions,
} from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { OCRService } from '../../ocr/OCRService';
import { FieldManagerService } from '../../ocr/FieldManagerService';

interface AnalyzeImageOCRParams {
  stepId: number;
  workItemId: number;
  photoData: {
    id: string;
    url: string;
    caption?: string;
  };
  photoAnalysisConfig: {
    enabled: boolean;
    extractions: Array<{
      fieldId?: number;
      targetTable?: string;
      targetField?: string;
      extractionPrompt: string;
      autoCreateField?: boolean;
      required?: boolean;
      postProcess?: 'none' | 'uppercase' | 'lowercase' | 'trim';
    }>;
  };
}

/**
 * Agent workflow action: Analyze image using OCR and extract structured data
 * This action is triggered when a photo is uploaded to a workflow step with photoAnalysisConfig enabled
 */
export class AnalyzeImageOCRAction {
  private ocrService: OCRService;
  private fieldManager: FieldManagerService;

  constructor() {
    this.ocrService = new OCRService();
    this.fieldManager = new FieldManagerService();
  }

  async execute(parameters: any, context: any): Promise<any> {
    // OCR parameters come from context.manualData when triggered by photo upload
    const ocrParams = context.manualData || parameters;
    const { stepId, workItemId, photoData, photoAnalysisConfig } = ocrParams as AnalyzeImageOCRParams;
    const organizationId = parseInt(context.organizationId);

    console.log('[AnalyzeImageOCR] Starting OCR analysis');
    console.log(`  Step ID: ${stepId}`);
    console.log(`  Work Item ID: ${workItemId}`);
    console.log(`  Photo URL: ${photoData.url}`);
    console.log(`  Extractions: ${photoAnalysisConfig.extractions.length}`);

    const startTime = Date.now();
    const extractionResults: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Get the workflow step to access metadata
      const [step] = await db
        .select()
        .from(workItemWorkflowExecutionSteps)
        .where(
          and(
            eq(workItemWorkflowExecutionSteps.id, stepId),
            eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      // Get work item source linkage to determine target record
      // First, try to get from work_item_sources table (new approach)
      let sourceTable: string | null = null;
      let sourceId: number | null = null;

      try {
        const [workItemSource] = await db
          .select()
          .from(workItemSources)
          .where(
            and(
              eq(workItemSources.workItemId, workItemId),
              eq(workItemSources.organizationId, organizationId)
            )
          )
          .limit(1);

        if (workItemSource) {
          sourceTable = workItemSource.sourceTable;
          sourceId = workItemSource.sourceId;
          console.log(`[AnalyzeImageOCR] Source from work_item_sources: ${sourceTable}#${sourceId}`);
        }
      } catch (error) {
        // Log the error to ensure we're not hiding real query issues
        console.log(`[AnalyzeImageOCR] Could not query work_item_sources (table might not exist):`, error instanceof Error ? error.message : error);
        console.log(`[AnalyzeImageOCR] Falling back to workflow_metadata`);
      }

      // Fallback: Get source from work item metadata (legacy/backward compatibility)
      if (!sourceTable || !sourceId) {
        const { workItems } = await import('../../../../shared/schema');
        const [workItem] = await db
          .select()
          .from(workItems)
          .where(
            and(
              eq(workItems.id, workItemId),
              eq(workItems.organizationId, organizationId)
            )
          )
          .limit(1);

        if (!workItem) {
          throw new Error(`Work item ${workItemId} not found`);
        }

        const metadata = workItem.workflowMetadata as any;
        
        // Try to get address ID from metadata
        if (metadata?.addressRecordId) {
          sourceTable = 'addresses';
          sourceId = metadata.addressRecordId;
          console.log(`[AnalyzeImageOCR] Source from metadata: ${sourceTable}#${sourceId}`);
        } else if (metadata?.customerId) {
          sourceTable = 'customers';
          sourceId = metadata.customerId;
          console.log(`[AnalyzeImageOCR] Source from metadata: ${sourceTable}#${sourceId}`);
        } else {
          throw new Error(`Work item ${workItemId} has no source linkage in work_item_sources or metadata`);
        }
      }

      console.log(`[AnalyzeImageOCR] Source: ${sourceTable}#${sourceId}`);

      // Process each extraction
      for (const extraction of photoAnalysisConfig.extractions) {
        try {
          // Resolve field metadata
          let targetTable = extraction.targetTable || sourceTable;
          let targetField = extraction.targetField;
          let displayLabel = targetField || 'Unknown Field';

          // If fieldId is provided, look up the field definition
          if (extraction.fieldId) {
            const [fieldDef] = await db
              .select()
              .from(customFieldDefinitions)
              .where(
                and(
                  eq(customFieldDefinitions.id, extraction.fieldId),
                  eq(customFieldDefinitions.organizationId, organizationId)
                )
              )
              .limit(1);

            if (fieldDef) {
              targetTable = fieldDef.tableName;
              targetField = fieldDef.fieldName;
              displayLabel = fieldDef.displayLabel;
            }
          }

          if (!targetField) {
            console.warn(`[AnalyzeImageOCR] Skipping extraction: no target field defined`);
            continue;
          }

          // VALIDATION: Verify field exists before attempting extraction
          const columnName = this.fieldManager.getColumnName(targetTable, targetField);
          if (!columnName) {
            const knownColumns = this.fieldManager.getKnownColumns(targetTable);
            const errorMsg = `Field "${targetField}" does not exist on table "${targetTable}". ` +
              `Available columns: ${knownColumns.join(', ')}. ` +
              `Please create this field in the workflow template configuration before using it.`;
            errors.push(errorMsg);
            console.error(`[AnalyzeImageOCR] ${errorMsg}`);
            continue; // Skip this extraction
          }

          console.log(`[AnalyzeImageOCR] Extracting "${displayLabel}" (${targetTable}.${targetField} → ${columnName})`);

          // Execute OCR extraction
          const ocrResult = await this.ocrService.extractFromImage(
            photoData.url,
            extraction.extractionPrompt,
            {
              structuredOutput: false, // Extract as plain text for single fields
              maxTokens: 300,
              temperature: 0.1,
            }
          );

          if (!ocrResult.success) {
            errors.push(`Failed to extract ${displayLabel}: ${ocrResult.error}`);
            console.error(`[AnalyzeImageOCR] Extraction failed: ${ocrResult.error}`);
            continue;
          }

          let extractedValue = ocrResult.extractedText?.trim() || '';

          // Apply post-processing
          if (extraction.postProcess && extractedValue) {
            switch (extraction.postProcess) {
              case 'uppercase':
                extractedValue = extractedValue.toUpperCase();
                break;
              case 'lowercase':
                extractedValue = extractedValue.toLowerCase();
                break;
              case 'trim':
                extractedValue = extractedValue.trim();
                break;
            }
          }

          console.log(`[AnalyzeImageOCR] Extracted value: "${extractedValue}" (confidence: ${ocrResult.confidence}%)`);

          // Store extraction result for completion callbacks to process
          extractionResults[targetField] = {
            value: extractedValue,
            confidence: ocrResult.confidence,
            field: displayLabel,
            targetTable,
          };

          console.log(`[AnalyzeImageOCR] Stored extraction result for ${targetField} (will be written to DB via completion callback)`);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Extraction error: ${errorMsg}`);
          console.error(`[AnalyzeImageOCR] Extraction failed:`, error);
        }
      }

      // Record extraction audit trail
      const processingTime = Date.now() - startTime;
      const overallConfidence = Object.values(extractionResults).length > 0
        ? Math.round(
            Object.values(extractionResults).reduce((sum: number, result: any) => sum + (result.confidence || 0), 0) /
            Object.values(extractionResults).length
          )
        : 0;

      const status = errors.length > 0 ? 'completed_with_errors' : 'completed';

      await db.insert(workflowStepExtractions).values({
        organizationId,
        workItemId,
        stepId,
        extractedData: extractionResults,
        confidence: overallConfidence,
        status,
        model: 'gpt-4o',
        processingTimeMs: processingTime,
        errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      });

      // Store OCR results in step execution data for completion callbacks to access
      // Convert extraction results to simple key-value format
      const ocrData: Record<string, string> = {};
      for (const [fieldName, result] of Object.entries(extractionResults)) {
        ocrData[fieldName] = (result as any).value;
      }

      // Update step evidence with OCR data
      const currentEvidence = step.evidence || {};
      await db
        .update(workItemWorkflowExecutionSteps)
        .set({
          evidence: {
            ...currentEvidence,
            formData: {
              ...(currentEvidence.formData || {}),
              ...ocrData, // Add OCR extracted fields
              _ocrMetadata: { // Store metadata for reference
                confidence: overallConfidence,
                extractedFields: Object.keys(ocrData),
                processingTimeMs: processingTime,
              },
            },
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workItemWorkflowExecutionSteps.id, stepId),
            eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
          )
        );

      console.log(`[AnalyzeImageOCR] Completed in ${processingTime}ms`);
      console.log(`  Extractions: ${Object.keys(extractionResults).length}`);
      console.log(`  Errors: ${errors.length}`);
      console.log(`  Average confidence: ${overallConfidence}%`);
      console.log(`  OCR data stored in step evidence.formData for completion callbacks`);

      return {
        success: true,
        extractedData: extractionResults,
        confidence: overallConfidence,
        processingTimeMs: processingTime,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AnalyzeImageOCR] Fatal error:', error);

      // Record failed extraction
      await db.insert(workflowStepExtractions).values({
        organizationId,
        workItemId,
        stepId,
        extractedData: {},
        confidence: 0,
        status: 'failed',
        model: 'gpt-4o',
        processingTimeMs: Date.now() - startTime,
        errorMessage: errorMsg,
      });

      throw error;
    }
  }
}
