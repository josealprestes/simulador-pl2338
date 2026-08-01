import { useEffect } from "react";
import { useNavigationStore } from "@/stores/navigation.store";
import { useSimulationStore } from "@/stores/simulation.store";

/**
 * Ensures state integrity during navigation
 */
export function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { screen, setScreen } = useNavigationStore();
  const { params, simulation } = useSimulationStore();

  useEffect(() => {
    // If trying to access SIMULATION or RESULT without params, go to SETUP
    if ((screen === "SIMULATION" || screen === "RESULT") && !params) {
      console.warn("Navegação prevenida: Parâmetros de simulação ausentes.");
      setScreen("SETUP");
    }

    // If trying to access HISTORY without being in HOME, it's fine, but just a check
    // We can add more specific rules here as the app grows
  }, [screen, params, setScreen]);

  return <>{children}</>;
}
