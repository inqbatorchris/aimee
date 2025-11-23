import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MessageSquareText, Loader2, CheckCircle, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Validation schema
const configSchema = z.object({
  model: z.string().min(1, "Model selection is required"),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(16000),
  systemPromptDocIds: z.array(z.number()).min(1, "Select at least one system prompt document"),
  knowledgeDocIds: z.array(z.number()).min(0),
  objectiveId: z.number().min(1, "Select an objective to track performance"),
  keyResultIds: z.array(z.number()).min(1, "Select at least one key result"),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function AITicketDraftingSetup() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch available models
  const { data: modelsData } = useQuery<{models: any[]}>({
    queryKey: ['/api/ai-drafting/models'],
  });

  // Fetch existing configuration
  const { data: existingConfig, isLoading: configLoading } = useQuery<any>({
    queryKey: ['/api/ai-drafting/config'],
    retry: false,
  });

  // Fetch knowledge base documents
  const { data: kbDocuments = [] } = useQuery<any[]>({
    queryKey: ['/api/knowledge-base/documents'],
  });

  // Fetch objectives
  const { data: objectives = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/objectives'],
  });

  // Fetch key results
  const { data: allKeyResults = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-results'],
  });

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      systemPromptDocIds: [],
      knowledgeDocIds: [],
      objectiveId: 0,
      keyResultIds: [],
    },
  });

  // Populate form with existing config
  useEffect(() => {
    if (existingConfig && !form.formState.isDirty) {
      const hasValidObjective = existingConfig.linkedObjectiveId && existingConfig.linkedObjectiveId > 0;
      form.reset({
        model: existingConfig.modelConfig?.model || 'gpt-4o-mini',
        temperature: existingConfig.modelConfig?.temperature || 0.7,
        maxTokens: existingConfig.modelConfig?.maxTokens || 1000,
        systemPromptDocIds: existingConfig.systemPromptDocumentIds || [],
        knowledgeDocIds: existingConfig.knowledgeDocumentIds || [],
        objectiveId: hasValidObjective ? existingConfig.linkedObjectiveId : 0,
        keyResultIds: existingConfig.linkedKeyResultIds || [],
      });
    }
  }, [existingConfig, form]);

  const selectedObjectiveId = form.watch('objectiveId');
  const availableKeyResults = allKeyResults.filter(kr => kr.objectiveId === selectedObjectiveId);

  const onSubmit = async (data: ConfigFormData) => {
    try {
      setIsSaving(true);
      
      // Save configuration
      await apiRequest('/api/ai-drafting/config', {
        method: 'POST',
        body: {
          featureType: 'ticket_drafting',
          modelConfig: {
            model: data.model,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
          },
          systemPromptDocumentIds: data.systemPromptDocIds,
          knowledgeDocumentIds: data.knowledgeDocIds,
          linkedObjectiveId: data.objectiveId,
          linkedKeyResultIds: data.keyResultIds,
          isEnabled: true,
        },
      });

      // Initialize workflows
      await apiRequest('/api/ai-drafting/initialize-workflows', {
        method: 'POST',
      });

      toast({
        title: 'Configuration saved',
        description: 'AI ticket drafting has been configured and workflows created successfully.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/ai-drafting/config'] });
      
    } catch (error: any) {
      toast({
        title: 'Failed to save',
        description: error?.message || 'Could not save configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (configLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const models = modelsData?.models || [];

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link href="/integrations">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Integrations
        </Button>
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500 bg-opacity-10">
            <MessageSquareText className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title">AI Ticket Drafting</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-subtitle">
              Automatically generate draft responses for support tickets using AI and your knowledge base
            </p>
          </div>
        </div>
      </div>

      {existingConfig?.isEnabled && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This integration is currently active. Any changes will take effect immediately.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OpenAI Model</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-model">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id} data-testid={`option-model-${model.id}`}>
                            <div className="flex items-center gap-2">
                              {model.name}
                              {model.recommended && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {models.find(m => m.id === field.value)?.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature ({field.value})</FormLabel>
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
                      <FormDescription className="text-xs">
                        0 = deterministic, 2 = creative
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="100" 
                          min="100" 
                          max="16000" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-max-tokens"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Maximum response length
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Knowledge Base Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="systemPromptDocIds"
                render={() => (
                  <FormItem>
                    <FormLabel>System Prompt Documents</FormLabel>
                    <FormDescription className="text-xs mb-2">
                      Documents that define the AI's behavior and response style
                    </FormDescription>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {kbDocuments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No knowledge base documents found.</p>
                      ) : (
                        kbDocuments.map((doc: any) => (
                          <FormField
                            key={doc.id}
                            control={form.control}
                            name="systemPromptDocIds"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(doc.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, doc.id])
                                        : field.onChange(field.value?.filter((id) => id !== doc.id))
                                    }}
                                    data-testid={`checkbox-system-doc-${doc.id}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {doc.title}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="knowledgeDocIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Reference Knowledge Base Documents</FormLabel>
                    <FormDescription className="text-xs mb-2">
                      Documents the AI can reference to provide accurate information
                    </FormDescription>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {kbDocuments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No knowledge base documents found.</p>
                      ) : (
                        kbDocuments.map((doc: any) => (
                          <FormField
                            key={doc.id}
                            control={form.control}
                            name="knowledgeDocIds"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(doc.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, doc.id])
                                        : field.onChange(field.value?.filter((id) => id !== doc.id))
                                    }}
                                    data-testid={`checkbox-kb-doc-${doc.id}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {doc.title}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="objectiveId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Objective</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-objective">
                          <SelectValue placeholder="Select an objective" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {objectives.map((obj) => (
                          <SelectItem key={obj.id} value={obj.id.toString()} data-testid={`option-objective-${obj.id}`}>
                            {obj.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Strategic objective this feature supports
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keyResultIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Key Results to Track</FormLabel>
                    <FormDescription className="text-xs mb-2">
                      Metrics that will be automatically updated (e.g., acceptance rate, time saved, drafts generated)
                    </FormDescription>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {availableKeyResults.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Select an objective first</p>
                      ) : (
                        availableKeyResults.map((kr) => (
                          <FormField
                            key={kr.id}
                            control={form.control}
                            name="keyResultIds"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(kr.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, kr.id])
                                        : field.onChange(field.value?.filter((id) => id !== kr.id))
                                    }}
                                    data-testid={`checkbox-kr-${kr.id}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {kr.title}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/integrations">
              <Button variant="outline" type="button" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving} data-testid="button-save">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save & Initialize
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
