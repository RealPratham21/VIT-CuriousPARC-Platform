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

export type TeamMemberRecord = {
  id: string
  full_name: string
  phone_e164: string | null
  email: string | null
  is_leader: boolean
  is_active: boolean
  attendance_status: "not_checked_in" | "checked_in"
}

export type TeamStaff = TeamSummary & {
  registration_status: string
  expected_member_count: number | null
  version: number
  members: TeamMemberRecord[]
}

export type RoomOption = {
  id: string
  code: string
  floor: string
}

export type PanelOption = {
  id: string
  name: string
  is_active: boolean
}

export type LiveRound = {
  id: string
  code: string
  name: string
  status: "scheduled" | "live" | "closed"
}

export type EvaluationAction = "call" | "start" | "complete" | "no-show" | "cancel"

const WRITER_ROLES = new Set<StaffRole>(["coordinator", "lead", "admin"])
const CHECKIN_ROLES = new Set<StaffRole>(["checkin_volunteer", "coordinator", "lead", "admin"])
const EVALUATION_ROLES = new Set<StaffRole>(["evaluator", "coordinator", "lead", "admin"])
const ANNOUNCE_ROLES = new Set<StaffRole>(["lead", "admin"])

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

function hasEventRole(user: StaffUser | null, roles: Set<StaffRole>) {
  if (!user) return false
  return user.roles.some((role) => role.event_slug === EVENT_SLUG && roles.has(role.role))
}

export function canRegisterTeam(user: StaffUser | null) {
  return hasEventRole(user, WRITER_ROLES)
}

export function canAssignRoom(user: StaffUser | null) {
  return hasEventRole(user, WRITER_ROLES)
}

export function canCheckInTeam(user: StaffUser | null) {
  return hasEventRole(user, CHECKIN_ROLES)
}

export function canUpdateEvaluation(user: StaffUser | null) {
  return hasEventRole(user, EVALUATION_ROLES)
}

export function comparePanelNames(left: string, right: string) {
  const leftNumber = Number(left.match(/\d+/)?.[0])
  const rightNumber = Number(right.match(/\d+/)?.[0])
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }
  return left.localeCompare(right)
}

export function canPublishAnnouncement(user: StaffUser | null) {
  return hasEventRole(user, ANNOUNCE_ROLES)
}

export function canControlRound(user: StaffUser | null) {
  return hasEventRole(user, ANNOUNCE_ROLES)
}

export function canManageTeam(user: StaffUser | null) {
  return canRegisterTeam(user) || canCheckInTeam(user) || canUpdateEvaluation(user)
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

export function listRooms() {
  return publicGet<RoomOption[]>(`/public/events/${EVENT_SLUG}/rooms`)
}

export function currentRound() {
  return publicGet<LiveRound | null>(`/public/events/${EVENT_SLUG}/rounds/current`)
}

async function staffSend(path: string, init: RequestInit) {
  let response = await authorizedFetch(path, init)
  if (response.status === 401) {
    const session = await refreshSession()
    if (!session) throw new Error("Sign in again to continue.")
    response = await authorizedFetch(path, init)
  }
  return response
}

export async function staffRequest<T>(path: string, init: RequestInit, fallback: string) {
  let response: Response
  try {
    response = await staffSend(path, init)
  } catch (error) {
    if (error instanceof Error && error.message === "Sign in again to continue.") throw error
    throw new Error("Could not reach the operations API.")
  }
  if (!response.ok) throw new Error(await readError(response, fallback))
  return (await response.json()) as T
}

export function registerTeam(eventId: string, payload: TeamRegistration) {
  return staffRequest<TeamStaff>(`/staff/events/${eventId}/teams`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, "Could not register the team.")
}

export function getStaffTeam(eventId: string, teamId: string) {
  return staffRequest<TeamStaff>(`/staff/events/${eventId}/teams/${teamId}`, { method: "GET" }, "Could not load this team.")
}

export function addTeamMember(
  eventId: string,
  teamId: string,
  payload: { full_name: string; phone_e164?: string; email?: string },
) {
  return staffRequest<TeamMemberRecord>(`/staff/events/${eventId}/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ ...payload, is_leader: false }),
  }, "Could not add that member.")
}

export function checkInMember(eventId: string, memberId: string) {
  return staffRequest<TeamMemberRecord>(`/staff/events/${eventId}/members/${memberId}/check-in`, {
    method: "PUT",
    body: JSON.stringify({}),
  }, "Could not check in that member.")
}

export function revokeCheckIn(eventId: string, memberId: string) {
  return staffRequest<TeamMemberRecord>(`/staff/events/${eventId}/members/${memberId}/check-in`, {
    method: "DELETE",
    body: JSON.stringify({}),
  }, "Could not undo that check-in.")
}

export function assignTeamRoom(eventId: string, teamId: string, roomId: string) {
  return staffRequest<TeamStaff>(`/staff/events/${eventId}/teams/${teamId}/room-assignment`, {
    method: "POST",
    body: JSON.stringify({ room_id: roomId }),
  }, "Could not assign that room.")
}

export function listPanels(eventId: string) {
  return staffRequest<PanelOption[]>(`/staff/events/${eventId}/panels`, { method: "GET" }, "Could not load judging panels.")
}

export function scheduleEvaluation(
  eventId: string,
  roundId: string,
  payload: { team_id: string; panel_id: string; queue_position: number; room_id?: string },
) {
  return staffRequest(`/staff/events/${eventId}/rounds/${roundId}/evaluations`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, "Could not schedule the evaluation.")
}

export function transitionEvaluation(
  eventId: string,
  evaluationId: string,
  action: EvaluationAction,
  expectedVersion: number,
) {
  return staffRequest(`/staff/events/${eventId}/evaluations/${evaluationId}/${action}`, {
    method: "POST",
    body: JSON.stringify({ expected_version: expectedVersion }),
  }, "Could not update the evaluation.")
}

export function publishAnnouncement(eventId: string, payload: { title: string; message: string }) {
  return staffRequest(`/staff/events/${eventId}/announcements`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      message: payload.message,
      audience: "all",
      publish_now: true,
    }),
  }, "Could not publish the announcement.")
}
