"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Loader2,
  Dumbbell,
  Edit,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

import { BAHRAIN_WORK_DAYS, DAY_NAMES } from "@/lib/carry-over";
import {
  useCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useToggleCommitmentActive,
  useDeleteCommitment,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useRealm } from "@/contexts/realm-context";
import type { Commitment } from "@/types/database";

interface CommitmentForm {
  name: string;
  description: string;
  daily_target: number;
  unit: string;
  active_days: number[];
  punishment_multiplier: number;
}

const defaultForm: CommitmentForm = {
  name: "",
  description: "",
  daily_target: 10,
  unit: "reps",
  active_days: BAHRAIN_WORK_DAYS,
  punishment_multiplier: 2,
};

export function CommitmentsManager() {
  const [form, setForm] = useState<CommitmentForm>(defaultForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commitmentToDelete, setCommitmentToDelete] = useState<Commitment | null>(null);
  const { currentRealm } = useRealm();

  // React Query
  const { data: commitments = [], isLoading: loadingCommitments } = useCommitments();
  const createCommitmentMutation = useCreateCommitment();
  const updateCommitmentMutation = useUpdateCommitment();
  const toggleActiveMutation = useToggleCommitmentActive();
  const deleteCommitmentMutation = useDeleteCommitment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRealm) {
      toast.error("Please select a realm first");
      return;
    }

    try {
      if (editingId) {
        await updateCommitmentMutation.mutateAsync({
          id: editingId,
          ...form,
        });
        toast.success("Commitment updated!");
      } else {
        await createCommitmentMutation.mutateAsync({
          ...form,
          realm_id: currentRealm.id,
        });
        toast.success(`Commitment created in ${currentRealm.name}!`);
      }
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingId(null);
    } catch {
      toast.error(editingId ? "Failed to update commitment" : "Failed to create commitment");
    }
  };

  const openEditDialog = (commitment: Commitment) => {
    setForm({
      name: commitment.name,
      description: commitment.description || "",
      daily_target: commitment.daily_target,
      unit: commitment.unit,
      active_days: commitment.active_days,
      punishment_multiplier: commitment.punishment_multiplier,
    });
    setEditingId(commitment.id);
    setDialogOpen(true);
  };

  const toggleActive = async (commitment: Commitment) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: commitment.id,
        is_active: !commitment.is_active,
      });
      toast.success(commitment.is_active ? "Commitment deactivated" : "Commitment activated");
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const openDeleteDialog = (commitment: Commitment) => {
    setCommitmentToDelete(commitment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCommitment = async () => {
    if (!commitmentToDelete) return;

    try {
      await deleteCommitmentMutation.mutateAsync(commitmentToDelete.id);
      toast.success("Commitment deleted");
      setDeleteDialogOpen(false);
      setCommitmentToDelete(null);
    } catch {
      toast.error("Failed to delete commitment");
    }
  };

  const toggleDay = (day: number) => {
    if (form.active_days.includes(day)) {
      setForm({ ...form, active_days: form.active_days.filter((d) => d !== day) });
    } else {
      setForm({ ...form, active_days: [...form.active_days, day].sort() });
    }
  };

  // Filter by current realm
  const realmCommitments = currentRealm
    ? commitments.filter((c) => c.realm_id === currentRealm.id)
    : commitments;

  const isLoading = createCommitmentMutation.isPending || updateCommitmentMutation.isPending;

  if (loadingCommitments) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setForm(defaultForm);
          setEditingId(null);
        }
      }}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Commitment
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Commitment" : "Create Commitment"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the commitment details"
                  : "Set up a new daily commitment for users"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Push-ups"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Daily Target</Label>
                  <Input
                    id="target"
                    type="number"
                    min={1}
                    value={form.daily_target}
                    onChange={(e) =>
                      setForm({ ...form, daily_target: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., reps, pages"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplier">Punishment Multiplier</Label>
                <Input
                  id="multiplier"
                  type="number"
                  min={1}
                  step={0.5}
                  value={form.punishment_multiplier}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      punishment_multiplier: parseFloat(e.target.value) || 2,
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Missed = (missed × multiplier) + daily target
                </p>
              </div>
              <div className="space-y-2">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_NAMES.map((day, index) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${index}`}
                        checked={form.active_days.includes(index)}
                        onCheckedChange={() => toggleDay(index)}
                      />
                      <Label
                        htmlFor={`day-${index}`}
                        className="text-sm cursor-pointer"
                      >
                        {day.slice(0, 3)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
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

      {/* Commitments List */}
      <div className="grid gap-4 md:grid-cols-2">
        {realmCommitments.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No commitments{currentRealm ? ` in ${currentRealm.name}` : ""} yet. Create one to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {realmCommitments.map((commitment, index) => (
              <motion.div
                key={commitment.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={!commitment.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {commitment.name}
                          {!commitment.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        {commitment.description && (
                          <CardDescription>{commitment.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Daily Target</p>
                        <p className="font-medium">
                          {commitment.daily_target} {commitment.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Multiplier</p>
                        <p className="font-medium">{commitment.punishment_multiplier}x</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active Days</p>
                      <div className="flex flex-wrap gap-1">
                        {commitment.active_days.map((day) => (
                          <Badge key={day} variant="outline" className="text-xs">
                            {DAY_NAMES[day].slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(commitment)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(commitment)}
                        disabled={
                          toggleActiveMutation.isPending &&
                          toggleActiveMutation.variables?.id === commitment.id
                        }
                      >
                        {toggleActiveMutation.isPending &&
                        toggleActiveMutation.variables?.id === commitment.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : commitment.is_active ? (
                          <>
                            <ToggleRight className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(commitment)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
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
            <AlertDialogTitle>Delete Commitment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{commitmentToDelete?.name}</strong>?
              This will remove the commitment from all users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCommitmentMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCommitment}
              disabled={deleteCommitmentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCommitmentMutation.isPending ? (
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
