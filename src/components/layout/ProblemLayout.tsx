import { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { cn } from '@/lib/utils'

interface ProblemLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  splitRatio?: number // 0-100, default 50
}

export function ProblemLayout({
  leftPanel,
  rightPanel,
  splitRatio = 50,
}: ProblemLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-background flex flex-col">
      {/* Navbar */}
      <Navbar onMenuClick={() => {}} showMenuButton={false} />

      {/* Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div
          className={cn(
            'overflow-y-auto border-b lg:border-b-0 lg:border-r border-neutral-border bg-neutral-surface'
          )}
          style={{ 
            height: 'calc(100vh - 4rem)',
            width: `${splitRatio}%` 
          }}
        >
          {leftPanel}
        </div>

        {/* Right Panel - Code Editor */}
        <div
          className="overflow-y-auto bg-neutral-background"
          style={{ 
            height: 'calc(100vh - 4rem)',
            width: `${100 - splitRatio}%` 
          }}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
