import { EVENT_SLUG } from "@/lib/auth"

export type RoundStatus = "scheduled" | "live" | "closed"

export type DashboardRound = {
  id: string
  code: string
  name: string
  sequence_number: number
  status: RoundStatus
  starts_at: string
  ends_at: string
}

export type DashboardEvaluation = {
  id: string
  team_id: string
  team_code: string
  team_name: string
  status: string
  panel: { id: string; name: string } | null
  room: { id: string; code: string; floor: string } | null
}

export type DashboardActivity = {
  id: string
  event_type: string
  title: string
  description: string
  created_at: string
}

export type DashboardAnnouncement = {
  id: string
  title: string
  message: string
  published_at: string
  expires_at: string | null
}

export type DashboardSnapshot = {
  registered_teams: number
  checked_in_teams: number
  awaiting_evaluation: number
  under_evaluation: number
  evaluated: number
  rooms_needing_attention: number
  evaluation_progress_percent: number
  current_round: DashboardRound | null
  live_evaluations: DashboardEvaluation[]
  recent_activity: DashboardActivity[]
  latest_announcement: DashboardAnnouncement | null
  generated_at: string
}

export async function fetchDashboard() {
  let response: Response
  try {
    response = await fetch(`/api/v1/public/events/${EVENT_SLUG}/dashboard`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  } catch {
    throw new Error("Could not reach the operations API.")
  }
  if (!response.ok) throw new Error("Could not load the operations overview.")
  return (await response.json()) as DashboardSnapshot
}
