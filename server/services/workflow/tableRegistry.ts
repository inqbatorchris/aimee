import { addressRecords, workItems, fieldTasks, ragStatusRecords, tariffRecords } from '../../../shared/schema.js';

/**
 * Registry of database tables available for data source queries.
 * Maps table names to their Drizzle schema definitions.
 */
export const TABLE_REGISTRY: Record<string, any> = {
  'address_records': addressRecords,
  'work_items': workItems,
  'field_tasks': fieldTasks,
  'rag_status_records': ragStatusRecords,
  'tariff_records': tariffRecords,
};
