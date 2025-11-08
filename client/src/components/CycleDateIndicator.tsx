import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CheckInCycle } from '@shared/schema';

interface CycleDateIndicatorProps {
  className?: string;
}

export default function CycleDateIndicator({ className }: CycleDateIndicatorProps) {
  // Fetch current active cycle for the first objective (as example)
  const { data: cycles = [] } = useQuery<CheckInCycle[] | null, Error, CheckInCycle[]>({
    queryKey: ['/api/strategy/check-in-cycles/current'],
    select: (data) => data ?? [],
  });
  
  // Get the first active cycle if available
  const currentCycle = cycles[0];
  
  if (!currentCycle) {
    return null;
  }
  
  // Format dates as DD/MM
  const startDate = currentCycle.startDate ? format(new Date(currentCycle.startDate), 'dd/MM') : '';
  const endDate = currentCycle.endDate ? format(new Date(currentCycle.endDate), 'dd/MM') : '';
  
  return (
    <Link href="/strategy/cycles">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-8 px-2 gap-1 text-sm", className)}
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden md:inline">
          Cycle: {startDate} - {endDate}
        </span>
        <span className="md:hidden">
          {startDate}-{endDate}
        </span>
      </Button>
    </Link>
  );
}