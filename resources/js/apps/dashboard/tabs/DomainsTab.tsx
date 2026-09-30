import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Domain from "@/models/Domain";
import ModelDataTable from "@/components/ModelDataTable";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Plus } from "lucide-react";
import { can } from "@/utils/permissions";

export default function DomainsTab() {
  const navigate = useNavigate();
  const [requestKey, setRequestKey] = useState(0);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Domains</h1>
          <p className="text-xs text-muted-foreground">
            Manage the organizational domains that scope app access.
          </p>
        </div>
        {can({ permission: "domain.create" }) && (
          <Button onClick={() => navigate("/dashboard/domains/add")}>
            <Plus />
            Add Domain
          </Button>
        )}
      </div>

      <ModelDataTable
        model={Domain}
        requestKey={requestKey}
        onRowClick={(row) => navigate(`/dashboard/domains/${row.id}`)}
        actions={can({ permission: "domain.delete" })
          ? (row) => (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="sm" className="text-destructive" />}
            >
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {row.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the domain and all of its bindings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const response = await Domain.delete(row.id);
                    if (response.success) setRequestKey((key) => key + 1);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      : undefined}
      />
    </div>
  );
}
