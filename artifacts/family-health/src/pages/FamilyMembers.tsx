import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFamilyMembers,
  getListFamilyMembersQueryKey,
  useCreateFamilyMember,
  useUpdateFamilyMember,
  useDeleteFamilyMember,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Pencil, Trash2, User, Baby, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FamilyMember = { id: number; userId: number; name: string; gender: string; dateOfBirth?: string | null; createdAt: string; };

const memberSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string().optional(),
});
type MemberFormValues = z.infer<typeof memberSchema>;

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 2) {
    const months = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return `${months}mo`;
  }
  return `${years}y`;
}

export default function FamilyMembers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: members = [], isLoading } = useListFamilyMembers();
  const createMember = useCreateFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", gender: "male", dateOfBirth: "" },
  });

  function openAdd() {
    setEditing(null);
    form.reset({ name: "", gender: "male", dateOfBirth: "" });
    setDialogOpen(true);
  }

  function openEdit(m: FamilyMember) {
    setEditing(m);
    form.reset({ name: m.name, gender: m.gender as "male" | "female", dateOfBirth: m.dateOfBirth ?? "" });
    setDialogOpen(true);
  }

  function onSubmit(data: MemberFormValues) {
    const payload = { name: data.name, gender: data.gender as "male" | "female", ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}) };
    if (editing) {
      updateMember.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
          setDialogOpen(false);
          toast({ title: "Member updated" });
        },
        onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
      });
    } else {
      createMember.mutate({ data: payload }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
          setDialogOpen(false);
          toast({ title: "Family member added!" });
        },
        onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
      });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMember.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
        setDeleteTarget(null);
        toast({ title: "Member removed" });
      },
      onError: (e) => toast({ title: "Error", description: (e as any)?.data?.error || "Failed", variant: "destructive" }),
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Family Members</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the people whose health you track</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-xl" />)}
        </div>
      ) : members.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">No family members yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add your first family member to start tracking their health</p>
            <Button className="mt-4 gap-2" onClick={openAdd}><Plus className="w-4 h-4" /> Add First Member</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(members as FamilyMember[]).map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${m.gender === "female" ? "bg-pink-400" : "bg-blue-400"}`}>
                      {m.dateOfBirth && calcAge(m.dateOfBirth).endsWith("mo") ? <Baby className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{m.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${m.gender === "female" ? "border-pink-300 text-pink-600" : "border-blue-300 text-blue-600"}`}>
                          {m.gender === "female" ? "Female" : "Male"}
                        </Badge>
                        {m.dateOfBirth && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {calcAge(m.dateOfBirth)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(m)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {m.dateOfBirth && (
                  <div className="mt-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
                    Born {format(new Date(m.dateOfBirth), "MMMM d, yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Edit Member" : "Add Family Member"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMember.isPending || updateMember.isPending}>
                  {editing ? "Save Changes" : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all of their weight, height, and period records. This action cannot be undone.
            </AlertDialogDescription>
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
