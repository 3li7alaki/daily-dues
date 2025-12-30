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

import { createClient } from "@/lib/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile, Invite, Commitment } from "@/types/database";

interface UsersManagerProps {
  users: Profile[];
  invites: Invite[];
  commitments: Commitment[];
}

export function UsersManager({ users, invites, commitments }: UsersManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedCommitments, setSelectedCommitments] = useState<string[]>([]);
  const supabase = createClient();

  const generateToken = () => {
    return crypto.randomUUID();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("invites").insert({
      email: inviteEmail,
      token,
      invited_by: user!.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to create invite");
    } else {
      toast.success("Invite created!");
      setInviteEmail("");
      window.location.reload();
    }

    setLoading(false);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase.from("invites").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete invite");
    } else {
      toast.success("Invite deleted");
      window.location.reload();
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
    setLoading(true);

    // Delete existing assignments
    await supabase
      .from("user_commitments")
      .delete()
      .eq("user_id", selectedUser.id);

    // Create new assignments
    if (selectedCommitments.length > 0) {
      const { error } = await supabase.from("user_commitments").insert(
        selectedCommitments.map((commitmentId) => ({
          user_id: selectedUser.id,
          commitment_id: commitmentId,
        }))
      );

      if (error) {
        toast.error("Failed to assign commitments");
        setLoading(false);
        return;
      }
    }

    toast.success("Commitments updated!");
    setAssignDialogOpen(false);
    setLoading(false);
  };

  const pendingInvites = invites.filter((i) => !i.used);

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
            <Button type="submit" disabled={loading}>
              {loading ? (
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
                          onClick={() => deleteInvite(invite.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
          <CardDescription>{users.length} registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No users yet. Send an invite to get started!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Streak</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.current_streak} days</Badge>
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
            {commitments.length === 0 ? (
              <p className="text-muted-foreground text-center">
                No commitments created yet.
              </p>
            ) : (
              commitments.map((commitment) => (
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
            <Button onClick={handleAssignCommitments} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
