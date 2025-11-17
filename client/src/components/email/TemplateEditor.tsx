import { useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getTemplateDisplayName } from "./EmailTemplateManager";

const templateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  subject: z.string().max(500).optional(),
  description: z.string().optional(),
  body: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EmailTemplate {
  id: number;
  title?: string;
  subject?: string;
  description?: string;
  body?: string;
  type: string;
}

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: number | null;
}

export function TemplateEditor({ isOpen, onClose, templateId }: TemplateEditorProps) {
  const { toast } = useToast();

  // Fetch individual template data when editing
  const { data: template, isLoading: isLoadingTemplate } = useQuery<EmailTemplate>({
    queryKey: ['/api/splynx/templates', templateId],
    enabled: isOpen && !!templateId,
    retry: 1,
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      body: "",
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        title: template.title || "",
        subject: template.subject || "",
        description: template.description || "",
        body: template.body || "",
      });
    } else {
      form.reset({
        title: "",
        subject: "",
        description: "",
        body: "",
      });
    }
  }, [template, form]);

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
        queryClient.invalidateQueries({ queryKey: ['/api/splynx/templates', templateId] });
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
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:w-[640px] overflow-y-auto">
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
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
                        placeholder="e.g., Network Monitoring Alert | Repeater Site"
                        {...field}
                        data-testid="input-template-subject"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Use variables like {'{'}{'{'} customer.name {'}'}{'}'}, {'{'}{'{'} company.name {'}'}{'}'}, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dear {{customer.name}},&#10;&#10;Your message here...&#10;&#10;Best regards,&#10;{{company.name}}"
                        rows={12}
                        className="font-mono text-sm"
                        {...field}
                        data-testid="input-template-body"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      HTML is supported. Available variables: {'{'}{'{'} customer.name {'}'}{'}'}, {'{'}{'{'} customer.email {'}'}{'}'}, {'{'}{'{'} customer.login {'}'}{'}'}, {'{'}{'{'} company.name {'}'}{'}'}, {'{'}{'{'} company.email {'}'}{'}'}, and custom variables from workflows.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
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
    </Sheet>
  );
}
