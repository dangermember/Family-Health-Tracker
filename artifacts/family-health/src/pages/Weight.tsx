import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWeightEntries,
  getListWeightEntriesQueryKey,
  useCreateWeightEntry,
  useUpdateWeightEntry,
  useDeleteWeightEntry,
} from "@workspace/api-client-react";
type WeightEntry = { id: number; userId: number; weight: number; unit: string; date: string; notes?: string | null; createdAt: string; };
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Plus, Pencil, Trash2, Scale } from "lucide-react";

const weightSchema = z.object({
  weightKg: z.coerce.number().min(1, "Weight must be positive"),
  recordedAt: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

type WeightFormValues = z.infer<typeof weightSchema>;

export default function Weight() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useListWeightEntries(
    {},
    { query: { queryKey: getListWeightEntriesQueryKey({}) } }
  );
  const createMutation = useCreateWeightEntry();
  const updateMutation = useUpdateWeightEntry();
  const deleteMutation = useDeleteWeightEntry();

  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<WeightFormValues>({
    resolver: zodResolver(weightSchema),
    defaultValues: {
      weightKg: 0,
      recordedAt: new Date().toISOString().slice(0, 16),
      note: "",
    },
  });

  function openCreate() {
    setEditEntry(null);
    form.reset({
      weightKg: 0,
      recordedAt: new Date().toISOString().slice(0, 16),
      note: "",
    });
    setDialogOpen(true);
  }

  function openEdit(entry: WeightEntry) {
    setEditEntry(entry);
    form.reset({
      weightKg: entry.weightKg,
      recordedAt: new Date(entry.recordedAt).toISOString().slice(0, 16),
      note: entry.note ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(data: WeightFormValues) {
    const payload = {
      weightKg: data.weightKg,
      recordedAt: new Date(data.recordedAt).toISOString(),
      note: data.note || null,
    };
    if (editEntry) {
      updateMutation.mutate(
        { id: editEntry.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListWeightEntriesQueryKey({}) });
            setDialogOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListWeightEntriesQueryKey({}) });
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
          queryClient.invalidateQueries({ queryKey: getListWeightEntriesQueryKey({}) });
          setDeleteId(null);
        },
      }
    );
  }

  const chartData = [...entries]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((e) => ({
      date: format(new Date(e.recordedAt), "MMM d"),
      weight: e.weightKg,
    }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            Weight Log
          </h1>
          <p className="text-muted-foreground mt-1">Track your weight over time</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Entry
        </Button>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} unit="kg" />
                <Tooltip formatter={(v) => [`${v} kg`, "Weight"]} />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Scale className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No weight entries yet. Add your first entry.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.recordedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{entry.weightKg} kg</TableCell>
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
            <DialogTitle>{editEntry ? "Edit Weight Entry" : "Add Weight Entry"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 70.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recordedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
            <AlertDialogTitle>Delete Weight Entry</AlertDialogTitle>
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
