"use client"

import { useState, useEffect } from "react"
import { Power, LayoutDashboard, Target, CalendarClock, TrendingUp } from "lucide-react"
import { type User } from "@/lib/mock-data"

interface ClockInScreenProps {
  user: User
  onClockIn: () => void
  onViewDashboard: () => void
}

export function ClockInScreen({ user, onClockIn, onViewDashboard }: ClockInScreenProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      )
      setCurrentDate(
        new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const [weeklyTarget, setWeeklyTarget] = useState(40)
  const [loggedThisWeek, setLoggedThisWeek] = useState(0)
  const [remaining, setRemaining] = useState(40)

  // Pull live weekly numbers from the backend instead of mock data. This
  // mirrors exactly what /weekly-summary computes: Weekly Target comes from
  // admin_settings (defaulting to 40h), Logged This Week sums this week's
  // completed regular + overtime hours, and Remaining is the difference,
  // floored at 0.
  useEffect(() => {
    const API_BASE = "/api"
    fetch(`${API_BASE}/weekly-summary`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWeeklyTarget(data.weeklyTarget)
          setLoggedThisWeek(data.loggedThisWeek)
          setRemaining(data.remaining)
        }
      })
      .catch(() => {
        // Backend unreachable — keep the safe defaults (40 / 0 / 40) rather
        // than showing stale mock numbers
      })
  }, [])

  const handleClick = () => {
    setIsClicking(true)
    setTimeout(() => {
      onClockIn()
    }, 600)
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const progressPct = weeklyTarget > 0 ? Math.min(100, (loggedThisWeek / weeklyTarget) * 100) : 0

  return (
    <div className="flex h-screen max-h-screen flex-col items-center justify-center overflow-hidden bg-slate-900 animate-in fade-in duration-500">
      {/* Subtle ambient glow, matching the clock-out screen's dark palette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 18% 30%, rgba(37,99,235,0.08) 0%, transparent 70%), radial-gradient(45% 40% at 85% 70%, rgba(16,185,129,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 grid w-full max-w-5xl grid-cols-1 items-center gap-6 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-10">
        {/* Left panel — identity, clock, primary action */}
        <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
              style={{ background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)" }}
              aria-hidden="true"
            >
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">HojayTrack</h1>
              <p className="text-xs font-medium text-white">Enterprise Portal</p>
            </div>
          </div>

          {/* Welcome Message */}
          <div>
            <p className="text-base text-white">Welcome back,</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{user.name}</h2>
            <p className="mt-1.5 text-sm font-medium text-white">
              {user.employeeId} <span className="mx-1.5 text-white">|</span> {user.department}
            </p>
          </div>

          {/* Current Time */}
          <div aria-live="polite" aria-atomic="true">
            <time className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              {currentTime}
            </time>
            <p className="mt-1.5 text-sm font-medium text-white">{currentDate}</p>
          </div>

          {/* Power Button — premium focal point */}
          <div className="mt-2 flex flex-col items-center gap-3 lg:items-start">
            <button
              onClick={handleClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={isClicking}
              aria-label={isClicking ? "Clocking in, please wait" : "Clock in to start your shift"}
              className={`
                group relative flex h-28 w-28 items-center justify-center rounded-full
                transition-all duration-300 ease-out
                focus:outline-none focus:ring-4 focus:ring-emerald-400/40 focus:ring-offset-4 focus:ring-offset-slate-900
                ${isClicking ? "scale-95" : isHovered ? "scale-105" : ""}
              `}
              style={{
                background: "linear-gradient(160deg, #34D399 0%, #10B981 55%, #059669 100%)",
                boxShadow: isHovered || isClicking
                  ? "0 12px 32px -6px rgba(16,185,129,0.55), 0 0 0 8px rgba(16,185,129,0.08)"
                  : "0 8px 24px -8px rgba(16,185,129,0.45), 0 0 0 6px rgba(16,185,129,0.06)",
              }}
            >
              {/* Inner highlight ring for depth */}
              <div
                className="absolute inset-1.5 rounded-full"
                style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.25), transparent 60%)" }}
                aria-hidden="true"
              />

              <Power
                className={`
                  relative z-10 h-12 w-12 text-white drop-shadow-sm transition-all duration-300
                  ${isClicking ? "scale-90" : isHovered ? "scale-110" : ""}
                `}
                strokeWidth={2.5}
                aria-hidden="true"
              />

              {!isClicking && (
                <span
                  className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30"
                  style={{ animationDuration: "2s" }}
                  aria-hidden="true"
                />
              )}
            </button>

            <div>
              <p className="text-base font-semibold text-white" aria-live="polite">
                {isClicking ? "Clocking In..." : "Clock In to Start Your Shift"}
              </p>
              <p className="mt-1 text-xs font-medium text-white">
                Tap the button above to begin tracking your hours
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — weekly stats */}
        <div
          className="flex flex-col gap-5 rounded-3xl border border-slate-600 bg-slate-800 p-6 sm:p-7"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 12px 32px -12px rgba(0,0,0,0.4)" }}
          role="region"
          aria-label="Weekly hours summary"
        >
          <div>
            <p className="text-sm font-bold text-white">This Week</p>
            <p className="text-xs font-medium text-white">Live progress toward your weekly target</p>
          </div>

          {/* Progress bar — bordered outer wrapper + bright green fill */}
          <div>
            <div className="relative h-4 w-full overflow-hidden rounded-full border border-slate-500 bg-slate-700">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(progressPct, 1.5)}%`,
                  background: "linear-gradient(90deg, #6EE7B7, #10B981, #059669)",
                  boxShadow: "0 0 10px rgba(52,211,153,0.8), 0 0 20px rgba(16,185,129,0.5)",
                }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-white">
              {progressPct.toFixed(0)}% of your {weeklyTarget}h target logged
            </p>
          </div>

          {/* Stat cards grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-600 bg-slate-700/80 px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-slate-500 sm:col-span-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                <Target className="h-4 w-4 text-blue-300" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-white">{weeklyTarget}h</p>
              <p className="text-xs font-semibold text-white">Weekly Target</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-600 bg-slate-700/80 px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-slate-500 sm:col-span-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                <CalendarClock className="h-4 w-4 text-blue-300" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-white">{loggedThisWeek}h</p>
              <p className="text-xs font-semibold text-white">Logged This Week</p>
            </div>
            <div className="col-span-2 flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400/60 sm:col-span-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/30">
                <TrendingUp className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-emerald-300">{remaining.toFixed(1)}h</p>
              <p className="text-xs font-semibold text-white">Remaining</p>
            </div>
          </div>

          {/* View dashboard */}
          <button
            onClick={onViewDashboard}
            className="mt-1 flex items-center justify-center gap-2 rounded-full border border-slate-500 bg-slate-700 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            View dashboard
          </button>
        </div>
      </main>
    </div>
  )
}
