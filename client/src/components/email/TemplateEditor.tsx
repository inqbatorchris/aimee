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
  subject: z.string().max(500).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EmailTemplate {
  id: number;
  title?: string;
  subject?: string;
  description?: string;
  code?: string;
  type: string;
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
];

export function TemplateEditor({ isOpen, onClose, templateId }: TemplateEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [htmlContent, setHtmlContent] = useState('');
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  // Fetch individual template data when editing
  const { data: template, isLoading: isLoadingTemplate } = useQuery<EmailTemplate>({
    queryKey: templateId ? [`/api/splynx/templates/${templateId}`] : ['templates-null'],
    enabled: isOpen && !!templateId,
    retry: 1,
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      code: "",
    },
  });

  useEffect(() => {
    if (templateId && template) {
      // Editing existing template
      const codeContent = template.code || "";
      console.log('[TemplateEditor] Loading template:', {
        id: templateId,
        title: template.title,
        hasCode: !!template.code,
        codeLength: template.code?.length || 0,
        codePreview: template.code?.substring(0, 100)
      });
      form.reset({
        title: template.title || "",
        subject: template.subject || "",
        description: template.description || "",
        code: codeContent,
      });
      setHtmlContent(codeContent);
    } else if (!templateId) {
      // Creating new template
      console.log('[TemplateEditor] Creating new template');
      form.reset({
        title: "",
        subject: "",
        description: "",
        code: "",
      });
      setHtmlContent('');
    }
  }, [template, templateId, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const url = templateId
        ? `/api/splynx/templates/${templateId}`
        : '/api/splynx/templates';
      
      const response = await apiRequest(url, {
        method: templateId ? 'PUT' : 'POST',
        body: data,
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: templateId ? 'Template updated' : 'Template created',
        description: `Email template has been ${templateId ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/splynx/templates'] });
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: [`/api/splynx/templates/${templateId}`] });
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
    saveMutation.mutate(data);
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
    navigator.clipboard.writeText(htmlContent);
    toast({
      title: 'Code copied',
      description: 'HTML code copied to clipboard.',
      duration: 2000,
    });
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6">
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
                        <FormLabel>Email Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., {{company.name}} Newsletter - {{month}}"
                            {...field}
                            data-testid="input-template-subject"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Use variables like {'{{customer.name}}'}, {'{{company.name}}'}, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Internal description for this template"
                            {...field}
                            data-testid="input-template-description"
                          />
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
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Email Body (HTML)</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCodeDialog(true)}
                                data-testid="button-view-code"
                              >
                                <CodeXml className="h-4 w-4 mr-2" />
                                View Code
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
                          className="prose prose-sm max-w-none"
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

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Raw HTML Code</DialogTitle>
            <DialogDescription>
              View and copy the raw HTML code for this email template.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-md bg-muted/50">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words">
              <code>{htmlContent || '<!-- No content yet -->'}</code>
            </pre>
          </div>
          <DialogFooter>
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
              onClick={() => setShowCodeDialog(false)}
              data-testid="button-close-code-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
