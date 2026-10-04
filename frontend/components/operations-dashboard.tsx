"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Activity, ArrowUpRight, BadgeCheck, Building2, ClipboardCheck, Clock3, Loader2, Megaphone, Users } from "lucide-react"

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
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { fetchDashboard, type DashboardSnapshot, type RoundStatus } from "@/lib/dashboard"
import { canPublishAnnouncement, eventIdForUser, formatEventTime, publishAnnouncement } from "@/lib/teams"

type Destination = "teams" | "rooms" | "evaluations"

const POLL_MS = 15_000

export function OperationsDashboard({ setView }: { setView: (view: Destination) => void }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const { user, status: authStatus } = useAuth()
  const canAnnounce = authStatus === "ready" && canPublishAnnouncement(user)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await fetchDashboard()
        if (!active) return
        setSnapshot(next)
        setError(null)
      } catch (caught) {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Could not load the operations overview.")
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

  if (loading && !snapshot) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading operations
      </div>
    )
  }

  if (error && !snapshot) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!snapshot) return null

  const round = snapshot.current_round
  const announcement = snapshot.latest_announcement

  return (
    <div className="flex flex-col gap-5">
      {announcement || canAnnounce ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              {announcement ? (
                <>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
                    Latest announcement · {formatEventTime(announcement.published_at)}
                  </p>
                  <p className="truncate text-sm font-medium">{announcement.message}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No announcement is published.</p>
              )}
            </div>
            {canAnnounce ? (
              <Button size="sm" className="h-8" onClick={() => setAnnounceOpen(true)}>
                New announcement
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Registered teams" value={snapshot.registered_teams} icon={Users} tone="bg-primary/10 text-primary" onClick={() => setView("teams")} />
        <StatCard label="Checked in" value={snapshot.checked_in_teams} icon={BadgeCheck} tone="bg-emerald-500/10 text-emerald-400" onClick={() => setView("teams")} />
        <StatCard label="Awaiting evaluation" value={snapshot.awaiting_evaluation} icon={Clock3} tone="bg-amber-500/10 text-amber-400" onClick={() => setView("evaluations")} />
        <StatCard label="Under evaluation" value={snapshot.under_evaluation} icon={Activity} tone="bg-blue-500/10 text-blue-400" onClick={() => setView("evaluations")} />
        <StatCard label="Evaluated" value={snapshot.evaluated} icon={ClipboardCheck} tone="bg-violet-500/10 text-violet-400" onClick={() => setView("evaluations")} />
        <StatCard label="Rooms attention" value={snapshot.rooms_needing_attention} icon={Building2} tone="bg-rose-500/10 text-rose-400" onClick={() => setView("rooms")} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm">Evaluation progress</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {round ? `Round ${round.sequence_number}` : "No live round"} · {snapshot.evaluated} of {snapshot.registered_teams} registered teams evaluated
              </p>
            </div>
            <span className="text-lg font-semibold text-primary">{snapshot.evaluation_progress_percent}%</span>
          </CardHeader>
          <CardContent>
            <Progress value={snapshot.evaluation_progress_percent} className="h-2" />
            <div className="mt-4 flex justify-between text-[11px] text-muted-foreground">
              <span>{round ? `Started ${formatEventTime(round.starts_at)}` : "Not started"}</span>
              <span>Live operational count</span>
              <span>{round ? `Target ${formatEventTime(round.ends_at)}` : "No target"}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Round status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold">{round ? `Round ${round.sequence_number}` : "No live round"}</p>
              <p className="text-xs text-muted-foreground">{round?.name ?? "A round has not been opened"}</p>
            </div>
            {round ? <RoundBadge status={round.status} /> : null}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Live evaluations</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView("evaluations")}>
              View all <ArrowUpRight data-icon="inline-end" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {snapshot.live_evaluations.length === 0 ? (
              <p className="px-5 py-6 text-xs text-muted-foreground">No team is under evaluation.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {snapshot.live_evaluations.map((item) => (
                  <div className="flex items-center justify-between px-5 py-3.5" key={item.id}>
                    <div>
                      <p className="text-sm font-medium">{item.team_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.room?.code ?? "No room"} · {item.panel?.name ?? "No panel"}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400">
                      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
                      In progress
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Live activity</CardTitle>
            <span className="text-[10px] text-muted-foreground">Updated {formatEventTime(snapshot.generated_at)}</span>
          </CardHeader>
          <CardContent className="p-0">
            {snapshot.recent_activity.length === 0 ? (
              <p className="px-5 py-6 text-xs text-muted-foreground">No public activity yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {snapshot.recent_activity.map((item) => (
                  <div className="flex gap-3 px-5 py-3" key={item.id}>
                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xs font-medium">{item.title}</p>
                        <span className="text-[10px] text-muted-foreground">{formatEventTime(item.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AnnouncementDialog
        open={announceOpen}
        onOpenChange={setAnnounceOpen}
        onPublished={() => setReloadKey((value) => value + 1)}
      />
    </div>
  )
}

function AnnouncementDialog({
  open,
  onOpenChange,
  onPublished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublished: () => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const eventId = eventIdForUser(user)
    if (!eventId) {
      setError("This account is not assigned to CuriousPARC 2026.")
      return
    }
    if (!title.trim() || !message.trim()) {
      setError("A title and a message are required.")
      return
    }
    setPending(true)
    setError(null)
    try {
      await publishAnnouncement(eventId, { title: title.trim(), message: message.trim() })
      setTitle("")
      setMessage("")
      onOpenChange(false)
      onPublished()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish the announcement.")
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>Publishes immediately on the operations board.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="announcement-title" className="text-xs">
              Title
            </Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 text-sm" disabled={pending} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="announcement-message" className="text-xs">
              Message
            </Label>
            <Textarea id="announcement-message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-24 text-sm" disabled={pending} />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Megaphone data-icon="inline-start" />}
              {pending ? "Publishing" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string
  value: number
  icon: typeof Users
  tone: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="group text-left">
      <Card className="h-full border-border/60 bg-card/70 transition-colors hover:border-primary/40">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className={`flex size-8 items-center justify-center rounded-md ${tone}`}>
              <Icon className="size-4" />
            </div>
            <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </button>
  )
}

function RoundBadge({ status }: { status: RoundStatus }) {
  const live = status === "live"
  const label = live ? "Live" : status === "closed" ? "Closed" : "Scheduled"
  return (
    <Badge className={live ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15" : "bg-muted text-muted-foreground hover:bg-muted"}>
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}
