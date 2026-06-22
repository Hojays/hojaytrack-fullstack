"use client"

import { type User, getInitials, getRoleBadge } from "@/lib/mock-data"

interface DashboardHeaderProps {
  title: string
  description: string
  user?: User
  children?: React.ReactNode
}

export function DashboardHeader({ title, description, children }: DashboardHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  )
}
