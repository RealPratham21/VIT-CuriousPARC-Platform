"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listOfficials, type OfficialRecord } from "@/lib/officials"
import {
  assignCoordinator,
  assignVolunteer,
  getRoom,
  listRooms,
  releaseRoomAssignment,
  type RoomAssignee,
  type RoomDetail,
  type RoomSummary,
} from "@/lib/rooms"
import { canAssignRoom, eventIdForUser } from "@/lib/teams"
import { toast } from "sonner"

const POLL_MS = 15_000

type EvaluationStatus = NonNullable<RoomDetail["teams"][number]["evaluation"]>["status"]

function evaluationLabel(status: EvaluationStatus | undefined) {
  if (status === "completed") return "Evaluated"
  if (status === "in_progress") return "In progress"
  if (!status || status === "unassigned") return "Not scheduled"
  if (status === "no_show") return "No show"
  if (status === "cancelled") return "Cancelled"
  return "Awaiting"
}

function evaluationTone(status: string) {
  if (status === "Evaluated") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  if (status === "In progress") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
  if (status === "Awaiting") return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  return "border-border text-muted-foreground"
}

function dutyNames(people: RoomAssignee[]) {
  if (people.length === 0) return "Missing"
  return people.map((person) => person.full_name).join(", ")
}

function RoomDetailDialog({ room, onClose, onChanged }: { room: RoomSummary; onClose: () => void; onChanged: () => void }) {
  const { user, status } = useAuth()
  const eventId = eventIdForUser(user)
  const canAssign = status === "ready" && canAssignRoom(user) && Boolean(eventId)
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [officials, setOfficials] = useState<OfficialRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [volunteerName, setVolunteerName] = useState("")
  const [coordinatorId, setCoordinatorId] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setDetail(null)
    setError(null)
    void getRoom(room.id)
      .then((next) => {
        if (active) setDetail(next)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load room details.")
      })
    return () => {
      active = false
    }
  }, [reloadKey, room.id])

  useEffect(() => {
    if (!canAssign) return
    let active = true
    listOfficials()
      .then((result) => {
        if (active) setOfficials(result)
      })
      .catch((caught: unknown) => {
        if (active) setActionError(caught instanceof Error ? caught.message : "Could not load officials.")
      })
    return () => {
      active = false
    }
  }, [canAssign])

  async function run(key: string, action: () => Promise<unknown>) {
    setPending(key)
    setActionError(null)
    try {
      await action()
      setReloadKey((value) => value + 1)
      onChanged()
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not update room staffing.")
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Room {room.code} coverage</DialogTitle>
          <DialogDescription>Exact allocation, staffing and live team status for this room.</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="py-6 text-sm text-destructive">{error}</p>
        ) : !detail ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading room details
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-muted/30"><CardContent className="p-3"><p className="text-lg font-semibold">{detail.allocated_teams}</p><p className="text-[10px] text-muted-foreground">Allocated teams</p></CardContent></Card>
              <Card className="bg-muted/30"><CardContent className="p-3"><p className="text-lg font-semibold">{detail.checked_in_teams} / {detail.allocated_teams}</p><p className="text-[10px] text-muted-foreground">Checked in</p></CardContent></Card>
              <Card className="bg-muted/30"><CardContent className="p-3"><p className="text-sm font-semibold">{detail.coverage === "covered" ? "Covered" : "Needs attention"}</p><p className="text-[10px] text-muted-foreground">Coverage</p></CardContent></Card>
            </div>
            <VolunteerSection
              people={detail.volunteers}
              name={volunteerName}
              onName={setVolunteerName}
              canAssign={canAssign}
              pending={pending}
              onAdd={() => {
                const name = volunteerName.trim()
                if (!eventId || !name) return
                void run("add-volunteer", async () => {
                  await assignVolunteer(eventId, room.id, name)
                  setVolunteerName("")
                })
              }}
              onRemove={(assignmentId) => {
                if (!eventId) return
                void run(`remove-volunteer-${assignmentId}`, () => releaseRoomAssignment(eventId, room.id, assignmentId))
              }}
            />
            <CoordinatorSection
              people={detail.coordinators}
              options={officials.filter((official) => !detail.coordinators.some((person) => person.user_id === official.id))}
              selectedId={coordinatorId}
              onSelect={setCoordinatorId}
              canAssign={canAssign}
              pending={pending}
              onAdd={() => {
                if (!eventId || !coordinatorId) return
                void run("add-coordinator", async () => {
                  await assignCoordinator(eventId, room.id, coordinatorId)
                  setCoordinatorId("")
                })
              }}
              onRemove={(assignmentId) => {
                if (!eventId) return
                void run(`remove-coordinator-${assignmentId}`, () => releaseRoomAssignment(eventId, room.id, assignmentId))
              }}
            />
            {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
            {detail.teams.map((team) => {
              const label = evaluationLabel(team.evaluation?.status)
              return (
                <div key={team.id} className="flex items-center justify-between rounded-md border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{team.name}</p>
                    <p className="text-[10px] text-muted-foreground">{team.team_code} · {team.attendance.checked_in} / {team.attendance.expected} checked in</p>
                  </div>
                  <Badge variant="outline" className={evaluationTone(label)}>{label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AssigneeList({
  duty,
  title,
  people,
  canAssign,
  pending,
  onRemove,
  children,
}: {
  duty: "volunteer" | "coordinator"
  title: string
  people: RoomAssignee[]
  canAssign: boolean
  pending: string | null
  onRemove: (assignmentId: string) => void
  children?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {people.length === 0 ? <p className="text-xs text-muted-foreground">None assigned</p> : null}
      {people.map((person) => (
        <div key={person.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
          <p className="text-sm font-medium">{person.full_name}</p>
          {canAssign ? (
            <Button type="button" variant="outline" size="sm" className="h-7" disabled={pending !== null} onClick={() => onRemove(person.id)}>
              {pending === `remove-${duty}-${person.id}` ? <Loader2 className="animate-spin" /> : null}
              Remove
            </Button>
          ) : null}
        </div>
      ))}
      {canAssign ? children : null}
    </section>
  )
}

function VolunteerSection({
  people,
  name,
  onName,
  canAssign,
  pending,
  onAdd,
  onRemove,
}: {
  people: RoomAssignee[]
  name: string
  onName: (value: string) => void
  canAssign: boolean
  pending: string | null
  onAdd: () => void
  onRemove: (assignmentId: string) => void
}) {
  return (
    <AssigneeList duty="volunteer" title="Volunteers" people={people} canAssign={canAssign} pending={pending} onRemove={onRemove}>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(event) => onName(event.target.value)}
          placeholder="Type a volunteer name"
          maxLength={200}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Volunteer name"
          disabled={pending !== null}
        />
        <Button type="button" size="sm" className="h-8" disabled={pending !== null || !name.trim()} onClick={onAdd}>
          {pending === "add-volunteer" ? <Loader2 className="animate-spin" /> : null}
          Add
        </Button>
      </div>
    </AssigneeList>
  )
}

function CoordinatorSection({
  people,
  options,
  selectedId,
  onSelect,
  canAssign,
  pending,
  onAdd,
  onRemove,
}: {
  people: RoomAssignee[]
  options: OfficialRecord[]
  selectedId: string
  onSelect: (value: string) => void
  canAssign: boolean
  pending: string | null
  onAdd: () => void
  onRemove: (assignmentId: string) => void
}) {
  return (
    <AssigneeList duty="coordinator" title="Coordinators" people={people} canAssign={canAssign} pending={pending} onRemove={onRemove}>
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(event) => onSelect(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Add coordinators"
          disabled={pending !== null}
        >
          <option value="">Select a coordinator</option>
          {options.map((official) => (
            <option key={official.id} value={official.id}>
              {official.full_name}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" className="h-8" disabled={pending !== null || !selectedId} onClick={onAdd}>
          {pending === "add-coordinator" ? <Loader2 className="animate-spin" /> : null}
          Add
        </Button>
      </div>
    </AssigneeList>
  )
}

export function RoomsDirectory() {
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const next = await listRooms()
        if (!active) return
        setRooms(next)
        setError(null)
      } catch (caught: unknown) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load rooms.")
      } finally {
        if (active) setLoading(false)
      }
    }
    setLoading(true)
    void load()
    const timer = window.setInterval(() => void load(), POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [reloadKey])

  const floorCount = new Set(rooms.map((room) => room.floor)).size

  return (
    <>
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Room coverage</CardTitle>
              <p className="text-xs text-muted-foreground">{rooms.length} rooms across {floorCount} floors · select a row for exact team allocation</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setReloadKey((value) => value + 1); toast("Room coverage refreshed") }} disabled={loading}>
              <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : ""} />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && rooms.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading rooms</div>
          ) : error && rooms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div>
          ) : rooms.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">No active rooms found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border/50 bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>{["Room", "Allocated", "Checked in", "Volunteer", "Coordinator", "Coverage"].map((heading) => <th className="px-5 py-3 font-medium" key={heading}>{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rooms.map((room) => (
                    <tr key={room.id} onClick={() => setSelectedRoom(room)} className="cursor-pointer hover:bg-muted/20">
                      <td className="px-5 py-3 font-mono font-medium text-primary">{room.code}</td>
                      <td className="px-5 py-3">{room.allocated_teams} teams</td>
                      <td className="px-5 py-3 text-muted-foreground">{room.checked_in_teams} / {room.allocated_teams}</td>
                      <td className="px-5 py-3 text-muted-foreground">{dutyNames(room.volunteers)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{dutyNames(room.coordinators)}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={room.coverage === "needs_attention" ? "border-rose-500/20 text-rose-400" : "border-emerald-500/20 text-emerald-400"}>
                          {room.coverage === "needs_attention" ? "Needs attention" : "Covered"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedRoom ? <RoomDetailDialog room={selectedRoom} onClose={() => setSelectedRoom(null)} onChanged={() => setReloadKey((value) => value + 1)} /> : null}
    </>
  )
}
