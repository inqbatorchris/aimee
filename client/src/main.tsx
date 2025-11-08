import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeveloperModeProvider } from "@/contexts/DeveloperModeContext";
import { clearAuthState } from "./utils/clearAuth";

// Make clearAuthState globally available for debugging
(window as any).clearAuthState = clearAuthState;

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DeveloperModeProvider>
        <App />
        <Toaster />
      </DeveloperModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
