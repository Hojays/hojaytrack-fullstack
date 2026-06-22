"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { EmployeeDashboard } from "@/components/employee-dashboard"
import { ManagerApprovals } from "@/components/manager-approvals"
import { SystemConfiguration } from "@/components/system-configuration"
import { OracleLogin } from "@/components/oracle-login"
import { ClockInScreen } from "@/components/clock-in-screen"
import { ClockOutScreen } from "@/components/clock-out-screen"
import { AdminTimecards } from "@/components/admin-timecards"
import { type User, type BreakEntry } from "@/lib/mock-data"
import { formatTime } from "@/lib/mock-data"
import { useEffect } from "react"

const API_BASE = "/api"

type View = "employee" | "manager" | "timecards" | "admin"
type AppState = "login" | "clock-in" | "clock-out" | "dashboard"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [activeView, setActiveView] = useState<View>("employee")
  const [appState, setAppState] = useState<AppState>("login")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [elapsedTime, setElapsedTime] = useState("00:00:00")
  const [currentBreak, setCurrentBreak] = useState<BreakEntry | null>(null)

  // Timer effect for elapsed time — runs whenever clocked in
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - clockInTime.getTime()) / 1000)
        setElapsedTime(formatTime(diff))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isClockedIn, clockInTime])

  const handleLogin = useCallback(async (loggedInUser: User) => {
    setIsTransitioning(true)

    // Check whether this user already has an active shift on the backend —
    // e.g. they signed out without clocking out, and are logging back in.
    // If so, we must resume that exact shift's original clock-in time, not
    // start a fresh timer at zero.
    let existingShift: { active: boolean; clockInTime?: string; activeBreak?: { type: "lunch" | "short"; startTime: string } | null } = { active: false }
    try {
      const res = await fetch(`${API_BASE}/clock-status`, { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.success) {
        existingShift = data
      }
    } catch {
      // Backend unreachable — fall back to treating them as not clocked in;
      // they can always clock in manually once the backend is reachable
    }

    setTimeout(() => {
      setUser(loggedInUser)
      setActiveView("employee")
      setIsTransitioning(false)

      if (existingShift.active && existingShift.clockInTime) {
        // Resume the shift exactly where it left off — original clock-in
        // timestamp preserved, so elapsed time includes time spent signed out.
        setClockInTime(new Date(existingShift.clockInTime))
        setIsClockedIn(true)
        if (existingShift.activeBreak) {
          setCurrentBreak({
            id: "resumed",
            type: existingShift.activeBreak.type,
            startTime: new Date(existingShift.activeBreak.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            endTime: null,
            duration: null,
          })
        }
        setAppState("clock-out")
      } else {
        // No active shift — every role, including managers and admins,
        // starts at the same dedicated clock-in screen as a regular employee.
        setAppState("clock-in")
      }
    }, 800)
  }, [])

  const handleClockIn = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/clock-in`, { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        // Most likely "already clocked in" elsewhere — don't fake a new shift locally
        return
      }
      setClockInTime(new Date(data.clockInTime))
      setIsClockedIn(true)
      setElapsedTime("00:00:00")
      setAppState("clock-out")
      setShowWelcome(true)
      setTimeout(() => setShowWelcome(false), 3000)
    } catch {
      // Backend unreachable — don't transition screens on a clock-in that never happened
    }
  }, [])

  const handleClockOut = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/clock-out`, { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        return
      }
      setIsClockedIn(false)
      setClockInTime(null)
      setElapsedTime("00:00:00")
      setCurrentBreak(null)
      // Clocking out anywhere — dashboard, sidebar, or the dedicated screen —
      // returns to the same default Clock-In screen every role starts at.
      setAppState("clock-in")
    } catch {
      // Backend unreachable — stay wherever the user is rather than
      // pretending the shift ended
    }
  }, [])

  const handleStartBreak = useCallback(async (type: "lunch" | "short") => {
    try {
      const res = await fetch(`${API_BASE}/start-break`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        return
      }
      setCurrentBreak({
        id: Date.now().toString(),
        type,
        startTime: new Date(data.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        endTime: null,
        duration: null,
      })
    } catch {
      // Backend unreachable — don't show a break that was never recorded
    }
  }, [])

  const handleEndBreak = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/end-break`, { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        return
      }
      setCurrentBreak(null)
    } catch {
      // Backend unreachable — leave the break marked active locally since
      // the server's record wasn't actually closed
    }
  }, [])

  const handleSignOut = useCallback(() => {
    setIsTransitioning(true)
    setTimeout(() => {
      setUser(null)
      setActiveView("employee")
      setAppState("login")
      setClockInTime(null)
      setIsClockedIn(false)
      setElapsedTime("00:00:00")
      setCurrentBreak(null)
      setIsTransitioning(false)
    }, 500)
  }, [])

  const renderContent = useCallback(() => {
    switch (activeView) {
      case "employee":
        return (
          <EmployeeDashboard
            isClockedIn={isClockedIn}
            clockInTime={clockInTime}
            elapsedTime={elapsedTime}
            currentBreak={currentBreak}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onStartBreak={handleStartBreak}
            onEndBreak={handleEndBreak}
          />
        )
      case "manager":
        return <ManagerApprovals />
      case "timecards":
        return <AdminTimecards />
      case "admin":
        return <SystemConfiguration />
      default:
        return (
          <EmployeeDashboard
            isClockedIn={isClockedIn}
            clockInTime={clockInTime}
            elapsedTime={elapsedTime}
            currentBreak={currentBreak}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onStartBreak={handleStartBreak}
            onEndBreak={handleEndBreak}
          />
        )
    }
  }, [activeView, isClockedIn, clockInTime, elapsedTime, currentBreak, handleClockIn, handleClockOut, handleStartBreak, handleEndBreak])

  if (appState === "login") {
    return (
      <>
        <OracleLogin onLogin={handleLogin} />
        {isTransitioning && (
          <div
            className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in duration-300"
            role="status"
            aria-label="Authenticating"
          >
            <div className="text-center">
              <div
                className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
                aria-hidden="true"
              />
              <p className="text-muted-foreground">Authenticating...</p>
            </div>
          </div>
        )}
      </>
    )
  }

  if (appState === "clock-in" && user) {
    return (
      <ClockInScreen
        user={user}
        onClockIn={handleClockIn}
        onViewDashboard={() => setAppState("dashboard")}
      />
    )
  }

  if (appState === "clock-out" && clockInTime) {
    return (
      <ClockOutScreen
        clockInTime={clockInTime}
        elapsedTime={elapsedTime}
        currentBreak={currentBreak}
        onClockOut={handleClockOut}
        onStartBreak={handleStartBreak}
        onEndBreak={handleEndBreak}
        onViewDashboard={() => setAppState("dashboard")}
      />
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        user={user}
        onSignOut={handleSignOut}
        isClockedIn={isClockedIn}
        onClockOutClick={() => setAppState("clock-out")}
      />
      <main className="min-h-screen lg:ml-64">
        <div className="h-16 lg:hidden" aria-hidden="true" />
        <div className="p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>

      {/* Welcome Toast */}
      {showWelcome && (
        <div
          className="fixed top-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isClockedIn ? "Clocked In Successfully!" : `Welcome, ${user.name}!`}
              </p>
              <p className="text-sm text-muted-foreground">
                {isClockedIn && clockInTime
                  ? `Started at ${clockInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                  : `Logged in as ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Transition */}
      {isTransitioning && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200"
          role="status"
          aria-label="Signing out"
        >
          <div className="text-center">
            <div
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
              aria-hidden="true"
            />
            <p className="text-muted-foreground">Signing out...</p>
          </div>
        </div>
      )}
    </div>
  )
}
