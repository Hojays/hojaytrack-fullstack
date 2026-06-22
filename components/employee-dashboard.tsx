"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Coffee, Clock, CalendarDays, TrendingUp } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { TimeClock } from "@/components/time-clock"
import { type BreakEntry, type TimeEntry, calculateWeeklyStats } from "@/lib/mock-data"
import { formatLocalTime } from "@/lib/utils"

const API_BASE = "/api"

interface EmployeeDashboardProps {
  // All shift/break state now lives in the parent (app/page.tsx) and is
  // passed down here as props — this component no longer keeps its own
  // copy. That's what makes "Clock Out" behave identically no matter which
  // view (dashboard card vs. full-screen) the click happens from: both
  // call the exact same handlers and read the exact same state.
  isClockedIn: boolean
  clockInTime: Date | null
  elapsedTime: string
  currentBreak: BreakEntry | null
  onClockIn: () => void | Promise<void>
  onClockOut: () => void | Promise<void>
  onStartBreak: (type: "lunch" | "short") => void | Promise<void>
  onEndBreak: () => void | Promise<void>
}

export function EmployeeDashboard({
  isClockedIn,
  clockInTime,
  elapsedTime,
  currentBreak,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
}: EmployeeDashboardProps) {
  const [breakHistory, setBreakHistory] = useState<BreakEntry[]>([])
  const [timeHistory, setTimeHistory] = useState<TimeEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState("")

  const fetchHistory = useCallback(async () => {
    setHistoryError("")
    try {
      const res = await fetch(`${API_BASE}/clock-history`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setHistoryError(data.error ?? "Could not load your hours history.")
        return
      }
      setTimeHistory(data.history)
    } catch {
      setHistoryError("Could not reach the server to load your hours history.")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Load real hours history from the backend on mount, and again whenever
  // a shift just ended (isClockedIn flips to false) so a newly completed
  // shift shows up without needing a manual refresh.
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, isClockedIn])

  // Track break history locally for "today's" display purposes. Since the
  // active break itself is now resumed from the backend on login (handled
  // in the parent), this list only needs to grow as breaks are completed
  // during the current session.
  const previousBreakRef = useState<{ current: BreakEntry | null }>({ current: null })[0]
  useEffect(() => {
    if (previousBreakRef.current && !currentBreak) {
      // A break just ended — move it into history for display.
      setBreakHistory((prev) => [previousBreakRef.current as BreakEntry, ...prev])
    }
    previousBreakRef.current = currentBreak
  }, [currentBreak, previousBreakRef])

  const handleClockOutAndRefresh = async () => {
    await onClockOut()
  }

  const weeklyStats = calculateWeeklyStats(timeHistory)
  const breakMinutesToday = breakHistory.reduce((sum, b) => sum + (b.duration || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DashboardHeader
        title="Employee Dashboard"
        description="Track your work hours, breaks, and view your timesheet history"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Regular</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{weeklyStats.regularHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">of 40h target</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Overtime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{weeklyStats.overtimeHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">above threshold</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total This Week</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{weeklyStats.totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">{weeklyStats.daysLogged} days logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Time Clock Component */}
        <div className="lg:row-span-2">
          <TimeClock
            isClockedIn={isClockedIn}
            clockInTime={clockInTime}
            elapsedTime={elapsedTime}
            currentBreak={currentBreak}
            breakHistory={breakHistory}
            onClockIn={onClockIn}
            onClockOut={handleClockOutAndRefresh}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
          />
        </div>

        {/* Break Tracking */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-foreground">Break Tracking</CardTitle>
            <CardDescription>Today&apos;s break history and current status</CardDescription>
          </CardHeader>
          <CardContent>
            {breakHistory.length === 0 && !currentBreak ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Coffee className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">No breaks taken today</p>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Break history">
                {currentBreak && (
                  <div
                    className="flex items-center justify-between rounded-md border border-warning/50 bg-warning/10 px-3 py-2 animate-in slide-in-from-top duration-300"
                    role="listitem"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-warning" aria-hidden="true" />
                      <span className="text-sm text-foreground">{currentBreak.type === "lunch" ? "Lunch" : "Short"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{currentBreak.startTime} - Now</span>
                  </div>
                )}
                {breakHistory.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2"
                    role="listitem"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                      <span className="text-sm text-foreground">{b.type === "lunch" ? "Lunch" : "Short"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {b.startTime} - {b.endTime} ({b.duration}m)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-foreground">Today&apos;s Summary</CardTitle>
            <CardDescription>Current shift statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Elapsed Today</p>
                <p className="text-xl font-semibold text-foreground">
                  {isClockedIn ? elapsedTime.slice(0, 5) : "00:00"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Break Time</p>
                <p className="text-xl font-semibold text-foreground">
                  {breakMinutesToday}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-foreground">Hours History</CardTitle>
          <CardDescription>Your logged work hours for the current pay period</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Clock In</TableHead>
                <TableHead className="text-muted-foreground">Clock Out</TableHead>
                <TableHead className="text-right text-muted-foreground">Regular Hours</TableHead>
                <TableHead className="text-right text-muted-foreground">Overtime</TableHead>
                <TableHead className="text-right text-muted-foreground">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading your hours history…
                  </TableCell>
                </TableRow>
              ) : historyError ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-destructive">
                    {historyError}
                  </TableCell>
                </TableRow>
              ) : timeHistory.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No completed shifts yet. Clock in and out once to see your first entry here.
                  </TableCell>
                </TableRow>
              ) : (
                timeHistory.map((entry) => (
                  <TableRow key={entry.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{entry.date}</TableCell>
                    <TableCell className="text-foreground">{formatLocalTime(entry.clockIn)}</TableCell>
                    <TableCell className="text-foreground">{formatLocalTime(entry.clockOut)}</TableCell>
                    <TableCell className="text-right text-foreground">{entry.regularHours}h</TableCell>
                    <TableCell className="text-right">
                      {entry.overtimeHours > 0 ? (
                        <Badge variant="secondary" className="bg-accent/20 text-accent">
                          +{entry.overtimeHours}h
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">{entry.totalHours}h</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
