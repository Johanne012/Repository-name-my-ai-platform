import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Agents from "./pages/Agents";
import AgentTest from "./pages/AgentTest";
import ApiKeys from "./pages/ApiKeys";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Orchestration from "./pages/Orchestration";
import Analytics from "./pages/Analytics";
import ApiDocs from "./pages/ApiDocs";
import Notifications from "./pages/Notifications";
import Home from "@/pages/Home";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/agents"} component={Agents} />
      <Route path={"/agent-test"} component={AgentTest} />
      <Route path={"/orchestration"} component={Orchestration} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/api-docs"} component={ApiDocs} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/api-keys"} component={ApiKeys} />
      <Route path={"/billing"} component={Billing} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
