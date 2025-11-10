import { useState, useEffect } from 'react';
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
import { Plus, Edit, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import type { ProfitCenter } from '@shared/schema';

interface FormData {
  name: string;
  type: string;
  description: string;
  xeroAccountId: string;
  okrType: 'objective' | 'key_result' | 'key_result_task' | '';
  objectiveId: string;
  keyResultId: string;
  keyResultTaskId: string;
}

export default function ProfitCenters() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<ProfitCenter | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'geographic',
    description: '',
    xeroAccountId: '',
    okrType: '',
    objectiveId: '',
    keyResultId: '',
    keyResultTaskId: '',
  });

  const { data: profitCenters, isLoading } = useQuery<any[]>({
    queryKey: ['/api/finance/profit-centers'],
  });

  const { data: xeroAccounts } = useQuery<any[]>({
    queryKey: ['/api/finance/chart-of-accounts'],
    enabled: dialogOpen,
  });

  const { data: objectives } = useQuery<any[]>({
    queryKey: ['/api/strategy/objectives'],
    enabled: dialogOpen,
  });

  const { data: keyResults } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-results'],
    enabled: dialogOpen && formData.okrType === 'key_result',
  });

  const { data: tasks } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-result-tasks'],
    enabled: dialogOpen && formData.okrType === 'key_result_task',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
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
    onError: (error: any) => {
      toast({
        title: 'Failed to create profit center',
        description: error.message || 'An error occurred while creating the profit center',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
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
    onError: (error: any) => {
      toast({
        title: 'Failed to update profit center',
        description: error.message || 'An error occurred while updating the profit center',
        variant: 'destructive',
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingCenter(null);
    setFormData({
      name: '',
      type: 'geographic',
      description: '',
      xeroAccountId: '',
      okrType: '',
      objectiveId: '',
      keyResultId: '',
      keyResultTaskId: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (center: any) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      type: center.type,
      description: center.description || '',
      xeroAccountId: center.xeroAccountId || '',
      okrType: center.linkedOkrType || '',
      objectiveId: center.objectiveId?.toString() || '',
      keyResultId: center.keyResultId?.toString() || '',
      keyResultTaskId: center.keyResultTaskId?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCenter(null);
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

    if (!formData.okrType) {
      toast({
        title: 'OKR linkage required',
        description: 'Please link this profit center to an Objective, Key Result, or Task',
        variant: 'destructive',
      });
      return;
    }

    if (formData.okrType === 'objective' && !formData.objectiveId) {
      toast({
        title: 'Objective required',
        description: 'Please select an objective',
        variant: 'destructive',
      });
      return;
    }

    if (formData.okrType === 'key_result' && !formData.keyResultId) {
      toast({
        title: 'Key Result required',
        description: 'Please select a key result',
        variant: 'destructive',
      });
      return;
    }

    if (formData.okrType === 'key_result_task' && !formData.keyResultTaskId) {
      toast({
        title: 'Task required',
        description: 'Please select a task',
        variant: 'destructive',
      });
      return;
    }

    const selectedAccount = xeroAccounts?.find(a => a.id.toString() === formData.xeroAccountId);

    const submitData: any = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      linkedOkrType: formData.okrType,
    };

    if (formData.xeroAccountId) {
      submitData.xeroAccountId = selectedAccount?.xeroAccountId;
      submitData.xeroAccountCode = selectedAccount?.code;
      submitData.xeroAccountName = selectedAccount?.name;
    }

    if (formData.okrType === 'objective') {
      submitData.objectiveId = parseInt(formData.objectiveId);
      submitData.keyResultId = null;
      submitData.keyResultTaskId = null;
    } else if (formData.okrType === 'key_result') {
      submitData.keyResultId = parseInt(formData.keyResultId);
      submitData.objectiveId = null;
      submitData.keyResultTaskId = null;
    } else if (formData.okrType === 'key_result_task') {
      submitData.keyResultTaskId = parseInt(formData.keyResultTaskId);
      submitData.objectiveId = null;
      submitData.keyResultId = null;
    }

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profit Centers</h1>
          <p className="text-muted-foreground">
            Track revenue and expenses by business segment with OKR alignment
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

        <Card className="p-6" data-testid="card-okr-linked">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">OKR Linked</span>
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {profitCenters?.filter(pc => pc.linkedOkrType).length || 0}
          </div>
        </Card>

        <Card className="p-6" data-testid="card-xero-mapped">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Xero Mapped</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {profitCenters?.filter(pc => pc.xeroAccountCode).length || 0}
          </div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>OKR Linkage</TableHead>
              <TableHead>Xero Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading profit centers...
                </TableCell>
              </TableRow>
            ) : profitCenters?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No profit centers yet. Create one to start tracking performance.
                </TableCell>
              </TableRow>
            ) : (
              profitCenters?.map(center => (
                <TableRow key={center.id} data-testid={`row-profit-center-${center.id}`}>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getTypeColor(center.type)}`} />
                      {center.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    {center.okrDetails ? (
                      <div>
                        <Badge variant="outline" className="mb-1">
                          {center.linkedOkrType === 'objective' && 'Objective'}
                          {center.linkedOkrType === 'key_result' && 'Key Result'}
                          {center.linkedOkrType === 'key_result_task' && 'Task'}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {center.okrDetails?.title}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not linked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {center.xeroAccountCode ? (
                      <div>
                        <div className="font-mono text-sm">{center.xeroAccountCode}</div>
                        <div className="text-sm text-muted-foreground">{center.xeroAccountName}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not mapped</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{center.description || '-'}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-profit-center">
          <DialogHeader>
            <DialogTitle>
              {editingCenter ? 'Edit Profit Center' : 'Create Profit Center'}
            </DialogTitle>
            <DialogDescription>
              Define a business segment with OKR alignment and optional Xero account mapping
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">OKR Linkage (Required)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Each profit center must be linked to exactly ONE OKR entity to prevent double-counting
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="okrType">Link Type *</Label>
                  <Select
                    value={formData.okrType}
                    onValueChange={(value: any) => setFormData({ 
                      ...formData, 
                      okrType: value,
                      objectiveId: '',
                      keyResultId: '',
                      keyResultTaskId: '',
                    })}
                  >
                    <SelectTrigger id="okrType" data-testid="dialog-select-okr-type">
                      <SelectValue placeholder="Select OKR level..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="objective">Objective</SelectItem>
                      <SelectItem value="key_result">Key Result</SelectItem>
                      <SelectItem value="key_result_task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.okrType === 'objective' && (
                  <div>
                    <Label htmlFor="objectiveId">Objective *</Label>
                    <Select
                      value={formData.objectiveId}
                      onValueChange={value => setFormData({ ...formData, objectiveId: value })}
                    >
                      <SelectTrigger id="objectiveId" data-testid="dialog-select-objective">
                        <SelectValue placeholder="Select an objective..." />
                      </SelectTrigger>
                      <SelectContent>
                        {objectives?.map(obj => (
                          <SelectItem key={obj.id} value={obj.id.toString()}>
                            {obj.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.okrType === 'key_result' && (
                  <div>
                    <Label htmlFor="keyResultId">Key Result *</Label>
                    <Select
                      value={formData.keyResultId}
                      onValueChange={value => setFormData({ ...formData, keyResultId: value })}
                    >
                      <SelectTrigger id="keyResultId" data-testid="dialog-select-key-result">
                        <SelectValue placeholder="Select a key result..." />
                      </SelectTrigger>
                      <SelectContent>
                        {keyResults?.map(kr => (
                          <SelectItem key={kr.id} value={kr.id.toString()}>
                            {kr.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.okrType === 'key_result_task' && (
                  <div>
                    <Label htmlFor="keyResultTaskId">Task *</Label>
                    <Select
                      value={formData.keyResultTaskId}
                      onValueChange={value => setFormData({ ...formData, keyResultTaskId: value })}
                    >
                      <SelectTrigger id="keyResultTaskId" data-testid="dialog-select-task">
                        <SelectValue placeholder="Select a task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks?.map(task => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Xero Integration (Optional)</h3>
              <div>
                <Label htmlFor="xeroAccountId">Chart of Accounts</Label>
                <Select
                  value={formData.xeroAccountId}
                  onValueChange={value => setFormData({ ...formData, xeroAccountId: value })}
                >
                  <SelectTrigger id="xeroAccountId" data-testid="dialog-select-xero-account">
                    <SelectValue placeholder="Select Xero account (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {xeroAccounts?.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Link to a specific Xero account for automated transaction categorization
                </p>
              </div>
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
