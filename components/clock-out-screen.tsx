"use client"

import { useState, useCallback } from "react"
import { Square, Coffee, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BreakEntry } from "@/lib/mock-data"

interface ClockOutScreenProps {
  clockInTime: Date
  elapsedTime: string
  currentBreak: BreakEntry | null
  onClockOut: () => void
  onStartBreak: (type: "lunch" | "short") => void
  onEndBreak: () => void
  onViewDashboard: () => void
}

export function ClockOutScreen({
  clockInTime,
  elapsedTime,
  currentBreak,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onViewDashboard,
}: ClockOutScreenProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicking, setIsClicking] = useState(false)

  const handleClick = useCallback(() => {
    setIsClicking(true)
    setTimeout(() => {
      onClockOut()
    }, 600)
  }, [onClockOut])

  const clockInFormatted = clockInTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 animate-in fade-in duration-500">

      {/* Thin top accent line */}
      <div className="fixed top-0 inset-x-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" aria-hidden="true" />

      {/* Branding — top left */}
      <div className="fixed top-5 left-6 flex items-center gap-2" aria-label="HojayTrack">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white"/>
            <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="8" y="8" width="5" height="5" rx="1" fill="white"/>
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">HojayTrack</span>
      </div>

      <main className="relative z-10 flex flex-col items-center gap-10 px-4 w-full max-w-sm">

        {/* Status indicator */}
        <div className="flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          <span className="text-sm text-slate-400 tracking-wide">Shift in progress</span>
        </div>

        {/* Elapsed time — the hero element */}
        <div className="text-center" aria-live="polite" aria-atomic="true">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 mb-3">
            Elapsed time
          </p>
          <p
            className="font-mono text-[4.5rem] font-light leading-none tracking-tight text-white tabular-nums"
            aria-label={`Elapsed time: ${elapsedTime}`}
          >
            {elapsedTime}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Clocked in at{" "}
            <span className="text-slate-300 font-medium">{clockInFormatted}</span>
          </p>
        </div>

        {/* Clock Out button — amber accent, not harsh */}
        <div className="flex flex-col items-center gap-5">
          <button
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isClicking}
            aria-label={isClicking ? "Clocking out, please wait" : "Clock out to end your shift"}
            className={`
              relative flex h-32 w-32 items-center justify-center rounded-full
              transition-all duration-300 ease-out
              focus:outline-none focus:ring-4 focus:ring-amber-500/40 focus:ring-offset-4 focus:ring-offset-slate-900
              ${isClicking
                ? "scale-95 bg-amber-500"
                : isHovered
                  ? "scale-105 bg-amber-500"
                  : "bg-amber-500/90"
              }
            `}
          >
            {/* Subtle outer ring */}
            <div
              className={`
                absolute inset-0 rounded-full border-2 transition-all duration-500
                ${isClicking
                  ? "border-amber-400/0 scale-125 opacity-0"
                  : isHovered
                    ? "border-amber-400/50 scale-105"
                    : "border-amber-400/25"
                }
              `}
              aria-hidden="true"
            />

            {/* Slow pulse ring — only when idle */}
            {!isClicking && !isHovered && (
              <div
                className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping"
                style={{ animationDuration: "2.5s" }}
                aria-hidden="true"
              />
            )}

            {/* Stop icon */}
            <Square
              className={`
                relative z-10 transition-all duration-300
                ${isClicking ? "h-11 w-11 scale-90 fill-white text-white" : "h-12 w-12 fill-white text-white"}
              `}
              aria-hidden="true"
            />
          </button>

          <div className="text-center">
            <p className="text-base font-semibold text-white" aria-live="polite">
              {isClicking ? "Saving your hours…" : "Clock Out"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isClicking ? "Just a moment" : "End shift and record your time"}
            </p>
          </div>
        </div>

        {/* Break controls */}
        <div className="w-full">
          {currentBreak ? (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                  <Coffee className="h-4 w-4" aria-hidden="true" />
                  {currentBreak.type === "lunch" ? "Lunch break" : "Short break"} in progress
                </div>
                <p className="text-xs text-slate-500 mt-1">Started at {currentBreak.startTime}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onEndBreak}
                className="border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
              >
                End break
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => onStartBreak("short")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
              >
                <Coffee className="h-4 w-4" aria-hidden="true" />
                Short break
              </button>
              <button
                onClick={() => onStartBreak("lunch")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
              >
                <Coffee className="h-4 w-4" aria-hidden="true" />
                Lunch break
              </button>
            </div>
          )}
        </div>

        {/* View dashboard */}
        <button
          onClick={onViewDashboard}
          className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-600 rounded-md px-2 py-1"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          View dashboard
        </button>

      </main>
    </div>
  )
}
