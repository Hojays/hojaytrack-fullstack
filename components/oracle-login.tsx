"use client"

import { useState } from "react"
import { type User } from "@/lib/mock-data"

const API_BASE = "/api"

interface OracleLoginProps {
  onLogin: (user: User) => void
}

export function OracleLogin({ onLogin }: OracleLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials: "include" is required so the browser sends/stores the
        // HTTP-only session cookie the backend sets on a successful login.
        credentials: "include",
        body: JSON.stringify({ email: username.trim().toLowerCase(), password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error ?? "Invalid email or password.")
        setIsLoading(false)
        return
      }

      const user: User = {
        id: data.user.email,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        department: data.user.department ?? "",
        employeeId: data.user.employeeId ?? "",
        avatar: null,
      }

      onLogin(user)
    } catch {
      setError(`Could not reach the server at ${API_BASE}. Make sure the Python backend is running.`)
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setUsername("")
    setPassword("")
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#3a6080" }}>
      {/* Oracle Logo */}
      <header className="p-6">
        <span
          className="text-white text-2xl tracking-tight"
          style={{ fontFamily: "Times New Roman, serif", fontStyle: "italic" }}
          aria-label="Oracle"
        >
          ORACLE<sup className="text-xs" aria-hidden="true">®</sup>
        </span>
      </header>

      {/* Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div
          className="w-full max-w-md p-8"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          <h1
            className="text-white text-xl mb-6 text-center"
            style={{ fontFamily: "Times New Roman, serif" }}
          >
            Employee Hours Tracking Portal
          </h1>

          <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
            {/* Username Field */}
            <div className="space-y-1">
              <label htmlFor="username" className="block text-white text-sm mb-1">User Name</label>
              <input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-white text-black border-none outline-none text-sm focus:ring-2 focus:ring-blue-400"
                style={{ borderRadius: 0 }}
                placeholder="Enter your email"
                disabled={isLoading}
                autoComplete="email"
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-white text-sm mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white text-black border-none outline-none text-sm focus:ring-2 focus:ring-blue-400"
                style={{ borderRadius: 0 }}
                placeholder="Enter any password"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div 
                id="login-error" 
                className="text-red-300 text-xs bg-red-900/30 p-2 rounded" 
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm transition-colors disabled:opacity-50 hover:brightness-95 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                style={{
                  backgroundColor: "#d4d4d4",
                  border: "1px solid #888",
                  color: "#333",
                  borderRadius: 0,
                }}
                aria-label={isLoading ? "Logging in, please wait" : "Log in to your account"}
              >
                {isLoading ? "Logging In..." : "Log In"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm transition-colors disabled:opacity-50 hover:brightness-95 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                style={{
                  backgroundColor: "#d4d4d4",
                  border: "1px solid #888",
                  color: "#333",
                  borderRadius: 0,
                }}
                aria-label="Clear form fields"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Navigation Links */}
          <div className="flex justify-center gap-6 mt-6">
            <button 
              className="text-white text-sm underline hover:text-blue-200 transition-colors focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent"
              type="button"
            >
              Login Assistance
            </button>
            <button 
              className="text-white text-sm underline hover:text-blue-200 transition-colors focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent"
              type="button"
            >
              Register Here
            </button>
          </div>

          {/* Dropdowns */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1">
              <label htmlFor="accessibility" className="block text-white text-xs mb-1">Accessibility</label>
              <select
                id="accessibility"
                className="w-full px-2 py-1.5 bg-white text-black text-sm outline-none focus:ring-2 focus:ring-blue-400"
                style={{ borderRadius: 0 }}
              >
                <option>None</option>
                <option>Screen Reader</option>
                <option>High Contrast</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="language" className="block text-white text-xs mb-1">Language</label>
              <select
                id="language"
                className="w-full px-2 py-1.5 bg-white text-black text-sm outline-none focus:ring-2 focus:ring-blue-400"
                style={{ borderRadius: 0 }}
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
          </div>

          {/* Demo Credentials */}
          <div 
            className="mt-8 p-3" 
            style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            aria-label="Demo login credentials"
          >
            <p className="text-white/70 text-xs text-center mb-2">Demo Credentials:</p>
            <div className="text-white/60 text-xs space-y-1">
              <p><span className="text-white/80">Employee:</span> jerry@company.com / mysecurepassword</p>
              <p><span className="text-white/80">Manager:</span> jane@company.com / managerpassword</p>
              <p><span className="text-white/80">Admin:</span> admin@company.com / adminpassword</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-white/50 text-xs">
          Copyright © 2024 Oracle Corporation. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
