import { Route, Switch } from "wouter";
import AlignmentPage from "./pages/alignment";
import CompanionPage from "./pages/companion";
import GuidePage from "./pages/guide";
import SessionsPage from "./pages/sessions";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={GuidePage} />
        <Route path="/guide" component={GuidePage} />
        <Route path="/sessions" component={SessionsPage} />
        <Route path="/companion" component={CompanionPage} />
        <Route path="/alignment" component={AlignmentPage} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
