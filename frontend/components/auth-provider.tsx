"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

import {
  type AuthSession,
  type StaffUser,
  loginRequest,
  logoutRequest,
  refreshSession,
  setAccessToken,
} from "@/lib/auth"

type AuthStatus = "loading" | "ready"

type AuthContextValue = {
  user: StaffUser | null
  status: AuthStatus
  login: (staffCode: string, password: string) => Promise<StaffUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const timer = useRef<number | null>(null)
  const applySession = useRef<(session: AuthSession | null) => void>(() => {})

  applySession.current = (session) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (!session) {
      setAccessToken(null)
      setUser(null)
      setStatus("ready")
      return
    }
    setAccessToken(session.access_token)
    setUser(session.user)
    setStatus("ready")
    const delay = Math.max((session.expires_in - 30) * 1000, 5000)
    timer.current = window.setTimeout(() => {
      refreshSession()
        .then((next) => applySession.current(next))
        .catch(() => applySession.current(null))
    }, delay)
  }

  useEffect(() => {
    let active = true
    refreshSession()
      .then((session) => {
        if (active) applySession.current(session)
      })
      .catch(() => {
        if (active) applySession.current(null)
      })
    return () => {
      active = false
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  async function login(staffCode: string, password: string) {
    const session = await loginRequest(staffCode, password)
    applySession.current(session)
    return session.user
  }

  async function logout() {
    await logoutRequest()
    applySession.current(null)
  }

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AuthProvider")
  return value
}
