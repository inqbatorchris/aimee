import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Bot,
  CheckCircle,
  Loader2,
  BookOpen,
  Target,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronRight,
  Save,
  ExternalLink,
  Settings,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const aiConfigSchema = z.object({
  model: z.string().min(1, "Model selection is required"),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(4000),
  knowledgeDocumentIds: z.array(z.number()),
  objectiveId: z.number().optional(),
  keyResultIds: z.array(z.number()),
  isEnabled: z.boolean(),
});

type AIConfigFormData = z.infer<typeof aiConfigSchema>;

const DEFAULT_SYSTEM_PROMPT = `You are a professional customer support agent. Generate clear, empathetic, and helpful responses to customer support tickets.

Follow these guidelines:
- Be concise and professional
- Address all points raised in the ticket
- Provide actionable solutions when possible
- Use a friendly, supportive tone
- Reference knowledge base documentation when relevant

Use the knowledge base context provided to ensure accuracy and consistency with company policies.`;

export default function AITicketDraftingSetup() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingConfig, isLoading: configLoading } = useQuery<any>({
    queryKey: ['/api/ai-drafting/config'],
    retry: false,
  });

  const { data: kbDocuments = [], isLoading: kbLoading } = useQuery<any[]>({
    queryKey: ['/api/knowledge-base'],
  });

  const { data: objectives = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/objectives'],
  });

  const { data: allKeyResults = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-results'],
  });

  const form = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      model: 'gpt-4o-mini',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 1000,
      knowledgeDocumentIds: [],
      objectiveId: undefined,
      keyResultIds: [],
      isEnabled: false,
    },
  });

  useEffect(() => {
    if (existingConfig && existingConfig.id) {
      form.reset({
        model: existingConfig.modelConfig?.model || 'gpt-4o-mini',
        systemPrompt: existingConfig.modelConfig?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        temperature: existingConfig.modelConfig?.temperature || 0.7,
        maxTokens: existingConfig.modelConfig?.maxTokens || 1000,
        knowledgeDocumentIds: existingConfig.knowledgeDocumentIds || [],
        objectiveId: existingConfig.linkedObjectiveId || undefined,
        keyResultIds: existingConfig.linkedKeyResultIds || [],
        isEnabled: existingConfig.isEnabled || false,
      });
    }
  }, [existingConfig, form]);

  const selectedObjectiveId = form.watch('objectiveId');
  const availableKeyResults = allKeyResults.filter(kr => kr.objectiveId === selectedObjectiveId);
  const isEnabled = form.watch('isEnabled');
  const selectedKbDocs = form.watch('knowledgeDocumentIds');

  const saveMutation = useMutation({
    mutationFn: async (data: AIConfigFormData) => {
      return await apiRequest('/api/ai-drafting/config', {
        method: 'POST',
        body: {
          featureType: 'ticket_drafting',
          modelConfig: {
            model: data.model,
            systemPrompt: data.systemPrompt,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
          },
          knowledgeDocumentIds: data.knowledgeDocumentIds,
          linkedObjectiveId: data.objectiveId || null,
          linkedKeyResultIds: data.keyResultIds,
          isEnabled: data.isEnabled,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings saved',
        description: 'AI ticket drafting configuration has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-drafting/config'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save',
        description: error?.message || 'Could not save configuration.',
        variant: 'destructive',
      });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return await apiRequest('/api/knowledge-base/documents', {
        method: 'POST',
        body: {
          title: data.title,
          content: data.content || '',
          status: 'published',
          visibility: 'internal',
          documentType: 'internal_kb',
          categories: ['Support'],
          tags: [],
        },
      });
    },
    onSuccess: (newDoc: any) => {
      toast({
        title: 'Document created',
        description: 'Knowledge base document has been created.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      setCreateDocOpen(false);
      setNewDocTitle("");
      setNewDocContent("");
      if (newDoc?.id) {
        const currentIds = form.getValues('knowledgeDocumentIds');
        form.setValue('knowledgeDocumentIds', [...currentIds, newDoc.id]);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create document',
        description: error?.message || 'Could not create document.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AIConfigFormData) => {
    saveMutation.mutate(data);
  };

  const handleCreateDoc = () => {
    if (!newDocTitle.trim()) {
      toast({ title: 'Title required', description: 'Please enter a document title.', variant: 'destructive' });
      return;
    }
    createDocMutation.mutate({ title: newDocTitle, content: newDocContent });
  };

  if (configLoading || kbLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-spinner" />
        </div>
      </div>
    );
  }

  const isConfigured = existingConfig?.id;

  return (
    <div className="container mx-auto py-4 px-4 pb-24 md:pb-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/integrations">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            ← Back to Integrations
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 bg-opacity-10 shrink-0">
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">AI Ticket Response Drafting</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically generate draft responses for support tickets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <Badge variant="outline" className="gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200">
                <CheckCircle className="h-3 w-3" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not Configured
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Enable AI Drafting
                </CardTitle>
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-enabled"
                        />
                      </FormControl>
                      <Label className="text-sm font-normal">
                        {field.value ? 'Enabled' : 'Disabled'}
                      </Label>
                    </FormItem>
                  )}
                />
              </div>
              <CardDescription>
                When enabled, AI will automatically generate draft responses for incoming support tickets
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Model Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-model">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o (Best)</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-temperature"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">0 = precise, 2 = creative</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Response Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="100"
                          min="100"
                          max="4000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-max-tokens"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Tokens (100-4000)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder="Enter instructions for the AI..."
                        className="font-mono text-sm"
                        data-testid="input-system-prompt"
                      />
                    </FormControl>
                    <FormDescription>
                      Instructions that guide how the AI generates responses
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Knowledge Base
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDocOpen(true)}
                    data-testid="button-create-doc"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Document
                  </Button>
                  <Link href="/knowledge-base">
                    <Button type="button" variant="ghost" size="sm" data-testid="button-manage-kb">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Manage All
                    </Button>
                  </Link>
                </div>
              </div>
              <CardDescription>
                Select documents the AI will use as context when generating responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="knowledgeDocumentIds"
                render={() => (
                  <FormItem>
                    {kbDocuments.length === 0 ? (
                      <Alert>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span>No knowledge base documents found.</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateDocOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create your first document
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                        {kbDocuments.map((doc) => (
                          <FormField
                            key={doc.id}
                            control={form.control}
                            name="knowledgeDocumentIds"
                            render={({ field }) => {
                              const isChecked = field.value?.includes(doc.id);
                              return (
                                <FormItem
                                  key={doc.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-3 hover:bg-accent cursor-pointer"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, doc.id]);
                                        } else {
                                          field.onChange(field.value?.filter((value) => value !== doc.id));
                                        }
                                      }}
                                      data-testid={`checkbox-kb-${doc.id}`}
                                    />
                                  </FormControl>
                                  <div 
                                    className="flex-1 space-y-1 leading-none"
                                    onClick={() => {
                                      if (isChecked) {
                                        field.onChange(field.value?.filter((value) => value !== doc.id));
                                      } else {
                                        field.onChange([...field.value, doc.id]);
                                      }
                                    }}
                                  >
                                    <FormLabel className="text-sm font-medium cursor-pointer">
                                      {doc.title}
                                    </FormLabel>
                                    {doc.summary && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {doc.summary}
                                      </p>
                                    )}
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {selectedKbDocs.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedKbDocs.length} document{selectedKbDocs.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Performance Tracking (Optional)
                    </CardTitle>
                    {showAdvanced ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription>
                    Link to OKRs to track AI drafting performance metrics
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <FormField
                    control={form.control}
                    name="objectiveId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objective</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value ? parseInt(value) : undefined);
                            form.setValue('keyResultIds', []);
                          }}
                          value={field.value?.toString() || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-objective">
                              <SelectValue placeholder="Select an objective (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {objectives.map((obj) => (
                              <SelectItem key={obj.id} value={obj.id.toString()}>
                                {obj.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedObjectiveId && selectedObjectiveId > 0 && availableKeyResults.length > 0 && (
                    <FormField
                      control={form.control}
                      name="keyResultIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Key Results</FormLabel>
                          <div className="space-y-2 border rounded-md p-2">
                            {availableKeyResults.map((kr) => (
                              <FormField
                                key={kr.id}
                                control={form.control}
                                name="keyResultIds"
                                render={({ field }) => (
                                  <FormItem
                                    key={kr.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2 hover:bg-accent"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(kr.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, kr.id])
                                            : field.onChange(field.value?.filter((value) => value !== kr.id));
                                        }}
                                        data-testid={`checkbox-kr-${kr.id}`}
                                      />
                                    </FormControl>
                                    <div className="flex-1 space-y-1 leading-none">
                                      <FormLabel className="text-sm font-medium cursor-pointer">
                                        {kr.description}
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        Target: {kr.targetValue} {kr.unit}
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex justify-end gap-3">
            <Link href="/integrations">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={createDocOpen} onOpenChange={setCreateDocOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Knowledge Base Document</DialogTitle>
            <DialogDescription>
              Create a new document that the AI can reference when generating responses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g., Customer Support Guidelines"
                data-testid="input-new-doc-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="Enter the document content..."
                rows={8}
                data-testid="input-new-doc-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDocOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateDoc}
              disabled={createDocMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createDocMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Document'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
