import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        className="w-full max-w-md"
        icon={ShieldX}
        title="Access denied"
        description="You don't have permission to view this page. Contact an administrator if you think this is a mistake."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/home")}>
            Back to home
          </Button>
        }
      />
    </div>
  );
}
