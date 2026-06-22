"use client"

import { cn } from "@/lib/utils"
import {
  Clock,
  Users,
  Settings,
  LayoutDashboard,
  LogOut,
  Bell,
  Menu,
  X,
  Square,
  ClipboardList,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { 
  type User, 
  NAVIGATION_ITEMS, 
  getInitials, 
  getRoleBadge 
} from "@/lib/mock-data"

interface SidebarProps {
  activeView: "employee" | "manager" | "timecards" | "admin"
  onViewChange: (view: "employee" | "manager" | "timecards" | "admin") => void
  user: User
  onSignOut: () => void
  isClockedIn?: boolean
  onClockOutClick?: () => void
}

const iconMap = {
  Clock,
  Users,
  Settings,
  ClipboardList,
}

export function Sidebar({ activeView, onViewChange, user, onSignOut, isClockedIn = false, onClockOutClick }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Close mobile menu when view changes
  const handleViewChange = (view: "employee" | "manager" | "timecards" | "admin") => {
    onViewChange(view)
    setIsMobileMenuOpen(false)
  }

  // Filter navigation based on user role
  const filteredNavigation = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  )

  const SidebarContent = () => (
    <>
      {/* Logo and Header */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div 
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary"
          aria-hidden="true"
        >
          <LayoutDashboard className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">HojayTrack</span>
          <span className="text-xs text-sidebar-foreground/60">Enterprise Portal</span>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
        <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
          Navigation
        </div>
        <ul className="space-y-1" role="list">
          {filteredNavigation.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap]
            const isActive = activeView === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleViewChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`Navigate to ${item.label}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs opacity-60">{item.description}</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Clock Out Button — visible to every role; everyone clocks in/out the same way */}
      <div className="px-3 py-3">
        <button
          onClick={onClockOutClick}
          disabled={!isClockedIn}
          aria-label={isClockedIn ? "Go to clock out screen" : "You are not currently clocked in"}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar",
            isClockedIn
              ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
              : "cursor-not-allowed bg-sidebar-accent/30 text-sidebar-foreground/30"
          )}
        >
          <Square className="h-4 w-4" aria-hidden="true" />
          Clock Out
        </button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* User Profile Section */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">
              {getRoleBadge(user.role)} | {user.employeeId}
            </span>
          </div>
          <button 
            className="rounded p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          onClick={onSignOut}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
          aria-label="Sign out of your account"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header Bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between bg-sidebar px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <LayoutDashboard className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">HojayTrack</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Fixed on desktop, slides in on mobile */}
      <aside
        className={cn(
          "flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out",
          isMobile
            ? cn(
                "fixed left-0 top-0 z-50 w-72 pt-16",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              )
            : "fixed left-0 top-0 z-30 w-64"
        )}
        aria-label="Sidebar navigation"
      >
        <SidebarContent />
      </aside>
    </>
  )
}
