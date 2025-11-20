import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Hash, User, Mail, Tags, Calendar, MapPin, FileText } from 'lucide-react';

interface FieldOption {
  name: string;
  type: string;
  icon: React.ElementType;
  description?: string;
}

interface VariableFieldPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  availableFields?: FieldOption[];
  multiline?: boolean;
  rows?: number;
  variablePrefix?: string;
}

const DEFAULT_FIELDS: FieldOption[] = [
  { name: 'id', type: 'number', icon: Hash, description: 'Customer ID' },
  { name: 'name', type: 'string', icon: User, description: 'Customer name' },
  { name: 'email', type: 'string', icon: Mail, description: 'Email address' },
  { name: 'phone', type: 'string', icon: User, description: 'Phone number' },
  { name: 'customer_labels', type: 'array', icon: Tags, description: 'Customer labels' },
  { name: 'status', type: 'string', icon: FileText, description: 'Customer status' },
  { name: 'street_1', type: 'string', icon: MapPin, description: 'Street address' },
  { name: 'city', type: 'string', icon: MapPin, description: 'City' },
  { name: 'date_add', type: 'string', icon: Calendar, description: 'Date added' },
];

export function VariableFieldPicker({ 
  value, 
  onChange, 
  placeholder = "e.g., {{currentItem.id}}", 
  className = "",
  availableFields = DEFAULT_FIELDS,
  multiline = false,
  rows = 3,
  variablePrefix = 'currentItem'
}: VariableFieldPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredFields = availableFields.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectField = (fieldName: string) => {
    onChange(`{{${variablePrefix}.${fieldName}}}`);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex gap-1 items-start">
        {multiline ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm"
            rows={rows}
            data-testid="textarea-variable-field"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm"
            data-testid="input-variable-field"
          />
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0"
          data-testid="button-open-field-picker"
          title="Pick a field from dropdown"
        >
          <Sparkles className="h-3 w-3" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-2 border-b sticky top-0 bg-white dark:bg-gray-800">
            <Input
              placeholder="Filter fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
              autoFocus
              data-testid="input-search-fields"
            />
          </div>
          <div className="p-1">
            {filteredFields.length > 0 ? (
              filteredFields.map(field => {
                const Icon = field.icon;
                return (
                  <button
                    key={field.name}
                    type="button"
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-left transition-colors"
                    onClick={() => handleSelectField(field.name)}
                    data-testid={`button-select-field-${field.name}`}
                  >
                    <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <code className="font-mono font-medium block truncate">
                        {field.name}
                      </code>
                      {field.description && (
                        <span className="text-xs text-gray-500 block truncate">
                          {field.description}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{field.type}</span>
                  </button>
                );
              })
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No fields found matching "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
