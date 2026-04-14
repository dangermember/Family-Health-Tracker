import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPeriodEntries,
  getListPeriodEntriesQueryKey,
  useCreatePeriodEntry,
  useUpdatePeriodEntry,
  useDeletePeriodEntry,
} from "@workspace/api-client-react";
type PeriodEntry = { id: number; userId: number; startDate: string; endDate?: string | null; flow?: string | null; notes?: string | null; createdAt: string; };
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Droplet } from "lucide-react";

const periodSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  numberOfDays: z.coerce.number().int().min(1).optional().or(z.literal("")),
  note: z.string().optional(),
});

type PeriodFormValues = z.infer<typeof periodSchema>;

export default function Period() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useListPeriodEntries({
    query: { queryKey: getListPeriodEntriesQueryKey() },
  });
  const createMutation = useCreatePeriodEntry();
  const updateMutation = useUpdatePeriodEntry();
  const deleteMutation = useDeletePeriodEntry();

  const [editEntry, setEditEntry] = useState<PeriodEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      numberOfDays: "",
      note: "",
    },
  });

  if (user?.gender !== "female") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Droplet className="w-12 h-12 text-muted-foreground/30" />
        <h1 className="text-2xl font-serif text-foreground">Period tracking is private</h1>
        <p className="text-muted-foreground max-w-sm">This section is only available to users who selected female as their gender.</p>
      </div>
    );
  }

  function openCreate() {
    setEditEntry(null);
    form.reset({
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      numberOfDays: "",
      note: "",
    });
    setDialogOpen(true);
  }

  function openEdit(entry: PeriodEntry) {
    setEditEntry(entry);
    form.reset({
      startDate: entry.startDate,
      endDate: entry.endDate ?? "",
      numberOfDays: entry.numberOfDays ?? "",
      note: entry.note ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(data: PeriodFormValues) {
    const payload = {
      startDate: data.startDate,
      endDate: data.endDate || null,
      numberOfDays: data.numberOfDays ? Number(data.numberOfDays) : null,
      note: data.note || null,
    };
    if (editEntry) {
      updateMutation.mutate(
        { id: editEntry.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPeriodEntriesQueryKey() });
            setDialogOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPeriodEntriesQueryKey() });
            setDialogOpen(false);
          },
        }
      );
    }
  }

  function confirmDelete() {
    if (deleteId == null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPeriodEntriesQueryKey() });
          setDeleteId(null);
        },
      }
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground flex items-center gap-3">
            <Droplet className="w-8 h-8 text-rose-400" />
            Cycle Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Your period log is completely private</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Entry
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Droplet className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No period entries yet. Start tracking your cycle.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.startDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.endDate ? format(new Date(entry.endDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>{entry.numberOfDays ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.note || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(entry.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit Period Entry" : "Add Period Entry"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Days (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="e.g. 5" {...field} value={field.value?.toString() ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Any notes?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editEntry ? "Update" : "Add Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Period Entry</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
