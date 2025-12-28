import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function EventCardSkeleton() {
  return (
    <Card className="border-2 border-l-4 border-muted/40 bg-terminal-black">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        {/* Icon skeleton */}
        <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />

        {/* Badge skeleton */}
        <Skeleton className="h-5 w-14 shrink-0 rounded-sm" />

        {/* Title skeleton */}
        <Skeleton className="h-4 flex-1" />

        {/* Timestamp skeleton */}
        <Skeleton className="h-3 w-12 shrink-0" />
      </CardContent>
    </Card>
  );
}
