import { useAuth } from "@/contexts/AuthContext";
import { useGetMySummary, getGetMySummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Ruler, Droplet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useGetMySummary({
    query: {
      queryKey: getGetMySummaryQueryKey(),
      enabled: !!user && user.status === 'active',
    }
  });

  if (user?.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <h1 className="text-3xl font-serif">Account Status: {user?.status}</h1>
        <p className="text-muted-foreground max-w-md">
          {user?.status === 'pending' 
            ? "Your account is pending approval from a family administrator. Please check back later."
            : "Your account has been suspended. Please contact a family administrator."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-foreground">Good to see you, {user.displayName}</h1>
        <p className="text-muted-foreground mt-2">Here's your latest health overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Latest Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : summary?.latestWeight ? (
              <div className="flex flex-col">
                <span className="text-4xl font-serif">{summary.latestWeight} <span className="text-lg text-muted-foreground">kg</span></span>
                {summary.weightTrend !== null && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    {summary.weightTrend > 0 ? (
                      <><TrendingUp className="w-4 h-4 text-destructive" /> Up {Math.abs(summary.weightTrend).toFixed(1)}kg</>
                    ) : summary.weightTrend < 0 ? (
                      <><TrendingDown className="w-4 h-4 text-primary" /> Down {Math.abs(summary.weightTrend).toFixed(1)}kg</>
                    ) : (
                      <><Minus className="w-4 h-4" /> No change</>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No weight logged yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ruler className="w-4 h-4 text-primary" />
              Latest Length / Height
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : summary?.latestLength ? (
              <div className="flex flex-col">
                <span className="text-4xl font-serif">{summary.latestLength} <span className="text-lg text-muted-foreground">cm</span></span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No length logged yet.</div>
            )}
          </CardContent>
        </Card>

        {user.gender === "female" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Droplet className="w-4 h-4 text-destructive" />
                Cycle Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : summary?.lastPeriodStart ? (
                <div className="flex flex-col space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground block">Last started:</span>
                    <span className="font-medium">{new Date(summary.lastPeriodStart).toLocaleDateString()}</span>
                  </div>
                  {summary.nextPeriodEstimate && (
                    <div>
                      <span className="text-sm text-muted-foreground block">Next estimate:</span>
                      <span className="font-medium">{new Date(summary.nextPeriodEstimate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No periods logged yet.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Placeholder for real charts since I'll build them in the actual pages */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Getting Started</CardTitle>
            <CardDescription>Track your health entries from the sidebar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Welcome to your family health journal. You can log your weight and length over time to see trends. 
              {user.gender === 'female' && ' You also have access to cycle tracking.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
