"use client";

import { useState } from "react";
import {
  UserPlus,
  Copy,
  Trash2,
  Loader2,
  Mail,
  Check,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { createInvite } from "@/app/actions/invite";
import {
  useUsers,
  useInvites,
  useCommitments,
  useUserRealms,
  useDeleteInvite,
  useAssignUserCommitments,
  queryKeys,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useRealm } from "@/contexts/realm-context";
import type { Profile } from "@/types/database";

export function UsersManager() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedCommitments, setSelectedCommitments] = useState<string[]>([]);
  const supabase = createClient();
  const { currentRealm } = useRealm();

  // React Query
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: invites = [], isLoading: loadingInvites } = useInvites();
  const { data: commitments = [] } = useCommitments();
  const { data: userRealms = [] } = useUserRealms();

  const deleteInviteMutation = useDeleteInvite();
  const assignCommitmentsMutation = useAssignUserCommitments();

  // Get user IDs in current realm
  const usersInCurrentRealm = new Set(
    userRealms
      .filter((ur) => !currentRealm || ur.realm_id === currentRealm.id)
      .map((ur) => ur.user_id)
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRealm) {
      toast.error("Please select a realm first");
      return;
    }

    setInviteLoading(true);

    const result = await createInvite({
      email: inviteEmail,
      realmId: currentRealm.id,
      realmName: currentRealm.name,
    });

    if (!result.success) {
      toast.error(result.error || "Failed to create invite");
    } else {
      if (result.addedDirectly) {
        toast.success(`${inviteEmail} added to realm!`);
      } else {
        toast.success(`Invite sent to ${inviteEmail}!`);
      }
      setInviteEmail("");
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
      queryClient.invalidateQueries({ queryKey: queryKeys.userRealms });
    }

    setInviteLoading(false);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      await deleteInviteMutation.mutateAsync(id);
      toast.success("Invite deleted");
    } catch {
      toast.error("Failed to delete invite");
    }
  };

  const openAssignDialog = async (user: Profile) => {
    setSelectedUser(user);

    // Fetch user's current commitments
    const { data } = await supabase
      .from("user_commitments")
      .select("commitment_id")
      .eq("user_id", user.id);

    setSelectedCommitments(data?.map((uc) => uc.commitment_id) || []);
    setAssignDialogOpen(true);
  };

  const handleAssignCommitments = async () => {
    if (!selectedUser) return;

    try {
      await assignCommitmentsMutation.mutateAsync({
        userId: selectedUser.id,
        commitmentIds: selectedCommitments,
      });
      toast.success("Commitments updated!");
      setAssignDialogOpen(false);
    } catch {
      toast.error("Failed to assign commitments");
    }
  };

  // Filter by current realm using user_realms
  const realmUsers = currentRealm
    ? users.filter((u) => usersInCurrentRealm.has(u.id))
    : users;
  const pendingInvites = invites.filter(
    (i) => !i.used && (!currentRealm || i.realm_id === currentRealm.id)
  );
  // Filter commitments by current realm
  const realmCommitments = currentRealm
    ? commitments.filter((c) => c.realm_id === currentRealm.id && c.is_active)
    : commitments.filter((c) => c.is_active);

  const isLoading = loadingUsers || loadingInvites;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
          <CardDescription>
            Send an invite to add a new user to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invite.token)}
                        >
                          {copiedToken === invite.token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInvite(invite.id)}
                          disabled={
                            deleteInviteMutation.isPending &&
                            deleteInviteMutation.variables === invite.id
                          }
                        >
                          {deleteInviteMutation.isPending &&
                          deleteInviteMutation.variables === invite.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {realmUsers.length} registered users{currentRealm ? ` in ${currentRealm.name}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realmUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No users yet. Send an invite to get started!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realmUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          avatarUrl={user.avatar_url}
                          className="h-8 w-8"
                        />
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssignDialog(user)}
                      >
                        <Dumbbell className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Commitments Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Commitments</DialogTitle>
            <DialogDescription>
              Select which commitments to assign to {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {realmCommitments.length === 0 ? (
              <p className="text-muted-foreground text-center">
                No commitments in this realm yet.
              </p>
            ) : (
              realmCommitments.map((commitment) => (
                <div
                  key={commitment.id}
                  className="flex items-center space-x-3"
                >
                  <Checkbox
                    id={commitment.id}
                    checked={selectedCommitments.includes(commitment.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCommitments([
                          ...selectedCommitments,
                          commitment.id,
                        ]);
                      } else {
                        setSelectedCommitments(
                          selectedCommitments.filter((id) => id !== commitment.id)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={commitment.id} className="flex-1">
                    <span className="font-medium">{commitment.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({commitment.daily_target} {commitment.unit}/day)
                    </span>
                  </Label>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignCommitments}
              disabled={assignCommitmentsMutation.isPending}
            >
              {assignCommitmentsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
