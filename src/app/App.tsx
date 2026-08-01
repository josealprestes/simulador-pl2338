import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationStore } from "@/stores/navigation.store";
import HomeScreen from "@/screens/home/HomeScreen";
import SetupScreen from "@/screens/setup/SetupScreen";
import SimulationDashboard from "@/screens/simulation/SimulationDashboard";
import ResultScreen from "@/screens/result/ResultScreen";
import HistoryScreen from "@/screens/history/HistoryScreen";
import ComparisonScreen from "@/screens/comparison/ComparisonScreen";
import AiConfigScreen from "@/screens/config/AiConfigScreen";
import { NavigationGuard } from "@/components/NavigationGuard";
import { AppShell } from "@/components/AppShell";

function ScreenRouter() {
  const { screen } = useNavigationStore();

  switch (screen) {
    case "HOME":
      return <HomeScreen />;
    case "SETUP":
      return <SetupScreen />;
    case "SIMULATION":
      return <SimulationDashboard />;
    case "RESULT":
      return <ResultScreen />;
    case "HISTORY":
      return <HistoryScreen />;
    case "COMPARISON":
      return <ComparisonScreen />;
    case "AI_CONFIG":
      return <AiConfigScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-background text-on-surface">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-on focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-primary-on focus:outline-none transition-all"
        >
          Pular para o conteúdo
        </a>
        <AppShell>
          <NavigationGuard>
            <main id="main-content" tabIndex={-1} className="outline-none">
              <ScreenRouter />
            </main>
          </NavigationGuard>
        </AppShell>
      </div>
    </TooltipProvider>
  );
}
