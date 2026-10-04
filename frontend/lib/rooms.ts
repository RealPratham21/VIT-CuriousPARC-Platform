import { EVENT_SLUG } from "@/lib/auth"

export type RoomOfficial = {
  id: string
  full_name: string
  roles: string[]
  rooms: Array<{ id: string; code: string; floor: string }>
  managed_team_count: number
}

export type RoomTeam = {
  id: string
  team_code: string
  name: string
  member_count: number
  attendance: {
    status: "not_arrived" | "partial" | "checked_in"
    checked_in: number
    expected: number
  }
  room: { id: string; code: string; floor: string } | null
  evaluation: {
    status: "unassigned" | "queued" | "called" | "in_progress" | "completed" | "no_show" | "cancelled"
  } | null
}

export type RoomSummary = {
  id: string
  code: string
  floor: string
  capacity: number | null
  allocated_teams: number
  checked_in_teams: number
  volunteer: RoomOfficial | null
  coordinator: RoomOfficial | null
  coverage: "covered" | "needs_attention"
}

export type RoomDetail = RoomSummary & {
  teams: RoomTeam[]
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === "string") return body.detail
  } catch {
    return "Could not reach the operations API."
  }
  return "Could not load rooms."
}

async function publicGet<T>(path: string) {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  } catch {
    throw new Error("Could not reach the operations API.")
  }
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as T
}

export function listRooms() {
  return publicGet<RoomSummary[]>(`/public/events/${EVENT_SLUG}/rooms`)
}

export function getRoom(roomId: string) {
  return publicGet<RoomDetail>(`/public/events/${EVENT_SLUG}/rooms/${roomId}`)
}
