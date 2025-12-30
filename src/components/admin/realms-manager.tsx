"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Users,
  Loader2,
  Building2,
  Globe,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useRealms,
  useUserRealms,
  useCreateRealm,
  useUpdateRealm,
  useDeleteRealm,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RealmAvatar } from "@/components/realm-avatar";
import { Badge } from "@/components/ui/badge";
import type { Realm } from "@/types/database";

interface RealmForm {
  name: string;
  slug: string;
  avatar_url: string;
}

const defaultForm: RealmForm = {
  name: "",
  slug: "",
  avatar_url: "",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function RealmsManager() {
  const [form, setForm] = useState<RealmForm>(defaultForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [realmToDelete, setRealmToDelete] = useState<Realm | null>(null);

  // React Query
  const { data: realms = [], isLoading: loadingRealms } = useRealms();
  const { data: userRealms = [] } = useUserRealms();

  const createRealmMutation = useCreateRealm();
  const updateRealmMutation = useUpdateRealm();
  const deleteRealmMutation = useDeleteRealm();

  // Compute member counts from userRealms
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userRealms.forEach((ur) => {
      counts[ur.realm_id] = (counts[ur.realm_id] || 0) + 1;
    });
    return counts;
  }, [userRealms]);

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      slug: editingId ? form.slug : generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateRealmMutation.mutateAsync({
          id: editingId,
          name: form.name,
          slug: form.slug,
          avatar_url: form.avatar_url || null,
        });
        toast.success("Realm updated!");
      } else {
        await createRealmMutation.mutateAsync({
          name: form.name,
          slug: form.slug,
          avatar_url: form.avatar_url || undefined,
        });
        toast.success("Realm created!");
      }
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingId(null);
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === "23505") {
        toast.error("A realm with this slug already exists");
      } else {
        toast.error(err.message || "Failed to save realm");
      }
    }
  };

  const openEditDialog = (realm: Realm) => {
    setForm({
      name: realm.name,
      slug: realm.slug,
      avatar_url: realm.avatar_url || "",
    });
    setEditingId(realm.id);
    setDialogOpen(true);
  };

  const openDeleteDialog = (realm: Realm) => {
    setRealmToDelete(realm);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!realmToDelete) return;

    try {
      await deleteRealmMutation.mutateAsync(realmToDelete.id);
      toast.success("Realm deleted");
      setDeleteDialogOpen(false);
      setRealmToDelete(null);
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete realm");
    }
  };

  const isLoading = createRealmMutation.isPending || updateRealmMutation.isPending;

  if (loadingRealms) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm(defaultForm);
            setEditingId(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Realm
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Realm" : "Create Realm"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the realm details"
                  : "Create a new realm for your team or organization"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Realm Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Engineering Team"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    placeholder="engineering-team"
                    value={form.slug}
                    onChange={(e) =>
                      setForm({ ...form, slug: generateSlug(e.target.value) })
                    }
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used in invite links and URLs
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL (optional)</Label>
                <Input
                  id="avatar"
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  value={form.avatar_url}
                  onChange={(e) =>
                    setForm({ ...form, avatar_url: e.target.value })
                  }
                />
                {form.avatar_url && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Preview:</span>
                    <RealmAvatar
                      name={form.name || "R"}
                      avatarUrl={form.avatar_url}
                      className="h-8 w-8"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading || !form.name || !form.slug}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Realms List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {realms.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No realms created yet. Create one to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {realms.map((realm, index) => (
              <motion.div
                key={realm.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <RealmAvatar
                          name={realm.name}
                          avatarUrl={realm.avatar_url}
                          className="h-10 w-10"
                        />
                        <div>
                          <CardTitle className="text-lg">{realm.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            /{realm.slug}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{memberCounts[realm.id] || 0} members</span>
                      </div>
                      <Badge variant="secondary">
                        {new Date(realm.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(realm)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => openDeleteDialog(realm)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Realm</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{realmToDelete?.name}</strong>?
              This will also delete all commitments, user assignments, and invites
              associated with this realm. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRealmMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteRealmMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRealmMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
