"use client"

import { useEffect, useState } from "react"
import { BarChart3, Building2, Gavel, LayoutDashboard, Menu, RefreshCw, Settings2, UserRound, Users, X } from "lucide-react"
import { EvaluationsBoard } from "@/components/evaluations-board"
import { OperationsDashboard } from "@/components/operations-dashboard"
import { OfficialsDirectory } from "@/components/officials-directory"
import { AdminRoleBadge, OfficialSession, SignedInNotice } from "@/components/official-session"
import { TeamsDirectory } from "@/components/teams-directory"
import { RoomsDirectory } from "@/components/rooms-directory"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type View = "dashboard" | "teams" | "rooms" | "evaluations" | "officials"
type Status = "Awaiting" | "In progress" | "Evaluated"
type Team = readonly [string, string, string, string, Status, string, string]

function LiveDateTime({ title, subtitle }: { title: string; subtitle: string }) {
 const [now, setNow] = useState<Date | null>(null)

 useEffect(() => {
  const update = () => setNow(new Date())
  update()
  const timer = window.setInterval(update, 1000)
  return () => window.clearInterval(timer)
 }, [])

 if (!now) return null

 const date = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
 }).format(now)
 const time = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
 }).format(now)

 return <div>
  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{date}</p>
  <div className="mt-1 flex items-center justify-between gap-3">
   <div>
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
   </div>
   <span className="hidden text-xs text-muted-foreground sm:block">{time} IST</span>
  </div>
 </div>
}

const teams: Team[] = [
 ["VIT-001", "Binary Builders", "A", "A-104", "Evaluated", "Panel Alpha", "3 / 4"], ["VIT-002", "Ctrl Alt Elite", "A", "A-105", "In progress", "Panel Beta", "4 / 4"], ["VIT-003", "Stack Trace", "A", "A-106", "Awaiting", "Panel Gamma", "3 / 4"], ["VIT-004", "Code Crusaders", "A", "A-107", "Evaluated", "Panel Alpha", "4 / 4"], ["VIT-005", "Syntax Squad", "A", "A-108", "In progress", "Panel Delta", "3 / 3"], ["VIT-006", "Null Pointers", "B", "B-201", "Awaiting", "Panel Epsilon", "2 / 4"], ["VIT-007", "Runtime Rebels", "B", "B-202", "Evaluated", "Panel Beta", "4 / 4"], ["VIT-008", "The Semicolons", "B", "B-203", "Awaiting", "Panel Gamma", "4 / 4"], ["VIT-009", "Cloud Native", "B", "B-204", "Evaluated", "Panel Delta", "3 / 4"], ["VIT-010", "API Avengers", "B", "B-205", "In progress", "Panel Epsilon", "4 / 4"], ["VIT-011", "Debug Thugs", "C", "C-301", "Awaiting", "Panel Alpha", "3 / 4"], ["VIT-012", "Byte Me", "C", "C-302", "Evaluated", "Panel Beta", "4 / 4"], ["VIT-013", "Neural Nomads", "C", "C-303", "Awaiting", "Panel Gamma", "4 / 4"], ["VIT-014", "Pixel Pushers", "C", "C-304", "Evaluated", "Panel Delta", "4 / 4"], ["VIT-015", "Bit by Bit", "C", "C-305", "Awaiting", "Panel Epsilon", "3 / 4"],
]
const navItems = [["dashboard", "Dashboard", LayoutDashboard], ["teams", "Teams", Users], ["rooms", "Rooms", Building2], ["evaluations", "Evaluations", Gavel], ["officials", "Officials details", UserRound]] as const

function StatusBadge({ status }: { status: Status }) { const styles = { Evaluated: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", "In progress": "bg-blue-500/10 text-blue-400 border-blue-500/20", Awaiting: "bg-amber-500/10 text-amber-400 border-amber-500/20" }; return <Badge variant="outline" className={styles[status]}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{status}</Badge> }



function Rooms({ onSelect }: { onSelect: (room: string) => void }) { const rooms = Array.from({ length: 18 }, (_, i) => ({ room: `${String.fromCharCode(65 + Math.floor(i / 6))}-${100 + (i % 6) + 4}`, teams: i % 4 + 1, checked: i % 3 + 1, volunteer: i === 4 || i === 13 ? "Missing" : ["Aarav Shah", "Meera Iyer", "Dev Patel"][i % 3], coordinator: ["Priya Nair", "Karan Shah", "Ananya Rao"][i % 3] })); return <Card className="border-border/60 bg-card/70"><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-sm">Room coverage</CardTitle><p className="text-xs text-muted-foreground">18 rooms across 3 floors · select a row for exact team allocation</p></div><Button variant="ghost" size="sm" onClick={() => toast("Room coverage refreshed")}><RefreshCw data-icon="inline-start" />Refresh</Button></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-y border-border/50 bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["Room", "Allocated", "Checked in", "Volunteer", "Coordinator", "Coverage"].map(h => <th className="px-5 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-border/40">{rooms.map(r => <tr key={r.room} onClick={() => onSelect(r.room)} className="cursor-pointer hover:bg-muted/20"><td className="px-5 py-3 font-mono font-medium text-primary">{r.room}</td><td className="px-5 py-3">{r.teams} teams</td><td className="px-5 py-3 text-muted-foreground">{r.checked} / {r.teams + 1}</td><td className="px-5 py-3 text-muted-foreground">{r.volunteer}</td><td className="px-5 py-3 text-muted-foreground">{r.coordinator}</td><td className="px-5 py-3"><Badge variant="outline" className={r.volunteer === "Missing" ? "border-rose-500/20 text-rose-400" : "border-emerald-500/20 text-emerald-400"}>{r.volunteer === "Missing" ? "Needs attention" : "Covered"}</Badge></td></tr>)}</tbody></table></div></CardContent></Card> }


function RoomDetail({ room, onClose }: { room: string; onClose: () => void }) { const allocated = teams.filter(t => t[3] === room || t[2] === room[0]).slice(0, 4); return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Room {room} coverage</DialogTitle><DialogDescription>Exact allocation, staffing and live team status for this room.</DialogDescription></DialogHeader><div className="flex flex-col gap-3"><div className="grid grid-cols-3 gap-2"><Card className="bg-muted/30"><CardContent className="p-3"><p className="text-lg font-semibold">{allocated.length}</p><p className="text-[10px] text-muted-foreground">Allocated teams</p></CardContent></Card><Card className="bg-muted/30"><CardContent className="p-3"><p className="text-lg font-semibold">3 / 4</p><p className="text-[10px] text-muted-foreground">Checked in</p></CardContent></Card><Card className="bg-muted/30"><CardContent className="p-3"><p className="text-lg font-semibold">Priya Nair</p><p className="text-[10px] text-muted-foreground">Coordinator</p></CardContent></Card></div>{allocated.map(team => <button key={team[0]} onClick={() => toast(`${team[1]} selected`, { description: "Open the Teams view for complete timeline details." })} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-left hover:bg-muted/30"><div><p className="text-sm font-medium">{team[1]}</p><p className="text-[10px] text-muted-foreground">{team[0]} · {team[6]} members</p></div><StatusBadge status={team[4]} /></button>)}</div></DialogContent></Dialog> }

export default function HackOps() { const [view, setView] = useState<View>("dashboard"); const [mobileOpen, setMobileOpen] = useState(false); const title = { dashboard: "Operations overview", teams: "Team directory", rooms: "Room operations", evaluations: "Evaluation control", officials: "Officials details" }[view]; const subtitle = { dashboard: "Live view of HackOps activity", teams: "Searchable public team records", rooms: "Staffing and allocation coverage", evaluations: "Round 1 judging progress", officials: "Coordinators, leads and room ownership" }[view]; const Sidebar = () => <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border/60 bg-sidebar"><div className="flex h-14 items-center gap-2.5 border-b border-border/50 px-4"><div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><BarChart3 className="size-4" /></div><div><p className="text-sm font-semibold">HackOps</p><p className="text-[10px] text-muted-foreground">VIT Hackathon · 2026</p></div></div><div className="px-3 py-4"><p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</p><nav className="flex flex-col gap-1">{navItems.map(([id, label, Icon]) => <button key={id} onClick={() => { setView(id); setMobileOpen(false) }} className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs ${view === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><Icon className="size-4" />{label}</button>)}</nav></div><div className="px-3"><Separator /><div className="mt-4 rounded-md border border-primary/15 bg-primary/5 p-3"><div className="flex items-center gap-2 text-xs font-medium"><span className="size-1.5 rounded-full bg-emerald-400" />Round 1 is live</div><p className="mt-2 text-[10px] text-muted-foreground">Evaluation window closes today at 18:00.</p></div></div><div className="mt-auto border-t border-border/50 p-3"><SignedInNotice /><button onClick={() => toast("Admin tools", { description: "Available to authorized leads." })} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted/60"><Settings2 className="size-4" />Admin tools<AdminRoleBadge /></button></div></aside>; return <div className="flex h-dvh min-h-0 overflow-hidden bg-background"><div className="hidden md:block"><Sidebar /></div><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-[250px] p-0"><SheetTitle className="sr-only">HackOps navigation</SheetTitle><Sidebar /></SheetContent></Sheet><main className="flex min-w-0 flex-1 flex-col"><header className="flex min-h-14 items-center gap-3 border-b border-border/60 px-4 md:px-6"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu /></Button><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate text-sm font-semibold">{title}</h1><Badge variant="outline" className="hidden border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400 sm:inline-flex">Live</Badge></div><p className="truncate text-[10px] text-muted-foreground">{subtitle}</p></div><OfficialSession /></header><div className="flex-1 overflow-y-auto"><div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 md:p-6"><LiveDateTime title={title} subtitle={subtitle} />{view === "dashboard" ? <OperationsDashboard setView={setView} /> : view === "teams" ? <TeamsDirectory /> : view === "rooms" ? <RoomsDirectory /> : view === "evaluations" ? <EvaluationsBoard /> : view === "officials" ? <OfficialsDirectory /> : null}</div></div></main></div> }

export { X }
