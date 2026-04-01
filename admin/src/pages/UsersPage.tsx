/**
 * Users Page — CMS User Role Management
 *
 * Lists all CMS users with their roles and status.
 * Admins can change roles, invite new users, and revoke access.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useApi } from "../embed/contexts/ApiContext";
import { useAuth } from "../contexts/AuthContext";
import { useAdminConfig } from "../contexts";
import { CmsPageHeader } from "../components/cmsds/CmsPageHeader";
import { CmsButton } from "../components/cmsds/CmsButton";
import { CmsDialog } from "../components/cmsds/CmsDialog";
import { CmsEmptyState } from "../components/cmsds/CmsEmptyState";
import { CmsSurface } from "../components/cmsds/CmsSurface";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../lib/cn";
import {
  Users,
  Mail,
  Shield,
  ShieldCheck,
  UserPlus,
  Search,
  Ban,
} from "lucide-react";

const BUILT_IN_ROLES = [
  { value: "admin", label: "Admin", description: "Full access" },
  { value: "editor", label: "Editor", description: "Manage all content" },
  { value: "author", label: "Author", description: "Manage own content" },
  { value: "viewer", label: "Viewer", description: "Read-only" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  invited: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  revoked: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function UsersPage() {
  const api = useApi();
  const { user: currentUser } = useAuth();
  const config = useAdminConfig();

  const roleOptions = useMemo(() => {
    const custom = (config.customRoles ?? []).map((r) => ({
      value: r.value,
      label: r.label,
      description: r.description,
    }));
    if (config.overrideBuiltInRoles && custom.length > 0) {
      return custom;
    }
    return [...BUILT_IN_ROLES, ...custom];
  }, [config.customRoles, config.overrideBuiltInRoles]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteLoading, setInviteLoading] = useState(false);

  const usersResult = useQuery(api.listCmsUsers, {
    role: roleFilter !== "all" ? roleFilter : undefined,
    search: search || undefined,
  });

  const setRoleMutation = useMutation(api.setCmsUserRole);
  const inviteMutation = useMutation(api.inviteCmsUser);
  const revokeMutation = useMutation(api.removeCmsUser);

  const users: Array<{
    _id: string;
    externalUserId: string;
    role: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    lastAccessedAt?: number;
    createdAt: number;
    status: "active" | "invited" | "revoked";
  }> = usersResult ?? [];

  const handleRoleChange = useCallback(
    async (externalUserId: string, newRole: string) => {
      await setRoleMutation({ externalUserId, role: newRole });
    },
    [setRoleMutation]
  );

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await inviteMutation({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("editor");
      setIsInviteOpen(false);
    } finally {
      setInviteLoading(false);
    }
  }, [inviteMutation, inviteEmail, inviteRole]);

  const handleRevoke = useCallback(
    async (externalUserId: string) => {
      await revokeMutation({ externalUserId });
    },
    [revokeMutation]
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <CmsPageHeader
          title="Users"
          description="Manage CMS user roles and access"
        />
        <CmsButton onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </CmsButton>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleOptions.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users table */}
      {users.length === 0 ? (
        <CmsEmptyState
          icon={<Users className="h-12 w-12" />}
          title="No users yet"
          description="Users are automatically registered when they access the CMS. You can also invite users by email."
          action={{
            label: "Invite User",
            onClick: () => setIsInviteOpen(true),
          }}
        />
      ) : (
        <CmsSurface>
          <div className="divide-y divide-border">
            {users.map((user) => {
              const isCurrentUser = currentUser?.id === user.externalUserId;
              return (
                <div
                  key={user._id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                      {user.displayName?.[0]?.toUpperCase() ??
                        user.email?.[0]?.toUpperCase() ??
                        "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {user.displayName ?? user.email ?? user.externalUserId}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      {user.email && user.displayName && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status + Role + Last seen */}
                  <div className="flex items-center gap-4 shrink-0">
                    <Badge
                      className={cn(
                        "text-[10px] capitalize",
                        STATUS_COLORS[user.status] ?? STATUS_COLORS.active
                      )}
                    >
                      {user.status}
                    </Badge>

                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {formatTimeAgo(user.lastAccessedAt)}
                    </span>

                    {/* Role selector */}
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        handleRoleChange(user.externalUserId, value)
                      }
                      disabled={isCurrentUser || user.status === "revoked"}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              {role.value === "admin" ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Revoke button */}
                    {!isCurrentUser && user.status !== "revoked" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(user.externalUserId)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Revoke access"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CmsSurface>
      )}

      {/* Invite Dialog */}
      <CmsDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Invite User"
        description="Pre-assign a CMS role to a user by their email. They'll get access when they sign in."
        footer={
          <div className="flex justify-end gap-2">
            <CmsButton
              variant="outline"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </CmsButton>
            <CmsButton
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviteLoading}
            >
              {inviteLoading ? "Inviting..." : "Send Invite"}
            </CmsButton>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label} — {role.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CmsDialog>
    </div>
  );
}
