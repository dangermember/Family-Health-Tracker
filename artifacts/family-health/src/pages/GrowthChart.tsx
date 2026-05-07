import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFamilyMembers,
  useListWeightEntries,
  useListLengthEntries,
  getListWeightEntriesQueryKey,
  getListLengthEntriesQueryKey,
  useCreateWeightEntry,
  useCreateLengthEntry,
  useDeleteWeightEntry,
  useDeleteLengthEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Scale, Ruler, Plus, Trash2, Users, Info, TrendingUp, Activity } from "lucide-react";
import {
  ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, ReferenceArea,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getWHOCurve } from "@/data/who-growth";

type WeightEntry = { id: number; memberId: number; weightKg: number; recordedAt: string; };
type LengthEntry = { id: number; memberId: number; lengthCm: number; recordedAt: string; };
type FamilyMember = { id: number; name: string; gender: string; dateOfBirth?: string | null; };

const schema = z.object({
  recordedAt: z.string().min(1, "Date is required"),
  weightKg: z.coerce.number().min(0.5, "Enter a valid weight").max(600),
  lengthCm: z.coerce.number().min(1, "Enter a valid height").max(300),
});
type FormValues = z.infer<typeof schema>;

function ageYears(dob: string, at: string): number {
  const ms = new Date(at).getTime() - new Date(dob).getTime();
  return ms / (365.25 * 24 * 3600 * 1000);
}

function formatAge(years: number): string {
  if (years < 1) return `${Math.round(years * 12)}mo`;
  if (years < 2) return `${Math.floor(years)}y ${Math.round((years % 1) * 12)}mo`;
  return `${years.toFixed(1)}y`;
}

const WEIGHT_COLOR = "#10b981";
const HEIGHT_COLOR = "#6366f1";
const P50_COLOR = "#94a3b8";
const P_BAND_COLOR = "#e2e8f0";

interface PairedEntry {
  id: string;
  weightId?: number;
  heightId?: number;
  recordedAt: string;
  ageYears: number;
  weightKg?: number;
  lengthCm?: number;
}

function buildPaired(weights: WeightEntry[], lengths: LengthEntry[], dob: string): PairedEntry[] {
  const map = new Map<string, PairedEntry>();
  const dayKey = (iso: string) => iso.split("T")[0];

  weights.forEach(w => {
    const k = dayKey(w.recordedAt);
    const existing = map.get(k) ?? { id: k, recordedAt: w.recordedAt, ageYears: ageYears(dob, w.recordedAt) };
    map.set(k, { ...existing, weightId: w.id, weightKg: w.weightKg });
  });
  lengths.forEach(l => {
    const k = dayKey(l.recordedAt);
    const existing = map.get(k) ?? { id: k, recordedAt: l.recordedAt, ageYears: ageYears(dob, l.recordedAt) };
    map.set(k, { ...existing, heightId: l.id, lengthCm: l.lengthCm });
  });

  return [...map.values()].sort((a, b) => a.ageYears - b.ageYears);
}

interface GrowthChartProps {
  data: { age: number; actual?: number }[];
  whoData: { age: number; p3: number; p50: number; p97: number }[];
  dataKey: string;
  color: string;
  unit: string;
  label: string;
}

function SingleChart({ data, whoData, color, unit, label }: GrowthChartProps) {
  const merged = new Map<number, Record<string, number>>();
  whoData.forEach(pt => merged.set(pt.age, { p3: pt.p3, p50: pt.p50, p97: pt.p97 }));
  data.forEach(pt => {
    const existing = merged.get(pt.age) ?? {};
    merged.set(pt.age, { ...existing, actual: pt.actual! });
  });
  const chartData = [...merged.entries()]
    .sort(([a], [b]) => a - b)
    .map(([age, vals]) => ({ age, ...vals }));

  const allVals = chartData.flatMap(d => [d.p3, d.p97, d.actual].filter(Boolean) as number[]);
  const yMin = Math.floor((Math.min(...allVals) - 2) / 5) * 5;
  const yMax = Math.ceil((Math.max(...allVals) + 2) / 5) * 5;

  const CustomTooltip = ({ active, payload, label: age }: any) => {
    if (!active || !payload?.length) return null;
    const actual = payload.find((p: any) => p.dataKey === "actual");
    const p50 = payload.find((p: any) => p.dataKey === "p50");
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
        <div className="font-medium mb-1">Age: {formatAge(age)}</div>
        {actual && <div style={{ color }}>{label}: <strong>{Number(actual.value).toFixed(1)} {unit}</strong></div>}
        {p50 && <div className="text-muted-foreground">WHO median: {Number(p50.value).toFixed(1)} {unit}</div>}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={`band-${unit}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={P_BAND_COLOR} stopOpacity={0.9} />
            <stop offset="95%" stopColor={P_BAND_COLOR} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis
          dataKey="age"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={v => `${Number(v).toFixed(0)}y`}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          label={{ value: "Age (years)", position: "insideBottomRight", offset: -5, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={v => `${v}`}
          label={{ value: unit, angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="p97" fill={`url(#band-${unit})`} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" dot={false} name="P97" />
        <Area type="monotone" dataKey="p3" fill="white" fillOpacity={1} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" dot={false} name="P3" />
        <Line type="monotone" dataKey="p50" stroke={P50_COLOR} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="WHO median (P50)" />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 5, strokeWidth: 2, stroke: "white" }}
          activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: "white" }}
          name={label}
          connectNulls={false}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function GrowthChart() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: members = [] } = useListFamilyMembers() as { data: FamilyMember[] };
  const [memberId, setMemberId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PairedEntry | null>(null);

  const selectedMemberId = memberId ?? (members[0]?.id ?? null);
  const selectedMember = members.find(m => m.id === selectedMemberId);

  const { data: weightEntries = [] } = useListWeightEntries(
    { memberId: selectedMemberId! },
    { query: { enabled: !!selectedMemberId } }
  ) as { data: WeightEntry[] };
  const { data: lengthEntries = [] } = useListLengthEntries(
    { memberId: selectedMemberId! },
    { query: { enabled: !!selectedMemberId } }
  ) as { data: LengthEntry[] };

  const createWeight = useCreateWeightEntry();
  const createLength = useCreateLengthEntry();
  const deleteWeight = useDeleteWeightEntry();
  const deleteLength = useDeleteLengthEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { recordedAt: new Date().toISOString().split("T")[0], weightKg: 0, lengthCm: 0 },
  });

  const hasDOB = !!selectedMember?.dateOfBirth;
  const paired = hasDOB ? buildPaired(weightEntries, lengthEntries, selectedMember!.dateOfBirth!) : [];

  const ageMin = paired.length ? Math.max(0, Math.min(...paired.map(p => p.ageYears)) - 0.2) : 0;
  const ageMax = paired.length ? Math.max(...paired.map(p => p.ageYears)) + 0.5 : 5;
  const gender = (selectedMember?.gender ?? "male") as "male" | "female";

  const whoWeight = hasDOB ? getWHOCurve(gender, ageMin, ageMax, "weight") : [];
  const whoHeight = hasDOB ? getWHOCurve(gender, ageMin, ageMax, "height") : [];

  const weightChartData = paired.filter(p => p.weightKg !== undefined).map(p => ({ age: +p.ageYears.toFixed(4), actual: p.weightKg }));
  const heightChartData = paired.filter(p => p.lengthCm !== undefined).map(p => ({ age: +p.ageYears.toFixed(4), actual: p.lengthCm }));

  function onSubmit(data: FormValues) {
    if (!selectedMemberId) return;
    const recAt = new Date(data.recordedAt + "T12:00:00").toISOString();
    Promise.all([
      createWeight.mutateAsync({ data: { memberId: selectedMemberId, weightKg: data.weightKg, recordedAt: recAt } }),
      createLength.mutateAsync({ data: { memberId: selectedMemberId, lengthCm: data.lengthCm, recordedAt: recAt } }),
    ]).then(() => {
      qc.invalidateQueries({ queryKey: getListWeightEntriesQueryKey({ memberId: selectedMemberId }) });
      qc.invalidateQueries({ queryKey: getListLengthEntriesQueryKey({ memberId: selectedMemberId }) });
      setDialogOpen(false);
      form.reset({ recordedAt: new Date().toISOString().split("T")[0], weightKg: 0, lengthCm: 0 });
      toast({ title: "Measurements recorded!" });
    }).catch(e => {
      toast({ title: "Error", description: (e as any)?.data?.error || "Failed to save", variant: "destructive" });
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const promises: Promise<any>[] = [];
    if (deleteTarget.weightId) promises.push(deleteWeight.mutateAsync({ id: deleteTarget.weightId }));
    if (deleteTarget.heightId) promises.push(deleteLength.mutateAsync({ id: deleteTarget.heightId }));
    Promise.all(promises).then(() => {
      qc.invalidateQueries({ queryKey: getListWeightEntriesQueryKey({ memberId: selectedMemberId! }) });
      qc.invalidateQueries({ queryKey: getListLengthEntriesQueryKey({ memberId: selectedMemberId! }) });
      setDeleteTarget(null);
      toast({ title: "Entry deleted" });
    });
  }

  if (members.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Activity className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-serif font-semibold mb-2">No Family Members Yet</h2>
        <p className="text-muted-foreground mb-6">Add family members first to start tracking growth.</p>
        <Link href="/family-members"><Button className="gap-2"><Users className="w-4 h-4" /> Manage Family Members</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Growth Chart</h1>
          <p className="text-muted-foreground text-sm mt-1">Weight & height versus WHO reference curves</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedMemberId ?? "")} onValueChange={v => setMemberId(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} disabled={!selectedMemberId} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {selectedMember && !hasDOB && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3 text-amber-800">
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              <strong>{selectedMember.name}</strong> does not have a date of birth set. Age-based growth charts require a date of birth.{" "}
              <Link href="/family-members" className="underline font-medium">Edit member</Link> to add it.
            </p>
          </CardContent>
        </Card>
      )}

      {hasDOB && paired.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Latest Weight</div>
              <div className="text-2xl font-bold">{paired.findLast(p => p.weightKg)?.weightKg?.toFixed(1) ?? "—"} <span className="text-sm font-normal text-muted-foreground">kg</span></div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Latest Height</div>
              <div className="text-2xl font-bold">{paired.findLast(p => p.lengthCm)?.lengthCm?.toFixed(1) ?? "—"} <span className="text-sm font-normal text-muted-foreground">cm</span></div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Current Age</div>
              <div className="text-2xl font-bold">{formatAge(ageYears(selectedMember!.dateOfBirth!, new Date().toISOString()))}</div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" /> Weight — {selectedMember?.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Shaded band = WHO P3–P97 healthy range for {gender === "female" ? "girls" : "boys"} · Dashed line = median (P50)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weightChartData.length < 1 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No weight entries yet</div>
              ) : (
                <SingleChart
                  data={weightChartData}
                  whoData={whoWeight}
                  dataKey="actual"
                  color={WEIGHT_COLOR}
                  unit="kg"
                  label="Weight"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Ruler className="w-4 h-4 text-indigo-500" /> Height — {selectedMember?.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Shaded band = WHO P3–P97 healthy range for {gender === "female" ? "girls" : "boys"} · Dashed line = median (P50)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heightChartData.length < 1 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No height entries yet</div>
              ) : (
                <SingleChart
                  data={heightChartData}
                  whoData={whoHeight}
                  dataKey="actual"
                  color={HEIGHT_COLOR}
                  unit="cm"
                  label="Height"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {hasDOB && paired.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No measurements yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add the first weight & height measurement to see growth charts</p>
            <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> Add First Measurement</Button>
          </CardContent>
        </Card>
      )}

      {paired.length > 0 && hasDOB && (
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">All Measurements</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {[...paired].reverse().map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium">{format(new Date(entry.recordedAt), "PPP")}</span>
                      <Badge variant="outline" className="text-xs">{formatAge(entry.ageYears)}</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      {entry.weightKg !== undefined && (
                        <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-emerald-500" />{entry.weightKg.toFixed(1)} kg</span>
                      )}
                      {entry.lengthCm !== undefined && (
                        <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-indigo-500" />{entry.lengthCm.toFixed(1)} cm</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(entry)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Measurement</DialogTitle>
            {selectedMember && <p className="text-sm text-muted-foreground mt-1">Recording for <strong>{selectedMember.name}</strong></p>}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="recordedAt" render={({ field }) => (
                <FormItem><FormLabel>Date of Measurement</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="weightKg" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-emerald-500" /> Weight (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lengthCm" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-indigo-500" /> Height (cm)</FormLabel>
                    <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {!hasDOB && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  Date of birth is needed to show growth charts. <Link href="/family-members" className="underline font-medium">Add it now.</Link>
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createWeight.isPending || createLength.isPending}>Save Measurement</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this measurement?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the weight and height entry for this date.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
