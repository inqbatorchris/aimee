import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, FileText, Code, Eye, Copy, CodeXml } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmailBodyEditor } from "./EmailBodyEditor";

const templateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  subject: z.string().min(1, "Subject is required").max(500),
  htmlBody: z.string().min(1, "Email body is required"),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EmailTemplate {
  id: number;
  organizationId: number;
  title: string;
  subject: string;
  htmlBody: string;
  variablesManifest: Record<string, string> | null;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: number | null;
}

const AVAILABLE_VARIABLES = [
  { key: '{{customer.name}}', label: 'Customer Name', description: 'Full name of the customer' },
  { key: '{{customer.email}}', label: 'Customer Email', description: 'Email address' },
  { key: '{{customer.login}}', label: 'Customer Login', description: 'Login username' },
  { key: '{{company.name}}', label: 'Company Name', description: 'Your company name' },
  { key: '{{company.email}}', label: 'Company Email', description: 'Your company email' },
  { key: '{{custom_variable}}', label: 'Custom Variable', description: 'Define your own variables in workflow configuration' },
];

export function TemplateEditor({ isOpen, onClose, templateId }: TemplateEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [htmlContent, setHtmlContent] = useState('');
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');

  // Fetch individual template data when editing
  const { data: template, isLoading: isLoadingTemplate } = useQuery<EmailTemplate>({
    queryKey: templateId ? ['/api/email-templates', templateId] : ['templates-null'],
    enabled: isOpen && !!templateId,
    retry: 1,
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      subject: "",
      htmlBody: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (templateId && template) {
      // Editing existing template
      console.log('[TemplateEditor] RAW template object:', template);
      console.log('[TemplateEditor] template.htmlBody type:', typeof template.htmlBody);
      console.log('[TemplateEditor] template.htmlBody value:', template.htmlBody);
      
      const htmlBodyContent = template.htmlBody || "";
      console.log('[TemplateEditor] Loading template:', {
        id: templateId,
        title: template.title,
        subject: template.subject,
        hasBody: !!template.htmlBody,
        bodyLength: template.htmlBody?.length || 0,
        htmlBodyPreview: template.htmlBody?.substring(0, 100),
        status: template.status
      });
      form.reset({
        title: template.title || "",
        subject: template.subject || "",
        htmlBody: htmlBodyContent,
        status: template.status || 'active',
      });
      setHtmlContent(htmlBodyContent);
    } else if (!templateId) {
      // Creating new template
      console.log('[TemplateEditor] Creating new template');
      form.reset({
        title: "",
        subject: "",
        htmlBody: "",
        status: "active",
      });
      setHtmlContent('');
    }
  }, [template, templateId, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const url = templateId
        ? `/api/email-templates/${templateId}`
        : '/api/email-templates';
      
      const response = await apiRequest(url, {
        method: templateId ? 'PATCH' : 'POST',
        body: data,
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: templateId ? 'Template updated' : 'Template created',
        description: `Email template has been ${templateId ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: ['/api/email-templates', templateId] });
      }
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: `Failed to ${templateId ? 'update' : 'create'} template`,
        description: error.message || 'An error occurred while saving the template.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: TemplateFormData) => {
    console.log('[TemplateEditor] Submitting form:', {
      title: data.title,
      subject: data.subject,
      htmlBodyLength: data.htmlBody?.length || 0,
      htmlBodyPreview: data.htmlBody?.substring(0, 100),
      status: data.status
    });
    saveMutation.mutate(data);
  };

  const handleInvalidSubmit = () => {
    const errors = form.formState.errors;
    const values = form.getValues();
    
    console.log('[TemplateEditor] Form validation failed:', {
      errors,
      currentValues: {
        title: values.title,
        subject: values.subject,
        htmlBodyLength: values.htmlBody?.length || 0,
        htmlBodyPreview: values.htmlBody?.substring(0, 100),
        status: values.status
      }
    });
    
    // Check if there are errors in the Details tab fields
    if (errors.title || errors.subject) {
      setActiveTab('details');
      toast({
        title: 'Required fields missing',
        description: 'Please fill in all required fields on the Details tab.',
        variant: 'destructive',
      });
    } else if (errors.htmlBody) {
      setActiveTab('content');
      toast({
        title: 'Email body required',
        description: 'Please add content to your email template.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setHtmlContent('');
    setActiveTab('details');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: `Variable "${text}" copied successfully.`,
      duration: 2000,
    });
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(codeDraft || htmlContent);
    toast({
      title: 'Code copied',
      description: 'HTML code copied to clipboard.',
      duration: 2000,
    });
  };

  const handleOpenCodeDialog = () => {
    setCodeDraft(form.getValues('htmlBody') || '');
    setShowCodeDialog(true);
  };

  const handleSaveCode = () => {
    form.setValue('htmlBody', codeDraft, { shouldDirty: true });
    setHtmlContent(codeDraft);
    setShowCodeDialog(false);
    toast({
      title: 'Code updated',
      description: 'HTML code has been updated in the editor.',
      duration: 2000,
    });
  };

  const handleCloseCodeDialog = () => {
    setShowCodeDialog(false);
    setCodeDraft('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:w-[800px] sm:max-w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{templateId ? 'Edit' : 'Create'} Email Template</SheetTitle>
          <SheetDescription>
            {templateId
              ? 'Update the email template details below.'
              : 'Create a new email template for your campaigns.'}
          </SheetDescription>
        </SheetHeader>

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details" data-testid="tab-details">
                    <FileText className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="content" data-testid="tab-content">
                    <Code className="h-4 w-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="preview" data-testid="tab-preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Monthly Newsletter"
                            {...field}
                            data-testid="input-template-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., {{company.name}} Newsletter - {{month}}"
                            {...field}
                            data-testid="input-template-subject"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Use {'{{variable}}'} syntax for all dynamic variables
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...field}
                            data-testid="select-template-status"
                          >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="content" className="mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-4">
                      <FormField
                        control={form.control}
                        name="htmlBody"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Email Body (HTML)</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleOpenCodeDialog}
                                data-testid="button-view-code"
                              >
                                <CodeXml className="h-4 w-4 mr-2" />
                                Edit Code
                              </Button>
                            </div>
                            <FormControl>
                              <EmailBodyEditor
                                content={field.value || ''}
                                onChange={(html) => {
                                  field.onChange(html);
                                  setHtmlContent(html);
                                }}
                                placeholder="Write your email content here..."
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Use the toolbar to format your email. HTML tags are supported.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-1">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Available Variables</CardTitle>
                          <CardDescription className="text-xs">
                            Click to copy
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {AVAILABLE_VARIABLES.map((variable) => (
                            <div
                              key={variable.key}
                              className="p-2 rounded-md border bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => copyToClipboard(variable.key)}
                              data-testid={`variable-${variable.key.replace(/[{}]/g, '')}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-mono font-semibold truncate">
                                    {variable.key}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {variable.description}
                                  </div>
                                </div>
                                <Copy className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Email Preview</CardTitle>
                      <CardDescription className="text-xs">
                        This is how your email will look (variables shown as placeholders)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md p-6 bg-white min-h-[400px]">
                        <div 
                          className="max-w-none text-[14px] leading-[1.45] font-sans [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3 [&_h1]:mb-4 [&_h2]:mb-3 [&_h3]:mb-3"
                          dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-muted-foreground italic">No content yet</p>' }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-6 border-t mt-6">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-template"
                >
                  {saveMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {templateId ? 'Update' : 'Create'} Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  data-testid="button-cancel-template"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>

      <Dialog open={showCodeDialog} onOpenChange={handleCloseCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit HTML Code</DialogTitle>
            <DialogDescription>
              Edit the raw HTML code for this email template.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden border rounded-md bg-muted/50">
            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="w-full h-full p-4 text-xs font-mono resize-none focus:outline-none bg-transparent"
              placeholder="<!-- Enter your HTML code here -->"
              spellCheck={false}
              data-testid="textarea-edit-code"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyCodeToClipboard}
              data-testid="button-copy-code"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCodeDialog}
              data-testid="button-cancel-code"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCode}
              data-testid="button-save-code"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
