import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit3, Trash2, Loader2, Mail, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TemplateEditor } from "./TemplateEditor";

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

// Helper function to get display name with fallback chain
export function getTemplateDisplayName(template: EmailTemplate): string {
  if (template.title && template.title.trim()) return template.title;
  if (template.subject && template.subject.trim()) return template.subject;
  return `Template #${template.id}`;
}

export function EmailTemplateManager() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMissingSubject, setShowOnlyMissingSubject] = useState(false);
  const { toast } = useToast();

  const { data: templates = [], isLoading, refetch, isFetching } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    retry: 1,
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          template.title?.toLowerCase().includes(query) ||
          template.subject?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Missing subject filter
      if (showOnlyMissingSubject && template.subject?.trim()) {
        return false;
      }

      return true;
    });
  }, [templates, searchQuery, showOnlyMissingSubject]);

  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest(`/api/email-templates/${templateId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'Email template has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete template',
        description: error.message || 'An error occurred while deleting the template.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = (template: EmailTemplate) => {
    setTemplateToDelete(template);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Email Templates</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={handleCreateNew}
              data-testid="button-create-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No email templates yet</p>
              <p className="text-xs mt-1">Create your first template to start sending campaigns</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search templates by title or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="missing-subject"
                    checked={showOnlyMissingSubject}
                    onCheckedChange={(checked) => setShowOnlyMissingSubject(checked as boolean)}
                  />
                  <label
                    htmlFor="missing-subject"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap"
                  >
                    Only missing subject
                  </label>
                </div>
                <Badge variant="secondary">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow 
                        key={template.id} 
                        data-testid={`template-row-${template.id}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleEdit(template)}
                      >
                        <TableCell className="font-medium">
                          {getTemplateDisplayName(template)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {template.subject || <span className="italic opacity-50">No subject</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {template.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(template.updatedAt)}
                        </TableCell>
                        <TableCell className="w-16">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template);
                            }}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <TemplateEditor
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        templateId={editingTemplate?.id || null}
      />

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete ? getTemplateDisplayName(templateToDelete) : ''}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
