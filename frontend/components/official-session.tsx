"use client"

import { useState, type FormEvent } from "react"
import { Loader2, LogIn, LogOut, ShieldCheck } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { primaryRole, roleLabel } from "@/lib/auth"

export function OfficialSession() {
  const { user, status, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const role = user ? primaryRole(user) : null

  if (status === "loading") {
    return (
      <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
        <Loader2 className="animate-spin" data-icon="inline-start" />
        <span className="hidden sm:inline">Checking session</span>
      </Button>
    )
  }

  if (!user) {
    return (
      <>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
          <LogIn data-icon="inline-start" />
          <span className="hidden sm:inline">Official login</span>
          <span className="sr-only sm:hidden">Official login</span>
        </Button>
        <LoginDialog open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 max-w-[16rem] text-xs">
          <ShieldCheck data-icon="inline-start" />
          <span className="truncate">{user.full_name}</span>
          {role ? (
            <Badge variant="outline" className="hidden text-[9px] sm:inline-flex">
              {roleLabel(role)}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-medium">{user.full_name}</p>
          <p className="font-mono text-[11px] font-normal text-muted-foreground">{user.staff_code}</p>
          {role ? <p className="text-[11px] font-normal text-muted-foreground">{roleLabel(role)} · CuriousPARC 2026</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SignedInNotice() {
  const { user, status } = useAuth()
  if (status !== "ready" || !user) return null
  const role = primaryRole(user)
  return (
    <div className="mb-3 rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Signed in</p>
      <p className="mt-1 truncate text-xs font-medium">{user.full_name}</p>
      <p className="truncate font-mono text-[10px] text-muted-foreground">
        {user.staff_code}
        {role ? ` · ${roleLabel(role)}` : ""}
      </p>
    </div>
  )
}

export function AdminRoleBadge() {
  const { user } = useAuth()
  const role = user ? primaryRole(user) : null
  return (
    <Badge variant="outline" className="ml-auto text-[9px]">
      {role ? roleLabel(role) : "Lead"}
    </Badge>
  )
}

function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { login } = useAuth()
  const [staffCode, setStaffCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!staffCode.trim() || !password) {
      setError("Enter your staff code and password.")
      return
    }
    setPending(true)
    setError(null)
    try {
      await login(staffCode.trim(), password)
      setStaffCode("")
      setPassword("")
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
        if (!next) setError(null)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Official login</DialogTitle>
          <DialogDescription>
            Sign in with your staff code. Visitors can keep using the public board without an account.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-code" className="text-xs">
              Staff code
            </Label>
            <Input
              id="staff-code"
              value={staffCode}
              onChange={(event) => setStaffCode(event.target.value)}
              autoComplete="username"
              autoFocus
              className="h-9 text-sm"
              placeholder="HC-ADMIN-001"
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-password" className="text-xs">
              Password
            </Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="h-9 text-sm"
              disabled={pending}
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}
              {pending ? "Signing in" : "Sign in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
