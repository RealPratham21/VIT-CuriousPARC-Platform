"use client"

import { useEffect, useState } from "react"
import { Loader2, UserRound } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listOfficials, officialRoles, type OfficialRecord } from "@/lib/officials"

export function OfficialsDirectory() {
  const [officials, setOfficials] = useState<OfficialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    listOfficials()
      .then((result) => {
        if (!active) return
        setOfficials(result)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Could not load officials.")
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="text-sm">Officials directory</CardTitle>
        <p className="text-xs text-muted-foreground">Coordinators, leads, and the rooms they are staffing.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading officials
          </div>
        ) : null}
        {error ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </Button>
          </div>
        ) : null}
        {!loading && !error && officials.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No officials are assigned to this event.</p>
        ) : null}
        {!loading && !error && officials.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {officials.map((official) => (
              <Card key={official.id} className="border-border/50 bg-background/40">
                <CardContent className="flex gap-3 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{official.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {officialRoles(official.roles)}
                      {official.rooms.length > 0 ? ` · managing ${official.managed_team_count} teams` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {official.rooms.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground">No room assigned</span>
                      ) : (
                        official.rooms.map((room) => (
                          <span key={room.id} className="rounded border border-border/60 px-2 py-1 font-mono text-[10px] text-primary">
                            {room.code}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
