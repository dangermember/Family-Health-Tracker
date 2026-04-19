import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) return false;
  return true;
}, { message: "Current password is required to set a new password", path: ["currentPassword"] });

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateMe = useUpdateMe();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      currentPassword: "",
      newPassword: "",
    },
  });

  function onSubmit(data: SettingsFormValues) {
    if (!user) return;
    const payload: Record<string, string> = { displayName: data.displayName };
    if (data.newPassword) {
      payload.currentPassword = data.currentPassword!;
      payload.newPassword = data.newPassword;
    }
    updateMe.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          form.resetField("currentPassword");
          form.resetField("newPassword");
          toast({ title: "Settings saved", description: "Your profile has been updated." });
        },
        onError: (e) => {
          const msg = (e as any)?.data?.error || "Failed to update settings.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-3xl font-serif text-foreground flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-medium">{user?.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{user?.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and password</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Change Password <span className="text-muted-foreground font-normal">(optional)</span></p>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateMe.isPending}>
                {updateMe.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
