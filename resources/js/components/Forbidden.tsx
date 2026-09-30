import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldX } from "lucide-react";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Access denied</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You don&apos;t have permission to view this page.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/home")}>
            Back to home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
