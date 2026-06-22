"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2, XCircle, Clock, Users, FileText, AlertCircle } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { type TimesheetSubmission } from "@/lib/mock-data"

const API_BASE = "/api"

export function ManagerApprovals() {
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    setError("")
    try {
      const res = await fetch(`${API_BASE}/timesheet-submissions`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not load timesheet submissions.")
        return
      }
      setSubmissions(data.submissions)
    } catch {
      setError("Could not reach the server to load timesheet submissions.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const [actionError, setActionError] = useState<string>("")

  const handleApprove = async (id: string) => {
    setActionError("")
    setActioningId(id)
    try {
      const res = await fetch(`${API_BASE}/timesheet-submissions/${id}/approve`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "approved" as const } : s))
        )
      } else {
        setActionError(data?.error ?? "Could not approve this timesheet. Please try again.")
      }
    } catch {
      // Network error — leave the row as-is rather than optimistically lying about it
      setActionError("Could not reach the server. Please try again.")
    } finally {
      // Always clears, even on error, so the row's buttons never stay
      // stuck disabled and the next click on any row works normally.
      setActioningId(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionError("")
    setActioningId(id)
    try {
      const res = await fetch(`${API_BASE}/timesheet-submissions/${id}/reject`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "rejected" as const } : s))
        )
      } else {
        setActionError(data?.error ?? "Could not reject this timesheet. Please try again.")
      }
    } catch {
      // Network error — leave the row as-is
      setActionError("Could not reach the server. Please try again.")
    } finally {
      setActioningId(null)
    }
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length
  const approvedCount = submissions.filter((s) => s.status === "approved").length
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length
  const totalOvertimeHours = submissions.reduce((sum, s) => sum + s.overtimeHours, 0)

  const getStatusBadge = (status: TimesheetSubmission["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-warning/30">
            <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
            Pending Approval
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
            Rejected
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DashboardHeader
        title="Manager Approvals"
        description="Review and approve employee timesheet submissions for payroll processing"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">timesheets awaiting</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">this pay period</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">needs revision</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Overtime</CardTitle>
            <AlertCircle className="h-4 w-4 text-accent" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalOvertimeHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">across all submissions</p>
          </CardContent>
        </Card>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      {/* Main Table */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5" aria-hidden="true" />
                Timesheet Submissions
              </CardTitle>
              <CardDescription>Review employee hours and approve for payroll</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>{submissions.length} submissions</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Employee ID</TableHead>
                <TableHead className="text-muted-foreground">Employee</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Department</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Period</TableHead>
                <TableHead className="text-right text-muted-foreground hidden sm:table-cell">Regular</TableHead>
                <TableHead className="text-right text-muted-foreground hidden sm:table-cell">Overtime</TableHead>
                <TableHead className="text-right text-muted-foreground">Total Hours</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border">
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Loading timesheet submissions…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow className="border-border">
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : submissions.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    No completed shifts yet. Once employees clock in and out, their shifts will show up here.
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => (
                <TableRow key={submission.id} className="border-border">
                  <TableCell className="font-mono text-sm text-foreground">{submission.employeeId}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{submission.employeeName}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{submission.department}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground hidden md:table-cell">{submission.department}</TableCell>
                  <TableCell className="text-foreground hidden lg:table-cell">{submission.period}</TableCell>
                  <TableCell className="text-right text-foreground hidden sm:table-cell">{submission.regularHours}h</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {submission.overtimeHours > 0 ? (
                      <span className="font-medium text-accent">+{submission.overtimeHours}h</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">{submission.totalHours}h</TableCell>
                  <TableCell>{getStatusBadge(submission.status)}</TableCell>
                  <TableCell className="text-right">
                    {submission.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={actioningId === submission.id}
                          className="bg-success hover:bg-success/90 text-success-foreground transition-all duration-200 focus:ring-2 focus:ring-success focus:ring-offset-2"
                          onClick={() => handleApprove(submission.id)}
                          aria-label={`Approve timesheet for ${submission.employeeName}`}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actioningId === submission.id}
                          onClick={() => handleReject(submission.id)}
                          aria-label={`Reject timesheet for ${submission.employeeName}`}
                          className="transition-all duration-200 focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                        >
                          <XCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Action taken</span>
                    )}
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-accent/30 bg-accent/5 transition-all duration-200 hover:shadow-md">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="rounded-full bg-accent/20 p-2" aria-hidden="true">
            <AlertCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Approval Guidelines</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please review all overtime hours carefully. Submissions with overtime exceeding 10 hours require 
              additional documentation. Rejected timesheets will be sent back to the employee for revision.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
