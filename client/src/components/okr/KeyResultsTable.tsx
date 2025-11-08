import KeyResultRow from './KeyResultRow';
// Clean architecture type - simplified for MVP
type KeyResult = {
  id: number;
  title: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  status?: string;
  ownerId?: number;
};

interface KeyResultsTableProps {
  keyResults: KeyResult[];
  objectiveId: number;
}

export default function KeyResultsTable({ keyResults, objectiveId }: KeyResultsTableProps) {
  if (keyResults.length === 0) {
    return (
      <div className="bg-gray-25 border-t p-4 text-center text-sm text-gray-500">
        No key results defined for this objective
      </div>
    );
  }

  return (
    <div className="bg-gray-25 border-t">
      {/* Desktop Table Headers */}
      <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-2 bg-gray-100 text-xs font-medium text-gray-600">
        <div>Key Result</div>
        <div>Current</div>
        <div>Target</div>
        <div>Progress</div>
        <div>Actions</div>
      </div>
      
      {/* Mobile Header */}
      <div className="lg:hidden p-3 bg-gray-100 text-xs font-medium text-gray-600 border-b">
        Key Results ({keyResults.length})
      </div>
      
      {/* Key Result Rows */}
      <div className="divide-y divide-gray-200">
        {keyResults.map((keyResult) => (
          <KeyResultRow 
            key={keyResult.id}
            keyResult={keyResult}
            objectiveId={objectiveId}
          />
        ))}
      </div>
    </div>
  );
}