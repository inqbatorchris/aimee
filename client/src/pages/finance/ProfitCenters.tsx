import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Edit, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { ProfitCenter, InsertProfitCenter } from '@shared/schema';

export default function ProfitCenters() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<ProfitCenter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'geographic',
    description: '',
  });

  const { data: profitCenters, isLoading } = useQuery<ProfitCenter[]>({
    queryKey: ['/api/finance/profit-centers'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProfitCenter) => {
      return apiRequest('/api/finance/profit-centers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/profit-centers'] });
      toast({
        title: 'Profit center created',
        description: 'Profit center has been successfully created',
      });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProfitCenter> }) => {
      return apiRequest(`/api/finance/profit-centers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/profit-centers'] });
      toast({
        title: 'Profit center updated',
        description: 'Profit center has been successfully updated',
      });
      handleCloseDialog();
    },
  });

  const handleOpenCreate = () => {
    setEditingCenter(null);
    setFormData({
      name: '',
      type: 'geographic',
      description: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (center: ProfitCenter) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      type: center.type,
      description: center.description || '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCenter(null);
    setFormData({ name: '', type: 'geographic', description: '' });
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the profit center',
        variant: 'destructive',
      });
      return;
    }

    const submitData: any = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
    };

    if (editingCenter) {
      updateMutation.mutate({
        id: editingCenter.id,
        data: submitData,
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      geographic: 'bg-blue-500',
      service: 'bg-green-500',
      customer: 'bg-purple-500',
      project: 'bg-orange-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const calculateMetrics = (center: ProfitCenter) => {
    return { revenue: 0, expenses: 0, margin: 0 };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profit Centers</h1>
          <p className="text-muted-foreground">
            Track revenue and expenses by business segment
          </p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-create">
          <Plus className="w-4 h-4 mr-2" />
          Create Profit Center
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6" data-testid="card-total-centers">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Centers</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{profitCenters?.length || 0}</div>
        </Card>

        <Card className="p-6" data-testid="card-total-revenue">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            £
            {profitCenters
              ?.reduce((sum, pc) => sum + calculateMetrics(pc).revenue, 0)
              .toLocaleString()}
          </div>
        </Card>

        <Card className="p-6" data-testid="card-avg-margin">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Avg Margin</span>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {profitCenters && profitCenters.length > 0
              ? (
                  profitCenters.reduce((sum, pc) => sum + calculateMetrics(pc).margin, 0) /
                  profitCenters.length
                ).toFixed(1)
              : 0}
            %
          </div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading profit centers...
                </TableCell>
              </TableRow>
            ) : profitCenters?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No profit centers yet. Create one to start tracking performance.
                </TableCell>
              </TableRow>
            ) : (
              profitCenters?.map(center => {
                const metrics = calculateMetrics(center);
                return (
                  <TableRow key={center.id} data-testid={`row-profit-center-${center.id}`}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(center.type)}`} />
                        {center.type}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{center.description || '-'}</TableCell>
                    <TableCell className="text-right text-green-600">
                      £{metrics.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      £{metrics.expenses.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={metrics.margin > 20 ? 'default' : 'secondary'}>
                        {metrics.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(center)}
                        data-testid={`button-edit-${center.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-profit-center">
          <DialogHeader>
            <DialogTitle>
              {editingCenter ? 'Edit Profit Center' : 'Create Profit Center'}
            </DialogTitle>
            <DialogDescription>
              Define a business segment to track revenue and expenses separately
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., North Zone, Residential Service"
                data-testid="dialog-input-name"
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={value => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type" data-testid="dialog-select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geographic">Geographic Zone</SelectItem>
                  <SelectItem value="service">Service Type</SelectItem>
                  <SelectItem value="customer">Customer Segment</SelectItem>
                  <SelectItem value="project">Project/Initiative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                data-testid="dialog-input-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              data-testid="dialog-button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="dialog-button-save"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
