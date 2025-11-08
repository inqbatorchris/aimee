import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "./RichTextEditor";

interface TrainingDocument {
  id: number;
  title: string;
  category: string;
  description: string;
  status: string;
  publishedAt: string;
  createdAt: string;
  content?: string;
  visibility?: string;
  labels?: string[];
  sections?: any[];
  estimatedReadingTime?: number;
}

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: TrainingDocument | null;
}

export function EditDocumentDialog({ open, onOpenChange, document }: EditDocumentDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [visibility, setVisibility] = useState("internal_only");
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [sections, setSections] = useState<any[]>([]);
  const [estimatedReadingTime, setEstimatedReadingTime] = useState<number>(5);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch full document data when dialog opens
  const { data: fullDocument, isLoading: documentLoading } = useQuery({
    queryKey: [`/api/training/documents/${document?.id}`],
    enabled: open && !!document?.id
  });

  // Fetch document sections when dialog opens
  const { data: documentSections, isLoading: sectionsLoading } = useQuery({
    queryKey: [`/api/training/documents/${document?.id}/sections`],
    enabled: open && !!document?.id
  });

  // Load document data when full document is fetched
  useEffect(() => {
    if (fullDocument) {
      setTitle(fullDocument.title || "");
      setContent(fullDocument.content || "");
      setCategory(fullDocument.category || "");
      setDescription(fullDocument.description || "");
      setStatus(fullDocument.status || "draft");
      setVisibility(fullDocument.visibility || "internal_only");
      setLabels(fullDocument.labels || []);
      setEstimatedReadingTime(fullDocument.estimatedReadingTime || 5);
    }
  }, [fullDocument]);

  // Load sections when document sections are fetched
  useEffect(() => {
    if (documentSections) {
      // Transform sections to match RichTextEditor format
      const transformedSections = documentSections.map((section: any) => ({
        id: section.id,
        type: 'text', // Default type since we don't store type in DB yet
        title: section.title,
        content: section.content,
        order: section.sectionOrder
      }));
      setSections(transformedSections);
    }
  }, [documentSections]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setCategory("");
      setDescription("");
      setStatus("draft");
      setVisibility("internal_only");
      setLabels([]);
      setSections([]);
      setEstimatedReadingTime(5);
    }
  }, [open]);

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      category: string;
      description: string;
      status: string;
      visibility: string;
      labels: string[];
      sections: any[];
      estimatedReadingTime: number;
    }) => {
      const response = await apiRequest(`/api/training/documents/${document!.id}/enhanced`, {
        method: "PUT",
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Training document updated successfully with enhanced features."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/documents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/training/documents/${document!.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/training/documents/${document!.id}/sections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/labels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/categories"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update document: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const addLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel("");
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  const handleRichTextChange = (newContent: string, newSections: any[]) => {
    setContent(newContent);
    setSections(newSections);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !category.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("EditDocumentDialog: Submitting sections:", JSON.stringify(sections, null, 2));
    
    updateDocumentMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      description: description.trim(),
      status,
      visibility,
      labels,
      sections,
      estimatedReadingTime
    });
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Training Document</DialogTitle>
          <DialogDescription>
            Update the training document content and settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Customer Service Training Manual"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this training covers..."
                rows={2}
              />
            </div>
          </div>

          {/* Enhanced Features */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (Customer Portal)</SelectItem>
                  <SelectItem value="internal_only">Internal Only</SelectItem>
                  <SelectItem value="private">Private (Admin Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reading-time">Estimated Reading Time (minutes)</Label>
              <Input
                id="reading-time"
                type="number"
                min="1"
                max="240"
                value={estimatedReadingTime}
                onChange={(e) => setEstimatedReadingTime(parseInt(e.target.value) || 5)}
                placeholder="5"
              />
            </div>
          </div>

          {/* Labels Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Labels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add a label (e.g., 'urgent', 'new-feature', 'policy-update')"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                />
                <Button type="button" onClick={addLabel} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <Badge key={label} variant="secondary" className="flex items-center gap-1">
                      {label}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeLabel(label)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rich Text Editor */}
          <div>
            <Label htmlFor="content">Content *</Label>
            {(documentLoading || sectionsLoading) ? (
              <div className="border rounded-md p-4 bg-gray-50 text-center">
                Loading document content and sections...
              </div>
            ) : (
              <RichTextEditor
                content={content}
                sections={sections}
                onChange={handleRichTextChange}
                placeholder="Enter the training content here..."
              />
            )}
          </div>
        </form>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={updateDocumentMutation.isPending}
          >
            {updateDocumentMutation.isPending ? "Updating..." : "Update Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}