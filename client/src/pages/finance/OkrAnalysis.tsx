import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Target, TrendingUp, TrendingDown, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialMetrics {
  revenue: number;
  expenses: number;
  profit: number;
  transactionCount: number;
}

interface TaskData {
  id: number;
  title: string;
  status: string;
  profitCenterCount: number;
  financials: FinancialMetrics;
}

interface KeyResultData {
  id: number;
  title: string;
  type: string;
  targetValue: string;
  currentValue: string;
  profitCenterCount: number;
  financials: FinancialMetrics;
  tasks: TaskData[];
}

interface ObjectiveData {
  id: number;
  title: string;
  category: string;
  priority: string;
  profitCenterCount: number;
  financials: FinancialMetrics;
  keyResults: KeyResultData[];
}

interface OkrAnalysisData {
  dateFrom: string | null;
  dateTo: string | null;
  objectives: ObjectiveData[];
}

export default function OkrAnalysis() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());
  const [expandedKeyResults, setExpandedKeyResults] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<OkrAnalysisData>({
    queryKey: ['/api/finance/analysis/okr-hierarchy', { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }],
  });

  const toggleObjective = (id: number) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedObjectives(newExpanded);
  };

  const toggleKeyResult = (id: number) => {
    const newExpanded = new Set(expandedKeyResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedKeyResults(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const totalRevenue = data?.objectives.reduce((sum, obj) => sum + obj.financials.revenue, 0) || 0;
  const totalExpenses = data?.objectives.reduce((sum, obj) => sum + obj.financials.expenses, 0) || 0;
  const totalProfit = data?.objectives.reduce((sum, obj) => sum + obj.financials.profit, 0) || 0;

  const MetricsRow = ({ metrics, showPercentage = false }: { metrics: FinancialMetrics; showPercentage?: boolean }) => (
    <div className="grid grid-cols-4 gap-4 text-sm">
      <div>
        <span className="text-green-600 font-medium">{formatCurrency(metrics.revenue)}</span>
        {showPercentage && totalRevenue > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            ({formatPercentage(metrics.revenue, totalRevenue)})
          </span>
        )}
      </div>
      <div>
        <span className="text-red-600 font-medium">{formatCurrency(metrics.expenses)}</span>
        {showPercentage && totalExpenses > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            ({formatPercentage(metrics.expenses, totalExpenses)})
          </span>
        )}
      </div>
      <div>
        <span className={cn("font-medium", metrics.profit >= 0 ? "text-green-600" : "text-red-600")}>
          {formatCurrency(metrics.profit)}
        </span>
        {showPercentage && totalProfit > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            ({formatPercentage(metrics.profit, totalProfit)})
          </span>
        )}
      </div>
      <div className="text-muted-foreground">{metrics.transactionCount} txns</div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">OKR Financial Analysis</h1>
        <p className="text-muted-foreground mt-1">
          View financial performance aligned with strategic objectives
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="input-date-from"
            />
          </div>
          <div>
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="input-date-to"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Net Profit</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className={cn("text-2xl font-bold", totalProfit >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(totalProfit)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Objectives</span>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{data?.objectives.length || 0}</div>
          </Card>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">
          Loading financial analysis...
        </Card>
      ) : !data?.objectives.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          No objectives with financial data found
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
              <div>Revenue</div>
              <div>Expenses</div>
              <div>Profit</div>
              <div>Transactions</div>
            </div>
          </Card>

          {data.objectives.map((objective) => (
            <Card key={objective.id} className="overflow-hidden" data-testid={`objective-${objective.id}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleObjective(objective.id)}
                      className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`toggle-objective-${objective.id}`}
                    >
                      {expandedObjectives.has(objective.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold">{objective.title}</h3>
                        <Badge variant="outline">{objective.category}</Badge>
                        <Badge variant="secondary">{objective.priority}</Badge>
                        {objective.profitCenterCount > 0 && (
                          <Badge variant="default">{objective.profitCenterCount} centers</Badge>
                        )}
                      </div>
                      <MetricsRow metrics={objective.financials} showPercentage={true} />
                    </div>
                  </div>
                </div>

                {expandedObjectives.has(objective.id) && objective.keyResults.length > 0 && (
                  <div className="ml-8 mt-4 space-y-3 border-l-2 border-muted pl-4">
                    {objective.keyResults.map((kr) => (
                      <div key={kr.id} className="space-y-2" data-testid={`key-result-${kr.id}`}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleKeyResult(kr.id)}
                            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`toggle-kr-${kr.id}`}
                          >
                            {expandedKeyResults.has(kr.id) && kr.tasks.length > 0 ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-sm">{kr.title}</span>
                              <Badge variant="outline" className="text-xs">{kr.type}</Badge>
                              {kr.profitCenterCount > 0 && (
                                <Badge variant="secondary" className="text-xs">{kr.profitCenterCount} centers</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Progress: {kr.currentValue} / {kr.targetValue}
                            </div>
                            <MetricsRow metrics={kr.financials} />
                          </div>
                        </div>

                        {expandedKeyResults.has(kr.id) && kr.tasks.length > 0 && (
                          <div className="ml-7 space-y-2 border-l-2 border-muted pl-4">
                            {kr.tasks.map((task) => (
                              <div key={task.id} className="flex items-start gap-2" data-testid={`task-${task.id}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <span className="text-sm">{task.title}</span>
                                    <Badge variant="outline" className="text-xs">{task.status}</Badge>
                                    {task.profitCenterCount > 0 && (
                                      <Badge variant="secondary" className="text-xs">{task.profitCenterCount} centers</Badge>
                                    )}
                                  </div>
                                  <MetricsRow metrics={task.financials} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
