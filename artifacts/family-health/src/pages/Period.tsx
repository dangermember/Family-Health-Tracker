import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFamilyMembers,
  useListPeriodEntries,
  getListPeriodEntriesQueryKey,
  useCreatePeriodEntry,
  useUpdatePeriodEntry,
  useDeletePeriodEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Droplet, Plus, Pencil, Trash2, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useWatch } from "react-hook-form";

type PeriodEntry = { id: number; memberId: number; startDate: string; endDate?: string | null; numberOfDays?: number | null; note?: string | null; createdAt: string; };
type FamilyMember = { id: number; name: string; gender: string; };

const schema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function DaysPreview({ control }: { control: any }) {
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = differenceInDays(end, start) + 1;
  if (days <= 0) return <p className="text-xs text-destructive">End date must be after start date</p>;
  return <p className="text-xs text-muted-foreground">Duration: <span className="font-semibold text-primary">{days} day{days !== 1 ? "s" : ""}</span></p>;
}

export default function Period() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: members = [] } = useListFamilyMembers() as { data: FamilyMember[] };
  const [memberId, setMemberId] = useState<number | null>(null);

  const selectedMemberId = memberId ?? (members.find(m => m.gender === "female")?.id ?? members[0]?.id ?? null);
  const selectedMember = members.find(m => m.id === selectedMemberId);
  const isFemale = selectedMember?.gender === "female";

  const { data: entries = [], isLoading } = useListPeriodEntries(
    { memberId: selectedMemberId! },
    { query: { enabled: !!selectedMemberId && isFemale } }
  ) as { data: PeriodEntry[]; isLoading: boolean };

  const createEntry = useCreatePeriodEntry();
  const updateEntry = useUpdatePeriodEntry();
  const deleteEntry = useDeletePeriodEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PeriodEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PeriodEntry | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { startDate: new Date().toISOString().split("T")[0], endDate: "", note: "" },
  });

  function openAdd() {
    setEditing(null);
    form.reset({ startDate: new Date().toISOString().split("T")[0], endDate: "", note: "" });
    setDialogOpen(true);
  }
  function openEdit(e: PeriodEntry) {
    setEditing(e);
    form.reset({ startDate: e.startDate, endDate: e.endDate ?? "", note: e.note ?? "" });
    setDialogOpen(true);
  }

  function onSubmit(data: FormValues) {
    const payload = {
      memberId: selectedMemberId!,
      startDate: data.startDate,
      ...(data.endDate ? { endDate: data.endDate } : {}),
      ...(data.note ? { note: data.note } : {}),
    };
    if (editing) {
      updateEntry.mutate({ id: editing.id, data: { startDate: data.startDate, endDate: data.endDate || null, note: data.note ?? null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListPeriodEntriesQueryKey({ memberId: selectedMemberId! }) }); setDialogOpen(false); toast({ title: "Entry updated" }); },
        onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
      });
    } else {
      createEntry.mutate({ data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListPeriodEntriesQueryKey({ memberId: selectedMemberId! }) }); setDialogOpen(false); toast({ title: "Period entry added!" }); },
        onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
      });
    }
  }

  const avgDays = entries.filter(e => e.numberOfDays).length > 0
    ? Math.round(entries.filter(e => e.numberOfDays).reduce((s, e) => s + (e.numberOfDays ?? 0), 0) / entries.filter(e => e.numberOfDays).length)
    : null;

  if (members.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Droplet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-serif font-semibold mb-2">No Family Members Yet</h2>
        <p className="text-muted-foreground mb-6">Add female family members to track periods.</p>
        <Link href="/family-members"><Button className="gap-2"><Users className="w-4 h-4" /> Manage Family Members</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Period Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Track menstrual cycles for female family members</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedMemberId ?? "")} onValueChange={v => setMemberId(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.map(m => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name} {m.gender !== "female" && <span className="text-muted-foreground text-xs">(male)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFemale && <Button onClick={openAdd} disabled={!selectedMemberId} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Add</Button>}
        </div>
      </div>

      {selectedMember && !isFemale && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3 text-amber-800">
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-sm"><strong>{selectedMember.name}</strong> is male. Period tracking is only available for female family members. Please select a female member or <Link href="/family-members" className="underline font-medium">add a female member</Link>.</p>
          </CardContent>
        </Card>
      )}

      {isFemale && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Cycles</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Duration</div>
            <div className="text-2xl font-bold">{avgDays ? `${avgDays}d` : "—"}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Period</div>
            <div className="text-sm font-semibold">{entries[0] ? format(new Date(entries[0].startDate), "MMM d, yyyy") : "—"}</div>
          </CardContent></Card>
        </div>
      )}

      {isFemale && (
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Period History {selectedMember && <span className="text-muted-foreground font-normal">— {selectedMember.name}</span>}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="py-8 text-center text-muted-foreground animate-pulse">Loading…</div>
              : entries.length === 0 ? (
                <div className="py-12 text-center">
                  <Droplet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No period entries yet. Add the first one!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{format(new Date(e.startDate), "MMM d, yyyy")}</span>
                          {e.endDate && <>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold">{format(new Date(e.endDate), "MMM d, yyyy")}</span>
                          </>}
                          {e.numberOfDays && (
                            <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 border-pink-200">
                              {e.numberOfDays} day{e.numberOfDays !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {!e.endDate && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Ongoing</Badge>}
                        </div>
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif">{editing ? "Edit Period Entry" : "Add Period Entry"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date <span className="text-muted-foreground font-normal">(optional — leave blank if ongoing)</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                  <DaysPreview control={form.control} />
                </FormItem>
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
            <AlertDialogAction onClick={() => { if (deleteTarget) deleteEntry.mutate({ id: deleteTarget.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListPeriodEntriesQueryKey({ memberId: selectedMemberId! }) }); setDeleteTarget(null); } }); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
