"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Activity, CheckCircle2, Download, Loader2, Search, UserPlus } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TEAM_PAGE_SIZE,
  type EvaluationStatus,
  type TeamDetail,
  type TeamPage,
  type TrackRef,
  STATUS_FILTERS,
  canRegisterTeam,
  evaluationLabel,
  evaluationTone,
  eventIdForUser,
  formatEventTime,
  getTeam,
  listTeams,
  listTracks,
  registerTeam,
} from "@/lib/teams"

export function TeamsDirectory() {
  const { user, status: authStatus } = useAuth()
  const [query, setQuery] = useState("")
  const [request, setRequest] = useState<{ q: string; evaluationStatus: EvaluationStatus | ""; page: number }>({
    q: "",
    evaluationStatus: "",
    page: 1,
  })
  const [directory, setDirectory] = useState<TeamPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      setRequest((current) => (current.q === nextQuery ? current : { ...current, q: nextQuery, page: 1 }))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listTeams({ q: request.q, evaluationStatus: request.evaluationStatus, page: request.page })
      .then((result) => {
        if (!active) return
        setDirectory(result)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Could not load teams.")
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [request, reloadKey])

  const total = directory?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / TEAM_PAGE_SIZE))
  const filtering = Boolean(request.q || request.evaluationStatus)
  const summary = filtering ? `${total} matching` : `${total} registered`
  const showRegister = authStatus === "ready" && canRegisterTeam(user)

  function exportCurrentPage() {
    const items = directory?.items ?? []
    if (items.length === 0) return
    const rows = [
      ["Team code", "Name", "Floor", "Room", "Checked in", "Expected", "Panel", "Evaluation"],
      ...items.map((team) => [
        team.team_code,
        team.name,
        team.room?.floor ?? "",
        team.room?.code ?? "",
        String(team.attendance.checked_in),
        String(team.attendance.expected),
        team.evaluation?.panel?.name ?? "",
        evaluationLabel(team.evaluation?.status ?? null),
      ]),
    ]
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "teams.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="gap-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">All teams</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {loading && !directory ? "Loading team records" : `${summary} · click any row for the status timeline`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showRegister ? (
                <Button size="sm" onClick={() => setRegisterOpen(true)}>
                  <UserPlus data-icon="inline-start" />
                  Register team
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={exportCurrentPage} disabled={!directory?.items.length}>
                <Download data-icon="inline-start" />
                Export
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team ID or name..."
                className="h-8 pl-9 text-xs"
              />
            </div>
            <select
              value={request.evaluationStatus}
              onChange={(event) => {
                const evaluationStatus = event.target.value as EvaluationStatus | ""
                setRequest((current) => ({ ...current, evaluationStatus, page: 1 }))
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Evaluation status"
            >
              <option value="">All statuses</option>
              {STATUS_FILTERS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-y border-border/50 bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Team", "Floor / room", "Members", "Judging panel", "Evaluation"].map((heading) => (
                    <th className="px-5 py-3 font-medium" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </td>
                  </tr>
                ) : null}
                {!loading && error ? (
                  <tr>
                    <td className="px-5 py-8 text-center" colSpan={5}>
                      <p className="text-sm text-destructive">{error}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setReloadKey((value) => value + 1)}>
                        Retry
                      </Button>
                    </td>
                  </tr>
                ) : null}
                {!loading && !error && directory?.items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>
                      {filtering ? "No teams match this search." : "No registered teams yet."}
                    </td>
                  </tr>
                ) : null}
                {!loading && !error
                  ? directory?.items.map((team) => (
                      <tr key={team.id} className="cursor-pointer hover:bg-muted/20" onClick={() => setSelectedId(team.id)}>
                        <td className="px-5 py-3">
                          <span className="mr-2 font-mono text-[10px] text-primary">{team.team_code}</span>
                          <span className="font-medium">{team.name}</span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {team.room ? `${team.room.floor} · ${team.room.code}` : "Unassigned"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {team.attendance.checked_in} / {team.attendance.expected}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{team.evaluation?.panel?.name ?? "—"}</td>
                        <td className="px-5 py-3">
                          <EvaluationBadge status={team.evaluation?.status ?? null} />
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
          {total > TEAM_PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t border-border/50 px-5 py-3 text-xs">
              <span className="text-muted-foreground">
                Page {request.page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={request.page <= 1 || loading} onClick={() => setRequest((current) => ({ ...current, page: current.page - 1 }))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-8" disabled={request.page >= pageCount || loading} onClick={() => setRequest((current) => ({ ...current, page: current.page + 1 }))}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {selectedId ? <TeamTimelineDialog teamId={selectedId} onClose={() => setSelectedId(null)} /> : null}
      <RegisterTeamDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={(teamCode) => {
          setQuery(teamCode)
          setRequest({ q: teamCode, evaluationStatus: "", page: 1 })
          setReloadKey((value) => value + 1)
        }}
      />
    </>
  )
}

function EvaluationBadge({ status }: { status: EvaluationStatus | null }) {
  return (
    <Badge variant="outline" className={evaluationTone(status)}>
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {evaluationLabel(status)}
    </Badge>
  )
}

function TeamTimelineDialog({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getTeam(teamId)
      .then((result) => {
        if (active) setDetail(result)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load this team.")
      })
    return () => {
      active = false
    }
  }, [teamId])

  const timeline = [...(detail?.timeline ?? [])].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>{detail?.name ?? "Team timeline"}</DialogTitle>
              <DialogDescription>
                {detail
                  ? `${detail.team_code} · ${detail.room ? `Room ${detail.room.code}` : "No room"} · ${detail.evaluation?.panel?.name ?? "No panel"}`
                  : "Loading the public timeline"}
              </DialogDescription>
            </div>
            {detail ? <EvaluationBadge status={detail.evaluation?.status ?? null} /> : null}
          </div>
        </DialogHeader>
        <div className="mt-2">
          {!detail && !error ? <p className="py-6 text-center text-xs text-muted-foreground">Loading timeline…</p> : null}
          {error ? <p className="py-6 text-center text-sm text-destructive">{error}</p> : null}
          {detail && timeline.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No public updates yet.</p>
          ) : null}
          {detail && timeline.length > 0 ? (
            <div className="flex flex-col">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Complete team timeline</p>
              {timeline.map((item, index) => (
                <div className="flex gap-3" key={item.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`mt-1 flex size-6 items-center justify-center rounded-full ${index === timeline.length - 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {index === timeline.length - 1 ? <Activity className="size-3" /> : <CheckCircle2 className="size-3" />}
                    </div>
                    {index < timeline.length - 1 ? <div className="my-1 h-8 w-px bg-border" /> : null}
                  </div>
                  <div className="pb-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-xs text-primary">{formatEventTime(item.created_at)}</span>
                      <p className="text-sm font-medium">{item.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RegisterTeamDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: (teamCode: string) => void
}) {
  const { user } = useAuth()
  const [tracks, setTracks] = useState<TrackRef[]>([])
  const [trackError, setTrackError] = useState<string | null>(null)
  const [teamCode, setTeamCode] = useState("")
  const [name, setName] = useState("")
  const [trackId, setTrackId] = useState("")
  const [expectedCount, setExpectedCount] = useState("")
  const [leaderName, setLeaderName] = useState("")
  const [leaderPhone, setLeaderPhone] = useState("")
  const [leaderEmail, setLeaderEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    listTracks()
      .then((result) => {
        if (!active) return
        setTracks(result)
        setTrackId((current) => current || result[0]?.id || "")
      })
      .catch((caught: unknown) => {
        if (active) setTrackError(caught instanceof Error ? caught.message : "Could not load tracks.")
      })
    return () => {
      active = false
    }
  }, [open])

  function resetForm() {
    setTeamCode("")
    setName("")
    setExpectedCount("")
    setLeaderName("")
    setLeaderPhone("")
    setLeaderEmail("")
    setError(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const eventId = eventIdForUser(user)
    if (!eventId) {
      setError("This account is not assigned to CuriousPARC 2026.")
      return
    }
    if (teamCode.trim().length < 2 || !name.trim() || !leaderName.trim() || !trackId) {
      setError("Team code, name, track, and leader name are required.")
      return
    }
    let expected: number | undefined
    if (expectedCount.trim()) {
      expected = Number(expectedCount)
      if (!Number.isInteger(expected) || expected < 1) {
        setError("Expected member count must be a whole number greater than 0.")
        return
      }
    }
    setPending(true)
    setError(null)
    try {
      const created = await registerTeam(eventId, {
        team_code: teamCode.trim(),
        name: name.trim(),
        track_id: trackId,
        leader_name: leaderName.trim(),
        ...(expected ? { expected_member_count: expected } : {}),
        ...(leaderPhone.trim() ? { leader_phone_e164: leaderPhone.trim() } : {}),
        ...(leaderEmail.trim() ? { leader_email: leaderEmail.trim() } : {}),
      })
      resetForm()
      onOpenChange(false)
      onRegistered(created.team_code)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not register the team.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        if (!next) setError(null)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register team</DialogTitle>
          <DialogDescription>Add a team and its leader. The new team appears on the public directory.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Team code" id="team-code">
            <Input id="team-code" value={teamCode} onChange={(event) => setTeamCode(event.target.value)} className="h-9 text-sm" disabled={pending} />
          </Field>
          <Field label="Team name" id="team-name">
            <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 text-sm" disabled={pending} />
          </Field>
          <Field label="Track" id="team-track">
            <select
              id="team-track"
              value={trackId}
              onChange={(event) => setTrackId(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={pending || tracks.length === 0}
            >
              {tracks.length === 0 ? <option value="">No tracks available</option> : null}
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expected members" id="team-size">
            <Input
              id="team-size"
              inputMode="numeric"
              value={expectedCount}
              onChange={(event) => setExpectedCount(event.target.value)}
              placeholder="Optional"
              className="h-9 text-sm"
              disabled={pending}
            />
          </Field>
          <Field label="Leader name" id="leader-name">
            <Input id="leader-name" value={leaderName} onChange={(event) => setLeaderName(event.target.value)} className="h-9 text-sm" disabled={pending} />
          </Field>
          <Field label="Leader phone" id="leader-phone">
            <Input
              id="leader-phone"
              value={leaderPhone}
              onChange={(event) => setLeaderPhone(event.target.value)}
              placeholder="Optional"
              className="h-9 text-sm"
              disabled={pending}
            />
          </Field>
          <Field label="Leader email" id="leader-email">
            <Input
              id="leader-email"
              type="email"
              value={leaderEmail}
              onChange={(event) => setLeaderEmail(event.target.value)}
              placeholder="Optional"
              className="h-9 text-sm"
              disabled={pending}
            />
          </Field>
          {trackError ? <p className="text-xs text-destructive">{trackError}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
              {pending ? "Registering" : "Register team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}
