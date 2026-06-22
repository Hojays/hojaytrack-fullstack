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
import { Clock, Coffee, AlertTriangle, Users, RefreshCw } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { formatLocalTime } from "@/lib/utils"

const API_BASE = "/api"

interface Timecard {
  id: number
  employeeId: string
  employeeName: string
  department: string
  date: string
  clockIn: string
  clockOut: string | null
  isActive: boolean
  onBreak: boolean
  regularHours: number
  overtimeHours: number
  totalHours: number
  breakMinutes: number
  unpaidBreakMinutes: number
  autoCapped: boolean
  approvalStatus: "pending" | "approved" | "rejected"
}

export function AdminTimecards() {
  const [timecards, setTimecards] = useState<Timecard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchTimecards = useCallback(async () => {
    setError("")
    try {
      const res = await fetch(`${API_BASE}/admin/timecards`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not load timecards.")
        return
      }
      setTimecards(data.timecards)
    } catch {
      setError("Could not reach the server to load timecards.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTimecards()
  }, [fetchTimecards])

  const activeCount = timecards.filter((t) => t.isActive).length
  const cappedCount = timecards.filter((t) => t.autoCapped).length
  const totalOvertime = timecards.reduce((sum, t) => sum + t.overtimeHours, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DashboardHeader
        title="Employee Timecards"
        description="Every clock-in across the team, with live status, break deductions, and guardrail activity"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTimecards}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </DashboardHeader>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently Clocked In</CardTitle>
            <Clock className="h-4 w-4 text-success" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground">employees on shift right now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Auto-Capped Shifts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{cappedCount}</p>
            <p className="text-xs text-muted-foreground">ended by the daily hours guardrail</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Overtime</CardTitle>
            <Users className="h-4 w-4 text-accent" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{totalOvertime.toFixed(2)}h</p>
            <p className="text-xs text-muted-foreground">across all shifts shown below</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clock Records</CardTitle>
          <CardDescription>Active and completed shifts across every employee, most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Breaks</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Loading timecards…
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : timecards.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No clock records yet. Once employees start clocking in, they'll show up here.
                    </TableCell>
                  </TableRow>
                ) : (
                  timecards.map((card) => (
                    <TableRow key={card.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{card.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{card.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground hidden md:table-cell">{card.department}</TableCell>
                      <TableCell className="text-foreground hidden lg:table-cell">{card.date}</TableCell>
                      <TableCell className="text-foreground">{formatLocalTime(card.clockIn)}</TableCell>
                      <TableCell>
                        {card.isActive ? (
                          <Badge className="bg-success/15 text-success border-success/30">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success animate-pulse inline-block" aria-hidden="true" />
                            On shift
                          </Badge>
                        ) : (
                          <span className="text-foreground">{formatLocalTime(card.clockOut)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {card.breakMinutes > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm text-foreground">
                            <Coffee className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            {card.breakMinutes}m
                            {card.unpaidBreakMinutes > 0 && (
                              <span className="text-warning text-xs">(−{card.unpaidBreakMinutes}m unpaid)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-foreground">{card.totalHours}h</div>
                        {card.overtimeHours > 0 && (
                          <div className="text-xs text-accent">+{card.overtimeHours}h OT</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {card.onBreak && (
                            <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/30">
                              On break
                            </Badge>
                          )}
                          {card.autoCapped && (
                            <Badge variant="secondary" className="bg-destructive/15 text-destructive border-destructive/30">
                              Auto-capped
                            </Badge>
                          )}
                          {!card.isActive && (
                            <Badge
                              variant="secondary"
                              className={
                                card.approvalStatus === "approved"
                                  ? "bg-success/15 text-success border-success/30"
                                  : card.approvalStatus === "rejected"
                                    ? "bg-destructive/15 text-destructive border-destructive/30"
                                    : "bg-muted text-muted-foreground"
                              }
                            >
                              {card.approvalStatus}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
