import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Target,
  Workflow,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Validation schema for AI configuration
const aiConfigSchema = z.object({
  model: z.string().min(1, "Model selection is required"),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(4000),
  knowledgeDocumentIds: z.array(z.number()).min(1, "Select at least one knowledge base document"),
  objectiveId: z.number().min(1, "Select an objective to track performance"),
  keyResultIds: z.array(z.number()).min(1, "Select at least one key result"),
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
  const [currentStep, setCurrentStep] = useState<'config' | 'knowledge' | 'okr' | 'review'>('config');
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing AI configuration
  const { data: existingConfig, isLoading: configLoading } = useQuery<any>({
    queryKey: ['/api/ai-drafting/config'],
    retry: false,
  });

  // Fetch knowledge base documents
  const { data: kbDocuments = [], isLoading: kbLoading } = useQuery<any[]>({
    queryKey: ['/api/knowledge-base'],
  });

  // Fetch objectives for OKR selection
  const { data: objectives = [], isLoading: objectivesLoading } = useQuery<any[]>({
    queryKey: ['/api/strategy/objectives'],
  });

  // Fetch key results
  const { data: allKeyResults = [], isLoading: keyResultsLoading } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-results'],
  });

  // Initialize form
  const form = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      model: 'gpt-4o-mini',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 1000,
      knowledgeDocumentIds: [],
      objectiveId: 0,
      keyResultIds: [],
    },
  });

  // Populate form with existing configuration
  useEffect(() => {
    if (existingConfig && !form.formState.isDirty) {
      form.reset({
        model: existingConfig.modelConfig?.model || 'gpt-4o-mini',
        systemPrompt: existingConfig.modelConfig?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        temperature: existingConfig.modelConfig?.temperature || 0.7,
        maxTokens: existingConfig.modelConfig?.maxTokens || 1000,
        knowledgeDocumentIds: existingConfig.knowledgeDocumentIds || [],
        objectiveId: existingConfig.objectiveId || 0,
        keyResultIds: existingConfig.keyResultIds || [],
      });
      setIsSaved(true);
    }
  }, [existingConfig, form]);

  // Reset isSaved when form becomes dirty
  useEffect(() => {
    if (form.formState.isDirty && isSaved) {
      setIsSaved(false);
    }
  }, [form.formState.isDirty, isSaved]);

  // Watch objectiveId to filter key results
  const selectedObjectiveId = form.watch('objectiveId');
  const availableKeyResults = allKeyResults.filter(kr => kr.objectiveId === selectedObjectiveId);

  // Mutation to save configuration
  const saveMutation = useMutation({
    mutationFn: async (data: AIConfigFormData) => {
      return await apiRequest('/api/ai-drafting/config', {
        method: 'POST',
        body: {
          modelConfig: {
            model: data.model,
            systemPrompt: data.systemPrompt,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
          },
          knowledgeDocumentIds: data.knowledgeDocumentIds,
          objectiveId: data.objectiveId,
          keyResultIds: data.keyResultIds,
          isEnabled: true,
        },
      });
    },
    onSuccess: () => {
      setIsSaved(true);
      toast({
        title: 'Configuration saved',
        description: 'AI ticket drafting has been configured successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-drafting/config'] });
    },
    onError: (error: any) => {
      setIsSaved(false);
      toast({
        title: 'Failed to save',
        description: error?.message || 'Could not save AI configuration.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to create workflows
  const createWorkflowsMutation = useMutation({
    mutationFn: async () => {
      // This will be implemented with workflow templates
      return await apiRequest('/api/ai-drafting/initialize-workflows', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Workflows created',
        description: 'Draft generator and KPI calculator workflows have been created.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create workflows',
        description: error?.message || 'Could not create workflows.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AIConfigFormData) => {
    saveMutation.mutate(data);
  };

  const handleNext = async () => {
    // Prevent progression if currently saving
    if (saveMutation.isPending) {
      return;
    }

    let fieldsToValidate: (keyof AIConfigFormData)[] = [];
    
    if (currentStep === 'config') {
      fieldsToValidate = ['model', 'systemPrompt', 'temperature', 'maxTokens'];
    } else if (currentStep === 'knowledge') {
      fieldsToValidate = ['knowledgeDocumentIds'];
    } else if (currentStep === 'okr') {
      fieldsToValidate = ['objectiveId', 'keyResultIds'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      // If moving from OKR step to Review, save the configuration first
      if (currentStep === 'okr') {
        const allValid = await form.trigger();
        if (allValid) {
          const formData = form.getValues();
          saveMutation.mutate(formData, {
            onSuccess: () => {
              setCurrentStep('review');
            },
            onError: () => {
              // Stay on current step if save fails
              toast({
                title: 'Cannot proceed',
                description: 'Please resolve configuration errors before proceeding.',
                variant: 'destructive',
              });
            },
          });
        }
      } else {
        if (currentStep === 'config') setCurrentStep('knowledge');
        else if (currentStep === 'knowledge') setCurrentStep('okr');
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') setCurrentStep('okr');
    else if (currentStep === 'okr') setCurrentStep('knowledge');
    else if (currentStep === 'knowledge') setCurrentStep('config');
  };

  const handleComplete = async () => {
    // Configuration should already be saved when entering Review step
    // Now just create the workflows
    if (isSaved) {
      createWorkflowsMutation.mutate();
    } else {
      toast({
        title: 'Configuration not saved',
        description: 'Please save the configuration before completing setup.',
        variant: 'destructive',
      });
    }
  };

  if (configLoading || kbLoading || objectivesLoading || keyResultsLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/integrations">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            ← Back to Integrations
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500 bg-opacity-10">
            <Sparkles className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Ticket Response Drafting</h1>
            <p className="text-sm text-muted-foreground">
              Automatically generate draft responses for support tickets using AI and your knowledge base
            </p>
          </div>
        </div>
        {isSaved && (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Configured
          </Badge>
        )}
      </div>

      {/* Setup Wizard Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className={`flex items-center gap-2 ${currentStep === 'config' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'config' ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
              1
            </div>
            <span className="text-sm">AI Model</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${currentStep === 'knowledge' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'knowledge' ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
              2
            </div>
            <span className="text-sm">Knowledge Base</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${currentStep === 'okr' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'okr' ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
              3
            </div>
            <span className="text-sm">Performance</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
              4
            </div>
            <span className="text-sm">Review</span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: AI Model Configuration */}
          {currentStep === 'config' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Model Configuration
                </CardTitle>
                <CardDescription>
                  Configure the AI model settings for generating ticket response drafts
                </CardDescription>
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
                          <SelectItem value="gpt-4o" data-testid="option-gpt-4o">GPT-4o (Most capable)</SelectItem>
                          <SelectItem value="gpt-4o-mini" data-testid="option-gpt-4o-mini">GPT-4o Mini (Balanced)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo" data-testid="option-gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the AI model to use for draft generation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={8}
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
                        <FormDescription>
                          Creativity (0 = focused, 2 = creative)
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
                            max="4000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-max-tokens"
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum response length
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Knowledge Base Selection */}
          {currentStep === 'knowledge' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Knowledge Base Documents
                </CardTitle>
                <CardDescription>
                  Select which knowledge base documents should be used as context when generating drafts
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
                          <AlertDescription>
                            No knowledge base documents found. Please create some documents first.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {kbDocuments.map((doc) => (
                            <FormField
                              key={doc.id}
                              control={form.control}
                              name="knowledgeDocumentIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={doc.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(doc.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, doc.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== doc.id
                                                )
                                              );
                                        }}
                                        data-testid={`checkbox-kb-${doc.id}`}
                                      />
                                    </FormControl>
                                    <div className="flex-1 space-y-1 leading-none">
                                      <FormLabel className="text-sm font-medium cursor-pointer">
                                        {doc.title}
                                      </FormLabel>
                                      {doc.summary && (
                                        <p className="text-sm text-muted-foreground">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: OKR Selection */}
          {currentStep === 'okr' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Tracking
                </CardTitle>
                <CardDescription>
                  Select which objective and key results should track the performance of AI drafting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="objectiveId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objective</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          form.setValue('keyResultIds', []); // Reset key results when objective changes
                        }}
                        value={field.value?.toString() || ''}
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
                        The strategic objective this feature supports
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedObjectiveId > 0 && (
                  <FormField
                    control={form.control}
                    name="keyResultIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Key Results</FormLabel>
                        {availableKeyResults.length === 0 ? (
                          <Alert>
                            <AlertDescription>
                              No key results found for this objective. Please create some key results first.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-2">
                            {availableKeyResults.map((kr) => (
                              <FormField
                                key={kr.id}
                                control={form.control}
                                name="keyResultIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={kr.id}
                                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(kr.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, kr.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== kr.id
                                                  )
                                                );
                                          }}
                                          data-testid={`checkbox-kr-${kr.id}`}
                                        />
                                      </FormControl>
                                      <div className="flex-1 space-y-1 leading-none">
                                        <FormLabel className="text-sm font-medium cursor-pointer">
                                          {kr.description}
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                          Target: {kr.targetValue} {kr.unit}
                                        </p>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <FormDescription>
                          Select key results that will measure AI drafting performance (e.g., acceptance rate, time saved)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Complete */}
          {currentStep === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Review Configuration
                </CardTitle>
                <CardDescription>
                  Review your settings and complete the setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium mb-2">AI Model Settings</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Model: <span className="text-foreground font-medium">{form.getValues('model')}</span></p>
                      <p>Temperature: <span className="text-foreground font-medium">{form.getValues('temperature')}</span></p>
                      <p>Max Tokens: <span className="text-foreground font-medium">{form.getValues('maxTokens')}</span></p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Knowledge Base Documents</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>{form.getValues('knowledgeDocumentIds').length} document(s) selected</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {form.getValues('knowledgeDocumentIds').map((id) => {
                          const doc = kbDocuments.find(d => d.id === id);
                          return doc ? <li key={id} className="text-foreground">{doc.title}</li> : null;
                        })}
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Performance Tracking</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Objective: <span className="text-foreground font-medium">
                        {objectives.find(o => o.id === form.getValues('objectiveId'))?.title}
                      </span></p>
                      <p className="mt-2">Key Results ({form.getValues('keyResultIds').length}):</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {form.getValues('keyResultIds').map((id) => {
                          const kr = allKeyResults.find(k => k.id === id);
                          return kr ? <li key={id} className="text-foreground">{kr.description}</li> : null;
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    After completing setup, draft generator and KPI calculator workflows will be created automatically.
                    You can customize these workflows later in the Agent Builder.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'config' || saveMutation.isPending}
              data-testid="button-back-step"
            >
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep !== 'review' ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={saveMutation.isPending}
                  data-testid="button-next"
                >
                  {saveMutation.isPending && currentStep === 'okr' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={!isSaved || createWorkflowsMutation.isPending}
                  data-testid="button-complete"
                >
                  {createWorkflowsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Workflows...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
