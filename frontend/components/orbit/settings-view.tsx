"use client";

import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useOrbit } from "./orbit-provider";
import { useToastActions } from "./toast-provider";
import { User, Bell, Shield, Palette, Database, Keyboard, HelpCircle, ChevronRight, Moon, Sun, Check } from "lucide-react";

interface SettingsSectionProps {
  icon: typeof User;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <div className="card-surface p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsView() {
  const { resetToDefaults } = useOrbit();
  const { showToast } = useToastActions();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [atRiskAlerts, setAtRiskAlerts] = useState(true);
  const [healthThreshold, setHealthThreshold] = useState("50");
  const [displayName, setDisplayName] = useState("Sarah Chen");
  const [email, setEmail] = useState("sarah.chen@company.com");
  const [role, setRole] = useState("Customer Success Manager");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    toast.success("Settings saved successfully"); // Use toast here
  };

  const shortcuts = [
    { keys: ["Ctrl/Cmd", "K"], action: "Open Command Menu" },
    { keys: ["Ctrl/Cmd", "N"], action: "Create New Account" },
    { keys: ["Esc"], action: "Close Modal / Deselect" },
    { keys: ["?"], action: "Show Keyboard Shortcuts" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your preferences and account settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Profile Section */}
      <SettingsSection
        icon={User}
        title="Profile"
        description="Your personal information and account details"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="role" className="text-sm font-medium">
              Role
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-muted/50"
            />
          </div>
        </div>
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Configure how you receive alerts and updates"
      >
        <SettingsRow
          label="Email Notifications"
          description="Receive updates via email"
        >
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </SettingsRow>
        <SettingsRow
          label="Push Notifications"
          description="Browser notifications for important updates"
        >
          <Switch
            checked={pushNotifications}
            onCheckedChange={setPushNotifications}
          />
        </SettingsRow>
        <SettingsRow
          label="Weekly Digest"
          description="Summary of portfolio activity every Monday"
        >
          <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
        </SettingsRow>
        <SettingsRow
          label="At-Risk Account Alerts"
          description="Immediate notification when accounts drop below threshold"
        >
          <Switch checked={atRiskAlerts} onCheckedChange={setAtRiskAlerts} />
        </SettingsRow>
      </SettingsSection>

      {/* Health Thresholds */}
      <SettingsSection
        icon={Shield}
        title="Health Thresholds"
        description="Configure when accounts are flagged as at-risk"
      >
        <SettingsRow
          label="At-Risk Threshold"
          description="Accounts below this score are flagged as at-risk"
        >
          <Select value={healthThreshold} onValueChange={setHealthThreshold}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="60">60</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            Current threshold:{" "}
            <span className="font-medium text-foreground">
              Health Score {"<"} {healthThreshold}
            </span>
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                style={{ width: "100%" }}
              />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>0</span>
              <span className="text-destructive font-medium">
                {healthThreshold}
              </span>
              <span>100</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        icon={Palette}
        title="Appearance"
        description="Customize how ORBIT looks"
      >
        <SettingsRow label="Theme" description="Choose your preferred color scheme">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2",
                "border-primary bg-accent text-primary"
              )}
            >
              <Sun className="w-4 h-4" />
              Light
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled>
              <Moon className="w-4 h-4" />
              Dark
            </Button>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Compact Mode"
          description="Reduce spacing for denser information display"
        >
          <Switch checked={false} onCheckedChange={() => {}} />
        </SettingsRow>
      </SettingsSection>

      {/* Keyboard Shortcuts */}
      <SettingsSection
        icon={Keyboard}
        title="Keyboard Shortcuts"
        description="Quick actions to navigate ORBIT faster"
      >
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
            >
              <span className="text-sm text-foreground">{shortcut.action}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Data & Privacy */}
      <SettingsSection
        icon={Database}
        title="Data & Privacy"
        description="Manage your data and export options"
      >
        <SettingsRow
          label="Export Data"
          description="Download all your account data as CSV"
        >
          <Button variant="outline" size="sm">
            Export
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Activity Log"
          description="View your recent actions in ORBIT"
        >
          <Button variant="ghost" size="sm" className="gap-1">
            View
            <ChevronRight className="w-4 h-4" />
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Reset All Data"
          description="Clear all cached data and restore to default demo accounts"
        >
          <Button 
            variant="outline" 
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive bg-transparent"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset all data? This will restore the default demo accounts and clear any changes you have made.')) {
                resetToDefaults();
                toast.success('Data reset to defaults');
              }
            }}
          >
            Reset Data
          </Button>
        </SettingsRow>
      </SettingsSection>

      {/* Help */}
      <SettingsSection
        icon={HelpCircle}
        title="Help & Support"
        description="Get help and learn more about ORBIT"
      >
        <SettingsRow
          label="Documentation"
          description="Learn how to use ORBIT effectively"
        >
          <Button variant="ghost" size="sm" className="gap-1">
            Open
            <ChevronRight className="w-4 h-4" />
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Contact Support"
          description="Reach out to our team for assistance"
        >
          <Button variant="ghost" size="sm" className="gap-1">
            Contact
            <ChevronRight className="w-4 h-4" />
          </Button>
        </SettingsRow>
        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            ORBIT v1.0.0 | Built with care for Customer Success teams
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
