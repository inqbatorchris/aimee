import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { DocumentFormWrapper } from "@/components/document-editor/DocumentFormWrapper";

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDocumentDialog({ open, onOpenChange }: AddDocumentDialogProps) {
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

  const createDocumentMutation = useMutation({
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
      const response = await apiRequest("/api/training/documents/enhanced", {
        method: "POST",
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Training document created successfully with enhanced features."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/labels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/categories"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create document: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("");
    setDescription("");
    setStatus("draft");
    setVisibility("internal_only");
    setLabels([]);
    setNewLabel("");
    setSections([]);
    setEstimatedReadingTime(5);
  };

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
    
    createDocumentMutation.mutate({
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

  return (
    <DocumentFormWrapper>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Training Document</DialogTitle>
            <DialogDescription>
              Create a new training document with enhanced features including labels, sections, and visibility controls.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Customer Service Training Manual"
                    required
                    className="text-xs"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this training covers..."
                    rows={2}
                    className="text-xs"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="text-xs">
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
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal_only">Internal Only</SelectItem>
                        <SelectItem value="customer_facing">Customer Facing</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="readingTime">Reading Time (min)</Label>
                    <Input
                      id="readingTime"
                      type="number"
                      value={estimatedReadingTime}
                      onChange={(e) => setEstimatedReadingTime(parseInt(e.target.value) || 5)}
                      min="1"
                      max="120"
                      className="text-xs"
                      autoComplete="off"
                      data-form-type="other"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Labels */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Labels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add label (e.g., troubleshooting, wifi)"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                      className="text-xs"
                      autoComplete="off"
                      data-form-type="other"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLabel}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {labels.map((label) => (
                      <Badge key={label} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {label}
                        <X
                          className="w-3 h-3 ml-1 cursor-pointer"
                          onClick={() => removeLabel(label)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rich Text Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Content & Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={content}
                  sections={sections}
                  onChange={handleRichTextChange}
                />
              </CardContent>
            </Card>
          </div>
        </form>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createDocumentMutation.isPending}
          >
            {createDocumentMutation.isPending ? "Creating..." : "Create Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </DocumentFormWrapper>
  );
}