"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, StopCircle, Coffee, Soup, Timer } from "lucide-react"
import type { BreakEntry } from "@/lib/mock-data"

interface TimeClockProps {
  isClockedIn: boolean
  clockInTime: Date | null
  elapsedTime: string
  currentBreak: BreakEntry | null
  breakHistory: BreakEntry[]
  onClockIn: () => void
  onClockOut: () => void
  onStartBreak: (type: "lunch" | "short") => void
  onEndBreak: () => void
  disableClockIn?: boolean
}

export function TimeClock({
  isClockedIn,
  clockInTime,
  elapsedTime,
  currentBreak,
  breakHistory,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  disableClockIn = false,
}: TimeClockProps) {
  return (
    <Card className="h-full overflow-hidden border-border/60 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Timer className="h-5 w-5 text-primary" aria-hidden="true" />
          Time Clock
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-8 pt-2">
        {/* Status + Elapsed Time — unified hero panel */}
        <div
          className={`relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl border px-6 py-8 text-center transition-colors duration-300 sm:px-10 sm:py-10 ${
            isClockedIn
              ? "border-success/30 bg-gradient-to-b from-success/10 via-success/5 to-transparent"
              : "border-border bg-muted/30"
          }`}
        >
          {/* Status Indicator */}
          <div
            className="flex items-center gap-2.5"
            role="status"
            aria-live="polite"
            aria-label={isClockedIn ? "Currently working" : "Not clocked in"}
          >
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              {isClockedIn && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isClockedIn ? "bg-success" : "bg-muted-foreground/40"
                }`}
              />
            </span>
            <Badge
              variant={isClockedIn ? "default" : "secondary"}
              className={`px-3 py-1 text-xs font-medium tracking-wide ${
                isClockedIn ? "bg-success text-success-foreground" : ""
              }`}
            >
              {isClockedIn ? "Currently Working" : "Not Clocked In"}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {isClockedIn && clockInTime
              ? `Since ${clockInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
              : "Start your shift to begin tracking"}
          </p>

          {/* Elapsed Time Display */}
          <div aria-live="polite" aria-atomic="true">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Elapsed Time
            </p>
            <p
              className="mt-3 bg-gradient-to-b from-primary to-primary/70 bg-clip-text font-mono text-5xl font-semibold tracking-tight tabular-nums text-transparent sm:text-6xl"
              aria-label={`Elapsed time: ${elapsedTime}`}
            >
              {elapsedTime}
            </p>
          </div>
        </div>

        {/* Primary Action Controls */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={onClockIn}
            disabled={isClockedIn || disableClockIn}
            size="lg"
            className="h-14 flex-1 rounded-full bg-success text-base font-semibold text-success-foreground shadow-md shadow-success/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-success/90 hover:shadow-lg hover:shadow-success/30 active:translate-y-0 disabled:translate-y-0 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
            aria-label="Clock in to start your shift"
          >
            <PlayCircle className="mr-2 h-5 w-5" aria-hidden="true" />
            Clock In
          </Button>
          <Button
            onClick={onClockOut}
            disabled={!isClockedIn}
            size="lg"
            variant="destructive"
            className="h-14 flex-1 rounded-full text-base font-semibold shadow-md shadow-destructive/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-destructive/30 active:translate-y-0 disabled:translate-y-0 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
            aria-label="Clock out to end your shift"
          >
            <StopCircle className="mr-2 h-5 w-5" aria-hidden="true" />
            Clock Out
          </Button>
        </div>

        {/* Break Controls — secondary tier, visually distinct from primary actions */}
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Break Controls
          </p>

          {currentBreak ? (
            <div
              className="flex flex-col items-start justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 transition-all duration-300 sm:flex-row sm:items-center"
              role="alert"
              aria-label="Break in progress"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20">
                  <Coffee className="h-4 w-4 text-warning" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {currentBreak.type === "lunch" ? "Lunch Break" : "Short Break"} in progress
                  </p>
                  <p className="text-xs text-muted-foreground">Started at {currentBreak.startTime}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onEndBreak}
                aria-label="End current break"
                className="w-full rounded-full border-warning/40 hover:bg-warning/10 focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-auto"
              >
                End Break
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                disabled={!isClockedIn}
                onClick={() => onStartBreak("short")}
                className="h-11 flex-1 gap-2 rounded-full border-border/80 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Start a 20 minute short break"
              >
                <Coffee className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Short Break
              </Button>
              <Button
                variant="outline"
                disabled={!isClockedIn}
                onClick={() => onStartBreak("lunch")}
                className="h-11 flex-1 gap-2 rounded-full border-border/80 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Start a 30 minute lunch break"
              >
                <Soup className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Lunch Break
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
