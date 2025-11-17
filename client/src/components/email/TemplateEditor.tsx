import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
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

const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template?: {
    id: number;
    name: string;
    subject: string;
    body: string;
  } | null;
}

export function TemplateEditor({ isOpen, onClose, template }: TemplateEditorProps) {
  const { toast } = useToast();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        body: template.body,
      });
    } else {
      form.reset({
        name: "",
        subject: "",
        body: "",
      });
    }
  }, [template, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const url = template
        ? `/api/splynx/templates/${template.id}`
        : '/api/splynx/templates';
      
      const response = await apiRequest(url, {
        method: template ? 'PUT' : 'POST',
        body: data,
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: template ? 'Template updated' : 'Template created',
        description: `Email template has been ${template ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/splynx/templates'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: `Failed to ${template ? 'update' : 'create'} template`,
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
          <SheetTitle>{template ? 'Edit' : 'Create'} Email Template</SheetTitle>
          <SheetDescription>
            {template
              ? 'Update the email template details below.'
              : 'Create a new email template for your campaigns.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="name"
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
                      placeholder="e.g., {{company.name}} Newsletter - {{month}}"
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
                {template ? 'Update' : 'Create'} Template
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
      </SheetContent>
    </Sheet>
  );
}
