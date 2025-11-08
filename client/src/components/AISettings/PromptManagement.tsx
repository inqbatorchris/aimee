import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, Eye, Plus, Trash2 } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  isActive: boolean;
}

export default function PromptManagement() {
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tone, setTone] = useState('professional');
  const [responseLength, setResponseLength] = useState('standard');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const { toast } = useToast();

  const defaultPrompt = `You are a professional ISP customer service representative for Country Connect. Based on the customer information and ticket context provided, generate a helpful, empathetic, and professional response that addresses the customer's concern.

Key guidelines:
- Be friendly and professional
- Reference specific account details when relevant
- Provide clear next steps or solutions
- Show empathy for any service issues
- Include relevant contact information if needed
- Keep response concise but comprehensive`;

  useEffect(() => {
    loadCurrentPrompt();
    loadTemplates();
  }, []);

  const loadCurrentPrompt = async () => {
    try {
      const response = await fetch('/api/ai/prompt');
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.prompt || defaultPrompt);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
      setPrompt(defaultPrompt);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/ai/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const savePrompt = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/ai/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          tone,
          responseLength
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'AI prompt updated successfully',
        });
      } else {
        throw new Error('Failed to save prompt');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save prompt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setPrompt(defaultPrompt);
    setTone('professional');
    setResponseLength('standard');
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPrompt(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const saveAsTemplate = async () => {
    const name = window.prompt(`Enter template name:`);
    if (!name) return;

    try {
      const response = await fetch('/api/ai/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          content: prompt,
          category: 'custom',
          description: `Custom template: ${name}`
        }),
      });

      if (response.ok) {
        loadTemplates();
        toast({
          title: 'Success',
          description: 'Template saved successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/ai/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadTemplates();
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prompt Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt Configuration</CardTitle>
          <CardDescription>
            Customize how the AI assistant responds to customer support tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Response Behavior Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Response Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Response Length</Label>
              <Select value={responseLength} onValueChange={setResponseLength}>
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief (50-100 words)</SelectItem>
                  <SelectItem value="standard">Standard (100-200 words)</SelectItem>
                  <SelectItem value="detailed">Detailed (200-400 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Prompt Editor */}
          <div className="space-y-2">
            <Label htmlFor="prompt">System Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your custom AI prompt..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-sm text-gray-500">
              The AI will receive customer information, account details, ticket context, and this prompt to generate responses.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={savePrompt} disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Prompt'}
            </Button>

            <Button variant="outline" onClick={resetToDefault} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </Button>

            <Button variant="outline" onClick={saveAsTemplate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Save as Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Library */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Templates</CardTitle>
          <CardDescription>
            Pre-built prompts for different support scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No templates found. Create your first template by saving the current prompt.
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => loadTemplate(template.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Load
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => deleteTemplate(template.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context Information */}
      <Card>
        <CardHeader>
          <CardTitle>How AI Context Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Customer Context:</strong> The AI receives customer name, email, phone, account status, current balance, recent invoices, payments, and services.
          </p>
          <p>
            <strong>Ticket Context:</strong> The AI analyzes the ticket subject and recent conversation messages to understand the issue.
          </p>
          <p>
            <strong>Service Health:</strong> Real-time connection status, diagnostics, and service health data are included for technical issues.
          </p>
          <p>
            <strong>Knowledge Base:</strong> Relevant articles from your knowledge base are automatically included based on the issue type.
          </p>
          <p>
            <strong>Response Generation:</strong> Using your custom prompt, the AI generates contextual responses that agents can review and send.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}