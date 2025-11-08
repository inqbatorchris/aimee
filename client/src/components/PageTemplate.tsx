
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

interface SectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function PageTemplate({ title, subtitle, children }: PageTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Standardized Header */}
      <div className="page-header">
        <div className="page-container">
          <h1 className="page-title text-gray-900">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="page-container">
        <div className="space-y-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PageSection({ title, icon, children }: SectionProps) {
  return (
    <Card className="section-spacing">
      <CardHeader className="card-header-padding">
        <CardTitle className="flex items-center gap-2 section-title">
          {icon && <span className="h-3 w-3">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="card-padding">
        {children}
      </CardContent>
    </Card>
  );
}

// Standardized form components
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="form-spacing">
      <label className="block label-text mb-1">{label}</label>
      {children}
    </div>
  );
}

export function StandardInput({ placeholder, type = "text", ...props }: any) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 input-text border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
      {...props}
    />
  );
}

export function StandardButton({ children, variant = "primary", size = "default", ...props }: any) {
  const baseClasses = "button-text px-3 py-1.5";
  
  if (variant === "outline") {
    return (
      <Button 
        variant="outline" 
        className={`${baseClasses} w-full sm:w-auto`} 
        {...props}
      >
        {children}
      </Button>
    );
  }
  
  return (
    <Button 
      className={`${baseClasses} w-full sm:w-auto`} 
      {...props}
    >
      {children}
    </Button>
  );
}

export default PageTemplate;
