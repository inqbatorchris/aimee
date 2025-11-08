/**
 * Utility functions for text formatting and message processing
 */

/**
 * Decode HTML entities in text
 */
export const decodeHtmlEntities = (text: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return doc.documentElement.textContent || '';
};

/**
 * Format message text with proper line breaks and entity decoding
 */
export const formatMessage = (text: string): string => {
  if (!text) return '';
  
  // First decode HTML entities
  const decoded = decodeHtmlEntities(text);
  
  // Normalize line endings and clean up
  let formatted = decoded
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  // Convert multiple consecutive line breaks to paragraph separators
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Add proper paragraph breaks for email-like formatting
  formatted = formatted
    // Break after sentences followed by single line break if next line starts with capital letter or number
    .replace(/([.!?])\n([A-Z0-9][a-z])/g, '$1\n\n$2')
    // Break before common greeting patterns
    .replace(/\n(Good morning|Good afternoon|Good evening|Hello|Hi |Dear )/gi, '\n\n$1')
    // Break before signature patterns
    .replace(/\n(Kind regards|Best regards|Regards|Thanks|Thank you|Cheers)/gi, '\n\n$1')
    // Break before contact information patterns
    .replace(/\n([A-Z][a-z]+ [A-Z][a-z]+\s*(?:Manager|Director|Support|Team|Accounts))/g, '\n\n$1')
    // Break before email/phone patterns
    .replace(/\n(Email:|Phone:|Tel:|DD:|Main Office:)/gi, '\n\n$1')
    // Break before important notices
    .replace(/\n(CAUTION:|WARNING:|NOTICE:|IMPORTANT:)/gi, '\n\n$1')
    // Break before quoted sections and email forwards
    .replace(/\n>/g, '\n\n>')
    .replace(/\n(From:|To:|Subject:|Sent:|Date:)/gi, '\n\n$1')
    // Break before customer/ticket information
    .replace(/\n(Customer|Ticket|Status|Priority|Subject|Re:)/gi, '\n\n$1')
    // Break before email addresses and customer IDs
    .replace(/\n(<[^>]+@[^>]+>)/g, '\n\n$1')
    .replace(/\n(Customer ID|Ticket ID|CC[0-9]+)/gi, '\n\n$1')
    // Break before time stamps and dates
    .replace(/\n([0-9]{1,2}:[0-9]{2}:[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}|[A-Z][a-z]+ [0-9]{1,2} [A-Z][a-z]+ [0-9]{4})/g, '\n\n$1')
    // Break before "wrote:" patterns common in email threads
    .replace(/\n([^<\n]+wrote:)/gi, '\n\n$1')
    // Break before lists (numbered or bulleted)
    .replace(/\n([0-9]+\.|\*|\-) /g, '\n\n$1 ')
    // Break before follow-up phrases
    .replace(/\n(FOLLOW US|Please note|So sorry|Can we do)/gi, '\n\n$1');
  
  return formatted;
};

/**
 * Get enhanced timestamp information
 */
export const getEnhancedTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  let relative: string;
  if (diffInMinutes < 1) relative = 'Just now';
  else if (diffInMinutes < 60) relative = `${diffInMinutes}m ago`;
  else if (diffInMinutes < 1440) relative = `${Math.floor(diffInMinutes / 60)}h ago`;
  else relative = `${Math.floor(diffInMinutes / 1440)}d ago`;
  
  const absolute = date.toLocaleString();
  
  return { relative, absolute };
};

/**
 * Group consecutive messages from the same author
 */
export const groupMessages = <T extends { authorName: string; createdAt: string }>(
  messages: T[]
): T[][] => {
  if (!messages.length) return [];
  
  return messages.reduce((groups, message, index) => {
    const prevMessage = messages[index - 1];
    const shouldGroup = prevMessage && 
      prevMessage.authorName === message.authorName &&
      (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 300000; // 5 min
    
    if (shouldGroup) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, [] as T[][]);
};

/**
 * Get message styling based on author type and content
 */
export const getMessageStyle = (authorType: string, isInternal: boolean = false) => {
  const baseStyles = "p-3 rounded-lg shadow-sm border transition-colors";
  
  if (isInternal) {
    return `${baseStyles} bg-amber-50 border-l-4 border-amber-400 border-amber-200`;
  }
  
  switch (authorType) {
    case 'customer':
    case 'incoming':
      return `${baseStyles} bg-blue-50 border-blue-200`;
    case 'admin':
      return `${baseStyles} bg-gray-50 border-gray-200`;
    default:
      return `${baseStyles} bg-green-50 border-green-200`;
  }
};

/**
 * Get author badge styling
 */
export const getAuthorBadge = (authorType: string) => {
  switch (authorType) {
    case 'customer':
    case 'incoming':
      return { text: 'Customer', variant: 'default' as const };
    case 'admin':
      return { text: 'Staff', variant: 'secondary' as const };
    default:
      return { text: 'System', variant: 'outline' as const };
  }
};

/**
 * Debounce function for auto-save functionality
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};