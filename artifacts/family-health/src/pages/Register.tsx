import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { HeartPulse, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [success, setSuccess] = useState(false);
  const register = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
    },
  });

  function onSubmit(data: RegisterFormValues) {
    register.mutate(
      { data },
      {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (error) => {
          const msg = (error as any)?.data?.error || (error as any)?.message || "Failed to register. Please try again.";
          form.setError("root", {
            type: "manual",
            message: msg,
          });
        },
      }
    );
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-card-border text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif text-foreground mb-4">Registration Pending</h2>
          <p className="text-muted-foreground mb-8">
            Your registration has been submitted successfully. An administrator must approve your account before you can log in.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-card-border relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-serif text-foreground">Join Family Health</h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Create an account to start tracking your health.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 text-center">
                {form.formState.errors.root.message}
              </div>
            )}
            
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="johndoe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 6 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full mt-6" disabled={register.isPending}>
              {register.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
