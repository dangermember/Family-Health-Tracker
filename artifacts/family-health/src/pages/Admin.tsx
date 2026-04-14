import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  useSuspendUser,
  useApproveUser,
  useActivateUser,
  useGetAdminOverview,
  getGetAdminOverviewQueryKey,
} from "@workspace/api-client-react";
type User = { id: number; username: string; displayName: string; role: string; gender: string | null; status: string; createdAt: string; };
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, UserCheck, UserX, Clock, Plus, MoreVertical, ShieldCheck, Ban, KeyRound, Pencil, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["user", "admin"]),
  gender: z.enum(["male", "female"]),
});

const editUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["user", "admin"]),
  gender: z.enum(["male", "female"]),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>;
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
  if (status === "suspended") return <Badge className="bg-red-100 text-red-800 border-red-200">Suspended</Badge>;
  return <Badge>{status}</Badge>;
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: overview } = useGetAdminOverview({
    query: { queryKey: getGetAdminOverviewQueryKey() },
  });
  const { data: allUsers = [], isLoading } = useListUsers(
    {},
    { query: { queryKey: getListUsersQueryKey({}) } }
  );
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const resetPasswordMutation = useResetUserPassword();
  const suspendMutation = useSuspendUser();
  const approveMutation = useApproveUser();
  const activateMutation = useActivateUser();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground/40" />
        <h1 className="text-2xl font-serif text-foreground">Admin access required</h1>
        <p className="text-muted-foreground max-w-sm">You do not have permission to view this page.</p>
        <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const pendingUsers = allUsers.filter((u) => u.status === "pending");
  const activeUsers = allUsers.filter((u) => u.status === "active");
  const suspendedUsers = allUsers.filter((u) => u.status === "suspended");

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", password: "", displayName: "", role: "user", gender: "male" },
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { displayName: "", role: "user", gender: "male" },
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
  }

  function onCreateSubmit(data: CreateUserFormValues) {
    createMutation.mutate(
      { data: { ...data, status: "active" } },
      {
        onSuccess: () => {
          invalidateAll();
          setCreateDialogOpen(false);
          createForm.reset();
          toast({ title: "User created" });
        },
      }
    );
  }

  function openEdit(user: User) {
    setEditUser(user);
    editForm.reset({
      displayName: user.displayName,
      role: user.role as "user" | "admin",
      gender: (user.gender ?? "male") as "male" | "female",
    });
  }

  function onEditSubmit(data: EditUserFormValues) {
    if (!editUser) return;
    updateMutation.mutate(
      { id: editUser.id, data },
      {
        onSuccess: () => {
          invalidateAll();
          setEditUser(null);
          toast({ title: "User updated" });
        },
      }
    );
  }

  function onResetPasswordSubmit(data: ResetPasswordFormValues) {
    if (!resetPasswordUser) return;
    resetPasswordMutation.mutate(
      { id: resetPasswordUser.id, data: { newPassword: data.newPassword } },
      {
        onSuccess: () => {
          setResetPasswordUser(null);
          resetPasswordForm.reset();
          toast({ title: "Password reset successfully" });
        },
      }
    );
  }

  function confirmDelete() {
    if (!deleteUser) return;
    deleteMutation.mutate(
      { id: deleteUser.id },
      {
        onSuccess: () => {
          invalidateAll();
          setDeleteUser(null);
          toast({ title: "User deleted" });
        },
      }
    );
  }

  function handleSuspend(id: number) {
    suspendMutation.mutate({ id }, { onSuccess: () => { invalidateAll(); toast({ title: "User suspended" }); } });
  }

  function handleApprove(id: number) {
    approveMutation.mutate({ id }, { onSuccess: () => { invalidateAll(); toast({ title: "User approved" }); } });
  }

  function handleActivate(id: number) {
    activateMutation.mutate({ id }, { onSuccess: () => { invalidateAll(); toast({ title: "User reactivated" }); } });
  }

  const UserActionsMenu = ({ user }: { user: User }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openEdit(user)}>
          <Pencil className="w-4 h-4 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
          <KeyRound className="w-4 h-4 mr-2" /> Reset Password
        </DropdownMenuItem>
        {user.status === "pending" && (
          <DropdownMenuItem onClick={() => handleApprove(user.id)} className="text-emerald-600">
            <UserCheck className="w-4 h-4 mr-2" /> Approve
          </DropdownMenuItem>
        )}
        {user.status === "active" && user.id !== currentUser?.id && (
          <DropdownMenuItem onClick={() => handleSuspend(user.id)} className="text-amber-600">
            <Ban className="w-4 h-4 mr-2" /> Suspend
          </DropdownMenuItem>
        )}
        {user.status === "suspended" && (
          <DropdownMenuItem onClick={() => handleActivate(user.id)} className="text-emerald-600">
            <UserCheck className="w-4 h-4 mr-2" /> Reactivate
          </DropdownMenuItem>
        )}
        {user.id !== currentUser?.id && (
          <DropdownMenuItem onClick={() => setDeleteUser(user)} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserTable = ({ users }: { users: User[] }) => (
    users.length === 0 ? (
      <div className="p-8 text-center text-muted-foreground text-sm">No users in this category.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.displayName}</TableCell>
              <TableCell className="text-muted-foreground">{user.username}</TableCell>
              <TableCell className="capitalize">{user.role}</TableCell>
              <TableCell className="capitalize text-muted-foreground">{user.gender ?? "—"}</TableCell>
              <TableCell><StatusBadge status={user.status} /></TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <UserActionsMenu user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Family Administration
          </h1>
          <p className="text-muted-foreground mt-1">Manage family members and their accounts</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Total Users
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="text-3xl font-serif">{overview.totalUsers}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Active
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="text-3xl font-serif text-emerald-600">{overview.activeUsers}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="text-3xl font-serif text-amber-600">{overview.pendingApprovals}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-red-400" /> Suspended
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="text-3xl font-serif text-red-500">{overview.suspendedUsers}</span>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <Tabs defaultValue="all">
              <div className="px-4 pt-4">
                <TabsList>
                  <TabsTrigger value="all">All ({allUsers.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingUsers.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({activeUsers.length})</TabsTrigger>
                  <TabsTrigger value="suspended">Suspended ({suspendedUsers.length})</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="mt-0">
                <UserTable users={allUsers} />
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                <UserTable users={pendingUsers} />
              </TabsContent>
              <TabsContent value="active" className="mt-0">
                <UserTable users={activeUsers} />
              </TabsContent>
              <TabsContent value="suspended" className="mt-0">
                <UserTable users={suspendedUsers} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField control={createForm.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={createForm.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={createForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editUser?.displayName}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={editForm.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="gender" render={({ field }) => (
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
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password: {resetPasswordUser?.displayName}</DialogTitle>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
              <FormField control={resetPasswordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>Cancel</Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending}>Reset Password</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteUser?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and all their health data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
