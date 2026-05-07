import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import FamilyMembers from "@/pages/FamilyMembers";
import GrowthChart from "@/pages/GrowthChart";
import Period from "@/pages/Period";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppLayout>
              <Switch>
                <Route path="/" component={() => null} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/family-members" component={FamilyMembers} />
                <Route path="/growth" component={GrowthChart} />
                <Route path="/period" component={Period} />
                <Route path="/admin" component={Admin} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
