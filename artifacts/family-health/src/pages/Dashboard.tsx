import { useListFamilyMembers, useGetAdminOverview } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Droplet, UserPlus, Plus, Baby, User, Scale } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

type FamilyMember = { id: number; name: string; gender: string; dateOfBirth?: string | null; };

function calcAge(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 2) {
    const months = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return `${months} months old`;
  }
  return `${years} years old`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useListFamilyMembers() as { data: FamilyMember[]; isLoading: boolean };
  const { data: overview } = useGetAdminOverview({ query: { enabled: user?.role === "admin" } });

  const femaleMembers = (members as FamilyMember[]).filter(m => m.gender === "female");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">
          Welcome back, {user?.displayName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here's an overview of your family's health tracking</p>
      </div>

      {user?.role === "admin" && overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: overview.totalUsers, icon: Users, color: "text-blue-500" },
            { label: "Pending Approval", value: overview.pendingUsers, icon: UserPlus, color: "text-amber-500" },
            { label: "Family Members", value: overview.totalFamilyMembers, icon: Users, color: "text-emerald-500" },
            { label: "Weight Entries", value: overview.totalWeightEntries, icon: Scale, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-medium">Your Family Members</CardTitle>
          <Link href="/family-members">
            <Button variant="outline" size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Member</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No family members yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add family members to start tracking their health data</p>
              <Link href="/family-members">
                <Button className="mt-4 gap-2"><Plus className="w-4 h-4" /> Add First Member</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(members as FamilyMember[]).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${m.gender === "female" ? "bg-pink-400" : "bg-blue-400"}`}>
                    {m.dateOfBirth && calcAge(m.dateOfBirth)?.includes("month") ? <Baby className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-xs ${m.gender === "female" ? "border-pink-300 text-pink-600" : "border-blue-300 text-blue-600"}`}>
                        {m.gender === "female" ? "Female" : "Male"}
                      </Badge>
                      {m.dateOfBirth && <span className="text-xs text-muted-foreground">{calcAge(m.dateOfBirth)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: "/growth", icon: Activity, label: "Growth Chart", desc: "Track weight & height vs WHO reference", color: "bg-emerald-500/10 text-emerald-600" },
          ...(femaleMembers.length > 0 ? [{ href: "/period", icon: Droplet, label: "Period Tracking", desc: "Track menstrual cycles", color: "bg-pink-500/10 text-pink-600" }] : []),
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground mt-1">{desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
