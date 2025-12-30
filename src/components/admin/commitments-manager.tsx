"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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

import { createClient } from "@/lib/supabase/client";
import { BAHRAIN_WORK_DAYS, DAY_NAMES } from "@/lib/carry-over";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Commitment } from "@/types/database";

interface CommitmentsManagerProps {
  commitments: Commitment[];
}

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

export function CommitmentsManager({ commitments }: CommitmentsManagerProps) {
  const [form, setForm] = useState<CommitmentForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (editingId) {
      // Update existing
      const { error } = await supabase
        .from("commitments")
        .update({
          ...form,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update commitment");
      } else {
        toast.success("Commitment updated!");
      }
    } else {
      // Create new
      const { error } = await supabase.from("commitments").insert({
        ...form,
        created_by: user!.id,
      });

      if (error) {
        toast.error("Failed to create commitment");
      } else {
        toast.success("Commitment created!");
      }
    }

    setLoading(false);
    setDialogOpen(false);
    setForm(defaultForm);
    setEditingId(null);
    window.location.reload();
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
    const { error } = await supabase
      .from("commitments")
      .update({ is_active: !commitment.is_active })
      .eq("id", commitment.id);

    if (error) {
      toast.error("Failed to toggle status");
    } else {
      toast.success(commitment.is_active ? "Commitment deactivated" : "Commitment activated");
      window.location.reload();
    }
  };

  const deleteCommitment = async (id: string) => {
    if (!confirm("Are you sure? This will remove the commitment from all users.")) {
      return;
    }

    const { error } = await supabase.from("commitments").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete commitment");
    } else {
      toast.success("Commitment deleted");
      window.location.reload();
    }
  };

  const toggleDay = (day: number) => {
    if (form.active_days.includes(day)) {
      setForm({ ...form, active_days: form.active_days.filter((d) => d !== day) });
    } else {
      setForm({ ...form, active_days: [...form.active_days, day].sort() });
    }
  };

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
              <Button type="submit" disabled={loading}>
                {loading ? (
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
        {commitments.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No commitments created yet. Create one to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          commitments.map((commitment, index) => (
            <motion.div
              key={commitment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
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
                    >
                      {commitment.is_active ? (
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
                      onClick={() => deleteCommitment(commitment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
