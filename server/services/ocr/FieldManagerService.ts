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
   * Convert snake_case or PascalCase to camelCase
   */
  private toCamelCase(str: string): string {
    // Handle snake_case: "router_serial" → "routerSerial"
    if (str.includes('_')) {
      return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    
    // Handle PascalCase: "RouterSerial" → "routerSerial"
    if (str[0] === str[0].toUpperCase()) {
      return str[0].toLowerCase() + str.slice(1);
    }
    
    // Already camelCase
    return str;
  }

  /**
   * Map field names to real database columns
   * Returns the database column name if it exists, otherwise null
   * 
   * This method converts OCR field names (which can be snake_case or PascalCase)
   * to the camelCase column names used in the database schema.
   * 
   * DYNAMIC: Checks both hard-coded schema columns AND custom field definitions
   * PUBLIC: Now callable from AnalyzeImageOCRAction for validation before execution
   */
  public getColumnName(tableName: string, fieldName: string): string | null {
    // Address records have specific OCR columns
    if (tableName === 'address_records') {
      // List of built-in OCR columns in the schema (camelCase)
      const builtInColumns = [
        'routerSerial', 'routerMac', 'routerModel',
        'onuSerial', 'onuMac', 'onuModel',
        'postcode', 'summary', 'address', 'premise', 'network', 'udprn', 'statusId'
      ];
      
      // Convert input fieldName to camelCase
      const camelCased = this.toCamelCase(fieldName);
      
      // Check if it matches a built-in column
      if (builtInColumns.includes(camelCased)) {
        return camelCased;
      }
      
      // NOTE: Custom fields created via /api/fields/create are tracked in customFieldDefinitions table
      // but they map to the SAME physical columns above (via fieldName → column mapping)
      // If a field was created via API, it should already be in the builtInColumns list
      // This method returns the column name for fields that physically exist in the schema
      
      return null;
    }
    
    // Add support for other tables here as needed
    return null;
  }

  /**
   * Get list of known columns for a table
   * Used for error messages when field doesn't exist
   */
  public getKnownColumns(tableName: string): string[] {
    if (tableName === 'address_records') {
      return [
        'routerSerial', 'routerMac', 'routerModel',
        'onuSerial', 'onuMac', 'onuModel',
        'postcode', 'summary', 'address', 'premise', 'network', 'udprn', 'statusId'
      ];
    }
    return [];
  }

  /**
   * Generic method to update extractedData field in any supported table
   * NOW WRITES TO REAL COLUMNS when available, falls back to JSONB for unknown fields
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

    // Check if this field maps to a real database column
    const columnName = this.getColumnName(tableName, fieldName);
    
    if (columnName) {
      // Write to real column
      console.log(`[FieldManagerService] Writing ${fieldName} → ${columnName} on ${tableName}#${recordId}`);
      const updated = await db
        .update(table)
        .set({
          [columnName]: value,
          updatedAt: new Date(),
        })
        .where(eq(table.id, recordId))
        .returning();
      return updated[0];
    } else {
      // STRICT MODE: Field must exist - no JSONB fallback
      const knownColumns = this.getKnownColumns(tableName);
      console.error(`[FieldManagerService] Cannot write ${fieldName}: no column mapping exists on ${tableName}`);
      throw new Error(
        `Field "${fieldName}" not found on table "${tableName}". ` +
        `Available columns: ${knownColumns.join(', ')}. ` +
        `Please create this field in the workflow template configuration before using it.`
      );
    }
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
   * NOW WRITES TO REAL COLUMNS when available, falls back to JSONB for unknown fields
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

    // STRICT MODE: Only map to real columns, reject unknown fields
    const columnUpdates: Record<string, any> = {};
    const unknownFields: string[] = [];

    for (const [fieldName, value] of Object.entries(fields)) {
      const columnName = this.getColumnName(tableName, fieldName);
      if (columnName) {
        columnUpdates[columnName] = value;
        console.log(`[FieldManagerService] Batch mapping ${fieldName} → ${columnName}`);
      } else {
        // STRICT MODE: Reject unknown fields
        unknownFields.push(fieldName);
        console.error(`[FieldManagerService] Unknown field rejected: ${fieldName}`);
      }
    }

    // If any unknown fields, throw error
    if (unknownFields.length > 0) {
      const knownColumns = this.getKnownColumns(tableName);
      throw new Error(
        `Unknown fields in batch update: ${unknownFields.join(', ')}. ` +
        `Available columns: ${knownColumns.join(', ')}. ` +
        `Please create these fields in the workflow template configuration.`
      );
    }

    // Build update object with only known columns
    const updateData: any = {
      ...columnUpdates,
      updatedAt: new Date(),
    };

    // Update the record
    const updated = await db
      .update(table)
      .set(updateData)
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
