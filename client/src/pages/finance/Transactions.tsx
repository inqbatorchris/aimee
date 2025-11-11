import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Filter, Tag, CheckSquare, Download, ArrowUpDown } from 'lucide-react';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  subMonths, 
  subQuarters, 
  format 
} from 'date-fns';
import type { FinancialTransaction, ProfitCenter } from '@shared/schema';

export default function Transactions() {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [categorizeDialogOpen, setCategorizeDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    profitCenterId: '',
    category: '',
    notes: '',
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    profitCenter: 'all',
    search: '',
  });

  const [datePreset, setDatePreset] = useState('custom');

  const { data: transactions = [], isLoading, error } = useQuery<FinancialTransaction[]>({
    queryKey: ['/api/finance/transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.profitCenter && filters.profitCenter !== 'all') params.append('profitCenterId', filters.profitCenter);
      if (filters.search) params.append('search', filters.search);
      
      const url = `/api/finance/transactions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to fetch transactions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: profitCenters } = useQuery<ProfitCenter[]>({
    queryKey: ['/api/finance/profit-centers'],
  });

  const categorizeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/finance/transactions/${id}/categorize`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions'] });
      toast({
        title: 'Transaction categorized',
        description: 'Transaction has been successfully categorized',
      });
      setCategorizeDialogOpen(false);
      setSelectedTransaction(null);
    },
  });

  const bulkCategorizeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/finance/transactions/bulk-categorize', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions'] });
      toast({
        title: 'Bulk categorization complete',
        description: `Categorized ${data?.updated || 0} transactions`,
      });
      setSelectedIds([]);
    },
  });

  const handleCategorize = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setCategoryForm({
      profitCenterId: transaction.profitCenterTags?.[0]?.toString() || '',
      category: transaction.primaryCategoryName || '',
      notes: transaction.notes || '',
    });
    setCategorizeDialogOpen(true);
  };

  const handleSaveCategorization = () => {
    if (selectedTransaction) {
      categorizeMutation.mutate({
        id: selectedTransaction.id,
        data: {
          profitCenterId: categoryForm.profitCenterId ? parseInt(categoryForm.profitCenterId) : null,
          category: categoryForm.category || null,
          notes: categoryForm.notes || null,
        },
      });
    }
  };

  const handleBulkCategorize = () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'No transactions selected',
        description: 'Please select transactions to categorize',
        variant: 'destructive',
      });
      return;
    }

    if (!categoryForm.profitCenterId && !categoryForm.category) {
      toast({
        title: 'Missing categorization',
        description: 'Please select a profit center or category',
        variant: 'destructive',
      });
      return;
    }

    bulkCategorizeMutation.mutate({
      transactionIds: selectedIds,
      profitCenterId: categoryForm.profitCenterId ? parseInt(categoryForm.profitCenterId) : null,
      category: categoryForm.category || null,
      notes: categoryForm.notes || null,
    });
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(t => t.id));
    }
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    switch (preset) {
      case 'today':
        startDate = format(startOfDay(today), 'yyyy-MM-dd');
        endDate = format(endOfDay(today), 'yyyy-MM-dd');
        break;
      case 'this_week':
        startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'this_month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'this_quarter':
        startDate = format(startOfQuarter(today), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'last_quarter':
        const lastQuarter = subQuarters(today, 1);
        startDate = format(startOfQuarter(lastQuarter), 'yyyy-MM-dd');
        endDate = format(endOfQuarter(lastQuarter), 'yyyy-MM-dd');
        break;
      case 'this_year':
        startDate = format(startOfYear(today), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'all_time':
        startDate = '';
        endDate = '';
        break;
      case 'custom':
        setDatePreset('custom');
        return;
      default:
        return;
    }

    setFilters({ ...filters, startDate, endDate });
    setDatePreset(preset);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      categorized: 'default',
      uncategorized: 'secondary',
      pending: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Categorize and analyze all financial transactions
          </p>
          {error && (
            <p className="text-sm text-destructive mt-1">
              Error loading transactions. Please check your Xero connection.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              onClick={handleBulkCategorize}
              disabled={bulkCategorizeMutation.isPending}
              data-testid="button-bulk-categorize"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Categorize {selectedIds.length} Selected
            </Button>
          )}
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <Label htmlFor="datePreset">Date Range</Label>
            <Select
              value={datePreset}
              onValueChange={applyDatePreset}
            >
              <SelectTrigger id="datePreset" data-testid="select-date-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={e => {
                setFilters({ ...filters, startDate: e.target.value });
                setDatePreset('custom');
              }}
              data-testid="input-start-date"
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={e => {
                setFilters({ ...filters, endDate: e.target.value });
                setDatePreset('custom');
              }}
              data-testid="input-end-date"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status}
              onValueChange={value => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger id="status" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="categorized">Categorized</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="profitCenter">Profit Center</Label>
            <Select
              value={filters.profitCenter}
              onValueChange={value => setFilters({ ...filters, profitCenter: value })}
            >
              <SelectTrigger id="profitCenter" data-testid="select-profit-center">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {profitCenters?.map(pc => (
                  <SelectItem key={pc.id} value={pc.id.toString()}>
                    {pc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search description..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              data-testid="input-search"
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === transactions.length && transactions.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                  disabled={!!error || transactions.length === 0}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profit Center</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-destructive">
                  Failed to load transactions. Please reconnect to Xero from the Xero Setup page.
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No transactions found. Use the Sync button on the dashboard to import from Xero.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map(transaction => (
                <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(transaction.id)}
                      onCheckedChange={() => toggleSelection(transaction.id)}
                      data-testid={`checkbox-transaction-${transaction.id}`}
                    />
                  </TableCell>
                  <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                  <TableCell>{transaction.xeroTransactionType}</TableCell>
                  <TableCell className={parseFloat(transaction.amount) < 0 ? 'text-red-600' : 'text-green-600'}>
                    £{Math.abs(parseFloat(transaction.amount)).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.categorizationStatus)}</TableCell>
                  <TableCell>
                    {transaction.profitCenterTags?.[0]
                      ? profitCenters?.find(pc => pc.id === transaction.profitCenterTags?.[0])?.name
                      : profitCenters?.find(pc => pc.xeroAccountCode === transaction.xeroAccountCode)?.name || '-'}
                  </TableCell>
                  <TableCell>{transaction.primaryCategoryName || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCategorize(transaction)}
                      data-testid={`button-categorize-${transaction.id}`}
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={categorizeDialogOpen} onOpenChange={setCategorizeDialogOpen}>
        <DialogContent data-testid="dialog-categorize">
          <DialogHeader>
            <DialogTitle>Categorize Transaction</DialogTitle>
            <DialogDescription>
              Assign profit center and category to this transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="profitCenter">Profit Center</Label>
              <Select
                value={categoryForm.profitCenterId}
                onValueChange={value => setCategoryForm({ ...categoryForm, profitCenterId: value })}
              >
                <SelectTrigger id="profitCenter" data-testid="dialog-select-profit-center">
                  <SelectValue placeholder="Select profit center" />
                </SelectTrigger>
                <SelectContent>
                  {profitCenters?.map(pc => (
                    <SelectItem key={pc.id} value={pc.id.toString()}>
                      {pc.name} - {pc.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={categoryForm.category}
                onChange={e => setCategoryForm({ ...categoryForm, category: e.target.value })}
                placeholder="e.g., Network Equipment, Marketing, Salaries"
                data-testid="dialog-input-category"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={categoryForm.notes}
                onChange={e => setCategoryForm({ ...categoryForm, notes: e.target.value })}
                placeholder="Optional notes"
                data-testid="dialog-input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategorizeDialogOpen(false)}
              data-testid="dialog-button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategorization}
              disabled={categorizeMutation.isPending}
              data-testid="dialog-button-save"
            >
              {categorizeMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
