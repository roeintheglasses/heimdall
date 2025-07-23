import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function EventCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted/40">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
            
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Randomly show metadata skeleton on some cards */}
      {Math.random() > 0.5 && (
        <CardContent className="pt-0">
          <div className="rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}