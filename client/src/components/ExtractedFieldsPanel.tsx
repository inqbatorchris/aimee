import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Check, AlertCircle } from "lucide-react";

interface ExtractedField {
  value: string;
  confidence?: number;
  field?: string;
  targetTable?: string;
  extractedAt?: string;
}

interface CustomFieldDefinition {
  id: number;
  fieldName: string;
  displayLabel: string;
  fieldType: string;
  description?: string;
}

interface ExtractedFieldsPanelProps {
  extractedData: Record<string, ExtractedField | any>;
  customFieldDefinitions?: CustomFieldDefinition[];
  loading?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 90 ? "bg-green-500" : confidence >= 70 ? "bg-yellow-500" : "bg-orange-500";
  return (
    <Badge className={`${color} text-white`} data-testid="badge-confidence">
      {confidence}% confidence
    </Badge>
  );
}

function ExtractedFieldRow({ fieldName, data }: { fieldName: string; data: any }) {
  const displayLabel = data.field || fieldName;
  const value = typeof data === 'string' ? data : data.value || '';
  const confidence = data.confidence;
  const extractedAt = data.extractedAt;

  return (
    <div className="border-b last:border-0 py-3" data-testid={`extracted-field-${fieldName}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium" data-testid={`field-name-${fieldName}`}>
              {displayLabel}
            </span>
          </div>
          <div className="text-sm text-muted-foreground pl-6" data-testid={`field-value-${fieldName}`}>
            {value || <span className="italic">No value</span>}
          </div>
          {extractedAt && (
            <div className="text-xs text-muted-foreground pl-6 mt-1">
              Extracted {new Date(extractedAt).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {confidence !== undefined && <ConfidenceBadge confidence={confidence} />}
          <Badge variant="outline" className="text-xs" data-testid="badge-ocr">
            <Check className="h-3 w-3 mr-1" />
            OCR
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function ExtractedFieldsPanel({ extractedData, customFieldDefinitions, loading }: ExtractedFieldsPanelProps) {
  if (loading) {
    return (
      <Card data-testid="extracted-fields-loading">
        <CardHeader>
          <CardTitle>Extracted Fields (OCR)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasExtractedData = extractedData && Object.keys(extractedData).length > 0;

  if (!hasExtractedData) {
    return (
      <Card data-testid="extracted-fields-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extracted Fields (OCR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">No extracted data yet. Complete a workflow with OCR-enabled photo steps to extract field data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="extracted-fields-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Extracted Fields (OCR)
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Data extracted from photos using OCR technology
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {Object.entries(extractedData).map(([fieldName, data]) => (
            <ExtractedFieldRow key={fieldName} fieldName={fieldName} data={data} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
