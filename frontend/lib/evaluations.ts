import { EVENT_SLUG } from "@/lib/auth"
import { staffRequest, type EvaluationStatus, type TeamSummary } from "@/lib/teams"

export type RoundRecord = {
  id: string
  code: string
  name: string
  sequence_number: number
  status: "scheduled" | "live" | "closed"
  starts_at: string
  ends_at: string
}

export type BoardEvaluation = {
  id: string
  team_id: string
  team_code: string
  team_name: string
  status: EvaluationStatus
  queue_position: number | null
  panel: { id: string; name: string } | null
  room: { id: string; code: string; floor: string } | null
}

type Page<T> = {
  items: T[]
  page: number
  page_size: number
  total: number
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
  if (!response.ok) throw new Error("Could not load the evaluation board.")
  return (await response.json()) as T
}

async function everyPage<T>(path: string) {
  const first = await publicGet<Page<T>>(`${path}?page=1&page_size=100`)
  const items = [...first.items]
  const pages = Math.ceil(first.total / first.page_size)
  for (let page = 2; page <= pages; page += 1) {
    const next = await publicGet<Page<T>>(`${path}?page=${page}&page_size=100`)
    items.push(...next.items)
  }
  return items
}

export function listRounds() {
  return publicGet<RoundRecord[]>(`/public/events/${EVENT_SLUG}/rounds`)
}

export function listRoundEvaluations(roundId: string) {
  return everyPage<BoardEvaluation>(`/public/events/${EVENT_SLUG}/rounds/${roundId}/evaluations`)
}

export function listRegisteredTeams() {
  return everyPage<TeamSummary>(`/public/events/${EVENT_SLUG}/teams`)
}

export function activateRound(eventId: string, roundId: string) {
  return staffRequest<RoundRecord>(
    `/staff/events/${eventId}/rounds/${roundId}/activate`,
    { method: "POST" },
    "Could not open the round.",
  )
}

export function closeRound(eventId: string, roundId: string) {
  return staffRequest<RoundRecord>(
    `/staff/events/${eventId}/rounds/${roundId}/close`,
    { method: "POST" },
    "Could not close the round.",
  )
}
