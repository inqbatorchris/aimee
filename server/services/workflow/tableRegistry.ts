import { 
  addressRecords, 
  workItems, 
  fieldTasks, 
  ragStatusRecords, 
  tariffRecords, 
  financialTransactions,
  objectives,
  keyResults,
  keyResultTasks,
  profitCenters,
  vapiCalls,
  vapiAssistants,
  vapiKnowledgeFiles,
} from '../../../shared/schema.js';

/**
 * Relationship metadata for table relationships.
 * Defines parent-child relationships between tables.
 */
export interface TableRelationship {
  parentTable: string;
  parentKey: string;
  childTable: string;
  childKey: string;
  relationshipType: 'one-to-many' | 'many-to-one';
  label: string;
}

export const TABLE_RELATIONSHIPS: TableRelationship[] = [
  // OKR Hierarchy
  {
    parentTable: 'objectives',
    parentKey: 'id',
    childTable: 'key_results',
    childKey: 'objectiveId',
    relationshipType: 'one-to-many',
    label: 'Key Results of this Objective',
  },
  {
    parentTable: 'key_results',
    parentKey: 'id',
    childTable: 'key_result_tasks',
    childKey: 'keyResultId',
    relationshipType: 'one-to-many',
    label: 'Tasks of this Key Result',
  },
  {
    parentTable: 'objectives',
    parentKey: 'id',
    childTable: 'work_items',
    childKey: 'objectiveId',
    relationshipType: 'one-to-many',
    label: 'Work Items for this Objective',
  },
  {
    parentTable: 'key_results',
    parentKey: 'id',
    childTable: 'work_items',
    childKey: 'keyResultId',
    relationshipType: 'one-to-many',
    label: 'Work Items for this Key Result',
  },
  {
    parentTable: 'key_result_tasks',
    parentKey: 'id',
    childTable: 'work_items',
    childKey: 'keyResultTaskId',
    relationshipType: 'one-to-many',
    label: 'Work Items for this Key Result Task',
  },
  // Finance relationships
  {
    parentTable: 'profit_centers',
    parentKey: 'id',
    childTable: 'financial_transactions',
    childKey: 'profitCenterId',
    relationshipType: 'one-to-many',
    label: 'Transactions for this Profit Center',
  },
];

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
  'financial_transactions': financialTransactions,
  'objectives': objectives,
  'key_results': keyResults,
  'key_result_tasks': keyResultTasks,
  'profit_centers': profitCenters,
  'vapi_calls': vapiCalls,
  'vapi_assistants': vapiAssistants,
  'vapi_knowledge_files': vapiKnowledgeFiles,
};
