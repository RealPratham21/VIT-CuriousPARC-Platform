"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Search,
  Building2,
  Plus,
  Activity,
  UserPlus,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useOrbit } from "./orbit-provider";
import { getHealthStatus, formatCurrency, type Account } from "@/lib/mock-data";
import type { ViewType } from "./command-dock";

interface CommandKMenuProps {
  onSelectView: (view: ViewType) => void;
  onSelectAccount: (account: Account) => void;
  onCreateAccount: () => void;
}

export function CommandKMenu({
  onSelectView,
  onSelectAccount,
  onCreateAccount,
}: CommandKMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { accounts } = useOrbit();

  const activeAccounts = accounts.filter((acc) => !acc.isArchived);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // New account shortcut
      if (e.key === "n" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        onCreateAccount();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onCreateAccount]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!search) {
      // Show most recently active accounts
      return [...activeAccounts]
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, 5);
    }
    const query = search.toLowerCase();
    return activeAccounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        acc.industry.toLowerCase().includes(query) ||
        acc.tier.toLowerCase().includes(query)
    );
  }, [search, activeAccounts]);

  // At-risk accounts for quick access
  const atRiskAccounts = useMemo(() => {
    return activeAccounts
      .filter((acc) => acc.healthScore < 50)
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 3);
  }, [activeAccounts]);

  const handleSelectView = (view: ViewType) => {
    onSelectView(view);
    setOpen(false);
    setSearch("");
  };

  const handleSelectAccount = (account: Account) => {
    onSelectAccount(account);
    setOpen(false);
    setSearch("");
  };

  const handleCreateAccount = () => {
    onCreateAccount();
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/80 transition-all"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="ml-2 px-1.5 py-0.5 bg-background border border-border rounded text-xs font-mono">
          <span className="text-muted-foreground">Cmd</span> K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Menu"
        description="Search accounts or navigate to different views"
      >
        <CommandInput
          placeholder="Search accounts, actions, navigate..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[450px]">
          <CommandEmpty>
            <div className="flex flex-col items-center py-6">
              <Search className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          </CommandEmpty>

          {/* Quick actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={handleCreateAccount}>
              <Plus className="mr-2 h-4 w-4 text-primary" />
              <span>Create New Account</span>
              <CommandShortcut>Cmd N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleSelectView("dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Go to Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelectView("accounts")}>
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>View All Accounts</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelectView("analytics")}>
              <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Open Analytics</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelectView("settings")}>
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>

          {/* At-risk accounts - show only when not searching */}
          {!search && atRiskAccounts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Needs Attention">
                {atRiskAccounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={`at-risk-${account.name}`}
                    onSelect={() => handleSelectAccount(account)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          account.healthScore < 30 ? "bg-destructive" : "bg-warning"
                        )}
                      />
                      <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground">
                          {account.name}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-mono px-2 py-0.5 rounded-full",
                          account.healthScore < 30
                            ? "badge-critical"
                            : "badge-warning"
                        )}
                      >
                        {account.healthScore}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          {/* Accounts */}
          <CommandGroup heading={search ? "Accounts" : "Recent Accounts"}>
            {filteredAccounts.map((account) => {
              const healthStatus = getHealthStatus(account.healthScore);
              return (
                <CommandItem
                  key={account.id}
                  value={`${account.name} ${account.industry} ${account.tier}`}
                  onSelect={() => handleSelectAccount(account)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        healthStatus === "healthy" && "bg-success",
                        healthStatus === "neutral" && "bg-primary",
                        healthStatus === "at-risk" && "bg-warning",
                        healthStatus === "critical" && "bg-destructive"
                      )}
                    />
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">
                        {account.name}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {account.industry}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatCurrency(account.arr)}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {/* Show "Create" option when searching and no exact match */}
          {search && filteredAccounts.length === 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Create">
                <CommandItem onSelect={handleCreateAccount}>
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  <span>
                    Create new account{" "}
                    <span className="text-primary font-medium">"{search}"</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
