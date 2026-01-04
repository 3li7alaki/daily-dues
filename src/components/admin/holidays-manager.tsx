"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, Calendar, User, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useUsers,
} from "@/lib/queries";
import { useRealm } from "@/contexts/realm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import type { Holiday } from "@/types/database";

interface HolidayForm {
  date: string;
  description: string;
  user_id: string | null; // null = realm-wide
}

const defaultForm: HolidayForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  user_id: null,
};

export function HolidaysManager() {
  const [form, setForm] = useState<HolidayForm>(defaultForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const { currentRealm } = useRealm();

  // React Query
  const { data: holidays = [], isLoading: loadingHolidays } = useHolidays(
    currentRealm?.id
  );
  const { data: allUsers = [] } = useUsers();
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  // Filter users to only those with role 'user' (not admins)
  const realmUsers = useMemo(() => {
    return allUsers.filter((u) => u.role === "user");
  }, [allUsers]);

  // Split holidays into upcoming and past
  const { upcomingHolidays, pastHolidays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = holidays.filter(h => new Date(h.date) >= today);
    const past = holidays.filter(h => new Date(h.date) < today);

    return { upcomingHolidays: upcoming, pastHolidays: past };
  }, [holidays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRealm) {
      toast.error("Please select a realm first");
      return;
    }

    try {
      await createMutation.mutateAsync({
        realm_id: currentRealm.id,
        date: form.date,
        description: form.description,
        user_id: form.user_id,
      });
      toast.success("Holiday created!");
      setDialogOpen(false);
      setForm(defaultForm);
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === "23505") {
        toast.error("A holiday already exists for this date and user");
      } else if (
        err.message?.includes("uc") ||
        err.message?.includes("user_commitment")
      ) {
        toast.error(
          "Unable to create holiday: User may not have commitments assigned yet"
        );
      } else {
        toast.error(err.message || "Failed to create holiday");
      }
    }
  };

  const openDeleteDialog = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!holidayToDelete) return;

    try {
      await deleteMutation.mutateAsync(holidayToDelete.id);
      toast.success("Holiday deleted");
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
    } catch {
      toast.error("Failed to delete holiday");
    }
  };

  const isLoading = createMutation.isPending;

  if (loadingHolidays) {
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
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Holiday
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Holiday</DialogTitle>
            <DialogDescription>
              Mark a specific date as a holiday. Holidays are completely ignored
              - they don&apos;t break streaks or count as missed commitments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Select any date to mark as a holiday
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., National Holiday, Christmas"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user">User (optional)</Label>
                <Select
                  value={form.user_id || "realm-wide"}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      user_id: value === "realm-wide" ? null : value,
                    })
                  }
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select user or realm-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realm-wide">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Realm-wide (all users)</span>
                      </div>
                    </SelectItem>
                    {realmUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{user.name || user.username}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave as realm-wide for holidays that apply to everyone, or
                  select a specific user for personal time off.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Holidays List */}
      {holidays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No holidays{currentRealm ? ` in ${currentRealm.name}` : ""} yet.
              Create one to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Holidays */}
          {upcomingHolidays.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Upcoming Holidays</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {upcomingHolidays.map((holiday, index) => (
                    <motion.div
                      key={holiday.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 flex justify-between">
                              <div className="flex items-center gap-2">
                                {holiday.user_id === null ? (
                                  <div className="flex items-center gap-3">
                                    <Users className="h-12 w-12 text-muted-foreground" />
                                    <div className="text-lg font-bold">
                                      {holiday.realm?.name}
                                      <CardDescription className="flex items-center text-sm gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(holiday.date), "MMMM d, yyyy")}
                                      </CardDescription>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <UserAvatar
                                      name={holiday.user?.name || holiday.user?.username || "User"}
                                      avatarUrl={holiday.user?.avatar_url}
                                      className="h-15 w-15"
                                    />
                                    <div className="text-lg font-bold">
                                      {holiday.user?.name || holiday.user?.username || "User"}
                                      <CardDescription className="flex items-center text-sm gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(holiday.date), "MMMM d, yyyy")}
                                      </CardDescription>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Trash2
                                className="h-5 w-5 transition-all hover:-translate-y-0.5 cursor-pointer"
                                color="red"
                                onClick={() => openDeleteDialog(holiday)}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <div>{holiday.description}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Past Holidays */}
          {pastHolidays.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Past Holidays</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {pastHolidays.map((holiday, index) => (
                    <motion.div
                      key={holiday.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="opacity-60">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 flex justify-between">
                              <div className="flex items-center gap-2">
                                {holiday.user_id === null ? (
                                  <div className="flex items-center gap-3">
                                    <Users className="h-12 w-12 text-muted-foreground" />
                                    <div className="text-lg font-bold">
                                      {holiday.realm?.name}
                                      <CardDescription className="flex items-center text-sm gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(holiday.date), "MMMM d, yyyy")}
                                      </CardDescription>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <UserAvatar
                                      name={holiday.user?.name || holiday.user?.username || "User"}
                                      avatarUrl={holiday.user?.avatar_url}
                                      className="h-15 w-15"
                                    />
                                    <div className="text-lg font-bold">
                                      {holiday.user?.name || holiday.user?.username || "User"}
                                      <CardDescription className="flex items-center text-sm gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(holiday.date), "MMMM d, yyyy")}
                                      </CardDescription>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Trash2
                                className="h-5 w-5 transition-all hover:-translate-y-0.5 cursor-pointer"
                                color="red"
                                onClick={() => openDeleteDialog(holiday)}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <div>{holiday.description}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the holiday on{" "}
              <strong>
                {holidayToDelete &&
                  format(new Date(holidayToDelete.date), "MMMM d, yyyy")}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
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
