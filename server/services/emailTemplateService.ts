import type { EmailTemplate } from '../../shared/schema';

/**
 * Email Template Service
 * Handles template rendering with variable replacement
 */
export class EmailTemplateService {
  /**
   * Render an email template with variable replacement
   * Replaces {{variable}} patterns with provided values
   */
  renderTemplate(template: EmailTemplate, variables: Record<string, any>): {
    subject: string;
    html: string;
    unresolvedVariables: string[];
  } {
    const unresolvedVariables: string[] = [];
    
    // Render subject
    let renderedSubject = template.subject || '';
    renderedSubject = this.replaceVariables(renderedSubject, variables, unresolvedVariables);
    
    // Render HTML body
    let renderedHtml = template.htmlBody;
    renderedHtml = this.replaceVariables(renderedHtml, variables, unresolvedVariables);
    
    return {
      subject: renderedSubject,
      html: renderedHtml,
      unresolvedVariables: [...new Set(unresolvedVariables)], // Remove duplicates
    };
  }

  /**
   * Replace {{variable}} patterns in text with actual values
   */
  private replaceVariables(
    text: string,
    variables: Record<string, any>,
    unresolvedVariables: string[]
  ): string {
    // Match {{variable}} patterns
    const pattern = /\{\{([^}]+)\}\}/g;
    
    return text.replace(pattern, (match, variableName) => {
      const trimmedName = variableName.trim();
      
      if (trimmedName in variables) {
        return String(variables[trimmedName]);
      } else {
        // Track unresolved variables
        unresolvedVariables.push(trimmedName);
        return match; // Keep original {{variable}} if not found
      }
    });
  }

  /**
   * Extract all variables used in a template
   */
  extractVariables(template: EmailTemplate): string[] {
    const variables = new Set<string>();
    const pattern = /\{\{([^}]+)\}\}/g;
    
    // Extract from subject
    if (template.subject) {
      let match;
      while ((match = pattern.exec(template.subject)) !== null) {
        variables.add(match[1].trim());
      }
    }
    
    // Extract from HTML body
    pattern.lastIndex = 0; // Reset regex
    let match;
    while ((match = pattern.exec(template.htmlBody)) !== null) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  }

  /**
   * Validate that all variables used in the template are provided
   * Note: variablesManifest is now a Record<string, string> for documentation only.
   * We validate against actual variables found in the template content.
   */
  validateVariables(
    template: EmailTemplate,
    variables: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    // Extract all variables from template content
    const usedVariables = this.extractVariables(template);
    
    // Find which variables are missing from the provided data
    const missing = usedVariables.filter(name => !(name in variables));
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export const emailTemplateService = new EmailTemplateService();
