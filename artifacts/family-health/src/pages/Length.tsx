import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFamilyMembers,
  useListLengthEntries,
  getListLengthEntriesQueryKey,
  useCreateLengthEntry,
  useUpdateLengthEntry,
  useDeleteLengthEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Ruler, Plus, Pencil, Trash2, Users, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type LengthEntry = { id: number; memberId: number; lengthCm: number; recordedAt: string; note?: string | null; createdAt: string; };
type FamilyMember = { id: number; name: string; gender: string; };

const schema = z.object({
  lengthCm: z.coerce.number().min(1).max(300),
  recordedAt: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function toDatetimeLocal(iso?: string) {
  if (!iso) return new Date().toISOString().slice(0, 16);
  return new Date(iso).toISOString().slice(0, 16);
}

export default function Length() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: members = [] } = useListFamilyMembers() as { data: FamilyMember[] };
  const [memberId, setMemberId] = useState<number | null>(null);

  const selectedMemberId = memberId ?? (members[0]?.id ?? null);
  const selectedMember = members.find(m => m.id === selectedMemberId);

  const { data: entries = [], isLoading } = useListLengthEntries(
    { memberId: selectedMemberId! },
    { query: { enabled: !!selectedMemberId } }
  ) as { data: LengthEntry[]; isLoading: boolean };

  const createEntry = useCreateLengthEntry();
  const updateEntry = useUpdateLengthEntry();
  const deleteEntry = useDeleteLengthEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LengthEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LengthEntry | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { lengthCm: 160, recordedAt: toDatetimeLocal(), note: "" },
  });

  function openAdd() {
    setEditing(null);
    form.reset({ lengthCm: entries[0]?.lengthCm ?? 160, recordedAt: toDatetimeLocal(), note: "" });
    setDialogOpen(true);
  }
  function openEdit(e: LengthEntry) {
    setEditing(e);
    form.reset({ lengthCm: e.lengthCm, recordedAt: toDatetimeLocal(e.recordedAt), note: e.note ?? "" });
    setDialogOpen(true);
  }

  function onSubmit(data: FormValues) {
    if (editing) {
      updateEntry.mutate({ id: editing.id, data: { lengthCm: data.lengthCm, recordedAt: new Date(data.recordedAt).toISOString(), note: data.note ?? null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListLengthEntriesQueryKey({ memberId: selectedMemberId! }) }); setDialogOpen(false); toast({ title: "Entry updated" }); },
        onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
      });
    } else {
      createEntry.mutate({ data: { memberId: selectedMemberId!, lengthCm: data.lengthCm, recordedAt: new Date(data.recordedAt).toISOString(), note: data.note || undefined } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListLengthEntriesQueryKey({ memberId: selectedMemberId! }) }); setDialogOpen(false); toast({ title: "Height entry added!" }); },
        onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
      });
    }
  }

  const sorted = [...entries].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const chartData = sorted.map(e => ({ date: format(new Date(e.recordedAt), "MMM d"), height: e.lengthCm }));
  const latest = entries[0]?.lengthCm;

  if (members.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Ruler className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-serif font-semibold mb-2">No Family Members Yet</h2>
        <p className="text-muted-foreground mb-6">Add family members first to start tracking height.</p>
        <Link href="/family-members"><Button className="gap-2"><Users className="w-4 h-4" /> Manage Family Members</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Height Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Track height / length over time</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedMemberId ?? "")} onValueChange={v => setMemberId(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openAdd} disabled={!selectedMemberId} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Add</Button>
        </div>
      </div>

      {selectedMemberId && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Latest</div>
            <div className="text-2xl font-bold">{latest?.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">cm</span></div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Entries</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent></Card>
          {chartData.length > 1 && (
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Growth</div>
              <div className="text-2xl font-bold flex items-center gap-1 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
                +{(sorted[sorted.length - 1].height - sorted[0].height).toFixed(1)} cm
              </div>
            </CardContent></Card>
          )}
        </div>
      )}

      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Height Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} cm`, "Height"]} />
                <Line type="monotone" dataKey="height" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base font-medium">All Entries {selectedMember && <span className="text-muted-foreground font-normal">— {selectedMember.name}</span>}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground animate-pulse">Loading…</div>
            : entries.length === 0 ? (
              <div className="py-12 text-center">
                <Ruler className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No entries yet. Add the first one!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {entries.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold">{e.lengthCm.toFixed(1)} cm</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(e.recordedAt), "PPP p")}</div>
                      {e.note && <div className="text-xs text-muted-foreground/70 italic mt-0.5">{e.note}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(e)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif">{editing ? "Edit Entry" : "Add Height Entry"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="lengthCm" render={({ field }) => (
                <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="160.0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="recordedAt" render={({ field }) => (
                <FormItem><FormLabel>Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem><FormLabel>Note <span className="text-muted-foreground font-normal">(optional)</span></FormLabel><FormControl><Textarea placeholder="Any notes…" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createEntry.isPending || updateEntry.isPending}>{editing ? "Save" : "Add Entry"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this entry?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) deleteEntry.mutate({ id: deleteTarget.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListLengthEntriesQueryKey({ memberId: selectedMemberId! }) }); setDeleteTarget(null); } }); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
