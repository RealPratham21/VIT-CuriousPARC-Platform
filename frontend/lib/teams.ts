import { authorizedFetch, EVENT_SLUG, refreshSession, type StaffRole, type StaffUser } from "@/lib/auth"

export const TEAM_PAGE_SIZE = 10

export type EvaluationStatus =
  | "unassigned"
  | "queued"
  | "called"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled"

export type TrackRef = {
  id: string
  code: string
  name: string
  description: string | null
}

export type RoomRef = {
  id: string
  code: string
  floor: string
}

export type TeamSummary = {
  id: string
  team_code: string
  name: string
  track: TrackRef
  member_count: number
  attendance: {
    status: "not_arrived" | "partial" | "checked_in"
    checked_in: number
    expected: number
  }
  room: RoomRef | null
  evaluation: {
    id: string
    status: EvaluationStatus
    queue_position: number | null
    panel: { id: string; name: string } | null
    room: RoomRef | null
    public_note: string | null
    called_at: string | null
    started_at: string | null
    completed_at: string | null
    version: number
  } | null
}

export type TeamDetail = TeamSummary & {
  timeline: Array<{
    id: string
    event_type: string
    title: string
    description: string
    created_at: string
  }>
}

export type TeamPage = {
  items: TeamSummary[]
  page: number
  page_size: number
  total: number
}

export type TeamRegistration = {
  team_code: string
  name: string
  track_id: string
  leader_name: string
  expected_member_count?: number
  leader_phone_e164?: string
  leader_email?: string
}

const WRITER_ROLES = new Set<StaffRole>(["coordinator", "lead", "admin"])

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  unassigned: "Unassigned",
  queued: "Awaiting",
  called: "Awaiting",
  in_progress: "In progress",
  completed: "Evaluated",
  no_show: "No show",
  cancelled: "Cancelled",
}

export const STATUS_FILTERS: Array<{ value: EvaluationStatus; label: string }> = [
  { value: "unassigned", label: "Unassigned" },
  { value: "queued", label: "Queued" },
  { value: "called", label: "Called" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Evaluated" },
  { value: "no_show", label: "No show" },
  { value: "cancelled", label: "Cancelled" },
]

export function evaluationLabel(status: EvaluationStatus | null) {
  if (!status) return "Not scheduled"
  return STATUS_LABELS[status]
}

export function evaluationTone(status: EvaluationStatus | null) {
  if (status === "completed") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
  if (status === "in_progress") return "border-blue-500/20 bg-blue-500/10 text-blue-400"
  if (status === "queued" || status === "called") return "border-amber-500/20 bg-amber-500/10 text-amber-400"
  if (status === "no_show") return "border-rose-500/20 bg-rose-500/10 text-rose-400"
  return "border-border text-muted-foreground"
}

export function canRegisterTeam(user: StaffUser | null) {
  if (!user) return false
  return user.roles.some((role) => role.event_slug === EVENT_SLUG && WRITER_ROLES.has(role.role))
}

export function eventIdForUser(user: StaffUser | null) {
  return user?.roles.find((role) => role.event_slug === EVENT_SLUG)?.event_id ?? null
}

export function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value))
}

async function readError(response: Response, fallback: string) {
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
  return fallback
}

async function publicGet<T>(path: string) {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, { headers: { Accept: "application/json" } })
  } catch {
    throw new Error("Could not reach the operations API.")
  }
  if (!response.ok) throw new Error(await readError(response, "Could not load teams."))
  return (await response.json()) as T
}

export function listTeams(params: { q?: string; evaluationStatus?: EvaluationStatus | ""; page: number }) {
  const search = new URLSearchParams({
    page: String(params.page),
    page_size: String(TEAM_PAGE_SIZE),
  })
  if (params.q) search.set("q", params.q)
  if (params.evaluationStatus) search.set("evaluation_status", params.evaluationStatus)
  return publicGet<TeamPage>(`/public/events/${EVENT_SLUG}/teams?${search.toString()}`)
}

export function getTeam(teamId: string) {
  return publicGet<TeamDetail>(`/public/events/${EVENT_SLUG}/teams/${teamId}`)
}

export function listTracks() {
  return publicGet<TrackRef[]>(`/public/events/${EVENT_SLUG}/tracks`)
}

async function staffSend(path: string, init: RequestInit) {
  let response = await authorizedFetch(path, init)
  if (response.status === 401) {
    const session = await refreshSession()
    if (!session) throw new Error("Sign in again to register a team.")
    response = await authorizedFetch(path, init)
  }
  return response
}

export async function registerTeam(eventId: string, payload: TeamRegistration) {
  let response: Response
  try {
    response = await staffSend(`/staff/events/${eventId}/teams`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Sign in again to register a team.") throw error
    throw new Error("Could not reach the operations API.")
  }
  if (!response.ok) throw new Error(await readError(response, "Could not register the team."))
  return (await response.json()) as TeamSummary
}
