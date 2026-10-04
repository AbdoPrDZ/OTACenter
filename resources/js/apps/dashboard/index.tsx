import React, { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import ReactDOM from "react-dom/client";
import { RefreshCw } from "lucide-react";

import DashboardRouter from "@/apps/dashboard/router";
import User from "@/models/User";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { ThemeProvider } from "@/components/ui/theme";
import { ToastProvider } from "@/components/ui/toast";

import "@/utils/bootstrap";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = async () => {
    setLoading(true);
    setError(undefined);

    const response = await User.auth();

    if (response.success && response.data) {
      setLoading(false);
      return;
    }

    setError(response.message);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        {loading ? (
          <div className="flex h-dvh items-center justify-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Retry
            </Button>
          </div>
        ) : (
          <RouterProvider router={DashboardRouter.load()} />
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}

const root = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
);
