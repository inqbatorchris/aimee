import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { AIAssistantPanel } from './AIAssistantPanel';

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        data-testid="button-open-ai-assistant"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all hover:scale-110"
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Assistant (Aimee)"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>

      <AIAssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
