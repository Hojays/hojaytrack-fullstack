// Database types for Supabase tables
export interface DbEmployee {
  id: string
  email: string
  name: string
  role: 'employee' | 'manager' | 'admin'
  employee_id: string
  department: string
  created_at: string
}

export interface DbTimeEntry {
  id: string
  employee_id: string
  clock_in: string
  clock_out: string | null
  date: string
  regular_hours: number
  overtime_hours: number
  total_hours: number
  status: 'active' | 'completed'
  created_at: string
}

export interface DbBreak {
  id: string
  time_entry_id: string
  start_time: string
  end_time: string | null
  duration_minutes: number
  break_type: 'lunch' | 'short' | 'other'
  created_at: string
}

export interface DbTimesheet {
  id: string
  employee_id: string
  employee_name: string
  period_start: string
  period_end: string
  total_hours: number
  regular_hours: number
  overtime_hours: number
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface DbOvertimeConfig {
  id: string
  daily_threshold: number
  weekly_threshold: number
  overtime_multiplier: number
  double_time_threshold: number
  double_time_multiplier: number
  max_weekly_hours: number
  weekend_overtime_enabled: boolean
  holiday_overtime_enabled: boolean
  require_manager_approval: boolean
  auto_approve_under_threshold: boolean
  updated_at: string
  updated_by: string | null
}

// Application types (transformed from DB types)
export interface User {
  id: string
  email: string
  name: string
  role: 'employee' | 'manager' | 'admin'
  employeeId: string
  department: string
}

export interface TimeEntry {
  id: string
  date: string
  clockIn: string
  clockOut: string
  regularHours: number
  overtimeHours: number
  totalHours: number
  status: 'completed' | 'active'
}

export interface Break {
  id: string
  startTime: string
  endTime: string | null
  duration: number
  type: 'lunch' | 'short' | 'other'
}

export interface Timesheet {
  id: string
  employeeId: string
  employeeName: string
  period: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}

export interface OvertimeConfig {
  dailyThreshold: number
  weeklyThreshold: number
  overtimeMultiplier: number
  doubleTimeThreshold: number
  doubleTimeMultiplier: number
  maxWeeklyHours: number
  weekendOvertimeEnabled: boolean
  holidayOvertimeEnabled: boolean
  requireManagerApproval: boolean
  autoApproveUnderThreshold: boolean
}

export interface WeeklyStats {
  regularHours: number
  overtimeHours: number
  totalHours: number
  daysWorked: number
}
