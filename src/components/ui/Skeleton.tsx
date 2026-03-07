import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-neutral-border', className)}
      {...props}
    />
  )
}

// Preset skeleton components for common use cases
const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn('h-4', i === lines - 1 && 'w-4/5')} />
    ))}
  </div>
)

const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('rounded-lg border border-neutral-border bg-neutral-surface p-6', className)}>
    <Skeleton className="h-6 w-3/4 mb-4" />
    <SkeletonText lines={3} />
  </div>
)

const SkeletonAvatar = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-12 w-12 rounded-full', className)} />
)

const SkeletonButton = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-10 w-24 rounded-md', className)} />
)

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar, SkeletonButton }
