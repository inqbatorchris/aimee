import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { KeyResultDetailPanel } from '@/components/key-result-detail/KeyResultDetailPanel';
import KeyResultRow from '@/components/okr/KeyResultRow';

interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  description?: string;
  metricType: 'number' | 'percentage' | 'currency' | 'binary';
  targetValue: string;
  currentValue: string;
  unit?: string;
  ownerId?: number;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: number;
    fullName: string;
    email: string;
  };
  objective?: {
    id: number;
    title: string;
  };
}

export default function KeyResults() {
  const [selectedObjective, setSelectedObjective] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedKeyResults, setExpandedKeyResults] = useState<Set<number>>(new Set());
  
  // Key Result Detail Panel state
  const [keyResultPanelOpen, setKeyResultPanelOpen] = useState(false);
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | null>(null);

  // Fetch all objectives for filter
  const { data: objectives = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/objectives'],
  });

  // Fetch all key results
  const { data: keyResults = [], isLoading } = useQuery<KeyResult[]>({
    queryKey: ['/api/strategy/key-results'],
  });

  // Filter key results
  const filteredKeyResults = keyResults.filter((kr: KeyResult) => {
    const matchesObjective = selectedObjective === 'all' || kr.objectiveId === parseInt(selectedObjective);
    
    // Status filter logic - we need to determine status based on progress
    const current = parseFloat(kr.currentValue) || 0;
    const target = parseFloat(kr.targetValue) || 1;
    const progress = (current / target) * 100;
    
    let status = 'on-track';
    if (progress >= 100) status = 'achieved';
    else if (progress < 50) status = 'at-risk';
    
    const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
    
    return matchesObjective && matchesStatus;
  });

  const toggleExpanded = (keyResultId: number) => {
    const newExpanded = new Set(expandedKeyResults);
    if (newExpanded.has(keyResultId)) {
      newExpanded.delete(keyResultId);
    } else {
      newExpanded.add(keyResultId);
    }
    setExpandedKeyResults(newExpanded);
  };

  const handleViewKeyResult = (keyResultId: number) => {
    setSelectedKeyResultId(keyResultId);
    setKeyResultPanelOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-3 border-b bg-white">
        <div className="mb-2">
          <h1 className="text-lg font-semibold text-gray-900">Key Results ({filteredKeyResults.length})</h1>
          <p className="text-xs text-gray-600 mt-1">
            Track and monitor all key results across your organization's objectives.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedObjective} onValueChange={setSelectedObjective}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue placeholder="All Objectives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Objectives</SelectItem>
              {objectives.map((objective: any) => (
                <SelectItem key={objective.id} value={objective.id.toString()}>
                  {objective.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="achieved">Achieved</SelectItem>
              <SelectItem value="on-track">On Track</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredKeyResults.length > 0 ? (
            filteredKeyResults.map((keyResult) => (
              <KeyResultRow
                key={keyResult.id}
                keyResult={keyResult}
                objectiveId={keyResult.objectiveId}
                onViewKeyResult={handleViewKeyResult}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No key results found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Key Result Detail Panel */}
      {selectedKeyResultId && (
        <KeyResultDetailPanel
          keyResultId={selectedKeyResultId}
          open={keyResultPanelOpen}
          onClose={() => setKeyResultPanelOpen(false)}
        />
      )}
    </div>
  );
}