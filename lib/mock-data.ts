// Mock Data Service - Centralized data store for the Employee Hours Tracking System
// This file can be replaced with API calls in production

export interface TimeEntry {
  id: string
  date: string
  clockIn: string
  clockOut: string
  regularHours: number
  overtimeHours: number
  totalHours: number
}

export interface BreakEntry {
  id: string
  type: "lunch" | "short"
  startTime: string
  endTime: string | null
  duration: number | null
}

export interface TimesheetSubmission {
  id: string
  employeeId: string
  employeeName: string
  department: string
  period: string
  regularHours: number
  overtimeHours: number
  totalHours: number
  status: "pending" | "approved" | "rejected"
  submittedAt: string
}

export interface OvertimeConfig {
  dailyThreshold: number
  weeklyThreshold: number
  overtimeMultiplier: number
  doubleTimeThreshold: number
  doubleTimeMultiplier: number
  enableWeekendOvertime: boolean
  enableHolidayOvertime: boolean
  autoApproveRegularHours: boolean
  requireManagerApproval: boolean
  maxWeeklyHours: number
  breakDeductionMinutes: number
}

export interface User {
  id: string
  email: string
  name: string
  role: "employee" | "manager" | "admin"
  employeeId: string
  department: string
}

// Navigation items for sidebar
export const NAVIGATION_ITEMS = [
  {
    id: "employee" as const,
    label: "Employee Dashboard",
    icon: "Clock",
    description: "Clock in/out & hours",
    roles: ["employee", "manager", "admin"],
  },
  {
    id: "manager" as const,
    label: "Manager Approvals",
    icon: "Users",
    description: "Timesheet approvals",
    roles: ["manager", "admin"],
  },
  {
    id: "timecards" as const,
    label: "Employee Timecards",
    icon: "ClipboardList",
    description: "Live hours & breaks",
    roles: ["manager", "admin"],
  },
  {
    id: "admin" as const,
    label: "System Configuration",
    icon: "Settings",
    description: "Overtime rules",
    roles: ["admin"],
  },
] as const

// Mock employee time history
export const MOCK_TIME_HISTORY: TimeEntry[] = [
  {
    id: "1",
    date: "2024-01-15",
    clockIn: "09:00 AM",
    clockOut: "06:30 PM",
    regularHours: 8,
    overtimeHours: 1.5,
    totalHours: 9.5,
  },
  {
    id: "2",
    date: "2024-01-14",
    clockIn: "08:45 AM",
    clockOut: "05:00 PM",
    regularHours: 8,
    overtimeHours: 0.25,
    totalHours: 8.25,
  },
  {
    id: "3",
    date: "2024-01-13",
    clockIn: "09:15 AM",
    clockOut: "05:15 PM",
    regularHours: 8,
    overtimeHours: 0,
    totalHours: 8,
  },
  {
    id: "4",
    date: "2024-01-12",
    clockIn: "08:30 AM",
    clockOut: "07:00 PM",
    regularHours: 8,
    overtimeHours: 2.5,
    totalHours: 10.5,
  },
  {
    id: "5",
    date: "2024-01-11",
    clockIn: "09:00 AM",
    clockOut: "05:30 PM",
    regularHours: 8,
    overtimeHours: 0.5,
    totalHours: 8.5,
  },
]

// Mock timesheet submissions for manager view
export const MOCK_TIMESHEET_SUBMISSIONS: TimesheetSubmission[] = [
  {
    id: "TS-001",
    employeeId: "EMP-1042",
    employeeName: "John Doe",
    department: "Engineering",
    period: "Jan 8 - Jan 14, 2024",
    regularHours: 40,
    overtimeHours: 4.75,
    totalHours: 44.75,
    status: "pending",
    submittedAt: "2024-01-15 09:30 AM",
  },
  {
    id: "TS-002",
    employeeId: "EMP-2156",
    employeeName: "Sarah Chen",
    department: "Marketing",
    period: "Jan 8 - Jan 14, 2024",
    regularHours: 40,
    overtimeHours: 2.5,
    totalHours: 42.5,
    status: "pending",
    submittedAt: "2024-01-15 10:15 AM",
  },
  {
    id: "TS-003",
    employeeId: "EMP-3089",
    employeeName: "Michael Brown",
    department: "Sales",
    period: "Jan 8 - Jan 14, 2024",
    regularHours: 38,
    overtimeHours: 0,
    totalHours: 38,
    status: "pending",
    submittedAt: "2024-01-15 11:00 AM",
  },
  {
    id: "TS-004",
    employeeId: "EMP-4521",
    employeeName: "Emily Wilson",
    department: "Engineering",
    period: "Jan 8 - Jan 14, 2024",
    regularHours: 40,
    overtimeHours: 8.25,
    totalHours: 48.25,
    status: "pending",
    submittedAt: "2024-01-15 08:45 AM",
  },
  {
    id: "TS-005",
    employeeId: "EMP-5678",
    employeeName: "David Martinez",
    department: "HR",
    period: "Jan 8 - Jan 14, 2024",
    regularHours: 40,
    overtimeHours: 1.0,
    totalHours: 41.0,
    status: "pending",
    submittedAt: "2024-01-15 02:30 PM",
  },
]

// Default overtime configuration
export const DEFAULT_OVERTIME_CONFIG: OvertimeConfig = {
  dailyThreshold: 8,
  weeklyThreshold: 40,
  overtimeMultiplier: 1.5,
  doubleTimeThreshold: 12,
  doubleTimeMultiplier: 2.0,
  enableWeekendOvertime: true,
  enableHolidayOvertime: true,
  autoApproveRegularHours: false,
  requireManagerApproval: true,
  maxWeeklyHours: 60,
  breakDeductionMinutes: 30,
}

// Demo users for login
export const DEMO_USERS: User[] = [
  {
    id: "1",
    email: "john@company.com",
    name: "John Doe",
    role: "employee",
    employeeId: "EMP-1042",
    department: "Engineering",
  },
  {
    id: "2",
    email: "jane@company.com",
    name: "Jane Smith",
    role: "manager",
    employeeId: "EMP-0089",
    department: "Operations",
  },
  {
    id: "3",
    email: "admin@company.com",
    name: "Admin User",
    role: "admin",
    employeeId: "EMP-0001",
    department: "IT",
  },
]

// Utility functions
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function getRoleBadge(role: string): string {
  switch (role) {
    case "manager":
      return "Manager"
    case "admin":
      return "Administrator"
    default:
      return "Employee"
  }
}

// Sums of already-rounded per-shift hours can still drift into long
// floating point tails (e.g. 0.1 + 0.2 -> 0.30000000000000004), which
// showed up on the dashboard as things like "0.0600000000000005h". Round
// the final summed value, not just the per-shift inputs.
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateWeeklyStats(history: TimeEntry[]) {
  return {
    regularHours: round2(history.reduce((sum, e) => sum + e.regularHours, 0)),
    overtimeHours: round2(history.reduce((sum, e) => sum + e.overtimeHours, 0)),
    totalHours: round2(history.reduce((sum, e) => sum + e.totalHours, 0)),
    daysLogged: history.length,
  }
}
