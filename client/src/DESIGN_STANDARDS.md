
# Design Standards Guide

This document outlines the standardized design patterns to ensure consistent, compact, and mobile-responsive pages across the application.

## Font Size Standards

### Typography Hierarchy
- **Page Title**: 14px (text-sm) - Use `.page-title` class
- **Page Subtitle**: 12px (text-xs) - Use `.page-subtitle` class  
- **Section Titles**: 12px (text-xs) with medium weight - Use `.section-title` class
- **Labels**: 12px (text-xs) with medium weight - Use `.label-text` class
- **Body Text**: 12px (text-xs) - Use `.body-text` class
- **Helper Text**: 11px (smaller than text-xs) - Use `.helper-text` class
- **Input Text**: 12px (text-xs) - Use `.input-text` class
- **Button Text**: 12px (text-xs) - Use `.button-text` class

### Maximum Font Size Rule
- **Never exceed 14px (text-sm)** for any text element
- Standard text should be 12px (text-xs)
- Helper/secondary text can be 11px or smaller

## Layout Standards

### Page Structure
```tsx
<PageTemplate title="Page Name" subtitle="Optional description">
  <PageSection title="Section Name" icon={<IconComponent />}>
    {/* Section content */}
  </PageSection>
</PageTemplate>
```

### Container Widths
- **Max width**: 42rem (max-w-2xl) for all pages
- **Padding**: 1rem on mobile, maintained on desktop
- **Single column layout**: Always use vertical stacking

### Spacing Standards
- **Section spacing**: 1rem between cards (space-y-4)
- **Card padding**: 0.75rem (p-3)
- **Form spacing**: 0.75rem between form fields
- **Header padding**: 0.5rem vertical, 1rem horizontal

## Component Standards

### Form Elements
```tsx
// Use StandardInput for consistent styling
<StandardInput placeholder="Enter value" />

// Use FormField for consistent labeling
<FormField label="Field Name">
  <StandardInput placeholder="Value" />
</FormField>
```

### Buttons
```tsx
// Primary button
<StandardButton>Save Changes</StandardButton>

// Outline button  
<StandardButton variant="outline">Cancel</StandardButton>
```

### Cards
- Use `Card` component with standardized padding
- Icons should be 12px (h-3 w-3) in section titles
- Keep content compact and scannable

## Mobile Responsiveness

### Grid Layouts
- **Mobile**: Single column (grid-cols-1)
- **Desktop**: Two columns where appropriate (sm:grid-cols-2)
- Use `.mobile-grid-cols` utility class

### Touch Targets
- Minimum 44px height for clickable elements
- Adequate spacing between interactive elements
- Ensure form inputs are easily tappable

## Implementation Checklist

When creating new pages:

- [ ] Use `PageTemplate` component for consistent structure
- [ ] Apply font size standards (max 14px)
- [ ] Use standardized CSS classes
- [ ] Test on mobile devices
- [ ] Ensure single-column vertical layout
- [ ] Apply consistent spacing
- [ ] Use standard form components
- [ ] Keep icon sizes consistent (h-3 w-3)

## Example Usage

```tsx
import { PageTemplate, PageSection, FormField, StandardInput, StandardButton } from '@/components/PageTemplate';
import { Settings } from 'lucide-react';

export default function NewPage() {
  return (
    <PageTemplate 
      title="New Feature" 
      subtitle="Manage your new feature settings"
    >
      <PageSection title="Configuration" icon={<Settings className="h-3 w-3" />}>
        <FormField label="Setting Name">
          <StandardInput placeholder="Enter setting value" />
        </FormField>
        <StandardButton>Save Settings</StandardButton>
      </PageSection>
    </PageTemplate>
  );
}
```

This ensures every new page follows the same compact, consistent design pattern established in the Account Settings page.
