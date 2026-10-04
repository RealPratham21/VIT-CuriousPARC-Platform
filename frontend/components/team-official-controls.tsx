"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type EvaluationAction,
  type EvaluationStatus,
  type PanelOption,
  type RoomOption,
  type TeamStaff,
  addTeamMember,
  assignTeamRoom,
  canCheckInTeam,
  canRegisterTeam,
  canUpdateEvaluation,
  comparePanelNames,
  checkInMember,
  currentRound,
  listPanels,
  listRooms,
  revokeCheckIn,
  scheduleEvaluation,
  transitionEvaluation,
} from "@/lib/teams"

const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-xs"

const EVALUATION_ACTIONS: Record<EvaluationStatus, Array<{ action: EvaluationAction; label: string; primary?: boolean }>> = {
  unassigned: [{ action: "cancel", label: "Cancel" }],
  queued: [
    { action: "call", label: "Call", primary: true },
    { action: "cancel", label: "Cancel" },
  ],
  called: [
    { action: "start", label: "Start", primary: true },
    { action: "no-show", label: "No-show" },
    { action: "cancel", label: "Cancel" },
  ],
  in_progress: [
    { action: "complete", label: "Complete", primary: true },
    { action: "no-show", label: "No-show" },
  ],
  completed: [],
  no_show: [],
  cancelled: [],
}

export function TeamOfficialControls({
  eventId,
  team,
  onChanged,
}: {
  eventId: string
  team: TeamStaff
  onChanged: () => void
}) {
  const { user } = useAuth()
  const canWrite = canRegisterTeam(user)
  const canCheckIn = canCheckInTeam(user)
  const canEvaluate = canUpdateEvaluation(user)
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [panels, setPanels] = useState<PanelOption[]>([])
  const [roundName, setRoundName] = useState<string | null>(null)
  const [roundId, setRoundId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState(team.room?.id ?? "")
  const [memberName, setMemberName] = useState("")
  const [memberPhone, setMemberPhone] = useState("")
  const [memberEmail, setMemberEmail] = useState("")
  const [panelId, setPanelId] = useState("")
  const [queuePosition, setQueuePosition] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    setRoomId(team.room?.id ?? "")
  }, [team.room?.id])

  useEffect(() => {
    let active = true
    listRooms()
      .then((result) => {
        if (active) setRooms([...result].sort((left, right) => left.code.localeCompare(right.code)))
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load rooms.")
      })
    if (canWrite) {
      currentRound()
        .then((round) => {
          if (!active) return
          setRoundId(round?.id ?? null)
          setRoundName(round?.name ?? null)
        })
        .catch((caught: unknown) => {
          if (active) setError(caught instanceof Error ? caught.message : "Could not load the live round.")
        })
      listPanels(eventId)
        .then((result) => {
          if (!active) return
          const activePanels = result.filter((panel) => panel.is_active).sort((left, right) => comparePanelNames(left.name, right.name))
          setPanels(activePanels)
          setPanelId((current) => current || activePanels[0]?.id || "")
        })
        .catch((caught: unknown) => {
          if (active) setError(caught instanceof Error ? caught.message : "Could not load judging panels.")
        })
    }
    return () => {
      active = false
    }
  }, [canWrite, eventId])

  async function run(key: string, action: () => Promise<unknown>) {
    setPending(key)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this team.")
    } finally {
      setPending(null)
    }
  }

  async function onAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!memberName.trim()) {
      setError("A member name is required.")
      return
    }
    await run("member", async () => {
      await addTeamMember(eventId, team.id, {
        full_name: memberName.trim(),
        ...(memberPhone.trim() ? { phone_e164: memberPhone.trim() } : {}),
        ...(memberEmail.trim() ? { email: memberEmail.trim() } : {}),
      })
      setMemberName("")
      setMemberPhone("")
      setMemberEmail("")
    })
  }

  const evaluation = team.evaluation
  const actions = evaluation ? EVALUATION_ACTIONS[evaluation.status] : []

  return (
    <div className="mt-4 flex flex-col gap-5 border-t border-border/60 pt-4">
      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Team members</p>
        {team.members.length === 0 ? <p className="text-xs text-muted-foreground">No members recorded.</p> : null}
        {team.members.map((member) => (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2" key={member.id}>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {member.full_name}
                {member.is_leader ? <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">Leader</span> : null}
                {!member.is_active ? <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">Inactive</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {[member.phone_e164, member.email, member.attendance_status === "checked_in" ? "Checked in" : "Not checked in"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {canCheckIn && member.is_active ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={pending !== null}
                onClick={() =>
                  void run(`attendance-${member.id}`, () =>
                    member.attendance_status === "checked_in"
                      ? revokeCheckIn(eventId, member.id)
                      : checkInMember(eventId, member.id),
                  )
                }
              >
                {pending === `attendance-${member.id}` ? <Loader2 className="animate-spin" /> : null}
                {member.attendance_status === "checked_in" ? "Undo check-in" : "Check in"}
              </Button>
            ) : null}
          </div>
        ))}
        {canWrite ? (
          <form className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={(event) => void onAddMember(event)}>
            <Field label="Member name" id="member-name">
              <Input id="member-name" value={memberName} onChange={(event) => setMemberName(event.target.value)} className="h-8 text-xs" disabled={pending !== null} />
            </Field>
            <Field label="Phone" id="member-phone">
              <Input id="member-phone" value={memberPhone} onChange={(event) => setMemberPhone(event.target.value)} placeholder="Optional" className="h-8 text-xs" disabled={pending !== null} />
            </Field>
            <Field label="Email" id="member-email">
              <Input id="member-email" type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="Optional" className="h-8 text-xs" disabled={pending !== null} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" size="sm" className="h-8" disabled={pending !== null}>
                {pending === "member" ? <Loader2 className="animate-spin" /> : null}
                Add
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      {canWrite ? (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Room</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <Label htmlFor="team-room" className="sr-only">
                Room
              </Label>
              <select id="team-room" value={roomId} onChange={(event) => setRoomId(event.target.value)} className={selectClass} disabled={pending !== null}>
                <option value="">No room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.floor} · {room.code}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={pending !== null || !roomId || roomId === team.room?.id}
              onClick={() => void run("room", () => assignTeamRoom(eventId, team.id, roomId))}
            >
              {pending === "room" ? <Loader2 className="animate-spin" /> : null}
              {team.room ? "Move room" : "Assign room"}
            </Button>
          </div>
        </section>
      ) : null}

      {canEvaluate || canWrite ? (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Evaluation</p>
          {evaluation && canEvaluate ? (
            actions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.action}
                    type="button"
                    size="sm"
                    className="h-8"
                    variant={action.primary ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() =>
                      void run(action.action, () => transitionEvaluation(eventId, evaluation.id, action.action, evaluation.version))
                    }
                  >
                    {pending === action.action ? <Loader2 className="animate-spin" /> : null}
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">This evaluation has no further steps.</p>
            )
          ) : null}
          {!evaluation && canWrite ? (
            roundId ? (
              <form
                className="grid gap-2 sm:grid-cols-[1fr_120px_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  const position = Number(queuePosition)
                  if (!panelId || !Number.isInteger(position) || position < 1) {
                    setError("Choose a panel and a queue position of 1 or more.")
                    return
                  }
                  void run("schedule", () =>
                    scheduleEvaluation(eventId, roundId, {
                      team_id: team.id,
                      panel_id: panelId,
                      queue_position: position,
                      ...(team.room ? { room_id: team.room.id } : {}),
                    }),
                  )
                }}
              >
                <Field label={`Panel · ${roundName ?? "Live round"}`} id="eval-panel">
                  <select id="eval-panel" value={panelId} onChange={(event) => setPanelId(event.target.value)} className={selectClass} disabled={pending !== null || panels.length === 0}>
                    {panels.length === 0 ? <option value="">No panels</option> : null}
                    {panels.map((panel) => (
                      <option key={panel.id} value={panel.id}>
                        {panel.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Queue" id="eval-queue">
                  <Input
                    id="eval-queue"
                    inputMode="numeric"
                    value={queuePosition}
                    onChange={(event) => setQueuePosition(event.target.value)}
                    placeholder="1"
                    className="h-8 text-xs"
                    disabled={pending !== null}
                  />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" size="sm" className="h-8" disabled={pending !== null}>
                    {pending === "schedule" ? <Loader2 className="animate-spin" /> : null}
                    Schedule
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">No live round is open, so this team cannot be scheduled.</p>
            )
          ) : null}
          {!evaluation && !canWrite && canEvaluate ? (
            <p className="text-xs text-muted-foreground">This team is not scheduled for evaluation.</p>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  )
}
