import { format, isSameMonth, isSameYear } from 'date-fns';

export function generateSprintName(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Same month sprint
  if (isSameMonth(start, end)) {
    const monthYear = format(start, 'MMMM yyyy');
    const startDay = format(start, 'd');
    const endDay = format(end, 'd');
    return `${monthYear} Sprint (${format(start, 'MMM')} ${startDay}-${endDay})`;
  }
  
  // Cross-month, same year
  if (isSameYear(start, end)) {
    return `Sprint ${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }
  
  // Cross-year
  return `Sprint ${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

export function isQuarterlySprint(startDate: Date, endDate: Date): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if this spans roughly 3 months (80+ days)
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 80;
}

export function generateQuarterlySprintName(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const startMonth = start.getMonth();
  const year = start.getFullYear();
  
  // Determine quarter
  let quarter = 1;
  if (startMonth >= 3 && startMonth <= 5) quarter = 2;
  else if (startMonth >= 6 && startMonth <= 8) quarter = 3;
  else if (startMonth >= 9 && startMonth <= 11) quarter = 4;
  
  return `Q${quarter} ${year} Sprint (${format(start, 'MMM d')} - ${format(endDate, 'MMM d')})`;
}