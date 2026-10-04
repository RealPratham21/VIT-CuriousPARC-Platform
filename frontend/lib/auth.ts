export const API_BASE = "/api/v1"

export type StaffRole =
  | "viewer"
  | "checkin_volunteer"
  | "coordinator"
  | "evaluator"
  | "lead"
  | "admin"

export type StaffUser = {
  id: string
  staff_code: string
  full_name: string
  email: string | null
  phone_e164: string | null
  is_active: boolean
  roles: Array<{
    event_id: string
    event_slug: string
    role: StaffRole
  }>
}

export type AuthSession = {
  access_token: string
  token_type: "bearer"
  expires_in: number
  user: StaffUser
}

export const EVENT_SLUG = "curiousparc-2026"

const ROLE_LABELS: Record<StaffRole, string> = {
  viewer: "Viewer",
  checkin_volunteer: "Check-in",
  coordinator: "Coordinator",
  evaluator: "Evaluator",
  lead: "Lead",
  admin: "Admin",
}

const ROLE_RANK: StaffRole[] = [
  "viewer",
  "checkin_volunteer",
  "coordinator",
  "evaluator",
  "lead",
  "admin",
]

let accessToken: string | null = null
let refreshInFlight: Promise<AuthSession | null> | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function roleLabel(role: StaffRole) {
  return ROLE_LABELS[role]
}

export function primaryRole(user: StaffUser, eventSlug = EVENT_SLUG) {
  const roles = user.roles
    .filter((role) => role.event_slug === eventSlug)
    .map((role) => role.role)
  if (roles.length === 0) return null
  return roles.sort((left, right) => ROLE_RANK.indexOf(right) - ROLE_RANK.indexOf(left))[0]
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

async function errorMessage(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === "string") return body.detail
    if (Array.isArray(body.detail)) {
      const first = body.detail[0] as { msg?: unknown } | undefined
      if (typeof first?.msg === "string") return first.msg
    }
  } catch {
    return "Could not reach the operations API."
  }
  return "Could not sign in. Try again."
}

async function authRequest(path: string, init?: RequestInit) {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new AuthError("Could not reach the operations API.", 0)
  }
  return response
}

export async function loginRequest(staffCode: string, password: string) {
  const response = await authRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ staff_code: staffCode, password }),
  })
  if (!response.ok) throw new AuthError(await errorMessage(response), response.status)
  const session = (await response.json()) as AuthSession
  setAccessToken(session.access_token)
  return session
}

export async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = refreshRequest().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function refreshRequest() {
  const response = await authRequest("/auth/refresh", { method: "POST" })
  if (response.status === 401) {
    setAccessToken(null)
    return null
  }
  if (!response.ok) throw new AuthError(await errorMessage(response), response.status)
  const session = (await response.json()) as AuthSession
  setAccessToken(session.access_token)
  return session
}

export async function logoutRequest() {
  try {
    await authRequest("/auth/logout", { method: "POST" })
  } finally {
    setAccessToken(null)
  }
}

export async function authorizedFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  const token = getAccessToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  })
}
