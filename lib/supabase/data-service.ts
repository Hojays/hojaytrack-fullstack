import { createClient } from '@/lib/supabase/client'
import type { 
  User, 
  TimeEntry, 
  Break, 
  Timesheet, 
  OvertimeConfig,
  WeeklyStats,
  DbEmployee,
  DbTimeEntry,
  DbBreak,
  DbTimesheet,
  DbOvertimeConfig
} from '@/lib/supabase/types'

// Re-export types for convenience
export type { User, TimeEntry, Break, Timesheet, OvertimeConfig, WeeklyStats }

// Transform functions
function transformEmployee(db: DbEmployee): User {
  return {
    id: db.id,
    email: db.email,
    name: db.name,
    role: db.role,
    employeeId: db.employee_id,
    department: db.department,
  }
}

function transformTimeEntry(db: DbTimeEntry): TimeEntry {
  return {
    id: db.id,
    date: db.date,
    clockIn: db.clock_in,
    clockOut: db.clock_out || '',
    regularHours: db.regular_hours,
    overtimeHours: db.overtime_hours,
    totalHours: db.total_hours,
    status: db.status,
  }
}

function transformBreak(db: DbBreak): Break {
  return {
    id: db.id,
    startTime: db.start_time,
    endTime: db.end_time,
    duration: db.duration_minutes,
    type: db.break_type,
  }
}

function transformTimesheet(db: DbTimesheet): Timesheet {
  return {
    id: db.id,
    employeeId: db.employee_id,
    employeeName: db.employee_name,
    period: `${db.period_start} - ${db.period_end}`,
    totalHours: db.total_hours,
    regularHours: db.regular_hours,
    overtimeHours: db.overtime_hours,
    status: db.status,
    submittedAt: db.submitted_at,
  }
}

function transformOvertimeConfig(db: DbOvertimeConfig): OvertimeConfig {
  return {
    dailyThreshold: db.daily_threshold,
    weeklyThreshold: db.weekly_threshold,
    overtimeMultiplier: db.overtime_multiplier,
    doubleTimeThreshold: db.double_time_threshold,
    doubleTimeMultiplier: db.double_time_multiplier,
    maxWeeklyHours: db.max_weekly_hours,
    weekendOvertimeEnabled: db.weekend_overtime_enabled,
    holidayOvertimeEnabled: db.holiday_overtime_enabled,
    requireManagerApproval: db.require_manager_approval,
    autoApproveUnderThreshold: db.auto_approve_under_threshold,
  }
}

// Data service functions
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error || !data.user) {
    console.error('Authentication error:', error?.message)
    return null
  }
  
  // Fetch employee profile
  const { data: employee, error: profileError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', data.user.id)
    .single()
  
  if (profileError || !employee) {
    console.error('Profile fetch error:', profileError?.message)
    return null
  }
  
  return transformEmployee(employee as DbEmployee)
}

export async function signOutUser(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (!employee) return null
  
  return transformEmployee(employee as DbEmployee)
}

// Time entries
export async function getTimeEntries(employeeId: string): Promise<TimeEntry[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching time entries:', error.message)
    return []
  }
  
  return (data as DbTimeEntry[]).map(transformTimeEntry)
}

export async function clockIn(employeeId: string): Promise<TimeEntry | null> {
  const supabase = createClient()
  const now = new Date()
  
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      employee_id: employeeId,
      clock_in: now.toISOString(),
      date: now.toISOString().split('T')[0],
      status: 'active',
      regular_hours: 0,
      overtime_hours: 0,
      total_hours: 0,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error clocking in:', error.message)
    return null
  }
  
  return transformTimeEntry(data as DbTimeEntry)
}

export async function clockOut(entryId: string, totalHours: number): Promise<TimeEntry | null> {
  const supabase = createClient()
  const now = new Date()
  
  // Calculate regular and overtime hours (8 hour threshold)
  const regularHours = Math.min(totalHours, 8)
  const overtimeHours = Math.max(0, totalHours - 8)
  
  const { data, error } = await supabase
    .from('time_entries')
    .update({
      clock_out: now.toISOString(),
      status: 'completed',
      total_hours: totalHours,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
    })
    .eq('id', entryId)
    .select()
    .single()
  
  if (error) {
    console.error('Error clocking out:', error.message)
    return null
  }
  
  return transformTimeEntry(data as DbTimeEntry)
}

export async function getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .single()
  
  if (error || !data) {
    return null
  }
  
  return transformTimeEntry(data as DbTimeEntry)
}

// Breaks
export async function getBreaks(timeEntryId: string): Promise<Break[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .eq('time_entry_id', timeEntryId)
    .order('start_time', { ascending: false })
  
  if (error) {
    console.error('Error fetching breaks:', error.message)
    return []
  }
  
  return (data as DbBreak[]).map(transformBreak)
}

export async function startBreak(timeEntryId: string, breakType: 'lunch' | 'short' | 'other'): Promise<Break | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('breaks')
    .insert({
      time_entry_id: timeEntryId,
      start_time: new Date().toISOString(),
      break_type: breakType,
      duration_minutes: 0,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error starting break:', error.message)
    return null
  }
  
  return transformBreak(data as DbBreak)
}

export async function endBreak(breakId: string): Promise<Break | null> {
  const supabase = createClient()
  const now = new Date()
  
  // First get the break to calculate duration
  const { data: existingBreak } = await supabase
    .from('breaks')
    .select('start_time')
    .eq('id', breakId)
    .single()
  
  if (!existingBreak) return null
  
  const startTime = new Date(existingBreak.start_time)
  const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000)
  
  const { data, error } = await supabase
    .from('breaks')
    .update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', breakId)
    .select()
    .single()
  
  if (error) {
    console.error('Error ending break:', error.message)
    return null
  }
  
  return transformBreak(data as DbBreak)
}

// Weekly stats
export async function getWeeklyStats(employeeId: string): Promise<WeeklyStats> {
  const supabase = createClient()
  
  // Get start of current week (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - diff)
  weekStart.setHours(0, 0, 0, 0)
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('regular_hours, overtime_hours, total_hours')
    .eq('employee_id', employeeId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .eq('status', 'completed')
  
  if (error || !data) {
    return { regularHours: 0, overtimeHours: 0, totalHours: 0, daysWorked: 0 }
  }
  
  const stats = data.reduce(
    (acc, entry) => ({
      regularHours: acc.regularHours + (entry.regular_hours || 0),
      overtimeHours: acc.overtimeHours + (entry.overtime_hours || 0),
      totalHours: acc.totalHours + (entry.total_hours || 0),
      daysWorked: acc.daysWorked + 1,
    }),
    { regularHours: 0, overtimeHours: 0, totalHours: 0, daysWorked: 0 }
  )
  
  return stats
}

// Timesheets (for managers)
export async function getPendingTimesheets(): Promise<Timesheet[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('timesheets')
    .select('*')
    .order('submitted_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching timesheets:', error.message)
    return []
  }
  
  return (data as DbTimesheet[]).map(transformTimesheet)
}

export async function approveTimesheet(timesheetId: string, reviewerId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('timesheets')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', timesheetId)
  
  if (error) {
    console.error('Error approving timesheet:', error.message)
    return false
  }
  
  return true
}

export async function rejectTimesheet(timesheetId: string, reviewerId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('timesheets')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', timesheetId)
  
  if (error) {
    console.error('Error rejecting timesheet:', error.message)
    return false
  }
  
  return true
}

// Overtime configuration (for admins)
export async function getOvertimeConfig(): Promise<OvertimeConfig> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('overtime_config')
    .select('*')
    .single()
  
  if (error || !data) {
    // Return defaults if no config exists
    return {
      dailyThreshold: 8,
      weeklyThreshold: 40,
      overtimeMultiplier: 1.5,
      doubleTimeThreshold: 12,
      doubleTimeMultiplier: 2.0,
      maxWeeklyHours: 60,
      weekendOvertimeEnabled: true,
      holidayOvertimeEnabled: true,
      requireManagerApproval: true,
      autoApproveUnderThreshold: false,
    }
  }
  
  return transformOvertimeConfig(data as DbOvertimeConfig)
}

export async function updateOvertimeConfig(config: Partial<OvertimeConfig>, updatedBy: string): Promise<boolean> {
  const supabase = createClient()
  
  const dbConfig: Partial<DbOvertimeConfig> = {
    daily_threshold: config.dailyThreshold,
    weekly_threshold: config.weeklyThreshold,
    overtime_multiplier: config.overtimeMultiplier,
    double_time_threshold: config.doubleTimeThreshold,
    double_time_multiplier: config.doubleTimeMultiplier,
    max_weekly_hours: config.maxWeeklyHours,
    weekend_overtime_enabled: config.weekendOvertimeEnabled,
    holiday_overtime_enabled: config.holidayOvertimeEnabled,
    require_manager_approval: config.requireManagerApproval,
    auto_approve_under_threshold: config.autoApproveUnderThreshold,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }
  
  // Remove undefined values
  Object.keys(dbConfig).forEach(key => {
    if (dbConfig[key as keyof typeof dbConfig] === undefined) {
      delete dbConfig[key as keyof typeof dbConfig]
    }
  })
  
  const { error } = await supabase
    .from('overtime_config')
    .update(dbConfig)
    .eq('id', 1) // Assuming single config row
  
  if (error) {
    console.error('Error updating overtime config:', error.message)
    return false
  }
  
  return true
}

// Utility functions
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function getRoleBadge(role: string): string {
  switch (role) {
    case 'manager':
      return 'Manager'
    case 'admin':
      return 'Administrator'
    default:
      return 'Employee'
  }
}
