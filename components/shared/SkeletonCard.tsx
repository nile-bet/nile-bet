import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-nile-blue/20 rounded',
        className
      )}
    />
  )
}

export function SkeletonStatCard() {
  return (
    <div className="bg-slate-dark border border-nile-blue/40 rounded-xl p-5">
      <div className="flex justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function SkeletonMatchRow() {
  return (
    <div className="border-b border-nile-blue/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex gap-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-10 w-14 rounded-md"
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonSlipCard() {
  return (
    <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4 mb-3">
      <div className="flex justify-between mb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48 mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-nile-blue/20">
      {[...Array(5)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1"
        />
      ))}
    </div>
  )
}