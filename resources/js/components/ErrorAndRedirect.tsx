import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export interface ErrorAndRedirectProps {
  message: string;
  route: string;
  countdown?: number;
}

export default function ErrorAndRedirect({
  message,
  route,
  countdown = 3,
}: ErrorAndRedirectProps) {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(countdown);

  useEffect(() => {
    if (seconds <= 0) {
      navigate(route, { replace: true });
      return;
    }

    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [seconds, route, navigate]);

  const redirectNow = () => navigate(route, { replace: true });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {seconds > 0 ? `Redirecting in ${seconds}s...` : "Redirecting..."}
        </p>
        <Button type="button" size="sm" onClick={redirectNow}>
          Redirect now
        </Button>
      </div>
    </div>
  );
}
