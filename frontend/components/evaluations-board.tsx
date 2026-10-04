"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  activateRound,
  closeRound,
  listRegisteredTeams,
  listRoundEvaluations,
  listRounds,
  type BoardEvaluation,
  type RoundRecord,
} from "@/lib/evaluations"
import {
  canControlRound,
  evaluationTone,
  eventIdForUser,
  listPanels,
  type EvaluationStatus,
  type PanelOption,
  type TeamSummary,
} from "@/lib/teams"

const POLL_MS = 15_000

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  unassigned: "Not scheduled",
  queued: "Queued",
  called: "Called",
  in_progress: "Under evaluation",
  completed: "Evaluated",
  no_show: "No show",
  cancelled: "Cancelled",
}

const STATUS_ORDER: EvaluationStatus[] = [
  "in_progress",
  "called",
  "queued",
  "completed",
  "no_show",
  "cancelled",
]

function focusRound(rounds: RoundRecord[]) {
  return (
    rounds.find((round) => round.status === "live") ??
    rounds.find((round) => round.status === "scheduled") ??
    rounds.at(-1) ??
    null
  )
}

function statusRank(status: EvaluationStatus) {
  const rank = STATUS_ORDER.indexOf(status)
  return rank === -1 ? STATUS_ORDER.length : rank
}

function byQueue(left: BoardEvaluation, right: BoardEvaluation) {
  const rank = statusRank(left.status) - statusRank(right.status)
  if (rank !== 0) return rank
  const queue = (left.queue_position ?? 999) - (right.queue_position ?? 999)
  if (queue !== 0) return queue
  return left.team_code.localeCompare(right.team_code)
}

function roundTone(status: RoundRecord["status"]) {
  if (status === "live") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
  if (status === "closed") return "border-rose-500/20 bg-rose-500/10 text-rose-400"
  return "border-border text-muted-foreground"
}

export function EvaluationsBoard() {
  const { user, status: authStatus } = useAuth()
  const eventId = eventIdForUser(user)
  const canControl = authStatus === "ready" && canControlRound(user) && Boolean(eventId)
  const [rounds, setRounds] = useState<RoundRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [evaluations, setEvaluations] = useState<BoardEvaluation[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [panels, setPanels] = useState<PanelOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [closeOpen, setCloseOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const nextRounds = await listRounds()
        const chosen = nextRounds.find((round) => round.id === selectedId) ?? focusRound(nextRounds)
        const [nextEvaluations, nextTeams, nextPanels] = await Promise.all([
          chosen ? listRoundEvaluations(chosen.id) : Promise.resolve([]),
          listRegisteredTeams(),
          eventId ? listPanels(eventId).catch(() => []) : Promise.resolve([]),
        ])
        if (!active) return
        setRounds(nextRounds)
        setEvaluations(nextEvaluations)
        setTeams(nextTeams)
        setPanels(nextPanels.filter((panel) => panel.is_active))
        setError(null)
      } catch (caught: unknown) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load the evaluation board.")
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
  }, [eventId, reloadKey, selectedId])

  const round = rounds.find((item) => item.id === selectedId) ?? focusRound(rounds)
  const covered = new Set(
    evaluations.filter((item) => item.status !== "unassigned").map((item) => item.team_id),
  )
  const notScheduled = teams
    .filter((team) => !covered.has(team.id))
    .sort((left, right) => left.team_code.localeCompare(right.team_code))
  const panelGroups = new Map<string, BoardEvaluation[]>()
  for (const panel of panels) panelGroups.set(panel.name, [])
  for (const item of evaluations) {
    if (!item.panel || item.status === "unassigned") continue
    const rows = panelGroups.get(item.panel.name) ?? []
    rows.push(item)
    panelGroups.set(item.panel.name, rows)
  }
  const panelNames = [...panelGroups.keys()].sort((left, right) => left.localeCompare(right))

  function count(status: EvaluationStatus) {
    return evaluations.filter((item) => item.status === status).length
  }

  async function run(key: string, action: () => Promise<unknown>) {
    if (!eventId || !round) return
    setPending(key)
    setActionError(null)
    try {
      await action()
      setSelectedId(round.id)
      setReloadKey((value) => value + 1)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not update the round.")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Evaluation board</CardTitle>
              <p className="text-xs text-muted-foreground">
                {round ? `${round.name} · queue, live panels, and teams still to be scheduled` : "No round is set up for this event."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {rounds.length > 1 ? (
                <select
                  value={round?.id ?? ""}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  aria-label="Round"
                >
                  {rounds.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : null}
              {round ? (
                <Badge variant="outline" className={roundTone(round.status)}>
                  {round.status === "live" ? "Live" : round.status === "closed" ? "Closed" : "Scheduled"}
                </Badge>
              ) : null}
              {canControl && round && round.status !== "live" ? (
                <Button
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => void run("activate", () => activateRound(eventId!, round.id))}
                >
                  {pending === "activate" ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
                  {round.status === "closed" ? "Reopen round" : "Make round live"}
                </Button>
              ) : null}
              {canControl && round?.status === "live" ? (
                <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => setCloseOpen(true)}>
                  Close round
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
                <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
          {error && rounds.length > 0 ? <p className="text-xs text-destructive">{error}</p> : null}
          {loading && rounds.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading evaluations
            </div>
          ) : null}
          {error && rounds.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                Retry
              </Button>
            </div>
          ) : null}
          {round ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {[
                ["Not scheduled", notScheduled.length],
                ["Queued", count("queued")],
                ["Called", count("called")],
                ["Under evaluation", count("in_progress")],
                ["Evaluated", count("completed")],
                ["No show", count("no_show")],
                ["Cancelled", count("cancelled")],
              ].map(([label, value]) => (
                <Card key={String(label)} className="bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-lg font-semibold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {round ? (
        <Section title="Not scheduled" detail="Registered teams with no evaluation in this round.">
          {notScheduled.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {teams.length === 0 ? "No registered teams are waiting to be scheduled." : "Every registered team has an evaluation."}
            </p>
          ) : (
            <TeamTable
              rows={notScheduled.map((team) => ({
                key: team.id,
                code: team.team_code,
                name: team.name,
                room: team.room?.code ?? "No room",
                queue: "—",
                status: "unassigned" as const,
              }))}
            />
          )}
        </Section>
      ) : null}

      {round
        ? panelNames.map((name) => {
            const rows = [...(panelGroups.get(name) ?? [])].sort(byQueue)
            return (
              <Section key={name} title={name} detail={`${rows.length} ${rows.length === 1 ? "team" : "teams"} on this panel`}>
                {rows.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">No teams on this panel.</p>
                ) : (
                  <TeamTable
                    rows={rows.map((item) => ({
                      key: item.id,
                      code: item.team_code,
                      name: item.team_name,
                      room: item.room?.code ?? "No room",
                      queue: item.queue_position == null ? "—" : String(item.queue_position),
                      status: item.status,
                    }))}
                  />
                )}
              </Section>
            )
          })
        : null}

      {round ? (
        <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close {round.name}?</DialogTitle>
              <DialogDescription>
                Scheduling and evaluation updates pause while the round is closed. A lead can open it again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={pending !== null}>
                Keep open
              </Button>
              <Button
                disabled={pending !== null}
                onClick={() => {
                  void run("close", async () => {
                    await closeRound(eventId!, round.id)
                    setCloseOpen(false)
                  })
                }}
              >
                {pending === "close" ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
                Close round
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

function Section({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

function TeamTable({
  rows,
}: {
  rows: Array<{
    key: string
    code: string
    name: string
    room: string
    queue: string
    status: EvaluationStatus
  }>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-y border-border/50 bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            {["Team", "Room", "Queue", "Status"].map((heading) => (
              <th key={heading} className="px-5 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-5 py-3">
                <p className="font-medium">{row.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{row.code}</p>
              </td>
              <td className="px-5 py-3 font-mono text-muted-foreground">{row.room}</td>
              <td className="px-5 py-3 text-muted-foreground">{row.queue}</td>
              <td className="px-5 py-3">
                <Badge variant="outline" className={evaluationTone(row.status)}>
                  {STATUS_LABEL[row.status]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
