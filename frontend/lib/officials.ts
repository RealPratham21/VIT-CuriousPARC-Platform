import { EVENT_SLUG, roleLabel, type StaffRole } from "@/lib/auth"

export type OfficialRecord = {
  id: string
  full_name: string
  roles: StaffRole[]
  rooms: Array<{ id: string; code: string; floor: string }>
  managed_team_count: number
}

export function officialRoles(roles: StaffRole[]) {
  return roles.map((role) => roleLabel(role)).join(", ")
}

export async function listOfficials() {
  let response: Response
  try {
    response = await fetch(`/api/v1/public/events/${EVENT_SLUG}/officials`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  } catch {
    throw new Error("Could not reach the operations API.")
  }
  if (!response.ok) throw new Error("Could not load officials.")
  return (await response.json()) as OfficialRecord[]
}
