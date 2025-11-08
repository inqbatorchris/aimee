import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { Settings, Clock, Bell, Calendar, History, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface StrategySettings {
  id: number;
  organizationId: number;
  cronEnabled: boolean;
  cronSchedule: string;
  lookaheadDays: number;
  autoGenerateWorkItems: boolean;
  generateOnTaskCreation: boolean;
  notifyOnGeneration: boolean;
  notifyEmailRecipients: string[] | null;
  lastCronExecution: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: number;
  description: string;
  metadata: any;
  createdAt: string;
}

export default function StrategySettings() {
  const [editingSettings, setEditingSettings] = useState(false);
  const [viewingActivity, setViewingActivity] = useState(false);
  const [formData, setFormData] = useState<Partial<StrategySettings>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery<StrategySettings>({
    queryKey: ['/api/strategy/settings'],
  });

  // Fetch activity logs
  const { data: activityLogs = [], isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/strategy/settings/activity'],
    enabled: viewingActivity,
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: (updates: Partial<StrategySettings>) =>
      apiRequest('/api/strategy/settings', {
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Strategy automation settings have been saved.',
      });
      setEditingSettings(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings.mutate(formData);
  };

  const cronScheduleOptions = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Daily at 2 AM', value: '0 2 * * *' },
    { label: 'Daily at 8 AM', value: '0 8 * * *' },
    { label: 'Weekly on Monday', value: '0 2 * * 1' },
    { label: 'Custom', value: 'custom' },
  ];

  if (settingsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="md:text-3xl font-bold mb-2 flex items-center gap-2 text-[16px]">
          <Settings className="h-6 w-6 md:h-8 md:w-8" />
          Strategy Automation Settings
        </h1>
        <p className="md:text-base text-gray-600 text-[12px]">
          Configure automated work item generation and notifications for your strategy workflow
        </p>
      </div>
      {/* Settings Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="font-semibold tracking-tight text-[14px]">Automation Configuration</CardTitle>
              <CardDescription className="text-muted-foreground text-[12px]">
                Control how work items are automatically generated from key result tasks
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingActivity(true)}
                className="justify-center"
              >
                <History className="h-4 w-4 mr-2" />
                View Activity
              </Button>
              <Button
                size="sm"
                onClick={() => setEditingSettings(true)}
                className="justify-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      Scheduled Generation
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={settings?.cronEnabled ? 'default' : 'secondary'}>
                      {settings?.cronEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    Automatically generate work items on a schedule
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Schedule
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {settings?.cronSchedule || 'Not set'}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    Cron expression for scheduling automatic generation
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">
                    Lookahead Period
                  </TableCell>
                  <TableCell>
                    {settings?.lookaheadDays} days
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    How many days ahead to generate work items
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">
                    Auto-Generate Work Items
                  </TableCell>
                  <TableCell>
                    <Badge variant={settings?.autoGenerateWorkItems ? 'default' : 'secondary'}>
                      {settings?.autoGenerateWorkItems ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    Generate work items from scheduled key result tasks
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">
                    Generate on Task Creation
                  </TableCell>
                  <TableCell>
                    <Badge variant={settings?.generateOnTaskCreation ? 'default' : 'secondary'}>
                      {settings?.generateOnTaskCreation ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    Immediately create work items when new tasks are added
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-gray-500" />
                      Email Notifications
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={settings?.notifyOnGeneration ? 'default' : 'secondary'}>
                      {settings?.notifyOnGeneration ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    Send email when work items are generated
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">
                    Last Execution
                  </TableCell>
                  <TableCell>
                    {settings?.lastCronExecution ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {format(new Date(settings.lastCronExecution), 'MMM d, yyyy h:mm a')}
                      </div>
                    ) : (
                      <span className="text-gray-500">Never run</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    Last time automated generation ran
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards - Hidden on desktop */}
          <div className="md:hidden space-y-3">
            {/* Scheduled Generation */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium text-sm">Scheduled Generation</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Automatically generate work items on a schedule
                  </p>
                </div>
                <Badge variant={settings?.cronEnabled ? 'default' : 'secondary'} className="text-xs">
                  {settings?.cronEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </Card>

            {/* Schedule */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium text-sm">Schedule</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Cron expression for scheduling automatic generation
                  </p>
                </div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {settings?.cronSchedule || 'Not set'}
                </code>
              </div>
            </Card>

            {/* Lookahead Period */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Lookahead Period</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    How many days ahead to generate work items
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {settings?.lookaheadDays} days
                </span>
              </div>
            </Card>

            {/* Auto-Generate Work Items */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Auto-Generate Work Items</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Generate work items from scheduled key result tasks
                  </p>
                </div>
                <Badge variant={settings?.autoGenerateWorkItems ? 'default' : 'secondary'} className="text-xs">
                  {settings?.autoGenerateWorkItems ? 'Yes' : 'No'}
                </Badge>
              </div>
            </Card>

            {/* Generate on Task Creation */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Generate on Task Creation</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Immediately create work items when new tasks are added
                  </p>
                </div>
                <Badge variant={settings?.generateOnTaskCreation ? 'default' : 'secondary'} className="text-xs">
                  {settings?.generateOnTaskCreation ? 'Yes' : 'No'}
                </Badge>
              </div>
            </Card>

            {/* Email Notifications */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium text-sm">Email Notifications</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Send email when work items are generated
                  </p>
                </div>
                <Badge variant={settings?.notifyOnGeneration ? 'default' : 'secondary'} className="text-xs">
                  {settings?.notifyOnGeneration ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </Card>

            {/* Last Execution */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Last Execution</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Last time automated generation ran
                  </p>
                </div>
                <div className="text-right">
                  {settings?.lastCronExecution ? (
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-xs">{format(new Date(settings.lastCronExecution), 'MMM d, h:mm a')}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Never run</span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>
      {/* Edit Settings Sheet */}
      <Sheet open={editingSettings} onOpenChange={setEditingSettings}>
        <SheetContent className="sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Edit Automation Settings</SheetTitle>
            <SheetDescription>
              Configure how work items are automatically generated from your strategy
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Scheduled Generation */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Scheduled Generation</Label>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cronEnabled">Enable scheduled generation</Label>
                  <Switch
                    id="cronEnabled"
                    checked={formData.cronEnabled || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, cronEnabled: checked })
                    }
                  />
                </div>
              </div>

              {/* Cron Schedule */}
              {formData.cronEnabled && (
                <div className="space-y-3">
                  <Label htmlFor="cronSchedule">Schedule</Label>
                  <select
                    id="cronSchedule"
                    className="w-full px-3 py-2 border rounded-md"
                    value={
                      cronScheduleOptions.find(opt => opt.value === formData.cronSchedule)
                        ? formData.cronSchedule
                        : 'custom'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setFormData({ ...formData, cronSchedule: e.target.value });
                      }
                    }}
                  >
                    {cronScheduleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  {!cronScheduleOptions.find(opt => opt.value === formData.cronSchedule) && (
                    <Input
                      placeholder="Enter custom cron expression"
                      value={formData.cronSchedule || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, cronSchedule: e.target.value })
                      }
                    />
                  )}
                </div>
              )}

              {/* Lookahead Days */}
              <div className="space-y-3">
                <Label htmlFor="lookaheadDays">Lookahead Period (days)</Label>
                <Input
                  id="lookaheadDays"
                  type="number"
                  min="1"
                  max="90"
                  value={formData.lookaheadDays || 7}
                  onChange={(e) =>
                    setFormData({ ...formData, lookaheadDays: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-gray-600">
                  Generate work items for this many days in the future
                </p>
              </div>

              {/* Auto-Generation Options */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Generation Options</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoGenerateWorkItems">
                    Auto-generate from scheduled tasks
                  </Label>
                  <Switch
                    id="autoGenerateWorkItems"
                    checked={formData.autoGenerateWorkItems || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoGenerateWorkItems: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="generateOnTaskCreation">
                    Generate immediately on task creation
                  </Label>
                  <Switch
                    id="generateOnTaskCreation"
                    checked={formData.generateOnTaskCreation || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, generateOnTaskCreation: checked })
                    }
                  />
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Notifications</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifyOnGeneration">
                    Send email notifications
                  </Label>
                  <Switch
                    id="notifyOnGeneration"
                    checked={formData.notifyOnGeneration || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notifyOnGeneration: checked })
                    }
                  />
                </div>
                
                {formData.notifyOnGeneration && (
                  <div className="space-y-2">
                    <Label htmlFor="emailRecipients">Email Recipients</Label>
                    <Input
                      id="emailRecipients"
                      placeholder="Enter email addresses separated by commas"
                      value={formData.notifyEmailRecipients?.join(', ') || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notifyEmailRecipients: e.target.value
                            .split(',')
                            .map(email => email.trim())
                            .filter(email => email.length > 0),
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingSettings(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      {/* Activity Logs Sheet */}
      <Sheet open={viewingActivity} onOpenChange={setViewingActivity}>
        <SheetContent className="sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Generation Activity</SheetTitle>
            <SheetDescription>
              Recent automated work item generation history
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-4 pr-4">
              {activityLoading ? (
                <div className="text-center py-8 text-gray-500">Loading activity...</div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No generation activity yet</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {log.metadata?.created > 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="font-medium">{log.description}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    
                    {log.metadata && (
                      <div className="text-sm text-gray-600 ml-7 space-y-1">
                        {log.metadata.created !== undefined && (
                          <div>Created: {log.metadata.created} items</div>
                        )}
                        {log.metadata.skipped !== undefined && (
                          <div>Skipped: {log.metadata.skipped} items</div>
                        )}
                        {log.metadata.errorCount !== undefined && log.metadata.errorCount > 0 && (
                          <div className="text-red-600">Errors: {log.metadata.errorCount}</div>
                        )}
                        {log.metadata.lookaheadDays && (
                          <div>Lookahead: {log.metadata.lookaheadDays} days</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}