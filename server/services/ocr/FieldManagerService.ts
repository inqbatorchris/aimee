import { db } from '../../db';
import { 
  customFieldDefinitions, 
  addresses,
  addressRecords,
} from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CreateFieldDefinitionInput {
  organizationId: number;
  tableName: string;
  fieldName: string;
  displayLabel: string;
  fieldType?: string;
  description?: string;
  extractionPrompt?: string;
  createdBy?: number;
}

interface UpdateDynamicFieldInput {
  organizationId: number;
  tableName: string;
  recordId: number;
  fieldName: string;
  value: any;
}

export class FieldManagerService {
  /**
   * Create or update a custom field definition
   */
  async createOrUpdateFieldDefinition(input: CreateFieldDefinitionInput) {
    const {
      organizationId,
      tableName,
      fieldName,
      displayLabel,
      fieldType = 'text',
      description,
      extractionPrompt,
      createdBy,
    } = input;

    // Check if field definition already exists
    const existing = await db
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.organizationId, organizationId),
          eq(customFieldDefinitions.tableName, tableName),
          eq(customFieldDefinitions.fieldName, fieldName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing definition
      const updated = await db
        .update(customFieldDefinitions)
        .set({
          displayLabel,
          fieldType,
          description,
          extractionPrompt,
          updatedAt: new Date(),
        })
        .where(eq(customFieldDefinitions.id, existing[0].id))
        .returning();

      return updated[0];
    }

    // Create new field definition
    const created = await db
      .insert(customFieldDefinitions)
      .values({
        organizationId,
        tableName,
        fieldName,
        displayLabel,
        fieldType,
        description,
        extractionPrompt,
        createdBy,
      })
      .returning();

    return created[0];
  }

  /**
   * Get all custom field definitions for a table
   */
  async getFieldDefinitionsForTable(organizationId: number, tableName: string) {
    const fields = await db
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.organizationId, organizationId),
          eq(customFieldDefinitions.tableName, tableName)
        )
      );

    return fields;
  }

  /**
   * Get the table schema for a given table name
   * Currently supports: addresses, address_records
   * TODO: Add support for customers, tickets, etc. as their schemas are extended with extractedData fields
   */
  private getTableSchema(tableName: string) {
    const tableMap: Record<string, any> = {
      addresses,
      address_records: addressRecords,
      // Add more tables here as they're extended with extractedData fields:
      // customers,
      // tickets,
    };

    const table = tableMap[tableName];
    if (!table) {
      const supportedTables = Object.keys(tableMap).join(', ');
      console.warn(
        `[FieldManagerService] Table '${tableName}' not yet supported for dynamic field updates. ` +
        `Supported tables: ${supportedTables}`
      );
      return null;
    }

    return table;
  }

  /**
   * Update a dynamic field value in the target table's extractedData JSONB column
   */
  async updateDynamicField(input: UpdateDynamicFieldInput) {
    const { organizationId, tableName, recordId, fieldName, value } = input;

    return await this.updateExtractedDataField(
      tableName,
      organizationId,
      recordId,
      fieldName,
      value
    );
  }

  /**
   * Generic method to update extractedData field in any supported table
   */
  private async updateExtractedDataField(
    tableName: string,
    organizationId: number,
    recordId: number,
    fieldName: string,
    value: any
  ) {
    const table = this.getTableSchema(tableName);

    // If table is not supported, log warning and return null
    if (!table) {
      console.warn(
        `[FieldManagerService] Cannot update ${tableName}#${recordId}.${fieldName}: table not supported. ` +
        `Skipping field update.`
      );
      return null;
    }

    // Get current record
    const [record] = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.id, recordId),
          eq(table.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!record) {
      throw new Error(`${tableName} record not found: ID ${recordId}`);
    }

    // Update the extractedData JSONB field
    const currentExtractedData = (record.extractedData as Record<string, any>) || {};
    const updatedExtractedData = {
      ...currentExtractedData,
      [fieldName]: value,
    };

    // Update the record
    const updated = await db
      .update(table)
      .set({
        extractedData: updatedExtractedData,
        updatedAt: new Date(),
      })
      .where(eq(table.id, recordId))
      .returning();

    return updated[0];
  }

  /**
   * Batch update multiple fields in one operation
   */
  async updateMultipleFields(
    organizationId: number,
    tableName: string,
    recordId: number,
    fields: Record<string, any>
  ) {
    return await this.batchUpdateExtractedData(tableName, organizationId, recordId, fields);
  }

  /**
   * Generic method to batch update extractedData fields
   */
  private async batchUpdateExtractedData(
    tableName: string,
    organizationId: number,
    recordId: number,
    fields: Record<string, any>
  ) {
    const table = this.getTableSchema(tableName);

    // If table is not supported, log warning and return null
    if (!table) {
      console.warn(
        `[FieldManagerService] Cannot batch update ${tableName}#${recordId}: table not supported. ` +
        `Skipping field updates.`
      );
      return null;
    }

    // Get current record
    const [record] = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.id, recordId),
          eq(table.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!record) {
      throw new Error(`${tableName} record not found: ID ${recordId}`);
    }

    // Merge new fields with existing extractedData
    const currentExtractedData = (record.extractedData as Record<string, any>) || {};
    const updatedExtractedData = {
      ...currentExtractedData,
      ...fields,
    };

    // Update the record
    const updated = await db
      .update(table)
      .set({
        extractedData: updatedExtractedData,
        updatedAt: new Date(),
      })
      .where(eq(table.id, recordId))
      .returning();

    return updated[0];
  }

  /**
   * Validate field name (alphanumeric and underscores only)
   */
  validateFieldName(fieldName: string): boolean {
    const validPattern = /^[a-z][a-z0-9_]*$/;
    return validPattern.test(fieldName);
  }

  /**
   * Generate a safe field name from a display label
   */
  generateFieldName(displayLabel: string): string {
    return displayLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  /**
   * Delete a custom field definition
   */
  async deleteFieldDefinition(organizationId: number, fieldId: number) {
    await db
      .delete(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, fieldId),
          eq(customFieldDefinitions.organizationId, organizationId)
        )
      );
  }
}
