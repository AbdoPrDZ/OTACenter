import React, { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import ReactDOM from "react-dom/client";

import { TfiReload as ReplayIcon } from "react-icons/tfi";

import { TooltipProvider } from "@/components/ui/tooltip"
import DashboardRouter from "@/apps/dashboard/router";
import User from "@/models/User";
import { Button } from "@/components/ui/button";
import Center from "@/components/ui/center";
import Typography from "@/components/ui/typography";
import { Spinner } from "@/components/ui/spinner";

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
    } else setError(response.message);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <TooltipProvider>
      {loading ? (
        <Center>
          <Spinner />
        </Center>
      ) : error ? (
        <Center>
          <Typography variant="h6" color="error">
            {error}
          </Typography>

          <Button onClick={() => load()}>
            <ReplayIcon /> Retry
          </Button>
        </Center>
      ) : (
        <RouterProvider router={DashboardRouter.load()} />
      )}
    </TooltipProvider>
  )
}

const root = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
