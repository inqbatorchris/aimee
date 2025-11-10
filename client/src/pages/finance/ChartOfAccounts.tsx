import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, Search, Filter } from 'lucide-react';

interface XeroAccount {
  id: number;
  xeroAccountId: string;
  code: string;
  name: string;
  type: string | null;
  accountClass: string | null;
  status: string | null;
  description: string | null;
  taxType: string | null;
  profitCentersMapped: number;
  lastSyncedAt: string;
}

export default function ChartOfAccounts() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mappingFilter, setMappingFilter] = useState<string>('all');

  const { data: accounts, isLoading } = useQuery<XeroAccount[]>({
    queryKey: ['/api/finance/chart-of-accounts', { 
      search: searchTerm || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      accountClass: classFilter !== 'all' ? classFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/finance/chart-of-accounts/sync', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/chart-of-accounts'] });
      toast({
        title: 'Sync complete',
        description: `Synced ${data.syncedCount} accounts from Xero`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync accounts from Xero',
        variant: 'destructive',
      });
    },
  });

  const filteredAccounts = accounts?.filter(account => {
    if (mappingFilter === 'mapped' && account.profitCentersMapped === 0) return false;
    if (mappingFilter === 'unmapped' && account.profitCentersMapped > 0) return false;
    return true;
  }) || [];

  const accountTypes = Array.from(new Set(accounts?.map(a => a.type).filter(Boolean)));
  const accountClasses = Array.from(new Set(accounts?.map(a => a.accountClass).filter(Boolean)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage Xero account codes and profit center mappings
          </p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-accounts"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync from Xero
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-accounts"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {accountTypes.map(type => (
                  <SelectItem key={type} value={type!}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger data-testid="select-class-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {accountClasses.map(cls => (
                  <SelectItem key={cls} value={cls!}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Mapping</label>
            <Select value={mappingFilter} onValueChange={setMappingFilter}>
              <SelectTrigger data-testid="select-mapping-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="mapped">Mapped</SelectItem>
                <SelectItem value="unmapped">Unmapped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredAccounts.length} of {accounts?.length || 0} accounts
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {accounts?.length === 0 ? 'No accounts synced yet' : 'No accounts match your filters'}
            </p>
            {accounts?.length === 0 && (
              <Button onClick={() => syncMutation.mutate()} data-testid="button-sync-first">
                <Download className="mr-2 h-4 w-4" />
                Sync from Xero
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profit Centers</TableHead>
                  <TableHead className="text-right">Last Synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id} data-testid={`row-account-${account.code}`}>
                    <TableCell className="font-mono font-medium">{account.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        {account.description && (
                          <div className="text-sm text-muted-foreground">{account.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.type || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{account.accountClass || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}
                        data-testid={`badge-status-${account.code}`}
                      >
                        {account.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.profitCentersMapped > 0 ? (
                        <Badge variant="default" data-testid={`badge-mapped-${account.code}`}>
                          {account.profitCentersMapped} mapped
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unmapped</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(account.lastSyncedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
