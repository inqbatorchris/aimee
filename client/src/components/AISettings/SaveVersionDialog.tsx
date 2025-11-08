import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; notes: string }) => void;
  currentVersion: string;
}

export function SaveVersionDialog({ open, onOpenChange, onSave, currentVersion }: SaveVersionDialogProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; notes?: string }>({});

  // Generate suggested version name
  const generateSuggestedVersion = () => {
    if (!currentVersion) return 'v1.0';
    
    const match = currentVersion.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      return `v${major}.${minor + 1}`;
    }
    return 'v1.1';
  };

  const validateForm = () => {
    const newErrors: { name?: string; notes?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Version name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Version name must be at least 2 characters';
    }
    
    if (!notes.trim()) {
      newErrors.notes = 'Description is required';
    } else if (notes.trim().length < 10) {
      newErrors.notes = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    onSave({
      name: name.trim(),
      notes: notes.trim()
    });
    
    // Reset form
    setName('');
    setNotes('');
    setErrors({});
  };

  const handleCancel = () => {
    setName('');
    setNotes('');
    setErrors({});
    onOpenChange(false);
  };

  // Set suggested version name when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && !name) {
      setName(generateSuggestedVersion());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save New Configuration Version</DialogTitle>
          <DialogDescription>
            Create a new version of the current AI agent configuration. This will capture the current prompt, model settings, and other configuration options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Version Name</Label>
            <Input
              id="version-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., v1.1, v2.0, beta-1"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500">
              Based on current version: {currentVersion}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="version-notes">Description</Label>
            <Textarea
              id="version-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what changed in this version..."
              className={`min-h-[100px] ${errors.notes ? 'border-red-500' : ''}`}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes}</p>
            )}
            <p className="text-xs text-gray-500">
              Example: "Updated prompt to be more empathetic", "Added technical troubleshooting steps"
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">What will be saved:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Current system prompt from Prompts tab</li>
              <li>• Model configuration (GPT-4o, temperature, etc.)</li>
              <li>• Data source settings</li>
              <li>• Quality control preferences</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}